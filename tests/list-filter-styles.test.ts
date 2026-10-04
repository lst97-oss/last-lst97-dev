import { describe, expect, test } from 'bun:test'
import { createSiteStyleWindow } from './site-stylesheet'

const { window: browser, styleElement } = await createSiteStyleWindow()

function element(tag: string, className: string) {
  const node = browser.document.createElement(tag)
  node.className = className
  return node
}

describe('content list filter styles', () => {
  test('gives the accordion item the pixel border treatment instead of the shadcn underline', () => {
    expect(styleElement.textContent?.length).toBeGreaterThan(0)

    const item = element('div', '')
    item.setAttribute('data-slot', 'accordion-item')
    const accordion = element('div', 'list-filter-accordion')
    accordion.append(item)
    browser.document.body.append(accordion)

    const style = browser.getComputedStyle(item)

    // The trigger ships with a hover underline and rounded corners from the
    // shadcn primitive; the filter row has to keep the window's hard-edge
    // chrome, so the item must carry a 2px border of its own.
    expect(style.borderTopWidth).toBe('2px')

    accordion.remove()
  })

  test('flattens the trigger so it reads as a pixel control', () => {
    const trigger = element('button', 'list-filter-trigger')
    browser.document.body.append(trigger)

    const style = browser.getComputedStyle(trigger)
    // `!important` is required here: the primitive sets `rounded-md` and a
    // 1rem padding on the trigger's own class, and a plain declaration would
    // lose to it in the cascade. The value is the chat tool section's own
    // `7px 10px` (`chat.css` `.os-chat-suggestions-summary`), which the filter
    // bar now mirrors.
    expect(style.borderTopLeftRadius).toBe('0px')
    expect(style.paddingLeft).toBe('10px')

    trigger.remove()
  })

  test('keeps the topic filter box narrower than a full-width query', () => {
    const input = element('input', 'list-search--topics')
    browser.document.body.append(input)

    // A cap, not a fixed width: the box is one control in a column, so it must
    // shrink on a narrow viewport rather than overflow it.
    expect(browser.getComputedStyle(input).maxWidth).toBe('320px')

    input.remove()
  })

  test('marks the active chip with the accent fill', () => {
    const chip = element('a', 'topic-filter-link topic-filter-link--active')
    browser.document.body.append(chip)

    const style = browser.getComputedStyle(chip)

    expect(style.backgroundColor).not.toBe('')
    expect(style.backgroundColor).not.toBe(browser.getComputedStyle(element('a', 'topic-filter-link')).backgroundColor)

    chip.remove()
  })
})
