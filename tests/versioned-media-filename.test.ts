import { describe, expect, test } from 'bun:test'
import {
  ensureVersionedMediaFilename,
  resolveVersionedFilename,
} from '../src/collections/hooks/versioned-media-filename'
import { Media } from '../src/collections/Media'

const UPLOADED_AT = '2026-10-05T05:23:04.123Z'

function hookArgs(data: Record<string, unknown>, originalDoc: Record<string, unknown> = {}) {
  return { data, originalDoc } as unknown as Parameters<typeof ensureVersionedMediaFilename>[0]
}

describe('versioned media filename', () => {
  test('appends the upload time so a replaced image gets a new URL', () => {
    expect(resolveVersionedFilename({ filename: 'gnaf-1.webp', uploadedAt: UPLOADED_AT })).toBe(
      'gnaf-1-20261005T052304123.webp',
    )
  })

  test('is stable for the same upload, so a retry cannot mint a second copy', () => {
    const once = resolveVersionedFilename({ filename: 'gnaf-1.webp', uploadedAt: UPLOADED_AT })
    const twice = resolveVersionedFilename({ filename: 'gnaf-1.webp', uploadedAt: UPLOADED_AT })

    expect(once).toBe(twice)
  })

  test('produces different URLs for two uploads of the same original name', () => {
    const first = resolveVersionedFilename({ filename: 'hero.png', uploadedAt: '2026-10-05T05:23:04.123Z' })
    const second = resolveVersionedFilename({ filename: 'hero.png', uploadedAt: '2026-10-06T09:00:00.000Z' })

    expect(first).not.toBe(second)
  })

  test('never emits a colon, which is invalid in a path segment on Windows', () => {
    expect(resolveVersionedFilename({ filename: 'hero.png', uploadedAt: UPLOADED_AT })).not.toContain(':')
  })

  test('handles names without an extension, and dotfiles that are not extensions', () => {
    expect(resolveVersionedFilename({ filename: 'README', uploadedAt: UPLOADED_AT })).toBe('README-20261005T052304123')
    expect(resolveVersionedFilename({ filename: '.gitignore', uploadedAt: UPLOADED_AT })).toBe(
      '.gitignore-20261005T052304123',
    )
  })

  test('rejects an empty filename rather than minting an unversioned object', () => {
    expect(() => resolveVersionedFilename({ filename: '   ', uploadedAt: UPLOADED_AT })).toThrow()
  })

  test('leaves a pre-hook upload unversioned when it has no upload time to derive one from', () => {
    expect(resolveVersionedFilename({ filename: 'legacy.webp', uploadedAt: null })).toBe('legacy.webp')
  })

  test('versions a new upload through the hook', () => {
    const data = ensureVersionedMediaFilename(hookArgs({ filename: 'gnaf-1.webp', uploadedAt: UPLOADED_AT })) as Record<
      string,
      unknown
    >

    expect(data.filename).toBe('gnaf-1-20261005T052304123.webp')
  })

  test('keeps the existing filename when only metadata is re-saved, so references stay valid', () => {
    const data = ensureVersionedMediaFilename(
      hookArgs({ alt: 'new alt text' }, { filename: 'gnaf-1.webp', uploadedAt: UPLOADED_AT }),
    ) as Record<string, unknown>

    expect(data.filename).toBeUndefined()
  })

  test('re-versions an upload whose bytes were replaced under the same name', () => {
    const data = ensureVersionedMediaFilename(
      hookArgs(
        { filename: 'gnaf-1.webp', uploadedAt: '2026-10-06T09:00:00.000Z' },
        { filename: 'gnaf-1-20261005T052304123.webp', uploadedAt: UPLOADED_AT },
      ),
    ) as Record<string, unknown>

    expect(data.filename).toBe('gnaf-1-20261006T090000000.webp')
  })

  test('is wired into the media collection', () => {
    expect(Media.hooks?.beforeChange).toContain(ensureVersionedMediaFilename)
  })
})
