import { importMap } from '../../payload-import-map'

/**
 * Payload does not expose the generated import map on the Payload instance.
 * Keep the generated-module boundary in one place for framework adapters and
 * server functions that render Payload server components.
 */
export function getPayloadImportMap() {
  return importMap
}
