import type { ContentCard, Conversation, Message, MessageStatus } from '@/lib/types'
import { titleFrom } from '@/lib/utils'

export interface ChatState {
  conversations: Conversation[]
  activeId: string | null
  cards: ContentCard[]
}

export const initialState: ChatState = { conversations: [], activeId: null, cards: [] }

export type ChatAction =
  | { type: 'hydrate'; state: ChatState }
  | { type: 'conversation/create'; conversation: Conversation }
  | { type: 'conversation/select'; id: string | null }
  | { type: 'conversation/delete'; id: string }
  | { type: 'conversation/rename'; id: string; title: string }
  | { type: 'message/add'; conversationId: string; message: Message }
  | { type: 'message/append'; conversationId: string; messageId: string; token: string }
  | { type: 'message/finish'; conversationId: string; messageId: string; status: MessageStatus; content?: string }
  | { type: 'message/truncateAfter'; conversationId: string; messageId: string }
  | { type: 'card/add'; card: ContentCard }
  | { type: 'card/delete'; id: string }
  | { type: 'card/move'; fromId: string; toId: string }

/** Applies `fn` to one conversation and bumps its updatedAt. */
function updateConversation(state: ChatState, id: string, fn: (c: Conversation) => Conversation): ChatState {
  return {
    ...state,
    conversations: state.conversations.map((c) => (c.id === id ? { ...fn(c), updatedAt: Date.now() } : c)),
  }
}

function updateMessage(state: ChatState, conversationId: string, messageId: string, fn: (m: Message) => Message) {
  return updateConversation(state, conversationId, (c) => ({
    ...c,
    messages: c.messages.map((m) => (m.id === messageId ? fn(m) : m)),
  }))
}

/** Pure reducer: every state transition lives here, which makes it trivial to unit test. */
export function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'hydrate':
      return action.state

    case 'conversation/create':
      return { ...state, conversations: [action.conversation, ...state.conversations], activeId: action.conversation.id }

    case 'conversation/select':
      return { ...state, activeId: action.id }

    case 'conversation/delete': {
      const conversations = state.conversations.filter((c) => c.id !== action.id)
      const activeId = state.activeId === action.id ? (conversations[0]?.id ?? null) : state.activeId
      return { ...state, conversations, activeId }
    }

    case 'conversation/rename':
      return updateConversation(state, action.id, (c) => ({ ...c, title: action.title.trim() || c.title }))

    case 'message/add': {
      const next = updateConversation(state, action.conversationId, (c) => {
        const isFirstUserMessage = action.message.role === 'user' && !c.messages.some((m) => m.role === 'user')
        return {
          ...c,
          title: isFirstUserMessage ? titleFrom(action.message.content) : c.title,
          messages: [...c.messages, action.message],
        }
      })
      // Most recently active conversation floats to the top of the sidebar.
      const idx = next.conversations.findIndex((c) => c.id === action.conversationId)
      if (idx > 0) {
        const conversations = [...next.conversations]
        const [moved] = conversations.splice(idx, 1)
        conversations.unshift(moved)
        return { ...next, conversations }
      }
      return next
    }

    case 'message/append':
      return updateMessage(state, action.conversationId, action.messageId, (m) => ({
        ...m,
        content: m.content + action.token,
      }))

    case 'message/finish':
      return updateMessage(state, action.conversationId, action.messageId, (m) => ({
        ...m,
        status: action.status,
        content: action.content ?? m.content,
      }))

    case 'message/truncateAfter':
      return updateConversation(state, action.conversationId, (c) => {
        const idx = c.messages.findIndex((m) => m.id === action.messageId)
        return idx === -1 ? c : { ...c, messages: c.messages.slice(0, idx + 1) }
      })

    case 'card/add':
      if (action.card.sourceMessageId && state.cards.some((c) => c.sourceMessageId === action.card.sourceMessageId)) {
        return state // already saved
      }
      return { ...state, cards: [action.card, ...state.cards] }

    case 'card/delete':
      return { ...state, cards: state.cards.filter((c) => c.id !== action.id) }

    case 'card/move': {
      const from = state.cards.findIndex((c) => c.id === action.fromId)
      const to = state.cards.findIndex((c) => c.id === action.toId)
      if (from === -1 || to === -1 || from === to) return state
      const cards = [...state.cards]
      const [moved] = cards.splice(from, 1)
      cards.splice(to, 0, moved)
      return { ...state, cards }
    }

    default:
      return state
  }
}
