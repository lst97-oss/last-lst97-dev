import PDFDocument from 'pdfkit'

import { CHAT_CONTACT_TEMPLATES, type ChatContactSubmission } from '../../lib/chat-contact'

const COLORS = {
  ink: '#17171f',
  paper: '#fffdf3',
  yellow: '#ffd34e',
  coral: '#ff7969',
}

function pdfSafeText(value: string): string {
  return Array.from(value, (character) => {
    const codePoint = character.codePointAt(0) ?? 0
    const inWinAnsi =
      codePoint <= 0x00ff ||
      [0x20ac, 0x2013, 0x2014, 0x2018, 0x2019, 0x201c, 0x201d, 0x2022, 0x2026].includes(codePoint)
    if (inWinAnsi && codePoint >= 0x20) return character
    if (character === '\n' || character === '\t') return character
    if (codePoint < 0x20 || (codePoint >= 0x7f && codePoint <= 0x9f)) return ' '
    return `\\u{${codePoint.toString(16).toUpperCase()}}`
  }).join('')
}

function originalReportFields(
  submission: Exclude<ChatContactSubmission, { template: 'email' }>,
): Array<{ label: string; value: string }> {
  const definitions = CHAT_CONTACT_TEMPLATES[submission.template].fields.filter(
    (field) => field.key !== 'name' && field.key !== 'email',
  )
  const fields = submission.fields as Record<string, string>
  return definitions.map((field) => ({ label: field.label, value: fields[field.key]?.trim() ?? '' }))
}

export function renderOriginalChatContactReportText(
  submission: Exclude<ChatContactSubmission, { template: 'email' }>,
): string {
  const title = submission.template === 'bug_report' ? 'ORIGINAL BUG REPORT' : 'ORIGINAL FEATURE REQUEST'
  return [
    `LAST//OS - ${title}`,
    'Submitted wording before clarity refinement',
    '',
    ...originalReportFields(submission).flatMap((field) => [field.label, field.value || 'Not provided', '']),
  ]
    .join('\n')
    .trim()
}

export async function renderOriginalChatContactReportPdf(submission: ChatContactSubmission): Promise<Uint8Array> {
  if (submission.template === 'email')
    throw new Error('A plain email message does not have an original report attachment')

  const fields = originalReportFields(submission)
  const document = new PDFDocument({
    size: 'A4',
    margins: { top: 52, right: 54, bottom: 56, left: 54 },
    bufferPages: true,
    compress: false,
    info: {
      Title: `Original ${CHAT_CONTACT_TEMPLATES[submission.template].label.toLowerCase()}`,
      Subject: 'User-submitted contact report before clarity refinement',
      Creator: 'LAST//OS chat contact form',
    },
  })

  const chunks: Uint8Array[] = []
  const output = new Promise<Uint8Array>((resolve, reject) => {
    document.on('data', (chunk: Uint8Array) => chunks.push(chunk))
    document.on('error', reject)
    document.on('end', () => resolve(Buffer.concat(chunks)))
  })

  document.rect(0, 0, document.page.width, 76).fill(COLORS.yellow)
  document
    .fillColor(COLORS.ink)
    .font('Helvetica-Bold')
    .fontSize(10)
    .text('LAST//OS  -  ORIGINAL REPORT', 54, 22, { characterSpacing: 1.2 })
  document
    .fillColor(COLORS.ink)
    .font('Helvetica-Bold')
    .fontSize(22)
    .text(`ORIGINAL ${submission.template === 'bug_report' ? 'BUG REPORT' : 'FEATURE REQUEST'}`, 54, 100, {
      width: 490,
    })
  document
    .fillColor(COLORS.coral)
    .font('Helvetica-Bold')
    .fontSize(10)
    .text('SUBMITTED WORDING BEFORE CLARITY REFINEMENT', 54, 132, { characterSpacing: 0.5 })
  if (fields.some((field) => /\\u\{[0-9A-F]+\}/.test(pdfSafeText(field.value)))) {
    document
      .fillColor(COLORS.ink)
      .font('Helvetica')
      .fontSize(8)
      .text('Characters outside this PDF font are shown as Unicode escapes to preserve the original text.', 54, 146, {
        width: 480,
      })
  }
  document
    .moveTo(54, 154)
    .lineTo(document.page.width - 54, 154)
    .lineWidth(1.5)
    .stroke(COLORS.ink)
  document.moveDown(2.5)

  for (const field of fields) {
    const displayValue = field.value || 'Not provided'
    const valueHeight = document.font('Helvetica').fontSize(11).heightOfString(displayValue, { width: 480, lineGap: 3 })
    if (document.y + valueHeight + 42 > document.page.height - 58) document.addPage()

    document.fillColor(COLORS.ink).font('Helvetica-Bold').fontSize(12).text(field.label, 54, document.y, { width: 480 })
    document.moveDown(0.35)
    const top = document.y
    document
      .fillColor(COLORS.ink)
      .font('Helvetica')
      .fontSize(11)
      .text(pdfSafeText(displayValue), 54, top, { width: 480, lineGap: 3, paragraphGap: 3 })
    const bottom = Math.min(document.y + 8, document.page.height - 54)
    document
      .moveTo(54, bottom)
      .lineTo(document.page.width - 54, bottom)
      .lineWidth(0.4)
      .stroke('#bdb7a6')
    document.y = bottom + 15
  }

  const pages = document.bufferedPageRange()
  for (let index = pages.start; index < pages.start + pages.count; index += 1) {
    document.switchToPage(index)
    document
      .fillColor(COLORS.ink)
      .font('Helvetica')
      .fontSize(8)
      .text(`LAST//OS  -  Original report  -  ${index + 1} / ${pages.count}`, 54, document.page.height - 34, {
        width: document.page.width - 108,
        align: 'right',
        lineBreak: false,
      })
  }

  document.end()
  return output
}
