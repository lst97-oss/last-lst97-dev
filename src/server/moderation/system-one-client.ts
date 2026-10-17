import { z } from 'zod'

const REQUEST_FAILED_MESSAGE = 'System One request failed'
const INVALID_RESPONSE_MESSAGE = 'System One response was invalid'

const DEFAULT_BASE_URL = 'https://api.typesafe.ai'
const DEFAULT_PATH = '/v1/systemone'

export const DEFAULT_SYSTEM_ONE_TIMEOUT_MS = 5_000
/** Total attempts per request on transient failures: the first try plus two retries. */
export const DEFAULT_SYSTEM_ONE_MAX_ATTEMPTS = 3
/** Base delay before a retry, jittered by up to the same amount. */
export const DEFAULT_SYSTEM_ONE_RETRY_DELAY_MS = 250
/** Ceiling for a retry delay, including a provider's `Retry-After`, so one call cannot stall a turn. */
export const MAX_SYSTEM_ONE_RETRY_DELAY_MS = 2_000

/** OpenRouter's Decisions endpoint: the production decision-model route. */
export const OPENROUTER_DECISION_BASE_URL = 'https://openrouter.ai/api'
export const OPENROUTER_DECISION_PATH = '/alpha/decisions'

/** Text, a JSON object or array, or `null`, matching the System One wire contract. */
export type SystemOneEntry = string | object | null

/** A question in the System One wire shape, as accepted by the decision models. */
export interface SystemOneQuestion {
  type: string
  instructions?: unknown
  criteria?: unknown
}

export type SystemOneQuestions = Record<string, SystemOneQuestion>

export interface SystemOneUsage {
  input_tokens: number
  output_tokens: number
  cost?: number
}

/**
 * The parsed envelope of a System One response. `answers` entries stay
 * `unknown` on purpose: each consumer coerces and validates the answers it
 * asked for (`answers.ts`), and the migration benchmark needs to inspect raw
 * answer shapes rather than a normalized view.
 */
export interface SystemOneResult {
  id?: string
  model: string
  provider?: string
  answers: Record<string, unknown>
  usage: SystemOneUsage
}

export type SystemOneErrorCategory = 'request_failed' | 'timeout' | 'invalid_response'

/** A failed System One call. The message is fixed and sanitized; `category` carries the cause. */
export class SystemOneError extends Error {
  readonly category: SystemOneErrorCategory

  constructor(category: SystemOneErrorCategory) {
    super(category === 'invalid_response' ? INVALID_RESPONSE_MESSAGE : REQUEST_FAILED_MESSAGE)
    this.name = 'SystemOneError'
    this.category = category
  }
}

/** A choice question over named labels. Mirrors the wire shape exactly. */
export function choice<const T extends Record<string, SystemOneEntry>>(
  instructions: SystemOneEntry,
  criteria: T,
): SystemOneQuestion {
  if (Array.isArray(criteria)) throw new Error('Choice criteria must be a map of labels to descriptions.')
  return { type: 'choice', instructions, criteria }
}

/** A yes/no question reporting the probability of `true`. */
export function noul(
  instructions: SystemOneEntry = null,
  criteria?: { true: SystemOneEntry; false: SystemOneEntry },
): SystemOneQuestion {
  return { type: 'noul', instructions, criteria }
}

const systemOneResultSchema = z.object({
  id: z.string().optional(),
  model: z.string(),
  provider: z.string().optional(),
  answers: z.record(z.string(), z.unknown()),
  usage: z.object({
    input_tokens: z.number(),
    output_tokens: z.number(),
    cost: z.number().optional(),
  }),
})

export interface SystemOneRequest {
  model: string
  state: SystemOneEntry
  questions: SystemOneQuestions
  /** Provider routing preferences; forwarded verbatim. */
  provider?: unknown
  /** Observability grouping id; forwarded as `session_id`. */
  sessionId?: string
  /** Observability metadata; forwarded as `trace`. */
  trace?: Record<string, unknown>
}

export interface SystemOneClientConfig {
  apiKey: string
  /**
   * API root; defaults to the System One reference endpoint at
   * `https://api.typesafe.ai`. The production decision path passes OpenRouter's
   * Decisions endpoint explicitly, so the default only serves tests and
   * reference callers. Trailing slashes are stripped.
   */
  baseUrl?: string
  /** Endpoint path appended to `baseUrl`; defaults to `/v1/systemone`. */
  path?: string
  /** Per-attempt timeout in milliseconds; defaults to `DEFAULT_SYSTEM_ONE_TIMEOUT_MS`. */
  timeoutMs?: number
  /**
   * Total attempts on transient failures (connection errors, timeouts, 429,
   * and 5xx); defaults to `DEFAULT_SYSTEM_ONE_MAX_ATTEMPTS`. Non-transient
   * failures (other 4xx, invalid responses) are never retried.
   */
  maxAttempts?: number
  /** Base retry delay in milliseconds, jittered by up to the same amount; defaults to 250. */
  retryDelayMs?: number
  /** Delay seam for tests; defaults to a timer. */
  sleep?: (ms: number) => Promise<void>
  fetcher?: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
}

export interface SystemOneClient {
  systemOne(request: SystemOneRequest): Promise<SystemOneResult>
}

function stripTrailingSlashes(value: string): string {
  return value.replace(/\/+$/, '')
}

function isTimeoutError(error: unknown): boolean {
  return error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')
}

/**
 * A fetch-based client for the System One wire protocol. It speaks the System
 * One request and response shapes, which the OpenRouter `/v1/systemone` and
 * `/alpha/decisions` endpoints accept, so one client can serve every
 * decision-model provider.
 *
 * Transient failures (connection errors, timeouts, 429, and 5xx) are retried
 * a bounded number of times with a jittered delay, because the OpenRouter
 * route has a measured bursty request-failure rate that would otherwise
 * surface as `{ unavailable: true }`; the benchmark showed 0.8%-17% depending
 * on surface. Non-transient failures are not retried.
 *
 * Every failure is thrown as a `SystemOneError` with a fixed message; callers
 * fail closed and never surface provider text.
 */
export function createSystemOneClient(config: SystemOneClientConfig): SystemOneClient {
  const apiKey = config.apiKey.trim()
  if (!apiKey) throw new Error('Missing System One API key')

  const timeoutMs = config.timeoutMs ?? DEFAULT_SYSTEM_ONE_TIMEOUT_MS
  if (!Number.isInteger(timeoutMs) || timeoutMs <= 0) throw new Error('System One timeout configuration is invalid')

  const maxAttempts = config.maxAttempts ?? DEFAULT_SYSTEM_ONE_MAX_ATTEMPTS
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 5)
    throw new Error('System One retry configuration is invalid')

  const retryDelayMs = config.retryDelayMs ?? DEFAULT_SYSTEM_ONE_RETRY_DELAY_MS
  if (!Number.isInteger(retryDelayMs) || retryDelayMs < 0) throw new Error('System One retry configuration is invalid')

  const sleep = config.sleep ?? ((delayMs: number) => new Promise<void>((resolve) => setTimeout(resolve, delayMs)))

  const baseUrl = stripTrailingSlashes(config.baseUrl?.trim() || DEFAULT_BASE_URL)
  const path = config.path?.trim() || DEFAULT_PATH
  const endpoint = `${baseUrl}${path}`
  const fetcher = config.fetcher ?? fetch

  type AttemptResult =
    | { ok: true; result: SystemOneResult }
    | { ok: false; error: SystemOneError; retryable: boolean; retryAfterMs?: number }

  const attempt = async (body: string): Promise<AttemptResult> => {
    let response: Response
    try {
      response = await fetcher(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body,
        signal: AbortSignal.timeout(timeoutMs),
      })
    } catch (error) {
      return {
        ok: false,
        error: new SystemOneError(isTimeoutError(error) ? 'timeout' : 'request_failed'),
        retryable: true,
      }
    }

    if (!response.ok) {
      const retryAfterSeconds = Number(response.headers.get('retry-after'))
      const retryAfterMs =
        Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0 ? retryAfterSeconds * 1_000 : undefined
      return {
        ok: false,
        error: new SystemOneError('request_failed'),
        retryable: response.status === 429 || response.status >= 500,
        ...(retryAfterMs === undefined ? {} : { retryAfterMs }),
      }
    }

    let payload: unknown
    try {
      payload = await response.json()
    } catch {
      return { ok: false, error: new SystemOneError('invalid_response'), retryable: false }
    }

    const parsed = systemOneResultSchema.safeParse(payload)
    if (!parsed.success) return { ok: false, error: new SystemOneError('invalid_response'), retryable: false }
    return { ok: true, result: parsed.data }
  }

  return {
    async systemOne(request: SystemOneRequest): Promise<SystemOneResult> {
      const body = JSON.stringify({
        model: request.model,
        state: request.state,
        questions: request.questions,
        ...(request.provider === undefined ? {} : { provider: request.provider }),
        ...(request.sessionId === undefined ? {} : { session_id: request.sessionId }),
        ...(request.trace === undefined ? {} : { trace: request.trace }),
      })

      for (let attemptNumber = 1; ; attemptNumber += 1) {
        const outcome = await attempt(body)
        if (outcome.ok) return outcome.result
        if (!outcome.retryable || attemptNumber >= maxAttempts) throw outcome.error
        const jittered = retryDelayMs + Math.floor(Math.random() * retryDelayMs)
        const delay = Math.min(Math.max(jittered, outcome.retryAfterMs ?? 0), MAX_SYSTEM_ONE_RETRY_DELAY_MS)
        await sleep(delay)
      }
    },
  }
}
