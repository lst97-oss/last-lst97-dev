import { describe, expect, it } from 'bun:test'

import { TOOL_TIMEOUT, withToolTimeout } from '../../src/server/chat/tools/tool-support'
import { createRetrieveKnowledge } from '../../src/server/knowledge/retrieve'
import type { KnowledgeCandidate } from '../../src/server/knowledge/types'

const vector = Array.from({ length: 1024 }, (_, index) => (index === 0 ? 1 : 0))

/**
 * Regression cover for a production outage where every knowledge lookup
 * surfaced as "Knowledge lookup timed out." with nothing in the logs. The
 * database refused the connection (no TLS from the function's egress IP), the
 * driver threw at once, and `withToolTimeout` mapped *any* rejection to
 * `TOOL_TIMEOUT` — so an auth failure and a 30s timeout were
 * indistinguishable, and retrieval's unguarded embed/search let the throw
 * escape instead of degrading.
 */
describe('tool failure diagnosis', () => {
  it('distinguishes a real timeout from an underlying error', async () => {
    const warnings: Array<{ event: string; data: Record<string, unknown> }> = []
    const logger = {
      warn: (event: string, data: Record<string, unknown>) => {
        warnings.push({ event, data })
      },
    }

    const timedOut = await withToolTimeout(new Promise(() => {}), 5, logger, { tool: 'search_knowledge' })
    const failed = await withToolTimeout(
      Promise.reject(new Error('no pg_hba.conf entry for host "10.42.0.1", no encryption')),
      5_000,
      logger,
      { tool: 'search_knowledge' },
    )

    expect(timedOut).toBe(TOOL_TIMEOUT)
    expect(failed).toBe(TOOL_TIMEOUT)
    // Both fail closed for the caller, but the log must name which one happened.
    expect(warnings.map((w) => w.event)).toEqual(['chat.agent_tool.timeout', 'chat.agent_tool.failed'])
    expect(warnings[1]?.data.reason).toBe('error')
    expect(String(warnings[1]?.data.error)).toContain('pg_hba.conf')
  })

  it('still fails closed without a logger', async () => {
    expect(await withToolTimeout(Promise.reject(new Error('boom')), 1_000)).toBe(TOOL_TIMEOUT)
  })
})

describe('retrieval degradation', () => {
  function harness(failure: { at: 'embed' | 'search' }) {
    const warnings: Array<{ event: string; data: Record<string, unknown> }> = []
    const retrievals: Array<{ degraded: boolean }> = []
    const repository = {
      search: async (): Promise<KnowledgeCandidate[]> => {
        if (failure.at === 'search') throw new Error('password authentication failed for user "root"')
        return []
      },
      listOwnedProjects: async () => ({ items: [], hasMore: false, matchingTotal: 0, breakdown: [] }),
    }
    const retrieve = createRetrieveKnowledge({
      embedding: {
        embed: async () => {
          if (failure.at === 'embed') throw new Error('getaddrinfo ENOTFOUND db.example.com')
          return vector
        },
        embedMany: async ({ texts }) => {
          if (failure.at === 'embed') throw new Error('getaddrinfo ENOTFOUND db.example.com')
          return texts.map(() => vector)
        },
      },
      repository: repository as never,
      reranker: {
        rerank: async () => {
          throw new Error('reranker should not be reached')
        },
      },
      relevanceGate: {
        assess: async () => {
          throw new Error('gate should not be reached')
        },
      },
      logger: {
        warn: (event: string, data: Record<string, unknown>) => {
          warnings.push({ event, data })
        },
        info() {},
        error() {},
        debug() {},
      } as never,
    })
    return {
      retrieve,
      warnings,
      retrievals,
      diagnostics: {
        onRetrieval: (r: { degraded: boolean }) => {
          retrievals.push(r)
        },
      },
    }
  }

  for (const at of ['embed', 'search'] as const) {
    it(`degrades without throwing when ${at} fails`, async () => {
      const { retrieve, warnings, retrievals, diagnostics } = harness({ at })
      const result = await retrieve.execute({
        message: 'What is your background and tech stack?',
        verifiedHistory: [],
        topicAnchors: [],
        diagnostics: diagnostics as never,
      })

      // Degrade, never throw: one unreachable source must not abort the turn.
      expect(result.evidence).toEqual([])
      expect(result.citations).toEqual([])
      expect(result.degraded).toBe(true)
      expect(retrievals[0]?.degraded).toBe(true)

      // And the reason has to be in the log, or the next outage is just as opaque.
      const warning = warnings.find((w) => w.event === 'knowledge.retrieval.unavailable')
      expect(warning).toBeDefined()
      expect(String(warning?.data.error)).toMatch(at === 'embed' ? /ENOTFOUND/ : /authentication failed/)
    })
  }
})
