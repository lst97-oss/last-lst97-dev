import { z } from 'zod'

import type { AgentToolCall, AgentToolResult, AgentToolRunner } from './agent-tools'
import {
  unavailableToolResult as createUnavailableResult,
  invalidToolResult,
  TOOL_TIMEOUT,
  withToolTimeout,
} from './tool-support'

export const siteContentArgsSchema = z
  .object({
    op: z.enum(['list_projects', 'get_project', 'list_posts', 'get_post']),
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

function unavailable(
  call: AgentToolCall,
  runner: AgentToolRunner,
  message: string,
  args: SiteContentToolArguments,
): AgentToolResult {
  runner.logger.warn('chat.agent_tool.unavailable', { tool: call.name })
  return createUnavailableResult(call, message, 'BROWSING SITE CONTENT…', 'site_content', validatedArguments(args))
}

export async function runSiteContentTool(
  call: AgentToolCall,
  runner: AgentToolRunner,
  args: SiteContentToolArguments,
): Promise<AgentToolResult> {
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

  if (args.op === 'list_projects') {
    const projects = await withToolTimeout(source.listProjects(), runner.toolTimeoutMs)
    if (projects === TOOL_TIMEOUT) return unavailable(call, runner, 'Site projects are temporarily unavailable.', args)
    if (projects.length === 0)
      return {
        call,
        output: 'No published projects found.',
        status: 'completed',
        validatedArguments: validatedArguments(args),
        sseLabel: label,
        sseName: 'site_content',
      }
    const lines = projects
      .slice(0, 12)
      .map((project) => `- ${project.title} (${project.slug}) — ${project.summary.slice(0, 160)}`)
    return {
      call,
      output: `Published projects (${projects.length}):\n${lines.join('\n')}`,
      status: 'completed',
      validatedArguments: validatedArguments(args),
      sseLabel: label,
      sseName: 'site_content',
    }
  }

  if (args.op === 'get_project') {
    if (!args.slug) return invalidToolResult(call, 'get_project requires { slug }', runner)
    const project = await withToolTimeout(source.getProject(args.slug), runner.toolTimeoutMs)
    if (project === TOOL_TIMEOUT) return unavailable(call, runner, 'Site projects are temporarily unavailable.', args)
    if (!project)
      return {
        call,
        output: `No published project found for slug ${args.slug}.`,
        status: 'completed',
        validatedArguments: validatedArguments(args),
        sseLabel: label,
        sseName: 'site_content',
      }
    return {
      call,
      output: `${project.title} (${project.slug}): ${project.summary.slice(0, 400)} Technologies: ${project.technologies.join(', ') || 'none'}. Demo: ${project.liveUrl ?? 'none'}. Repo: ${project.repositoryUrl ?? 'none'}.`,
      status: 'completed',
      validatedArguments: validatedArguments(args),
      sseLabel: label,
      sseName: 'site_content',
    }
  }

  if (args.op === 'list_posts') {
    const page = await withToolTimeout(
      source.listPosts({ page: args.page ?? 1, limit: args.limit ?? 5 }),
      runner.toolTimeoutMs,
    )
    if (page === TOOL_TIMEOUT) return unavailable(call, runner, 'Site posts are temporarily unavailable.', args)
    if (page.items.length === 0)
      return {
        call,
        output: 'No published posts found.',
        status: 'completed',
        validatedArguments: validatedArguments(args),
        sseLabel: label,
        sseName: 'site_content',
      }
    const lines = page.items
      .slice(0, 10)
      .map((post) => `- ${post.title} (${post.slug}) — ${post.excerpt.slice(0, 160)}`)
    return {
      call,
      output: `Recent posts (page ${page.page}/${page.totalPages}):\n${lines.join('\n')}`,
      status: 'completed',
      validatedArguments: validatedArguments(args),
      sseLabel: label,
      sseName: 'site_content',
    }
  }

  if (!args.slug) return invalidToolResult(call, 'get_post requires { slug }', runner)
  const post = await withToolTimeout(source.getPost(args.slug), runner.toolTimeoutMs)
  if (post === TOOL_TIMEOUT) return unavailable(call, runner, 'Site posts are temporarily unavailable.', args)
  if (!post)
    return {
      call,
      output: `No published post found for slug ${args.slug}.`,
      status: 'completed',
      validatedArguments: validatedArguments(args),
      sseLabel: label,
      sseName: 'site_content',
    }
  return {
    call,
    output: `${post.title} (${post.slug}): ${post.excerpt.slice(0, 400)} Content length: ${lexicalTextLength(post.content)} chars.`,
    status: 'completed',
    validatedArguments: validatedArguments(args),
    sseLabel: label,
    sseName: 'site_content',
  }
}
