'use client'

import { createContext, useContext, useEffect, useReducer, useRef, useState, type Dispatch, type ReactNode } from 'react'
import { chatReducer, initialState, type ChatAction, type ChatState } from './chat-reducer'

const STORAGE_KEY = 'ai-chat-assistant:v2'
const SAVE_DEBOUNCE_MS = 400

interface ChatStoreValue {
  state: ChatState
  dispatch: Dispatch<ChatAction>
  hydrated: boolean
}

const ChatStoreContext = createContext<ChatStoreValue | null>(null)

function load(): ChatState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const saved = JSON.parse(raw) as ChatState
    // A reply that was mid-stream when the tab closed can't be resumed.
    saved.conversations = saved.conversations.map((c) => ({
      ...c,
      messages: c.messages.map((m) => (m.status === 'streaming' ? { ...m, status: 'stopped' } : m)),
    }))
    return saved
  } catch {
    return null
  }
}

export function ChatStoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(chatReducer, initialState)
  const [hydrated, setHydrated] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout>>()

  // Load after mount (not during render) so server and client HTML match.
  useEffect(() => {
    const saved = load()
    if (saved) dispatch({ type: 'hydrate', state: saved })
    setHydrated(true)
  }, [])

  // Debounced save: streaming dispatches many updates per second; we write at most every 400ms.
  useEffect(() => {
    if (!hydrated) return
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
      } catch {
        // Quota exceeded or storage disabled — the app still works in-memory.
      }
    }, SAVE_DEBOUNCE_MS)
  }, [state, hydrated])

  return <ChatStoreContext.Provider value={{ state, dispatch, hydrated }}>{children}</ChatStoreContext.Provider>
}

export function useChatStore(): ChatStoreValue {
  const ctx = useContext(ChatStoreContext)
  if (!ctx) throw new Error('useChatStore must be used inside <ChatStoreProvider>')
  return ctx
}

export function useActiveConversation() {
  const { state } = useChatStore()
  return state.conversations.find((c) => c.id === state.activeId) ?? null
}
