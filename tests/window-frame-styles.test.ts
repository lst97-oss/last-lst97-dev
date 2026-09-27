import { describe, expect, test } from 'bun:test'
import { Window } from 'happy-dom'

const browser = new Window()
const styles = browser.document.createElement('style')
styles.textContent = await Bun.file(new URL('../src/styles.css', import.meta.url)).text()
browser.document.head.append(styles)

describe('window frame styles', () => {
  test('keeps the desktop background grid fixed while content scrolls', () => {
    const desktop = browser.document.createElement('div')
    desktop.className = 'os-site'
    browser.document.body.append(desktop)

    expect(browser.getComputedStyle(desktop).backgroundAttachment).toBe('fixed')

    desktop.remove()
  })

  test('declares a document scroll lock while keeping maximized window content scrollable', () => {
    const frame = browser.document.createElement('section')
    const otherFrame = browser.document.createElement('section')
    frame.className = 'window-frame is-maximized'
    otherFrame.className = 'window-frame is-maximized'
    const content = browser.document.createElement('div')
    content.className = 'window-content'
    frame.append(content)
    browser.document.body.append(frame, otherFrame)

    const rootLockRule = styles.textContent?.match(/html:has\(\.window-frame\.is-maximized\)\s*\{[^}]*\}/)?.[0] ?? ''

    expect(rootLockRule).toContain('overflow: hidden;')
    expect(browser.getComputedStyle(content).overflow).toBe('auto')

    frame.remove()
    otherFrame.remove()
  })

  test('a minimized dashboard window does not stretch to its grid row', () => {
    const frame = browser.document.createElement('section')
    frame.className = 'window-frame is-minimized'
    browser.document.body.append(frame)

    expect(browser.getComputedStyle(frame).alignSelf).toBe('start')

    frame.remove()
  })

  test('renders the desktop navigation as a compact floating glass dock', () => {
    const sidebar = browser.document.createElement('aside')
    sidebar.className = 'desktop-shortcuts'
    browser.document.body.append(sidebar)

    const computedStyle = browser.getComputedStyle(sidebar)
    expect(computedStyle.position).toBe('fixed')
    expect(computedStyle.height).not.toBe('calc(100vh - 48px)')
    expect(computedStyle.maxHeight).toContain('96px')
    expect(computedStyle.transform).toBe('translateY(-50%)')
    expect(computedStyle.borderRadius).toBe('6px')
    expect(computedStyle.borderRightWidth).toBe('1px')
    expect(computedStyle.backdropFilter).toBe('blur(16px)')
    expect(computedStyle.backgroundColor).toBe('transparent')
    expect(computedStyle.boxShadow).toBe('0 4px 12px rgba(23, 23, 31, 0.16)')

    sidebar.remove()
  })

  test('keeps desktop content in the content column beside the fixed dock', () => {
    const main = browser.document.createElement('main')
    main.className = 'desktop-main'
    browser.document.body.append(main)

    expect(browser.getComputedStyle(main).gridColumn).toBe('2')

    main.remove()
  })

  test('restores visible markers for rich-text ordered and unordered lists', () => {
    const content = browser.document.createElement('div')
    content.className = 'rich-text'
    const unorderedList = browser.document.createElement('ul')
    const orderedList = browser.document.createElement('ol')
    content.append(unorderedList, orderedList)
    browser.document.body.append(content)

    expect(browser.getComputedStyle(unorderedList).listStyleType).toBe('disc')
    expect(browser.getComputedStyle(orderedList).listStyleType).toBe('decimal')

    content.remove()
  })

  test('uses dark ink for the default dock navigation label color', () => {
    const shortcutRule = Array.from(styles.sheet?.cssRules ?? []).find((rule) =>
      rule.cssText.startsWith('.desktop-shortcut {'),
    )

    expect(shortcutRule?.cssText).toContain('color: var(--os-ink)')
  })

  test('reveals operator coding details only when the profile window is maximized', () => {
    const frame = browser.document.createElement('section')
    frame.className = 'window-frame operator-profile-window'
    const details = browser.document.createElement('div')
    details.className = 'profile-coding-details'
    const jsonDetails = browser.document.createElement('div')
    jsonDetails.className = 'profile-json-details'
    frame.append(details, jsonDetails)
    browser.document.body.append(frame)

    expect(browser.getComputedStyle(details).display).toBe('none')
    expect(browser.getComputedStyle(jsonDetails).display).toBe('none')

    frame.classList.add('is-maximized')
    expect(browser.getComputedStyle(details).display).not.toBe('none')
    expect(browser.getComputedStyle(jsonDetails).display).not.toBe('none')

    frame.remove()
  })
})
