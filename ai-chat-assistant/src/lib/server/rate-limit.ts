import 'server-only'

/**
 * Fixed-window, in-memory rate limiter keyed by client IP.
 *
 * Trade-off: on serverless each instance has its own memory, so this is a
 * best-effort guard against accidental spam, not a hard global limit. For a
 * real deployment swap the Map for Redis/Upstash with the same interface.
 */
const WINDOW_MS = 60_000
const MAX_REQUESTS = 20

const hits = new Map<string, { count: number; resetAt: number }>()

export function rateLimit(key: string): { ok: boolean; retryAfter: number } {
  const now = Date.now()
  const entry = hits.get(key)

  if (!entry || entry.resetAt <= now) {
    hits.set(key, { count: 1, resetAt: now + WINDOW_MS })
    // Opportunistic cleanup so the map can't grow forever.
    if (hits.size > 5_000) {
      hits.forEach((v, k) => {
        if (v.resetAt <= now) hits.delete(k)
      })
    }
    return { ok: true, retryAfter: 0 }
  }

  entry.count += 1
  if (entry.count > MAX_REQUESTS) {
    return { ok: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) }
  }
  return { ok: true, retryAfter: 0 }
}
