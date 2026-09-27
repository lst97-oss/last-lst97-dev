import { OpenRouter } from '@openrouter/sdk'

import { getServerEnv, requiredServerEnv } from '../env'
import { OPENROUTER_CHAT_REQUEST_OPTIONS } from '../chat/openrouter-retry-policy'
import { createChatContactRefiner } from './chat-contact-refinement'

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('OpenRouter request timed out')), timeoutMs)
    }),
  ]).finally(() => {
    if (timer) clearTimeout(timer)
  })
}

export function createOpenRouterChatContactRefiner() {
  const env = getServerEnv()
  const model = requiredServerEnv('OPENROUTER_MODEL')
  const client = new OpenRouter({
    apiKey: requiredServerEnv('OPENROUTER_API_KEY'),
    httpReferer: env.PUBLIC_SITE_URL,
    appTitle: env.OPENROUTER_APP_TITLE,
  })

  return createChatContactRefiner({
    model,
    async complete(request) {
      const response = await withTimeout(client.chat.send({
        chatRequest: {
          model: request.model,
          messages: request.messages,
          responseFormat: request.responseFormat,
          stream: request.stream,
          maxTokens: request.maxTokens,
          temperature: request.temperature,
          provider: { requireParameters: true },
        },
      }, OPENROUTER_CHAT_REQUEST_OPTIONS), env.OPENROUTER_TIMEOUT_MS)

      if (response instanceof ReadableStream) throw new Error('Unexpected streaming response from OpenRouter')
      return {
        content: response.choices[0]?.message.content,
        ...(response.model ? { model: response.model } : {}),
        ...(response.usage ? { usage: response.usage } : {}),
      }
    },
  })
}
