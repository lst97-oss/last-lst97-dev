import { getServerEnv, requiredServerEnv } from '../env'
import { createDecisionClassifier } from './decision-classifier'
import { createModerationService } from './service'
import { createSystemOneClient, OPENROUTER_DECISION_BASE_URL, OPENROUTER_DECISION_PATH } from './system-one-client'

let service: ReturnType<typeof createModerationService> | undefined

export function getModerationService() {
  if (!service) {
    const env = getServerEnv()
    const apiKey = env.DECISION_API_KEY?.trim() || requiredServerEnv('OPENROUTER_API_KEY')
    const client = createSystemOneClient({
      apiKey,
      baseUrl: OPENROUTER_DECISION_BASE_URL,
      path: OPENROUTER_DECISION_PATH,
    })
    service = createModerationService(
      createDecisionClassifier({
        provider: 'openrouter',
        systemOne: (request) => client.systemOne({ model: env.DECISION_MODEL, ...request }),
      }),
      env.MODERATION_MIN_CONFIDENCE,
    )
  }
  return service
}
