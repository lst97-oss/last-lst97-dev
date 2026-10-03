export type BrowserCapability = 'fetch' | 'abort-controller' | 'response-streams' | 'text-decoder'

export type BrowserCapabilityEnvironment = Partial<
  Pick<typeof globalThis, 'fetch' | 'AbortController' | 'ReadableStream' | 'TextDecoder'>
>

export const CHAT_BROWSER_REQUIREMENTS = [
  'fetch',
  'abort-controller',
  'response-streams',
  'text-decoder',
] as const satisfies readonly BrowserCapability[]

export const CONTACT_BROWSER_REQUIREMENTS = ['fetch'] as const satisfies readonly BrowserCapability[]

export interface BrowserCapabilityInspection {
  supported: boolean
  missing: BrowserCapability[]
}

export function inspectBrowserCapabilities(
  requirements: readonly BrowserCapability[],
  environment: BrowserCapabilityEnvironment = globalThis,
): BrowserCapabilityInspection {
  const checks: Record<BrowserCapability, boolean> = {
    fetch: typeof environment.fetch === 'function',
    'abort-controller': typeof environment.AbortController === 'function',
    'response-streams':
      typeof environment.ReadableStream === 'function' &&
      typeof environment.ReadableStream.prototype?.getReader === 'function',
    'text-decoder': typeof environment.TextDecoder === 'function',
  }
  const missing = [...new Set(requirements)].filter((requirement) => !checks[requirement])

  return { supported: missing.length === 0, missing }
}
