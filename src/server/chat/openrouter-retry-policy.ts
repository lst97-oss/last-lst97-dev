export const OPENROUTER_CHAT_REQUEST_OPTIONS = {
  retryCodes: ['429', '5XX'],
  retries: {
    strategy: 'backoff' as const,
    backoff: {
      initialInterval: 1_000,
      maxInterval: 8_000,
      exponent: 2,
      maxElapsedTime: 15_000,
    },
    retryConnectionErrors: true,
  },
}
