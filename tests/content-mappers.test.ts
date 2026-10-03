import { describe, expect, test } from 'bun:test'

import {
  mapChangelog,
  mapChangelogSummary,
  mapPost,
  mapPostSummary,
  mapProject,
  mapProjectSummary,
} from '../src/server/content/payload-mappers'

describe('Payload content mappers', () => {
  test('accepts valid Lexical editor state and discards malformed serialized content', () => {
    const editorState = {
      root: {
        type: 'root',
        version: 1,
        direction: null,
        format: '',
        indent: 0,
        children: [{ type: 'paragraph', version: 1, children: [] }],
      },
    }

    expect(mapPost({ content: editorState }).content?.root.type).toBe('root')
    expect(mapPost({ content: { root: 'not-an-editor-state' } }).content).toBeNull()
    expect(
      mapPost({
        content: {
          root: { type: 'root', children: [{ type: 'text', text: { secret: 'not-renderable' }, format: 1 }] },
        },
      }).content,
    ).toBeNull()
    expect(
      mapPost({
        content: {
          root: { type: 'root', children: [{ type: 'paragraph', children: { type: 'text', text: 'not-an-array' } }] },
        },
      }).content,
    ).toBeNull()
  })

  test('keeps accessible table metadata and safe code fields for public Markdown rendering', () => {
    const mapped = mapPost({
      content: {
        root: {
          type: 'root',
          children: [
            {
              type: 'table',
              children: [
                {
                  type: 'tablerow',
                  children: [{ type: 'tablecell', headerState: 1, colSpan: 2, rowSpan: 1, children: [] }],
                },
              ],
            },
            {
              type: 'block',
              fields: {
                blockType: 'Code',
                code: 'const safe = true',
                language: 'typescript',
                privateField: 'discard me',
              },
            },
          ],
        },
      },
    }).content

    const serialized = JSON.stringify(mapped)
    expect(serialized).toContain('"headerState":1')
    expect(serialized).toContain('"colSpan":2')
    expect(serialized).toContain('"blockType":"Code"')
    expect(serialized).toContain('"code":"const safe = true"')
    expect(serialized).toContain('"language":"typescript"')
    expect(serialized).not.toContain('discard me')
  })

  test('projects only public related records into Lexical relationships and internal links', () => {
    const draftPost = {
      id: 'draft-post',
      slug: 'private-note',
      title: 'Private note title',
      excerpt: 'Private note excerpt',
      status: 'draft',
      publishedAt: '2026-09-01T00:00:00.000Z',
      content: { root: { children: [{ type: 'text', text: 'Private full body' }] } },
      adminOnlyValue: 'private metadata',
    }
    const futureProject = {
      id: 'future-project',
      slug: 'not-yet-public',
      title: 'Future project title',
      summary: 'Future project summary',
      status: 'published',
      publishedAt: '2099-01-01T00:00:00.000Z',
      content: { root: { children: [{ type: 'text', text: 'Future full body' }] } },
    }
    const publicProject = {
      id: 'public-project',
      slug: 'open-studio',
      title: 'Public project title',
      summary: 'Public project summary',
      status: 'published',
      publishedAt: '2026-09-20T00:00:00.000Z',
      content: { root: { children: [{ type: 'text', text: 'Public full body must not be nested' }] } },
      adminOnlyValue: 'private metadata must not be nested',
    }
    const content = {
      root: {
        type: 'root',
        version: 1,
        direction: null,
        format: '',
        indent: 0,
        children: [
          { type: 'relationship', relationTo: 'projects', value: draftPost, format: '', version: 1 },
          { type: 'relationship', relationTo: 'projects', value: futureProject, format: '', version: 1 },
          { type: 'relationship', relationTo: 'projects', value: publicProject, format: '', version: 1 },
          {
            type: 'link',
            fields: { linkType: 'internal', newTab: false, doc: { relationTo: 'posts', value: draftPost } },
            version: 1,
            direction: null,
            format: '',
            indent: 0,
            children: [
              { type: 'text', text: 'Related note', format: 0, detail: 0, mode: 'normal', style: '', version: 1 },
            ],
          },
        ],
      },
    }

    const serialized = JSON.stringify(mapPost({ content }).content)

    expect(serialized).toContain('Public project title')
    expect(serialized).toContain('Public project summary')
    expect(serialized).not.toContain('Private note')
    expect(serialized).not.toContain('Private full body')
    expect(serialized).not.toContain('private metadata')
    expect(serialized).not.toContain('Future project')
    expect(serialized).not.toContain('Future full body')
    expect(serialized).not.toContain('Public full body must not be nested')
  })

  test('maps post tags, cover art, and optional SEO overrides', () => {
    const document = {
      title: 'Shipping a small tool',
      slug: 'small-tool',
      excerpt: 'A short note.',
      publishedAt: '2026-09-20T00:00:00.000Z',
      tags: [{ tag: 'build logs' }],
      topics: [
        { id: 12, title: 'Engineering', slug: 'engineering', description: 'How software gets built.' },
        { id: 13, title: 'AI', slug: 'ai', description: '' },
      ],
      coverImage: { url: '/media/cover.png', alt: 'A pixelated terminal' },
      seo: {
        title: 'A search title',
        description: 'A search description.',
        image: { url: '/media/social.png', alt: 'Social preview' },
      },
      content: { root: { children: [] } },
    }

    expect(mapPostSummary(document)).toMatchObject({
      tags: ['build logs'],
      topics: [
        { id: 12, title: 'Engineering', slug: 'engineering', description: 'How software gets built.' },
        { id: 13, title: 'AI', slug: 'ai', description: '' },
      ],
      coverImage: { url: '/media/cover.png', alt: 'A pixelated terminal' },
    })
    expect(mapPost(document).seo).toEqual({
      title: 'A search title',
      description: 'A search description.',
      image: { url: '/media/social.png', alt: 'Social preview', width: null, height: null, sizes: {} },
    })
  })

  test('maps project lifecycle metadata and safely handles older records', () => {
    expect(
      mapProjectSummary({
        title: 'Studio',
        slug: 'studio',
        summary: 'A portfolio project.',
        technologies: [{ technology: 'TypeScript' }],
        featured: true,
        gallery: [
          { url: '/media/studio-a.png', alt: 'Studio on desktop' },
          { url: '/media/studio-b.png', alt: 'Studio on mobile' },
        ],
        projectStatus: 'in_progress',
        role: 'Designer and engineer',
        startDate: '2025-01-01T00:00:00.000Z',
        endDate: null,
      }),
    ).toMatchObject({
      projectStatus: 'in_progress',
      gallery: [
        { url: '/media/studio-a.png', alt: 'Studio on desktop' },
        { url: '/media/studio-b.png', alt: 'Studio on mobile' },
      ],
      role: 'Designer and engineer',
      startDate: '2025-01-01T00:00:00.000Z',
      endDate: null,
    })

    expect(mapProject({ title: 'Old project', slug: 'old', summary: 'Legacy' })).toMatchObject({
      projectStatus: null,
      role: null,
      startDate: null,
      endDate: null,
      seo: { title: null, description: null, image: { url: null, alt: null } },
    })
  })

  test('maps changelog version, tags, and SEO overrides', () => {
    const document = {
      title: 'System update',
      slug: 'v1-4-0',
      version: 'v1.4.0',
      excerpt: 'What shipped this week.',
      publishedAt: '2026-09-27T00:00:00.000Z',
      tags: [{ tag: 'added' }],
      changeTypes: ['feature', 'bug_fix', 'unknown'],
      coverImage: { url: null, alt: null },
      content: { root: { children: [] } },
    }

    expect(mapChangelogSummary(document)).toMatchObject({
      version: 'v1.4.0',
      tags: ['added'],
      changeTypes: ['feature', 'bug_fix'],
    })
    expect(mapChangelog(document).seo).toEqual({
      title: null,
      description: null,
      image: { url: null, alt: null },
    })
    expect(mapChangelogSummary({ title: 'Old entry', slug: 'old' }).version).toBeNull()
  })
})
