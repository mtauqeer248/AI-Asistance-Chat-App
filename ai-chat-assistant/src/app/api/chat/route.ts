import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'
import { chatRequestSchema } from '@/lib/schema'
import { getGroq, MissingApiKeyError, MODEL } from '@/lib/server/groq'
import { systemPromptFor } from '@/lib/server/prompts'
import { rateLimit } from '@/lib/server/rate-limit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type ErrorType = 'bad_request' | 'rate_limit' | 'config_error' | 'model_not_found' | 'upstream_error'

function errorResponse(error: string, type: ErrorType, status: number, headers?: HeadersInit) {
  return NextResponse.json({ error, type }, { status, headers })
}

/**
 * POST /api/chat
 * Body: { mode?: 'chat' | 'explain', messages: { role, content }[] }
 * Returns: a text/plain stream of the assistant's reply, token by token.
 */
export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local'
  const limit = rateLimit(ip)
  if (!limit.ok) {
    return errorResponse(
      `Too many requests. Try again in ${limit.retryAfter}s.`,
      'rate_limit',
      429,
      { 'Retry-After': String(limit.retryAfter) },
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return errorResponse('Request body must be valid JSON.', 'bad_request', 400)
  }

  const parsed = chatRequestSchema.safeParse(body)
  if (!parsed.success) {
    return errorResponse(parsed.error.issues[0]?.message ?? 'Invalid request.', 'bad_request', 400)
  }
  const { mode, messages } = parsed.data

  let completion: Awaited<ReturnType<typeof startCompletion>>
  try {
    completion = await startCompletion(mode, messages)
  } catch (error) {
    return mapUpstreamError(error)
  }

  const encoder = new TextEncoder()
  let cancelled = false
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of completion) {
          const token = chunk.choices[0]?.delta?.content
          if (token) controller.enqueue(encoder.encode(token))
        }
        controller.close()
      } catch (error) {
        // Client disconnected (Stop button / closed tab) — expected, not an error.
        if (cancelled) {
          controller.close()
          return
        }
        console.error('[api/chat] stream failed:', error)
        controller.error(error)
      }
    },
    // Fires when the browser aborts the fetch. Abort upstream too so we stop paying for tokens.
    cancel() {
      cancelled = true
      completion.controller.abort()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'X-Model': MODEL,
    },
  })
}

function startCompletion(
  mode: 'chat' | 'explain',
  messages: { role: 'user' | 'assistant'; content: string }[],
) {
  // Note: we deliberately don't forward `request.signal`. In Next 14 it fires as soon as
  // the request body is consumed, which would kill the stream. Cancellation is handled
  // by the ReadableStream's cancel() callback instead.
  return getGroq().chat.completions.create(
    {
      model: MODEL,
      messages: [{ role: 'system', content: systemPromptFor(mode) }, ...messages],
      stream: true,
      temperature: mode === 'explain' ? 0.3 : 0.5,
      // gpt-oss is a reasoning model: reasoning tokens count toward this budget.
      max_completion_tokens: mode === 'explain' ? 1024 : 4096,
      reasoning_effort: 'low',
      include_reasoning: false,
    },
  )
}

function mapUpstreamError(error: unknown) {
  if (error instanceof MissingApiKeyError) {
    return errorResponse('Server is missing GROQ_API_KEY.', 'config_error', 500)
  }
  if (error instanceof Groq.APIError) {
    console.error('[api/chat] Groq error:', error.status, error.message)
    if (error.status === 429) {
      return errorResponse('The AI provider is rate limiting us. Please wait a moment.', 'rate_limit', 429)
    }
    if (error.status === 401 || error.status === 403) {
      return errorResponse('Invalid GROQ_API_KEY.', 'config_error', 500)
    }
    if (error.status === 404) {
      return errorResponse(`Model "${MODEL}" is unavailable. Set GROQ_MODEL to a current model.`, 'model_not_found', 502)
    }
    return errorResponse('The AI provider returned an error.', 'upstream_error', 502)
  }
  console.error('[api/chat] unexpected error:', error)
  return errorResponse('Something went wrong. Please try again.', 'upstream_error', 500)
}

/** Cheap health check — reports config without spending tokens on a completion. */
export async function GET() {
  return NextResponse.json({
    status: process.env.GROQ_API_KEY ? 'ok' : 'missing_api_key',
    model: MODEL,
    timestamp: new Date().toISOString(),
  })
}
