/* eslint-disable @typescript-eslint/no-unused-vars */
'use client'

import { useState, useRef } from 'react'
import { Trash2, GripVertical, Plus, Minus, Bot, User, MessageSquare } from 'lucide-react'
import { ContentCard } from '@/app/page'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import 'highlight.js/styles/github-dark.css'

interface ContentCardsProps {
  cards: ContentCard[]
  onDeleteCard: (cardId: string) => void
  onReorderCards: (newCards: ContentCard[]) => void
  onCreateCardFromDrop?: (messageId: string) => void
}


const parseConversationContent = (content: string) => {
  const lines = content.split('\n').filter(line => line.trim())
  const messages: Array<{ role: 'user' | 'assistant', content: string }> = []
  
   let currentMessage: { role: 'user' | 'assistant', content: string } = { role: 'assistant', content: '' }
  
  for (const line of lines) {
    // Check for user indicators
    if (line.match(/^(User:|Human:|You:|Q:)/i)) {
      if (currentMessage.content.trim()) {
        messages.push({ ...currentMessage })
      }
      currentMessage = { role: 'user', content: line.replace(/^(User:|Human:|You:|Q:)\s*/i, '') }
    }
    // Check for assistant indicators
    else if (line.match(/^(Assistant:|AI:|Bot:|A:)/i)) {
      if (currentMessage.content.trim()) {
        messages.push({ ...currentMessage })
      }
      currentMessage = { role: 'assistant', content: line.replace(/^(Assistant:|AI:|Bot:|A:)\s*/i, '') }
    }
    else {
      // Continue current message
      if (currentMessage.content) {
        currentMessage.content += '\n' + line
      } else {
        currentMessage.content = line
      }
    }
  }
  
  if (currentMessage.content.trim()) {
    messages.push(currentMessage)
  }
  
  // If no conversation pattern detected, treat as single assistant message
  if (messages.length === 0) {
    return [{ role: 'assistant' as const, content }]
  }
  
  return messages
}

export function ContentCards({ cards, onDeleteCard, onReorderCards, onCreateCardFromDrop }: ContentCardsProps) {
  const [draggedCard, setDraggedCard] = useState<string | null>(null)
  const [draggedOverCard, setDraggedOverCard] = useState<string | null>(null)
  const [isDropZoneActive, setIsDropZoneActive] = useState(false)
  const [collapsedCards, setCollapsedCards] = useState<Set<string>>(new Set())
  const dropZoneRef = useRef<HTMLDivElement>(null)

  const handleExternalDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    if (!e.dataTransfer.types.includes('application/card-reorder')) {
      e.dataTransfer.dropEffect = 'copy'
      setIsDropZoneActive(true)
    }
  }

  const handleExternalDragLeave = (e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes('application/card-reorder')) {
      const rect = e.currentTarget.getBoundingClientRect()
      const x = e.clientX
      const y = e.clientY
      
      if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
        setIsDropZoneActive(false)
      }
    }
  }

  const handleExternalDrop = (e: React.DragEvent) => {
    e.preventDefault()
    
    if (!e.dataTransfer.types.includes('application/card-reorder')) {
      setIsDropZoneActive(false)
      
      const messageId = e.dataTransfer.getData('text/plain')
      if (messageId && onCreateCardFromDrop) {
        onCreateCardFromDrop(messageId)
      }
    }
  }

  const handleCardDragStart = (e: React.DragEvent, cardId: string) => {
    setDraggedCard(cardId)
    e.dataTransfer.setData('application/card-reorder', cardId)
    e.dataTransfer.effectAllowed = 'move'
    
    const element = e.currentTarget as HTMLElement
    element.style.opacity = '0.5'
  }

  const handleCardDragEnd = (e: React.DragEvent) => {
    setDraggedCard(null)
    setDraggedOverCard(null)
    const element = e.currentTarget as HTMLElement
    element.style.opacity = '1'
  }

  const handleCardDragOver = (e: React.DragEvent, cardId: string) => {
    e.preventDefault()
    e.stopPropagation()
    
    const isCardReorder = e.dataTransfer.types.includes('application/card-reorder')
    
    if (isCardReorder) {
      e.dataTransfer.dropEffect = 'move'
      setDraggedOverCard(cardId)
      setIsDropZoneActive(false)
    }
  }

  const handleCardDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX
    const y = e.clientY
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDraggedOverCard(null)
    }
  }

  const handleCardDrop = (e: React.DragEvent, targetCardId: string) => {
    e.preventDefault()
    e.stopPropagation()
    setDraggedOverCard(null)

    const draggedCardId = e.dataTransfer.getData('application/card-reorder')
    if (!draggedCardId || draggedCardId === targetCardId) return

    const draggedIndex = cards.findIndex(card => card.id === draggedCardId)
    const targetIndex = cards.findIndex(card => card.id === targetCardId)

    if (draggedIndex === -1 || targetIndex === -1) return

    const newCards = [...cards]
    const [draggedCard] = newCards.splice(draggedIndex, 1)
    newCards.splice(targetIndex, 0, draggedCard)

    onReorderCards(newCards)
  }

  const toggleCardCollapse = (cardId: string) => {
    setCollapsedCards(prev => {
      const newSet = new Set(prev)
      if (newSet.has(cardId)) {
        newSet.delete(cardId)
      } else {
        newSet.add(cardId)
      }
      return newSet
    })
  }

  const isCardCollapsed = (cardId: string) => collapsedCards.has(cardId)

  return (
    <div className="flex flex-col h-full bg-card rounded-lg border border-border shadow-sm">
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          Content Cards
          <span className="text-sm font-normal text-muted-foreground">
            ({cards.length})
          </span>
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Saved conversations and AI responses
        </p>
      </div>

      <div 
        ref={dropZoneRef}
        className={`flex-1 overflow-y-auto p-4 transition-all duration-200 ${
          isDropZoneActive 
            ? 'bg-primary/5 border-2 border-dashed border-primary/50' 
            : 'scrollbar-thin scrollbar-thumb-border scrollbar-track-card'
        }`}
        onDragOver={handleExternalDragOver}
        onDragLeave={handleExternalDragLeave}
        onDrop={handleExternalDrop}
      >
        {cards.length === 0 && !isDropZoneActive && (
          <div className="text-center text-muted-foreground py-12">
            <div className="mb-4">
              <MessageSquare className="h-12 w-12 mx-auto opacity-50" />
            </div>
            <p className="text-lg mb-2">No saved conversations yet</p>
            <p className="text-sm">
              Drag AI responses from the chat to save them as content cards
            </p>
          </div>
        )}

        {isDropZoneActive && (
          <div className="text-center text-primary py-12 pointer-events-none">
            <div className="mb-4">
              <Plus className="h-12 w-12 mx-auto animate-bounce" />
            </div>
            <p className="text-lg font-medium mb-2">Drop here to create a content card</p>
            <p className="text-sm opacity-80">
              The conversation will be saved for later reference
            </p>
          </div>
        )}

        <div className="space-y-4">
          {cards.map((card) => {
            const collapsed = isCardCollapsed(card.id)
            const messages = parseConversationContent(card.content)
            const displayMessages = collapsed ? messages.slice(0, 2) : messages
            
            return (
              <div
                key={card.id}
                className={`group relative bg-background border border-border rounded-lg shadow-sm cursor-grab active:cursor-grabbing transition-all duration-200 hover:shadow-md hover:border-primary/30 ${
                  draggedOverCard === card.id ? 'border-primary border-2' : ''
                } ${
                  draggedCard === card.id ? 'rotate-1 scale-105' : ''
                }`}
                draggable
                onDragStart={(e) => handleCardDragStart(e, card.id)}
                onDragEnd={handleCardDragEnd}
                onDragOver={(e) => handleCardDragOver(e, card.id)}
                onDragLeave={handleCardDragLeave}
                onDrop={(e) => handleCardDrop(e, card.id)}
              >
                {/* Card Header */}
                <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
                  <div className="flex items-center gap-3">
                    <div className="opacity-0 group-hover:opacity-50 transition-opacity">
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                    </div>
                  <div className="font-medium text-foreground line-clamp-1 flex-1">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeHighlight]}
                        
                        components={{
                          p: ({ children }) => <span>{children}</span>,
                          h1: ({ children }) => <span className="text-lg font-bold">{children}</span>,
                          h2: ({ children }) => <span className="text-base font-semibold">{children}</span>,
                          h3: ({ children }) => <span className="text-sm font-medium">{children}</span>,
                          code: ({ children }) => <code className="bg-muted px-1 py-0.5 rounded text-xs">{children}</code>,
                          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                          em: ({ children }) => <em className="italic">{children}</em>,
                        }}
                      >
                        {card.title}
                      </ReactMarkdown>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {messages.length > 2 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleCardCollapse(card.id)
                        }}
                        className="p-1 hover:bg-muted rounded transition-colors"
                        title={collapsed ? 'Show full conversation' : 'Show preview only'}
                      >
                        {collapsed ? (
                          <Plus className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Minus className="h-4 w-4 text-muted-foreground" />
                        )}
                      </button>
                    )}
                    
                    <span className="text-xs bg-muted px-2 py-1 rounded">
                      {collapsed ? 'Preview' : 'Full'}
                    </span>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onDeleteCard(card.id)
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-destructive/10 hover:text-destructive rounded"
                      title="Delete card"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Chat Messages */}
                <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
                  {displayMessages.map((message, index) => (
                    <div
                      key={index}
                      className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      {message.role === 'assistant' && (
                        <div className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center">
                          <Bot className="h-3 w-3" />
                        </div>
                      )}

                      <div className={`max-w-[85%] ${message.role === 'user' ? 'order-first' : ''}`}>
                        <div
                          className={`p-3 rounded-lg text-sm ${
                            message.role === 'user'
                              ? 'bg-primary text-primary-foreground ml-auto'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {message.role === 'assistant' ? (
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              rehypePlugins={[rehypeHighlight]}
                              
                            >
                              {message.content}
                            </ReactMarkdown>
                          ) : (
                            <p className="whitespace-pre-wrap break-words">{message.content}</p>
                          )}
                        </div>
                      </div>

                      {message.role === 'user' && (
                        <div className="flex-shrink-0 w-6 h-6 bg-secondary text-secondary-foreground rounded-full flex items-center justify-center">
                          <User className="h-3 w-3" />
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {collapsed && messages.length > 2 && (
                    <div className="text-center py-2">
                      <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
                        +{messages.length - 2} more messages
                      </span>
                    </div>
                  )}
                </div>

                {/* Card Footer */}
                <div className="px-4 py-3 border-t border-border bg-muted/20">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {card.createdAt.toLocaleDateString()} at{' '}
                      {card.createdAt.toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="bg-muted px-2 py-1 rounded">
                        {messages.length} message{messages.length !== 1 ? 's' : ''}
                      </span>
                      <span className="bg-muted px-2 py-1 rounded">
                        {card.content.length} chars
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}