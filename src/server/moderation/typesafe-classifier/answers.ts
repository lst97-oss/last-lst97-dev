import type { AgentToolName, AgentToolUseDecisions } from '../../chat/tools/agent-tools'

export function readToolDecisions(
  answers: Record<string, { choice: string; confidence: number }>,
  availableTools: AgentToolName[],
): AgentToolUseDecisions {
  const decisions: AgentToolUseDecisions = {}
  for (const tool of availableTools) {
    const answer = answers[tool]
    if (!answer || !['use', 'skip', 'uncertain'].includes(answer.choice)) {
      throw new Error(`Jev returned an invalid tool routing decision for ${tool}`)
    }
    decisions[tool] = { label: answer.choice as 'use' | 'skip' | 'uncertain', confidence: answer.confidence }
  }
  return decisions
}

export function requiredAnswer(
  answers: Record<string, { choice: string; confidence: number }>,
  key: string,
  accepted: readonly string[],
): { label: string; confidence: number } {
  const answer = answers[key]
  if (!answer || !accepted.includes(answer.choice) || !Number.isFinite(answer.confidence)) {
    throw new Error(`Jev returned an invalid contact workflow decision for ${key}`)
  }
  return { label: answer.choice, confidence: answer.confidence }
}

export function optionalContactIntent(answers: Record<string, { choice: string; confidence: number }>) {
  const answer = answers.contact_intent
  if (!answer) return { label: 'uncertain', confidence: 0 }
  if (!['contact', 'normal_chat', 'uncertain'].includes(answer.choice) || !Number.isFinite(answer.confidence)) {
    throw new Error('Jev returned an invalid contact intent decision')
  }
  return { label: answer.choice, confidence: answer.confidence }
}
