import 'server-only'
import Groq from 'groq-sdk'

/**
 * Model is configurable so a provider deprecation is a config change,
 * not a code change. (llama-3.1-8b-instant was retired on 2026-08-16.)
 */
export const MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-20b'

let client: Groq | null = null

export function getGroq(): Groq {
  if (!process.env.GROQ_API_KEY) {
    throw new MissingApiKeyError()
  }
  // Lazy singleton: avoids crashing `next build` when the key isn't set at build time.
  client ??= new Groq({ apiKey: process.env.GROQ_API_KEY })
  return client
}

export class MissingApiKeyError extends Error {
  constructor() {
    super('GROQ_API_KEY is not set')
    this.name = 'MissingApiKeyError'
  }
}
