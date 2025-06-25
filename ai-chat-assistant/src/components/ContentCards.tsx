/* eslint-disable @typescript-eslint/no-unused-vars */
'use client'

import { useState, useRef } from 'react'
import { Trash2, GripVertical, FileText, Plus } from 'lucide-react'
import { ContentCard } from '@/app/page'

interface ContentCardsProps {
  cards: ContentCard[]
  onDeleteCard: (cardId: string) => void
  onReorderCards: (newCards: ContentCard[]) => void
  onCreateCardFromDrop?: (messageId: string) => void
}

export function ContentCards({ cards, onDeleteCard, onReorderCards, onCreateCardFromDrop }: ContentCardsProps) {
  const [draggedCard, setDraggedCard] = useState<string | null>(null)
  const [draggedOverCard, setDraggedOverCard] = useState<string | null>(null)
  const [isDropZoneActive, setIsDropZoneActive] = useState(false)
  const dropZoneRef = useRef<HTMLDivElement>(null)

 const handleCardDragOverInternal = (e: React.DragEvent, cardId: string) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent bubbling to external drop zone
    const cardData = e.dataTransfer.types.includes('application/card-reorder');
    
    if (cardData) {
      e.dataTransfer.dropEffect = 'move';
      setDraggedOverCard(cardId);
    }
  }
  // Handle external drops (from chat messages)
  const handleExternalDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
    setIsDropZoneActive(true)
  }

  const handleExternalDragLeave = (e: React.DragEvent) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX
    const y = e.clientY
    
    // Only hide drop zone if mouse is actually outside the element
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setIsDropZoneActive(false)
    }
  }

  const handleExternalDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDropZoneActive(false)
    
    const messageId = e.dataTransfer.getData('text/plain')
    if (messageId && onCreateCardFromDrop) {
      onCreateCardFromDrop(messageId)
    }
  }

  // Handle card reordering
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
    const cardData = e.dataTransfer.types.includes('application/card-reorder')
    
    if (cardData) {
      e.dataTransfer.dropEffect = 'move'
      setDraggedOverCard(cardId)
    }
  }

  const handleCardDrop = (e: React.DragEvent, targetCardId: string) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent bubbling to external drop zone
    setDraggedOverCard(null);
    
    const draggedCardId = e.dataTransfer.getData('application/card-reorder');
    if (!draggedCardId || draggedCardId === targetCardId) return;

    const draggedIndex = cards.findIndex(card => card.id === draggedCardId);
    const targetIndex = cards.findIndex(card => card.id === targetCardId);
    
    if (draggedIndex === -1 || targetIndex === -1) return;

    const newCards = [...cards];
    const [draggedCard] = newCards.splice(draggedIndex, 1);
    newCards.splice(targetIndex, 0, draggedCard);
    
    onReorderCards(newCards);
  }

  return (
    <div className="flex flex-col h-full bg-card rounded-lg border border-border shadow-sm">
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Content Cards
          <span className="text-sm font-normal text-muted-foreground">
            ({cards.length})
          </span>
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Saved AI responses for later reference
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
              <FileText className="h-12 w-12 mx-auto opacity-50" />
            </div>
            <p className="text-lg mb-2">No saved content yet</p>
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
              The AI response will be saved for later reference
            </p>
          </div>
        )}

        <div className="space-y-3">
          {cards.map((card) => (
            <div
              key={card.id}
              className={`group relative bg-background border border-border rounded-lg p-4 cursor-grab active:cursor-grabbing transition-all duration-200 hover:shadow-md hover:border-primary/30 ${
                draggedOverCard === card.id ? 'border-primary border-2' : ''
              } ${
                draggedCard === card.id ? 'rotate-2 scale-105' : ''
              }`}
              draggable
              onDragStart={(e) => handleCardDragStart(e, card.id)}
              onDragEnd={handleCardDragEnd}
              onDragOver={(e) => handleCardDragOver(e, card.id)}
              onDrop={(e) => handleCardDrop(e, card.id)}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-1 opacity-0 group-hover:opacity-50 transition-opacity">
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-foreground mb-2 line-clamp-2">
                    {card.title}
                  </h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-4">
                    {card.content}
                  </p>
                  <div className="text-xs text-muted-foreground mt-3 flex items-center justify-between">
                    <span>
                      {card.createdAt.toLocaleDateString()} at{' '}
                      {card.createdAt.toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </span>
                    <span className="text-xs bg-muted px-2 py-1 rounded">
                      {card.content.length} chars
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => onDeleteCard(card.id)}
                  className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-destructive/10 hover:text-destructive rounded"
                  title="Delete card"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}