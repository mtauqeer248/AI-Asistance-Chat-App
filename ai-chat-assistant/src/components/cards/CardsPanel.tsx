'use client'

import { useState } from 'react'
import { Bookmark, ChevronDown, Download, GripVertical, Trash2, X } from 'lucide-react'
import { useChatStore } from '@/store/ChatStore'
import { Markdown } from '@/components/ui/Markdown'
import { CopyButton } from '@/components/ui/CopyButton'
import { MESSAGE_DRAG_TYPE } from '@/components/chat/MessageItem'
import { cn, downloadText, relativeTime, slugify, uid } from '@/lib/utils'

const CARD_DRAG_TYPE = 'application/x-content-card'

interface CardsPanelProps {
  open: boolean
  onClose: () => void
}

export function CardsPanel({ open, onClose }: CardsPanelProps) {
  const { state, dispatch } = useChatStore()
  const [dropActive, setDropActive] = useState(false)
  const [overId, setOverId] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const findMessage = (messageId: string) => {
    for (const c of state.conversations) {
      const m = c.messages.find((msg) => msg.id === messageId)
      if (m) return { message: m, conversation: c }
    }
    return null
  }

  const onPanelDrop = (e: React.DragEvent) => {
    setDropActive(false)
    const messageId = e.dataTransfer.getData(MESSAGE_DRAG_TYPE)
    if (!messageId) return
    e.preventDefault()
    const found = findMessage(messageId)
    if (!found) return
    dispatch({
      type: 'card/add',
      card: {
        id: uid(),
        title: found.conversation.title,
        content: found.message.content,
        sourceMessageId: messageId,
        createdAt: Date.now(),
      },
    })
  }

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  return (
    <aside
      className={cn(
        'fixed inset-y-0 right-0 z-40 flex w-[22rem] max-w-[90vw] flex-col border-l border-border bg-muted/40 backdrop-blur transition-transform duration-200 xl:static xl:z-auto',
        open ? 'translate-x-0' : 'translate-x-full xl:hidden',
      )}
      aria-label="Saved cards"
    >
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Bookmark className="h-4 w-4 text-primary" /> Saved cards
            <span className="rounded-full bg-accent px-2 text-xs font-normal text-muted-foreground">{state.cards.length}</span>
          </h2>
          <p className="text-[11px] text-muted-foreground">Drag replies here or use the bookmark icon</p>
        </div>
        <button type="button" onClick={onClose} className="icon-btn" aria-label="Close saved cards">
          <X className="h-4 w-4" />
        </button>
      </header>

      <div
        className={cn('scrollbar-thin flex-1 overflow-y-auto p-3 transition-colors', dropActive && 'bg-primary/5 outline-dashed outline-2 -outline-offset-8 outline-primary/50')}
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes(MESSAGE_DRAG_TYPE)) {
            e.preventDefault()
            e.dataTransfer.dropEffect = 'copy'
            setDropActive(true)
          }
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropActive(false)
        }}
        onDrop={onPanelDrop}
      >
        {state.cards.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center px-6 text-center text-sm text-muted-foreground">
            <Bookmark className="mb-3 h-8 w-8 opacity-40" />
            {dropActive ? 'Drop to save this reply' : 'Save useful answers to build your own snippet library.'}
          </div>
        )}

        <ul className="space-y-3">
          {state.cards.map((card) => {
            const isOpen = expanded.has(card.id)
            return (
              <li
                key={card.id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData(CARD_DRAG_TYPE, card.id)
                  e.dataTransfer.effectAllowed = 'move'
                }}
                onDragOver={(e) => {
                  if (e.dataTransfer.types.includes(CARD_DRAG_TYPE)) {
                    e.preventDefault()
                    e.stopPropagation()
                    setOverId(card.id)
                  }
                }}
                onDragLeave={() => setOverId(null)}
                onDrop={(e) => {
                  const fromId = e.dataTransfer.getData(CARD_DRAG_TYPE)
                  if (!fromId) return
                  e.preventDefault()
                  e.stopPropagation()
                  setOverId(null)
                  dispatch({ type: 'card/move', fromId, toId: card.id })
                }}
                className={cn(
                  'group rounded-xl border border-border bg-card shadow-sm transition-all',
                  overId === card.id && 'border-primary ring-2 ring-primary/30',
                )}
              >
                <div className="flex items-center gap-1 border-b border-border px-2 py-1.5">
                  <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-muted-foreground/60" aria-hidden />
                  <span className="min-w-0 flex-1 truncate text-xs font-medium">{card.title}</span>
                  <span className="text-[10px] text-muted-foreground">{relativeTime(card.createdAt)}</span>
                  <CopyButton getText={() => card.content} label="Copy card" />
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() => downloadText(`${slugify(card.title)}.md`, card.content)}
                    aria-label="Download card as Markdown"
                    title="Download .md"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    className="icon-btn hover:text-destructive"
                    onClick={() => dispatch({ type: 'card/delete', id: card.id })}
                    aria-label="Delete card"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className={cn('relative overflow-hidden px-3 py-2 text-xs', !isOpen && 'max-h-40')}>
                  <Markdown content={card.content} />
                  {!isOpen && <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-card" />}
                </div>
                <button
                  type="button"
                  onClick={() => toggle(card.id)}
                  className="flex w-full items-center justify-center gap-1 border-t border-border py-1 text-[11px] text-muted-foreground hover:bg-accent"
                >
                  <ChevronDown className={cn('h-3 w-3 transition-transform', isOpen && 'rotate-180')} />
                  {isOpen ? 'Collapse' : 'Expand'}
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </aside>
  )
}
