'use client'

import { useEffect, useState } from 'react'
import { Bookmark, Download, PanelLeft } from 'lucide-react'
import { ChatStoreProvider, useActiveConversation, useChatStore } from '@/store/ChatStore'
import { Sidebar } from '@/components/Sidebar'
import { ChatPanel } from '@/components/chat/ChatPanel'
import { CardsPanel } from '@/components/cards/CardsPanel'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { conversationToMarkdown, downloadText, slugify } from '@/lib/utils'

export default function Home() {
  return (
    <ChatStoreProvider>
      <AppShell />
    </ChatStoreProvider>
  )
}

function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [cardsOpen, setCardsOpen] = useState(false)
  const { state } = useChatStore()
  const conversation = useActiveConversation()

  // Panels start open on wide screens, closed on phones.
  useEffect(() => {
    setSidebarOpen(window.innerWidth >= 1024)
    setCardsOpen(window.innerWidth >= 1280)
  }, [])

  return (
    <div className="flex h-dvh overflow-hidden bg-background text-foreground">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-3">
          <button type="button" className="icon-btn" onClick={() => setSidebarOpen((o) => !o)} aria-label="Toggle sidebar">
            <PanelLeft className="h-4 w-4" />
          </button>
          <h1 className="min-w-0 flex-1 truncate text-sm font-semibold">{conversation?.title ?? 'DevAssist'}</h1>
          {conversation && conversation.messages.length > 0 && (
            <button
              type="button"
              className="icon-btn"
              onClick={() => downloadText(`${slugify(conversation.title)}.md`, conversationToMarkdown(conversation))}
              aria-label="Export chat as Markdown"
              title="Export chat (.md)"
            >
              <Download className="h-4 w-4" />
            </button>
          )}
          <ThemeToggle />
          <button
            type="button"
            className="icon-btn relative"
            onClick={() => setCardsOpen((o) => !o)}
            aria-label="Toggle saved cards"
            title="Saved cards"
          >
            <Bookmark className="h-4 w-4" />
            {state.cards.length > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] text-primary-foreground">
                {state.cards.length}
              </span>
            )}
          </button>
        </header>

        <ChatPanel />
      </main>

      <CardsPanel open={cardsOpen} onClose={() => setCardsOpen(false)} />
    </div>
  )
}
