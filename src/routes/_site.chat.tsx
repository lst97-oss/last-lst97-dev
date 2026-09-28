import { createFileRoute } from '@tanstack/react-router'
import { ChatPage } from '@/components/site/chat/chat-page'
import { createPageMeta } from '@/lib/seo/site-seo'
import { getTurnstileSiteKeyServerFn } from '@/server/contact/server-functions'

export const Route = createFileRoute('/_site/chat')({
  loader: () => getTurnstileSiteKeyServerFn(),
  head: () =>
    createPageMeta({
      pathname: '/chat',
      title: 'Chat',
      description:
        'Start a conversation with the LAST//OS assistant — ask about projects, notes, or the work behind the system.',
      // Session-scoped, no shareable content to index.
      noindex: true,
    }),
  component: ChatRoute,
})

function ChatRoute() {
  const siteKey = Route.useLoaderData()
  return <ChatPage siteKey={siteKey} />
}
