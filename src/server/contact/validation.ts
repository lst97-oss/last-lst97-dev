import { z } from 'zod'

import type { ContactMessage } from './types'

export const contactSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Enter your name (at least 2 characters).')
    .max(80, 'Keep your name under 80 characters.'),
  email: z.string().trim().email('Enter a valid email address.').max(254, 'Keep your email under 254 characters.'),
  message: z
    .string()
    .trim()
    .min(10, 'Your message needs at least 10 characters.')
    .max(4_000, 'Keep your message under 4,000 characters.'),
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
