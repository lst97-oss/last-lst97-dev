import { z } from 'zod'
import type { AgentToolCall, AgentToolResult, AgentToolRunner } from './agent-tools'
import { TOOL_TIMEOUT, unavailableToolResult, withToolTimeout } from './tool-support'

// The service offer is a small closed corpus, so this tool takes no arguments
// and retrieves with one fixed query. That keeps retrieval deterministic and
// stops a visitor steering it toward an unrelated document; the real user turn
// still reaches `RetrieveKnowledge.execute`, which resolves the query from
// verified history and topic anchors.
const SERVICES_QUERY =
  'Nelson website design and development services: packages, starting prices, inclusions, add-ons, development process, technology, third-party costs, revision rounds, scope changes, and quote requirements. Go Support Plan for existing sites and applications: technical consultation and hourly rate, production readiness review, standard deployment and deployment rescue, vibe code rescue for AI-built projects, bug fixes, small feature implementation, domain DNS and hosting setup, CMS and API integration, database and backend support, migration and major changes, engagement process, scope exclusions, and consultation credit.'

const MAX_OUTPUT_EVIDENCE = 3
const MAX_OUTPUT_TEXT = 500

export const servicesArgsSchema = z.object({}).strict()

export type ServicesToolArguments = z.infer<typeof servicesArgsSchema>

export async function runServicesTool(
  call: AgentToolCall,
  runner: AgentToolRunner,
  _args: ServicesToolArguments,
): Promise<AgentToolResult> {
  if (!runner.knowledge) {
    return unavailableToolResult(
      call,
      'Service scope lookup is temporarily unavailable.',
      'LOOKING UP SERVICE SCOPE…',
      'services',
      {},
    )
  }

  const result = await withToolTimeout(
    runner.knowledge.execute({
      message: SERVICES_QUERY,
      verifiedHistory: runner.verifiedHistory ?? [],
      topicAnchors: runner.topicAnchors ?? [],
    }),
    runner.toolTimeoutMs,
    runner.logger,
    { tool: call.name },
  )
  if (result === TOOL_TIMEOUT) {
    return unavailableToolResult(call, 'Service scope lookup timed out.', 'LOOKING UP SERVICE SCOPE…', 'services', {})
  }

  const lines = result.evidence
    .slice(0, MAX_OUTPUT_EVIDENCE)
    .map((item) => `[${item.citationId}] ${item.source.title}: ${item.text.slice(0, MAX_OUTPUT_TEXT)}`)

  return {
    call,
    output: lines.length > 0 ? `Service scope results:\n${lines.join('\n')}` : 'No service scope documents matched.',
    status: 'completed',
    validatedArguments: {},
    sseLabel: 'LOOKING UP SERVICE SCOPE…',
    sseName: 'services',
    retrieval: {
      evidence: result.evidence,
      citations: result.citations,
    },
  }
}
