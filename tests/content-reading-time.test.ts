import { describe, expect, test } from 'bun:test'

import { contentCardDate, formatReadingTime, readingTimeMinutes } from '../src/lib/content/date'

/** Builds a Lexical root whose single paragraph carries exactly `text`. */
function lexicalWithText(text: string) {
  return {
    root: {
      type: 'root',
      version: 1,
      direction: null,
      format: '',
      indent: 0,
      children: [
        {
          type: 'paragraph',
          version: 1,
          direction: null,
          format: '',
          indent: 0,
          children: [{ type: 'text', version: 1, text }],
        },
      ],
    },
  }
}

/** 900 characters per minute, so one minute is this many characters. */
const CHARS_PER_MINUTE = 900

function textOfLength(characters: number): string {
  return 'x'.repeat(characters)
}

describe('reading time', () => {
  test('measures by character count, not word count', () => {
    // 1800 characters at 900 chars/min is exactly 2 minutes.
    expect(readingTimeMinutes(lexicalWithText(textOfLength(1800)))).toBe(2)
  })

  test('rounds up so any readable text reports at least one minute', () => {
    expect(readingTimeMinutes(lexicalWithText(textOfLength(10)))).toBe(1)
    expect(readingTimeMinutes(lexicalWithText(textOfLength(CHARS_PER_MINUTE - 1)))).toBe(1)
  })

  test('counts CJK text by character rather than treating a sentence as one word', () => {
    // A word-based counter sees this whole sentence as one "word" and would
    const chinese = '這是一段測試用的中文內容用來驗證閱讀時間的計算方式是否正確。'.repeat(60)
    expect(readingTimeMinutes(lexicalWithText(chinese))).toBeGreaterThan(1)
  })

  test('sums characters across separate text nodes', () => {
    const two = {
      root: {
        type: 'root',
        version: 1,
        children: [
          {
            type: 'paragraph',
            version: 1,
            children: [
              { type: 'text', version: 1, text: textOfLength(900) },
              { type: 'text', version: 1, text: textOfLength(900) },
            ],
          },
        ],
      },
    }

    expect(readingTimeMinutes(two)).toBe(2)
  })

  test('returns null when there is no text to measure', () => {
    expect(readingTimeMinutes(null)).toBeNull()
    expect(readingTimeMinutes(lexicalWithText(''))).toBeNull()
    expect(readingTimeMinutes({ root: { children: [] } })).toBeNull()
  })

  test('formats minutes in the site label style', () => {
    expect(formatReadingTime(1)).toBe('1 MIN READ')
    expect(formatReadingTime(7)).toBe('7 MIN READ')
  })
})

describe('content card date', () => {
  test('prefers the publication date when present', () => {
    expect(contentCardDate('2026-09-20T00:00:00.000Z', '2026-09-25T00:00:00.000Z')).toBe('20/9/2026')
  })

  test('falls back to the update date when unpublished', () => {
    expect(contentCardDate(null, '2026-09-25T00:00:00.000Z')).toBe('25/9/2026')
  })

  test('returns null when neither date is usable', () => {
    expect(contentCardDate(null, null)).toBeNull()
    expect(contentCardDate('not-a-date', 'also-not-a-date')).toBeNull()
  })
})
