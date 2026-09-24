import type { ChatMessage, ChatTopicAnchor } from '../chat/types'
import type { AgentToolName, AgentToolRoutingInput } from '../chat/agent-tools'
import type { ModerationClassifier, ModerationResult } from './types'

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

  const checkChat = async (input: { message: string; context: ChatMessage[]; topicAnchors?: ChatTopicAnchor[]; availableTools?: AgentToolName[]; currentDateTimeUtc?: string }): Promise<ModerationResult> => {
    try {
      const combined = input.availableTools && classifier.classifyChatWithTools
        ? await classifier.classifyChatWithTools({ message: input.message, context: input.context, topicAnchors: input.topicAnchors, availableTools: input.availableTools, currentDateTimeUtc: input.currentDateTimeUtc })
        : undefined
      const finding = combined?.finding ?? await classifier.classify({ channel: 'chat', message: input.message, context: input.context, currentDateTimeUtc: input.currentDateTimeUtc })
      if (finding.channel !== 'chat') return { allowed: false, reason: 'uncertain' }

      const scopeAllowed = ['owner_context', 'owner_projects', 'site_content', 'owner_goals', 'on_behalf', 'assistant_usage'].includes(finding.scope.label)
      const safetyAllowed = finding.safety.label === 'safe'
      const safetyConfidenceAllowed = isConfident(finding.safety.confidence, minimumConfidence)
      if (finding.scope.label === 'uncertain' || !safetyConfidenceAllowed) {
        return { allowed: false, reason: 'uncertain' }
      }
      if (!safetyAllowed) return { allowed: false, reason: 'unsafe' }
      if (!scopeAllowed) return { allowed: false, reason: 'out_of_scope' }
      return { allowed: true, ...(combined ? { toolDecisions: combined.toolDecisions } : {}) }
    } catch {
      return { unavailable: true }
    }
  }

  const routeTools = async (input: AgentToolRoutingInput) => {
    if (!classifier.routeTools) throw new Error('Jev tool routing is unavailable')
    return classifier.routeTools(input)
  }

  return {
    checkContact,
    checkChat,
    ...(classifier.routeTools ? { routeTools } : {}),
  }
}

function isConfident(confidence: number, minimumConfidence: number): boolean {
  return Number.isFinite(confidence) && confidence >= minimumConfidence
}

export type ModerationService = ReturnType<typeof createModerationService>
