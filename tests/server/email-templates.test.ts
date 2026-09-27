import { describe, expect, it } from 'bun:test'

import { renderChatContactNotification, renderChatContactReceipt, renderContactNotification, renderContactReceipt } from '../../src/server/email/templates'
import type { ContactMessage } from '../../src/server/contact/types'
import type { ChatContactSubmission } from '../../src/lib/chat-contact'

const contact: ContactMessage = {
  name: 'Ada <script>alert("x")</script> & Co',
  email: 'ada+portfolio@example.com',
  message: 'Hello <img src=x onerror=alert(1)> & "thanks".',
  website: '',
}

const bugReport: ChatContactSubmission = {
  template: 'bug_report',
  fields: {
    name: '<Ada>', email: 'ada@example.com', summary: 'Page crashes <after click>',
    expectedBehaviour: 'It should load & stay open.', stepsToReproduce: '1. Open page\n2. Click <Projects>',
    evidence: 'No secrets here.', impact: '', extraContext: '', environment: 'Firefox on Linux',
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

    expect(template.subject).toBe('We received your message — LAST//OS')
    expect(template.text).toContain('We received your message')
    expect(template.text).toContain('Thanks for reaching out')
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
    const template = renderChatContactReceipt({ template: 'email', fields: { name: '', email: 'ada@example.com', message: 'private message body' } })

    expect(template.templateId).toBe('chat-contact-receipt')
    expect(template.text).toContain('Hi there,')
    expect(template.text).toContain('We received your message')
    expect(template.text).not.toContain('private message body')
    expect(template.html).not.toContain('private message body')
  })
})
