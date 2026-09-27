export const TURNSTILE_ACTIONS = {
  chatMessage: 'chat_message',
  contact: 'contact',
} as const

export type TurnstileAction = typeof TURNSTILE_ACTIONS[keyof typeof TURNSTILE_ACTIONS]
