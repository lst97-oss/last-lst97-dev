import { describe, expect, it } from 'bun:test'
import type { Logger } from '../../src/server/observability/logger'
import { checkBotRequest } from '../../src/server/security/botid'

function createLogger() {
  const events: { level: string; event: string }[] = []
  const logger: Logger = {
    debug: (event) => events.push({ level: 'debug', event }),
    info: (event) => events.push({ level: 'info', event }),
    warn: (event) => events.push({ level: 'warn', event }),
    error: (event) => events.push({ level: 'error', event }),
  }
  return { logger, events }
}

describe('checkBotRequest', () => {
  it('rejects a request classified as a bot', async () => {
    const { logger, events } = createLogger()
    const verification = await checkBotRequest(async () => ({ isBot: true }), logger)

    expect(verification).toEqual({ isBot: true, degraded: false })
    expect(events).toContainEqual({ level: 'warn', event: 'bot.rejected' })
  })

  it('allows a request classified as human', async () => {
    const { logger, events } = createLogger()
    const verification = await checkBotRequest(async () => ({ isBot: false }), logger)

    expect(verification).toEqual({ isBot: false, degraded: false })
    expect(events).toHaveLength(0)
  })

  it('degrades to allowed when the check fails, so a BotID outage cannot take the chat offline', async () => {
    const { logger, events } = createLogger()
    const verification = await checkBotRequest(async () => {
      throw new Error('VERCEL_OIDC_TOKEN is not set')
    }, logger)

    expect(verification).toEqual({ isBot: false, degraded: true })
    expect(events).toContainEqual({ level: 'error', event: 'bot.unavailable' })
  })
})
