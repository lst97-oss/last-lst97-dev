import { describe, expect, test } from 'bun:test'

import { ssrStripDistStyleImports } from '../vendor/payload-tanstack-vite/stripDistStyleImports.js'

type StylePlugin = {
  resolveId?: (this: { environment?: { name?: string } }, ...args: unknown[]) => unknown
  transform?: (this: { environment?: { name?: string } }, ...args: unknown[]) => unknown
}

describe('Payload style workaround', () => {
  test('preserves admin RSC styles so the default shell can collect them', () => {
    const plugin = ssrStripDistStyleImports() as StylePlugin
    const context = { environment: { name: 'rsc' } }

    expect(
      plugin.resolveId?.call(
        context,
        './index.css',
        '/workspace/node_modules/@payloadcms/ui/dist/elements/Nav/index.js',
        {},
      ),
    ).toBeUndefined()

    expect(
      plugin.transform?.call(
        context,
        "import './index.css'\nexport const Nav = () => null\n",
        '/workspace/node_modules/@payloadcms/ui/dist/elements/Nav/index.js',
      ),
    ).toBeUndefined()
  })

  test('still strips styles from synchronous version diff components', () => {
    const plugin = ssrStripDistStyleImports() as StylePlugin
    const context = { environment: { name: 'rsc' } }
    const result = plugin.transform?.call(
      context,
      "import './index.css'\nexport const Diff = () => null\n",
      '/workspace/node_modules/@payloadcms/ui/dist/views/Version/Default/index.js',
    )

    expect(result).toMatchObject({ code: expect.not.stringContaining("import './index.css'") })
  })
})
