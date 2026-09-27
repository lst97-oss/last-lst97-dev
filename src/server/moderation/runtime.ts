import { getServerEnv, requiredServerEnv } from '../env'
import { createModerationService } from './service'
import { createTypeSafeClassifier } from './typesafe-classifier'

let service: ReturnType<typeof createModerationService> | undefined

export function getModerationService() {
  if (!service) {
    const threshold = getServerEnv().MODERATION_MIN_CONFIDENCE
    service = createModerationService(createTypeSafeClassifier(requiredServerEnv('TYPESAFE_API_KEY')), threshold)
  }
  return service
}
