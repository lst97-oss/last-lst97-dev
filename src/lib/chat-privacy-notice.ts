export type ChatPrivacyNoticePhase =
  | 'normal'
  | 'confirmation'
  | 'template_selection'
  | 'filling'
  | 'review'
  | 'delivered'

const NORMAL_CHAT_NOTICE =
  'OpenRouter screens messages and generates replies. Cloudflare checks each send. Chat content and visit details may go to private Discord diagnostics.'
const CONTACT_NOTICE =
  'OpenRouter screens contact text; Cloudflare checks the send. If sent, it goes to Nelson; OpenRouter refines bug and feature reports, with the original attached. Don’t include secrets or private learner data.'

export function getChatPrivacyNotice(phase: ChatPrivacyNoticePhase): string | undefined {
  if (phase === 'delivered') return undefined
  if (phase === 'template_selection' || phase === 'filling' || phase === 'review') return CONTACT_NOTICE
  return NORMAL_CHAT_NOTICE
}
