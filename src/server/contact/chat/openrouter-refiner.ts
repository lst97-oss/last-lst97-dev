import { type HTTPClient, OpenRouter } from '@openrouter/sdk'
import { OPENROUTER_CHAT_REQUEST_OPTIONS } from '../../chat/openrouter-retry-policy'
import { getServerEnv, requiredServerEnv } from '../../env'
import { type ChatContactRefinementRequest, createChatContactRefiner } from './refinement'

export type OpenRouterHttpClient = HTTPClient

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('OpenRouter request timed out')), timeoutMs)
    }),
  ]).finally(() => {
    clearTimeout(timer)
  })
}

/**
 * The HTTP status of an OpenRouter SDK rejection, however deeply it was
 * wrapped. The SDK nests the original error under `cause`, so a single read of
 * the top-level object misses it.
 */
function statusOf(error: unknown): number | undefined {
  let current: unknown = error
  for (let depth = 0; depth < 5; depth += 1) {
    if (typeof current !== 'object' || current === null) return undefined
    if ('statusCode' in current && typeof current.statusCode === 'number') return current.statusCode
    if ('status' in current && typeof current.status === 'number') return current.status
    current = 'cause' in current ? current.cause : undefined
  }
  return undefined
}

export interface ChatContactRefinerOverrides {
  /**
   * The SDK's HTTP transport. Injected in tests because the SDK bypasses
   * `globalThis.fetch`: a stub installed there records zero requests, so every
   * assertion would pass vacuously while proving nothing.
   */
  httpClient?: OpenRouterHttpClient
}

export function createOpenRouterChatContactRefiner(overrides?: ChatContactRefinerOverrides) {
  const env = getServerEnv()
  const model = requiredServerEnv('OPENROUTER_MODEL')
  const client = new OpenRouter({
    apiKey: requiredServerEnv('OPENROUTER_API_KEY'),
    httpReferer: env.PUBLIC_SITE_URL,
    appTitle: env.OPENROUTER_APP_TITLE,
    ...(overrides?.httpClient ? { httpClient: overrides.httpClient } : {}),
  })

  /**
   * Sends one refinement request.
   *
   * `responseFormat: json_object` is not universally supported: a provider that
   * does not implement structured output rejects it with 400, and combined with
   * `requireParameters` the routing layer reports 404 because no endpoint
   * satisfies every requested parameter. Both mean "this model cannot do JSON
   * mode", not "the request was wrong", so the same payload is retried once
   * without it. The system prompt already demands a bare JSON object and the
   * response parser is strict, so an unsupported model still cannot corrupt a
   * submission — it can only return prose, which is rejected.
   */
  async function send(chatRequest: Record<string, unknown>) {
    const response = await withTimeout(
      client.chat.send({ chatRequest } as never, OPENROUTER_CHAT_REQUEST_OPTIONS),
      env.OPENROUTER_TIMEOUT_MS,
    )

    if (response instanceof ReadableStream) throw new Error('Unexpected streaming response from OpenRouter')
    return {
      content: response.choices[0]?.message.content,
      ...(response.model ? { model: response.model } : {}),
      ...(response.usage ? { usage: response.usage } : {}),
    }
  }

  return createChatContactRefiner({
    model,
    async complete(request: ChatContactRefinementRequest) {
      const chatRequest: Record<string, unknown> = {
        model: request.model,
        messages: request.messages,
        responseFormat: request.responseFormat,
        stream: request.stream,
        maxTokens: request.maxTokens,
        temperature: request.temperature,
        provider: { requireParameters: true },
      }

      try {
        return await send(chatRequest)
      } catch (error) {
        const status = statusOf(error)
        if (status !== 400 && status !== 404) throw error
        // Retried with `requireParameters` dropped too: it is what turns a
        // model-level 400 into a routing 404, and leaving it in place would
        // fail the retry for the same reason as the first attempt.
        const { provider: _provider, ...withoutProvider } = chatRequest
        const { responseFormat: _responseFormat, ...withoutJsonMode } = withoutProvider
        return send(withoutJsonMode)
      }
    },
  })
}
