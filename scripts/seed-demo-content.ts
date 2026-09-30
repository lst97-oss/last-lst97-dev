/**
 * Seeds demo projects, posts, and changelog entries so the public listing
 * pages have enough content to show the adaptive masonry grid packing.
 *
 * Writes with plain SQL through `pg` rather than the Payload local API.
 * `payload.find()` currently fails on this schema for `projects` — Payload
 * builds a lateral join against a polymorphic `projects_rels` table for the
 * `gallery` upload field, and that table does not exist in the database (the
 * `projects_gallery` table present here has the older `image_id`/`caption`
 * shape). Direct inserts sidestep that unrelated breakage; when the schema and
 * migrations catch up this script can go back to the local API.
 *
 * Idempotent: rows whose slug starts with `demo-` are deleted first, then
 * re-inserted, so repeated runs never accumulate duplicates.
 *
 * LOCAL ONLY — writes to whatever DATABASE_URL is loaded.
 */
import { randomUUID } from 'node:crypto'
import { Client } from 'pg'

const DEMO_PREFIX = 'demo-'

function richText(text: string) {
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
          children: [
            { type: 'text', version: 1, text, detail: 0, format: 0, mode: 'normal', style: '' },
          ],
        },
      ],
    },
  }
}

const NOW = new Date().toISOString()

type ProjectSeed = {
  slug: string
  title: string
  summary: string
  technologies: string[]
  role: string
  projectStatus: string
  startDate: string
  endDate: string | null
  featured: boolean
  sortOrder: number
}

const DEMO_PROJECTS: ProjectSeed[] = [
  {
    slug: 'demo-cantonese-lyrics',
    title: 'Cantonese Lyrics Studio',
    summary:
      'An end-to-end pipeline that aligns Cantonese lyrics to audio, translates them, and renders karaoke playback in the browser with word-level timing.',
    technologies: ['Python', 'PyTorch', 'TypeScript'],
    role: 'Engineer',
    projectStatus: 'in_progress',
    startDate: '2025-03-01T00:00:00.000Z',
    endDate: null,
    featured: true,
    sortOrder: 1,
  },
  {
    slug: 'demo-vector-search',
    title: 'Vector Search Notes',
    summary: 'A working notebook on chunking, reranking, and relevance gating for retrieval-augmented generation.',
    technologies: ['PostgreSQL', 'pgvector'],
    role: 'Engineer',
    projectStatus: 'completed',
    startDate: '2024-11-01T00:00:00.000Z',
    endDate: '2025-02-01T00:00:00.000Z',
    featured: false,
    sortOrder: 2,
  },
  {
    slug: 'demo-terminal-ui',
    title: 'Terminal UI Kit',
    summary: 'A small set of pixel-styled React primitives for building retro interfaces without a framework.',
    technologies: ['React', 'CSS'],
    role: 'Engineer',
    projectStatus: 'completed',
    startDate: '2024-06-01T00:00:00.000Z',
    endDate: '2024-09-01T00:00:00.000Z',
    featured: false,
    sortOrder: 3,
  },
  {
    slug: 'demo-speech-to-text',
    title: 'Speech To Text Bench',
    summary: 'Benchmarks comparing several ASR backends on Cantonese audio, with notes on accuracy and latency.',
    technologies: ['Python', 'ONNX'],
    role: 'Engineer',
    projectStatus: 'completed',
    startDate: '2024-01-01T00:00:00.000Z',
    endDate: '2024-05-01T00:00:00.000Z',
    featured: false,
    sortOrder: 4,
  },
  {
    slug: 'demo-realtime-cart',
    title: 'Realtime Cart',
    summary: 'An experimental checkout with optimistic updates and conflict resolution across browser tabs.',
    technologies: ['TypeScript', 'PostgreSQL'],
    role: 'Engineer',
    projectStatus: 'archived',
    startDate: '2023-04-01T00:00:00.000Z',
    endDate: '2023-12-01T00:00:00.000Z',
    featured: false,
    sortOrder: 5,
  },
  {
    slug: 'demo-prompt-lab',
    title: 'Prompt Lab',
    summary: 'A scratchpad for comparing prompt variants and measuring regressions across model upgrades.',
    technologies: ['Python', 'React'],
    role: 'Engineer',
    projectStatus: 'planned',
    startDate: '2026-10-01T00:00:00.000Z',
    endDate: null,
    featured: false,
    sortOrder: 6,
  },
]

type PostSeed = {
  slug: string
  title: string
  excerpt: string
  tags: string[]
  status: 'published' | 'draft'
  publishedAt: string | null
}

const DEMO_POSTS: PostSeed[] = [
  {
    slug: 'demo-measuring-layout',
    title: 'Measuring layout instead of guessing at it',
    excerpt:
      'A grid that packs by measured height has an obvious failure mode: a runaway feedback loop. Here is the check that caught it.',
    tags: ['css', 'layout', 'debugging'],
    status: 'published',
    publishedAt: '2026-09-18T00:00:00.000Z',
  },
  {
    slug: 'demo-hydration-safety',
    title: 'Deterministic markup is a hydration requirement',
    excerpt:
      'Any value derived from Math.random or Date desyncs server and client. Seeding art from a slug hash keeps the first paint stable.',
    tags: ['react', 'ssr'],
    status: 'published',
    publishedAt: '2026-09-12T00:00:00.000Z',
  },
  {
    slug: 'demo-database-dates',
    title: 'Dates come back wrong if you format them in JavaScript',
    excerpt:
      'node-pg parses date columns at UTC midnight, so slicing an ISO string shifts the day back. Format them in SQL with to_char instead.',
    tags: ['postgres', 'debugging'],
    status: 'published',
    publishedAt: '2026-09-04T00:00:00.000Z',
  },
  {
    slug: 'demo-small-tools',
    title: 'Shipping small tools',
    excerpt: 'A note about writing software you will actually use yourself.',
    tags: ['open source'],
    status: 'published',
    publishedAt: '2026-08-22T00:00:00.000Z',
  },
  {
    slug: 'demo-draft-note',
    title: 'Notes toward a calmer deploy',
    excerpt: 'Draft: what changes when a release stops being a ceremony.',
    tags: ['process'],
    status: 'draft',
    publishedAt: null,
  },
]

type ChangelogSeed = {
  slug: string
  title: string
  version: string
  excerpt: string
  tags: string[]
  changeTypes: string[]
  publishedAt: string
}

const DEMO_CHANGELOGS: ChangelogSeed[] = [
  {
    slug: 'demo-v1-3-0',
    title: 'Adaptive content grid',
    version: 'v1.3.0',
    excerpt: 'Blog, changelog, and project listings now pack cards by measured height instead of a rigid grid.',
    tags: ['layout'],
    changeTypes: ['feature'],
    publishedAt: '2026-09-28T00:00:00.000Z',
  },
  {
    slug: 'demo-v1-2-0',
    title: 'Cover placeholders and denser cards',
    version: 'v1.2.0',
    excerpt: 'Documents without cover art now render a deterministic pixel-block placeholder instead of an empty gap.',
    tags: ['media'],
    changeTypes: ['feature', 'improvement'],
    publishedAt: '2026-09-20T00:00:00.000Z',
  },
  {
    slug: 'demo-v1-1-0',
    title: 'Changelog joined the card grid',
    version: 'v1.1.0',
    excerpt: 'The release timeline became a card grid, so it inherits the same adaptive packing as the other listings.',
    tags: ['layout'],
    changeTypes: ['improvement'],
    publishedAt: '2026-09-11T00:00:00.000Z',
  },
  {
    slug: 'demo-v1-0-3',
    title: 'Fixed overlapping cards at narrow widths',
    version: 'v1.0.3',
    excerpt: 'Row spans were computed against the wrong gap, which let neighbouring cards overlap.',
    tags: ['bug fix'],
    changeTypes: ['bug_fix'],
    publishedAt: '2026-09-02T00:00:00.000Z',
  },
  {
    slug: 'demo-v0-9-0',
    title: 'Security and dependency updates',
    version: 'v0.9.0',
    excerpt: 'Dependency refresh plus stricter handling of CMS-provided URLs.',
    tags: ['maintenance'],
    changeTypes: ['security', 'maintenance'],
    publishedAt: '2026-08-24T00:00:00.000Z',
  },
]

async function main() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL is not set')

  const client = new Client({ connectionString: url })
  await client.connect()

  try {
    await client.query('BEGIN')

    for (const table of ['projects', 'posts', 'changelogs']) {
      await client.query(`DELETE FROM ${table} WHERE slug LIKE $1`, [`${DEMO_PREFIX}%`])
    }
    // Array/relationship child rows are keyed by parent, so clear the demo
    // parents' children first (FK cascade is not configured on this schema).
    await client.query(`DELETE FROM projects_technologies WHERE _parent_id NOT IN (SELECT id FROM projects)`)
    await client.query(`DELETE FROM posts_tags WHERE _parent_id NOT IN (SELECT id FROM posts)`)
    await client.query(`DELETE FROM changelogs_tags WHERE _parent_id NOT IN (SELECT id FROM changelogs)`)
    await client.query(`DELETE FROM changelogs_change_types WHERE parent_id NOT IN (SELECT id FROM changelogs)`)

    for (const p of DEMO_PROJECTS) {
      const { rows } = await client.query(
        `INSERT INTO projects (title, slug, summary, content, role, project_status, start_date, end_date, featured, sort_order, status, published_at, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'published',$11,$12,$12) RETURNING id`,
        [
          p.title, p.slug, p.summary, JSON.stringify(richText(p.summary)), p.role, p.projectStatus,
          p.startDate, p.endDate, p.featured, p.sortOrder, NOW, NOW,
        ],
      )
      const id = rows[0].id
      for (const [order, technology] of p.technologies.entries()) {
        await client.query(
          // Array child tables key on a varchar `id` with no default, unlike
          // the integer sequence keys the parent tables use.
          `INSERT INTO projects_technologies (id, _parent_id, _order, technology) VALUES ($1,$2,$3,$4)`,
          [randomUUID(), id, order, technology],
        )
      }
      console.log(`  project: ${p.slug}`)
    }

    for (const p of DEMO_POSTS) {
      const { rows } = await client.query(
        `INSERT INTO posts (title, slug, excerpt, content, status, published_at, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$7) RETURNING id`,
        [p.title, p.slug, p.excerpt, JSON.stringify(richText(p.excerpt)), p.status, p.publishedAt, NOW],
      )
      const id = rows[0].id
      for (const [order, tag] of p.tags.entries()) {
        await client.query(`INSERT INTO posts_tags (id, _parent_id, _order, tag) VALUES ($1,$2,$3,$4)`, [randomUUID(), id, order, tag])
      }
      console.log(`  post: ${p.slug} (${p.status})`)
    }

    for (const c of DEMO_CHANGELOGS) {
      const { rows } = await client.query(
        `INSERT INTO changelogs (title, slug, version, excerpt, content, status, published_at, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,'published',$6,$7,$7) RETURNING id`,
        [c.title, c.slug, c.version, c.excerpt, JSON.stringify(richText(c.excerpt)), c.publishedAt, NOW],
      )
      const id = rows[0].id
      for (const [order, tag] of c.tags.entries()) {
        await client.query(`INSERT INTO changelogs_tags (id, _parent_id, _order, tag) VALUES ($1,$2,$3,$4)`, [randomUUID(), id, order, tag])
      }
      for (const [order, type] of c.changeTypes.entries()) {
        // This table predates the `_parent_id`/`_order` convention the other
        // array tables use; it stores parent_id/order/value instead.
        await client.query(`INSERT INTO changelogs_change_types (parent_id, "order", value) VALUES ($1,$2,$3)`, [id, order, type])
      }
      console.log(`  changelog: ${c.slug}`)
    }

    await client.query('COMMIT')

    const counts = await client.query(
      `SELECT
         (SELECT count(*) FROM projects WHERE slug LIKE $1) AS projects,
         (SELECT count(*) FROM posts   WHERE slug LIKE $1) AS posts,
         (SELECT count(*) FROM changelogs WHERE slug LIKE $1) AS changelogs`,
      [`${DEMO_PREFIX}%`],
    )
    console.log(`\nDone. ${JSON.stringify(counts.rows[0])}`)
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    await client.end()
  }
}

await main()
