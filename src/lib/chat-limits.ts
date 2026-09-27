export const MAX_CHAT_TURNS = 20
export const MAX_CHAT_CONTEXT_MESSAGES = MAX_CHAT_TURNS * 2
export const MAX_CHAT_CONTEXT_TOKEN_CHARS = 1_500_000
export const MAX_CHAT_REQUEST_BODY_BYTES = 2 * 1024 * 1024
export const CHAT_TURN_LIMIT_MESSAGE = 'This chat has reached its 20-turn limit. Clear the chat to start a new conversation.'

export function isChatTurnLimitReached(completedTurns: number): boolean {
  return completedTurns >= MAX_CHAT_TURNS
}

export function nextCompletedChatTurnCount(completedTurns: number): number {
  return Math.min(MAX_CHAT_TURNS, Math.max(0, Math.floor(completedTurns)) + 1)
}
