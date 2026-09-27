import { describe, expect, it } from 'bun:test'

import { renderOriginalChatContactReportPdf, renderOriginalChatContactReportText } from '../../src/server/email/chat-contact-report-pdf'
import type { ChatContactSubmission } from '../../src/lib/chat-contact'

describe('original chat contact report PDF', () => {
  it('creates a readable PDF from the submitted report without adding contact details', async () => {
    const report: ChatContactSubmission = {
      template: 'bug_report',
      fields: {
        name: 'Ada Lovelace', email: 'ada@example.com',
        summary: 'Filter does not work.',
        expectedBehaviour: 'Only matching projects should appear. 訪客應只會看到符合條件的項目。',
        stepsToReproduce: '1. Open projects.\n2. Select a filter.',
        evidence: '', impact: 'Mobile visitors cannot narrow the list.', extraContext: '', environment: 'Safari on iOS',
      },
    }

    const bytes = await renderOriginalChatContactReportPdf(report)
    const source = renderOriginalChatContactReportText(report)
    const pdf = new TextDecoder('latin1').decode(bytes)

    expect(pdf.startsWith('%PDF-')).toBe(true)
    expect(pdf).toContain('%%EOF')
    expect(source).toContain('ORIGINAL BUG REPORT')
    expect(source).toContain('Filter does not work.')
    expect(source).toContain('Only matching projects should appear.')
    expect(source).toContain('訪客應只會看到符合條件的項目。')
    expect(pdf).toContain('5c757b')
    expect(source).toContain('Steps to reproduce')
    expect(source).toContain('Safari on iOS')
    expect(source).not.toContain('Ada Lovelace')
    expect(source).not.toContain('ada@example.com')
  })

  it('supports feature request submissions and long text without changing the supplied wording', async () => {
    const original = `Original wording: ${'long detail '.repeat(1_000)}`
    const report: ChatContactSubmission = {
      template: 'feature_request',
      fields: {
        name: '', email: 'ada@example.com', problem: original, proposedExperience: 'Add saved filters.',
        whoBenefits: '', exampleUseCase: '', acceptanceCriteria: '', alternatives: '', references: '',
      },
    }

    const bytes = await renderOriginalChatContactReportPdf(report)
    const source = renderOriginalChatContactReportText(report)
    const pdf = new TextDecoder('latin1').decode(bytes)

    expect(pdf.startsWith('%PDF-')).toBe(true)
    expect(source).toContain('ORIGINAL FEATURE REQUEST')
    expect(source).toContain('Original wording:')
    expect(source).toContain('Add saved filters.')
    expect(source).not.toContain('ada@example.com')
  })
})
