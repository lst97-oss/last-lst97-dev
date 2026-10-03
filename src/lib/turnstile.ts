/**
 * Turnstile `action` values, verified server-side alongside the hostname.
 *
 * These are separate values per phase on purpose: Cloudflare tokens carry their
 * action, so one token cannot be replayed across phases. `contact` gates the
 * final send, `contact_screening` gates the expensive screening pass that runs
 * before the visitor reaches review.
 */
export const TURNSTILE_ACTIONS = {
  chatMessage: 'chat_message',
  contact: 'contact',
  contactScreening: 'contact_screening',
} as const

export type TurnstileAction = (typeof TURNSTILE_ACTIONS)[keyof typeof TURNSTILE_ACTIONS]
