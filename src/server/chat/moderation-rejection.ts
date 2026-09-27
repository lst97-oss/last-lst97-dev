import type { ChatModerationRejectionReason } from '../moderation/types'

const rejectionMessages: Record<ChatModerationRejectionReason, string> = {
  out_of_scope: 'This chat focuses on Nelson, his projects and published posts, and this website and its features.',
  unsafe: 'I can’t help with unsafe or harmful requests. You can ask about Nelson’s work or this site’s assistant.',
  uncertain: 'I couldn’t confidently classify your request. Please rephrase it as a question about Nelson or this site’s assistant.',
}

export function chatModerationRejectionMessage(reason: ChatModerationRejectionReason | undefined): string {
  return rejectionMessages[reason ?? 'uncertain']
}
