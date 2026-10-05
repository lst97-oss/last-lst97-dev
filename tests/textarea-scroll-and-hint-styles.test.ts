import { describe, expect, test } from 'bun:test'
import type { HTMLStyleElement } from 'happy-dom'
import { createSiteStyleWindow, readResponsiveBlock } from './site-stylesheet'

const { window: browser, styleElement: styles } = await createSiteStyleWindow()

// happy-dom keeps `var()` references unresolved in getComputedStyle, so the
// themed bar is asserted through the declarations that produce those colors,
// the way scroll-area-styles.test.ts does. Authored selectors wrap across
// lines, so compare on collapsed whitespace.
function declaration(selector: string, property: string) {
  const rules = Array.from((styles as unknown as HTMLStyleElement).sheet?.cssRules ?? []) as unknown as CSSStyleRule[]
  const rule = rules.find((entry) => entry.selectorText?.replace(/\s+/g, ' ') === selector)
  return rule ? rule.style.getPropertyValue(property) : undefined
}

/** Every normalized selector in the sheet, for claims about which rules exist. */
function allSelectors() {
  const rules = Array.from((styles as unknown as HTMLStyleElement).sheet?.cssRules ?? []) as unknown as CSSStyleRule[]
  return rules.map((entry) => entry.selectorText?.replace(/\s+/g, ' ') ?? '')
}

// A textarea with no class is the regression this guards: the quotation form's
// five controls carry no className at all, so a bar that only reaches a named
// class leaves them on the browser default.
function appendClasslessTextarea() {
  const textarea = browser.document.createElement('textarea')
  // happy-dom types `rows` as a string, matching the rendered `rows="4"` markup.
  textarea.setAttribute('rows', '4')
  browser.document.body.append(textarea)
  return textarea
}

// The shared field-control rule is authored across two lines. Reading it once
// here keeps the height test from hardcoding a padding that chat.css owns, and
// makes an absent rule fail loudly instead of comparing two undefined values.
const FIELD_CONTROL_PADDING = declaration('.os-chat-contact-field input, .os-chat-contact-field textarea', 'padding')

describe('global textarea scrollbar', () => {
  test('every textarea draws the OS bar without opting in', () => {
    const computed = browser.getComputedStyle(appendClasslessTextarea())

    expect(declaration('textarea', 'scrollbar-width')).toBe('thin')
    expect(declaration('textarea', 'scrollbar-color')).toBe('var(--os-yellow) transparent')
    // A bar appearing at the cap would reflow the text horizontally on every
    // line that crosses it, so the gutter is reserved from the start.
    expect(declaration('textarea', 'scrollbar-gutter')).toBe('stable')
    expect(declaration('textarea::-webkit-scrollbar', 'width')).toBe('10px')
    expect(declaration('textarea::-webkit-scrollbar-track', 'background')).toBe('transparent')
    expect(declaration('textarea::-webkit-scrollbar-thumb', 'background')).toBe('var(--os-yellow)')
    // The 2px transparent border is what insets the thumb inside the bar.
    expect(declaration('textarea::-webkit-scrollbar-thumb', 'border')).toBe('2px solid transparent')
    expect(declaration('textarea::-webkit-scrollbar-thumb', 'background-clip')).toBe('content-box')

    expect(computed.scrollbarGutter).toBe('stable')
    expect(computed.scrollbarWidth).toBe('thin')
    expect(computed.resize).toBe('vertical')
  })

  test('the per-class copies that this rule replaced are gone', () => {
    // These two classes used to carry byte-identical copies of the recipe.
    // Left in place they would drift, and a caller could mistake one for the
    // source of truth.
    expect(declaration('.contact-message-textarea', 'scrollbar-width')).toBeUndefined()
    expect(declaration('.os-chat-input::-webkit-scrollbar', 'width')).toBeUndefined()
    expect(declaration('.os-chat-input::-webkit-scrollbar-thumb', 'background')).toBeUndefined()

    // The composer keeps the behaviour the global rule does not supply: it is
    // the one textarea whose box is capped by script, so it must still scroll
    // and still reserve its gutter.
    expect(declaration('.os-chat-input', 'overflow-y')).toBe('auto')
    expect(declaration('.os-chat-input', 'scrollbar-gutter')).toBe('stable')

    // The transcript is a scroll container with an opaque dark track, not a
    // textarea, so it keeps its own bar rather than inheriting the global one.
    expect(declaration('.os-chat-viewport::-webkit-scrollbar-track', 'background')).toBe('#20202b')
  })
})

describe('contact field control heights', () => {
  test('the select trigger is not pinned below the inputs beside it', () => {
    // SelectTrigger ships `data-[size=default]:h-9`, which measured 36px while
    // the inputs computed to 43.5px. `height: auto` lets this rule's own padding
    // and font produce the same box as the inputs.
    expect(declaration('.os-chat-contact-select', 'height')).toBe('auto')
    // Both must derive their box from the same padding for that to hold.
    expect(FIELD_CONTROL_PADDING).toBe('10px 11px')
    expect(declaration('.os-chat-contact-select', 'padding')).toBe(FIELD_CONTROL_PADDING)
  })
})

describe('contact field example and count', () => {
  function hint() {
    const row = browser.document.createElement('div')
    row.className = 'os-chat-contact-hint'
    const note = browser.document.createElement('p')
    note.className = 'os-chat-contact-example'
    const count = browser.document.createElement('p')
    count.className = 'os-chat-contact-count'
    row.append(note, count)
    browser.document.body.append(row)
    return { row, note, count }
  }

  test('the count is pinned right and cannot be pushed off the row', () => {
    expect(declaration('.os-chat-contact-hint', 'display')).toBe('flex')
    expect(declaration('.os-chat-contact-hint', 'align-items')).toBe('flex-start')
    // A flex item's automatic minimum size is its min-content width, so
    // without this a single long token (a pasted URL) would push the count out
    // of the row instead of wrapping.
    expect(declaration('.os-chat-contact-hint .os-chat-contact-example', 'min-width')).toBe('0')
    expect(declaration('.os-chat-contact-hint .os-chat-contact-example', 'flex')).toBe('1 1 auto')
    // `flex: none` is the shorthand, and CSSOM serializes it expanded.
    expect(declaration('.os-chat-contact-hint .os-chat-contact-count', 'flex')).toBe('0 0 auto')
    // Without nowrap a count could itself wrap onto two lines and stop reading
    // as a limit at a glance.
    expect(declaration('.os-chat-contact-hint .os-chat-contact-count', 'white-space')).toBe('nowrap')
  })

  test('the note takes the slack and the count keeps its own margin reset', () => {
    const { note, count } = hint()

    expect(browser.getComputedStyle(note).marginTop).toBe('0px')
    expect(browser.getComputedStyle(count).marginTop).toBe('0px')
    // The standalone example on a choice field keeps its own top margin.
    expect(declaration('.os-chat-contact-example', 'margin')).toBe('5px 0px 0px')
  })
})

describe('contact discard action', () => {
  test('the container carries no yellow box', () => {
    const container = browser.document.createElement('div')
    container.className = 'os-chat-contact-discard'
    browser.document.body.append(container)

    // The yellow box came from a shared selector list, so the claim is that the
    // discard is no longer in it. happy-dom reports an unset property as ''
    // rather than as a default, which is the serialization these read.
    const computed = browser.getComputedStyle(container)
    expect(computed.backgroundColor).toBe('')
    expect(computed.borderLeftWidth).toBe('')
    expect(computed.padding).toBe('')
    expect(declaration('.os-chat-contact-discard', 'background')).toBe('')
    expect(declaration('.os-chat-contact-discard', 'padding')).toBe('')
    // And no rule anywhere still pairs the two selectors.
    expect(
      allSelectors().some(
        (selector) =>
          selector
            .split(',')
            .map((s) => s.trim())
            .includes('.os-chat-contact-discard') && selector.includes('.os-chat-contact-notice'),
      ),
    ).toBe(false)

    // The notice is a different component and keeps its yellow treatment. This
    // is the positive control that the window resolves declarations at all.
    expect(declaration('.os-chat-contact-notice', 'background')).toBe('#fff4ba')
    expect(declaration('.os-chat-contact-notice', 'padding')).toBe('10px 12px')
  })

  test('the button is an outline, and the dead solid-danger rule is gone', () => {
    // A filled coral button read as a second primary action beside
    // SCREEN AND REVIEW.
    expect(declaration('.os-chat-contact-discard-button', 'border-color')).toBe('var(--os-coral)')
    expect(declaration('.os-chat-contact-actions .pixel-button.danger', 'background')).toBeUndefined()
  })
})
