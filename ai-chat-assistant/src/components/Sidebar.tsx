'use client'

import { useMemo, useState } from 'react'
import { Check, MessageSquare, Pencil, Plus, Search, Trash2, X } from 'lucide-react'
import { useChatStore } from '@/store/ChatStore'
import { cn, relativeTime } from '@/lib/utils'

interface SidebarProps {
  open: boolean
  onClose: () => void
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const { state, dispatch, hydrated } = useChatStore()
  const [query, setQuery] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return state.conversations
    return state.conversations.filter(
      (c) => c.title.toLowerCase().includes(q) || c.messages.some((m) => m.content.toLowerCase().includes(q)),
    )
  }, [state.conversations, query])

  const select = (id: string | null) => {
    dispatch({ type: 'conversation/select', id })
    // On mobile the sidebar is an overlay — close it after choosing.
    if (window.innerWidth < 1024) onClose()
  }

  const commitRename = () => {
    if (editingId) dispatch({ type: 'conversation/rename', id: editingId, title: draft })
    setEditingId(null)
  }

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className={cn('fixed inset-0 z-30 bg-black/40 transition-opacity lg:hidden', open ? 'opacity-100' : 'pointer-events-none opacity-0')}
        onClick={onClose}
        aria-hidden
      />
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-border bg-muted/40 backdrop-blur transition-transform duration-200 lg:static lg:z-auto lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full lg:hidden',
        )}
        aria-label="Conversations"
      >
        <div className="flex items-center gap-2 p-3">
          <button
            type="button"
            onClick={() => select(null)}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" /> New chat
          </button>
          <button type="button" onClick={onClose} className="icon-btn lg:hidden" aria-label="Close sidebar">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="relative px-3 pb-2">
          <Search className="pointer-events-none absolute left-6 top-1/2 h-3.5 w-3.5 -translate-y-[70%] text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search chats"
            aria-label="Search chats"
            className="w-full rounded-lg border border-input bg-background py-1.5 pl-8 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <nav className="scrollbar-thin flex-1 overflow-y-auto px-2 pb-3">
          {hydrated && filtered.length === 0 && (
            <p className="px-3 py-8 text-center text-xs text-muted-foreground">
              {query ? 'No chats match your search.' : 'Your conversations will appear here.'}
            </p>
          )}
          <ul className="space-y-0.5">
            {filtered.map((c) => {
              const active = c.id === state.activeId
              const editing = editingId === c.id
              return (
                <li key={c.id}>
                  <div
                    className={cn(
                      'group flex items-center gap-2 rounded-lg px-2 py-2 text-sm transition-colors',
                      active ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/60',
                    )}
                  >
                    <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
                    {editing ? (
                      <form
                        className="flex min-w-0 flex-1 items-center gap-1"
                        onSubmit={(e) => {
                          e.preventDefault()
                          commitRename()
                        }}
                      >
                        <input
                          autoFocus
                          value={draft}
                          onChange={(e) => setDraft(e.target.value)}
                          onKeyDown={(e) => e.key === 'Escape' && setEditingId(null)}
                          onBlur={commitRename}
                          className="min-w-0 flex-1 rounded border border-input bg-background px-1.5 py-0.5 text-sm outline-none"
                          aria-label="Chat title"
                        />
                        <button type="submit" className="icon-btn" aria-label="Save title">
                          <Check className="h-3.5 w-3.5" />
                        </button>
                      </form>
                    ) : (
                      <>
                        <button type="button" onClick={() => select(c.id)} className="min-w-0 flex-1 text-left">
                          <span className="block truncate">{c.title}</span>
                          <span className="block text-[11px] text-muted-foreground">
                            {relativeTime(c.updatedAt)} · {c.messages.length} msg
                          </span>
                        </button>
                        <div className="flex opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
                          <button
                            type="button"
                            className="icon-btn"
                            onClick={() => {
                              setEditingId(c.id)
                              setDraft(c.title)
                            }}
                            aria-label={`Rename ${c.title}`}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            className="icon-btn hover:text-destructive"
                            onClick={() => {
                              if (confirm(`Delete "${c.title}"?`)) dispatch({ type: 'conversation/delete', id: c.id })
                            }}
                            aria-label={`Delete ${c.title}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        </nav>

        <p className="border-t border-border px-4 py-2 text-[11px] text-muted-foreground">Chats are saved in this browser only.</p>
      </aside>
    </>
  )
}
