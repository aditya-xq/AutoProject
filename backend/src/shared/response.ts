import type { Context } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import type { AppVariables } from './types'

type AppContext = Context<{ Variables: AppVariables }>

/**
 * Send a success JSON response.
 *
 * The response body always includes `{ success: true, data, requestId }`
 * where `requestId` is read from context (set by a middleware).
 */
export function ok(c: AppContext, data: unknown, status: ContentfulStatusCode = 200) {
  return c.json({ success: true, data, requestId: c.get('requestId') }, status)
}

/**
 * Safely read and parse the JSON request body.
 *
 * Returns an empty object (`{}`) when:
 * - the `Content-Type` header is not `application/json`
 * - the body is empty or not valid JSON
 *
 * This never throws — parse errors are silently swallowed.
 */
export async function readBody(c: AppContext): Promise<Record<string, unknown>> {
  const contentType = c.req.header('content-type') || ''
  if (!contentType.includes('application/json')) return {}
  return await c.req.json().catch(() => ({}))
}
