import type { KnowledgeDocument } from './source-types'
import type { GithubContributionRepository } from './github-contributions'
import type { GithubRepositoryAnalysis } from './github-repository-analysis'
import { assertSafeGithubMarkdown, sanitizeEvidenceText } from './github-content-safety'
import { getOwnerProvidedProjectDemoUrl } from './owner-provided-project-sites'

export interface RenderGithubRepositorySummaryInput {
  analysis: GithubRepositoryAnalysis
  contribution?: GithubContributionRepository
  contributionCoverage?: { complete: boolean; incompleteReasons: string[] }
  sourceKind: 'owned' | 'contribution'
}

export interface RenderedGithubRepositorySummary {
  document: KnowledgeDocument
  markdown: string
}

function safeFact(value: string): string {
  const result = sanitizeEvidenceText(value)
  return result.text.replaceAll(/\s+/g, ' ').trim() || 'Omitted because the evidence did not pass content safety checks.'
}

function safeContributionUrl(value: string, repositoryUrl: string): string | undefined {
  try {
    const url = new URL(value)
    const repository = new URL(repositoryUrl)
    if (url.protocol !== 'https:' || url.hostname !== 'github.com' || !url.pathname.startsWith(`${repository.pathname}/`)) return undefined
    return url.href
  } catch {
    return undefined
  }
}

function evidence(filenames: string[], inferred: boolean): string {
  const paths = filenames.length ? filenames.map((path) => `\`${path}\``).join(', ') : 'none'
  return `Evidence: ${paths}${inferred ? ' (**inferred**)' : ''}`
}

export function renderGithubRepositorySummary(input: RenderGithubRepositorySummaryInput): RenderedGithubRepositorySummary {
  const { analysis, contribution, contributionCoverage, sourceKind } = input
  const isPublic = !analysis.repository.isPrivate
  const sourceType = sourceKind === 'owned'
    ? (isPublic ? 'github' : 'github-private')
    : (isPublic ? 'github-contrib' : 'github-contrib-private')
  const sourceId = analysis.repository.fullName
  const projectName = sourceId.split('/').at(-1) ?? sourceId
  const features = analysis.features.length
    ? analysis.features.map((feature) => `- ${safeFact(feature.value)} — ${evidence(feature.evidence, feature.inferred)}`)
    : ['- Unknown: no feature list was explicitly documented.']
  const technologies = analysis.technology.length
    ? analysis.technology.map((item) => `- ${safeFact(item.name)} — ${evidence(item.evidence, false)}`)
    : ['- Unknown: supported stack evidence was not found.']
  const patterns = analysis.patterns.length
    ? analysis.patterns.map((item) => `- ${safeFact(item.name)}${item.inferred ? ' (**inferred**)' : ''} — ${evidence(item.evidence, false)}`)
    : ['- Unknown: no supported design-pattern evidence was found.']
  const repositoryMetadata = analysis.repository
  const projectDemoUrl = getOwnerProvidedProjectDemoUrl(repositoryMetadata.fullName)
  const topics = repositoryMetadata.topics?.length
    ? repositoryMetadata.topics.map((topic) => `\`${safeFact(topic)}\``).join(', ')
    : 'No GitHub topics are set.'
  const curatedTopics = repositoryMetadata.curatedTopics?.map(safeFact) ?? []
  const softwareKinds = repositoryMetadata.softwareKinds ?? []
  const languages = repositoryMetadata.languages?.length
    ? [...repositoryMetadata.languages].sort((left, right) => right.bytes - left.bytes).slice(0, 12).map(({ name, bytes }) => `- ${safeFact(name)} (${bytes.toLocaleString('en-AU')} bytes)`)
    : ['- GitHub language breakdown is unavailable.']
  const structure = [
    ...analysis.structure.directories.map(({ name, files }) => `- \`${safeFact(name)}/\` (${files} tracked files)`),
    ...analysis.structure.representativeFiles.map((path) => `- \`${safeFact(path)}\``),
  ]
  const implementationEvidence = analysis.implementationEvidence.length
    ? analysis.implementationEvidence.map((item) => `- ${safeFact(item.value)} — ${evidence(item.evidence, item.inferred)}`)
    : ['- No behavior names or route declarations were safely available in inspected source/tests.']
  const retrievalFeatures = analysis.features.filter(({ value }) => !value.startsWith('Unknown:')).slice(0, 3)
  const summaryParts = [
    `Relationship: ${sourceKind === 'owned' ? 'Owned repository.' : 'Third-party contribution by Nelson.'}`,
    `Repository: ${safeFact(sourceId)}.`,
    ...(projectDemoUrl ? [`Project demo: ${projectDemoUrl}`] : []),
    ...(analysis.purpose.value.startsWith('Unknown:')
      ? []
      : [analysis.purpose.origin === 'owner-provided'
          ? `Owner-provided purpose: ${safeFact(analysis.purpose.value)}`
          : `Purpose: ${safeFact(analysis.purpose.value)}`]),
    ...(retrievalFeatures.length
      ? [`Observed capabilities: ${retrievalFeatures.map(({ value }) => safeFact(value)).join('; ')}`]
      : []),
    ...(technologies.length && technologies[0] !== '- Unknown: supported stack evidence was not found.'
      ? [`Technology: ${analysis.technology.map(({ name }) => safeFact(name)).slice(0, 8).join(', ')}`]
      : []),
    ...(softwareKinds.length ? [`Software kinds: ${softwareKinds.join(', ')}`] : []),
    ...(repositoryMetadata.topics?.length
      ? [`GitHub topics: ${repositoryMetadata.topics.slice(0, 8).map(safeFact).join(', ')}`]
      : []),
    ...(curatedTopics.length ? [`Curated topics: ${curatedTopics.slice(0, 12).join(', ')}`] : []),
  ]
  const retrievalSummary = [
    '## Retrieval summary',
    '',
    ...summaryParts.map((part) => `- ${part}`),
  ]
  const contributionSection = contribution && sourceKind === 'contribution'
    ? [
      '',
      '## Nelson\'s contribution evidence',
      `- ${contribution.counts.commits} commits, ${contribution.counts.pullRequests} pull requests, ${contribution.counts.issues} issues, ${contribution.counts.reviews} reviews`,
      '### Pull requests',
      ...(contribution.pullRequests.length
        ? contribution.pullRequests.slice(0, 20).flatMap((item) => {
          const url = safeContributionUrl(item.url, analysis.repository.url)
          return url ? [`- ${safeFact(item.title)} (${safeFact(item.state)}) — ${url}`] : []
        })
        : ['No pull-request titles are available from the contribution API.']),
      '### Issues',
      ...(contribution.issues.length
        ? contribution.issues.slice(0, 20).flatMap((item) => {
          const url = safeContributionUrl(item.url, analysis.repository.url)
          return url ? [`- ${safeFact(item.title)} (${safeFact(item.state)}) — ${url}`] : []
        })
        : ['No issue titles are available from the contribution API.']),
      '- Commit contributions are reported as aggregate counts; commit messages and diffs are not copied into this report.',
      ...(contributionCoverage && !contributionCoverage.complete
        ? ['- **Coverage limitation:** GitHub capped at least one contribution list; some contribution details may be omitted and commit totals may be partial.']
        : []),
    ]
    : []
  const markdown = [
    `# ${safeFact(projectName)}`,
    '',
    ...retrievalSummary,
    '',
    '## Repository metadata',
    `- **Repository:** ${sourceId}`,
    `- **Visibility:** ${isPublic ? 'public' : 'private'}`,
    `- **URL:** ${analysis.repository.url}`,
    ...(repositoryMetadata.defaultBranch ? [`- **Default branch:** ${safeFact(repositoryMetadata.defaultBranch)}`] : []),
    ...(repositoryMetadata.createdAt ? [`- **Created:** ${safeFact(repositoryMetadata.createdAt)}`] : []),
    ...(repositoryMetadata.updatedAt ? [`- **Last updated:** ${safeFact(repositoryMetadata.updatedAt)}`] : []),
    ...(repositoryMetadata.primaryLanguage ? [`- **Primary language:** ${safeFact(repositoryMetadata.primaryLanguage)}`] : []),
    ...(repositoryMetadata.license ? [`- **License:** ${safeFact(repositoryMetadata.license)}`] : []),
    ...(repositoryMetadata.homepage ? [`- **Homepage:** ${safeFact(repositoryMetadata.homepage)}`] : []),
    ...(typeof repositoryMetadata.stars === 'number' ? [`- **Stars / forks:** ${repositoryMetadata.stars} / ${repositoryMetadata.forks ?? 0}`] : []),
    `- **Topics:** ${topics}`,
    ...(softwareKinds.length ? [`- **Software kinds:** ${softwareKinds.map((kind) => `\`${kind}\``).join(', ')}`] : []),
    ...(curatedTopics.length ? [`- **Curated topics:** ${curatedTopics.map((topic) => `\`${topic}\``).join(', ')}`] : []),
    '',
    '### GitHub language breakdown',
    ...languages,
    '',
    `## Project purpose (${analysis.purpose.origin === 'owner-provided' ? 'owner-provided' : 'source-derived'})`,
    safeFact(analysis.purpose.value),
    ...(analysis.purpose.origin === 'owner-provided'
      ? ['Source: owner-provided profile context.']
      : [evidence(analysis.purpose.evidence, analysis.purpose.inferred)]),
    '',
    '## Problem addressed',
    safeFact(analysis.problem.value),
    evidence(analysis.problem.evidence, analysis.problem.inferred),
    '',
    '## Features observed in source and tests',
    ...features,
    '',
    '## Tracked files',
    `- **${analysis.files.total} tracked files** in total`,
    `- Source: ${analysis.files.source}; tests: ${analysis.files.tests}; documentation: ${analysis.files.docs}; configuration: ${analysis.files.configuration}; assets/other: ${analysis.files.assetsAndOther}`,
    '',
    '## Repository structure',
    `- Inspected ${analysis.inspectedSourceFileCount} source files from the cloned repository (bounded for safety).`,
    ...(structure.length ? structure : ['- No source structure could be inspected.']),
    '',
    '## Implementation and test evidence',
    ...implementationEvidence,
    '',
    '## Frameworks and technology stack',
    ...technologies,
    '',
    '## Design and architecture patterns',
    ...patterns,
    '',
    '## Evidence and limitations',
    '- Reports are based on a fresh shallow clone. Safe, bounded documentation, manifests, source, and test files are inspected locally; raw source code is never copied into this report.',
    '- README text and the GitHub description are excluded from project-purpose and feature claims because they may be stale.',
    ...(analysis.limitations.length ? analysis.limitations.map((item) => `- ${safeFact(item)}`) : ['- No additional inspection limitations were recorded.']),
    ...contributionSection,
    '',
  ].join('\n')
  assertSafeGithubMarkdown(markdown)
  const catalogSummary = summaryParts
    .filter((part) => !part.startsWith('Relationship:') && !part.startsWith('Repository:'))
    .join(' ')
    .slice(0, 500) || 'Purpose not recorded in the indexed evidence.'
  return {
    document: {
      source: { type: sourceType, sourceId, title: projectName, url: analysis.repository.url },
      text: markdown,
      isPublic,
      sourceUpdatedAt: null,
      ...(sourceKind === 'owned' ? {
        projectCatalog: {
          summary: catalogSummary,
          createdAt: repositoryMetadata.createdAt ?? null,
          updatedAt: repositoryMetadata.updatedAt ?? null,
          stars: repositoryMetadata.stars ?? null,
          forks: repositoryMetadata.forks ?? null,
          primaryLanguage: repositoryMetadata.primaryLanguage ?? null,
          languages: (repositoryMetadata.languages ?? []).map(({ name }) => name).slice(0, 100),
          kinds: softwareKinds,
          githubTopics: repositoryMetadata.topics ?? [],
          curatedTopics,
        },
      } : {}),
    },
    markdown,
  }
}
