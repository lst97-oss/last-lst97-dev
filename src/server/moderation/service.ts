import type { ChatContactFieldValues, ChatContactTemplate } from '../../lib/chat-contact'
import type { AgentToolName, AgentToolRoutingInput } from '../chat/tools/agent-tools'
import type { ChatMessage, ChatProjectListState, ChatTopicAnchor } from '../chat/types'
import type {
  ClassificationDecision,
  ContactWorkflowModerationResult,
  ModerationClassifier,
  ModerationDiagnosticsObserver,
  ModerationResult,
} from './types'

// Scope labels are trusted as returned: Jev's scope confidence produced too
// many false "uncertain" rejections on genuine owner questions. Only safety
// confidence still gates; an explicit `uncertain` scope label still blocks.
export function createModerationService(classifier: ModerationClassifier, minimumConfidence: number) {
  const checkContact = async (message: string): Promise<ModerationResult> => {
    try {
      const finding = await classifier.classify({ channel: 'contact', message })
      if (finding.channel !== 'contact') return { allowed: false }
      if (!isConfident(finding.intent.confidence, minimumConfidence)) return { allowed: false }
      return finding.intent.label === 'legitimate' ? { allowed: true } : { allowed: false }
    } catch {
      return { unavailable: true }
    }
  }

  const checkContactWorkflow = async (
    input: {
      phase: 'template' | 'form'
      template: ChatContactTemplate
      message: string
      fields: ChatContactFieldValues
    },
    observer?: ModerationDiagnosticsObserver,
  ): Promise<ContactWorkflowModerationResult> => {
    if (!classifier.classifyContactWorkflow) return { unavailable: true }
    try {
      const finding = await classifier.classifyContactWorkflow({ ...input, context: [] }, observer)
      if (finding.phase !== input.phase) return { allowed: false, reason: 'uncertain' }
      const decisions: Record<string, ClassificationDecision> =
        finding.phase === 'template'
          ? { safety: finding.safety, template_choice: finding.template }
          : { safety: finding.safety, template_fit: finding.templateFit }
      observer?.onJevDecision({ stage: 'contact_workflow', decisions })

      if (finding.safety.label !== 'safe') return { allowed: false, reason: 'unsafe' }
      if (!isConfident(finding.safety.confidence, minimumConfidence)) return { allowed: false, reason: 'uncertain' }
      const fitLabel = finding.phase === 'template' ? finding.template.label : finding.templateFit.label
      const expectedLabel = finding.phase === 'template' ? input.template : 'matches_template'
      if (fitLabel === 'uncertain') return { allowed: false, reason: 'uncertain' }
      if (fitLabel === 'out_of_scope' || fitLabel !== expectedLabel) {
        return { allowed: false, reason: 'out_of_scope' }
      }
      return { allowed: true }
    } catch {
      return { unavailable: true }
    }
  }

  const checkChat = async (
    input: {
      message: string
      context: ChatMessage[]
      topicAnchors?: ChatTopicAnchor[]
      projectListState?: ChatProjectListState
      availableTools?: AgentToolName[]
      currentDateTimeUtc?: string
    },
    observer?: ModerationDiagnosticsObserver,
  ): Promise<ModerationResult> => {
    try {
      const combined =
        input.availableTools && classifier.classifyChatWithTools
          ? await classifier.classifyChatWithTools(
              {
                message: input.message,
                context: input.context,
                topicAnchors: input.topicAnchors,
                projectListState: input.projectListState,
                availableTools: input.availableTools,
                currentDateTimeUtc: input.currentDateTimeUtc,
              },
              observer,
            )
          : undefined
      const finding =
        combined?.finding ??
        (await classifier.classify(
          {
            channel: 'chat',
            message: input.message,
            context: input.context,
            currentDateTimeUtc: input.currentDateTimeUtc,
          },
          observer,
        ))
      if (finding.channel === 'chat') {
        observer?.onJevDecision({
          stage: 'moderation',
          decisions: {
            scope: finding.scope,
            safety: finding.safety,
            ...(finding.contactIntent ? { contact_intent: finding.contactIntent } : {}),
            ...(combined?.toolDecisions ?? {}),
          },
        })
      }
      if (finding.channel !== 'chat') return { allowed: false, reason: 'uncertain' }

      const scopeAllowed = [
        'owner_context',
        'owner_projects',
        'site_content',
        'owner_goals',
        'on_behalf',
        'assistant_usage',
      ].includes(finding.scope.label)
      const safetyAllowed = finding.safety.label === 'safe'
      const safetyConfidenceAllowed = isConfident(finding.safety.confidence, minimumConfidence)
      if (!safetyConfidenceAllowed) return { allowed: false, reason: 'uncertain' }
      if (!safetyAllowed) return { allowed: false, reason: 'unsafe' }
      if (finding.contactIntent?.label === 'contact') return { allowed: true, contactIntent: 'contact' }
      if (finding.contactIntent && finding.contactIntent.label !== 'normal_chat')
        return { allowed: false, reason: 'uncertain' }
      if (finding.scope.label === 'uncertain') return { allowed: false, reason: 'uncertain' }
      if (!scopeAllowed) return { allowed: false, reason: 'out_of_scope' }
      return {
        allowed: true,
        ...(combined ? { toolDecisions: combined.toolDecisions } : {}),
      }
    } catch {
      return { unavailable: true }
    }
  }

  const routeTools = async (input: AgentToolRoutingInput, observer?: ModerationDiagnosticsObserver) => {
    if (!classifier.routeTools) throw new Error('Jev tool routing is unavailable')
    const decisions = await classifier.routeTools(input, observer)
    observer?.onJevDecision({ stage: 'tool_routing', decisions })
    return decisions
  }

  return {
    checkContact,
    checkContactWorkflow,
    checkChat,
    ...(classifier.routeTools ? { routeTools } : {}),
  }
}

function isConfident(confidence: number, minimumConfidence: number): boolean {
  return Number.isFinite(confidence) && confidence >= minimumConfidence
}

export type ModerationService = Omit<ReturnType<typeof createModerationService>, 'checkContactWorkflow'> & {
  checkContactWorkflow?: ReturnType<typeof createModerationService>['checkContactWorkflow']
}
