const TOOL_SYNTAX_PATTERNS: RegExp[] = [
  /<\s*tool_call\s*>[\s\S]*?<\s*\/\s*tool_call\s*>/gi,
  /<\s*arg_(?:key|value)\s*>[\s\S]*?<\s*\/\s*arg_(?:key|value)\s*>/gi,
  /<\s*\/?\s*tool_call\s*>/gi,
  /<\s*arg_(key|value)\s*>/gi,
  /<\s*\/\s*arg_(key|value)\s*>/gi,
  /\b(?:get_coding_history|search_knowledge|list_owned_projects|coding_stats|coding_history|site_content)\b/gi,
]
const TOOL_PROGRESS_SENTENCE =
  /^\s*(?:let me|i(?:'ll| will| am going to|'m going to))\s+(?:look(?:ing)? up|search(?:ing)?|check(?:ing)?|fetch(?:ing)?|retriev(?:e|ing)|query(?:ing)?)\b[^.!?\n]*(?:[.!?]|\n|$)\s*/i

function removeToolSyntax(text: string): string {
  let cleaned = text.replace(TOOL_PROGRESS_SENTENCE, '')
  for (const pattern of TOOL_SYNTAX_PATTERNS) cleaned = cleaned.replace(pattern, '')
  return cleaned
}

export function sanitizeAssistantReply(text: string): string {
  return removeToolSyntax(text)
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export function createAssistantReplyStreamSanitizer() {
  let pending = ''
  let prefixPending = ''
  let checkedPrefix = false
  let insideHiddenBlock: 'tool_call' | 'arg_key' | 'arg_value' | undefined
  const openingTag = /<\s*(tool_call|arg_key|arg_value)\s*>/i
  const markerLookbehind = 32

  function take(chunk: string, finish = false): string {
    if (!checkedPrefix) {
      prefixPending += chunk
      const progressLead =
        /^\s*(?:let me|i(?:'ll| will| am going to|'m going to))\s+(?:look(?:ing)? up|search(?:ing)?|check(?:ing)?|fetch(?:ing)?|retriev(?:e|ing)|query(?:ing)?)\b/i
      if (progressLead.test(prefixPending)) {
        const end = /[.!?\n]/.exec(prefixPending)
        if (!end && !finish) return ''
        prefixPending = end ? prefixPending.slice(end.index + 1) : ''
      } else if (!finish && prefixPending.length <= 80) {
        return ''
      }
      pending += prefixPending
      prefixPending = ''
      checkedPrefix = true
    } else {
      pending += chunk
    }
    let safe = ''
    for (;;) {
      if (insideHiddenBlock) {
        const closingTag = new RegExp(`<\\s*\\/\\s*${insideHiddenBlock}\\s*>`, 'i')
        const close = closingTag.exec(pending)
        if (!close) {
          if (finish) pending = ''
          else pending = pending.slice(-markerLookbehind)
          break
        }
        pending = pending.slice(close.index + close[0].length)
        insideHiddenBlock = undefined
        continue
      }

      const open = openingTag.exec(pending)
      if (open) {
        safe += removeToolSyntax(pending.slice(0, open.index))
        pending = pending.slice(open.index + open[0].length)
        const tag = open[1]?.toLowerCase()
        insideHiddenBlock = tag === 'tool_call' || tag === 'arg_key' || tag === 'arg_value' ? tag : undefined
        continue
      }

      if (finish) {
        safe += removeToolSyntax(pending)
        pending = ''
      } else if (pending.length > markerLookbehind) {
        const flushLength = pending.length - markerLookbehind
        safe += removeToolSyntax(pending.slice(0, flushLength))
        pending = pending.slice(flushLength)
      }
      break
    }
    return safe
  }

  return {
    push: (chunk: string) => take(chunk),
    finish: () => take('', true),
  }
}
