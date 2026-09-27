import { createPayloadReaders } from './payload-readers'
import { createContentReader } from './service'

export const contentReader = createContentReader(createPayloadReaders())
