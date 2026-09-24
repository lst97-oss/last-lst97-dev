import { createTypeSafeClassifier } from '../src/server/moderation/typesafe-classifier'
import { jevToolRoutingCases } from '../tests/server/jev-tool-routing-cases'
import type { AgentToolName } from '../src/server/chat/agent-tools'

const apiKey = Bun.env.TYPESAFE_API_KEY
if (!apiKey) throw new Error('TYPESAFE_API_KEY is required to run the live Jev routing evaluation.')

const tools: AgentToolName[] = ['search_knowledge', 'coding_stats', 'coding_history', 'site_content']
const currentDateTimeUtc = new Date().toISOString()
const classifier = createTypeSafeClassifier(apiKey)
const routeTools = classifier.routeTools
if (!routeTools) throw new Error('Jev tool routing is unavailable.')

interface EvaluationResult {
  id: string
  expected: AgentToolName[]
  actual: AgentToolName[]
  labels: Record<string, string | undefined>
}

const results: EvaluationResult[] = []

for (let index = 0; index < jevToolRoutingCases.length; index += 4) {
  const batch = jevToolRoutingCases.slice(index, index + 4)
  const batchResults = await Promise.all(batch.map(async (testCase) => {
    const decisions = await routeTools({
      message: testCase.message,
      currentDateTimeUtc,
      history: testCase.history ?? [],
      topicAnchors: testCase.topicAnchors ?? [],
      evidence: testCase.evidence ?? '',
      toolOutputs: testCase.toolOutputs ?? '',
      availableTools: tools,
    })
    return {
      id: testCase.id,
      expected: [...testCase.expected].sort(),
      actual: tools.filter((tool) => decisions[tool]?.label === 'use').sort(),
      labels: Object.fromEntries(tools.map((tool) => [tool, decisions[tool]?.label])) as Record<string, string | undefined>,
    }
  }))
  results.push(...batchResults)
}

const confusion = Object.fromEntries(tools.map((tool) => {
  let tp = 0
  let fp = 0
  let fn = 0
  let tn = 0
  for (const result of results) {
    const expected = result.expected.includes(tool)
    const actual = result.actual.includes(tool)
    if (expected && actual) tp += 1
    else if (!expected && actual) fp += 1
    else if (expected && !actual) fn += 1
    else tn += 1
  }
  return [tool, { tp, fp, fn, tn, precision: tp + fp ? tp / (tp + fp) : 1, recall: tp + fn ? tp / (tp + fn) : 1 }]
}))
const mismatches = results.filter((result) => JSON.stringify(result.expected) !== JSON.stringify(result.actual))
const exactSetAccuracy = (results.length - mismatches.length) / results.length

console.log(JSON.stringify({
  model: 'jev-latest',
  evaluatedAtUtc: currentDateTimeUtc,
  caseCount: results.length,
  exactSetAccuracy,
  confusion,
  mismatches: mismatches.map((result) => ({
    id: result.id,
    expected: result.expected,
    actual: result.actual,
    labels: result.labels,
  })),
}, null, 2))

if (mismatches.length > 0) process.exitCode = 1
