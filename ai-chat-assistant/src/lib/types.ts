export type Role = 'user' | 'assistant'

export type MessageStatus = 'done' | 'streaming' | 'error' | 'stopped'

export interface Message {
  id: string
  role: Role
  content: string
  /** Unix ms — numbers survive JSON/localStorage round-trips, Dates don't. */
  createdAt: number
  status?: MessageStatus
}

export interface Conversation {
  id: string
  title: string
  messages: Message[]
  createdAt: number
  updatedAt: number
}

export interface ContentCard {
  id: string
  title: string
  content: string
  sourceMessageId?: string
  createdAt: number
}

/** Wire format for the /api/chat request. */
export interface ChatRequestMessage {
  role: Role
  content: string
}

export type ChatMode = 'chat' | 'explain'
