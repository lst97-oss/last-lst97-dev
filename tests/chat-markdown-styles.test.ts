import { describe, expect, test } from 'bun:test'
import Element from 'happy-dom/lib/nodes/element/Element'
import { createSiteStyleWindow, type SiteStyleWindow } from './site-stylesheet'

/**
 * `.chat-markdown` styles streamed assistant replies, where blocks are appended
 * token by token. Two-sided margins plus a `> :last-child` rule made the
 * in-flight paragraph reflow every time the next block arrived, because it was
 * `:last-child` while streaming and stopped being `:last-child` afterwards.
 *
 * The contract pinned here is append-stability: a rendered block's margins must
 * be identical whether it is currently the last block in the message or not.
 */
describe('.chat-markdown block spacing', () => {
  /**
   * happy-dom keeps logical and physical margin properties in separate buckets:
   * declaring `margin-block-end` does not populate `marginBottom`, so a probe
   * has to check both. It also echoes a bare `0` back as `"0"` and leaves unit
   * lengths in their declared form, so both are normalised through `parseFloat`.
   */
  function blockMargin(window: SiteStyleWindow['window'], element: Element) {
    const style = window.getComputedStyle(element)
    // Logical wins when present; the physical bucket is the fallback for the
    // unlayered shorthand the stylesheet may declare instead.
    const blockStart = style.marginBlockStart === '' ? style.marginTop : style.marginBlockStart
    const blockEnd = style.marginBlockEnd === '' ? style.marginBottom : style.marginBlockEnd

    return {
      start: blockStart === '' ? 0 : Number.parseFloat(blockStart),
      end: blockEnd === '' ? 0 : Number.parseFloat(blockEnd),
    }
  }
  /** Builds a `.chat-markdown` message styled by the real site stylesheet. */
  async function mount(...tags: string[]) {
    const { window } = await createSiteStyleWindow()
    const message = window.document.createElement('div')
    message.className = 'chat-markdown'

    for (const tag of tags) {
      const block = window.document.createElement(tag)
      block.textContent = tag
      message.append(block)
    }

    window.document.body.append(message)
    return { window, message, blocks: [...message.children] }
  }

  test('gives every block a final geometry regardless of its position', async () => {
    const { window, blocks } = await mount('p', 'p')

    // The first paragraph is NOT the last child, so a two-sided margin would
    // give it a trailing margin here — and lose it the moment it became last.
    // This is the assertion that fails against the old stylesheet.
    for (const block of blocks) {
      expect(block.tagName.toLowerCase()).toBe('p')
      expect(blockMargin(window, block).end).toBe(0)
    }
  })

  test('does not change an existing block when a new one is appended', async () => {
    const { window, message } = await mount('p')
    const paragraph = message.children[0]

    const before = blockMargin(window, paragraph)

    const appended = window.document.createElement('p')
    appended.textContent = 'second block'
    message.append(appended)

    expect(blockMargin(window, paragraph)).toEqual(before)
  })

  test('keeps the leading gap on a block that is not first', async () => {
    const { window, message } = await mount('p')
    const appended = window.document.createElement('p')
    appended.textContent = 'second block'
    message.append(appended)

    // Guards against over-correcting into no spacing at all: a block arriving
    // mid-stream must still carry a gap above it.
    expect(blockMargin(window, appended).start).toBeGreaterThan(0)
  })

  test('keeps the tighter gap under a heading', async () => {
    const { window, blocks } = await mount('h2', 'p')
    const [heading, paragraph] = blocks

    expect(blockMargin(window, heading).end).toBe(0)
    const afterHeading = blockMargin(window, paragraph).start
    expect(afterHeading).toBeGreaterThan(0)

    // A paragraph following an ordinary block gets the full block gap, so the
    // post-heading gap must be strictly smaller than it.
    const { window: bareWindow, blocks: bareBlocks } = await mount('p', 'p')
    const bareGap = blockMargin(bareWindow, bareBlocks[1]).start

    expect(afterHeading).toBeLessThan(bareGap)
  })

  test('drops the top gap only on the first block', async () => {
    const { window, blocks } = await mount('p', 'p')
    const [first, second] = blocks

    expect(blockMargin(window, first).start).toBe(0)
    expect(blockMargin(window, second).start).toBeGreaterThan(0)
  })
})
