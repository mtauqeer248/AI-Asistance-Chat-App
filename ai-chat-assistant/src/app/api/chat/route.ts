/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
// app/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'
import type { ChatCompletion } from 'groq-sdk/resources/chat/completions'

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
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

    const chatParams = {
      messages: apiMessages,
      model: "llama-3.3-70b-versatile" as const,
      temperature: isCodeQuery ? 0.3 : 0.7,
      max_tokens: isCodeQuery ? 2048 : 1024,
      top_p: 0.95,
      stream: false as const,
      stop: ["<|end_of_turn|>", "<|end|>"]
    }

    const chatCompletion = await groq.chat.completions.create(chatParams)

    if ('choices' in chatCompletion && chatCompletion.choices) {
      let content = chatCompletion.choices[0]?.message?.content || ''

      // Process and clean response
      content = processResponse(content, isCodeQuery)

      // ✅ Send only human-readable content
      return NextResponse.json({ message: content })
    } else {
      return NextResponse.json({
        error: 'Unexpected response format from API',
        type: 'api_error'
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Error calling Groq API:', error)

    if (error instanceof Error) {
      if (error.message.includes('rate limit')) {
        return NextResponse.json(
          {
            error: 'Rate limit exceeded. Please wait a moment before sending another message.',
            type: 'rate_limit'
          },
          { status: 429 }
        )
      }

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
    const testCompletion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: 'test' }],
      model: "llama-3.3-70b-versatile",
      max_tokens: 10,
      temperature: 0.1,
      stream: false as const
    })

    if ('choices' in testCompletion && testCompletion.choices) {
      return NextResponse.json({ 
        status: '✅ Chat API is operational',
        model: 'llama-3.3-70b-versatile',
        timestamp: new Date().toISOString()
      })
    } else {
      return NextResponse.json(
        { 
          status: '⚠️ Chat API issue',
          error: 'Unexpected response format',
          timestamp: new Date().toISOString()
        },
        { status: 503 }
      )
    }
  } catch (error) {
    return NextResponse.json(
      { 
        status: '❌ Chat API error',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 503 }
    )
  }
}
