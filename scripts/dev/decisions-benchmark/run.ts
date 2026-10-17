import {
  chatBenchmarkCases,
  contactDirectBenchmarkCases,
  contactWorkflowBenchmarkCases,
  relevanceBenchmarkCases,
  routingBenchmarkCases,
} from '../../../tests/server/decisions-benchmark-cases'
import { ARM_IDS, type ArmId, createArm, DEFAULT_ARMS } from './arms'
import { type BenchmarkCase, mapConcurrent, runCase } from './evaluate'
import { evaluateGates, formatReport, summarizeArm, sweepTable } from './report'
import { type CaseRunRecord, type DecisionArm, SURFACES, type Surface } from './types'

const REFERENCE_THRESHOLD = 0.6
const DEFAULT_REPEATS = 3
const DEFAULT_CONCURRENCY = 4

interface RunConfig {
  models: ArmId[]
  surfaces: Surface[]
  repeats: number
  concurrency: number
  timeoutMs: number
  outPath?: string
  notes?: string
}

function parseArgs(argv: string[]): RunConfig {
  const values = new Map<string, string>()
  for (const arg of argv) {
    const match = /^--([a-z-]+)=(.*)$/.exec(arg)
    if (match) values.set(match[1], match[2])
  }

  const models = (values.get('models') ?? DEFAULT_ARMS.join(','))
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
  for (const model of models) {
    if (!(ARM_IDS as readonly string[]).includes(model)) {
      throw new Error(`Unknown model arm "${model}". Known arms: ${ARM_IDS.join(', ')}`)
    }
  }

  const surfaces = (values.get('surfaces') ?? SURFACES.join(','))
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
  for (const surface of surfaces) {
    if (!(SURFACES as readonly string[]).includes(surface)) {
      throw new Error(`Unknown surface "${surface}". Known surfaces: ${SURFACES.join(', ')}`)
    }
  }

  const number = (key: string, fallback: number): number => {
    const raw = values.get(key)
    if (raw === undefined) return fallback
    const parsed = Number(raw)
    if (!Number.isInteger(parsed) || parsed <= 0) throw new Error(`--${key} must be a positive integer`)
    return parsed
  }

  return {
    models: models as ArmId[],
    surfaces: surfaces as Surface[],
    repeats: number('repeats', DEFAULT_REPEATS),
    concurrency: number('concurrency', DEFAULT_CONCURRENCY),
    timeoutMs: number('timeout-ms', 5_000),
    ...(values.get('out') ? { outPath: values.get('out') } : {}),
    ...(values.get('notes') ? { notes: values.get('notes') } : {}),
  }
}

function buildCasesBySurface(): Record<Surface, BenchmarkCase[]> {
  return {
    chat: chatBenchmarkCases.map((testCase) => ({ surface: 'chat' as const, ...testCase })),
    routing: routingBenchmarkCases.map((testCase) => ({ surface: 'routing' as const, ...testCase })),
    'contact-direct': contactDirectBenchmarkCases.map((testCase) => ({
      surface: 'contact-direct' as const,
      ...testCase,
    })),
    'contact-workflow': contactWorkflowBenchmarkCases.map((testCase) => ({
      surface: 'contact-workflow' as const,
      ...testCase,
    })),
    relevance: relevanceBenchmarkCases.map((testCase) => ({ surface: 'relevance' as const, ...testCase })),
  }
}

function gitCommit(): string | null {
  try {
    const result = Bun.spawnSync(['git', 'rev-parse', '--short', 'HEAD'], { stdout: 'pipe', stderr: 'pipe' })
    return result.success ? result.stdout.toString().trim() : null
  } catch {
    return null
  }
}

async function runArm(
  arm: DecisionArm,
  config: RunConfig,
  casesBySurface: Record<Surface, BenchmarkCase[]>,
  currentDateTimeUtc: string,
): Promise<CaseRunRecord[]> {
  const records: CaseRunRecord[] = []
  for (const surface of config.surfaces) {
    const cases = casesBySurface[surface]
    const tasks = cases.flatMap((testCase) =>
      Array.from({ length: config.repeats }, (_, index) => ({ testCase, repeat: index + 1 })),
    )
    const done = await mapConcurrent(tasks, config.concurrency, ({ testCase, repeat }) =>
      runCase({
        arm,
        testCase,
        repeat,
        minimumConfidence: REFERENCE_THRESHOLD,
        currentDateTimeUtc,
      }),
    )
    records.push(...done)
    const errors = done.filter((record) => record.status === 'error').length
    process.stderr.write(`[${arm.id}] ${surface}: ${done.length} calls, ${errors} errors\n`)
  }
  return records
}

async function main(): Promise<void> {
  const config = parseArgs(Bun.argv.slice(2))
  const casesBySurface = buildCasesBySurface()
  const currentDateTimeUtc = new Date().toISOString()

  const arms: DecisionArm[] = config.models.map((id) => createArm(id, { timeoutMs: config.timeoutMs }))
  const records: CaseRunRecord[] = []
  for (const arm of arms) {
    records.push(...(await runArm(arm, config, casesBySurface, currentDateTimeUtc)))
  }

  const summaries = arms.map((arm) => summarizeArm(arm, records, casesBySurface))
  const gates = evaluateGates(summaries, casesBySurface)

  console.log(formatReport(summaries, gates))
  for (const summary of summaries) {
    console.log('')
    console.log(sweepTable(summary))
  }

  const blockedArms = summaries.filter((summary) => {
    const records_ = records.filter((record) => record.armId === summary.armId)
    const failures = records_.filter((record) => record.errorCategory === 'request_failed').length
    return records_.length > 0 && failures / records_.length >= 0.9
  })
  if (blockedArms.length > 0) {
    console.log('')
    console.log(
      `NOTE: ${blockedArms.map((summary) => summary.armId).join(', ')} failed nearly every call with request errors. ` +
        'If these are OpenRouter arms, check the workspace guardrails at https://openrouter.ai/workspaces/default/guardrails ' +
        '(allow the decider models and the Perplexity provider).',
    )
  }

  const timestamp = currentDateTimeUtc.replace(/[:.]/g, '-')
  const outPath = config.outPath ?? `benchmarks/decisions-${timestamp}.json`
  await Bun.write(
    outPath,
    JSON.stringify(
      {
        generatedAt: currentDateTimeUtc,
        gitCommit: gitCommit(),
        config: {
          models: config.models,
          surfaces: config.surfaces,
          repeats: config.repeats,
          concurrency: config.concurrency,
          timeoutMs: config.timeoutMs,
          minimumConfidence: REFERENCE_THRESHOLD,
          ...(config.notes ? { notes: config.notes } : {}),
        },
        corpus: Object.fromEntries(SURFACES.map((surface) => [surface, casesBySurface[surface].length])),
        summaries,
        gates,
        records,
      },
      null,
      2,
    ),
  )
  console.log('')
  console.log(`Report written to ${outPath}`)

  if (gates.some((gate) => !gate.pass)) process.exit(1)
}

await main()
