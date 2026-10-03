import { describe, expect, test } from 'bun:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import { ChatContactPanel } from '../src/components/site/chat/chat-contact-panel'
import type { ChatContactWorkflowViewModel } from '../src/components/site/chat/chat-types'
import { ChatContactFormPhase } from '../src/components/site/chat/contact/form-phase'
import { ChatContactReviewPhase } from '../src/components/site/chat/contact/review-phase'
import {
  ChatContactConfirmationPhase,
  ChatContactTemplateSelectionPhase,
} from '../src/components/site/chat/contact/start-phases'
import { CHAT_CONTACT_TEMPLATES, createEmptyChatContactFields, isChatContactChoiceField } from '../src/lib/chat-contact'

describe('chat contact phases', () => {
  test('requires a context token before starting or declining contact mode', () => {
    const markup = renderToStaticMarkup(
      createElement(ChatContactConfirmationPhase, {
        pending: false,
        hasContextToken: false,
        onStart: () => undefined,
        onDecline: () => undefined,
      }),
    )

    expect(markup).toContain('Starting clears the current conversation.')
    expect(markup).toContain('START CONTACT SESSION')
    expect(markup).toContain('KEEP CHATTING')
    expect(markup.match(/disabled=""/g)).toHaveLength(2)
  })

  test('uses the section element role without a redundant explicit region role', () => {
    const noop = () => undefined
    const workflow: ChatContactWorkflowViewModel = {
      state: { phase: 'confirmation' },
      draft: {},
      fieldErrors: { missingFields: [], invalidFields: [] },
      review: null,
      turnstileToken: null,
      turnstileResetCount: 0,
      screeningTurnstileToken: null,
      screeningTurnstileResetCount: 0,
      discardConfirmation: false,
      hasContextToken: true,
      actions: {
        clearFieldError: noop,
        submitForm: noop,
        startContact: noop,
        declineContact: noop,
        chooseTemplate: noop,
        editReview: noop,
        confirmSend: noop,
        discard: noop,
        startBlankChat: noop,
        setTurnstileToken: noop,
        setScreeningTurnstileToken: noop,
        setDiscardConfirmation: noop,
      },
    }
    const markup = renderToStaticMarkup(createElement(ChatContactPanel, { workflow, pending: false }))

    expect(markup).toContain('aria-labelledby="chat-contact-panel-title"')
    expect(markup).not.toContain('role="region"')
  })

  test('offers every contact template, including the quotation request', () => {
    const markup = renderToStaticMarkup(
      createElement(ChatContactTemplateSelectionPhase, {
        pending: false,
        hasContextToken: true,
        onChoose: () => undefined,
      }),
    )

    for (const template of Object.keys(CHAT_CONTACT_TEMPLATES)) {
      expect(markup).toContain(CHAT_CONTACT_TEMPLATES[template as keyof typeof CHAT_CONTACT_TEMPLATES].label)
    }
    // The grid is two columns, so an odd number of templates would render an
    // orphan card. The count is the thing that would silently look wrong.
    expect(markup.match(/os-chat-contact-template"/g)).toHaveLength(Object.keys(CHAT_CONTACT_TEMPLATES).length)
  })

  test('renders the quotation fields from the shared template definition', () => {
    const configuration = CHAT_CONTACT_TEMPLATES.quotation
    const markup = renderToStaticMarkup(
      createElement(ChatContactFormPhase, {
        template: 'quotation',
        initialValues: createEmptyChatContactFields('quotation'),
        serverErrors: { missingFields: [], invalidFields: [] },
        pending: false,
        canSubmit: false,
        siteKey: 'test-site-key',
        turnstileToken: 'screening-token',
        turnstileResetCount: 0,
        onSetTurnstileToken: () => undefined,
        onFieldChange: () => undefined,
        onSubmit: () => undefined,
      }),
    )

    for (const field of configuration.fields) {
      expect(markup).toContain(`Example: ${field.example}`)
      if (isChatContactChoiceField(field)) {
        // A choice field is not a text control. A select is a button carrying
        // the field id; a checkbox group is a labelled group of per-option ids,
        // so it has no single element id to assert on.
        if (field.control === 'select') {
          expect(markup).toContain(`id="chat-contact-${field.key}"`)
          expect(markup).toContain('os-chat-contact-select')
        } else {
          expect(markup).toContain('role="group"')
          expect(markup).toContain(`id="${field.key}-0"`)
          expect(markup).toContain('os-chat-contact-choices')
          // Checkbox labels are inline, so they survive SSR. Select options are
          // portalled and only exist once the list opens.
          for (const option of field.options) expect(markup).toContain(option.label)
        }
        continue
      }
      expect(markup).toContain(`id="chat-contact-${field.key}"`)
      // Element-scoped, not "somewhere after": a greedy match would find the
      // textarea of a LATER field and pass for a single-line one.
      const element = new RegExp(`<(textarea|input)[^>]*id="chat-contact-${field.key}"`)
      const tag = markup.match(element)?.[1]
      expect(tag).toBe('multiline' in field && field.multiline ? 'textarea' : 'input')
    }
    expect(markup).toContain('id="chat-contact-email"')
    expect(markup).toContain('type="email"')
    // The select replaces a typed price with a published option, so the hint
    // tells the visitor "not sure" is a valid answer instead of quoting a price.
    expect(markup).toContain('Example: Not sure yet is fine — the tier is confirmed after discovery.')
    expect(markup).toContain(configuration.notice)
  })

  test('renders the support plan fields, its checkbox group, and its per-field counters', () => {
    const configuration = CHAT_CONTACT_TEMPLATES.support_plan
    const markup = renderToStaticMarkup(
      createElement(ChatContactFormPhase, {
        template: 'support_plan',
        initialValues: createEmptyChatContactFields('support_plan'),
        serverErrors: { missingFields: [], invalidFields: [] },
        pending: false,
        canSubmit: false,
        siteKey: 'test-site-key',
        turnstileToken: 'screening-token',
        turnstileResetCount: 0,
        onSetTurnstileToken: () => undefined,
        onFieldChange: () => undefined,
        onSubmit: () => undefined,
      }),
    )

    for (const field of configuration.fields) {
      expect(markup).toContain(`Example: ${field.example}`)
    }
    // Typed and select controls carry the field id directly.
    for (const key of ['name', 'email', 'projectName', 'existingProject', 'platform', 'urgency']) {
      expect(markup).toContain(`id="chat-contact-${key}"`)
    }
    expect(markup).toMatch(/<textarea[^>]*id="chat-contact-supportNeeded"/)
    expect(markup).toMatch(/<textarea[^>]*id="chat-contact-accessAndBudget"/)

    // The engagements are a checkbox group, so there is no single element id:
    // each option is its own labelled checkbox inside a described group.
    expect(markup).not.toContain('id="chat-contact-engagementType"')
    const engagements = configuration.fields.find((field) => field.key === 'engagementType' && 'options' in field)
    const options = engagements && 'options' in engagements ? engagements.options : []
    expect(options.length).toBeGreaterThan(1)
    for (const [index, option] of options.entries()) {
      expect(markup).toContain(`id="engagementType-${index}"`)
      expect(markup).toContain(option.label)
    }
    expect(markup).toContain('chat-contact-engagementType-example')
    // The consultation is not one of the options: it is the base every
    // engagement starts from, so offering it as a peer would double-bill it.
    expect(options.map((option) => option.value)).not.toContain('Technical Consultation')
    // A checkbox group has no single control for a <label htmlFor>, so the
    // field label carries the id the group names itself with. Without it the
    // whole group announces as unlabelled checkboxes.
    expect(markup).toContain('aria-labelledby="engagementType-label"')
    expect(markup).toContain('id="engagementType-label"')
    expect(markup).toContain('Support engagements needed (from A$100 each)')
    // The consultation is fixed: shown so the visitor can see what is included,
    // but read-only, so it cannot be erased into a value the server rejects.
    expect(markup).toContain('Technical consultation (from A$40 / hour)')
    expect(markup).toMatch(/<input[^>]*id="chat-contact-supportConsultation"[^>]*value="Technical Consultation"/)
    // React's SSR emits the camelCase attribute name, so assert what the
    // renderer actually produces rather than the lowercase DOM spelling.
    expect(markup).toMatch(/<input[^>]*id="chat-contact-supportConsultation"[^>]*readOnly/)
    expect(markup).not.toMatch(/<input[^>]*id="chat-contact-supportConsultation"[^>]*disabled/)
    // Readonly, not disabled: a disabled control drops out of the submitted
    // values and the server would then reject the required consultation.

    // A count exists only where a visitor can type.
    expect(markup).toContain('id="chat-contact-supportNeeded-count"')
    expect(markup).toContain('0 / 2,400')
    for (const key of ['engagementType', 'platform', 'urgency', 'supportConsultation']) {
      expect(markup).not.toContain(`id="chat-contact-${key}-count"`)
    }
    // Support is a separate offering from a build, so the form says so.
    expect(markup).toContain(configuration.notice as string)
  })

  test('shows a character count under every textarea and no count under single-line fields', () => {
    const markup = renderToStaticMarkup(
      createElement(ChatContactFormPhase, {
        template: 'bug_report',
        initialValues: createEmptyChatContactFields('bug_report'),
        serverErrors: { missingFields: [], invalidFields: [] },
        pending: false,
        canSubmit: false,
        siteKey: 'test-site-key',
        turnstileToken: 'screening-token',
        turnstileResetCount: 0,
        onSetTurnstileToken: () => undefined,
        onFieldChange: () => undefined,
        onSubmit: () => undefined,
      }),
    )

    for (const field of CHAT_CONTACT_TEMPLATES.bug_report.fields) {
      const isTextarea = !isChatContactChoiceField(field) && 'multiline' in field && field.multiline
      if (!isTextarea) {
        expect(markup).not.toContain(`id="chat-contact-${field.key}-count"`)
        continue
      }
      // The limit comes from the shared template definition, so it is the same
      // number the control enforces and the server validates against.
      expect(markup).toContain(`id="chat-contact-${field.key}-count"`)
      expect(markup).toContain(`0 / ${field.maxLength.toLocaleString('en-US')}`)
      expect(markup).toMatch(
        new RegExp(
          `<textarea[^>]*id="chat-contact-${field.key}"[^>]*aria-describedby="[^"]*chat-contact-${field.key}-count`,
        ),
      )
    }
  })

  test('calls a quotation a quotation in the review copy, not a report', () => {
    const review = {
      originalSubmission: {
        template: 'quotation',
        fields: {
          name: '',
          email: 'ada@example.com',
          businessName: 'Bright Lane',
          packageInterest: '',
          existingWebsite: '',
          requiredPages: 'Home',
          requiredFeatures: '',
          cmsRequirements: '',
          designReferences: '',
          integrations: '',
          contentAvailability: '',
          targetTimeline: 'Two months',
        },
      },
      refinedSubmission: {
        template: 'quotation',
        fields: {
          name: '',
          email: 'ada@example.com',
          businessName: 'Bright Lane',
          packageInterest: '',
          existingWebsite: '',
          requiredPages: 'Home, About, Contact',
          requiredFeatures: '',
          cmsRequirements: '',
          designReferences: '',
          integrations: '',
          contentAvailability: '',
          targetTimeline: 'Two months',
        },
      },
      refined: true,
    } as never
    const markup = renderToStaticMarkup(
      createElement(ChatContactReviewPhase, {
        template: 'quotation',
        review,
        pending: false,
        siteKey: null,
        turnstileResetCount: 0,
        turnstileToken: null,
        hasContextToken: false,
        onSetTurnstileToken: () => undefined,
        onEdit: () => undefined,
        onConfirmSend: () => undefined,
      }),
    )

    // The refinement path is shared with bug and feature reports, so the copy
    // must follow the template rather than calling a quote a "report".
    expect(markup).toContain('Refined version of your quotation request')
    expect(markup).toContain('your original quotation request will be attached as a PDF')
    expect(markup).not.toContain('your report')
  })
})
