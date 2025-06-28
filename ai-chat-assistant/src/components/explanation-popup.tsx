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

   // OpenAI API configuration
const OPENAI_API_KEY = process.env.NEXT_PUBLIC_OPEN_API_PROJECTS || '';
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

// Enhanced AI explanation function with OpenAI
const getExplanation = async (text: string) => {
  setLoading(true);
  setApiError(null);

  // Debounced input validation
  if (!text.trim() || text.split(' ').length < 2) {
    setExplanation('Please provide a complete question or concept');
    setLoading(false);
    return;
  }

  // Offline fallback dictionary
  const techTerms: Record<string, string> = {
    'api': '**API** (Application Programming Interface) - Protocols for building software applications. Enables communication between different systems.',
    'recursion': '**Recursion** - A function that calls itself to solve smaller instances of the same problem. Requires a base case to terminate.',
    'database': '**Database** - Organized collection of structured data stored electronically. Examples: MySQL (relational), MongoDB (NoSQL).',
    'frontend': '**Frontend** - Client-side part of web applications. Built with HTML/CSS/JavaScript. Frameworks: React, Vue, Angular.',
    'backend': '**Backend** - Server-side logic handling data processing, storage, and security. Technologies: Node.js, Python, databases.',
    'authentication': '**Authentication** - Process of verifying user identity. Common methods: JWT, OAuth, session cookies.'
  };

  const MAX_RETRIES = 3;
  let retryCount = 0;
  let delay = 1000; // Initial delay (1s)

  try {
    if (!OPENAI_API_KEY) throw new Error('OpenAI API key not configured');

    const prompt = `You're a technical assistant explaining concepts to students/developers. For: "${text}" provide:
      1. Concise definition (1 sentence)
      2. Key applications/importance
      3. Simple code example (if applicable)
      Use markdown and keep under 200 words.`.trim();

    while (retryCount < MAX_RETRIES) {
      try {
        const response = await fetch(OPENAI_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENAI_API_KEY}`
          },
          body: JSON.stringify({
            model: 'gpt-3.5-turbo-0125',  // Updated to latest efficient model
            messages: [
              {
                role: 'system',
                content: 'You explain technical concepts clearly for students. Use markdown: **bold**, `code`, lists. Max 200 words.'
              },
              { role: 'user', content: prompt }
            ],
            max_tokens: 250,  // Reduced from 300
            temperature: 0.5  // Lowered for more predictable responses
          }),
          signal: AbortSignal.timeout(10000)  // Timeout after 10 seconds
        });

        // Handle rate limit headers if available
        if (response.status === 429) {
          const resetTime = response.headers.get('x-ratelimit-reset') || '1';
          delay = Math.max(2000, parseInt(resetTime) * 1000 - Date.now() + 500);
          throw new Error(`Rate limited. Retrying in ${Math.round(delay/1000)}s`);
        }

        if (!response.ok) throw new Error(`API error: ${response.status}`);

        const data = await response.json();
        setExplanation(data.choices[0]?.message?.content.trim());
        return;  // Exit on success

      } catch (error: any) {
        if (error.name === 'AbortError') {
          throw new Error('Request timed out');
        }

        if (retryCount < MAX_RETRIES - 1 && 
            (error.message.includes('429') || error.message.includes('5'))) {
          await new Promise(res => setTimeout(res, delay));
          delay *= 2;  // Exponential backoff
          delay += Math.random() * 500;  // Jitter
          retryCount++;
          continue;
        }
        throw error;  // Re-throw after final attempt
      }
    }
  } catch (error: any) {
    console.error('AI explanation error:', error);
    
    // Enhanced fallback logic
    const lowerText = text.toLowerCase();
    setApiError('AI service overloaded - using fallback');
    
    setExplanation(
      techTerms[lowerText] || 
      `### Fallback Explanation\n**${text}** appears to be a technical concept.\n\n` +
      '- Try rephrasing with more context\n' + 
      '- Break into smaller questions\n' +
      `- *Generated offline at ${new Date().toLocaleTimeString()}*`
    );
  } finally {
    setLoading(false);
    setTimeout(() => setApiError(null), 5000);
  }
};


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
            // Simulate AI response
            const response = await generateFollowUpResponse(chatInput.trim(), selectedText)

            const aiMessage: ExplanationMessage = {
                id: crypto.randomUUID(),
                content: response,
                role: 'assistant',
                timestamp: new Date()
            }

            setMessages(prev => [...prev, aiMessage])
        } catch (error) {
            const errorMessage: ExplanationMessage = {
                id: crypto.randomUUID(),
                content: 'Sorry, I encountered an error. Please try asking again.',
                role: 'assistant',
                timestamp: new Date()
            }
            setMessages(prev => [...prev, errorMessage])
        } finally {
            setChatLoading(false)
        }
    }

    // Generate contextual follow-up responses with OpenAI
    const generateFollowUpResponse = async (question: string, originalText: string): Promise<string> => {
        try {
            if (!OPENAI_API_KEY) {
                throw new Error('OpenAI API key not configured')
            }

            const conversationContext = messages.map(msg =>
                `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`
            ).join('\n')

            const prompt = `Context: The user originally selected this text: "${originalText}"

          Previous conversation:
          ${conversationContext}

Current question: "${question}"

Please provide a helpful, educational response that:
1. Directly addresses their question
2. Relates back to the original context when relevant
3. Provides practical examples or clarifications
4. Keeps the response conversational and engaging
5. Stays under 150 words

Be encouraging and educational in your tone.`

            const response = await fetch(OPENAI_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${OPENAI_API_KEY}`
                },
                body: JSON.stringify({
                    model: 'gpt-3.5-turbo',
                    messages: [
                        {
                            role: 'system',
                            content: 'You are a patient, knowledgeable tutor helping someone understand complex topics. Provide clear, encouraging explanations with practical examples when possible.'
                        },
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    max_tokens: 200,
                    temperature: 0.8
                })
            })

            if (!response.ok) {
                throw new Error(`OpenAI API error: ${response.status}`)
            }

            const data = await response.json()
            return data.choices[0]?.message?.content || 'I\'m having trouble generating a response right now. Could you try rephrasing your question?'

        } catch (error) {
            console.error('Error generating follow-up response:', error)

            // Fallback to context-aware responses
            const lowerQuestion = question.toLowerCase()

            if (lowerQuestion.includes('example') || lowerQuestion.includes('instance')) {
                return `Here's a practical example related to "${originalText}":\n\nFor instance, if we're discussing machine learning, you might see it in action when Netflix recommends movies based on your viewing history, or when your email automatically filters spam messages.\n\nWould you like more specific examples?`
            }

            if (lowerQuestion.includes('how') && lowerQuestion.includes('work')) {
                return `Great question about how "${originalText}" works!\n\nThe basic process involves:\n1. Input data or information is received\n2. Processing occurs using specific rules or algorithms\n3. Output or results are generated\n4. The system may learn or adapt based on feedback\n\nThis is a simplified view - would you like me to dive deeper into any particular step?`
            }

            if (lowerQuestion.includes('why') || lowerQuestion.includes('important')) {
                return `"${originalText}" is important because:\n\n• It solves real-world problems efficiently\n• It enables automation and improved decision-making\n• It forms the foundation for more advanced concepts\n• It has practical applications across many industries\n\nWhat specific aspect interests you most?`
            }

            return `That's an insightful question about "${originalText}"!\n\nI'm currently having some technical difficulties, but I'd love to help you explore this topic further. Could you try asking your question in a different way, or let me know what specific aspect you'd like to understand better?\n\n*Note: Using offline responses due to API unavailability.*`
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
            setApiError(null)
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
        // Add initial context message
        const contextMessage: ExplanationMessage = {
            id: crypto.randomUUID(),
            content: `I'm here to help you understand "${selectedText}" better! Ask me anything about this topic - I'll provide detailed, personalized explanations.`,
            role: 'assistant',
            timestamp: new Date()
        }
        setMessages([contextMessage])
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
    };


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
                            {loading ? (
                                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
                                    <span className={isMobile ? 'text-base' : 'text-sm'}>Generating explanation...</span>
                                </div>
                            ) : (
                                <>
                                    {/* API Status Indicator */}
                                    {apiError && (
                                        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mb-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                                                <span className={`text-amber-700 dark:text-amber-300 font-medium ${isMobile ? 'text-sm' : 'text-xs'}`}>
                                                    {apiError} - Using fallback responses
                                                </span>
                                            </div>
                                        </div>
                                    )}

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
                                {messages.map((message) => (
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
                                ))}

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