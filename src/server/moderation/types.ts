import type { ChatMessage, ChatProjectListState, ChatTopicAnchor } from '../chat/types'
import type { AgentToolName, AgentToolRoutingInput, AgentToolUseDecisions } from '../chat/agent-tools'
import type { ChatJevDecisionDiagnostic, ChatModelCallDiagnostic } from '../observability/chat-diagnostics'
import type { ChatContactFieldValues, ChatContactTemplate } from '../../lib/chat-contact'

export type ModerationChannel = 'contact' | 'chat'

export interface ClassificationDecision {
  label: string
  confidence: number
}

export type ContactWorkflowFinding =
  | { phase: 'template'; safety: ClassificationDecision; template: ClassificationDecision }
  | { phase: 'form'; safety: ClassificationDecision; templateFit: ClassificationDecision }

export type ModerationFinding =
  | { channel: 'contact'; intent: ClassificationDecision }
  | { channel: 'chat'; scope: ClassificationDecision; safety: ClassificationDecision; contactIntent?: ClassificationDecision }

export interface ModerationDiagnosticsObserver {
  onModelCall(call: ChatModelCallDiagnostic): void
  onJevDecision(decision: ChatJevDecisionDiagnostic): void
}

export interface ModerationClassifier {
  classify(input: { channel: ModerationChannel; message: string; context?: ChatMessage[]; currentDateTimeUtc?: string }, observer?: ModerationDiagnosticsObserver): Promise<ModerationFinding>
  classifyChatWithTools?(input: { message: string; context: ChatMessage[]; topicAnchors?: ChatTopicAnchor[]; projectListState?: ChatProjectListState; availableTools: AgentToolName[]; currentDateTimeUtc?: string }, observer?: ModerationDiagnosticsObserver): Promise<{
    finding: Extract<ModerationFinding, { channel: 'chat' }>
    toolDecisions: AgentToolUseDecisions
  }>
  classifyContactWorkflow?(input: { phase: 'template' | 'form'; template: ChatContactTemplate; message: string; fields: ChatContactFieldValues; context: [] }, observer?: ModerationDiagnosticsObserver): Promise<ContactWorkflowFinding>
  routeTools?(input: AgentToolRoutingInput, observer?: ModerationDiagnosticsObserver): Promise<AgentToolUseDecisions>
}

export type ChatModerationRejectionReason = 'out_of_scope' | 'unsafe' | 'uncertain'

export type ModerationResult =
  | { allowed: true; toolDecisions?: AgentToolUseDecisions; contactIntent?: 'contact' }
  | { allowed: false; reason?: ChatModerationRejectionReason }
  | { unavailable: true }

export type ContactWorkflowModerationResult =
  | { allowed: true }
  | { allowed: false; reason: 'out_of_scope' | 'unsafe' | 'uncertain' }
  | { unavailable: true }
