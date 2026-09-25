'use client'

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import { BookOpen, MessageSquarePlus, Sparkles, X } from 'lucide-react'
import { isAbortError, streamChat } from '@/lib/stream-client'
import { Markdown } from '@/components/ui/Markdown'

interface ExplainPopoverProps {
  /** Only selections inside this element trigger the popover. */
  containerRef: RefObject<HTMLElement>
  onAskInChat: (text: string) => void
}

type Anchor = { text: string; x: number; y: number }

const POPOVER_WIDTH = 360
const MAX_SELECTION = 500

/**
 * Select text in an assistant reply → an "Explain" chip appears → click it to
 * stream a short explanation. The request is aborted if the popover closes early.
 */
export function ExplainPopover({ containerRef, onAskInChat }: ExplainPopoverProps) {
  const [anchor, setAnchor] = useState<Anchor | null>(null)
  const [open, setOpen] = useState(false)
  const [explanation, setExplanation] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const abortRef = useRef<AbortController | null>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  const close = useCallback(() => {
    abortRef.current?.abort()
    setOpen(false)
    setAnchor(null)
    setExplanation('')
    setStatus('idle')
  }, [])

  // Track selections inside the message list.
  useEffect(() => {
    const onMouseUp = (e: MouseEvent) => {
      if (popoverRef.current?.contains(e.target as Node)) return
      // Let the browser finalise the selection first.
      requestAnimationFrame(() => {
        const selection = window.getSelection()
        const text = selection?.toString().trim() ?? ''
        const container = containerRef.current
        if (!selection || !text || text.length < 2 || !container || !container.contains(selection.anchorNode)) {
          if (!open) setAnchor(null)
          return
        }
        const rect = selection.getRangeAt(0).getBoundingClientRect()
        setAnchor({ text: text.slice(0, MAX_SELECTION), x: rect.left + rect.width / 2, y: rect.bottom })
      })
    }
    document.addEventListener('mouseup', onMouseUp)
    return () => document.removeEventListener('mouseup', onMouseUp)
  }, [containerRef, open])

  // Escape / outside click closes.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    const onDown = (e: MouseEvent) => {
      if (!popoverRef.current?.contains(e.target as Node)) close()
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onDown)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onDown)
    }
  }, [open, close])

  useEffect(() => () => abortRef.current?.abort(), [])

  const explain = async () => {
    if (!anchor) return
    setOpen(true)
    setStatus('loading')
    setExplanation('')
    const controller = new AbortController()
    abortRef.current = controller
    try {
      await streamChat({
        mode: 'explain',
        messages: [{ role: 'user', content: anchor.text }],
        signal: controller.signal,
        onToken: (t) => setExplanation((prev) => prev + t),
      })
      setStatus('done')
    } catch (err) {
      if (isAbortError(err)) return
      setStatus('error')
      setExplanation(err instanceof Error ? err.message : 'Could not load an explanation.')
    }
  }

  if (!anchor) return null

  const left = Math.max(12, Math.min(anchor.x - POPOVER_WIDTH / 2, window.innerWidth - POPOVER_WIDTH - 12))
  const top = Math.min(anchor.y + 8, window.innerHeight - 80)

  if (!open) {
    return (
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault() /* keep the selection */}
        onClick={explain}
        className="fixed z-50 flex items-center gap-1.5 rounded-full bg-foreground px-3 py-1.5 text-xs font-medium text-background shadow-lg animate-fade-in"
        style={{ left: anchor.x - 40, top }}
      >
        <Sparkles className="h-3.5 w-3.5" /> Explain
      </button>
    )
  }

  return (
    <div
      ref={popoverRef}
      role="dialog"
      aria-label="Explanation"
      className="fixed z-50 flex max-h-[min(420px,60vh)] flex-col overflow-hidden rounded-xl border border-border bg-card shadow-2xl animate-fade-in"
      style={{ left, top, width: POPOVER_WIDTH, maxWidth: 'calc(100vw - 24px)' }}
    >
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="flex items-center gap-2 text-sm font-medium">
          <BookOpen className="h-4 w-4 text-primary" /> Quick explanation
        </span>
        <button type="button" onClick={close} className="icon-btn" aria-label="Close">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-3 text-sm">
        <blockquote className="mb-3 border-l-2 border-primary pl-3 text-xs italic text-muted-foreground line-clamp-3">
          {anchor.text}
        </blockquote>
        {status === 'error' ? (
          <p className="text-destructive">{explanation}</p>
        ) : explanation ? (
          <Markdown content={explanation} className={status === 'loading' ? 'streaming-cursor' : undefined} />
        ) : (
          <p className="text-muted-foreground">Thinking…</p>
        )}
      </div>
      <div className="border-t border-border px-3 py-2">
        <button
          type="button"
          disabled={status === 'loading'}
          onClick={() => {
            onAskInChat(`Explain "${anchor.text}" in more depth, with an example.`)
            close()
          }}
          className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline disabled:opacity-50"
        >
          <MessageSquarePlus className="h-3.5 w-3.5" /> Continue in chat
        </button>
      </div>
    </div>
  )
}
