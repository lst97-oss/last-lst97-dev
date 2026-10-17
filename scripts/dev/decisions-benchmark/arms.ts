import { createKnowledgeRelevanceGate } from '../../../src/server/knowledge/relevance-gate'
import { createDecisionClassifier } from '../../../src/server/moderation/decision-classifier'
import {
  createSystemOneClient,
  DEFAULT_SYSTEM_ONE_TIMEOUT_MS,
  OPENROUTER_DECISION_BASE_URL,
  OPENROUTER_DECISION_PATH,
} from '../../../src/server/moderation/system-one-client'
import type { DecisionArm } from './types'

export const ARM_IDS = ['decider-v1.2', 'decider-flash'] as const
export type ArmId = (typeof ARM_IDS)[number]

/**
 * The production decision model runs by default; `decider-flash` stays opt-in
 * for cheap comparisons. Both arms are Perplexity deciders served through
 * OpenRouter's System One-compatible Decisions API, so swapping the model —
 * here and in production via `DECISION_MODEL` — is a name change, not a
 * transport change.
 */
export const DEFAULT_ARMS: ArmId[] = ['decider-v1.2']

const ARM_MODELS: Record<ArmId, string> = {
  'decider-v1.2': 'perplexity/pplx-decider-v1.2',
  'decider-flash': 'perplexity/pplx-decider-flash-v1.2',
}

/** OpenRouter list prices, USD per million prompt tokens (completion is $0 for decision models). */
const OPENROUTER_PROMPT_USD_PER_MILLION: Record<string, number> = {
  'perplexity/pplx-decider-v1.2': 0.02,
  'perplexity/pplx-decider-flash-v1.2': 0.01,
}

export interface ArmOptions {
  timeoutMs?: number
}

function requiredKey(name: string): string {
  const value = Bun.env[name]
  if (!value) throw new Error(`${name} is required to run the decision-model benchmark.`)
  return value
}

export function createArm(id: ArmId, options: ArmOptions = {}): DecisionArm {
  const timeoutMs = options.timeoutMs ?? DEFAULT_SYSTEM_ONE_TIMEOUT_MS
  const apiKey = requiredKey('OPENROUTER_API_KEY')
  const model = ARM_MODELS[id]
  const client = createSystemOneClient({
    apiKey,
    baseUrl: OPENROUTER_DECISION_BASE_URL,
    path: OPENROUTER_DECISION_PATH,
    timeoutMs,
  })
  return {
    id,
    model,
    provider: 'openrouter',
    promptUsdPerMillionTokens: OPENROUTER_PROMPT_USD_PER_MILLION[model] ?? null,
    classifier: createDecisionClassifier({
      provider: 'openrouter',
      systemOne: (request) => client.systemOne({ model, ...request }),
    }),
    relevance: createKnowledgeRelevanceGate({
      apiKey,
      baseUrl: OPENROUTER_DECISION_BASE_URL,
      path: OPENROUTER_DECISION_PATH,
      model,
    }),
  }
}
