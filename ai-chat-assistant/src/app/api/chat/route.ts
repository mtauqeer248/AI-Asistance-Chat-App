/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
// app/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'
import type { ChatCompletion } from 'groq-sdk/resources/chat/completions'

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || '',
})

const SYSTEM_PROMPT = `You are an expert Software Engineer AI Assistant specialized in helping developers with their daily coding tasks. Your expertise includes:

## CORE EXPERTISE:
- Full-stack development (Frontend, Backend, DevOps)
- Code review, debugging, and optimization
- Architecture design and system design patterns
- Database design and query optimization
- API design and integration
- Testing strategies (unit, integration, e2e)
- Performance optimization and scalability
- Security best practices

## PROGRAMMING LANGUAGES & FRAMEWORKS:
JavaScript/TypeScript, React, Next.js, Node.js, Python, Java, C#, Go, Rust, PHP, Swift, Kotlin, Vue.js, Angular, Express, Django, Flask, Spring Boot, .NET, Docker, Kubernetes, AWS, GCP, Azure

## RESPONSE GUIDELINES:
1. **Be Practical**: Provide actionable, production-ready solutions
2. **Code Examples**: Always include relevant code snippets with proper syntax highlighting
3. **Best Practices**: Mention industry standards and conventions
4. **Performance Focus**: Consider scalability and optimization
5. **Security Aware**: Point out potential security issues
6. **Explain Trade-offs**: Discuss pros/cons of different approaches
7. **Modern Stack**: Prefer current technologies and patterns
8. **Error Handling**: Include proper error handling in examples

## CODE FORMAT:
- Use proper markdown code blocks with language specification
- Add comments explaining complex logic
- Follow naming conventions for the specific language
- Include import statements when necessary
- Show both implementation and usage examples

## DAILY DEVELOPER HELP:
- Quick debugging sessions
- Code refactoring suggestions
- Architecture decision guidance
- Performance bottleneck identification
- Third-party library recommendations
- Deployment and CI/CD guidance
- Code organization and project structure

Be concise but thorough. Focus on solving real-world development challenges efficiently.`

// Helper function to detect code-related queries
function isCodeRelated(message: string): boolean {
  const codeKeywords = [
    'code', 'function', 'class', 'variable', 'method', 'api', 'database', 
    'bug', 'error', 'debug', 'optimize', 'refactor', 'implement', 'algorithm',
    'framework', 'library', 'package', 'install', 'deploy', 'test', 'git',
    'javascript', 'typescript', 'python', 'java', 'react', 'node', 'sql',
    'html', 'css', 'json', 'xml', 'async', 'await', 'promise', 'callback'
  ]
  
  return codeKeywords.some(keyword => 
    message.toLowerCase().includes(keyword.toLowerCase())
  )
}

// Enhanced response processing
function processResponse(content: string, isCodeQuery: boolean): string {
  // Add helpful formatting and structure
  let processedContent = content

  // If it's a code-related query, ensure proper structure
  if (isCodeQuery) {
    // Add simple headings for better readability
    processedContent = processedContent
      .replace(/^(Solution:|Answer:|Here's)/gm, '## $1')
      .replace(/^(Note:|Important:|Warning:)/gm, '### $1')
      .replace(/^(Tip:|Pro tip:|Best practice:)/gm, '### $1')
      .replace(/^(Example:|Code example:)/gm, '### $1')
  }

  return processedContent
}

export async function POST(request: NextRequest) {
  try {
    // Check if API key is available
    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json(
        { 
          error: 'GROQ_API_KEY environment variable is not configured',
          type: 'config_error'
        },
        { status: 500 }
      )
    }

    const { messages } = await request.json()

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      )
    }

    // Get the last user message to analyze
    const lastUserMessage = messages[messages.length - 1]?.content || ''
    const isCodeQuery = isCodeRelated(lastUserMessage)

    // Prepare messages with system prompt
    const apiMessages = [
      {
        role: 'system',
        content: SYSTEM_PROMPT
      },
      ...messages.map((msg: any) => ({
        role: msg.role,
        content: msg.content
      }))
    ]

    // Adjust parameters based on query type
    const chatParams = {
      messages: apiMessages,
      model: "llama-3.3-70b-versatile" as const,
      temperature: isCodeQuery ? 0.3 : 0.7, // Lower temperature for code-related queries
      max_tokens: isCodeQuery ? 2048 : 1024, // More tokens for code examples
      top_p: 0.95,
      stream: false as const, // Explicitly set as const to ensure TypeScript knows this is false
      // Add stop sequences to prevent overly long responses
      stop: ["<|end_of_turn|>", "<|end|>"]
    }

    const chatCompletion = await groq.chat.completions.create(chatParams)
    
    // Type guard to ensure we have a ChatCompletion and not a Stream
    if ('choices' in chatCompletion && chatCompletion.choices) {
      let content = chatCompletion.choices[0]?.message?.content || ''
      
      // Process the response for better developer experience
      content = processResponse(content, isCodeQuery)

      // Add usage statistics for monitoring
      const usage = chatCompletion.usage

      return NextResponse.json({ 
        content,
        metadata: {
          model: chatParams.model,
          isCodeQuery,
          tokens: usage ? {
            prompt: usage.prompt_tokens,
            completion: usage.completion_tokens,
            total: usage.total_tokens
          } : null
        }
      })
    } else {
      // Fallback if for some reason we don't get the expected response structure
      return NextResponse.json({
        error: 'Unexpected response format from API',
        type: 'api_error'
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Error calling Groq API:', error)
    
    // Enhanced error handling
    if (error instanceof Error) {
      // Handle rate limiting
      if (error.message.includes('rate limit')) {
        return NextResponse.json(
          { 
            error: 'Rate limit exceeded. Please wait a moment before sending another message.',
            type: 'rate_limit'
          },
          { status: 429 }
        )
      }
      
      // Handle API key issues
      if (error.message.includes('auth') || error.message.includes('api key')) {
        return NextResponse.json(
          { 
            error: 'API configuration error. Please check your setup.',
            type: 'auth_error'
          },
          { status: 401 }
        )
      }
      
      return NextResponse.json(
        { 
          error: `API error: ${error.message}`,
          type: 'api_error'
        },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { 
        error: 'Internal server error. Please try again.',
        type: 'internal_error'
      },
      { status: 500 }
    )
  }
}

// Enhanced health check with system status
export async function GET() {
  try {
    // Check if API key is available first
    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json(
        { 
          status: 'Chat API configuration error',
          error: 'GROQ_API_KEY environment variable is not configured',
          timestamp: new Date().toISOString(),
          connection: 'unhealthy'
        },
        { status: 503 }
      )
    }

    // Test API connectivity with explicit non-streaming parameters
    const testCompletion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: 'test' }],
      model: "llama-3.3-70b-versatile",
      max_tokens: 10,
      temperature: 0.1,
      stream: false as const // Explicitly set stream to false
    })

    // Type guard for the test completion as well
    if ('choices' in testCompletion && testCompletion.choices) {
      return NextResponse.json({ 
        status: 'Chat API is running',
        model: 'llama-3.3-70b-versatile',
        timestamp: new Date().toISOString(),
        connection: 'healthy'
      })
    } else {
      return NextResponse.json(
        { 
          status: 'Chat API has issues',
          error: 'Unexpected response format',
          timestamp: new Date().toISOString(),
          connection: 'unhealthy'
        },
        { status: 503 }
      )
    }
  } catch (error) {
    return NextResponse.json(
      { 
        status: 'Chat API has issues',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        connection: 'unhealthy'
      },
      { status: 503 }
    )
  }
}