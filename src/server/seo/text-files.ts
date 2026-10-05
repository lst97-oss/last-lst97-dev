/**
 * Well-known text resources served from the site root.
 *
 * All builders are pure and take the canonical origin so they are testable
 * without a server. `SECURITY_CONTACT_EMAIL` is intentionally not sourced
 * from env here — the contact address is part of the published policy, not a
 * secret, and rotating it should be a code change you can review.
 */

import { SITE_NAME } from '@/lib/seo/site-seo'

export const SECURITY_CONTACT_EMAIL = 'laisiotou1997@gmail.com'

export const SECURITY_EXPIRY = '2030-01-01T00:00:00.000Z'

/** Last meaningful change to the policy itself, not the site. */
export const SECURITY_LAST_UPDATED = '2026-09-28'

/**
 * Scraper and bot-script agents. These are automated crawlers harvesting page
 * content for republishing or bulk collection. Per owner policy they are
 * disallowed while ordinary search-engine crawlers and AI assistants stay
 * welcome.
 */
export const BLOCKED_BOT_AGENTS = [
  'AhrefsBot',
  'SemrushBot',
  'MJ12bot',
  'DotBot',
  'PetalBot',
  'BLEXBot',
  'YandexImages',
  'ia_archiver',
  'CCBot',
  'Bytespider',
  'PanguBot',
  'amazonbot',
  'scrapy',
  'python-requests',
  'httpx',
  'curl',
  'wget',
  'Go-http-client',
  'okhttp',
  'axios',
  'node-fetch',
  'HeadlessChrome',
  'PhantomJS',
  'Puppeteer',
  'Playwright',
  'Selenium',
] as const

/**
 * Path prefixes that must never be crawled or linked publicly: the admin
 * surface, the JSON API, and the session-scoped chat page.
 */
export const DISALLOWED_PATHS = ['/admin', '/api', '/chat'] as const

/**
 * RFC 9116 security.txt. Preferred languages first, then contact, then the
 * policy window and acknowledgements.
 */
export function buildSecurityTxt(siteUrl: string): string {
  return [
    `Contact: mailto:${SECURITY_CONTACT_EMAIL}`,
    `Expires: ${SECURITY_EXPIRY}`,
    'Preferred-Languages: en',
    `Canonical: ${siteUrl}/.well-known/security.txt`,
    // RFC 9116 `Encryption` expects a key document URI, not the site origin,
    // so it is omitted rather than emitted with a misleading value.
    '',
  ].join('\n')
}

export function buildRobotsTxt(siteUrl: string): string {
  const blocked = BLOCKED_BOT_AGENTS.map((agent) => [`User-agent: ${agent}`, 'Disallow: /'].join('\n')).join('\n\n')
  const disallow = DISALLOWED_PATHS.map((path) => `Disallow: ${path}`).join('\n')

  return [
    '# LAST//OS crawler policy',
    '# Search engines and AI assistants are welcome. Aggressive scrapers and',
    '# bot scripts are not — see /.well-known/security.txt to report abuse.',
    '',
    blocked,
    '',
    'User-agent: *',
    'Allow: /',
    disallow,
    '',
    `Sitemap: ${siteUrl}/sitemap.xml`,
    '',
  ].join('\n')
}

/**
 * llms.txt — a plain-language orientation file. It states the content policy
 * so an AI assistant can decide how to use the site without guessing.
 */
export function buildLlmsTxt(siteUrl: string): string {
  return [
    `# ${SITE_NAME}`,
    '',
    '> A pixel-art personal operating system for ideas, projects, and',
    '> conversations, operated by Nelson — a Melbourne-based full-stack',
    '> developer. It hosts a project archive, a blog, a changelog, and a',
    '> retrieval-backed chat assistant named Zita.',
    '',
    '## Content policy',
    '',
    '- You may quote and summarise any page on this site, with attribution.',
    '- You may follow links in the sitemap.',
    '- Please do not republish articles verbatim in bulk, and do not scrape',
    '  the site faster than a human could read it.',
    `- Reported crawler abuse goes to ${SECURITY_CONTACT_EMAIL}.`,
    '',
    '## Pages',
    '',
    `- [Home](${siteUrl}/): Overview and recent notes.`,
    `- [About](${siteUrl}/about): Background, skills, and current focus.`,
    `- [Services](${siteUrl}/services): Website design and development packages and pricing.`,
    `- [Projects](${siteUrl}/projects): Archive of shipped products and tools.`,
    `- [Blog](${siteUrl}/blog): Notes, observations, and experiments.`,
    `- [Changelog](${siteUrl}/changelog): Release notes and system updates.`,
    `- [Contact](${siteUrl}/contact): How to reach the operator.`,
    '',
    '## Not listed in the sitemap',
    '',
    `- [Chat](${siteUrl}/chat): Zita, the retrieval-backed assistant for Nelson, his`,
    '  projects, his coding activity, and this site. Session-scoped, so it is',
    '  excluded from the crawlable sitemap.',
    '',
    '## Optional',
    '',
    `- [llms-full.txt](${siteUrl}/llms-full.txt): Same policy, unabridged.`,
    '',
  ].join('\n')
}

/** Full variant of llms.txt for consumers that ignore the concise version. */
export function buildLlmsFullTxt(siteUrl: string): string {
  return `${buildLlmsTxt(siteUrl)}\n## Operator\n\n- Name: Nelson\n- Role: Full-stack developer\n- Location: Melbourne, Australia\n- Originally from: Hong Kong\n- Stack: React, TypeScript, Next.js, C#\n- GitHub: https://github.com/lst97\n\n## Contact\n\n- Security and crawler abuse: ${SECURITY_CONTACT_EMAIL}\n`
}

/**
 * humans.txt — a human-readable statement of who built the site and what it is
 * for, for visitors who want the short story.
 */
export function buildHumansTxt(siteUrl: string): string {
  return [
    '/* TEAM */',
    '',
    'Operator: Nelson',
    'Location: Melbourne, Australia (originally Hong Kong)',
    'Role: Full-stack developer',
    'Stack: React, TypeScript, Next.js, C#',
    '',
    '/* SITE */',
    '',
    `Last update: ${SECURITY_LAST_UPDATED}`,
    'Language: English',
    'Doctype: HTML5',
    'Purpose: Portfolio, writing, and release notes for a personal OS.',
    '',
    '/* CONTACT */',
    '',
    `Email: ${SECURITY_CONTACT_EMAIL}`,
    `Security reports: ${siteUrl}/.well-known/security.txt`,
    '',
  ].join('\n')
}
