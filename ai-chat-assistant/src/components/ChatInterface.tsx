/* eslint-disable @typescript-eslint/no-unused-vars */
'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, Loader2, GripVertical } from 'lucide-react'
import { Message } from '@/app/page'
import { ExplanationPopup } from '@/components/explanation-popup'
import { SelectableText } from '@/components/selectable-text'

interface ChatInterfaceProps {
  messages: Message[]
  onAddMessage: (message: Omit<Message, 'id' | 'timestamp'>) => void
  onCreateCard: (messageId: string) => void
  conversationTitle?: string
  hasActiveConversation?: boolean
  onUpdateTitle?:(conversationId: string, userMessage: string) => void;
  disabled?: boolean;
}

export function ChatInterface({ messages, onAddMessage, conversationTitle }: ChatInterfaceProps) {
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [draggedMessage, setDraggedMessage] = useState<string | null>(null)
  const [showExplanation, setShowExplanation] = useState(false)
  const [selectedText, setSelectedText] = useState('')
  const [selectionPosition, setSelectionPosition] = useState({ x: 0, y: 0 })
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    console.log(userMessage, 'msgg')
    onAddMessage({
      content: userMessage,
      role: 'user'
    })
    setInput('')
    setIsLoading(true)


    try {
      const response = await mockAIResponse(userMessage)
      
      onAddMessage({
        content: response,
        role: 'assistant'
      })
    } catch (error) {
      onAddMessage({
        content: 'Sorry, I encountered an error. Please try again.',
        role: 'assistant'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDragStart = (e: React.DragEvent, messageId: string) => {
    setDraggedMessage(messageId)
    e.dataTransfer.setData('text/plain', messageId)
    e.dataTransfer.effectAllowed = 'copy'
    const element = e.currentTarget as HTMLElement
    element.style.opacity = '0.5'
  }

  const handleDragEnd = (e: React.DragEvent) => {
    setDraggedMessage(null)
    const element = e.currentTarget as HTMLElement
    element.style.opacity = '1'
  }

  const handleTextSelect = (text: string, position: { x: number; y: number }) => {
    setSelectedText(text)
    setSelectionPosition(position)
    setShowExplanation(true)
  }

  const closeExplanation = () => {
    setShowExplanation(false)
    setSelectedText('')
  }

  return (
    <>
      <div className="flex flex-col h-[85vh] max-h-[85vh] bg-card rounded-lg border border-border shadow-sm">
        <div className="p-4 border-b border-border">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            {conversationTitle || 'Chat Assistant'}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Drag AI responses to save them • Select text for instant explanations
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-border scrollbar-track-card">
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Start a conversation with the AI assistant!</p>
              <p className="text-sm mt-2">Ask questions, request content, or brainstorm ideas.</p>
              <p className="text-xs mt-1 opacity-75">💡 Tip: Select any text in messages to get instant explanations</p>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 animate-fade-in ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {message.role === 'assistant' && (
                <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center">
                  <Bot className="h-4 w-4" />
                </div>
              )}
              
              <div className={`group relative max-w-[80%] ${message.role === 'user' ? 'order-first' : ''}`}>
                <div
                  className={`p-3 rounded-lg transition-all duration-200 ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground ml-auto'
                      : 'bg-muted text-muted-foreground cursor-grab active:cursor-grabbing hover:shadow-md hover:bg-muted/80'
                  }`}
                  draggable={message.role === 'assistant'}
                  onDragStart={(e) => message.role === 'assistant' && handleDragStart(e, message.id)}
                  onDragEnd={handleDragEnd}
                >
                  {message.role === 'assistant' && (
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-60 transition-opacity pointer-events-none">
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                  
                  {message.role === 'assistant' ? (
                    <SelectableText
                      onTextSelect={handleTextSelect}
                      className="whitespace-pre-wrap break-words pr-6"
                    >
                      {message.content}
                    </SelectableText>
                  ) : (
                    <p className="whitespace-pre-wrap break-words pr-6">{message.content}</p>
                  )}
                </div>
                
                <div className="text-xs text-muted-foreground mt-1 text-right">
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>

              {message.role === 'user' && (
                <div className="flex-shrink-0 w-8 h-8 bg-secondary text-secondary-foreground rounded-full flex items-center justify-center">
                  <User className="h-4 w-4" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3 animate-fade-in">
              <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center">
                <Bot className="h-4 w-4" />
              </div>
              <div className="bg-muted text-muted-foreground p-3 rounded-lg">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">AI is thinking...</span>
                  <div className="flex gap-1">
                    <div className="w-1 h-1 bg-current rounded-full animate-typing"></div>
                    <div className="w-1 h-1 bg-current rounded-full animate-typing" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-1 h-1 bg-current rounded-full animate-typing" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSubmit} className="p-4 border-t border-border">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 px-3 py-2 border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="px-3 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </form>
      </div>

      <ExplanationPopup
        isOpen={showExplanation}
        onClose={closeExplanation}
        selectedText={selectedText}
        position={selectionPosition}
      />
    </>
  )
}

async function mockAIResponse(input: string): Promise<string> {
  const delay = 1000 + Math.random() * 2000
  await new Promise(resolve => setTimeout(resolve, delay))

  const responses = [
    `I understand you're asking about "${input}". Here's my thoughtful response that addresses your question with detailed information and helpful insights. Machine learning algorithms use statistical methods to identify patterns in data and make predictions about future outcomes.`,
    `That's an interesting question about "${input}". Let me break this down for you with some key points and actionable advice. Natural language processing involves computational linguistics and artificial intelligence to help computers understand human language.`,
    `Great question! Regarding "${input}", I can provide you with some comprehensive information that should help clarify things. Neural networks are computing systems inspired by biological neural networks that constitute animal brains.`,
    `I'd be happy to help with "${input}". Here's what I think would be most useful for your situation. Deep learning is a subset of machine learning that uses artificial neural networks with multiple layers to model and understand complex patterns.`,
    `Thanks for asking about "${input}". This is a topic I can definitely help you with. Let me share some insights about algorithms, data structures, and computational complexity in computer science.`
  ]

  return responses[Math.floor(Math.random() * responses.length)] + 
    ` This response contains more detailed information that demonstrates how the AI can provide comprehensive answers. You can drag this message to the content cards area to save it for later reference. The drag-and-drop functionality will let you organize your saved content as needed. Try selecting any technical terms in this message to get instant explanations!`
}