/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react/no-unescaped-entities */
'use client'

import { useState, useEffect, useRef } from 'react'
import { X, BookOpen, Send, Bot, User, Loader2, MessageCircle, RotateCcw } from 'lucide-react'

interface ExplanationMessage {
    id: string
    content: string
    role: 'user' | 'assistant'
    timestamp: Date
}

interface ExplanationPopupProps {
    isOpen: boolean
    onClose: () => void
    selectedText: string
    position: { x: number; y: number }
}

type Tone = 'beginner' | 'intermediate' | 'advanced'



// Function to get response from Groq API (same as chat interface)
async function getGroqResponse(userMessage: string, conversationHistory: any[]): Promise<string> {
    try {
        console.log('getGroqResponse called with:', { userMessage, conversationHistory });
        
        // Build conversation context from message history
        const messages = conversationHistory
            .slice(-10) // Keep last 10 messages for context (adjust as needed)
            .map(msg => ({
                role: msg.role as 'user' | 'assistant',
                content: msg.content
            }))

        // Add the current user message
        messages.push({
            role: 'user',
            content: userMessage
        })

        console.log('Sending messages to API:', messages);

        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ messages }),
        })

        console.log('API response status:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('API error response:', errorText);
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`)
        }

        const data = await response.json()
        console.log('API response data:', data);
        return data.content || 'Sorry, I received an empty response.'
    } catch (error) {
        console.error('Error calling Groq API:', error)
        throw error
    }
}

export const ExplanationPopup = ({ isOpen, onClose, selectedText, position }: ExplanationPopupProps) => {
    const [explanation, setExplanation] = useState<string>('')
    const [loading, setLoading] = useState(false)
    const [chatMode, setChatMode] = useState(false)
    const [messages, setMessages] = useState<ExplanationMessage[]>([])
    const [chatInput, setChatInput] = useState('')
    const [chatLoading, setChatLoading] = useState(false)
    const [isMobile, setIsMobile] = useState(false)
    const [apiError, setApiError] = useState<string | null>(null)

    const popupRef = useRef<HTMLDivElement>(null)
    const chatMessagesRef = useRef<HTMLDivElement>(null)
    const chatInputRef = useRef<HTMLInputElement>(null)

    // Check if device is mobile/tablet
    useEffect(() => {
        const checkMobile = () => {
            const width = window.innerWidth
            const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0
            setIsMobile(width <= 768 || isTouchDevice)
        }

        checkMobile()
        window.addEventListener('resize', checkMobile)
        return () => window.removeEventListener('resize', checkMobile)
    }, [])

    // Simple AI explanation function (matching chat interface style)
    const getExplanation = async (text: string) => {
        setLoading(true)

        try {
            const prompt = `You're a technical assistant explaining concepts to students/developers. For: "${text}" provide:
1. Concise definition (1 sentence)
2. Key applications/importance
3. Simple code example (if applicable)
Use markdown and keep under 200 words.`

            const content = await getGroqResponse(prompt, [])
            setExplanation(content)
        } catch (error: any) {
            console.error('AI explanation error:', error)
            setExplanation('Sorry, I encountered an error generating the explanation. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    // Handle follow-up chat
    const handleChatSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!chatInput.trim() || chatLoading) return

        const userMessage: ExplanationMessage = {
            id: crypto.randomUUID(),
            content: chatInput.trim(),
            role: 'user',
            timestamp: new Date()
        }

        // Add user message
        setMessages(prev => [...prev, userMessage])
        setChatInput('')
        setChatLoading(true)

        try {
            console.log('Sending chat message:', chatInput.trim());
            console.log('Current messages history:', messages);
            
            const response = await getGroqResponse(chatInput.trim(), messages)
            console.log('Received response:', response);

            const aiMessage: ExplanationMessage = {
                id: crypto.randomUUID(),
                content: response,
                role: 'assistant',
                timestamp: new Date()
            }

            setMessages(prev => [...prev, aiMessage])
        } catch (error) {
            console.error('Chat submit error:', error);
            const errorMessage: ExplanationMessage = {
                id: crypto.randomUUID(),
                content: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
                role: 'assistant',
                timestamp: new Date()
            }
            setMessages(prev => [...prev, errorMessage])
        } finally {
            setChatLoading(false)
        }
    }



    // Scroll chat to bottom
    const scrollChatToBottom = () => {
        if (chatMessagesRef.current) {
            chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight
        }
    }

    useEffect(() => {
        if (isOpen && selectedText) {
            getExplanation(selectedText)
            // Reset chat state when opening new explanation
            setChatMode(false)
            setMessages([])
            setChatInput('')
        }
    }, [isOpen, selectedText])

    useEffect(() => {
        scrollChatToBottom()
    }, [messages])

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
                onClose()
            }
        }

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose()
            }
        }

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside)
            document.addEventListener('keydown', handleEscape)
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
            document.removeEventListener('keydown', handleEscape)
        }
    }, [isOpen, onClose])

    // Focus chat input when entering chat mode
    useEffect(() => {
        if (chatMode && chatInputRef.current && !isMobile) {
            chatInputRef.current.focus()
        }
    }, [chatMode, isMobile])

    const startChat = () => {
        setChatMode(true)
        // Add initial context message with the original selected text context
        const contextMessage: ExplanationMessage = {
            id: crypto.randomUUID(),
            content: `I'm here to help you understand "${selectedText}" better! Ask me anything about this topic - I'll provide detailed, personalized explanations.`,
            role: 'assistant',
            timestamp: new Date()
        }
        
        // Add a system context message that includes the explanation for better context
        const systemContextMessage: ExplanationMessage = {
            id: crypto.randomUUID(),
            content: `Context: User selected "${selectedText}" and received this explanation: ${explanation}`,
            role: 'assistant',
            timestamp: new Date()
        }
        
        setMessages([systemContextMessage, contextMessage])
    }

    const resetToExplanation = () => {
        setChatMode(false)
        setMessages([])
        setChatInput('')
    }

    if (!isOpen) return null

    // Calculate responsive popup dimensions and position
    const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1200
    const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 800

    // Responsive sizing
    const getPopupDimensions = () => {
        if (isMobile) {
            // Mobile: Use full screen modal approach
            return {
                width: '100vw',
                height: '100vh',
                maxWidth: 'none',
                maxHeight: 'none'
            }
        } else if (viewportWidth <= 1024) {
            // Tablet: Larger popup, more responsive
            return {
                width: Math.min(450, viewportWidth - 40),
                height: chatMode ? Math.min(600, viewportHeight - 40) : Math.min(400, viewportHeight - 40),
                maxWidth: '90vw',
                maxHeight: '90vh'
            }
        } else {
            // Desktop: Original sizing with improvements
            return {
                width: 420,
                height: chatMode ? 550 : 380,
                maxWidth: '25vw',
                maxHeight: '70vh'
            }
        }
    }

    const popupDimensions = getPopupDimensions()

    // Position calculation for non-mobile
    const getPosition = () => {
        if (isMobile) {
            return { x: 0, y: 0 }
        }

        const popupWidth = typeof popupDimensions.width === 'number' ? popupDimensions.width : 420
        const popupHeight = typeof popupDimensions.height === 'number' ? popupDimensions.height : 380

        return {
            x: Math.min(Math.max(position.x, 16), viewportWidth - popupWidth - 16),
            y: Math.min(Math.max(position.y, 16), viewportHeight - popupHeight - 16)
        }
    }

    const adjustedPosition = getPosition()

    const popupStyles = isMobile
        ? {
            position: 'fixed' as const,
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100%',
            height: '100dvh', // more reliable on mobile
            maxWidth: 'none',
            maxHeight: 'none',
            zIndex: 9999
        }
        : {
            position: 'fixed' as const,
            left: `${adjustedPosition?.x || 100}px`,
            top: `${adjustedPosition?.y || 100}px`,
            width: popupDimensions?.width ? `${popupDimensions.width}px` : '400px',
            height: popupDimensions?.height ? `${popupDimensions.height}px` : 'auto',
            maxWidth: popupDimensions?.maxWidth || '90vw',
            maxHeight: popupDimensions?.maxHeight || '90vh',
            zIndex: 9999
        }

    return (
        <>
            {/* Mobile backdrop */}
            {isMobile && (
                <div className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm" onClick={onClose} />
            )}

            <div
                ref={popupRef}
                className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 shadow-xl ${isMobile
                    ? 'rounded-none animate-in slide-in-from-bottom duration-300'
                    : 'rounded-lg animate-in fade-in-0 zoom-in-95 duration-200'
                    }`}
                style={popupStyles}
            >
                {/* Header */}
                <div className={`flex items-center justify-between border-b border-gray-200 dark:border-gray-600 ${isMobile ? 'p-4 min-h-[56px]' : 'p-3'
                    }`}>
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        <BookOpen size={isMobile ? 20 : 16} className="text-blue-600 dark:text-blue-400 flex-shrink-0" />
                        <h3 className={`font-medium text-gray-900 dark:text-white truncate ${isMobile ? 'text-base' : 'text-sm'
                            }`}>
                            {chatMode ? 'Ask Follow-up Questions' : 'Quick Explanation'}
                        </h3>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                        {chatMode && (
                            <button
                                onClick={resetToExplanation}
                                className={`hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors ${isMobile ? 'p-2' : 'p-1'
                                    }`}
                                title="Back to explanation"
                            >
                                <RotateCcw size={isMobile ? 18 : 14} className="text-gray-500 dark:text-gray-400" />
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className={`hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors ${isMobile ? 'p-2' : 'p-1'
                                }`}
                            aria-label="Close explanation"
                        >
                            <X size={isMobile ? 18 : 14} className="text-gray-500 dark:text-gray-400" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex flex-col h-full">
                    {!chatMode ? (
                        <>
                            {/* Initial Explanation View */}
                            <div className={`flex-1 overflow-y-auto ${isMobile ? 'p-4' : 'p-3'}`}>
                                {loading ? (
                                    <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
                                        <span className={isMobile ? 'text-base' : 'text-sm'}>Generating explanation...</span>
                                    </div>
                                ) : (
                                    <>


                                        <div className={`space-y-4 ${isMobile ? 'space-y-6' : 'space-y-3'}`}>
                                            {/* Selected text */}
                                            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded border-l-4 border-blue-400">
                                                <p
                                                    className={`text-gray-700 dark:text-gray-300 italic font-medium ${isMobile ? 'text-base leading-relaxed' : 'text-sm'
                                                        }`}
                                                >
                                                    "{selectedText}"
                                                </p>
                                            </div>

                                            {/* Explanation */}
                                            <div className="prose prose-sm dark:prose-invert max-w-none">
                                                <div
                                                    className={`text-gray-600 dark:text-gray-300 whitespace-pre-line leading-relaxed ${isMobile ? 'text-base' : 'text-sm'
                                                        }`}
                                                >
                                                    {explanation}
                                                </div>
                                            </div>

                                            {/* Actions */}
                                            <div
                                                className={`flex gap-2 pt-3 border-t border-gray-100 dark:border-gray-700 ${isMobile ? 'pt-6' : 'pt-2'
                                                    }`}
                                            >
                                                <button
                                                    onClick={startChat}
                                                    className={`flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors font-medium ${isMobile ? 'px-4 py-3 text-base' : 'px-3 py-2 text-sm'
                                                        }`}
                                                >
                                                    <MessageCircle size={isMobile ? 16 : 14} />
                                                    Ask Questions
                                                </button>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </>
                    ) : (
                        /* Chat Mode View */
                        <>
                            {/* Chat Messages */}
                            <div
                                ref={chatMessagesRef}
                                className={`flex-1 overflow-y-auto space-y-3 bg-gray-50 dark:bg-gray-900/20 ${isMobile ? 'p-4' : 'p-3'
                                    }`}
                            >
                                {/* Original context */}
                                <div className={`bg-blue-50 dark:bg-blue-900/20 p-3 rounded ${isMobile ? 'text-sm' : 'text-xs'
                                    }`}>
                                    <span className="font-medium">Context:</span> "{selectedText}"
                                </div>

                                {/* Chat messages */}
                                {messages.map((message, index) => {
                                    // Don't display the system context message (first message)
                                    if (index === 0 && message.content.startsWith('Context: User selected')) {
                                        return null
                                    }
                                    
                                    return (
                                        <div
                                            key={message.id}
                                            className={`flex gap-2 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                        >
                                            {message.role === 'assistant' && (
                                                <div className={`flex-shrink-0 bg-blue-600 text-white rounded-full flex items-center justify-center ${isMobile ? 'w-8 h-8' : 'w-6 h-6'
                                                    }`}>
                                                    <Bot className={isMobile ? 'h-4 w-4' : 'h-3 w-3'} />
                                                </div>
                                            )}

                                            <div className={`max-w-[85%] p-3 rounded-lg ${isMobile ? 'text-base' : 'text-sm'
                                                } ${message.role === 'user'
                                                    ? 'bg-blue-600 text-white'
                                                    : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-600'
                                                }`}>
                                                <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                                                <div className={`opacity-70 mt-2 ${isMobile ? 'text-sm' : 'text-xs'}`}>
                                                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            </div>

                                            {message.role === 'user' && (
                                                <div className={`flex-shrink-0 bg-gray-600 text-white rounded-full flex items-center justify-center ${isMobile ? 'w-8 h-8' : 'w-6 h-6'
                                                    }`}>
                                                    <User className={isMobile ? 'h-4 w-4' : 'h-3 w-3'} />
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}

                                {/* Loading indicator */}
                                {chatLoading && (
                                    <div className="flex gap-2 justify-start">
                                        <div className={`flex-shrink-0 bg-blue-600 text-white rounded-full flex items-center justify-center ${isMobile ? 'w-8 h-8' : 'w-6 h-6'
                                            }`}>
                                            <Bot className={isMobile ? 'h-4 w-4' : 'h-3 w-3'} />
                                        </div>
                                        <div className="bg-white dark:bg-gray-700 p-3 rounded-lg border border-gray-200 dark:border-gray-600">
                                            <div className={`flex items-center gap-2 text-gray-600 dark:text-gray-300 ${isMobile ? 'text-base' : 'text-sm'
                                                }`}>
                                                <Loader2 className={`animate-spin ${isMobile ? 'h-4 w-4' : 'h-3 w-3'}`} />
                                                <span>Thinking...</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Chat Input */}
                            <div className={`border-t border-gray-200 dark:border-gray-600 ${isMobile ? 'p-4 pb-6' : 'p-3'
                                }`}>
                                <form onSubmit={handleChatSubmit} className="flex gap-2">
                                    <input
                                        ref={chatInputRef}
                                        type="text"
                                        value={chatInput}
                                        onChange={(e) => setChatInput(e.target.value)}
                                        placeholder="Ask a follow-up question..."
                                        className={`flex-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 ${isMobile ? 'px-4 py-3 text-base' : 'px-3 py-2 text-sm'
                                            }`}
                                        disabled={chatLoading}
                                    />
                                    <button
                                        type="submit"
                                        disabled={!chatInput.trim() || chatLoading}
                                        className={`bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${isMobile ? 'px-4 py-3' : 'px-3 py-2'
                                            }`}
                                    >
                                        <Send className={isMobile ? 'h-5 w-5' : 'h-4 w-4'} />
                                    </button>
                                </form>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </>
    )
}