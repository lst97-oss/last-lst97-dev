import { describe, expect, it } from 'bun:test'
import {
  SERVICE_ADDONS,
  SERVICE_LOCATION_NOTE,
  SERVICE_PACKAGE_PRICE_AMOUNT,
  SERVICE_PACKAGES,
  SERVICE_PROCESS_STEPS,
  SERVICE_SUPPORT_PLANS,
  SERVICE_SUPPORT_SECTION_HEADING,
  SERVICE_TECHNOLOGIES,
} from '../../src/lib/services/packages'
import {
  parseServicesDocument,
  SERVICES_OFFERING_LABELS,
  type ServicesOffering,
} from '../../src/server/knowledge/services-document'

/**
 * `src/lib/services/packages.ts` renders the public /services page and its
 * JSON-LD `Offer` nodes, so it is the authoritative price list. The Markdown
 * corpus under `src/data/services/` is hand-authored retrieval copy for the
 * chat assistant and is deliberately NOT generated from it, because the corpus
 * is written as standalone answer prose rather than as a data structure.
 *
 * That leaves exactly one way for the two to disagree: someone edits a price
 * on one side only. These assertions are the guard. A price, inclusion, add-on,
 * process step, or technology that exists on the page but not in the corpus
 * (or the reverse) fails here immediately.
 *
 * The corpus is split by offering folder: `packages/` holds the website builds
 * and `support/` holds the Go Support Plan. The two are priced on different
 * scales, so a chunk that does not state which offering it describes lets the
 * assistant answer a support question with a package price. The folder is the
 * structural source of truth for that split, and `parseServicesDocument`
 * derives the offering prefix that every chunk carries from it.
 */

/** The offering each folder describes, used to assert the two never cross. */
const OFFERING_FOLDERS = {
  packages: 'Website Packages',
  support: 'Go Support Plan',
} as const

// The corpus is nested one directory per offering (src/data/services/<topic>/),
// matching the indexer in scripts/knowledge/index-services-knowledge.ts. A `*.md` glob at
// the parent level matches nothing and every assertion below fails vacuously
// against an empty corpus rather than reporting a real divergence.
const CORPUS_GLOB = 'src/data/services/*/*.md'

async function readCorpus(): Promise<Map<string, string>> {
  const projectRoot = import.meta.dir.replace(/[/\\]tests[/\\]server$/, '')
  const documents = new Map<string, string>()
  for await (const relativePath of new Bun.Glob(CORPUS_GLOB).scan(projectRoot)) {
    documents.set(relativePath, await Bun.file(`${projectRoot}/${relativePath}`).text())
  }
  return documents
}

/** The offering folder a document lives in, which is the offering it describes. */
function offeringOf(relativePath: string): ServicesOffering {
  return relativePath.split('/').at(-2) as ServicesOffering
}

/**
 *
 * The thousands separator is matched as `,\d{3}` rather than as a bare `,`: a
 * bare comma makes `A$100,` (a price followed by a sentence comma) parse as one
 * figure called `A$100,`, which then fails every allowed-price comparison for
 * a reason that has nothing to do with the price.
 */
function pricesIn(text: string): string[] {
  return [...new Set([...text.matchAll(/A\$\d+(?:,\d{3})*/g)].map((match) => match[0]))]
}

describe('services Markdown corpus stays in sync with the public /services page', () => {
  it('indexes one parseable document per topic file', async () => {
    const corpus = await readCorpus()
    expect(corpus.size).toBeGreaterThan(0)

    for (const [relativePath, text] of corpus) {
      const parsed = parseServicesDocument(relativePath, text)
      expect(parsed, `${relativePath} must be parseable by parseServicesDocument`).not.toBeNull()
      expect(parsed?.source.type).toBe('services')
      expect(parsed?.isPublic).toBe(true)
    }
  })

  it('keeps every document in a folder that names one of the two offerings', async () => {
    const corpus = await readCorpus()

    for (const relativePath of corpus.keys()) {
      const folder = relativePath.split('/').at(-2) ?? ''
      expect(Object.hasOwn(OFFERING_FOLDERS, folder), `${relativePath} is not in an offering folder`).toBe(true)
    }
  })

  it('stamps the offering on the prefix of every document, so no chunk can be read as the other offering', async () => {
    const corpus = await readCorpus()

    for (const [relativePath, text] of corpus) {
      const offering = offeringOf(relativePath)
      const otherOffering = offering === 'packages' ? 'support' : 'packages'
      const parsed = parseServicesDocument(relativePath, text)

      // The label leads the prefix rather than trailing it: chunking is a
      // sliding window, so a chunk that starts mid-document keeps the leading
      // lines but loses the body headers.
      expect(parsed?.text.startsWith(`## ${SERVICES_OFFERING_LABELS[offering]}`)).toBe(true)
      expect(parsed?.text, `${relativePath} must not name the other offering as its own`).not.toContain(
        SERVICES_OFFERING_LABELS[otherOffering],
      )
    }
  })

  it("keeps each offering's own price list free of the other's headline figures", async () => {
    const corpus = await readCorpus()
    // The headline build figures are the distinctive ones. A$100 is shared on
    // purpose (a build add-on and the support standard rate) and A$50/hour is
    // the maintenance add-on, so neither can prove a cross-over.
    const buildFigures = SERVICE_PACKAGES.map(
      (pkg) => `A$${SERVICE_PACKAGE_PRICE_AMOUNT[pkg.slug].toLocaleString('en-AU')}`,
    )

    for (const [relativePath, text] of corpus) {
      // Scope to the price table, which is where a wrong figure would actually
      // mislead. Prose elsewhere legitimately names the other offering's figure
      // to route the reader ("packages start from A$1,000"), so the whole
      // document cannot be scanned: doing so flags correct routing copy.
      const priceTable = text.split('\n').filter((line) => line.startsWith('|'))
      if (priceTable.length === 0) continue

      const table = priceTable.join('\n')
      for (const figure of buildFigures) {
        if (offeringOf(relativePath) !== 'support') continue
        expect(table, `${relativePath} lists the build figure ${figure} in a support price table`).not.toContain(figure)
      }
    }
  })

  it('covers every support engagement the page renders', async () => {
    const corpus = await readCorpus()
    const allText = [...corpus.values()].join('\n')

    // A magic file count would only catch the wrong number of additions, not the
    // wrong ones. This asserts the property that matters instead: anything the
    // page offers is answerable from the corpus.
    for (const plan of SERVICE_SUPPORT_PLANS) {
      expect(allText, `${plan.name} must appear in the corpus`).toContain(plan.name)
    }
    expect(allText).toContain(SERVICE_SUPPORT_SECTION_HEADING)
  })

  it('quotes exactly the package prices the page renders, and invents none', async () => {
    const corpus = await readCorpus()
    const allText = [...corpus.values()].join('\n')

    // The page renders `From A$1,000`; the corpus writes prose such as
    // "starts from A$1,000". Compare the currency figure, which is the part
    // that must never diverge between the page and the chat assistant.
    const allowed = new Set([
      ...SERVICE_PACKAGES.map((pkg) => `A$${SERVICE_PACKAGE_PRICE_AMOUNT[pkg.slug].toLocaleString('en-AU')}`),
      // Add-on prices are quoted in the corpus too; `SERVICE_ADDONS` holds the
      // human-readable label ("From A$100"), so compare on the figure.
      ...SERVICE_ADDONS.flatMap((addOn) => [...addOn.price.matchAll(/A\$\d[\d,]*/g)].map((match) => match[0])),
      ...SERVICE_SUPPORT_PLANS.flatMap((plan) => [...plan.price.matchAll(/A\$\d[\d,]*/g)].map((match) => match[0])),
      // The consultation-credit worked example in technical-consultation.md
      // prints arithmetic (A$40 - A$600 = A$560). These are example figures,
      // not list prices, so they are allowed explicitly rather than by widening
      // the guard into accepting any number the corpus happens to mention.
      'A$560',
      'A$600',
    ])
    for (const pkg of SERVICE_PACKAGES) {
      const figure = `A$${SERVICE_PACKAGE_PRICE_AMOUNT[pkg.slug].toLocaleString('en-AU')}`
      expect(allText, `${pkg.name} must quote ${figure}`).toContain(figure)
    }

    for (const price of pricesIn(allText)) {
      expect(allowed, `corpus quotes an unlisted price: ${price}`).toContain(price)
    }
  })

  it('lists every add-on with the exact price the page renders, in order', async () => {
    const corpus = await readCorpus()
    const text = corpus.get('src/data/services/packages/add-ons.md')
    expect(text).toBeDefined()

    let cursor = 0
    for (const addOn of SERVICE_ADDONS) {
      const at = text!.indexOf(`${addOn.name} — ${addOn.price}`)
      expect(at, `add-on "${addOn.name}" is missing from the corpus`).toBeGreaterThan(-1)
      expect(at, `add-on "${addOn.name}" is out of order`).toBeGreaterThanOrEqual(cursor)
      cursor = at
    }
  })

  it('carries every inclusion the page lists for each package', async () => {
    const corpus = await readCorpus()

    for (const pkg of SERVICE_PACKAGES) {
      const text = corpus.get(`src/data/services/packages/${pkg.slug}-package.md`)
      expect(text, `${pkg.slug} must have its own document`).toBeDefined()
      for (const inclusion of pkg.includes) {
        expect(text!, `${pkg.name} is missing the inclusion "${inclusion}"`).toContain(inclusion)
      }
    }
  })

  it('describes every process step the page renders', async () => {
    const corpus = await readCorpus()
    const text = corpus.get('src/data/services/packages/development-process.md')
    expect(text).toBeDefined()

    for (const step of SERVICE_PROCESS_STEPS) {
      expect(text!, `process step "${step.title}" is missing from the corpus`).toContain(step.title)
    }
  })

  it('names every technology the page tags', async () => {
    const corpus = await readCorpus()
    const text = corpus.get('src/data/services/packages/technology-and-third-party-costs.md')
    expect(text).toBeDefined()

    for (const technology of SERVICE_TECHNOLOGIES) {
      // The page renders a title-case tag ("Headless CMS platforms"); the corpus
      // writes it as prose ("headless CMS platforms").
      expect(text!.toLowerCase(), `technology "${technology}" is missing from the corpus`).toContain(
        technology.toLowerCase(),
      )
    }
  })

  it('keeps the numeric JSON-LD offer amounts consistent with the rendered price labels', () => {
    // The page serves these amounts as schema.org `Offer.price`, which must be a
    // number, while the corpus quotes the human-readable label. A silent mismatch
    // would make the structured data advertise a different figure than chat.
    for (const pkg of SERVICE_PACKAGES) {
      const amount = SERVICE_PACKAGE_PRICE_AMOUNT[pkg.slug]
      expect(pkg.price).toBe(`From A$${amount.toLocaleString('en-AU')}`)
    }
  })

  it('states the current service location and the planned expansion in both offerings', async () => {
    // The /services page renders SERVICE_LOCATION_NOTE next to the prices, so
    // the assistant must be able to answer the same geography question. A
    // visitor asking "do you work outside Australia" is answered from the
    // corpus, not the page, so a copy on one side alone is a divergence.
    const corpus = await readCorpus()
    const offeringDocs: Record<ServicesOffering, string> = {
      packages: corpus.get('src/data/services/packages/terms-and-quote-request.md') ?? '',
      support: corpus.get('src/data/services/support/go-support-plan.md') ?? '',
    }

    for (const [offering, text] of Object.entries(offeringDocs)) {
      expect(text, `${offering} corpus is missing the service location notice`).toContain(SERVICE_LOCATION_NOTE)
    }
  })
})
