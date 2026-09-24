import type { ChatMessage, ChatTopicAnchor } from '../chat/types'

const MAX_QUERY_CHARS = 1_000
const MAX_HISTORY_TURN_CHARS = 500
const ACKNOWLEDGEMENT = /^(?:thanks?(?:\s+you)?|thank\s+you|ok(?:ay)?|got\s+it|understood|great|cool|nice|sounds\s+good)[!.\s]*$/i
const FOLLOW_UP_REFERENCE = /\b(?:it|its|that|this|these|those|they|them|their|there|one|ones|what about|how about|which one)\b/i
const PERSONAL_FACTS = /\b(?:education|experience|work experience|qualifications?|skills?|background|contributions?|employment|career)\b/i
const PROJECT_REFERENCE = /\b(?:project|repository|repo|codebase|that one)\b/i

function sanitize(value: string, max: number): string {
  return value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max)
}

function anchorHasSource(anchor: ChatTopicAnchor, source: 'search_knowledge' | 'coding_history'): boolean {
  return anchor.tools.some((tool) => tool.name === source && tool.status !== 'rejected')
}

function chooseAnchor(message: string, anchors: ChatTopicAnchor[]): ChatTopicAnchor | undefined {
  const available = anchors.filter((anchor) => anchor.tools.some((tool) => tool.status !== 'rejected'))
  const lower = message.toLowerCase()

  if (PROJECT_REFERENCE.test(lower)) {
    return [...available].reverse().find((anchor) =>
      /\b(?:project|repository|repo|codebase|working on|coding activity)\b/i.test(anchor.question)
      && (anchorHasSource(anchor, 'search_knowledge') || anchorHasSource(anchor, 'coding_history')),
    )
  }
  if (PERSONAL_FACTS.test(lower)) {
    return [...available].reverse().find((anchor) => anchorHasSource(anchor, 'search_knowledge'))
  }
  return [...available].reverse().find((anchor) => anchorHasSource(anchor, 'search_knowledge')) ?? available.at(-1)
}

function namedEntity(history: ChatMessage[]): string | undefined {
  const recent = history.slice(-4).map(({ content }) => sanitize(content, MAX_HISTORY_TURN_CHARS)).join(' ')
  const named = recent.match(/\b(?:project|repository|repo|tool)\s+(?:called|named)\s+([A-Z][A-Za-z0-9_.-]{1,60})\b/)
  return named?.[1]
}

function buildStandaloneFollowUp(message: string, anchor: ChatTopicAnchor, history: ChatMessage[]): string | undefined {
  const current = sanitize(message, 500)
  const lower = current.toLowerCase()
  const entity = namedEntity(history)
  const asksAbout = current.match(/^(?:how|what) about (?:the )?(.+?)[?!.]*$/i)?.[1]?.trim()

  if (asksAbout && PERSONAL_FACTS.test(asksAbout) && anchorHasSource(anchor, 'search_knowledge')) {
    return `Tell me about Nelson's ${asksAbout.replace(/^(?:my|your|his|her|its|their)\s+/i, '').replace(/\?+$/, '')}.`
  }

  if (PROJECT_REFERENCE.test(lower)) {
    const anchorQuestion = anchor.question.toLowerCase()
    if (!/\b(?:project|repository|repo|codebase|working on|coding activity)\b/.test(anchorQuestion)) return undefined
    // An explicit project name and requested facet belong to the latest user
    // message. Only replace a genuinely unresolved reference.
    const unresolvedReference = /\b(?:that|this|the same)\s+(?:project|repository|repo|codebase)\b/i
    if (!unresolvedReference.test(current)) return undefined
    const retainedEntity = anchor.entityLabel?.trim()
    const resolvedEntity = entity ?? retainedEntity
    if (resolvedEntity) {
      return current.replace(unresolvedReference, resolvedEntity)
    }
  }

  if (asksAbout && anchorHasSource(anchor, 'search_knowledge') && entity) {
    return `What is ${entity}'s ${asksAbout.replace(/\?+$/, '')}?`
  }
  return undefined
}

function historyOnlyFollowUp(message: string, history: ChatMessage[]): string | undefined {
  const current = sanitize(message, 500)
  const entity = namedEntity(history)
  if (!entity) return undefined

  const asksAbout = current.match(/^(?:how|what) about (?:the )?(.+?)[?!.]*$/i)?.[1]?.trim()
  if (asksAbout) return `What is ${entity}'s ${asksAbout.replace(/^(?:my|your|his|her|its|their)\s+/i, '').replace(/\?+$/, '')}?`
  if (/\b(?:its|their|his|her)\s+(?:technology|stack|purpose|function|role|architecture)\b/i.test(current)) {
    const facet = current.match(/\b(technology|stack|purpose|function|role|architecture)\b/i)?.[1]
    return facet ? `What is ${entity}'s ${facet}?` : undefined
  }
  return undefined
}

export function resolveKnowledgeQuery(message: string, verifiedHistory: ChatMessage[], topicAnchors: ChatTopicAnchor[] = []): string {
  const current = sanitize(message, 500)
  if (!current || ACKNOWLEDGEMENT.test(current)) return current
  if (!FOLLOW_UP_REFERENCE.test(current)) return current

  const anchor = chooseAnchor(current, topicAnchors.slice(-8))
  const resolved = anchor
    ? buildStandaloneFollowUp(current, anchor, verifiedHistory)
    : historyOnlyFollowUp(current, verifiedHistory)
  return (resolved ? sanitize(resolved, MAX_QUERY_CHARS) : current).slice(0, MAX_QUERY_CHARS)
}
