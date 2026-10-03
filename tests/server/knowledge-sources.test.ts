import { describe, expect, it } from 'bun:test'

import { createPayloadKnowledgeSource } from '../../src/server/knowledge/payload-source'
import { createProfileKnowledgeSource } from '../../src/server/knowledge/profile-source'

describe('Payload knowledge source', () => {
  it('includes only published content and maps its public URL and Lexical text', async () => {
    const source = createPayloadKnowledgeSource({
      type: 'post',
      publicSiteUrl: 'https://portfolio.example.test/',
      now: () => new Date('2026-09-23T00:00:00Z'),
      findById: async () => ({
        id: 12,
        title: 'Reliable services',
        slug: 'reliable-services',
        excerpt: 'A short overview.',
        status: 'published',
        publishedAt: '2026-09-22T00:00:00Z',
        updatedAt: '2026-09-22T12:00:00Z',
        content: {
          root: {
            children: [{ type: 'paragraph', children: [{ type: 'text', text: 'Retries improve resilience.' }] }],
          },
        },
      }),
    })

    const document = await source.fetch('12')

    expect(document?.isPublic).toBe(true)
    expect(document?.source.url).toBe('https://portfolio.example.test/blog/reliable-services')
    expect(document?.text).toBe('Reliable services\n\nA short overview.\n\nRetries improve resilience.')
    expect(document?.sourceUpdatedAt?.toISOString()).toBe('2026-09-22T12:00:00.000Z')
  })

  it('marks drafts, future posts, and records with invalid publication dates as ineligible', async () => {
    for (const record of [
      { status: 'draft', publishedAt: '2026-09-01T00:00:00Z' },
      { status: 'published', publishedAt: '2026-09-24T00:00:00Z' },
      { status: 'published', publishedAt: 'not-a-date' },
    ]) {
      const source = createPayloadKnowledgeSource({
        type: 'project',
        publicSiteUrl: 'https://portfolio.example.test',
        now: () => new Date('2026-09-23T00:00:00Z'),
        findById: async () => ({ id: 'project-1', title: 'Project', slug: 'project', ...record }),
      })
      expect((await source.fetch('project-1'))?.isPublic).toBe(false)
    }
  })

  it('does not return a record when the requested source id no longer exists', async () => {
    const source = createPayloadKnowledgeSource({
      type: 'post',
      publicSiteUrl: 'https://portfolio.example.test',
      findById: async () => null,
    })
    expect(await source.fetch('missing')).toBeNull()
  })
})

describe('curated profile knowledge source', () => {
  it('exposes the reviewed biography, education, experience, and public profile URLs', async () => {
    const source = createProfileKnowledgeSource()
    const document = await source.fetch('operator-profile')

    expect(document?.isPublic).toBe(true)
    expect(document?.source.title).toBe('Nelson (LST97)')
    expect(document?.source.url).toBe('https://github.com/lst97')
    const text = document?.text ?? ''
    for (const fact of [
      'junior software developer',
      'Hong Kong',
      'Lai Sio Tou',
      '1997',
      'https://github.com/lst97',
      'https://www.linkedin.com/in/lst97/',
      'Next.js',
      'React',
      'TypeScript',
      'C#',
      'Diploma of Information Technology',
      'Deakin College',
      '2021',
      'Certificate IV in Information Technology',
      '85% WAM',
      'Bachelor of Computer Science',
      'Deakin University',
      '2023',
      '70% WAM',
      'Diploma of Automotive Technology',
      'Box Hill Institute of TAFE',
      '2019',
      'Certificate IV in Automotive',
      'Hoyu Secondary School',
      '2016',
      'Rotary Club of Melbourne',
      'Team Leader',
      'Mar–May 2023',
      'music and art therapy',
      'KC Renovation',
      'Mar–Jun 2021',
      'weekly status reports',
      'ST Zita Cafe',
      'Oct 2021–Jul 2022',
      'Kmart Tyre & Auto Services',
      'Jul 2019–Jan 2020',
      'expense-management',
      "SplitTab is Nelson's expense-management app for splitting shared costs.",
      'GNAF Autocomplete demo: https://gnaf.lst97.dev',
      'Smartplay HK OSS demo: https://sphkoss.lst97.dev',
      'Best Maker website: https://www.bestmaker.com.au',
      'Contact email for enquiries: laisiotu1997@gmail.com',
    ]) {
      expect(text).toContain(fact)
    }
    expect(text.match(/KC Renovation/g)).toHaveLength(1)
    expect(text).not.toContain('1167 Glen Huntly Road')
    expect(text).not.toContain('Elgar Road')
    expect(text).not.toContain('featured-project')
    expect(await source.fetch('other-profile')).toBeNull()
  })
})
