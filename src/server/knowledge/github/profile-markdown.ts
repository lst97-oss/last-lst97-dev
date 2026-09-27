export interface RenderGithubProfileMarkdownInput {
  githubProfileMarkdown: string
  curatedProfileMarkdown: string
  wakaTimeMarkdown?: string
  wakaTimeSourceUrl: string
}

export function renderGithubProfileMarkdown(input: RenderGithubProfileMarkdownInput): string {
  const sections = [
    input.githubProfileMarkdown.trim(),
    '## Owner-provided profile summary',
    input.curatedProfileMarkdown.trim(),
  ]
  if (input.wakaTimeMarkdown?.trim()) {
    sections.push(
      '## Public coding-activity snapshot',
      input.wakaTimeMarkdown.trim(),
      `Source: ${input.wakaTimeSourceUrl}`,
    )
  }
  return sections.join('\n\n')
}
