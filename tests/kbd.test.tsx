import { describe, expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'

import { Kbd, KbdGroup } from '../src/components/ui/kbd'

describe('kbd', () => {
  test('is a squared, ink-bordered monospace cap rather than the registry chip', () => {
    const markup = renderToStaticMarkup(<Kbd>ENTER</Kbd>)

    expect(markup).toContain('<kbd')
    expect(markup).toContain('data-slot="kbd"')
    expect(markup).toContain('ENTER')
    // The upstream registry ships `rounded-sm bg-muted px-1 font-sans`. This
    // project defines no `--radius`, so `rounded-sm` would render a 4px corner
    // on a site where every authored surface is squared, and `font-sans` would
    // be the only non-monospace glyph on the page. These four are the
    // deliberate deviation, so a re-sync from the registry fails here.
    expect(markup).toContain('rounded-none')
    expect(markup).toContain('border-2')
    expect(markup).toContain('font-mono')
    expect(markup).toContain('uppercase')
    expect(markup).not.toContain('rounded-sm')
    expect(markup).not.toContain('font-sans')
  })

  test('groups a chord in a span so no kbd nests inside another', () => {
    // Upstream renders the group as a `<kbd>` while typing it as a div, which
    // produces `<kbd>` inside `<kbd>` for any two-key combination.
    const markup = renderToStaticMarkup(
      <KbdGroup>
        <Kbd>SHIFT</Kbd>
        <span>+</span>
        <Kbd>ENTER</Kbd>
      </KbdGroup>,
    )

    expect(markup).toMatch(/^<span /)
    expect(markup).toContain('data-slot="kbd-group"')
    expect(markup.match(/data-slot="kbd"/g)).toHaveLength(2)
    expect(markup.match(/<kbd/g)).toHaveLength(2)
  })
})
