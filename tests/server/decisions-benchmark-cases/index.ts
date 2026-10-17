import { toolRoutingCases } from './routing-cases'
import type { RoutingBenchmarkCase } from './types'

export { chatBenchmarkCases } from './chat-cases'
export { contactDirectBenchmarkCases, contactWorkflowBenchmarkCases } from './contact-cases'
export { relevanceBenchmarkCases } from './relevance-cases'
export type {
  ChatBenchmarkCase,
  ContactDirectBenchmarkCase,
  ContactWorkflowBenchmarkCase,
  RelevanceBenchmarkCase,
  RoutingBenchmarkCase,
} from './types'

/**
 * The committed routing corpus, run over the full six-tool set. The expected
 * set is exact: every tool that decides `use` beyond the expectation counts as
 * a mismatch, so a model that over-fires `services` or `coding_history` on a
 * negative case is visible rather than averaged away.
 */
export const routingBenchmarkCases: RoutingBenchmarkCase[] = toolRoutingCases.map((testCase) => ({
  id: testCase.id,
  category: testCase.category,
  message: testCase.message,
  ...(testCase.history ? { history: testCase.history } : {}),
  ...(testCase.topicAnchors ? { topicAnchors: testCase.topicAnchors } : {}),
  ...(testCase.evidence ? { evidence: testCase.evidence } : {}),
  ...(testCase.toolOutputs ? { toolOutputs: testCase.toolOutputs } : {}),
  expected: [...testCase.expected],
}))
