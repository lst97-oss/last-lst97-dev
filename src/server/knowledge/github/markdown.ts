import { z } from 'zod'

import type { KnowledgeDocument } from '../source-types'

const languageSchema = z.object({ name: z.string().min(1).max(100), size: z.number().int().nonnegative() })
const topicSchema = z.object({ name: z.string().min(1).max(100) })
const githubCliRepositorySchema = z.object({
  nameWithOwner: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  url: z.string(),
  isPrivate: z.boolean(),
  isFork: z.boolean(),
  isArchived: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  primaryLanguage: z.object({ name: z.string() }).nullable(),
  languages: z.array(z.object({ node: z.object({ name: z.string() }), size: z.number() })).nullable(),
  repositoryTopics: z.array(topicSchema).nullable(),
  homepageUrl: z.string().nullable(),
  defaultBranchRef: z.object({ name: z.string() }).nullable(),
  licenseInfo: z.object({ name: z.string() }).nullable(),
  stargazerCount: z.number(),
  forkCount: z.number(),
  visibility: z.enum(['PUBLIC', 'PRIVATE', 'INTERNAL']),
})

export const githubRepositorySchema = z
  .object({
    nameWithOwner: z.string().regex(/^lst97\/[A-Za-z0-9_.-]{1,100}$/),
    name: z.string().min(1).max(100),
    description: z.string().max(2_000).nullable(),
    url: z.url(),
    isPrivate: z.boolean(),
    isFork: z.boolean(),
    isArchived: z.boolean(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
    primaryLanguage: z.object({ name: z.string().max(100) }).nullable(),
    languages: z.array(languageSchema).max(100),
    repositoryTopics: z.array(topicSchema).max(100),
    homepageUrl: z.url().nullable(),
    defaultBranchRef: z.object({ name: z.string().min(1).max(250) }).nullable(),
    licenseInfo: z.object({ name: z.string().max(200) }).nullable(),
    stargazerCount: z.number().int().nonnegative(),
    forkCount: z.number().int().nonnegative(),
    visibility: z.enum(['PUBLIC', 'PRIVATE', 'INTERNAL']),
  })
  .refine(
    (repository) => {
      const url = new URL(repository.url)
      return (
        url.protocol === 'https:' &&
        url.hostname === 'github.com' &&
        url.pathname.toLowerCase() === `/${repository.nameWithOwner.toLowerCase()}` &&
        repository.isPrivate === (repository.visibility !== 'PUBLIC')
      )
    },
    { message: 'GitHub repository identity or visibility is invalid' },
  )

export type GithubRepositoryRecord = z.infer<typeof githubRepositorySchema>

export function normalizeGithubRepositoryCliRecord(input: unknown): GithubRepositoryRecord {
  const repository = githubCliRepositorySchema.parse(input)
  return githubRepositorySchema.parse({
    ...repository,
    languages: repository.languages?.map(({ node, size }) => ({ name: node.name, size })) ?? [],
    repositoryTopics: repository.repositoryTopics ?? [],
    homepageUrl: repository.homepageUrl?.trim() || null,
    defaultBranchRef: repository.defaultBranchRef?.name.trim() ? repository.defaultBranchRef : null,
  })
}

export const githubProfileSchema = z.object({
  login: z.literal('lst97'),
  name: z.string().max(200).nullable().optional(),
  bio: z.string().max(2_000).nullable().optional(),
  company: z.string().max(500).nullable().optional(),
  location: z.string().max(300).nullable().optional(),
  blog: z.string().max(500).nullable().optional(),
  public_repos: z.number().int().nonnegative(),
  followers: z.number().int().nonnegative(),
  following: z.number().int().nonnegative(),
  created_at: z.iso.datetime(),
})

export type GithubProfileRecord = z.infer<typeof githubProfileSchema>

const MAX_README_CHARS = 18_000

function markdownField(label: string, value: string | null | undefined): string | undefined {
  const normalized = value?.trim()
  return normalized ? `- **${label}:** ${normalized.replaceAll('\n', ' ')}` : undefined
}

export function renderGithubRepositoryMarkdown(repositoryInput: GithubRepositoryRecord, readme: string): string {
  const repository = githubRepositorySchema.parse(repositoryInput)
  const languages = [...repository.languages]
    .sort((left, right) => right.size - left.size)
    .slice(0, 12)
    .map(({ name, size }) => `- ${name} (${size.toLocaleString('en-AU')} bytes)`)
  const topics = repository.repositoryTopics.map(({ name }) => `\`${name}\``)
  const metadata = [
    `- **Visibility:** ${repository.visibility.toLowerCase()}`,
    `- **Canonical URL:** ${repository.url}`,
    markdownField('Description', repository.description),
    markdownField('Default branch', repository.defaultBranchRef?.name),
    markdownField('Primary language', repository.primaryLanguage?.name),
    markdownField('License', repository.licenseInfo?.name),
    markdownField('Homepage', repository.homepageUrl),
    `- **Created:** ${repository.createdAt}`,
    `- **Updated:** ${repository.updatedAt}`,
    `- **Stars / forks:** ${repository.stargazerCount} / ${repository.forkCount}`,
    `- **Archived:** ${repository.isArchived ? 'yes' : 'no'}`,
    `- **Fork:** ${repository.isFork ? 'yes' : 'no'}`,
  ].filter((line): line is string => Boolean(line))
  return [
    `# ${repository.name}`,
    '',
    '## Repository summary',
    ...metadata,
    '',
    '## Topics',
    topics.length > 0 ? topics.join(', ') : 'No topics are set on GitHub.',
    '',
    '## Languages',
    languages.length > 0 ? languages.join('\n') : 'GitHub reports no language breakdown.',
    '',
    '## README',
    readme.trim().slice(0, MAX_README_CHARS) || 'No README is available for this repository.',
    '',
  ].join('\n')
}

export function githubRepositoryDocument(repositoryInput: GithubRepositoryRecord, readme: string): KnowledgeDocument {
  const repository = githubRepositorySchema.parse(repositoryInput)
  const isPublic = !repository.isPrivate && repository.visibility === 'PUBLIC'
  return {
    source: {
      type: isPublic ? 'github' : 'github-private',
      sourceId: repository.nameWithOwner,
      title: repository.name,
      url: repository.url,
    },
    text: renderGithubRepositoryMarkdown(repository, readme),
    isPublic,
    sourceUpdatedAt: new Date(repository.updatedAt),
  }
}

export function renderPersonalGithubProfileMarkdown(input: GithubProfileRecord): string {
  const profile = githubProfileSchema.parse(input)
  const facts = [
    markdownField('Name', profile.name),
    markdownField('GitHub handle', `@${profile.login}`),
    markdownField('Bio', profile.bio),
    markdownField('Company', profile.company),
    markdownField('Location', profile.location),
    markdownField('Website', profile.blog),
    `- **${profile.public_repos} public repositories**`,
    `- **${profile.followers} followers; follows ${profile.following} accounts**`,
    `- **GitHub account created:** ${profile.created_at}`,
  ].filter((line): line is string => Boolean(line))
  return [
    '# GitHub profile: Nelson (LST97)',
    '',
    '## Public profile details',
    ...facts,
    '',
    '## Professional profile',
    '- LinkedIn: https://www.linkedin.com/in/lst97/ (profile URL supplied by the owner)',
    '',
  ].join('\n')
}
