export const MAX_CHAT_TURNS = 20
export const MAX_CHAT_CONTEXT_MESSAGES = MAX_CHAT_TURNS * 2
export const MAX_CHAT_CONTEXT_TOKEN_CHARS = 1_500_000
export const MAX_CHAT_REQUEST_BODY_BYTES = 2 * 1024 * 1024
export const CHAT_TURN_LIMIT_MESSAGE =
  'This chat has reached its 20-turn limit. Clear the chat to start a new conversation.'

/**
 * Messages the server writes for the visitor. `src/server/chat/service.ts`
 * and `http-handler.ts` copy these into their responses and error frames, and
 * the browser chat client uses the set to tell an authored message apart from
 * transport plumbing.
 *
 * This is why they live here rather than being hardcoded in the client: a
 * message the server never sends must not be renderable, and a message the
 * server does send must not be silently replaced with generic copy.
 */
export const CHAT_OFFLINE_MESSAGE = 'Zita is offline right now.'

export const CHAT_EXPIRED_MESSAGE = 'This conversation has expired. Please start a new conversation.'

export const CHAT_TURNSTILE_REQUIRED_MESSAGE = 'Complete the security check and send your message again.'

export const CHAT_RATE_LIMIT_MESSAGE = 'Too many requests. Please try again later.'

export const CHAT_INVALID_MESSAGE_MESSAGE = 'Enter a valid message.'

export const CHAT_REQUEST_TOO_LARGE_MESSAGE = 'Request is too large.'

export const AUTHORED_CHAT_MESSAGES: ReadonlySet<string> = new Set([
  CHAT_OFFLINE_MESSAGE,
  CHAT_EXPIRED_MESSAGE,
  CHAT_TURNSTILE_REQUIRED_MESSAGE,
  CHAT_RATE_LIMIT_MESSAGE,
  CHAT_INVALID_MESSAGE_MESSAGE,
  CHAT_REQUEST_TOO_LARGE_MESSAGE,
  CHAT_TURN_LIMIT_MESSAGE,
])

/**
 * Reduce a thrown transport error to copy that is safe to show a visitor.
 *
 * Only messages the server authors for the visitor may be rendered verbatim.
 * Anything thrown by `fetch` or by `reader.read()` is transport plumbing: when
 * an SSE body is torn down mid-stream the runtime rejects the reader with a
 * `TypeError` whose message is literally "Error in input stream" (Chromium)
 * or "terminated" (undici). Rendering `error.message` verbatim is how those
 * reached the UI, so anything outside `AUTHORED_CHAT_MESSAGES` collapses to
 * the generic offline copy.
 */
export function safeChatFailureMessage(requestError: unknown): string {
  const message = requestError instanceof Error ? requestError.message : ''
  return AUTHORED_CHAT_MESSAGES.has(message) ? message : CHAT_OFFLINE_MESSAGE
}

export function isChatTurnLimitReached(completedTurns: number): boolean {
  return completedTurns >= MAX_CHAT_TURNS
}

export function nextCompletedChatTurnCount(completedTurns: number): number {
  return Math.min(MAX_CHAT_TURNS, Math.max(0, Math.floor(completedTurns)) + 1)
}
