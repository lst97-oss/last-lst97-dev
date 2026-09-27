import { describe, expect, it } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'

import { ChatCitations } from '../src/components/site/chat/chat-citations'
import { ChatMessageText } from '../src/components/site/chat/chat-message-text'

describe('ChatCitations', () => {
  it('renders safe source links without exposing evidence body or internal metadata', () => {
    const html = renderToStaticMarkup(<ChatCitations citations={[
      { id: 'K1', title: 'GitHub profile', url: 'https://github.com/lst97', chunkText: 'private index text', internalId: 'internal-id' } as never,
    ]} />)

    expect(html).toContain('GitHub profile')
    expect(html).toContain('href="https://github.com/lst97"')
    expect(html).toContain('target="_blank"')
    expect(html).toContain('rel="noreferrer noopener"')
    expect(html).not.toContain('private index text')
    expect(html).not.toContain('internal-id')
  })

  it('does not render untrusted non-HTTP citation destinations', () => {
    const html = renderToStaticMarkup(<ChatCitations citations={[
      { id: 'K1', title: 'Unsafe', url: 'javascript:alert(1)', isPublic: true },
    ]} />)

    expect(html).not.toContain('javascript:')
    expect(html).not.toContain('Unsafe')
  })

  it('marks a private-repository citation without exposing evidence text', () => {
    const html = renderToStaticMarkup(<ChatCitations citations={[
      { id: 'K1', title: 'secret-tool', url: 'https://github.com/lst97/secret-tool', isPublic: false },
    ]} />)

    expect(html).toContain('secret-tool')
    expect(html).toContain('private')
  })

  it('omits the private marker for public citations', () => {
    const html = renderToStaticMarkup(<ChatCitations citations={[
      { id: 'K1', title: 'Public post', url: 'https://example.test/post', isPublic: true },
    ]} />)

    expect(html).toContain('Public post')
    expect(html).not.toContain('private')
  })

  it('renders HTTP(S) URLs in chat text as safe external links and keeps punctuation outside', () => {
    const html = renderToStaticMarkup(
      <ChatMessageText text="Try https://gnaf.lst97.dev, then https://example.test/path?q=1&x=2." />,
    )

    expect(html).toContain('href="https://gnaf.lst97.dev/"')
    expect(html).toContain('href="https://example.test/path?q=1&amp;x=2"')
    expect(html).toContain('target="_blank"')
    expect(html).toContain('rel="noreferrer noopener"')
    expect(html).toContain('</a>, then ')
    expect(html).toContain('</a>.')
  })

  it('renders standard Markdown formatting in assistant messages', () => {
    const html = renderToStaticMarkup(
      <ChatMessageText text={'## Project notes\n\nA **useful** project with `TypeScript`.\n\n- First item\n- Second item\n\n```ts\nconst answer = 42\n```'} />,
    )

    expect(html).toContain('<h2>Project notes</h2>')
    expect(html).toContain('<strong>useful</strong>')
    expect(html).toContain('<code>TypeScript</code>')
    expect(html).toContain('<ul>')
    expect(html).toContain('<pre><code class="language-ts">const answer = 42\n</code></pre>')
  })

  it('renders Markdown tables as accessible HTML tables in a horizontally scrollable wrapper', () => {
    const html = renderToStaticMarkup(
      <ChatMessageText text={'| Project | Language |\n| --- | --- |\n| atlas | Python |'} />,
    )

    expect(html).toContain('<div class="chat-markdown-table-scroll"><table>')
    expect(html).toContain('<thead>')
    expect(html).toContain('<th>Project</th>')
    expect(html).toContain('<td>Python</td>')
  })

  it('recovers collapsed pipe-table rows from assistant output', () => {
    const html = renderToStaticMarkup(
      <ChatMessageText text={'| # | Project | Description | |---|---------|-------------| | 1 | SplitTab | Expense management | | 2 | GNAF | Python autocomplete |\n\nSummary: 2 projects.'} />,
    )

    expect(html).toContain('<th>#</th>')
    expect(html).toContain('<th>Project</th>')
    expect(html).toContain('<td>SplitTab</td>')
    expect(html).toContain('<td>GNAF</td>')
    expect(html).toContain('<p>Summary: 2 projects.</p>')

    const codeHtml = renderToStaticMarkup(
      <ChatMessageText text={'```text\n| # | Project | Description | |---|---------|-------------|\n```'} />,
    )
    expect(codeHtml).toContain('<pre><code class="language-text">| # | Project | Description | |---|---------|-------------|\n</code></pre>')
  })

  it('does not normalize table-like text inside inline code', () => {
    const html = renderToStaticMarkup(
      <ChatMessageText text={'Use `| A | |---|---| | x | y |` as an example.'} />,
    )

    expect(html).toContain('Use <code>| A | |---|---| | x | y |</code> as an example.')
    expect(html).not.toContain('<table>')
  })

  it('linkifies bare URLs in Markdown prose but not in code or existing links', () => {
    const html = renderToStaticMarkup(
      <ChatMessageText text={'Visit https://gnaf.lst97.dev, use `https://inline.test`, or [the project site](https://sphkoss.lst97.dev).\n\n```text\nhttps://code.test\n```'} />,
    )

    expect(html).toContain('href="https://gnaf.lst97.dev/"')
    expect(html).toContain('href="https://sphkoss.lst97.dev/"')
    expect(html).not.toContain('href="https://inline.test')
    expect(html).not.toContain('href="https://code.test')
    expect(html).toContain('</a>, use <code>https://inline.test</code>')
    expect(html).toContain('<code class="language-text">https://code.test\n</code>')
  })

  it('renders incomplete Markdown safely while a response is streaming', () => {
    const html = renderToStaticMarkup(
      <ChatMessageText text={'Current status: **searching\n\n```ts\nconst partial = true'} />,
    )

    expect(html).toContain('<p>Current status: **searching</p>')
    expect(html).toContain('<pre><code class="language-ts">const partial = true\n</code></pre>')
  })

  it('allows safe mailto links without opening them in a new tab', () => {
    const html = renderToStaticMarkup(
      <ChatMessageText text="[Contact Nelson](mailto:laisiotu1997@gmail.com)" />,
    )

    expect(html).toContain('href="mailto:laisiotu1997@gmail.com"')
    expect(html).not.toContain('target="_blank"')
  })

  it('does not render raw HTML or unsafe Markdown link protocols as executable markup', () => {
    const html = renderToStaticMarkup(
      <ChatMessageText text={'<script>alert(1)</script> [unsafe](javascript:alert%281%29) ![tracking image](https://example.test/tracker.png)'} />,
    )

    expect(html).not.toContain('<script>')
    expect(html).not.toContain('href="javascript:')
    expect(html).not.toContain('<img')
    expect(html).toContain('&lt;script&gt;')
  })

  it('keeps unsupported URL schemes as plain text instead of links', () => {
    const html = renderToStaticMarkup(<ChatMessageText text="javascript:alert(1)" />)

    expect(html).not.toContain('<a')
    expect(html).toContain('javascript:alert(1)')
  })
})
