import { describe, expect, test } from 'bun:test'
import { Changelogs } from '../src/collections/Changelogs'
import { ensureContentSlug, resolveContentSlug } from '../src/collections/hooks/content-slug'
import { Posts } from '../src/collections/Posts'
import { Projects } from '../src/collections/Projects'
import { Topics } from '../src/collections/Topics'

describe('content slug generation', () => {
  test('creates a URL friendly slug from a title when no slug exists', () => {
    expect(resolveContentSlug({ title: '  Crème & AI: Part 2!  ' })).toBe('creme-ai-part-2')
  })

  test('preserves an explicitly supplied slug', () => {
    expect(resolveContentSlug({ title: 'New title', providedSlug: 'custom-route' })).toBe('custom-route')
  })

  test('preserves an existing slug when editing a title without changing the slug', () => {
    expect(resolveContentSlug({ title: 'Renamed article', existingSlug: 'original-route' })).toBe('original-route')
  })

  test('supports non-Latin titles and leaves punctuation-only titles blank for validation', () => {
    expect(resolveContentSlug({ title: '中文 标题' })).toBe('中文-标题')
    expect(resolveContentSlug({ title: '!!!' })).toBe('')
  })

  test('uses the hook for every editorial collection and preserves a custom route on update', () => {
    for (const collection of [Posts, Projects, Changelogs, Topics]) {
      expect(collection.hooks?.beforeValidate).toContain(ensureContentSlug)
    }

    const hookArgs = {
      data: { title: 'Changed title' },
      originalDoc: { title: 'Original title', slug: 'stable-route' },
    } as unknown as Parameters<typeof ensureContentSlug>[0]
    expect(ensureContentSlug(hookArgs)?.slug).toBe('stable-route')
  })

  test('uses an admin field to auto-fill each optional slug', () => {
    for (const collection of [Posts, Projects, Changelogs, Topics]) {
      const slugField = collection.fields.find((field) => 'name' in field && field.name === 'slug')
      expect(slugField && 'required' in slugField ? slugField.required : undefined).toBe(false)
      expect(slugField && 'admin' in slugField ? slugField.admin?.components?.Field : undefined).toBe(
        '@/components/payload/slug-field#SlugField',
      )
    }
  })
})

describe('admin slug autocomplete', () => {
  test('fills an empty slug, refreshes an untouched generated value, and leaves a custom value alone', async () => {
    const { automaticSlugForTitle } = await import('../src/lib/content/automatic-slug')

    expect(automaticSlugForTitle({ title: 'New note', currentSlug: '' })).toBe('new-note')
    expect(
      automaticSlugForTitle({ title: 'Renamed note', currentSlug: 'new-note', previousAutomaticSlug: 'new-note' }),
    ).toBe('renamed-note')
    expect(
      automaticSlugForTitle({ title: 'Renamed note', currentSlug: 'custom-route', previousAutomaticSlug: 'new-note' }),
    ).toBeNull()
  })
})
