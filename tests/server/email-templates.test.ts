import { describe, expect, it } from 'bun:test'
import type { ChatContactSubmission } from '../../src/lib/chat-contact'
import { SERVICE_ADDONS_NOTE } from '../../src/lib/services/packages'
import type { ContactMessage } from '../../src/server/contact/types'
import {
  renderChatContactNotification,
  renderChatContactReceipt,
  renderContactNotification,
  renderContactReceipt,
} from '../../src/server/email/templates'

const contact: ContactMessage = {
  name: 'Ada <script>alert("x")</script> & Co',
  email: 'ada+portfolio@example.com',
  message: 'Hello <img src=x onerror=alert(1)> & "thanks".',
  website: '',
}

const bugReport: ChatContactSubmission = {
  template: 'bug_report',
  fields: {
    name: '<Ada>',
    email: 'ada@example.com',
    summary: 'Page crashes <after click>',
    expectedBehaviour: 'It should load & stay open.',
    stepsToReproduce: '1. Open page\n2. Click <Projects>',
    evidence: 'No secrets here.',
    impact: '',
    extraContext: '',
    environment: 'Firefox on Linux',
  },
}

const quotation: ChatContactSubmission = {
  template: 'quotation',
  fields: {
    name: 'Ada',
    email: 'ada@example.com',
    businessName: 'Bright Lane <script>alert("x")</script>',
    packageInterest: 'Business — From A$2,200',
    existingWebsite: '',
    requiredPages: 'Home, About, Contact',
    requiredFeatures: 'Contact or enquiry form, Online booking or scheduling',
    otherFeatures: 'Bilingual pages',
    cmsRequirements: 'Standard CMS with a blog',
    designReferences: '',
    integrations: '',
    contentAvailability: 'Copy and images are ready',
    targetTimeline: 'One to three months',
  },
}

describe('contact email templates', () => {
  it('renders the operator notification with escaped HTML and a readable text alternative', () => {
    const template = renderContactNotification(contact)

    expect(template.subject).toBe('New contact message — LAST//OS')
    expect(template.text).toContain(contact.name)
    expect(template.text).toContain(contact.email)
    expect(template.text).toContain(contact.message)
    expect(template.html).toContain('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; Co')
    expect(template.html).toContain('&lt;img src=x onerror=alert(1)&gt; &amp; &quot;thanks&quot;.')
    expect(template.html).not.toContain('<script>')
    expect(template.html).not.toContain('<img src=x')
    expect(template.html).toContain('style="')
  })

  it('renders a receipt without repeating the submitted message', () => {
    const template = renderContactReceipt(contact)

    expect(template.subject).toBe('Thank you for contacting LAST//OS')
    expect(template.text).toContain(`Dear ${contact.name},`)
    expect(template.text).toContain('Thank you for contacting LAST//OS. We have received your message.')
    expect(template.text).toContain('Nelson will review your enquiry and respond as soon as possible.')
    expect(template.text).toContain('Kind regards,\nNelson\nLAST//OS')
    expect(template.text).toContain(contact.name)
    expect(template.text).not.toContain(contact.message)
    expect(template.text).not.toContain('operator inbox')
    expect(template.html).toContain('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; Co')
    expect(template.html).not.toContain('<script>')
    expect(template.html).not.toContain(contact.message)
    expect(template.html).not.toContain('operator inbox')
    expect(template.html).toContain('style="')
  })

  it('renders a formatted chat bug report in themed HTML and plain text', () => {
    const template = renderChatContactNotification(bugReport)

    expect(template.templateId).toBe('chat-contact-notification')
    expect(template.subject).toBe('Bug report — LAST//OS')
    expect(template.text).toContain('Summary:\nPage crashes <after click>')
    expect(template.text).toContain('Steps to reproduce:\n1. Open page\n2. Click <Projects>')
    expect(template.text).toContain('Environment (optional):\nFirefox on Linux')
    expect(template.text).toContain('refined for clarity')
    expect(template.text).toContain('original-report.pdf')
    expect(template.html).toContain('color:#17171f')
    expect(template.html).toContain('background-color:#fffdf3')
    expect(template.html).toContain('background-color:#ffd34e')
    expect(template.html).toContain('color:#ff7969')
    expect(template.html).toContain('refined for clarity')
    expect(template.html).toContain('original-report.pdf')
    expect(template.html).toContain('Page crashes &lt;after click&gt;')
    expect(template.html).toContain('Click &lt;Projects&gt;')
    expect(template.html).not.toContain('<Projects>')
    expect(template.html).not.toContain('<after click>')
  })

  it('keeps a short chat receipt from echoing report contents or inventing a name', () => {
    const template = renderChatContactReceipt({
      template: 'email',
      fields: { name: '', email: 'ada@example.com', message: 'private message body' },
    })

    expect(template.templateId).toBe('chat-contact-receipt')
    expect(template.subject).toBe('Thank you for contacting LAST//OS')
    expect(template.text).toContain('Dear Customer,')
    expect(template.text).toContain('Nelson will review your enquiry and respond as soon as possible.')
    expect(template.text).not.toContain('private message body')
    expect(template.html).not.toContain('private message body')
  })

  it('renders a quotation notification without repeating the published pricing tables', () => {
    const template = renderChatContactNotification(quotation)

    expect(template.subject).toBe('Quotation request — LAST//OS')
    expect(template.templateId).toBe('chat-contact-notification')
    // The plain-text alternative carries the raw value; only HTML is escaped.
    expect(template.text).toContain('Bright Lane <script>alert("x")</script>')
    expect(template.html).toContain('Bright Lane &lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;')
    expect(template.html).not.toContain('<script>')
    expect(template.text).toContain('original-report.pdf')
    expect(template.html).toContain('original-report.pdf')
    expect(template.text).not.toContain('PUBLISHED PACKAGES')
    expect(template.html).not.toContain('PUBLISHED PACKAGES')
    expect(template.text).not.toContain('GO SUPPORT PLAN — STARTING PRICES')
    expect(template.html).not.toContain('GO SUPPORT PLAN — STARTING PRICES')
    expect(template.text).not.toContain(SERVICE_ADDONS_NOTE)
    expect(template.html).not.toContain(SERVICE_ADDONS_NOTE)
  })

  it('keeps bug report notifications free of pricing reference sections', () => {
    // Price tables are omitted from operator notifications; this guards the
    // bug and feature paths against picking up irrelevant reference pricing.
    const template = renderChatContactNotification(bugReport)

    expect(template.subject).toBe('Bug report — LAST//OS')
    expect(template.text).not.toContain('PUBLISHED PACKAGES')
    expect(template.html).not.toContain('PUBLISHED PACKAGES')
    expect(template.text).not.toContain(SERVICE_ADDONS_NOTE)
    expect(template.html).not.toContain(SERVICE_ADDONS_NOTE)
  })
})
