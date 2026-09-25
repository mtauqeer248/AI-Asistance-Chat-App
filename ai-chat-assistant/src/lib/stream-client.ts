import type { ChatMode, ChatRequestMessage } from '@/lib/types'

export class ChatApiError extends Error {
  constructor(
    message: string,
    public readonly type: string,
    public readonly status: number,
  ) {
    super(message)
    this.name = 'ChatApiError'
  }
}

interface StreamChatOptions {
  messages: ChatRequestMessage[]
  mode?: ChatMode
  signal?: AbortSignal
  onToken: (token: string) => void
}

/**
 * POSTs to /api/chat and feeds each decoded chunk to `onToken`.
 * Resolves with the full text once the stream ends.
 * Rejects with ChatApiError for HTTP errors, or AbortError if `signal` fires.
 */
export async function streamChat({ messages, mode = 'chat', signal, onToken }: StreamChatOptions): Promise<string> {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode, messages }),
    signal,
  })

  if (!res.ok || !res.body) {
    const data = await res.json().catch(() => ({}))
    throw new ChatApiError(data.error ?? `Request failed (${res.status})`, data.type ?? 'unknown', res.status)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let full = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    // `stream: true` keeps multi-byte characters intact across chunk boundaries.
    const text = decoder.decode(value, { stream: true })
    if (text) {
      full += text
      onToken(text)
    }
  }
  return full
}

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}
