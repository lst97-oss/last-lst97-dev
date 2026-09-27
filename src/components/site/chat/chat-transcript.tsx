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

import { ChatCitations } from './chat-citations'
import { ChatMessageText } from './chat-message-text'
import type { ChatViewMessage } from './chat-types'

interface ChatTranscriptProps {
  messages: ChatViewMessage[]
  pending: boolean
  toolStatus: string | null
}

export function ChatTranscript({ messages, pending, toolStatus }: ChatTranscriptProps) {
  return (
    <MessageScrollerProvider autoScroll defaultScrollPosition="last-anchor" scrollPreviousItemPeek={48}>
      <MessageScroller className="os-chat-scroller h-[min(62dvh,460px)] border-[3px] border-[var(--os-ink)] bg-[#20202b] sm:h-[460px]">
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
                      <Avatar className="size-8 rounded-none border-2 border-[var(--os-ink)] shadow-[2px_2px_0_rgba(0,0,0,0.5)]">
                        <AvatarFallback
                          className={
                            isUser
                              ? 'rounded-none bg-[var(--os-yellow)] text-[10px] font-black text-[var(--os-ink)]'
                              : 'rounded-none bg-[var(--os-teal)] text-[10px] font-black text-[var(--os-ink)]'
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
                            ? 'px-0 text-[10px] font-black tracking-[0.12em] text-[var(--os-yellow)]'
                            : 'px-0 text-[10px] font-black tracking-[0.12em] text-[var(--os-teal)]'
                        }
                      >
                        {isUser ? 'YOU' : 'OPERATOR.SYS'} · {String(index + 1).padStart(2, '0')}
                      </MessageHeader>
                      <Bubble align={isUser ? 'end' : 'start'} variant={isUser ? 'default' : 'ghost'}>
                        <BubbleContent
                          className={
                            isUser
                              ? 'rounded-none border-[3px] border-[var(--os-ink)] bg-[var(--os-yellow)] px-3 py-2 font-mono text-[13px] leading-relaxed whitespace-pre-wrap text-[var(--os-ink)] shadow-[4px_4px_0_rgba(0,0,0,0.5)]'
                              : 'rounded-none bg-transparent px-0 py-0 font-mono text-[13px] leading-relaxed text-[var(--os-paper)]'
                          }
                        >
                          {isUser ? item.content : <ChatMessageText text={item.content} />}
                        </BubbleContent>
                      </Bubble>
                      {item.role === 'assistant' && (item.knowledgeUnavailable || item.citations) ? (
                        <MessageFooter className="flex-col items-start gap-1 px-0">
                          {item.knowledgeUnavailable ? (
                            <p className="text-[9px] font-black tracking-[0.1em] text-[var(--os-yellow)]">
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
                    <Avatar className="size-8 rounded-none border-2 border-[var(--os-ink)] shadow-[2px_2px_0_rgba(0,0,0,0.5)]">
                      <AvatarFallback className="rounded-none bg-[var(--os-teal)] text-[10px] font-black text-[var(--os-ink)]">
                        SYS
                      </AvatarFallback>
                    </Avatar>
                  </MessageAvatar>
                  <MessageContent>
                    <Marker role="status" className="text-[var(--os-teal)]">
                      <MarkerIcon>
                        <Spinner className="size-4 text-[var(--os-yellow)]" />
                      </MarkerIcon>
                      <MarkerContent className="font-mono text-[12px] font-bold tracking-wide">
                        {toolStatus ?? <>thinking<span className="loading-dots"><span>.</span><span>.</span><span>.</span></span></>}
                      </MarkerContent>
                    </Marker>
                  </MessageContent>
                </Message>
              </MessageScrollerItem>
            ) : null}
          </MessageScrollerContent>
        </MessageScrollerViewport>
        <MessageScrollerButton className="rounded-none border-[3px] border-[var(--os-ink)] bg-[var(--os-yellow)] text-[var(--os-ink)] shadow-[3px_3px_0_var(--os-ink)] hover:bg-[var(--os-coral)]" />
      </MessageScroller>
    </MessageScrollerProvider>
  )
}
