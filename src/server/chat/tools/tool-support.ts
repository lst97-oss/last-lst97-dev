import { withTimeout } from '../timeout'
import type { AgentToolCall, AgentToolResult, AgentToolRunner } from './agent-tools'

export const TOOL_TIMEOUT = Symbol('tool-timeout')

/** Tool sources fail closed as unavailable, including rejected or timed out requests. */
export async function withToolTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T | typeof TOOL_TIMEOUT> {
  try {
    return await withTimeout(promise, timeoutMs, 'Agent tool request timed out')
  } catch {
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
