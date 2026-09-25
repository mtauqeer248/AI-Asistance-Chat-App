'use client'

import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { ArrowUp, Square } from 'lucide-react'
import { MAX_MESSAGE_CHARS } from '@/lib/schema'
import { cn } from '@/lib/utils'

interface ComposerProps {
  onSend: (text: string) => void
  onStop: () => void
  isStreaming: boolean
  autoFocusKey?: string | null
}

export function Composer({ onSend, onStop, isStreaming, autoFocusKey }: ComposerProps) {
  const [value, setValue] = useState('')
  const ref = useRef<HTMLTextAreaElement>(null)
  const tooLong = value.length > MAX_MESSAGE_CHARS

  // Refocus when switching conversations.
  useEffect(() => {
    ref.current?.focus()
  }, [autoFocusKey])

  // Auto-grow up to ~8 lines.
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`
  }, [value])

  const submit = () => {
    if (!value.trim() || isStreaming || tooLong) return
    onSend(value)
    setValue('')
  }

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter sends, Shift+Enter inserts a newline. Ignore Enter while an IME is composing.
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      submit()
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
      className="border-t border-border bg-background/80 p-3 backdrop-blur sm:p-4"
    >
      <div className="mx-auto flex max-w-3xl items-end gap-2 rounded-2xl border border-input bg-card p-2 shadow-sm focus-within:ring-2 focus-within:ring-ring">
        <textarea
          ref={ref}
          rows={1}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Ask anything about code…"
          aria-label="Message"
          className="max-h-[200px] flex-1 resize-none bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-muted-foreground"
        />
        {isStreaming ? (
          <button type="button" onClick={onStop} className="send-btn bg-foreground text-background" aria-label="Stop generating" title="Stop">
            <Square className="h-3.5 w-3.5 fill-current" />
          </button>
        ) : (
          <button type="submit" disabled={!value.trim() || tooLong} className="send-btn bg-primary text-primary-foreground" aria-label="Send message">
            <ArrowUp className="h-4 w-4" />
          </button>
        )}
      </div>
      <p className={cn('mx-auto mt-1.5 max-w-3xl px-2 text-center text-[11px] text-muted-foreground', tooLong && 'text-destructive')}>
        {tooLong
          ? `Message is too long (${value.length.toLocaleString()} / ${MAX_MESSAGE_CHARS.toLocaleString()} characters)`
          : 'Enter to send · Shift+Enter for a new line · Select text in a reply to explain it'}
      </p>
    </form>
  )
}
