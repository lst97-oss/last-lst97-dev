import type { ChatModerationRejectionReason } from '../../../src/server/moderation/types'

export interface DecisionSnapshot {
  label: string
  confidence: number
}

export interface GatingOutcome {
  allowed: boolean
  reason?: ChatModerationRejectionReason
  contactIntent?: 'contact'
}

const IN_SCOPE_LABELS = new Set([
  'owner_context',
  'owner_projects',
  'site_content',
  'owner_goals',
  'on_behalf',
  'assistant_usage',
  'service_offer',
  'technical_question',
])

export function isConfident(confidence: number, minimumConfidence: number): boolean {
  return Number.isFinite(confidence) && confidence >= minimumConfidence
}

/**
 * Replays `createModerationService(...).checkChat` against captured decisions
 * so a threshold sweep costs no extra model calls. `tests/server/decisions-benchmark-gating.test.ts`
 * pins this against the real service; keep the order identical to
 * `src/server/moderation/service.ts`.
 */
export function evaluateChatGating(
  decisions: Record<string, DecisionSnapshot>,
  minimumConfidence: number,
): GatingOutcome | null {
  const scope = decisions.scope
  const safety = decisions.safety
  if (!scope || !safety) return null
  const contactIntent = decisions.contact_intent

  if (!isConfident(safety.confidence, minimumConfidence)) return { allowed: false, reason: 'uncertain' }
  if (safety.label !== 'safe') return { allowed: false, reason: 'unsafe' }
  if (contactIntent?.label === 'contact') return { allowed: true, contactIntent: 'contact' }
  if (contactIntent && contactIntent.label !== 'normal_chat') return { allowed: false, reason: 'uncertain' }
  if (scope.label === 'uncertain') return { allowed: false, reason: 'uncertain' }
  if (!IN_SCOPE_LABELS.has(scope.label)) return { allowed: false, reason: 'out_of_scope' }
  return { allowed: true }
}

/** Replays `checkContact` (direct page): intent and safety must each clear the gate. */
export function evaluateContactGating(
  decisions: Record<string, DecisionSnapshot>,
  minimumConfidence: number,
): { allowed: boolean } | null {
  const intent = decisions.intent
  const safety = decisions.safety
  if (!intent || !safety) return null
  if (intent.label !== 'legitimate') return { allowed: false }
  if (!isConfident(intent.confidence, minimumConfidence)) return { allowed: false }
  if (safety.label !== 'safe') return { allowed: false }
  if (!isConfident(safety.confidence, minimumConfidence)) return { allowed: false }
  return { allowed: true }
}

/** Replays `checkContactWorkflow` for one phase. */
export function evaluateWorkflowGating(
  decisions: Record<string, DecisionSnapshot>,
  phase: 'template' | 'form',
  expectedTemplate: string,
  minimumConfidence: number,
): GatingOutcome | null {
  const safety = decisions.safety
  const fit = decisions[phase === 'template' ? 'template_choice' : 'template_fit']
  if (!safety || !fit) return null
  if (safety.label !== 'safe') return { allowed: false, reason: 'unsafe' }
  if (!isConfident(safety.confidence, minimumConfidence)) return { allowed: false, reason: 'uncertain' }
  const expectedLabel = phase === 'template' ? expectedTemplate : 'matches_template'
  if (fit.label === 'uncertain') return { allowed: false, reason: 'uncertain' }
  if (fit.label === 'out_of_scope' || fit.label !== expectedLabel) return { allowed: false, reason: 'out_of_scope' }
  return { allowed: true }
}
