import { logger } from '../observability/logger'
import { createMelbourneTemperatureReader } from './service'

export const melbourneTemperatureReader = createMelbourneTemperatureReader({ logger })
