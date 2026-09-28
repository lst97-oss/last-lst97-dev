import { z } from 'zod'

export const CHAT_CONTACT_TEMPLATES = {
  email: {
    label: 'Email',
    description: 'Send a message to Nelson.',
    fields: [
      { key: 'name', label: 'Your name', required: false, maxLength: 80, example: 'Alex Chen' },
      { key: 'email', label: 'Reply email', required: true, maxLength: 254, example: 'you@example.com' },
      { key: 'message', label: 'Message', required: true, maxLength: 4_000, multiline: true, example: 'What would you like Nelson to know?' },
    ],
  },
  bug_report: {
    label: 'Bug report',
    description: 'Describe a problem with the site or one of its features.',
    notice: 'Remove secrets and private learner data before submitting. Suspected security issues should be reported privately through the contact page.',
    fields: [
      { key: 'name', label: 'Your name', required: false, maxLength: 80, example: 'Alex Chen' },
      { key: 'email', label: 'Reply email', required: true, maxLength: 254, example: 'you@example.com' },
      { key: 'summary', label: 'Summary', required: true, maxLength: 240, example: 'Project filter does not apply on mobile' },
      { key: 'expectedBehaviour', label: 'Expected behaviour', required: true, maxLength: 2_400, multiline: true, example: 'What should have happened?' },
      { key: 'stepsToReproduce', label: 'Steps to reproduce', required: true, maxLength: 4_000, multiline: true, example: '1. Open the projects page\n2. Choose a filter\n3. Observe the results' },
      { key: 'evidence', label: 'Evidence', required: false, maxLength: 4_000, multiline: true, example: 'Console output or logs with secrets and personal data removed' },
      { key: 'impact', label: 'Impact (optional)', required: false, maxLength: 1_000, multiline: true, example: 'Who is affected and how often?' },
      { key: 'extraContext', label: 'Extra context', required: false, maxLength: 2_400, multiline: true, example: 'Workaround, related issue, or anything else maintainers should know' },
      { key: 'environment', label: 'Environment (optional)', required: false, maxLength: 1_000, example: 'Browser, operating system, or device' },
    ],
  },
  feature_request: {
    label: 'Feature request',
    description: 'Suggest an experience that would solve a problem or learning need.',
    notice: 'Ideas are reviewed for learning value, accessibility, safety, maintenance cost, and roadmap fit. Sending an idea is not a commitment to build it.',
    fields: [
      { key: 'name', label: 'Your name', required: false, maxLength: 80, example: 'Alex Chen' },
      { key: 'email', label: 'Reply email', required: true, maxLength: 254, example: 'you@example.com' },
      { key: 'problem', label: 'Problem / learning need', required: true, maxLength: 2_400, multiline: true, example: 'What problem should this solve?' },
      { key: 'proposedExperience', label: 'Proposed experience', required: true, maxLength: 4_000, multiline: true, example: 'What should someone be able to do?' },
      { key: 'whoBenefits', label: 'Who benefits? (optional)', required: false, maxLength: 1_000, example: 'Who would use this?' },
      { key: 'exampleUseCase', label: 'Example use case (optional)', required: false, maxLength: 2_000, multiline: true, example: 'A concrete scenario or user story' },
      { key: 'acceptanceCriteria', label: 'Acceptance criteria (optional)', required: false, maxLength: 2_400, multiline: true, example: '• A visitor can…\n• The page shows…' },
      { key: 'alternatives', label: 'Alternatives / current workaround (optional)', required: false, maxLength: 2_000, multiline: true, example: 'What do people do today?' },
      { key: 'references', label: 'References (optional)', required: false, maxLength: 2_000, multiline: true, example: 'Mock-up, link, related issue, or discussion' },
    ],
  },
} as const

export type ChatContactTemplate = keyof typeof CHAT_CONTACT_TEMPLATES
export type ChatContactField = typeof CHAT_CONTACT_TEMPLATES[ChatContactTemplate]['fields'][number]['key']
export type ChatContactFieldValues = Partial<Record<ChatContactField, string>>

type CommonContactFields = { name: string; email: string }

export type ChatContactSubmission =
  | { template: 'email'; fields: CommonContactFields & { message: string } }
  | { template: 'bug_report'; fields: CommonContactFields & { summary: string; expectedBehaviour: string; stepsToReproduce: string; evidence: string; impact: string; extraContext: string; environment: string } }
  | { template: 'feature_request'; fields: CommonContactFields & { problem: string; proposedExperience: string; whoBenefits: string; exampleUseCase: string; acceptanceCriteria: string; alternatives: string; references: string } }

export const CHAT_CONTACT_MAX_TOTAL_CHARS = 12_000

type ContactFieldDefinition = (typeof CHAT_CONTACT_TEMPLATES)[ChatContactTemplate]['fields'][number]

function fieldSizeSchema(field: ContactFieldDefinition) {
  return z.string().max(field.maxLength, { error: `Keep this field under ${field.maxLength} characters.` })
}

function draftFieldSchema(field: ContactFieldDefinition) {
  return fieldSizeSchema(field)
    .superRefine((value, context) => {
      if (field.required && !value.trim()) {
        context.addIssue({ code: 'custom', message: 'This field is required.' })
      }

      const trimmedValue = value.trim()
      if (field.key === 'email' && trimmedValue && !z.email().safeParse(trimmedValue).success) {
        context.addIssue({ code: 'custom', message: 'Enter a valid email address.' })
      }
    })
}

function fieldsSchema(template: ChatContactTemplate) {
  const fields = CHAT_CONTACT_TEMPLATES[template].fields
  const shape = Object.fromEntries(fields.map((field) => [
    field.key,
    fieldSizeSchema(field).optional(),
  ])) as z.ZodRawShape

  return z.strictObject(shape)
}

/** The shared client/server schema for one selected contact template. */
export function createChatContactDraftSchema(template: ChatContactTemplate): z.ZodType<unknown, ChatContactFieldValues> {
  const shape = Object.fromEntries(CHAT_CONTACT_TEMPLATES[template].fields.map((field) => [
    field.key,
    draftFieldSchema(field),
  ])) as z.ZodRawShape
  return z.strictObject(shape) as unknown as z.ZodType<unknown, ChatContactFieldValues>
}

export function createChatContactFieldSchema(template: ChatContactTemplate, key: ChatContactField): z.ZodType<unknown, string | undefined> {
  const field = CHAT_CONTACT_TEMPLATES[template].fields.find((candidate) => candidate.key === key)
  if (!field) return z.string().optional() as unknown as z.ZodType<unknown, string | undefined>
  return draftFieldSchema(field).optional() as unknown as z.ZodType<unknown, string | undefined>
}

export function createEmptyChatContactFields(template: ChatContactTemplate): ChatContactFieldValues {
  return Object.fromEntries(CHAT_CONTACT_TEMPLATES[template].fields.map((field) => [field.key, ''])) as ChatContactFieldValues
}

export function parseChatContactFields(template: ChatContactTemplate, input: unknown):
  | { ok: true; fields: ChatContactFieldValues }
  | { ok: false; reason: 'invalid_fields'; invalidFields: ChatContactField[] } {
  if (!Object.hasOwn(CHAT_CONTACT_TEMPLATES, template)) return { ok: false, reason: 'invalid_fields', invalidFields: [] }
  const parsed = fieldsSchema(template).safeParse(input)
  if (!parsed.success) {
    const allowed = new Set(CHAT_CONTACT_TEMPLATES[template].fields.map((field) => field.key))
    const invalidFields = [...new Set(parsed.error.issues.flatMap((issue) => {
      const field = issue.path[0]
      return typeof field === 'string' && allowed.has(field as ChatContactField) ? [field as ChatContactField] : []
    }))]
    return { ok: false, reason: 'invalid_fields', invalidFields }
  }

  const fields = Object.fromEntries(CHAT_CONTACT_TEMPLATES[template].fields.map((field) => [
    field.key,
    (parsed.data as ChatContactFieldValues)[field.key] ?? '',
  ])) as ChatContactFieldValues
  const total = Object.values(fields).reduce((sum, value) => sum + (value?.length ?? 0), 0)
  if (total > CHAT_CONTACT_MAX_TOTAL_CHARS) {
    return { ok: false, reason: 'invalid_fields', invalidFields: CHAT_CONTACT_TEMPLATES[template].fields.map((field) => field.key) }
  }
  return { ok: true, fields }
}

export function validateChatContactDraft(template: ChatContactTemplate, input: unknown):
  | { ok: true; submission: ChatContactSubmission }
  | { ok: false; missingFields: ChatContactField[]; invalidFields: ChatContactField[] } {
  const parsed = parseChatContactFields(template, input)
  if (!parsed.ok) return { ok: false, missingFields: [], invalidFields: parsed.invalidFields }

  const validation = createChatContactDraftSchema(template).safeParse(parsed.fields)
  if (!validation.success) {
    const missingFields: ChatContactField[] = []
    const invalidFields: ChatContactField[] = []
    for (const issue of validation.error.issues) {
      const field = issue.path[0]
      if (typeof field !== 'string') continue
      const contactField = field as ChatContactField
      if (issue.message === 'This field is required.') missingFields.push(contactField)
      else invalidFields.push(contactField)
    }
    return { ok: false, missingFields: [...new Set(missingFields)], invalidFields: [...new Set(invalidFields)] }
  }

  const completeFields = Object.fromEntries(CHAT_CONTACT_TEMPLATES[template].fields.map((field) => [
    field.key,
    (validation.data as ChatContactFieldValues)[field.key] ?? '',
  ]))
  if (typeof completeFields.email === 'string') completeFields.email = completeFields.email.trim()
  return { ok: true, submission: { template, fields: completeFields } as ChatContactSubmission }
}
