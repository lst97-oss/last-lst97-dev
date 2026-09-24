import type { ChatMessage, ChatTopicAnchor } from '../chat/types'
import type { AgentToolName, AgentToolRoutingInput, AgentToolUseDecisions } from '../chat/agent-tools'

export type ModerationChannel = 'contact' | 'chat'

export interface ClassificationDecision {
  label: string
  confidence: number
}

export type ModerationFinding =
  | { channel: 'contact'; intent: ClassificationDecision }
  | { channel: 'chat'; scope: ClassificationDecision; safety: ClassificationDecision }

export interface ModerationClassifier {
  classify(input: { channel: ModerationChannel; message: string; context?: ChatMessage[]; currentDateTimeUtc?: string }): Promise<ModerationFinding>
  classifyChatWithTools?(input: { message: string; context: ChatMessage[]; topicAnchors?: ChatTopicAnchor[]; availableTools: AgentToolName[]; currentDateTimeUtc?: string }): Promise<{
    finding: Extract<ModerationFinding, { channel: 'chat' }>
    toolDecisions: AgentToolUseDecisions
  }>
  routeTools?(input: AgentToolRoutingInput): Promise<AgentToolUseDecisions>
}

export type ChatModerationRejectionReason = 'out_of_scope' | 'unsafe' | 'uncertain'

export type ModerationResult =
  | { allowed: true; toolDecisions?: AgentToolUseDecisions }
  | { allowed: false; reason?: ChatModerationRejectionReason }
  | { unavailable: true }
