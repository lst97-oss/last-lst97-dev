import { describe, expect, test } from 'bun:test'
import { Window } from 'happy-dom'

// The chat transcript lives on a dark surface (.os-chat-scroller) while the
// rest of the site uses the light OS palette. Payload's admin CSS injects a
// bare `a { color: inherit }` inside @layer payload-default, which outranks
// Tailwind's `text-*` utilities — that silently painted citation links in the
// inherited ink colour (#17171f, ~1.1:1 on the chat background).
//
// These tests resolve the real cascade the way a browser does, so a regression
// back to the invisible colour fails here instead of shipping.

const chatCss = await Bun.file(new URL('../src/styles/chat.css', import.meta.url)).text()
const globalsCss = await Bun.file(new URL('../src/styles/globals.css', import.meta.url)).text()
const tokensCss = await Bun.file(new URL('../src/styles/tokens.css', import.meta.url)).text()

function srgbToLinear(channel: number): number {
  const c = channel / 255
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

function relativeLuminance(rgb: [number, number, number]): number {
  const [r, g, b] = rgb.map(srgbToLinear)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrastRatio(a: [number, number, number], b: [number, number, number]): number {
  const [l1, l2] = [relativeLuminance(a), relativeLuminance(b)]
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1]
  return (hi + 0.05) / (lo + 0.05)
}

function parseHex(hex: string): [number, number, number] {
  const value = hex.replace('#', '').trim()
  return [
    Number.parseInt(value.slice(0, 2), 16),
    Number.parseInt(value.slice(2, 4), 16),
    Number.parseInt(value.slice(4, 6), 16),
  ]
}

/** happy-dom returns `rgb(r, g, b)` or `#rrggbb` depending on the source declaration. */
function parseColor(value: string): [number, number, number] {
  const trimmed = value.trim()
  if (trimmed.startsWith('#')) return parseHex(trimmed)
  const parts = trimmed.match(/[\d.]+/g)?.map(Number) as [number, number, number]
  if (!parts || parts.length < 3) throw new Error(`unparseable colour: ${value}`)
  return [parts[0], parts[1], parts[2]]
}

const BRAND_YELLOW: [number, number, number] = [255, 211, 78]
const CHAT_SURFACE: [number, number, number] = [32, 32, 43]
const INK: [number, number, number] = [23, 23, 31]

const browser = new Window()
const vars = browser.document.createElement('style')
vars.textContent = `
  :root {
    --os-ink: #17171f;
    --os-cream: #fff7df;
    --os-yellow: #ffd34e;
    --primary: var(--os-yellow);
    --background: var(--os-cream);
  }
  .os-chat-scroller { background: #20202b; }
`
browser.document.head.appendChild(vars)

const citationStyles = browser.document.createElement('style')
citationStyles.textContent = chatCss
browser.document.head.appendChild(citationStyles)

function renderCitationLink() {
  const host = browser.document.createElement('div')
  host.className = 'os-chat-scroller'
  const citations = browser.document.createElement('div')
  citations.className = 'chat-citations'
  const link = browser.document.createElement('a')
  link.setAttribute('href', 'https://github.com/lst97/example')
  link.textContent = '[K1] example'
  citations.appendChild(link)
  host.appendChild(citations)
  browser.document.body.appendChild(host)
  return { link, host }
}

describe('chat citation link colour', () => {
  test('resolves to the brand token instead of inheriting the bubble ink', () => {
    const { link } = renderCitationLink()
    expect(parseColor(browser.getComputedStyle(link).color)).toEqual(BRAND_YELLOW)
  })

  test('meets WCAG AA against the chat surface', () => {
    const { link, host } = renderCitationLink()
    const color = parseColor(browser.getComputedStyle(link).color)
    const background = parseColor(browser.getComputedStyle(host).backgroundColor)

    expect(background).toEqual(CHAT_SURFACE)
    expect(contrastRatio(color, background)).toBeGreaterThanOrEqual(4.5)
  })

  test('the inherited ink this bug produced was effectively invisible', () => {
    // Guards the regression's severity: if ink ever became readable on the
    // chat surface, this test would need revisiting rather than silently
    // passing while the link stayed unreadable.
    expect(contrastRatio(INK, CHAT_SURFACE)).toBeLessThan(1.5)
  })

  test('stays underlined so links read as links without relying on colour', () => {
    const { link } = renderCitationLink()
    expect(browser.getComputedStyle(link).textDecorationLine).toBe('underline')
  })
})

describe('chat citation stylesheet', () => {
  test('scopes the override to the citations rather than global anchors', () => {
    // A blanket `a { color: ... }` here would recolour every link on the
    // site, including nav links that intentionally inherit their surface.
    expect(chatCss).toMatch(/\.chat-citations a\b/)
    expect(chatCss).not.toMatch(/^\s*a\s*\{/m)
  })

  test('documents the payload-default layer conflict that caused the bug', () => {
    expect(chatCss).toContain('payload-default')
  })

  test('keeps a visible focus affordance for keyboard users', () => {
    expect(chatCss).toMatch(/\.chat-citations a:focus-visible/)
  })
})

describe('design tokens used by the citation colour', () => {
  test('the primary token the citation resolves to is the yellow brand colour', () => {
    expect(tokensCss).toContain('--color-primary: var(--primary)')
    expect(globalsCss).toContain('--primary: var(--os-yellow)')
    expect(globalsCss).toContain('--os-yellow: #ffd34e')
  })
})
