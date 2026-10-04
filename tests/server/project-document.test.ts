import { describe, expect, it } from 'bun:test'

import { isProjectDocProject, parseProjectDocument } from '../../src/server/knowledge/project-document'

describe('project deep-dive Markdown document parser', () => {
  const body =
    'The query classifier decides what the user appears to be searching for, and the search tier router selects a matching PostgreSQL strategy.'
  const document = [
    '# How the G-NAF search router picks a strategy',
    '',
    '- **Category:** Search Architecture',
    '- **Source ID:** gnaf-query-routing',
    '- **URL:** https://www.lst97.dev/projects/gnaf-address-autocomplete',
    '- **Visibility:** Public',
    '',
    body,
  ].join('\n')

  const gnafPath = 'src/data/projects/gnaf-address-autocomplete/gnaf-query-routing.md'

  it('builds a public project document whose embedded text carries the project, category and title', () => {
    const parsed = parseProjectDocument(gnafPath, document)

    expect(parsed?.source.type).toBe('project-doc')
    expect(parsed?.source.sourceId).toBe('gnaf-query-routing')
    expect(parsed?.source.title).toBe('How the G-NAF search router picks a strategy')
    expect(parsed?.source.url).toBe('https://www.lst97.dev/projects/gnaf-address-autocomplete')
    expect(parsed?.isPublic).toBe(true)
    // The prefix is the only context a heading-unaware chunk keeps, so it is
    // where the project, the category and the title have to live.
    expect(parsed?.text).toBe(
      '## Project: G-NAF Address Autocomplete\n\n## Search Architecture\n\n### How the G-NAF search router picks a strategy\n\n' +
        body,
    )
  })

  it('derives the project from the folder rather than from anything the body claims', () => {
    // The same text under another project folder belongs to that project.
    // Nothing in the body says so, which is the point: the folder decides.
    const smartplayPath = 'src/data/projects/smartplay-hk-oss/gnaf-query-routing.md'

    expect(parseProjectDocument(gnafPath, document)?.text).toStartWith('## Project: G-NAF Address Autocomplete')
    expect(parseProjectDocument(smartplayPath, document)?.text).toStartWith('## Project: SmartPlay HK OSS')
  })

  it('recognises only the known project folders, and no inherited object key', () => {
    expect(isProjectDocProject('gnaf-address-autocomplete')).toBe(true)
    expect(isProjectDocProject('smartplay-hk-oss')).toBe(true)
    expect(isProjectDocProject('wat-wat-new-zealand')).toBe(true)
    expect(isProjectDocProject('best-maker-pty-ltd')).toBe(true)
    expect(isProjectDocProject('canton-101')).toBe(true)
    expect(isProjectDocProject('unknown-project')).toBe(false)
    // A prototype key must not pass: it is not a project.
    expect(isProjectDocProject('constructor')).toBe(false)
    expect(isProjectDocProject('toString')).toBe(false)
  })

  it('rejects a document whose folder is not a project, rather than defaulting to one', () => {
    expect(parseProjectDocument('src/data/projects/shared/gnaf-query-routing.md', document)).toBeNull()
    // A flat document has no project folder at all.
    expect(parseProjectDocument('src/data/projects/gnaf-query-routing.md', document)).toBeNull()
    // Nested one level too deep is not a project folder either.
    expect(
      parseProjectDocument('src/data/projects/gnaf-address-autocomplete/nested/gnaf-query-routing.md', document),
    ).toBeNull()
  })

  it('rejects a source id that disagrees with the file name', () => {
    expect(parseProjectDocument('src/data/projects/gnaf-address-autocomplete/data-ingestion.md', document)).toBeNull()
  })

  it('rejects a document missing a metadata line that a chunk would depend on', () => {
    for (const line of [
      '- **Category:** Search Architecture\n',
      '- **Source ID:** gnaf-query-routing\n',
      '- **URL:** https://www.lst97.dev/projects/gnaf-address-autocomplete\n',
      '- **Visibility:** Public\n',
    ]) {
      expect(parseProjectDocument(gnafPath, document.replace(line, ''))).toBeNull()
    }
  })

  it('rejects a URL that cannot be parsed, which retrieval would drop from citations', () => {
    const brokenUrl = document.replace(
      'https://www.lst97.dev/projects/gnaf-address-autocomplete',
      'www.lst97.dev/projects/gnaf-address-autocomplete',
    )

    expect(parseProjectDocument(gnafPath, brokenUrl)).toBeNull()
  })

  it('rejects a path outside the project corpus so it can never index another corpus', () => {
    expect(parseProjectDocument('src/data/interview/gnaf/gnaf-query-routing.md', document)).toBeNull()
    expect(parseProjectDocument('src/data/services/packages/gnaf/gnaf-query-routing.md', document)).toBeNull()
    expect(parseProjectDocument('gnaf-address-autocomplete/gnaf-query-routing.md', document)).toBeNull()
    expect(
      parseProjectDocument('src/data/projects/gnaf-address-autocomplete/gnaf-query-routing.txt', document),
    ).toBeNull()
  })

  it('marks Wat Wat New Zealand documents private so the responder never implies the source is public', () => {
    const privateDocument = [
      '# How Wat Wat New Zealand protects against stale spreadsheet edits',
      '',
      '- **Category:** Concurrency Control',
      '- **Source ID:** wwnz-conflict-protection',
      '- **URL:** https://www.lst97.dev/projects/wat-wat-new-zealand',
      '- **Visibility:** Private',
      '',
      'A fingerprint is generated from the editable transaction state when the transaction loads, and regenerated at save time.',
    ].join('\n')

    const parsed = parseProjectDocument(
      'src/data/projects/wat-wat-new-zealand/wwnz-conflict-protection.md',
      privateDocument,
    )

    expect(parsed?.isPublic).toBe(false)
    expect(parsed?.text).toStartWith('## Project: Wat Wat New Zealand')
  })

  it('marks Canto101 documents private so the responder never implies the source is public', () => {
    const privateDocument = [
      '# How Canto101 keeps a generated client honest against its API contract',
      '',
      '- **Category:** Quality Gates',
      '- **Source ID:** canton101-quality-gates',
      '- **URL:** https://www.lst97.dev/projects/canton-101',
      '- **Visibility:** Private',
      '',
      'Every Canto101 repository is unpublished, so a citation for one of its documents must never invite a visitor to open the source.',
    ].join('\n')

    const parsed = parseProjectDocument('src/data/projects/canton-101/canton101-quality-gates.md', privateDocument)

    expect(parsed?.isPublic).toBe(false)
    expect(parsed?.text).toStartWith('## Project: Canto101')
  })

  it('rejects a Canto101 document claiming Public, so its private repositories stay unpublished', () => {
    const lyingDocument = [
      '# How Canto101 keeps a generated client honest against its API contract',
      '',
      '- **Category:** Quality Gates',
      '- **Source ID:** canton101-quality-gates',
      '- **URL:** https://www.lst97.dev/projects/canton-101',
      '- **Visibility:** Public',
      '',
      'Every Canto101 repository is unpublished, so a citation for one of its documents must never invite a visitor to open the source.',
    ].join('\n')

    expect(parseProjectDocument('src/data/projects/canton-101/canton101-quality-gates.md', lyingDocument)).toBeNull()
  })

  it('rejects a private project document claiming Public, so the folder stays the source of truth', () => {
    const lyingDocument = document
      .replace('**Visibility:** Public', '**Visibility:** Private')
      .replace(
        '- **URL:** https://www.lst97.dev/projects/gnaf-address-autocomplete',
        '- **URL:** https://www.lst97.dev/projects/wat-wat-new-zealand',
      )

    expect(parseProjectDocument(gnafPath, lyingDocument)).toBeNull()
  })

  it('rejects an unrecognised visibility rather than defaulting one', () => {
    expect(
      parseProjectDocument(gnafPath, document.replace('**Visibility:** Public', '**Visibility:** Internal')),
    ).toBeNull()
  })
})
