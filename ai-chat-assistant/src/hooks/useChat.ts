'use client'

import { useCallback, useRef, useState } from 'react'
import { useChatStore } from '@/store/ChatStore'
import { ChatApiError, isAbortError, streamChat } from '@/lib/stream-client'
import type { Conversation, Message } from '@/lib/types'
import { DEFAULT_TITLE, uid } from '@/lib/utils'

/** How many previous messages are sent as context. Keeps requests small and cheap. */
const CONTEXT_WINDOW = 20

/**
 * Owns the send → stream → finish lifecycle for the active conversation.
 * UI components only call `send`, `stop` and `regenerate`.
 */
export function useChat() {
  const { state, dispatch } = useChatStore()
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const active = state.conversations.find((c) => c.id === state.activeId) ?? null

  const run = useCallback(
    async (conversationId: string, history: Message[]) => {
      const assistantId = uid()
      dispatch({
        type: 'message/add',
        conversationId,
        message: { id: assistantId, role: 'assistant', content: '', createdAt: Date.now(), status: 'streaming' },
      })

      const controller = new AbortController()
      abortRef.current = controller
      setIsStreaming(true)
      setError(null)

      try {
        await streamChat({
          messages: history
            .filter((m) => m.status !== 'error' && m.content.trim())
            .slice(-CONTEXT_WINDOW)
            .map(({ role, content }) => ({ role, content })),
          signal: controller.signal,
          onToken: (token) => dispatch({ type: 'message/append', conversationId, messageId: assistantId, token }),
        })
        dispatch({ type: 'message/finish', conversationId, messageId: assistantId, status: 'done' })
      } catch (err) {
        if (isAbortError(err)) {
          dispatch({ type: 'message/finish', conversationId, messageId: assistantId, status: 'stopped' })
        } else {
          const message = err instanceof ChatApiError ? err.message : 'Network error. Check your connection and retry.'
          setError(message)
          dispatch({ type: 'message/finish', conversationId, messageId: assistantId, status: 'error', content: message })
        }
      } finally {
        abortRef.current = null
        setIsStreaming(false)
      }
    },
    [dispatch],
  )

  const send = useCallback(
    (text: string) => {
      const content = text.trim()
      if (!content || isStreaming) return

      let conversation: Conversation | null = active
      if (!conversation) {
        const now = Date.now()
        conversation = { id: uid(), title: DEFAULT_TITLE, messages: [], createdAt: now, updatedAt: now }
        dispatch({ type: 'conversation/create', conversation })
      }

      const userMessage: Message = { id: uid(), role: 'user', content, createdAt: Date.now(), status: 'done' }
      dispatch({ type: 'message/add', conversationId: conversation.id, message: userMessage })
      void run(conversation.id, [...conversation.messages, userMessage])
    },
    [active, dispatch, isStreaming, run],
  )

  /** Drops the last assistant reply and asks again with the same history. */
  const regenerate = useCallback(() => {
    if (!active || isStreaming) return
    const lastUserIdx = active.messages.map((m) => m.role).lastIndexOf('user')
    if (lastUserIdx === -1) return
    const lastUser = active.messages[lastUserIdx]
    dispatch({ type: 'message/truncateAfter', conversationId: active.id, messageId: lastUser.id })
    void run(active.id, active.messages.slice(0, lastUserIdx + 1))
  }, [active, dispatch, isStreaming, run])

  const stop = useCallback(() => abortRef.current?.abort(), [])

  return { conversation: active, send, stop, regenerate, isStreaming, error, clearError: () => setError(null) }
}
