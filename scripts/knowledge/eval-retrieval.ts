import { z } from 'zod'

import { getServerEnv, requiredServerEnv } from '../../src/server/env'
import { requireIntegrationEnv } from '../../src/server/env-schema'
import { closeKnowledgeDatabase, getKnowledgeIndexRepository } from '../../src/server/knowledge/database'
import { createEmbeddingClient } from '../../src/server/knowledge/embedding-client'
import { createQueryEmbeddingConfig } from '../../src/server/knowledge/embedding-provider-config'
import { createRetrieveKnowledge } from '../../src/server/knowledge/retrieve'
import { createSiliconFlowReranker } from '../../src/server/knowledge/siliconflow-reranker'
import type { KnowledgeRelevancePort, RerankerPort } from '../../src/server/knowledge/types'
import type {
  ChatRagCandidateDiagnostic,
  ChatRagRetrievalDiagnostic,
} from '../../src/server/observability/chat-diagnostics'
import type { Logger } from '../../src/server/observability/logger'
import { logger } from '../../src/server/observability/logger'
import { projectRoot } from '../project-root'

/**
 * Retrieval eval harness for the knowledge index.
 *
 * Runs the real retrieval pipeline — query embedding, the exact vector pool,
 * the diversity trim, the SiliconFlow reranker, evidence selection — against
 * a golden query set and reports, per query and per stage, whether the
 * expected source reached the pool (`retrievedRank` ≤ 10 and ≤ 30), the
 * reranker (`rerankEligible`, then a `rerankScore` when it cracked the
 * reranker's own top three) and the final evidence (`finalSelected`).
 *
 * The relevance gate is replaced with an always-accept stub: a per-candidate
 * model call would add cost and variance without changing which stages this
 * measures. `--no-rerank` replaces the reranker with a pool-order stand-in the
 * same way, leaving the pool and trim stages measurable offline.
 *
 * The script never writes to the index. Every query costs one embedding call
 * plus (unless `--no-rerank`) one rerank call.
 *
 * Usage: bun run knowledge:eval [--no-rerank] [--kind <kind>] [--queries <path>] [--json]
 *
 * Exit code 0 means "measured", not "all hits": a miss is a finding, not an
 * error. A non-zero exit code means the harness itself failed.
 */

const querySetSchema = z.object({
  version: z.literal(1),
  notes: z.array(z.string()).optional(),
  queries: z
    .array(
      z.object({
        id: z
          .string()
          .min(1)
          .regex(/^[a-z0-9-]+$/),
        kind: z.enum(['mechanism', 'identifier', 'price', 'personal', 'demo']),
        query: z.string().min(3),
        expect: z.array(z.string().min(3)).min(1),
      }),
    )
    .min(1),
})

interface StageResult {
  id: string
  kind: string
  query: string
  expect: string[]
  missingExpectations: string[]
  durationMs: number
  poolRank: number | null
  poolRank10: boolean
  rerankEligible: boolean
  rerankScore: number | null
  finalHit: boolean
  expectedCandidates: ChatRagCandidateDiagnostic[]
  topCandidates: ChatRagCandidateDiagnostic[]
  error?: string
}

function candidateIdentity(candidate: { sourceType: string; sourceId: string }): string {
  return `${candidate.sourceType}:${candidate.sourceId}`
}

function padRank(rank: number | null): string {
  return rank === null ? ' —' : String(rank).padStart(2)
}

function printReport(results: StageResult[], useReranker: boolean): void {
  console.log(
    '\nLegend: p10/p30 = expected source rank in the pool · elig = reached the reranker · rerank = reranker score · final = in final evidence\n',
  )
  for (const result of results) {
    console.log(
      `${result.finalHit ? '✓' : '✗'} ${result.id.padEnd(26)} ${result.kind.padEnd(10)} ` +
        `p10 ${result.poolRank10 ? '✓' : '·'} · p30 ${padRank(result.poolRank)} · ` +
        `elig ${result.rerankEligible ? '✓' : '·'} · ` +
        `rerank ${result.rerankScore === null ? '  —  ' : result.rerankScore.toFixed(3)} · ` +
        `final ${result.finalHit ? '✓' : '✗'} · ${result.durationMs}ms`,
    )
  }

  const count = (predicate: (result: StageResult) => boolean) => results.filter(predicate).length
  const formatShare = (value: number) =>
    `${String(value).padStart(3)}/${results.length}  ${((value / results.length) * 100).toFixed(1).padStart(5)}%`
  console.log(`\nSUMMARY${useReranker ? '' : ' (pool-order stand-in reranker)'}`)
  console.log(`  pool@10         ${formatShare(count((result) => result.poolRank10))}`)
  console.log(`  pool@30         ${formatShare(count((result) => result.poolRank !== null))}`)
  console.log(`  rerank-eligible ${formatShare(count((result) => result.rerankEligible))}`)
  console.log(`  reranker top3   ${formatShare(count((result) => result.rerankScore !== null))}`)
  console.log(`  final evidence  ${formatShare(count((result) => result.finalHit))}`)

  const kinds = [...new Set(results.map(({ kind }) => kind))]
  console.log('\nBY KIND')
  for (const kind of kinds) {
    const group = results.filter((result) => result.kind === kind)
    const groupCount = (predicate: (result: StageResult) => boolean) => group.filter(predicate).length
    const share = (value: number) => `${value}/${group.length}`
    console.log(
      `  ${kind.padEnd(11)} pool@10 ${share(groupCount((result) => result.poolRank10)).padStart(5)}  pool@30 ${share(groupCount((result) => result.poolRank !== null)).padStart(5)}  final ${share(groupCount((result) => result.finalHit)).padStart(5)}`,
    )
  }

  const misses = results.filter((result) => !result.finalHit)
  if (misses.length > 0) {
    console.log('\nMISSES')
    for (const miss of misses) {
      console.log(`\n✗ ${miss.id} (${miss.kind}) — ${miss.query}`)
      console.log(`  expected: ${miss.expect.join(', ')}`)
      if (miss.error) console.log(`  harness error: ${miss.error}`)
      for (const candidate of miss.expectedCandidates) {
        console.log(
          `  expected chunk #${candidate.retrievedRank} · eligible ${candidate.rerankEligible ? 'yes' : 'no'} · rerank ${candidate.rerankScore?.toFixed(3) ?? '—'} · ${candidate.outcome}`,
        )
      }
      for (const candidate of miss.topCandidates.slice(0, 6)) {
        console.log(
          `  #${String(candidate.retrievedRank).padStart(2)} ${candidateIdentity(candidate).padEnd(52)} rerank ${candidate.rerankScore?.toFixed(3) ?? '  —  '} · ${candidate.outcome.padEnd(9)}${candidate.finalSelected ? ' · final' : ''}`,
        )
      }
    }
  }

  const missing = results.flatMap((result) =>
    result.missingExpectations.map((expectation) => `${result.id} → ${expectation}`),
  )
  if (missing.length > 0) {
    console.log('\nEXPECTED SOURCES NEVER RETRIEVED (typo in the golden set, or a recall miss)')
    for (const entry of missing) console.log(`  ${entry}`)
  }
}

const args = process.argv.slice(2)
const flagValue = (name: string): string | null => {
  const index = args.indexOf(name)
  return index === -1 ? null : (args[index + 1] ?? null)
}
const querySetPath = flagValue('--queries') ?? `${projectRoot}/scripts/knowledge/eval-retrieval.queries.json`
const useReranker = !args.includes('--no-rerank')
const asJson = args.includes('--json')
const kindFilter = flagValue('--kind')

const env = getServerEnv()

/** Drops per-query pipeline logs so the report stays readable; warnings still surface. */
const quietLogger: Logger = {
  debug: () => {},
  info: () => {},
  warn: (event, fields) => logger.warn(event, fields),
  error: (event, fields) => logger.error(event, fields),
}

/**
 * Always-accept stand-in for the relevance gate. The gate's thresholds are
 * measured separately; here it must not reject evidence for reasons outside
 * the retrieval stages under test.
 */
const alwaysRelevant: KnowledgeRelevancePort = {
  assess: async () => ({ isRelevantProbability: 0.99, answerEvidenceProbability: 0.99 }),
}

/** `--no-rerank` stand-in: keeps pool order so pool and trim stay measurable. */
const poolOrderReranker: RerankerPort = {
  async rerank({ candidates, limit }) {
    return candidates.slice(0, limit).map((candidate, index) => ({ ...candidate, relevanceScore: 1 - index / 100 }))
  },
}

try {
  requireIntegrationEnv('KNOWLEDGE_DATABASE_URL', env.KNOWLEDGE_DATABASE_URL)
  const querySet = querySetSchema.parse(JSON.parse(await Bun.file(querySetPath).text()))
  const ids = new Set<string>()
  for (const entry of querySet.queries) {
    if (ids.has(entry.id)) throw new Error(`Duplicate query id in ${querySetPath}: ${entry.id}`)
    ids.add(entry.id)
  }
  const queries = kindFilter ? querySet.queries.filter(({ kind }) => kind === kindFilter) : querySet.queries
  if (queries.length === 0) throw new Error(`No queries selected${kindFilter ? ` for kind ${kindFilter}` : ''}.`)

  const retrieve = createRetrieveKnowledge({
    embedding: createEmbeddingClient(createQueryEmbeddingConfig(env, requiredServerEnv('SILICONFLOW_API_KEY'))),
    repository: getKnowledgeIndexRepository(),
    reranker: useReranker
      ? createSiliconFlowReranker({
          apiKey: requiredServerEnv('SILICONFLOW_API_KEY'),
          timeoutMs: env.KNOWLEDGE_EMBEDDING_TIMEOUT_MS,
        })
      : poolOrderReranker,
    relevanceGate: alwaysRelevant,
    logger: quietLogger,
  })

  const results: StageResult[] = []
  for (const [index, entry] of queries.entries()) {
    const retrievals: ChatRagRetrievalDiagnostic[] = []
    const startedAt = performance.now()
    let error: string | undefined
    try {
      await retrieve.execute({
        message: entry.query,
        verifiedHistory: [],
        diagnostics: { onRetrieval: (retrieval) => retrievals.push(retrieval) },
      })
    } catch (cause) {
      error = cause instanceof Error ? cause.message : String(cause)
    }
    const durationMs = Math.round(performance.now() - startedAt)

    const candidates = retrievals.at(-1)?.candidates ?? []
    const expected = new Set(entry.expect)
    const expectedCandidates = candidates.filter((candidate) => expected.has(candidateIdentity(candidate)))
    const retrievedIdentities = new Set(candidates.map(candidateIdentity))
    const poolRank = expectedCandidates.reduce<number | null>(
      (best, candidate) => (best === null || candidate.retrievedRank < best ? candidate.retrievedRank : best),
      null,
    )
    const rerankScores = expectedCandidates
      .map(({ rerankScore }) => rerankScore)
      .filter((score): score is number => typeof score === 'number')
    const result: StageResult = {
      id: entry.id,
      kind: entry.kind,
      query: entry.query,
      expect: entry.expect,
      missingExpectations: entry.expect.filter((expectation) => !retrievedIdentities.has(expectation)),
      durationMs,
      poolRank,
      poolRank10: poolRank !== null && poolRank <= 10,
      rerankEligible: expectedCandidates.some((candidate) => candidate.rerankEligible),
      rerankScore: rerankScores.length > 0 ? Math.max(...rerankScores) : null,
      finalHit: expectedCandidates.some((candidate) => candidate.finalSelected),
      expectedCandidates,
      topCandidates: [...candidates].sort((left, right) => left.retrievedRank - right.retrievedRank),
      ...(error ? { error } : {}),
    }
    results.push(result)
    process.stderr.write(
      `[${index + 1}/${queries.length}] ${entry.id} pool=${poolRank ?? '—'} final=${result.finalHit ? 'hit' : 'miss'}\n`,
    )
  }

  if (asJson) {
    console.log(JSON.stringify({ reranked: useReranker, results }, null, 2))
  } else {
    printReport(results, useReranker)
  }

  const finalHits = results.filter(({ finalHit }) => finalHit).length
  logger.info('knowledge.eval.completed', {
    queryCount: results.length,
    reranked: useReranker,
    finalHits,
    finalMisses: results.length - finalHits,
  })
} catch (error) {
  logger.error('knowledge.eval.failed', {
    failureCategory: error instanceof Error ? error.name : 'unknown',
  })
  process.exitCode = 1
} finally {
  await closeKnowledgeDatabase()
}
