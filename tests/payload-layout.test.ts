import { describe, expect, test } from 'bun:test'

import { toRootProviderProps } from '../src/lib/payload/layout'

describe('Payload layout provider props', () => {
  test('maps getLayoutData clientConfig to RootProvider config', () => {
    const clientConfig = { collections: [{ slug: 'posts' }], globals: [] }
    const result = toRootProviderProps({
      clientConfig,
      dateFNSKey: 'en-US',
      children: 'ignored',
    })

    expect(result).toEqual({
      config: clientConfig,
      dateFNSKey: 'en-US',
    })
    expect(result.clientConfig).toBeUndefined()
    expect(result.children).toBeUndefined()
  })
})
