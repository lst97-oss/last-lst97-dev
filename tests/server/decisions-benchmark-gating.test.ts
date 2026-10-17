import { describe, expect, it } from 'bun:test'
import {
  type DecisionSnapshot,
  evaluateChatGating,
  evaluateContactGating,
  evaluateWorkflowGating,
} from '../../scripts/dev/decisions-benchmark/gating'
import { createModerationService } from '../../src/server/moderation/service'
import type { ModerationClassifier } from '../../src/server/moderation/types'

type Decisions = Record<string, DecisionSnapshot>
type ChatResult = Awaited<ReturnType<ReturnType<typeof createModerationService>['checkChat']>>
type ContactResult = Awaited<ReturnType<ReturnType<typeof createModerationService>['checkContact']>>

const THRESHOLDS = [0.5, 0.55, 0.6, 0.7, 0.9]

function fakeClassifier(overrides: Partial<ModerationClassifier>): ModerationClassifier {
  return {
    async classify() {
      throw new Error('unexpected classify call')
    },
    ...overrides,
  }
}

function outcomeView(outcome: { allowed: boolean; reason?: string; contactIntent?: string }): Record<string, unknown> {
  return {
    allowed: outcome.allowed,
    ...(outcome.allowed ? {} : outcome.reason ? { reason: outcome.reason } : {}),
    ...(outcome.allowed && outcome.contactIntent ? { contactIntent: outcome.contactIntent } : {}),
  }
}

function chatResultView(result: ChatResult): Record<string, unknown> {
  if ('unavailable' in result) return { unavailable: true }
  if (result.allowed) {
    return { allowed: true, ...(result.contactIntent ? { contactIntent: result.contactIntent } : {}) }
  }
  return { allowed: false, ...(result.reason ? { reason: result.reason } : {}) }
}

function contactResultView(result: ContactResult): Record<string, unknown> {
  if ('unavailable' in result) return { unavailable: true }
  return { allowed: result.allowed }
}

describe('decision benchmark gating replay', () => {
  it('matches the real chat service for every decision shape and threshold', async () => {
    const fixtures: Array<{ name: string; decisions: Decisions }> = [
      {
        name: 'in-scope confident safe',
        decisions: {
          scope: { label: 'owner_context', confidence: 0.9 },
          safety: { label: 'safe', confidence: 0.9 },
          contact_intent: { label: 'normal_chat', confidence: 0.9 },
        },
      },
      {
        name: 'contact intent returns allowed with marker',
        decisions: {
          scope: { label: 'site_content', confidence: 0.9 },
          safety: { label: 'safe', confidence: 0.9 },
          contact_intent: { label: 'contact', confidence: 0.9 },
        },
      },
      {
        name: 'contact intent uncertain blocks',
        decisions: {
          scope: { label: 'site_content', confidence: 0.9 },
          safety: { label: 'safe', confidence: 0.9 },
          contact_intent: { label: 'uncertain', confidence: 0.9 },
        },
      },
      {
        name: 'unsafe label at high confidence',
        decisions: {
          scope: { label: 'general_knowledge', confidence: 0.9 },
          safety: { label: 'harmful', confidence: 0.9 },
          contact_intent: { label: 'normal_chat', confidence: 0.9 },
        },
      },
      {
        name: 'unsafe label just under each threshold',
        decisions: {
          scope: { label: 'general_knowledge', confidence: 0.9 },
          safety: { label: 'harmful', confidence: 0.55 },
          contact_intent: { label: 'normal_chat', confidence: 0.9 },
        },
      },
      {
        name: 'safe label with low confidence is uncertain',
        decisions: {
          scope: { label: 'owner_context', confidence: 0.9 },
          safety: { label: 'safe', confidence: 0.55 },
          contact_intent: { label: 'normal_chat', confidence: 0.9 },
        },
      },
      {
        name: 'explicit uncertain scope',
        decisions: {
          scope: { label: 'uncertain', confidence: 0.9 },
          safety: { label: 'safe', confidence: 0.9 },
          contact_intent: { label: 'normal_chat', confidence: 0.9 },
        },
      },
      {
        name: 'out-of-scope label',
        decisions: {
          scope: { label: 'general_knowledge', confidence: 0.9 },
          safety: { label: 'safe', confidence: 0.9 },
          contact_intent: { label: 'normal_chat', confidence: 0.9 },
        },
      },
      {
        name: 'missing contact intent decision',
        decisions: {
          scope: { label: 'owner_context', confidence: 0.9 },
          safety: { label: 'safe', confidence: 0.9 },
        },
      },
    ]

    for (const fixture of fixtures) {
      const classifier = fakeClassifier({
        async classify() {
          return {
            channel: 'chat' as const,
            scope: fixture.decisions.scope,
            safety: fixture.decisions.safety,
            ...(fixture.decisions.contact_intent ? { contactIntent: fixture.decisions.contact_intent } : {}),
          }
        },
      })
      for (const threshold of THRESHOLDS) {
        const service = createModerationService(classifier, threshold)
        const actual = chatResultView(await service.checkChat({ message: 'fixture', context: [] }))
        const replay = evaluateChatGating(fixture.decisions, threshold)
        if (replay === null) throw new Error(`replay unavailable: ${fixture.name} @ ${threshold}`)
        expect(actual, `${fixture.name} @ ${threshold}`).toEqual(outcomeView(replay))
      }
    }
  })

  it('matches the real direct-contact service for every decision shape and threshold', async () => {
    const fixtures: Array<{ name: string; decisions: Decisions }> = [
      {
        name: 'legitimate and safe',
        decisions: {
          intent: { label: 'legitimate', confidence: 0.9 },
          safety: { label: 'safe', confidence: 0.9 },
        },
      },
      {
        name: 'spam intent',
        decisions: {
          intent: { label: 'spam', confidence: 0.9 },
          safety: { label: 'safe', confidence: 0.9 },
        },
      },
      {
        name: 'legitimate at low confidence',
        decisions: {
          intent: { label: 'legitimate', confidence: 0.55 },
          safety: { label: 'safe', confidence: 0.9 },
        },
      },
      {
        name: 'unsafe content with legitimate intent',
        decisions: {
          intent: { label: 'legitimate', confidence: 0.9 },
          safety: { label: 'other', confidence: 0.9 },
        },
      },
      {
        name: 'safe content at low safety confidence',
        decisions: {
          intent: { label: 'legitimate', confidence: 0.9 },
          safety: { label: 'safe', confidence: 0.55 },
        },
      },
    ]

    for (const fixture of fixtures) {
      const classifier = fakeClassifier({
        async classify() {
          return {
            channel: 'contact' as const,
            intent: fixture.decisions.intent,
            safety: fixture.decisions.safety,
          }
        },
      })
      for (const threshold of THRESHOLDS) {
        const service = createModerationService(classifier, threshold)
        const actual = contactResultView(await service.checkContact('fixture'))
        const replay = evaluateContactGating(fixture.decisions, threshold)
        if (replay === null) throw new Error(`replay unavailable: ${fixture.name} @ ${threshold}`)
        expect(actual, `${fixture.name} @ ${threshold}`).toEqual({ allowed: replay.allowed })
      }
    }
  })

  it('matches the real contact workflow service for every decision shape and threshold', async () => {
    const fixtures: Array<{
      name: string
      phase: 'template' | 'form'
      template: string
      decisions: Decisions
    }> = [
      {
        name: 'template matches selection',
        phase: 'template',
        template: 'bug_report',
        decisions: {
          safety: { label: 'safe', confidence: 0.9 },
          template_choice: { label: 'bug_report', confidence: 0.9 },
        },
      },
      {
        name: 'template mismatches selection',
        phase: 'template',
        template: 'email',
        decisions: {
          safety: { label: 'safe', confidence: 0.9 },
          template_choice: { label: 'support_plan', confidence: 0.9 },
        },
      },
      {
        name: 'template out of scope',
        phase: 'template',
        template: 'email',
        decisions: {
          safety: { label: 'safe', confidence: 0.9 },
          template_choice: { label: 'out_of_scope', confidence: 0.9 },
        },
      },
      {
        name: 'template uncertain at low safety confidence',
        phase: 'template',
        template: 'email',
        decisions: {
          safety: { label: 'safe', confidence: 0.55 },
          template_choice: { label: 'email', confidence: 0.9 },
        },
      },
      {
        name: 'form matches template',
        phase: 'form',
        template: 'quotation',
        decisions: {
          safety: { label: 'safe', confidence: 0.9 },
          template_fit: { label: 'matches_template', confidence: 0.9 },
        },
      },
      {
        name: 'form out of scope',
        phase: 'form',
        template: 'quotation',
        decisions: {
          safety: { label: 'safe', confidence: 0.9 },
          template_fit: { label: 'out_of_scope', confidence: 0.9 },
        },
      },
      {
        name: 'form uncertain fit',
        phase: 'form',
        template: 'quotation',
        decisions: {
          safety: { label: 'safe', confidence: 0.9 },
          template_fit: { label: 'uncertain', confidence: 0.9 },
        },
      },
      {
        name: 'form unsafe content',
        phase: 'form',
        template: 'email',
        decisions: {
          safety: { label: 'prompt_injection', confidence: 0.9 },
          template_fit: { label: 'matches_template', confidence: 0.9 },
        },
      },
    ]

    for (const fixture of fixtures) {
      const classifier = fakeClassifier({
        async classifyContactWorkflow() {
          return fixture.phase === 'template'
            ? {
                phase: 'template' as const,
                safety: fixture.decisions.safety,
                template: fixture.decisions.template_choice,
              }
            : {
                phase: 'form' as const,
                safety: fixture.decisions.safety,
                templateFit: fixture.decisions.template_fit,
              }
        },
      })
      for (const threshold of THRESHOLDS) {
        const service = createModerationService(classifier, threshold)
        const actual = await service.checkContactWorkflow({
          phase: fixture.phase,
          template: fixture.template as never,
          message: 'fixture',
          fields: {},
        })
        const actualView =
          'unavailable' in actual
            ? { unavailable: true }
            : { allowed: actual.allowed, ...(actual.allowed ? {} : { reason: actual.reason }) }
        const replay = evaluateWorkflowGating(fixture.decisions, fixture.phase, fixture.template, threshold)
        if (replay === null) throw new Error(`replay unavailable: ${fixture.name} @ ${threshold}`)
        const expectedView = replay.allowed
          ? { allowed: true as const }
          : { allowed: false as const, ...(replay.reason ? { reason: replay.reason } : {}) }
        expect(actualView, `${fixture.name} @ ${threshold}`).toEqual(expectedView)
      }
    }
  })
})
