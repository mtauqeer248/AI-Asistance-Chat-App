import type { Conversation } from '@/lib/types'

export const DEFAULT_TITLE = 'New chat'

export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ')
}

export function uid(): string {
  return crypto.randomUUID()
}

/** Short title from the first user message: first ~6 words, max 48 chars. */
export function titleFrom(content: string): string {
  const clean = content.replace(/[`#*_>\s]+/g, ' ').trim()
  if (!clean) return DEFAULT_TITLE
  const words = clean.split(' ').slice(0, 6).join(' ')
  const title = words.length > 48 ? words.slice(0, 48).trimEnd() : words
  return title.length < clean.length ? `${title}…` : title
}

export function relativeTime(timestamp: number, now = Date.now()): string {
  const minutes = Math.floor((now - timestamp) / 60_000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  if (hours < 48) return 'Yesterday'
  if (hours < 24 * 7) return `${Math.floor(hours / 24)}d ago`
  return new Date(timestamp).toLocaleDateString()
}

export function conversationToMarkdown(conversation: Conversation): string {
  const lines = [`# ${conversation.title}`, '']
  for (const m of conversation.messages) {
    lines.push(`## ${m.role === 'user' ? 'You' : 'Assistant'}`, '', m.content, '')
  }
  return lines.join('\n')
}

export function downloadText(filename: string, text: string, type = 'text/markdown') {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 40) || 'chat'
  )
}
