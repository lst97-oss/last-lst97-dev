import { createFileRoute } from '@tanstack/react-router'

import { ContactMessageForm } from '../components/site/contact/contact-message-form'
import { PixelIcon } from '../components/site/pixel-icon'
import { WindowFrame } from '../components/site/window-frame'
import { getTurnstileSiteKeyServerFn } from '../server/contact/server-functions'

export const Route = createFileRoute('/_site/contact')({
  loader: () => getTurnstileSiteKeyServerFn(),
  head: () => ({ meta: [{ title: 'Contact — LAST//OS' }, { name: 'description', content: 'Send a message to the operator.' }] }),
  component: ContactPage,
})

function ContactPage() {
  const siteKey = Route.useLoaderData()

  return (
    <div className="page-stack narrow-page">
      <WindowFrame title="send-message.exe" icon="@" className="contact-window">
        <div className="page-heading"><div><p className="eyebrow"><PixelIcon glyph="@" /> CONTACT / OUTBOUND</p><h1>Open a channel.</h1><p className="lead-copy">Have a project, question, or good link? Send it over.</p></div></div>
        <ContactMessageForm siteKey={siteKey} />
      </WindowFrame>
    </div>
  )
}
