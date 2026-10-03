import { z } from 'zod'

/**
 * Closed option sets for quotation fields. Every value here is a label that is
 * also safe to read in the owner email, the review screen, and the original
 * report PDF, because those consumers render the stored string verbatim.
 *
 * `draft`-prefixed sentinels mark "not decided yet" without being a claim:
 * a visitor who has not read the packages page must still be able to submit.
 */
const PACKAGE_OPTIONS = [
  { value: 'Starter — from A$1,000', label: 'Starter — from A$1,000' },
  { value: 'Business — from A$2,200 (recommended)', label: 'Business — from A$2,200 (recommended)' },
  { value: 'Business+ — from A$3,500', label: 'Business+ — from A$3,500' },
  // The support plan is a separate published offering, not a fourth build tier,
  // so it is offered here without touching SERVICE_PACKAGES: it inherits
  // nothing and its entry point is an hourly rate.
  { value: 'Go Support Plan — from A$40/hour', label: 'Go Support Plan — from A$40/hour (existing site or app)' },
  { value: 'draft-not-sure', label: 'Not sure yet' },
] as const

const FEATURE_OPTIONS = [
  { value: 'Contact or enquiry form', label: 'Contact or enquiry form' },
  { value: 'Online booking or scheduling', label: 'Online booking or scheduling' },
  { value: 'Blog or news section', label: 'Blog or news section' },
  { value: 'Member or client login', label: 'Member or client login' },
  { value: 'Payments or online checkout', label: 'Payments or online checkout' },
  { value: 'Search', label: 'Search' },
  { value: 'Multilingual pages', label: 'Multilingual pages' },
  { value: 'Newsletter signup', label: 'Newsletter signup' },
] as const

const CMS_OPTIONS = [
  { value: 'Editable pages with no CMS', label: 'Editable pages, no CMS' },
  { value: 'Standard CMS with a blog', label: 'Standard CMS with a blog' },
  { value: 'Advanced CMS with custom content types', label: 'Advanced CMS with custom content types' },
  { value: 'draft-unsure', label: 'Not sure yet' },
] as const

const CONTENT_OPTIONS = [
  { value: 'Copy and images are ready', label: 'Copy and images are ready' },
  { value: 'Copy is ready, images are not', label: 'Copy is ready, images are not' },
  { value: 'Partial content available', label: 'Partial content available' },
  { value: 'No content yet', label: 'No content yet' },
  { value: 'draft-unsure', label: 'Not sure yet' },
] as const

const TIMELINE_OPTIONS = [
  { value: 'As soon as possible', label: 'As soon as possible' },
  { value: 'Within one month', label: 'Within one month' },
  { value: 'One to three months', label: 'One to three months' },
  { value: 'Three to six months', label: 'Three to six months' },
  { value: 'Flexible — planning ahead', label: 'Flexible, planning ahead' },
] as const

/*
 * Support-plan option sets. Prices are duplicated from the published /services
 * copy in src/lib/services/packages.ts on purpose: that module owns the public
 * page and its JSON-LD, and its `price` is a display label that must never be
 * parsed back into a number. PACKAGE_OPTIONS above already carries the same
 * duplicated figures, and a mismatch between the two is caught by
 * tests/server/services-corpus.test.ts rather than by a shared parser.
 */
/**
 * Every support engagement is reachable as a checkbox rather than a single
 * select, because support work is rarely one thing: a visitor is often fixing a
 * bug AND moving the site to a new host, and a select would force them to
 * choose one and drop the other from the request.
 *
 * The stored values carry no price. Every item here is billed at the same
 * standard rate, so repeating it on eight rows would be noise that trains the
 * reader to stop reading the option text; the rate is stated once in the field
 * label and the published list travels with the email instead.
 *
 * The Technical Consultation is deliberately absent. It is the A$40/hour base
 * that every engagement starts from rather than one of the standard-rate
 * items, so offering it as a peer would double-bill it. `supportConsultation`
 * is pre-selected and required instead, which is why it is a field of its own.
 */
const SUPPORT_ENGAGEMENT_OPTIONS = [
  { value: 'Production Readiness Review', label: 'Production Readiness Review' },
  { value: 'Deployment / Deployment Fix', label: 'Deployment / Deployment Fix' },
  { value: 'Bug Fix', label: 'Bug Fix' },
  { value: 'Domain / DNS / Hosting Setup', label: 'Domain / DNS / Hosting Setup' },
  { value: 'Small Feature Implementation', label: 'Small Feature Implementation' },
  { value: 'CMS / API Integration', label: 'CMS / API Integration' },
  { value: 'Database / Backend Support', label: 'Database / Backend Support' },
  { value: 'Migration / Major Refactor', label: 'Migration / Major Refactor' },
] as const

/**
 * Every support engagement begins with the hourly consultation, so it is
 * required rather than selectable. The stored value is the engagement name so
 * the operator reads a complete sentence in the email, and the rate is stated
 * once on the label and in the email's published price list.
 */
const SUPPORT_CONSULTATION_DEFAULT = 'Technical Consultation'

const SUPPORT_PLATFORM_OPTIONS = [
  { value: 'Next.js / React', label: 'Next.js / React' },
  { value: 'Astro', label: 'Astro' },
  { value: 'Svelte / SvelteKit', label: 'Svelte / SvelteKit' },
  { value: 'Nuxt / Vue', label: 'Nuxt / Vue' },
  { value: 'WordPress', label: 'WordPress' },
  { value: 'Shopify', label: 'Shopify' },
  { value: 'Laravel / PHP', label: 'Laravel / PHP' },
  { value: 'Ruby on Rails', label: 'Ruby on Rails' },
  { value: 'Python / Django / Flask', label: 'Python / Django / Flask' },
  { value: 'Plain HTML, CSS, and JavaScript', label: 'Plain HTML, CSS, and JavaScript' },
  { value: 'Not sure yet', label: 'Not sure yet' },
] as const

const SUPPORT_URGENCY_OPTIONS = [
  { value: 'Site is down or unusable', label: 'Site is down or unusable' },
  { value: 'Broken before launch', label: 'Broken before launch' },
  { value: 'Live but needs fixing', label: 'Live but needs fixing' },
  { value: 'Planned improvement', label: 'Planned improvement' },
  { value: 'Not sure yet', label: 'Not sure yet' },
] as const

/** The empty selection a checkbox group starts and clears back to. */
const CHECKBOX_EMPTY_VALUE = 'draft-none-selected'

export const CHAT_CONTACT_TEMPLATES = {
  email: {
    label: 'Email',
    description: 'Send a message to Nelson.',
    fields: [
      { key: 'name', label: 'Your name', required: false, maxLength: 80, example: 'Alex Chen' },
      { key: 'email', label: 'Reply email', required: true, maxLength: 254, example: 'you@example.com' },
      {
        key: 'message',
        label: 'Message',
        required: true,
        maxLength: 4_000,
        multiline: true,
        example: 'What would you like Nelson to know?',
      },
    ],
  },
  bug_report: {
    label: 'Bug report',
    description: 'Describe a problem with the site or one of its features.',
    notice:
      'Remove secrets and private learner data before submitting. Suspected security issues should be reported privately through the contact page.',
    fields: [
      { key: 'name', label: 'Your name', required: false, maxLength: 80, example: 'Alex Chen' },
      { key: 'email', label: 'Reply email', required: true, maxLength: 254, example: 'you@example.com' },
      {
        key: 'summary',
        label: 'Summary',
        required: true,
        maxLength: 240,
        example: 'Project filter does not apply on mobile',
      },
      {
        key: 'expectedBehaviour',
        label: 'Expected behaviour',
        required: true,
        maxLength: 2_400,
        multiline: true,
        example: 'What should have happened?',
      },
      {
        key: 'stepsToReproduce',
        label: 'Steps to reproduce',
        required: true,
        maxLength: 4_000,
        multiline: true,
        example: '1. Open the projects page\n2. Choose a filter\n3. Observe the results',
      },
      {
        key: 'evidence',
        label: 'Evidence',
        required: false,
        maxLength: 4_000,
        multiline: true,
        example: 'Console output or logs with secrets and personal data removed',
      },
      {
        key: 'impact',
        label: 'Impact (optional)',
        required: false,
        maxLength: 1_000,
        multiline: true,
        example: 'Who is affected and how often?',
      },
      {
        key: 'extraContext',
        label: 'Extra context',
        required: false,
        maxLength: 2_400,
        multiline: true,
        example: 'Workaround, related issue, or anything else maintainers should know',
      },
      {
        key: 'environment',
        label: 'Environment (optional)',
        required: false,
        maxLength: 1_000,
        example: 'Browser, operating system, or device',
      },
    ],
  },
  feature_request: {
    label: 'Feature request',
    description: 'Suggest an experience that would solve a problem or learning need.',
    notice:
      'Ideas are reviewed for learning value, accessibility, safety, maintenance cost, and roadmap fit. Sending an idea is not a commitment to build it.',
    fields: [
      { key: 'name', label: 'Your name', required: false, maxLength: 80, example: 'Alex Chen' },
      { key: 'email', label: 'Reply email', required: true, maxLength: 254, example: 'you@example.com' },
      {
        key: 'problem',
        label: 'Problem / learning need',
        required: true,
        maxLength: 2_400,
        multiline: true,
        example: 'What problem should this solve?',
      },
      {
        key: 'proposedExperience',
        label: 'Proposed experience',
        required: true,
        maxLength: 4_000,
        multiline: true,
        example: 'What should someone be able to do?',
      },
      {
        key: 'whoBenefits',
        label: 'Who benefits? (optional)',
        required: false,
        maxLength: 1_000,
        example: 'Who would use this?',
      },
      {
        key: 'exampleUseCase',
        label: 'Example use case (optional)',
        required: false,
        maxLength: 2_000,
        multiline: true,
        example: 'A concrete scenario or user story',
      },
      {
        key: 'acceptanceCriteria',
        label: 'Acceptance criteria (optional)',
        required: false,
        maxLength: 2_400,
        multiline: true,
        example: '• A visitor can…\n• The page shows…',
      },
      {
        key: 'alternatives',
        label: 'Alternatives / current workaround (optional)',
        required: false,
        maxLength: 2_000,
        multiline: true,
        example: 'What do people do today?',
      },
      {
        key: 'references',
        label: 'References (optional)',
        required: false,
        maxLength: 2_000,
        multiline: true,
        example: 'Mock-up, link, related issue, or discussion',
      },
    ],
  },
  quotation: {
    label: 'Quotation',
    description: 'Request a fixed-price scope for a website project.',
    notice:
      'Pricing starts at the published package rates and is confirmed after discovery. Final pricing depends on the agreed scope, page count, integrations, and content requirements.',
    fields: [
      { key: 'name', label: 'Your name', required: false, maxLength: 80, example: 'Alex Chen' },
      { key: 'email', label: 'Reply email', required: true, maxLength: 254, example: 'you@example.com' },
      {
        key: 'businessName',
        label: 'Business or project name',
        required: true,
        maxLength: 160,
        example: 'Bright Lane Bakery',
      },
      {
        key: 'packageInterest',
        label: 'Package of interest (optional)',
        required: false,
        maxLength: 80,
        example: 'Not sure yet is fine — the tier is confirmed after discovery.',
        control: 'select',
        options: PACKAGE_OPTIONS,
      },
      {
        key: 'existingWebsite',
        label: 'Existing website (optional)',
        required: false,
        maxLength: 200,
        multiline: true,
        example: 'https://example.com, or none',
      },
      {
        key: 'requiredPages',
        label: 'Required pages',
        required: true,
        maxLength: 1_000,
        multiline: true,
        example: 'Home, About, Services, Contact, plus a booking page',
      },
      {
        key: 'requiredFeatures',
        label: 'Required functionality (optional)',
        required: false,
        maxLength: 400,
        example: 'Tick everything that applies; the first release usually needs only two or three.',
        control: 'checkboxes',
        options: FEATURE_OPTIONS,
      },
      {
        key: 'otherFeatures',
        label: 'Anything else the first release needs',
        required: false,
        maxLength: 1_000,
        multiline: true,
        example: 'Members-only pricing, an availability calendar, bilingual pages',
      },
      {
        key: 'cmsRequirements',
        label: 'CMS requirements (optional)',
        required: false,
        maxLength: 120,
        example: 'Pick the closest match — it can change during discovery.',
        control: 'select',
        options: CMS_OPTIONS,
      },
      {
        key: 'designReferences',
        label: 'Design references (optional)',
        required: false,
        maxLength: 1_000,
        multiline: true,
        example: 'Sites or brands whose look you like',
      },
      {
        key: 'integrations',
        label: 'Required integrations (optional)',
        required: false,
        maxLength: 1_000,
        multiline: true,
        example: 'Stripe, Google Calendar, an existing CRM',
      },
      {
        key: 'contentAvailability',
        label: 'Content availability (optional)',
        required: false,
        maxLength: 120,
        example: 'Be honest here — content writing is quoted separately.',
        control: 'select',
        options: CONTENT_OPTIONS,
      },
      {
        key: 'targetTimeline',
        label: 'Target launch timeframe',
        required: true,
        maxLength: 60,
        example: 'Pick the closest range; a fixed launch date is not promised.',
        control: 'select',
        options: TIMELINE_OPTIONS,
      },
    ],
  },
  support_plan: {
    label: 'Support plan',
    description: 'Request help with a site or app that already exists.',
    notice:
      'Support engagements are billed separately from website packages. Every price below is a starting point, and work found to be outside standard scope is quoted before it begins.',
    fields: [
      { key: 'name', label: 'Your name', required: false, maxLength: 80, example: 'Alex Chen' },
      { key: 'email', label: 'Reply email', required: true, maxLength: 254, example: 'you@example.com' },
      {
        key: 'projectName',
        label: 'Project or site name',
        required: true,
        maxLength: 160,
        example: 'Bright Lane Bakery site',
      },
      {
        key: 'existingProject',
        label: 'Existing site, repository, or app',
        required: true,
        maxLength: 500,
        example: 'https://example.com or a GitHub repository link',
      },
      {
        key: 'supportNeeded',
        label: 'What needs attention',
        required: true,
        maxLength: 2_400,
        multiline: true,
        example: 'What is broken, missing, or not working yet?',
      },
      {
        key: 'supportConsultation',
        label: 'Technical consultation (from A$40 / hour)',
        required: true,
        maxLength: 120,
        // Not a control: the consultation is the base every engagement starts
        // from, so there is nothing to pick and no way to opt out of it. It is a
        // field only so the stored submission carries the figure the operator
        // reads, and so `validateChatContactDraft` can require it.
        defaultValue: SUPPORT_CONSULTATION_DEFAULT,
        example: 'Included as the starting point for every support engagement',
      },
      {
        key: 'engagementType',
        label: 'Support engagements needed (from A$100 each)',
        required: false,
        maxLength: 400,
        control: 'checkboxes',
        options: SUPPORT_ENGAGEMENT_OPTIONS,
        example: 'Tick everything that applies — most requests need more than one',
      },
      {
        key: 'platform',
        label: 'Platform or stack (optional)',
        required: false,
        maxLength: 120,
        control: 'select',
        options: SUPPORT_PLATFORM_OPTIONS,
        example: 'The main framework, CMS, or platform the project uses',
      },
      {
        key: 'urgency',
        label: 'Urgency (optional)',
        required: false,
        maxLength: 120,
        control: 'select',
        options: SUPPORT_URGENCY_OPTIONS,
        example: 'How soon this is needed',
      },
      {
        key: 'accessAndBudget',
        label: 'Access and budget notes (optional)',
        required: false,
        maxLength: 2_000,
        multiline: true,
        example: 'How you can grant repository, hosting, or CMS access, and any budget range',
      },
      {
        key: 'extraContext',
        label: 'Anything else (optional)',
        required: false,
        maxLength: 2_400,
        multiline: true,
        example: 'Deadlines, third-party services involved, or work already attempted',
      },
    ],
  },
} as const

export type ChatContactTemplate = keyof typeof CHAT_CONTACT_TEMPLATES
export type ChatContactField = (typeof CHAT_CONTACT_TEMPLATES)[ChatContactTemplate]['fields'][number]['key']
export type ChatContactFieldValues = Partial<Record<ChatContactField, string>>

type CommonContactFields = { name: string; email: string }

export type ChatContactSubmission =
  | { template: 'email'; fields: CommonContactFields & { message: string } }
  | {
      template: 'bug_report'
      fields: CommonContactFields & {
        summary: string
        expectedBehaviour: string
        stepsToReproduce: string
        evidence: string
        impact: string
        extraContext: string
        environment: string
      }
    }
  | {
      template: 'feature_request'
      fields: CommonContactFields & {
        problem: string
        proposedExperience: string
        whoBenefits: string
        exampleUseCase: string
        acceptanceCriteria: string
        alternatives: string
        references: string
      }
    }
  | {
      template: 'quotation'
      fields: CommonContactFields & {
        businessName: string
        packageInterest: string
        existingWebsite: string
        requiredPages: string
        requiredFeatures: string
        otherFeatures: string
        cmsRequirements: string
        designReferences: string
        integrations: string
        contentAvailability: string
        targetTimeline: string
      }
    }
  | {
      template: 'support_plan'
      fields: CommonContactFields & {
        projectName: string
        existingProject: string
        supportNeeded: string
        supportConsultation: string
        engagementType: string
        platform: string
        urgency: string
        accessAndBudget: string
        extraContext: string
      }
    }

export const CHAT_CONTACT_MAX_TOTAL_CHARS = 12_000

type ContactFieldDefinition = (typeof CHAT_CONTACT_TEMPLATES)[ChatContactTemplate]['fields'][number]

/** A field definition that renders a closed set of choices instead of free text. */
export type ChatContactChoiceField = Extract<ContactFieldDefinition, { control: 'select' | 'checkboxes' }>

export function isChatContactChoiceField(field: ContactFieldDefinition): field is ChatContactChoiceField {
  return 'control' in field && (field.control === 'select' || field.control === 'checkboxes')
}

/** The stored string for an unchecked checkbox group, so a blank selection is still a string. */
export const CHAT_CONTACT_EMPTY_CHOICE = CHECKBOX_EMPTY_VALUE

/**
 * Every stored value a choice field accepts: each option, plus the empty
 * sentinel. Validating against this is what stops a hand-crafted `submit_form`
 * from putting arbitrary text into a field the operator reads as a fixed answer.
 */
function allowedChoiceValues(field: ChatContactChoiceField): ReadonlySet<string> {
  const values = new Set<string>(['', CHECKBOX_EMPTY_VALUE])
  for (const option of field.options) values.add(option.value)
  return values
}

/** Join checkbox selections in the order the options are declared, never the click order. */
export function serializeChatContactChoices(field: ChatContactChoiceField, selected: Iterable<string>): string {
  const chosen = new Set(selected)
  const picked = field.options.filter((option) => chosen.has(option.value)).map((option) => option.value)
  return picked.length > 0 ? picked.join(', ') : CHECKBOX_EMPTY_VALUE
}

/**
 * The choices a stored value represents. A checkbox group may hold several, so
 * the separator is a comma; a select holds at most one.
 */
export function parseChatContactChoices(field: ChatContactChoiceField, value: string): string[] {
  if (!value.trim() || value === CHECKBOX_EMPTY_VALUE) return []
  const allowed = allowedChoiceValues(field)
  return value
    .split(',')
    .map((part) => part.trim())
    .filter((part) => allowed.has(part))
}

function fieldSizeSchema(field: ContactFieldDefinition) {
  const size = z.string().max(field.maxLength, { error: `Keep this field under ${field.maxLength} characters.` })
  if (!isChatContactChoiceField(field)) return size
  const allowed = allowedChoiceValues(field)
  return size.refine((value) => parseChatContactChoices(field, value).length > 0 || allowed.has(value), {
    error: 'Choose one of the listed options.',
  })
}

function draftFieldSchema(field: ContactFieldDefinition) {
  return fieldSizeSchema(field).superRefine((value, context) => {
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
  const shape = Object.fromEntries(
    fields.map((field) => [field.key, fieldSizeSchema(field).optional()]),
  ) as z.ZodRawShape

  return z.strictObject(shape)
}

/** The shared client/server schema for one selected contact template. */
export function createChatContactDraftSchema(
  template: ChatContactTemplate,
): z.ZodType<unknown, ChatContactFieldValues> {
  const shape = Object.fromEntries(
    CHAT_CONTACT_TEMPLATES[template].fields.map((field) => [field.key, draftFieldSchema(field)]),
  ) as z.ZodRawShape
  return z.strictObject(shape) as unknown as z.ZodType<unknown, ChatContactFieldValues>
}

export function createChatContactFieldSchema(
  template: ChatContactTemplate,
  key: ChatContactField,
): z.ZodType<unknown, string | undefined> {
  const field = CHAT_CONTACT_TEMPLATES[template].fields.find((candidate) => candidate.key === key)
  if (!field) return z.string().optional() as unknown as z.ZodType<unknown, string | undefined>
  return draftFieldSchema(field).optional() as unknown as z.ZodType<unknown, string | undefined>
}

export function createEmptyChatContactFields(template: ChatContactTemplate): ChatContactFieldValues {
  return Object.fromEntries(
    // A field that carries a `defaultValue` is pre-filled rather than blank:
    // the support consultation is compulsory, and an empty required box would
    // block submission with nothing for the visitor to do about it.
    // `'defaultValue' in field` rather than a plain property read: the field
    // union only carries the key on the definitions that declare it, exactly
    // as the form does for `multiline`.
    CHAT_CONTACT_TEMPLATES[template].fields.map((field) => [
      field.key,
      'defaultValue' in field ? field.defaultValue : '',
    ]),
  ) as ChatContactFieldValues
}

export function parseChatContactFields(
  template: ChatContactTemplate,
  input: unknown,
):
  | { ok: true; fields: ChatContactFieldValues }
  | { ok: false; reason: 'invalid_fields'; invalidFields: ChatContactField[] } {
  if (!Object.hasOwn(CHAT_CONTACT_TEMPLATES, template))
    return { ok: false, reason: 'invalid_fields', invalidFields: [] }
  const parsed = fieldsSchema(template).safeParse(input)
  if (!parsed.success) {
    const allowed = new Set(CHAT_CONTACT_TEMPLATES[template].fields.map((field) => field.key))
    const invalidFields = [
      ...new Set(
        parsed.error.issues.flatMap((issue) => {
          const field = issue.path[0]
          return typeof field === 'string' && allowed.has(field as ChatContactField) ? [field as ChatContactField] : []
        }),
      ),
    ]
    return { ok: false, reason: 'invalid_fields', invalidFields }
  }

  const fields = Object.fromEntries(
    CHAT_CONTACT_TEMPLATES[template].fields.map((field) => [
      field.key,
      (parsed.data as ChatContactFieldValues)[field.key] ?? '',
    ]),
  ) as ChatContactFieldValues
  const total = Object.values(fields).reduce((sum, value) => sum + (value?.length ?? 0), 0)
  if (total > CHAT_CONTACT_MAX_TOTAL_CHARS) {
    return {
      ok: false,
      reason: 'invalid_fields',
      invalidFields: CHAT_CONTACT_TEMPLATES[template].fields.map((field) => field.key),
    }
  }
  return { ok: true, fields }
}

export function validateChatContactDraft(
  template: ChatContactTemplate,
  input: unknown,
):
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

  const completeFields = Object.fromEntries(
    CHAT_CONTACT_TEMPLATES[template].fields.map((field) => [
      field.key,
      (validation.data as ChatContactFieldValues)[field.key] ?? '',
    ]),
  )
  if (typeof completeFields.email === 'string') completeFields.email = completeFields.email.trim()
  return { ok: true, submission: { template, fields: completeFields } as ChatContactSubmission }
}
