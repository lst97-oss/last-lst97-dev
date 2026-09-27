import { describe, expect, test } from 'bun:test'
import { getPayloadImportMap } from '../src/lib/payload/import-map'

describe('Payload import map', () => {
  test('provides built-in RSC dashboard components to the server renderer', () => {
    const importMap = getPayloadImportMap()

    expect(importMap['@payloadcms/ui/rsc#CollectionCards']).toBeDefined()
    expect(importMap['@payloadcms/ui/rsc#CollectionQueryWidget']).toBeDefined()
  })
})
