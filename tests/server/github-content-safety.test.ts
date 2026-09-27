import { describe, expect, it } from 'bun:test'

import { assertSafeGithubMarkdown, inspectSensitivePath, sanitizeEvidenceText } from '../../src/server/knowledge/github-content-safety'

describe('GitHub Markdown content safety', () => {
  it('blocks sensitive paths and sanitizes credential-bearing lines without returning secret values', () => {
    expect(inspectSensitivePath('.env.production')).toBe(true)
    expect(inspectSensitivePath('config/server.key')).toBe(true)
    expect(inspectSensitivePath('src/index.ts')).toBe(false)

    const result = sanitizeEvidenceText('Safe description.\nTOKEN=ghp_abcdefghijklmnopqrstuvwxyz1234567890\nAnother safe line.')
    expect(result.text).toContain('Safe description.')
    expect(result.text).toContain('Another safe line.')
    expect(result.text).not.toContain('ghp_')
    expect(result.findings).toContain('credential_assignment')

    const email = sanitizeEvidenceText('Contact maintainer at owner@example.com for access.')
    expect(email.text).toBe('')
    expect(email.findings).toContain('email_address')
  })

  it('detects common cloud/API credentials, high-entropy assignments, and private key blocks', () => {
    for (const value of [
      'AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE',
      'OPENROUTER_API_KEY=sk-or-v1-abcdefghijklmnopqrstuvwxyz123456',
      'api_key=1234567890abcdef1234567890abcdef',
      '-----BEGIN PRIVATE KEY-----\nredacted-fixture\n-----END PRIVATE KEY-----',
    ]) {
      expect(sanitizeEvidenceText(value).findings.length).toBeGreaterThan(0)
    }
  })

  it('fails closed on any remaining secret pattern with a generic error', () => {
    expect(() => assertSafeGithubMarkdown('# Summary\n\nOPENROUTER_API_KEY=sk-or-v1-abcdefghijklmnopqrstuvwxyz123456'))
      .toThrow('GitHub summary failed the content safety check')
  })

  it('keeps every committed private-repository report free of secrets before it can be published', async () => {
    const directory = `${process.cwd()}/src/data/github/private`
    const files = [...new Bun.Glob('*.md').scanSync(directory)].filter((name) => !name.endsWith('.md.md'))
    expect(files.length).toBeGreaterThan(0)

    for (const file of files) {
      const markdown = await Bun.file(`${directory}/${file}`).text()
      expect(() => assertSafeGithubMarkdown(markdown)).not.toThrow()
    }
  })
})
