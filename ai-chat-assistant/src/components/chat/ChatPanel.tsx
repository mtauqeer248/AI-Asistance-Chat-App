'use client'

import { useCallback, useEffect, useRef } from 'react'
import { ArrowDown, Bot, Bug, Database, Gauge, ShieldCheck, X } from 'lucide-react'
import { useChat } from '@/hooks/useChat'
import { useChatStore } from '@/store/ChatStore'
import type { Message } from '@/lib/types'
import { uid } from '@/lib/utils'
import { MessageItem } from './MessageItem'
import { Composer } from './Composer'
import { ExplainPopover } from './ExplainPopover'
import { useAutoScroll } from '@/hooks/useAutoScroll'

const SUGGESTIONS = [
  { icon: Bug, text: 'Why does useEffect run twice in React dev mode?' },
  { icon: Database, text: 'Design a Postgres schema for a multi-tenant SaaS app' },
  { icon: Gauge, text: 'How do I find a memory leak in a Node.js service?' },
  { icon: ShieldCheck, text: 'Review this for security issues: app.get("/user", (req, res) => db.query(`SELECT * FROM users WHERE id = ${req.query.id}`))' },
]

export function ChatPanel() {
  const { dispatch } = useChatStore()
  const { conversation, send, stop, regenerate, isStreaming, error, clearError } = useChat()
  const messages = conversation?.messages ?? []
  const listRef = useRef<HTMLDivElement>(null)
  const lastContent = messages[messages.length - 1]?.content
  const { atBottom, scrollToBottom } = useAutoScroll(listRef, [messages.length, lastContent])

  // Always jump to the bottom when switching conversations.
  useEffect(() => {
    scrollToBottom('auto')
  }, [conversation?.id, scrollToBottom])

  const saveToCards = useCallback(
    (message: Message) => {
      dispatch({
        type: 'card/add',
        card: {
          id: uid(),
          title: conversation?.title ?? 'Saved reply',
          content: message.content,
          sourceMessageId: message.id,
          createdAt: Date.now(),
        },
      })
    },
    [conversation?.title, dispatch],
  )

  return (
    <section className="relative flex min-h-0 flex-1 flex-col" aria-label="Chat">
      <div ref={listRef} className="scrollbar-thin flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <EmptyState onPick={send} />
        ) : (
          <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6">
            {messages.map((m, i) => (
              <MessageItem
                key={m.id}
                message={m}
                isLast={i === messages.length - 1}
                canRegenerate={!isStreaming}
                onSave={saveToCards}
                onRegenerate={regenerate}
              />
            ))}
          </div>
        )}
      </div>

      {!atBottom && messages.length > 0 && (
        <button
          type="button"
          onClick={() => scrollToBottom()}
          className="absolute bottom-28 left-1/2 -translate-x-1/2 rounded-full border border-border bg-card p-2 shadow-md hover:bg-accent"
          aria-label="Scroll to latest message"
        >
          <ArrowDown className="h-4 w-4" />
        </button>
      )}

      {error && (
        <div role="alert" className="mx-auto mb-2 flex w-full max-w-3xl items-center justify-between gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
          <button type="button" onClick={clearError} className="icon-btn text-destructive" aria-label="Dismiss error">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <Composer onSend={send} onStop={stop} isStreaming={isStreaming} autoFocusKey={conversation?.id} />
      <ExplainPopover containerRef={listRef} onAskInChat={send} />
    </section>
  )
}

function EmptyState({ onPick }: { onPick: (text: string) => void }) {
  return (
    <div className="mx-auto flex h-full max-w-2xl flex-col items-center justify-center px-4 py-12 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Bot className="h-6 w-6" />
      </div>
      <h2 className="text-xl font-semibold">How can I help you ship today?</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Debugging, reviews, architecture. Save good answers as cards and select any text for a quick explanation.
      </p>
      <div className="mt-8 grid w-full gap-2 sm:grid-cols-2">
        {SUGGESTIONS.map(({ icon: Icon, text }) => (
          <button
            key={text}
            type="button"
            onClick={() => onPick(text)}
            className="flex items-start gap-3 rounded-xl border border-border bg-card p-3 text-left text-sm transition-colors hover:border-primary/40 hover:bg-accent"
          >
            <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span className="line-clamp-2">{text}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
