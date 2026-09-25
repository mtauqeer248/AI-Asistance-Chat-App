import { z } from 'zod'

export const MAX_MESSAGES = 30
export const MAX_MESSAGE_CHARS = 8_000

/**
 * Validates untrusted request bodies. Only `user` and `assistant` roles are
 * accepted, so clients can't inject their own system prompt.
 */
export const chatRequestSchema = z.object({
  mode: z.enum(['chat', 'explain']).default('chat'),
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().trim().min(1).max(MAX_MESSAGE_CHARS),
      }),
    )
    .min(1)
    .max(MAX_MESSAGES)
    .refine((msgs) => msgs[msgs.length - 1].role === 'user', {
      message: 'The last message must come from the user',
    }),
})

export type ChatRequest = z.infer<typeof chatRequestSchema>
