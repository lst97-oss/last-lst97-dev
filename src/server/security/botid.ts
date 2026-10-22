import { checkBotId } from 'botid/server'
import type { Logger } from '../observability/logger'
import { logger as defaultLogger } from '../observability/logger'

export interface BotVerification {
  /** The request was classified as automated traffic. */
  isBot: boolean
  /**
   * The check could not run (no Vercel request context, missing OIDC token,
   * provider error). The request is allowed through to the Turnstile and
   * rate-limit gates instead of failing closed on our own infrastructure.
   */
  degraded: boolean
}

export type BotIdCheck = () => Promise<{ isBot: boolean }>

/**
 * Vercel BotID classification for one request.
 *
 * BotID is an additive layer on top of Turnstile and the rate limit, not a
 * replacement: Turnstile still decides the request, so a BotID outage must
 * not take the chat offline. That is why a failed check degrades to "not a
 * bot" instead of rejecting the visitor, and why the degradation is logged as
 * an error rather than swallowed.
 */
export async function checkBotRequest(
  check: BotIdCheck = checkBotId,
  log: Logger = defaultLogger,
): Promise<BotVerification> {
  try {
    const verification = await check()
    if (verification.isBot) {
      log.warn('bot.rejected', { reason: 'bot_detected' })
      return { isBot: true, degraded: false }
    }
    return { isBot: false, degraded: false }
  } catch {
    log.error('bot.unavailable', { failureCategory: 'botid_check_failed' })
    return { isBot: false, degraded: true }
  }
}
