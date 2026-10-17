import { CHAT_TOOL_NAMES } from '../../../src/server/chat/types'
import type { KnowledgeSourceType } from '../../../src/server/knowledge/types'
import { createModerationService } from '../../../src/server/moderation/service'
import { SystemOneError } from '../../../src/server/moderation/system-one-client'
import type { ModerationDiagnosticsObserver } from '../../../src/server/moderation/types'
import type {
  ChatBenchmarkCase,
  ContactDirectBenchmarkCase,
  ContactWorkflowBenchmarkCase,
  RelevanceBenchmarkCase,
  RoutingBenchmarkCase,
} from '../../../tests/server/decisions-benchmark-cases'
import type { CapturedDecision, CapturedModelCall, CaseRunRecord, DecisionArm, Surface } from './types'

export type BenchmarkCase =
  | ({ surface: 'chat' } & ChatBenchmarkCase)
  | ({ surface: 'routing' } & RoutingBenchmarkCase)
  | ({ surface: 'contact-direct' } & ContactDirectBenchmarkCase)
  | ({ surface: 'contact-workflow' } & ContactWorkflowBenchmarkCase)
  | ({ surface: 'relevance' } & RelevanceBenchmarkCase)

export interface Capture {
  observer: ModerationDiagnosticsObserver
  modelCalls: CapturedModelCall[]
  decisions: CapturedDecision[]
}

export function createCapture(): Capture {
  const modelCalls: CapturedModelCall[] = []
  const decisions: CapturedDecision[] = []
  const observer: ModerationDiagnosticsObserver = {
    onModelCall: (call) => {
      modelCalls.push({
        provider: call.provider,
        operation: call.operation,
        ...(call.model === undefined ? {} : { model: call.model }),
        status: call.status,
        ...(call.inputTokens === undefined ? {} : { inputTokens: call.inputTokens }),
        ...(call.outputTokens === undefined ? {} : { outputTokens: call.outputTokens }),
        ...(call.costUsd === undefined ? {} : { costUsd: call.costUsd }),
      })
    },
    onDecision: (decision) => {
      decisions.push({ stage: decision.stage, decisions: decision.decisions })
    },
  }
  return { observer, modelCalls, decisions }
}

function errorCategory(error: unknown): string {
  if (error instanceof SystemOneError) return error.category
  if (error instanceof Error && error.name) return error.name
  return 'unknown'
}

async function executeSurface(
  arm: DecisionArm,
  surface: Surface,
  testCase: BenchmarkCase,
  minimumConfidence: number,
  currentDateTimeUtc: string,
  capture: Capture,
): Promise<unknown> {
  const service = createModerationService(arm.classifier, minimumConfidence)

  switch (surface) {
    case 'chat': {
      if (testCase.surface !== 'chat') throw new Error('case surface mismatch')
      return service.checkChat(
        {
          message: testCase.message,
          context: testCase.context ?? [],
          ...(testCase.topicAnchors ? { topicAnchors: testCase.topicAnchors } : {}),
          ...(testCase.projectListState ? { projectListState: testCase.projectListState } : {}),
          availableTools: [...CHAT_TOOL_NAMES],
          currentDateTimeUtc,
        },
        capture.observer,
      )
    }
    case 'routing': {
      if (testCase.surface !== 'routing') throw new Error('case surface mismatch')
      const routeTools = service.routeTools
      if (!routeTools) throw new Error('arm does not expose routeTools')
      return routeTools(
        {
          message: testCase.message,
          currentDateTimeUtc,
          history: testCase.history ?? [],
          ...(testCase.topicAnchors ? { topicAnchors: testCase.topicAnchors } : {}),
          evidence: testCase.evidence ?? '',
          toolOutputs: testCase.toolOutputs ?? '',
          availableTools: [...CHAT_TOOL_NAMES],
        },
        capture.observer,
      )
    }
    case 'contact-direct': {
      if (testCase.surface !== 'contact-direct') throw new Error('case surface mismatch')
      // `checkContact` accepts no observer by design, so this surface is scored
      // end-to-end only: a model that omits `confidence` fails every benign
      // submission here, which the outcome itself reveals.
      return service.checkContact(testCase.message)
    }
    case 'contact-workflow': {
      if (testCase.surface !== 'contact-workflow') throw new Error('case surface mismatch')
      return service.checkContactWorkflow(
        {
          phase: testCase.phase,
          template: testCase.template,
          message: testCase.message,
          fields: testCase.fields,
        },
        capture.observer,
      )
    }
    case 'relevance': {
      if (testCase.surface !== 'relevance') throw new Error('case surface mismatch')
      return arm.relevance.assess({
        query: testCase.query,
        candidate: {
          id: testCase.document.id,
          text: testCase.document.text,
          isPublic: !testCase.document.sourceType.includes('private'),
          source: {
            type: testCase.document.sourceType as KnowledgeSourceType,
            sourceId: testCase.document.id,
            title: testCase.document.title,
            url: '',
          },
        },
        onModelCall: (call) => capture.observer.onModelCall(call),
      })
    }
  }
}

export async function runCase(input: {
  arm: DecisionArm
  testCase: BenchmarkCase
  repeat: number
  minimumConfidence: number
  currentDateTimeUtc: string
}): Promise<CaseRunRecord> {
  const capture = createCapture()
  const startedAt = performance.now()
  try {
    const outcome = await executeSurface(
      input.arm,
      input.testCase.surface,
      input.testCase,
      input.minimumConfidence,
      input.currentDateTimeUtc,
      capture,
    )
    return {
      caseId: input.testCase.id,
      surface: input.testCase.surface,
      armId: input.arm.id,
      repeat: input.repeat,
      latencyMs: Math.max(0, Math.round(performance.now() - startedAt)),
      status: 'ok',
      outcome,
      modelCalls: capture.modelCalls,
      decisions: capture.decisions,
    }
  } catch (error) {
    return {
      caseId: input.testCase.id,
      surface: input.testCase.surface,
      armId: input.arm.id,
      repeat: input.repeat,
      latencyMs: Math.max(0, Math.round(performance.now() - startedAt)),
      status: 'error',
      errorCategory: errorCategory(error),
      modelCalls: capture.modelCalls,
      decisions: capture.decisions,
    }
  }
}

/** A small worker pool; keeps provider concurrency bounded without dependencies. */
export async function mapConcurrent<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let next = 0
  const workers = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
    for (;;) {
      const index = next
      next += 1
      if (index >= items.length) return
      results[index] = await fn(items[index])
    }
  })
  await Promise.all(workers)
  return results
}
