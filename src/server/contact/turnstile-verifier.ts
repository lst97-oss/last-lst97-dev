import { TURNSTILE_ACTIONS, type TurnstileAction } from '../../lib/turnstile'
import type { TurnstileVerifier } from './types'

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'
const TOKEN_MAX_LENGTH = 2_048
const VERIFY_TIMEOUT_MS = 5_000

interface SiteverifyResponse {
  success: boolean
  hostname?: string
  action?: string
  challenge_ts?: string
  cdata?: string
  'error-codes'?: string[]
}

interface TurnstileVerifierOptions {
  secret: string
  action?: TurnstileAction
  fetcher?: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
}

export function createTurnstileVerifier(options: TurnstileVerifierOptions): TurnstileVerifier {
  const secret = options.secret.trim()
  const action = options.action ?? TURNSTILE_ACTIONS.contact
  if (!secret) {
    throw new Error('Missing required server environment variable: TURNSTILE_SECRET_KEY')
  }

  const fetcher = options.fetcher ?? fetch

  return {
    async verify(token, expectedHostname) {
      const responseToken = token.trim()
      if (!responseToken || responseToken.length > TOKEN_MAX_LENGTH || !expectedHostname.trim()) {
        return false
      }

      let response: Response
      try {
        response = await fetcher(SITEVERIFY_URL, {
          method: 'POST',
          headers: { 'content-type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ secret, response: responseToken }),
          signal: AbortSignal.timeout(VERIFY_TIMEOUT_MS),
        })
      } catch {
        throw new Error('Turnstile verification is unavailable')
      }

      if (!response.ok) {
        throw new Error('Turnstile verification is unavailable')
      }

      let payload: unknown
      try {
        payload = await response.json()
      } catch {
        throw new Error('Turnstile verification is unavailable')
      }
      if (!isSiteverifyResponse(payload)) {
        throw new Error('Turnstile verification is unavailable')
      }

      const result = payload
      return (
        result.success === true &&
        result.action === action &&
        result.hostname?.toLowerCase() === expectedHostname.trim().toLowerCase()
      )
    },
  }
}

function isSiteverifyResponse(value: unknown): value is SiteverifyResponse {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    typeof (value as { success?: unknown }).success === 'boolean'
  )
}
