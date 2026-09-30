import type { Logger } from '../../observability/logger'
import { withTimeout } from '../timeout'
import type { AgentToolCall, AgentToolResult, AgentToolRunner } from './agent-tools'

export const TOOL_TIMEOUT = Symbol('tool-timeout')

/**
 * Tool sources fail closed as unavailable, including rejected or timed out requests.
 *
 * Every failure is mapped to `TOOL_TIMEOUT` on purpose: the caller has one code
 * path and the visitor must never see a driver error. But collapsing a *timeout*
 * and a *failure* into one indistinguishable value is what made a production
 * database auth error surface as "Knowledge lookup timed out" with nothing in
 * the logs to say why. `logger` receives the real reason, so the user-facing
 * message stays generic while the cause stays diagnosable.
 */
export async function withToolTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  logger?: Pick<Logger, 'warn'>,
  context?: Record<string, unknown>,
): Promise<T | typeof TOOL_TIMEOUT> {
  try {
    return await withTimeout(promise, timeoutMs, 'Agent tool request timed out')
  } catch (error) {
    const timedOut = error instanceof Error && error.message === 'Agent tool request timed out'
    logger?.warn(timedOut ? 'chat.agent_tool.timeout' : 'chat.agent_tool.failed', {
      ...context,
      reason: timedOut ? 'timeout' : 'error',
      // Driver errors can carry connection strings; the message alone is
      // enough to identify the cause and stays free of credentials.
      error: error instanceof Error ? error.message : String(error),
      timeoutMs,
    })
    return TOOL_TIMEOUT
  }
}

export function invalidToolResult(call: AgentToolCall, reason: string, runner: AgentToolRunner): AgentToolResult {
  runner.logger.warn('chat.agent_tool.invalid', { tool: call.name, reason })
  return {
    call,
    output: `Tool ${call.name} rejected: ${reason}.`,
    status: 'rejected',
    sseLabel: 'TOOL CALL REJECTED…',
    sseName: 'knowledge',
  }
}

export function unavailableToolResult(
  call: AgentToolCall,
  output: string,
  sseLabel: string,
  sseName: AgentToolResult['sseName'],
  arguments_: Record<string, string | number | boolean | undefined>,
): AgentToolResult {
  return { call, output, status: 'unavailable', validatedArguments: arguments_, sseLabel, sseName }
}
