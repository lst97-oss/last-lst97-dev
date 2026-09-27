import { describe, expect, it } from 'bun:test'

import { renderGithubProfileMarkdown } from '../../src/server/knowledge/github/profile-markdown'

describe('GitHub profile Markdown', () => {
  it('combines GitHub, curated profile, and public WakaTime sections', () => {
    const markdown = renderGithubProfileMarkdown({
      githubProfileMarkdown: '# GitHub profile\nNelson',
      curatedProfileMarkdown: 'Nelson is LST97.',
      wakaTimeMarkdown: 'Coding total: 3,260 hrs 21 mins.',
      wakaTimeSourceUrl: 'https://wakatime.com/share/@lst97/example.json',
    })

    expect(markdown).toBe([
      '# GitHub profile\nNelson',
      '## Owner-provided profile summary',
      'Nelson is LST97.',
      '## Public coding-activity snapshot',
      'Coding total: 3,260 hrs 21 mins.',
      'Source: https://wakatime.com/share/@lst97/example.json',
    ].join('\n\n'))
  })

  it('omits the WakaTime section when no public snapshot is available', () => {
    const markdown = renderGithubProfileMarkdown({
      githubProfileMarkdown: '# GitHub profile',
      curatedProfileMarkdown: 'Nelson is LST97.',
      wakaTimeSourceUrl: 'https://wakatime.com/share/@lst97/example.json',
    })

    expect(markdown).toBe('# GitHub profile\n\n## Owner-provided profile summary\n\nNelson is LST97.')
    expect(markdown).not.toContain('coding-activity')
  })
})
