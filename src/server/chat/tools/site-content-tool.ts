import { z } from 'zod'

import type { PublicCitation } from '../../knowledge/retrieve'
import type { AgentToolCall, AgentToolResult, AgentToolRunner } from './agent-tools'
import {
  unavailableToolResult as createUnavailableResult,
  invalidToolResult,
  TOOL_TIMEOUT,
  withToolTimeout,
} from './tool-support'

export const siteContentArgsSchema = z
  .object({
    op: z.enum([
      'list_projects',
      'get_project',
      'list_posts',
      'get_post',
      'list_changelogs',
      'get_changelog',
      'list_topics',
      'get_topic',
      'list_pages',
    ]),
    slug: z.string().trim().min(1).max(200).optional(),
    limit: z.number().int().min(1).max(20).optional(),
    page: z.number().int().min(1).max(100).optional(),
  })
  .strict()

export type SiteContentToolArguments = z.infer<typeof siteContentArgsSchema>

function validatedArguments(args: SiteContentToolArguments): Record<string, string | number | boolean | undefined> {
  return {
    op: args.op,
    ...(args.slug !== undefined ? { slug: args.slug } : {}),
    ...(args.limit !== undefined ? { limit: args.limit } : {}),
    ...(args.page !== undefined ? { page: args.page } : {}),
  }
}

function lexicalTextLength(value: unknown): number {
  if (typeof value === 'string') return value.length
  if (Array.isArray(value)) return value.reduce((total, entry) => total + lexicalTextLength(entry), 0)
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>
    return lexicalTextLength(record.text) + lexicalTextLength(record.children)
  }
  return 0
}

/**
 * Static site sections a visitor can reach, with a one-line purpose each. This
 * is the answer to "what can I do on this site?" and "where is X?" — it lists
 * sections, not entries, so individual documents still come from the collection
 * ops. Kept beside the tool rather than in the SEO sitemap module because the
 * visitor-facing wording is chat-specific, and `/chat` is deliberately not in
 * the crawlable sitemap.
 * Purpose strings are short by necessity: `agent-loop.ts` slices the tool
 * output to 600 characters for the responder and the SSE `tool_result` summary
 * to 400 (`agent-loop.ts:359`). With eight sections the whole list measures 396,
 * so every entry must survive the shorter of the two.
 */
const SITE_SECTIONS = [
  { path: '/', title: 'Home', purpose: 'Overview and recent notes.' },
  { path: '/about', title: 'About', purpose: 'Background, skills, focus.' },
  { path: '/services', title: 'Services', purpose: 'Packages and pricing.' },
  { path: '/projects', title: 'Projects', purpose: 'Shipped products and tools.' },
  { path: '/blog', title: 'Blog', purpose: 'Notes and experiments.' },
  { path: '/changelog', title: 'Changelog', purpose: 'Release notes and updates.' },
  { path: '/contact', title: 'Contact', purpose: 'Reach Nelson, report a bug.' },
  { path: '/chat', title: 'Chat', purpose: 'Ask about Nelson or the site.' },
] as const

/** Public pathname for each collection, matching the site routes. */

function publicPath(collection: 'projects' | 'blog' | 'changelog' | 'blog/topics', slug: string): string {
  return `/${collection}/${encodeURIComponent(slug)}`
}

function entryUrl(
  runner: AgentToolRunner,
  collection: 'projects' | 'blog' | 'changelog' | 'blog/topics',
  slug: string,
): string {
  return `${runner.publicSiteUrl.replace(/\/+$/, '')}${publicPath(collection, slug)}`
}

function unavailable(
  call: AgentToolCall,
  runner: AgentToolRunner,
  message: string,
  args: SiteContentToolArguments,
): AgentToolResult {
  runner.logger.warn('chat.agent_tool.unavailable', { tool: call.name })
  return createUnavailableResult(call, message, 'BROWSING SITE CONTENT…', 'site_content', validatedArguments(args))
}

/**
 * Builds a source link the user can open. `isPublic` is always true here: the
 * reader only returns published entries, so the citation is safe to render.
 */
function siteCitation(id: string, title: string, url: string): PublicCitation {
  return { id, title, url, isPublic: true }
}

function completed(
  call: AgentToolCall,
  args: SiteContentToolArguments,
  output: string,
  citations: PublicCitation[] = [],
): AgentToolResult {
  return {
    call,
    output,
    status: 'completed',
    validatedArguments: validatedArguments(args),
    sseLabel: 'BROWSING SITE CONTENT…',
    sseName: 'site_content',
    // Citations become the SOURCES list under the reply, so a site-content answer
    // is attributable even though it never touches the RAG or catalogue paths.
    ...(citations.length > 0
      ? {
          retrieval: {
            evidence: [],
            citations,
          },
        }
      : {}),
  }
}

export async function runSiteContentTool(
  call: AgentToolCall,
  runner: AgentToolRunner,
  args: SiteContentToolArguments,
): Promise<AgentToolResult> {
  // list_pages is a static answer, so it must work even when no CMS reader is
  // wired: a site-orientation question should not fail with the collections.
  if (args.op === 'list_pages') {
    // The citation already carries the absolute URL, so the text line stays
    // compact: the whole list must survive the 600-char tool-output budget the
    // agent loop applies before the responder ever sees it.
    const base = runner.publicSiteUrl.replace(/\/+$/, '')
    const lines = SITE_SECTIONS.map((section) => `- ${section.title} (${section.path}) — ${section.purpose}`)
    return completed(
      call,
      args,
      `Site sections (${SITE_SECTIONS.length}):\n${lines.join('\n')}`,
      SITE_SECTIONS.map((section, index) => siteCitation(`K${index + 1}`, section.title, `${base}${section.path}`)),
    )
  }

  const source = runner.siteContent
  const label = 'BROWSING SITE CONTENT…'
  if (!source)
    return createUnavailableResult(
      call,
      'Site content is temporarily unavailable.',
      label,
      'site_content',
      validatedArguments(args),
    )

  switch (args.op) {
    case 'list_projects': {
      // listProjectsPage honors the requested limit/page so "more" requests
      // can walk the showcase; without them the first page is requested.
      const projects = await withToolTimeout(
        source.listProjectsPage({ page: args.page ?? 1, limit: args.limit ?? 12 }),
        runner.toolTimeoutMs,
        runner.logger,
        { tool: call.name, op: args.op },
      )
      if (projects === TOOL_TIMEOUT)
        return unavailable(call, runner, 'Site projects are temporarily unavailable.', args)
      if (projects.items.length === 0) return completed(call, args, 'No published projects found.')
      const lines = projects.items
        .slice(0, 12)
        .map(
          (project) =>
            `- ${project.title} (${project.slug}) — ${project.summary.slice(0, 160)} URL: ${entryUrl(runner, 'projects', project.slug)}`,
        )
      return completed(
        call,
        args,
        `Published projects (${projects.items.length}):\n${lines.join('\n')}`,
        projects.items
          .slice(0, 12)
          .map((project, index) =>
            siteCitation(`K${index + 1}`, project.title, entryUrl(runner, 'projects', project.slug)),
          ),
      )
    }

    case 'get_project': {
      if (!args.slug) return invalidToolResult(call, 'get_project requires { slug }', runner)
      const project = await withToolTimeout(source.getProject(args.slug), runner.toolTimeoutMs, runner.logger, {
        tool: call.name,
        op: args.op,
      })
      if (project === TOOL_TIMEOUT) return unavailable(call, runner, 'Site projects are temporarily unavailable.', args)
      if (!project) return completed(call, args, `No published project found for slug ${args.slug}.`)
      return completed(
        call,
        args,
        `${project.title} (${project.slug}): ${project.summary.slice(0, 400)} Technologies: ${project.technologies.join(', ') || 'none'}. Topics: ${project.topics.map((topic) => topic.title).join(', ') || 'none'}. Tags: ${project.tags.map((tag) => tag.title).join(', ') || 'none'}. Demo: ${project.liveUrl ?? 'none'}. Repo: ${project.repositoryUrl ?? 'none'}. Page: ${entryUrl(runner, 'projects', project.slug)}.`,
        [siteCitation('K1', project.title, entryUrl(runner, 'projects', project.slug))],
      )
    }

    case 'list_posts': {
      const page = await withToolTimeout(
        source.listPosts({ page: args.page ?? 1, limit: args.limit ?? 5 }),
        runner.toolTimeoutMs,
        runner.logger,
        { tool: call.name, op: args.op },
      )
      if (page === TOOL_TIMEOUT) return unavailable(call, runner, 'Site posts are temporarily unavailable.', args)
      if (page.items.length === 0) return completed(call, args, 'No published posts found.')
      const lines = page.items
        .slice(0, 10)
        .map(
          (post) =>
            `- ${post.title} (${post.slug}) — ${post.excerpt.slice(0, 160)} URL: ${entryUrl(runner, 'blog', post.slug)}`,
        )
      return completed(
        call,
        args,
        `Recent posts (page ${page.page}/${page.totalPages}):\n${lines.join('\n')}`,
        page.items
          .slice(0, 10)
          .map((post, index) => siteCitation(`K${index + 1}`, post.title, entryUrl(runner, 'blog', post.slug))),
      )
    }

    case 'get_post': {
      if (!args.slug) return invalidToolResult(call, 'get_post requires { slug }', runner)
      const post = await withToolTimeout(source.getPost(args.slug), runner.toolTimeoutMs, runner.logger, {
        tool: call.name,
        op: args.op,
      })
      if (post === TOOL_TIMEOUT) return unavailable(call, runner, 'Site posts are temporarily unavailable.', args)
      if (!post) return completed(call, args, `No published post found for slug ${args.slug}.`)
      return completed(
        call,
        args,
        `${post.title} (${post.slug}): ${post.excerpt.slice(0, 400)} Content length: ${lexicalTextLength(post.content)} chars. Page: ${entryUrl(runner, 'blog', post.slug)}.`,
        [siteCitation('K1', post.title, entryUrl(runner, 'blog', post.slug))],
      )
    }

    case 'list_changelogs': {
      const page = await withToolTimeout(
        source.listChangelogs({ page: args.page ?? 1, limit: args.limit ?? 5 }),
        runner.toolTimeoutMs,
        runner.logger,
        { tool: call.name, op: args.op },
      )
      if (page === TOOL_TIMEOUT) return unavailable(call, runner, 'Site changelogs are temporarily unavailable.', args)
      if (page.items.length === 0) return completed(call, args, 'No published changelogs found.')
      const lines = page.items
        .slice(0, 10)
        .map(
          (entry) =>
            `- ${entry.version ? `${entry.version} ` : ''}${entry.title} (${entry.slug}) — ${entry.excerpt.slice(0, 160)} URL: ${entryUrl(runner, 'changelog', entry.slug)}`,
        )
      return completed(
        call,
        args,
        `Recent changelogs (page ${page.page}/${page.totalPages}):\n${lines.join('\n')}`,
        page.items
          .slice(0, 10)
          .map((entry, index) =>
            siteCitation(
              `K${index + 1}`,
              entry.version ? `${entry.version} — ${entry.title}` : entry.title,
              entryUrl(runner, 'changelog', entry.slug),
            ),
          ),
      )
    }

    case 'get_changelog': {
      if (!args.slug) return invalidToolResult(call, 'get_changelog requires { slug }', runner)
      const entry = await withToolTimeout(source.getChangelog(args.slug), runner.toolTimeoutMs, runner.logger, {
        tool: call.name,
        op: args.op,
      })
      if (entry === TOOL_TIMEOUT) return unavailable(call, runner, 'Site changelogs are temporarily unavailable.', args)
      if (!entry) return completed(call, args, `No published changelog found for slug ${args.slug}.`)
      return completed(
        call,
        args,
        `${entry.title} (${entry.slug}): ${entry.excerpt.slice(0, 400)} Content length: ${lexicalTextLength(entry.content)} chars. Version: ${entry.version ?? 'none'}. Change types: ${entry.changeTypes.join(', ') || 'none'}. Published: ${entry.publishedAt}. Page: ${entryUrl(runner, 'changelog', entry.slug)}.`,
        [
          siteCitation(
            'K1',
            entry.version ? `${entry.version} — ${entry.title}` : entry.title,
            entryUrl(runner, 'changelog', entry.slug),
          ),
        ],
      )
    }

    case 'list_topics': {
      const topics = await withToolTimeout(source.listTopics(), runner.toolTimeoutMs, runner.logger, {
        tool: call.name,
        op: args.op,
      })
      if (topics === TOOL_TIMEOUT) return unavailable(call, runner, 'Site topics are temporarily unavailable.', args)
      if (topics.length === 0) return completed(call, args, 'No published topics found.')
      const lines = topics
        .slice(0, 12)
        .map(
          (topic) =>
            `- ${topic.title} (${topic.slug}) — ${topic.description.slice(0, 160)} URL: ${entryUrl(runner, 'blog/topics', topic.slug)}`,
        )
      return completed(
        call,
        args,
        `Published topics (${topics.length}):\n${lines.join('\n')}`,
        topics
          .slice(0, 12)
          .map((topic, index) =>
            siteCitation(`K${index + 1}`, topic.title, entryUrl(runner, 'blog/topics', topic.slug)),
          ),
      )
    }

    case 'get_topic': {
      if (!args.slug) return invalidToolResult(call, 'get_topic requires { slug }', runner)
      const topic = await withToolTimeout(source.getTopic(args.slug), runner.toolTimeoutMs, runner.logger, {
        tool: call.name,
        op: args.op,
      })
      if (topic === TOOL_TIMEOUT) return unavailable(call, runner, 'Site topics are temporarily unavailable.', args)
      if (!topic) return completed(call, args, `No published topic found for slug ${args.slug}.`)
      return completed(
        call,
        args,
        `${topic.title} (${topic.slug}): ${topic.description} Page: ${entryUrl(runner, 'blog/topics', topic.slug)}.`,
        [siteCitation('K1', topic.title, entryUrl(runner, 'blog/topics', topic.slug))],
      )
    }
  }
}
