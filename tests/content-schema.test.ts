import { describe, expect, test } from 'bun:test'

import { Changelogs } from '../src/collections/Changelogs'
import { Media } from '../src/collections/Media'
import { Posts } from '../src/collections/Posts'
import { Projects } from '../src/collections/Projects'
import { Topics } from '../src/collections/Topics'
import { migrations } from '../src/migrations'

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
type MigrationSnapshot = {
  tables: Record<string, { columns: Record<string, unknown> }>
}

const migrationsDir = new URL('../src/migrations/', import.meta.url).pathname
const NEWEST_MIGRATION = migrations.at(-1)
if (!NEWEST_MIGRATION) throw new Error('Expected at least one registered Payload migration')

// drizzle derives column names from the collection's camelCase size name by
// inserting an underscore before each capital, so `gallerySm` becomes
// `gallery_sm` — NOT `gallerySm`. Getting this wrong makes the guard assert a
// column that never exists in any snapshot.
const toSnakeCase = (name: string) => name.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase()

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
    expect(field(Posts.fields, 'status')?.options?.map(({ value }) => value)).toEqual(['draft', 'published'])
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
    expect(lifecycle?.options?.map(({ value }) => value)).toEqual(['planned', 'in_progress', 'completed', 'archived'])

    for (const name of ['startDate', 'endDate']) {
      expect(field(Projects.fields, name)).toMatchObject({
        type: 'date',
        admin: { date: { pickerAppearance: 'dayOnly' } },
      })
      expect(field(Projects.fields, name)?.required).not.toBe(true)
    }

    expect(field(Projects.fields, 'status')?.options?.map(({ value }) => value)).toEqual(['draft', 'published'])
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
      'feature',
      'improvement',
      'bug_fix',
      'security',
      'breaking_change',
      'maintenance',
      'documentation',
    ])
    expect(field(Changelogs.fields, 'status')?.options?.map(({ value }) => value)).toEqual(['draft', 'published'])
  })

  test('media generates responsive image sizes and keeps accessible alt text required', () => {
    expect(Media.upload).toMatchObject({
      adminThumbnail: 'thumbnail',
      focalPoint: true,
    })
    const upload = Media.upload
    if (!upload || upload === true) throw new Error('Media upload config should be an object')
    // The three crops back the covers; the two width-preserving sizes back the
    // surfaces that paint an image at its own ratio. Every entry must stay
    // `fit: 'inside'` without a height — `Media` enables `focalPoint`, so a
    // fixed-height size takes Payload's focal-point branch and CROPS, which is
    // exactly what an uncropped derivative must not do.
    expect(upload.imageSizes?.map(({ name }) => name)).toEqual(['thumbnail', 'card', 'hero', 'gallerySm', 'galleryLg'])
    for (const size of upload.imageSizes?.slice(3) ?? []) {
      expect(size.fit).toBe('inside')
      expect(size.height).toBeUndefined()
      expect(size.withoutEnlargement).toBe(true)
    }
    expect(field(Media.fields, 'alt')?.required).toBe(true)
  })

  test('topics provide stable public labels', () => {
    expect(Topics.slug).toBe('topics')
    expect(field(Topics.fields, 'title')?.required).toBe(true)
    expect(field(Topics.fields, 'slug')).toMatchObject({ type: 'text', required: false, unique: true })
  })
})

describe('Media schema drift guard', () => {
  const upload = Media.upload
  if (!upload || upload === true) throw new Error('Media upload config should be an object')

  // A collection field with no migration behind it fails at QUERY time, not
  // compile time: drizzle selects every `sizes_*` column the collection
  // declares, so a newly declared image size with no `ADD COLUMN` aborts the
  // whole media read with `column "sizes_<name>_url" does not exist` — which
  // takes out every image on the page, not just the new size. Assert the newest
  // committed snapshot actually carries a column group for each declared size.
  test('every declared image size has its columns in the newest migration snapshot', async () => {
    const snapshot = (await Bun.file(`${migrationsDir}/${NEWEST_MIGRATION.name}.json`).json()) as MigrationSnapshot
    const mediaColumns = Object.keys(snapshot.tables['public.media'].columns)

    for (const { name } of upload.imageSizes ?? []) {
      expect(mediaColumns).toContain(`sizes_${toSnakeCase(name)}_url`)
      expect(mediaColumns).toContain(`sizes_${toSnakeCase(name)}_filename`)
    }
  })

  test('versions table carries a version_ prefixed column per declared image size', async () => {
    const snapshot = (await Bun.file(`${migrationsDir}/${NEWEST_MIGRATION.name}.json`).json()) as MigrationSnapshot
    const versionColumns = Object.keys(snapshot.tables['public._media_v'].columns)

    for (const { name } of upload.imageSizes ?? []) {
      expect(versionColumns).toContain(`version_sizes_${toSnakeCase(name)}_url`)
    }
  })
})
