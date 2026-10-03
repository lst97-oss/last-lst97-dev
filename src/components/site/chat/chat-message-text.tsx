import type { Parent, PhrasingContent, Root, RootContent, Text } from 'mdast'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const URL_PATTERN = /https?:\/\/[^\s<>"'`]+/giu

function safeHttpHref(value: string): string | null {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null
  } catch {
    return null
  }
}

function safeMarkdownHref(value: string): string {
  try {
    const url = new URL(value)
    return ['https:', 'http:', 'mailto:'].includes(url.protocol) ? url.href : ''
  } catch {
    return ''
  }
}

function stripTrailingPunctuation(value: string): { url: string; punctuation: string } {
  let end = value.length
  while (end > 0 && /[.,!?;:]/u.test(value[end - 1] ?? '')) end -= 1

  for (const [closer, opener] of [
    [')', '('],
    [']', '['],
  ] as const) {
    while (
      end > 0 &&
      value[end - 1] === closer &&
      value.slice(0, end).split(closer).length > value.slice(0, end).split(opener).length
    ) {
      end -= 1
    }
  }

  return { url: value.slice(0, end), punctuation: value.slice(end) }
}

function linkifyTextNode(node: Text): PhrasingContent[] {
  const content: PhrasingContent[] = []
  let cursor = 0

  for (const match of node.value.matchAll(URL_PATTERN)) {
    const index = match.index
    const rawUrl = match[0]
    const { url, punctuation } = stripTrailingPunctuation(rawUrl)
    const href = safeHttpHref(url)
    if (!href) continue

    if (index > cursor) content.push({ type: 'text', value: node.value.slice(cursor, index) })
    content.push({ type: 'link', url: href, children: [{ type: 'text', value: url }] })
    if (punctuation) content.push({ type: 'text', value: punctuation })
    cursor = index + rawUrl.length
  }

  if (cursor < node.value.length) content.push({ type: 'text', value: node.value.slice(cursor) })
  return content.length > 0 ? content : [node]
}

function linkifyBareUrls(tree: Root): void {
  const transformChildren = (parent: Parent, insideLink = false) => {
    const children = parent.children as Array<RootContent | PhrasingContent>

    for (let index = 0; index < children.length; index += 1) {
      const child = children[index]
      if (!child) continue

      if (child.type === 'text' && !insideLink) {
        const replacements = linkifyTextNode(child as Text)
        if (replacements.length !== 1 || replacements[0] !== child) {
          children.splice(index, 1, ...replacements)
          index += replacements.length - 1
        }
        continue
      }

      if ('children' in child) {
        const childParent = child as Parent
        const isLink = childParent.type === 'link' || childParent.type === 'linkReference'
        transformChildren(childParent, insideLink || isLink)
      }
    }
  }

  transformChildren(tree)
}

function remarkAutoLinkBareUrls() {
  return (tree: Root) => linkifyBareUrls(tree)
}

function normalizeCollapsedPipeTables(text: string): string {
  return text
    .split(/(```[\s\S]*?```|~~~[\s\S]*?~~~)/g)
    .map((part, index) => {
      if (index % 2 === 1) return part
      const inlineCode = part.split(/(`+[\s\S]*?`+)/g)
      if (
        !inlineCode.some((segment, segmentIndex) => segmentIndex % 2 === 0 && /\|[ \t]*:?-{3,}:?[ \t]*\|/.test(segment))
      )
        return part
      return inlineCode
        .map((segment, segmentIndex) => (segmentIndex % 2 === 1 ? segment : segment.replace(/\|[ \t]+\|/g, '|\n|')))
        .join('')
    })
    .join('')
}

export function ChatMessageText({ text }: { text: string }) {
  return (
    <div className="chat-markdown">
      <Markdown
        remarkPlugins={[remarkGfm, remarkAutoLinkBareUrls]}
        urlTransform={safeMarkdownHref}
        components={{
          a({ href, children }) {
            const safeHref = href ? safeMarkdownHref(href) : ''
            if (!safeHref) return <>{children}</>

            const isExternal = safeHref.startsWith('https://') || safeHref.startsWith('http://')
            return (
              <a
                href={safeHref}
                target={isExternal ? '_blank' : undefined}
                rel={isExternal ? 'noreferrer noopener' : undefined}
              >
                {children}
              </a>
            )
          },
          img() {
            return null
          },
          table({ children }) {
            return (
              <div className="chat-markdown-table-scroll">
                <table>{children}</table>
              </div>
            )
          },
        }}
      >
        {normalizeCollapsedPipeTables(text)}
      </Markdown>
    </div>
  )
}
