import { ApiError } from './errors'

type McpTextContent = { type: 'text'; text: string }
type McpResult = { content: McpTextContent[] }
type McpError = McpResult & { isError: true }

/** Wrap a value into an MCP text-content success response. */
export function mcpOk(data: unknown): McpResult {
  return {
    content: [{ type: 'text', text: JSON.stringify(data) }],
  }
}

/**
 * Wrap an error into an MCP text-content error response.
 *
 * `ApiError` instances are serialized with their structured `code`,
 * `message`, and `status` fields. Everything else is flattened to a
 * generic `{ code: 'ERROR', message }` shape.
 */
export function mcpFail(e: unknown): McpError {
  const payload =
    e instanceof ApiError
      ? { code: e.code, message: e.message, status: e.status }
      : { code: 'ERROR', message: e instanceof Error ? e.message : String(e) }
  return {
    content: [{ type: 'text', text: JSON.stringify(payload) }],
    isError: true,
  }
}

/**
 * Wrap an MCP tool handler so it returns a properly formatted response.
 *
 * The returned wrapper is **async** and will `await` the handler result,
 * so both synchronous and asynchronous handlers are supported. Any thrown
 * or rejected error is automatically converted to an error response via
 * {@link mcpFail}.
 */
export function wrapTool<P>(handler: (params: P) => unknown) {
  return async (params: P) => {
    try {
      return mcpOk(await handler(params))
    } catch (e) {
      return mcpFail(e)
    }
  }
}
