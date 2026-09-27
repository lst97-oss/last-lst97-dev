import { createContentReader } from './service'
import { createPayloadReaders } from './payload-readers'

export const contentReader = createContentReader(createPayloadReaders())
