export type GithubContentFinding =
  | 'credential_assignment'
  | 'github_token'
  | 'cloud_access_key'
  | 'private_key_block'
  | 'high_entropy_value'
  | 'email_address'

export interface SanitizationResult {
  text: string
  findings: GithubContentFinding[]
}

const sensitivePathPatterns = [
  /(^|\/)\.env(?:\.[^/]*)?$/i,
  /(^|\/)(?:secrets?|credentials?|private|certificates?|keys?|\.ssh|\.aws|\.config\/gcloud)(\/|$)/i,
  /\.(?:pem|key|p12|pfx|cer|crt|der|jks|keystore)$/i,
  /(?:^|\/)[^/]*(?:secret|credential|token|dump|backup|\.log$)[^/]*$/i,
]

const credentialAssignment =
  /\b(?:api[_-]?key|access[_-]?key|secret[_-]?key|client[_-]?secret|password|passwd|token|authorization|auth)\b\s*[:=]\s*\S+/i
const githubToken = /\b(?:gh[pousr]_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/
const cloudKey = /\b(?:AKIA[0-9A-Z]{16}|(?:cfat_|sk-or-v1-|sk-[A-Za-z0-9_-]{20,})[A-Za-z0-9_-]{12,})\b/
const pemMarker = /-----BEGIN (?:[A-Z ]+ )?PRIVATE KEY-----/
const entropyAssignment = /\b[A-Z][A-Z0-9_]*(?:KEY|SECRET|TOKEN|PASSWORD)\b\s*[:=]\s*([A-Za-z0-9+/=_-]{24,})/i
const emailAddress = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i

export function inspectSensitivePath(path: string): boolean {
  const normalized = path.replaceAll('\\', '/').replace(/^\.\//, '')
  return (
    normalized.split('/').some((part) => part === '..') ||
    sensitivePathPatterns.some((pattern) => pattern.test(normalized))
  )
}

export function sanitizeEvidenceText(input: string): SanitizationResult {
  const findings = new Set<GithubContentFinding>()
  const output: string[] = []
  let inPrivateKey = false
  for (const line of input.split(/\r?\n/)) {
    if (pemMarker.test(line) || inPrivateKey) {
      findings.add('private_key_block')
      inPrivateKey = !/-----END (?:[A-Z ]+ )?PRIVATE KEY-----/.test(line)
      continue
    }
    const containsGithub = githubToken.test(line)
    const containsCloud = cloudKey.test(line)
    const assignment = credentialAssignment.test(line)
    const entropy = entropyAssignment.test(line)
    const email = emailAddress.test(line)
    if (containsGithub) findings.add('github_token')
    if (containsCloud) findings.add('cloud_access_key')
    if (assignment) findings.add('credential_assignment')
    if (entropy) findings.add('high_entropy_value')
    if (email) findings.add('email_address')
    if (containsGithub || containsCloud || assignment || entropy || email) continue
    output.push(line)
  }
  return { text: output.join('\n').trim(), findings: [...findings] }
}

export function assertSafeGithubMarkdown(markdown: string): void {
  const findings = sanitizeEvidenceText(markdown).findings
  if (findings.length > 0 || /-----BEGIN (?:[A-Z ]+ )?PRIVATE KEY-----/i.test(markdown)) {
    throw new Error('GitHub summary failed the content safety check')
  }
}
