import { z } from 'zod'

import type { ContactMessage } from './types'

const contactSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(254),
  message: z.string().trim().min(10).max(4_000),
  website: z.string().trim().max(200).default(''),
})

export type ContactValidation =
  | { ok: true; value: ContactMessage }
  | { ok: true; honeypot: true }
  | { ok: false; issues: string[] }

export function parseContactInput(input: unknown): ContactValidation {
  const result = contactSchema.safeParse(input)
  if (!result.success) {
    return { ok: false, issues: result.error.issues.map((issue) => issue.path.join('.') || 'form') }
  }
  if (result.data.website) {
    return { ok: true, honeypot: true }
  }
  return { ok: true, value: result.data }
}
