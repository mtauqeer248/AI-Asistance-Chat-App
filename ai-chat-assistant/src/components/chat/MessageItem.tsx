'use client'

import { memo } from 'react'
import { AlertCircle, Bookmark, Bot, GripVertical, RotateCcw, User } from 'lucide-react'
import type { Message } from '@/lib/types'
import { Markdown } from '@/components/ui/Markdown'
import { CopyButton } from '@/components/ui/CopyButton'
import { cn } from '@/lib/utils'

export const MESSAGE_DRAG_TYPE = 'application/x-chat-message'

interface MessageItemProps {
  message: Message
  isLast: boolean
  canRegenerate: boolean
  onSave: (message: Message) => void
  onRegenerate: () => void
}

export const MessageItem = memo(function MessageItem({ message, isLast, canRegenerate, onSave, onRegenerate }: MessageItemProps) {
  const isUser = message.role === 'user'
  const isStreaming = message.status === 'streaming'
  const isError = message.status === 'error'
  const canDrag = !isUser && !isStreaming && !isError

  return (
    <div className={cn('group flex gap-3 animate-fade-in', isUser && 'flex-row-reverse')}>
      <div className={cn('avatar', isUser ? 'bg-secondary text-secondary-foreground' : 'bg-primary text-primary-foreground')}>
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>

      <div className={cn('flex min-w-0 max-w-[85%] flex-col', isUser && 'items-end')}>
        {/* The bubble itself is not draggable, so text inside stays selectable (needed for Explain). */}
        <div
          className={cn(
            'rounded-2xl px-4 py-3 text-sm leading-relaxed',
            isUser && 'rounded-tr-sm bg-primary text-primary-foreground',
            !isUser && !isError && 'rounded-tl-sm border border-border bg-card',
            isError && 'rounded-tl-sm border border-destructive/40 bg-destructive/10 text-destructive',
          )}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap break-words">{message.content}</p>
          ) : isError ? (
            <p className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {message.content}
            </p>
          ) : message.content ? (
            <Markdown content={message.content} className={cn(isStreaming && 'streaming-cursor')} />
          ) : (
            <TypingDots />
          )}
        </div>

        {!isUser && !isStreaming && (
          <div className="mt-1 flex items-center gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
            {canDrag && (
              <span
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData(MESSAGE_DRAG_TYPE, message.id)
                  e.dataTransfer.effectAllowed = 'copy'
                }}
                className="icon-btn cursor-grab active:cursor-grabbing"
                title="Drag to saved cards"
                aria-hidden
              >
                <GripVertical className="h-3.5 w-3.5" />
              </span>
            )}
            {!isError && <CopyButton getText={() => message.content} label="Copy reply" />}
            {!isError && (
              <button type="button" className="icon-btn" onClick={() => onSave(message)} aria-label="Save to cards" title="Save to cards">
                <Bookmark className="h-3.5 w-3.5" />
              </button>
            )}
            {isLast && canRegenerate && (
              <button type="button" className="icon-btn" onClick={onRegenerate} aria-label="Regenerate reply" title="Regenerate">
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            )}
            {message.status === 'stopped' && <span className="ml-1 text-xs text-muted-foreground">Stopped</span>}
          </div>
        )}
      </div>
    </div>
  )
})

function TypingDots() {
  return (
    <span className="flex items-center gap-1 py-1" aria-label="Assistant is typing">
      <span className="typing-dot" />
      <span className="typing-dot [animation-delay:150ms]" />
      <span className="typing-dot [animation-delay:300ms]" />
    </span>
  )
}
