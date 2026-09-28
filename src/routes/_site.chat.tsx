import { createFileRoute } from '@tanstack/react-router'
import { ChatPage } from '@/components/site/chat/chat-page'
import { getTurnstileSiteKeyServerFn } from '@/server/contact/server-functions'

export const Route = createFileRoute('/_site/chat')({
  loader: () => getTurnstileSiteKeyServerFn(),
  head: () => ({ meta: [{ title: 'Chat — LAST//OS' }, { name: 'description', content: 'Start a conversation with the personal assistant.' }] }),
  component: ChatRoute,
})

function ChatRoute() {
  const siteKey = Route.useLoaderData()
  return <ChatPage siteKey={siteKey} />
}
