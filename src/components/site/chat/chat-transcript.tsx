import { ChatCitations } from '@/components/site/chat/chat-citations'
import { ChatMessageText } from '@/components/site/chat/chat-message-text'
import type { ChatViewMessage } from '@/components/site/chat/chat-types'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Bubble, BubbleContent } from '@/components/ui/bubble'
import { Marker, MarkerContent, MarkerIcon } from '@/components/ui/marker'
import {
  Message,
  MessageAvatar,
  MessageContent,
  MessageFooter,
  MessageHeader,
} from '@/components/ui/message'
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from '@/components/ui/message-scroller'
import { Spinner } from '@/components/ui/spinner'

interface ChatTranscriptProps {
  messages: ChatViewMessage[]
  pending: boolean
  toolStatus: string | null
}

export function ChatTranscript({ messages, pending, toolStatus }: ChatTranscriptProps) {
  return (
    <MessageScrollerProvider autoScroll defaultScrollPosition="last-anchor" scrollPreviousItemPeek={48}>
      <MessageScroller className="os-chat-scroller h-150 border-3 border-border bg-foreground">
        <MessageScrollerViewport aria-label="Conversation with the assistant" className="os-chat-viewport">
          <MessageScrollerContent aria-busy={pending} className="os-chat-content gap-4 p-4 sm:gap-6 sm:p-6">
            {messages.map((item, index) => {
              const isUser = item.role === 'user'
              return (
                <MessageScrollerItem
                  key={`${item.role}-${index}`}
                  messageId={`chat-${index}-${item.role}`}
                  scrollAnchor={isUser}
                >
                  <Message align={isUser ? 'end' : 'start'}>
                    <MessageAvatar className="overflow-visible rounded-none bg-transparent">
                      <Avatar className="size-8 rounded-none border-2 border-border shadow-os-hover">
                        <AvatarFallback
                          className={
                            isUser
                              ? 'rounded-none bg-primary text-xs font-black text-foreground'
                              : 'rounded-none bg-secondary text-xs font-black text-foreground'
                          }
                        >
                          {isUser ? 'YOU' : 'SYS'}
                        </AvatarFallback>
                      </Avatar>
                    </MessageAvatar>
                    <MessageContent>
                      <MessageHeader
                        className={
                          isUser
                            ? 'px-0 text-xs font-black tracking-widest text-primary'
                            : 'px-0 text-xs font-black tracking-widest text-secondary'
                        }
                      >
                        {isUser ? 'YOU' : 'OPERATOR.SYS'} · {String(index + 1).padStart(2, '0')}
                      </MessageHeader>
                      <Bubble align={isUser ? 'end' : 'start'} variant={isUser ? 'default' : 'ghost'}>
                        <BubbleContent
                          className={
                            isUser
                              ? 'rounded-none border-3 border-border bg-primary px-3 py-2 font-mono text-sm leading-relaxed whitespace-pre-wrap text-foreground shadow-os-sm'
                              : 'rounded-none bg-transparent px-0 py-0 font-mono text-sm leading-relaxed text-background'
                          }
                        >
                          {isUser ? item.content : <ChatMessageText text={item.content} />}
                        </BubbleContent>
                      </Bubble>
                      {item.role === 'assistant' && (item.knowledgeUnavailable || item.citations) ? (
                        <MessageFooter className="flex-col items-start gap-1 px-0">
                          {item.knowledgeUnavailable ? (
                            <p className="text-xs font-black tracking-widest text-primary">
                              PERSONAL KNOWLEDGE IS TEMPORARILY UNAVAILABLE.
                            </p>
                          ) : null}
                          {item.citations ? <ChatCitations citations={item.citations} /> : null}
                        </MessageFooter>
                      ) : null}
                    </MessageContent>
                  </Message>
                </MessageScrollerItem>
              )
            })}
            {pending ? (
              <MessageScrollerItem messageId="chat-pending">
                <Message align="start">
                  <MessageAvatar className="overflow-visible rounded-none bg-transparent">
                    <Avatar className="size-8 rounded-none border-2 border-border shadow-os-hover">
                      <AvatarFallback className="rounded-none bg-secondary text-xs font-black text-foreground">
                        SYS
                      </AvatarFallback>
                    </Avatar>
                  </MessageAvatar>
                  <MessageContent>
                    <Marker role="status" className="text-secondary">
                      <MarkerIcon>
                        <Spinner className="size-4 text-primary" />
                      </MarkerIcon>
                      <MarkerContent className="font-mono text-xs font-bold tracking-wide">
                        {toolStatus ?? <>thinking<span className="loading-dots"><span>.</span><span>.</span><span>.</span></span></>}
                      </MarkerContent>
                    </Marker>
                  </MessageContent>
                </Message>
              </MessageScrollerItem>
            ) : null}
          </MessageScrollerContent>
        </MessageScrollerViewport>
        <MessageScrollerButton className="rounded-none border-3 border-border bg-primary text-foreground shadow-os-xs hover:bg-accent" />
      </MessageScroller>
    </MessageScrollerProvider>
  )
}
