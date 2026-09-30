import { describe, expect, test } from 'bun:test'

import { Changelogs } from '../src/collections/Changelogs'
import { Media } from '../src/collections/Media'
import { Posts } from '../src/collections/Posts'
import { Projects } from '../src/collections/Projects'
import { Topics } from '../src/collections/Topics'
import { HomePage } from '../src/globals/HomePage'

type FieldShape = {
  admin?: { date?: { pickerAppearance?: string } }
  defaultValue?: unknown
  fields?: FieldShape[]
  name?: string
  options?: { label: string; value: string }[]
  relationTo?: string
  required?: boolean
  type?: string
}

function field(fields: unknown[], name: string): FieldShape | undefined {
  return (fields as FieldShape[]).find((item) => item.name === name)
}

function expectSeoGroup(fields: unknown[]) {
  const seo = field(fields, 'seo')

  expect(seo?.type).toBe('group')
  expect(seo?.fields?.every((item) => item.required !== true)).toBe(true)
  expect(field(seo?.fields ?? [], 'title')?.type).toBe('text')
  expect(field(seo?.fields ?? [], 'description')?.type).toBe('textarea')
  expect(field(seo?.fields ?? [], 'image')).toMatchObject({
    type: 'upload',
    relationTo: 'media',
  })
}

describe('Payload editorial schemas', () => {
  test('posts add optional SEO overrides without replacing tags or publication status', () => {
    expectSeoGroup(Posts.fields)
    expect(field(Posts.fields, 'slug')?.required).toBe(false)
    expect(field(Posts.fields, 'tags')?.type).toBe('array')
    expect(field(Posts.fields, 'topics')).toMatchObject({
      type: 'relationship',
      relationTo: 'topics',
      hasMany: true,
    })
    expect(field(Posts.fields, 'status')?.options?.map(({ value }) => value)).toEqual([
      'draft',
      'published',
    ])
  })

  test('projects separate optional lifecycle and timeframe from publication status', () => {
    expectSeoGroup(Projects.fields)
    expect(field(Projects.fields, 'slug')?.required).toBe(false)
    // A single `hasMany` upload: one multi-select picker holds every image, and
    // the media document's own `alt` is the caption, so there is no per-row
    // caption field to keep in sync.
    expect(field(Projects.fields, 'gallery')).toMatchObject({
      type: 'upload',
      relationTo: 'media',
      hasMany: true,
    })
    expect(field(Projects.fields, 'role')?.type).toBe('text')
    expect(field(Projects.fields, 'role')?.required).not.toBe(true)

    const lifecycle = field(Projects.fields, 'projectStatus')
    expect(lifecycle?.required).not.toBe(true)
    expect(lifecycle?.defaultValue).toBeUndefined()
    expect(lifecycle?.options?.map(({ value }) => value)).toEqual([
      'planned',
      'in_progress',
      'completed',
      'archived',
    ])

    for (const name of ['startDate', 'endDate']) {
      expect(field(Projects.fields, name)).toMatchObject({
        type: 'date',
        admin: { date: { pickerAppearance: 'dayOnly' } },
      })
      expect(field(Projects.fields, name)?.required).not.toBe(true)
    }

    expect(field(Projects.fields, 'status')?.options?.map(({ value }) => value)).toEqual([
      'draft',
      'published',
    ])
  })

  test('changelogs keep version optional while requiring excerpt, content, and publication status', () => {
    expectSeoGroup(Changelogs.fields)
    expect(Changelogs.slug).toBe('changelogs')
    expect(field(Changelogs.fields, 'title')?.required).toBe(true)
    expect(field(Changelogs.fields, 'slug')?.required).toBe(false)
    expect(field(Changelogs.fields, 'version')?.required).not.toBe(true)
    expect(field(Changelogs.fields, 'excerpt')?.required).toBe(true)
    expect(field(Changelogs.fields, 'content')?.required).toBe(true)
    expect(field(Changelogs.fields, 'tags')?.type).toBe('array')
    expect(field(Changelogs.fields, 'changeTypes')).toMatchObject({ type: 'select', hasMany: true })
    expect(field(Changelogs.fields, 'changeTypes')?.options?.map(({ value }) => value)).toEqual([
      'feature', 'improvement', 'bug_fix', 'security', 'breaking_change', 'maintenance', 'documentation',
    ])
    expect(field(Changelogs.fields, 'status')?.options?.map(({ value }) => value)).toEqual([
      'draft',
      'published',
    ])
  })

  test('media generates responsive image sizes and keeps accessible alt text required', () => {
    expect(Media.upload).toMatchObject({
      adminThumbnail: 'thumbnail',
      focalPoint: true,
    })
    const upload = Media.upload
    if (!upload || upload === true) throw new Error('Media upload config should be an object')
    expect(upload.imageSizes?.map(({ name }) => name)).toEqual(['thumbnail', 'card', 'hero'])
    expect(field(Media.fields, 'alt')?.required).toBe(true)
  })

  test('topics provide stable public labels and the homepage selects one post', () => {
    expect(Topics.slug).toBe('topics')
    expect(field(Topics.fields, 'title')?.required).toBe(true)
    expect(field(Topics.fields, 'slug')).toMatchObject({ type: 'text', required: false, unique: true })
    expect(HomePage.slug).toBe('home-page')
    expect(field(HomePage.fields, 'featuredPost')).toMatchObject({
      type: 'relationship',
      relationTo: 'posts',
      filterOptions: { status: { equals: 'published' } },
    })
  })
})
