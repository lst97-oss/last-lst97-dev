import { type ReactNode, useEffect, useState } from 'react'
import {
  type BrowserCapability,
  type BrowserCapabilityEnvironment,
  inspectBrowserCapabilities,
} from '@/lib/browser-capabilities'

const CAPABILITY_LABELS: Record<BrowserCapability, string> = {
  fetch: 'Fetch API',
  'abort-controller': 'AbortController',
  'response-streams': 'Response streams',
  'text-decoder': 'TextDecoder',
}

interface BrowserCapabilityBoundaryProps {
  feature: string
  requirements: readonly BrowserCapability[]
  children?: ReactNode
  runtime?: BrowserCapabilityEnvironment
}

export function BrowserCapabilityBoundary({
  feature,
  requirements,
  children,
  runtime,
}: BrowserCapabilityBoundaryProps) {
  const [missing, setMissing] = useState<BrowserCapability[] | null>(null)

  useEffect(() => {
    setMissing(inspectBrowserCapabilities(requirements, runtime).missing)
  }, [requirements, runtime])

  if (missing === null || missing.length === 0) return children

  const missingLabels = missing.map((capability) => CAPABILITY_LABELS[capability])

  return (
    <section className="browser-capability-notice" role="alert" aria-live="assertive">
      <p className="browser-capability-notice__eyebrow">BROWSER SUPPORT / REQUIREMENT</p>
      <h2>{feature} requires browser features that are unavailable.</h2>
      <p>
        This feature needs {missingLabels.length === 1 ? 'this capability' : 'these capabilities'}:{' '}
        <strong>{missingLabels.join(', ')}</strong>. Update your browser to use it.
      </p>
    </section>
  )
}
