import { CHAT_CONTACT_TEMPLATES, type ChatContactField, type ChatContactSubmission } from '../../lib/chat-contact'
import type { ContactMessage } from '../contact/types'
import type { EmailTemplate } from './types'

const palette = {
  ink: '#17171f',
  paper: '#fffdf3',
  coral: '#ff7969',
  yellow: '#ffd34e',
  muted: '#17171f',
  line: '#17171f',
}

export function renderContactNotification(contact: ContactMessage): EmailTemplate {
  const name = escapeHtml(contact.name)
  const email = escapeHtml(contact.email)
  const message = escapeHtml(contact.message)

  return {
    templateId: 'contact-notification',
    subject: 'New contact message — LAST//OS',
    text: [
      'NEW CONTACT MESSAGE — LAST//OS',
      '',
      `From: ${contact.name}`,
      `Email: ${contact.email}`,
      '',
      contact.message,
    ].join('\n'),
    html: renderLayout(
      'INCOMING TRANSMISSION',
      'New contact message',
      `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin:24px 0;">
        <tr><th align="left" style="padding:10px 12px;border:1px solid ${palette.line};font:600 13px Arial,sans-serif;color:${palette.muted};">From</th><td style="padding:10px 12px;border:1px solid ${palette.line};font:16px Arial,sans-serif;color:${palette.ink};">${name}</td></tr>
        <tr><th align="left" style="padding:10px 12px;border:1px solid ${palette.line};font:600 13px Arial,sans-serif;color:${palette.muted};">Email</th><td style="padding:10px 12px;border:1px solid ${palette.line};font:16px Arial,sans-serif;color:${palette.ink};">${email}</td></tr>
      </table>
      <h2 style="margin:24px 0 8px;font:700 16px Arial,sans-serif;color:${palette.ink};">Message</h2>
      <pre style="margin:0;padding:16px;background-color:#f4f0df;border-left:4px solid ${palette.coral};white-space:pre-wrap;overflow-wrap:anywhere;font:15px/1.6 Arial,sans-serif;color:${palette.ink};">${message}</pre>`,
    ),
  }
}

export function renderContactReceipt(contact: ContactMessage): EmailTemplate {
  const name = escapeHtml(contact.name)

  return {
    templateId: 'contact-receipt',
    subject: 'We received your message — LAST//OS',
    text: [
      `Hi ${contact.name},`,
      '',
      'We received your message. Thanks for reaching out — we appreciate you taking the time to write.',
      '',
      '— Nelson · LAST//OS',
    ].join('\n'),
    html: renderLayout(
      'DELIVERY CONFIRMED',
      'Message received',
      `<p style="margin:0 0 16px;font:16px/1.6 Arial,sans-serif;color:${palette.ink};">Hi ${name},</p>
      <p style="margin:0 0 16px;font:16px/1.6 Arial,sans-serif;color:${palette.ink};">We received your message. Thanks for reaching out — we appreciate you taking the time to write.</p>
      <p style="margin:24px 0 0;font:14px/1.6 Arial,sans-serif;color:${palette.muted};">— Nelson · LAST//OS</p>`,
    ),
  }
}

export function renderChatContactNotification(contact: ChatContactSubmission): EmailTemplate {
  const definitions = CHAT_CONTACT_TEMPLATES[contact.template].fields
  const fieldValues = contact.fields as Partial<Record<ChatContactField, string>>
  const name = contact.fields.name.trim()
  const rows = definitions
    .filter((field) => field.key !== 'name' && field.key !== 'email')
    .filter((field) => Boolean(fieldValues[field.key]?.trim()))
  const reportNotice =
    contact.template === 'email'
      ? ''
      : 'The report below was refined for clarity. Its original submitted wording is attached as original-report.pdf.'
  const reportNoticeHtml = reportNotice
    ? `<p style="margin:0 0 20px;border-left:4px solid ${palette.coral};padding:12px;background-color:#fff4ba;font:13px/1.5 Arial,sans-serif;color:${palette.ink};">${escapeHtml(reportNotice)}</p>`
    : ''
  const plainText = [
    `${CHAT_CONTACT_TEMPLATES[contact.template].label.toUpperCase()} — LAST//OS`,
    '',
    ...(reportNotice ? [reportNotice, ''] : []),
    ...(name ? [`From: ${contact.fields.name}`] : []),
    `Reply email: ${contact.fields.email}`,
    ...rows.flatMap((field) => ['', `${field.label}:`, fieldValues[field.key] ?? '']),
  ].join('\n')
  const body = `${reportNoticeHtml}
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin:24px 0;">
      ${name ? `<tr><th align="left" style="padding:10px 12px;border:1px solid ${palette.line};font:600 13px Arial,sans-serif;color:${palette.muted};">Name</th><td style="padding:10px 12px;border:1px solid ${palette.line};font:16px Arial,sans-serif;color:${palette.ink};">${escapeHtml(contact.fields.name)}</td></tr>` : ''}
      <tr><th align="left" style="padding:10px 12px;border:1px solid ${palette.line};font:600 13px Arial,sans-serif;color:${palette.muted};">Reply email</th><td style="padding:10px 12px;border:1px solid ${palette.line};font:16px Arial,sans-serif;color:${palette.ink};">${escapeHtml(contact.fields.email)}</td></tr>
    </table>
    ${rows.map((field) => `<h2 style="margin:24px 0 8px;font:700 16px Arial,sans-serif;color:${palette.ink};">${escapeHtml(field.label)}</h2><pre style="margin:0;padding:16px;background-color:${palette.paper};border:1px solid ${palette.ink};border-left:4px solid ${palette.coral};white-space:pre-wrap;overflow-wrap:anywhere;font:15px/1.6 Arial,sans-serif;color:${palette.ink};">${escapeHtml(fieldValues[field.key] ?? '')}</pre>`).join('')}`
  const subject =
    contact.template === 'bug_report'
      ? 'Bug report — LAST//OS'
      : contact.template === 'feature_request'
        ? 'Feature request — LAST//OS'
        : 'New message — LAST//OS'

  return {
    templateId: 'chat-contact-notification',
    subject,
    text: plainText,
    html: renderLayout('CHAT CONTACT', CHAT_CONTACT_TEMPLATES[contact.template].label, body),
  }
}

export function renderChatContactReceipt(contact: ChatContactSubmission): EmailTemplate {
  const name = contact.fields.name.trim()
  return {
    templateId: 'chat-contact-receipt',
    subject: 'We received your message — LAST//OS',
    text: [
      `Hi ${name || 'there'},`,
      '',
      'We received your message. Thanks for taking the time to write.',
      '',
      '— Nelson · LAST//OS',
    ].join('\n'),
    html: renderLayout(
      'DELIVERY CONFIRMED',
      'Message received',
      `<p style="margin:0 0 16px;font:16px/1.6 Arial,sans-serif;color:${palette.ink};">Hi ${escapeHtml(name || 'there')},</p>
      <p style="margin:0 0 16px;font:16px/1.6 Arial,sans-serif;color:${palette.ink};">We received your message. Thanks for taking the time to write.</p>
      <p style="margin:24px 0 0;font:14px/1.6 Arial,sans-serif;color:${palette.muted};">— Nelson · LAST//OS</p>`,
    ),
  }
}

function renderLayout(label: string, title: string, body: string): string {
  return `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
  <body style="margin:0;padding:24px 12px;background-color:${palette.paper};color:${palette.ink};">
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;max-width:640px;margin:0 auto;border:2px solid ${palette.ink};border-collapse:collapse;background-color:${palette.paper};">
      <tr><td style="padding:16px 20px;background-color:${palette.yellow};border-bottom:2px solid ${palette.ink};font:700 14px/1.4 Arial,sans-serif;letter-spacing:1px;color:${palette.ink};">LAST//OS <span style="font-weight:400;">· ${label}</span></td></tr>
      <tr><td style="padding:28px 24px 32px;">
        <p style="margin:0 0 8px;font:700 11px/1.4 Arial,sans-serif;letter-spacing:2px;color:${palette.coral};">PERSONAL OPERATING SYSTEM</p>
        <h1 style="margin:0 0 20px;font:700 28px/1.2 Arial,sans-serif;color:${palette.ink};">${title}</h1>
        ${body}
      </td></tr>
    </table>
  </body>
</html>`
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}
