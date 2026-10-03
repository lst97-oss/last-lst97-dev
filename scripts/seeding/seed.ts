/**
 * Runs every content seed in `scripts/seeding/`, one collection directory at a
 * time, replacing the three per-project npm scripts.
 *
 * Each seed file is self-executing: it calls `getPayload`, upserts its
 * vocabulary, writes one slug-keyed document, and exits. They are spawned
 * rather than imported so each one owns its Payload instance and database
 * connection — importing three would share one `configPromise` and leave three
 * dangling pools, and the files' own `process.exit(0)` would take the runner
 * down with the first one.
 *
 * Order is by directory then filename, so `projects` runs before `posts` before
 * `change-logs` and reruns are deterministic. Runs are sequential on purpose:
 * the seeds upsert shared vocabulary rows (topics, tags) by slug, and
 * concurrent writers on the same row are exactly the race this avoids.
 *
 * Pass a collection directory to narrow the run, e.g.
 * `bun run seed:content projects`. An empty directory contributes no seeds and
 * is not an error.
 */
import { projectRoot } from '../project-root'

const SEEDING_DIR = import.meta.dir

/** Directory names, in the order their seeds should run. */
const COLLECTION_ORDER = ['projects', 'posts', 'change-logs'] as const

type Collection = (typeof COLLECTION_ORDER)[number]

function isCollection(value: string): value is Collection {
  return (COLLECTION_ORDER as readonly string[]).includes(value)
}

/** Seed paths per collection, relative to `scripts/seeding`, sorted so reruns
 *  are deterministic. */
async function discoverSeeds(collection: Collection): Promise<string[]> {
  const glob = new Bun.Glob('*.ts')
  const found: string[] = []
  for await (const entry of glob.scan({ cwd: `${SEEDING_DIR}/${collection}`, dot: true })) {
    // Scanned with `cwd`, so entries come back as bare filenames; the child
    // process needs a path it can resolve from the project root.
    found.push(`scripts/seeding/${collection}/${entry}`)
  }
  return found.sort()
}

async function main() {
  const requested = Bun.argv.slice(2)
  const unknown = requested.filter((argument) => !isCollection(argument))
  if (unknown.length > 0) {
    // Printed rather than thrown: a bare throw here surfaces as a Bun stack
    // trace that buries the one line the operator needs.
    console.error(`Unknown seed collection: ${unknown.join(', ')}`)
    console.error(`Expected one of: ${COLLECTION_ORDER.join(', ')}`)
    process.exit(1)
  }
  const collections = requested.length > 0 ? (requested as Collection[]) : [...COLLECTION_ORDER]

  let total = 0
  const failures: string[] = []

  for (const collection of collections) {
    const seeds = await discoverSeeds(collection)
    if (seeds.length === 0) {
      console.log(`\n${collection}: no seeds yet, skipping`)
      continue
    }

    console.log(`\n${collection}: ${seeds.length} seed${seeds.length === 1 ? '' : 's'}`)
    for (const seed of seeds) {
      const child = Bun.spawn(['bun', 'run', seed], {
        cwd: projectRoot,
        stdin: 'inherit',
        stderr: 'inherit',
        stdout: 'inherit',
      })
      const code = await child.exited
      total += 1
      if (code !== 0) {
        failures.push(`${collection}/${seed.split('/').pop()}`)
        console.error(`  FAILED (exit ${code})`)
      }
    }
  }

  console.log(`\nSeeding complete: ${total - failures.length}/${total} succeeded`)
  if (failures.length > 0) {
    console.error(`Failed: ${failures.join(', ')}`)
    process.exit(1)
  }

  process.exit(0)
}

void main()
