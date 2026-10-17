import type { AgentToolName, AgentToolUseDecisions } from '../../chat/tools/agent-tools'

export interface DecisionAnswer {
  choice: string
  confidence: number
}

/**
 * The probability of the chosen label inside a `probabilities` map, falling
 * back to the map's largest finite value. Returns 0 when there is no usable
 * probability, which the gates treat as not confident.
 */
function readAnswerProbability(choice: string, probabilities: unknown): number {
  if (!probabilities || typeof probabilities !== 'object') return 0
  const values = Object.entries(probabilities as Record<string, unknown>).filter(
    (entry): entry is [string, number] => typeof entry[1] === 'number' && Number.isFinite(entry[1]),
  )
  if (values.length === 0) return 0
  const chosen = values.find(([label]) => label === choice)
  if (chosen) return chosen[1]
  return Math.max(...values.map(([, value]) => value))
}

/**
 * Reads decision answers into `{ choice, confidence }`. `confidence` is
 * optional in the System One schema, so an omitted value is filled from the
 * answer's probability map; when neither exists it degrades to 0, which the
 * gates treat as "not confident" (a normal rejection) rather than as a
 * provider failure. Entries without a string `choice` are dropped, so the
 * existing required-answer checks keep throwing for malformed answers.
 */
export function normalizeAnswers(answers: Record<string, unknown>): Record<string, DecisionAnswer> {
  const normalized: Record<string, DecisionAnswer> = {}
  for (const [key, value] of Object.entries(answers)) {
    if (!value || typeof value !== 'object') continue
    const answer = value as { choice?: unknown; confidence?: unknown; probabilities?: unknown }
    if (typeof answer.choice !== 'string') continue
    const confidence =
      typeof answer.confidence === 'number' && Number.isFinite(answer.confidence)
        ? answer.confidence
        : readAnswerProbability(answer.choice, answer.probabilities)
    normalized[key] = { choice: answer.choice, confidence }
  }
  return normalized
}

export function readToolDecisions(
  answers: Record<string, DecisionAnswer>,
  availableTools: AgentToolName[],
): AgentToolUseDecisions {
  const decisions: AgentToolUseDecisions = {}
  for (const tool of availableTools) {
    const answer = answers[tool]
    if (!answer || !['use', 'skip', 'uncertain'].includes(answer.choice)) {
      throw new Error(`Decision model returned an invalid tool routing decision for ${tool}`)
    }
    decisions[tool] = { label: answer.choice as 'use' | 'skip' | 'uncertain', confidence: answer.confidence }
  }
  return decisions
}

export function requiredAnswer(
  answers: Record<string, DecisionAnswer>,
  key: string,
  accepted: readonly string[],
): { label: string; confidence: number } {
  const answer = answers[key]
  if (!answer || !accepted.includes(answer.choice) || !Number.isFinite(answer.confidence)) {
    throw new Error(`Decision model returned an invalid contact workflow decision for ${key}`)
  }
  return { label: answer.choice, confidence: answer.confidence }
}

export function optionalContactIntent(answers: Record<string, DecisionAnswer>) {
  const answer = answers.contact_intent
  if (!answer) return { label: 'uncertain', confidence: 0 }
  if (!['contact', 'normal_chat', 'uncertain'].includes(answer.choice) || !Number.isFinite(answer.confidence)) {
    throw new Error('Decision model returned an invalid contact intent decision')
  }
  return { label: answer.choice, confidence: answer.confidence }
}
