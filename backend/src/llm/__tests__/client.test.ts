import { afterAll, afterEach, describe, expect, test } from 'bun:test'
import { LLMClient } from '../client'

const originalFetch = globalThis.fetch
const originalEnv = { ...process.env }

function mockFetch(response: Response): void {
  globalThis.fetch = (async () => response) as unknown as typeof fetch
}

function okResponse(overrides: Record<string, unknown> = {}): Response {
  return new Response(
    JSON.stringify({
      choices: [{ message: { content: 'hello' } }],
      model: 'gpt-4o',
      usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
      ...overrides,
    }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  )
}

function capturedFetch(): { getUrl: () => string; getInit: () => RequestInit } {
  let capturedUrl = ''
  let capturedInit: RequestInit = {}
  globalThis.fetch = ((url: RequestInfo | URL, init?: RequestInit) => {
    capturedUrl = String(url)
    capturedInit = init || {}
    return okResponse()
  }) as unknown as typeof fetch
  return { getUrl: () => capturedUrl, getInit: () => capturedInit }
}

afterEach(() => {
  globalThis.fetch = originalFetch
  process.env = { ...originalEnv }
})

afterAll(() => {
  process.env = originalEnv
})

describe('LLMClient constructor', () => {
  test('creates with default config when no args given', () => {
    const client = new LLMClient()
    expect(client).toBeInstanceOf(LLMClient)
  })

  test('merges partial config over defaults', () => {
    const client = new LLMClient({ model: 'custom-model' })
    expect(client).toBeInstanceOf(LLMClient)
  })
})

describe('LLMClient.chat - validation', () => {
  test('throws when messages is empty array', async () => {
    const client = new LLMClient({ apiKey: 'sk-test' })
    await expect(client.chat({ messages: [] })).rejects.toThrow(
      'messages must be a non-empty array',
    )
  })

  test('throws when messages is not provided', async () => {
    const client = new LLMClient({ apiKey: 'sk-test' })
    await expect(client.chat({} as never)).rejects.toThrow(
      'messages must be a non-empty array',
    )
  })

  test('throws when messages is not an array', async () => {
    const client = new LLMClient({ apiKey: 'sk-test' })
    await expect(client.chat({ messages: 'not-an-array' } as never)).rejects.toThrow(
      'messages must be a non-empty array',
    )
  })

  test('throws when stream is true', async () => {
    const client = new LLMClient({ apiKey: 'sk-test' })
    await expect(
      client.chat({ messages: [{ role: 'user', content: 'Hi' }], stream: true }),
    ).rejects.toThrow(/streaming/i)
  })
})

describe('LLMClient.chat - happy path', () => {
  test('returns normalized response for simple string content', async () => {
    mockFetch(okResponse())
    const client = new LLMClient({ apiKey: 'sk-test' })
    const result = await client.chat({
      messages: [{ role: 'user', content: 'Hi' }],
    })
    expect(result.content).toBe('hello')
    expect(result.model).toBe('gpt-4o')
    expect(result.usage).toEqual({ prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 })
    expect(result.raw).toBeDefined()
  })

  test('normalizes array content with text parts', async () => {
    mockFetch(
      okResponse({
        choices: [
          {
            message: {
              content: [
                { type: 'text', text: 'Hello ' },
                { type: 'text', text: 'World' },
              ],
            },
          },
        ],
      }),
    )
    const client = new LLMClient({ apiKey: 'sk-test' })
    const result = await client.chat({
      messages: [{ role: 'user', content: 'Hi' }],
    })
    expect(result.content).toBe('Hello World')
  })

  test('normalizes array content with mixed types', async () => {
    mockFetch(
      okResponse({
        choices: [
          {
            message: {
              content: [
                'plain string ',
                { type: 'text', text: 'text part ' },
                { type: 'image', source: 'http://image' },
                { unrelated: true },
              ],
            },
          },
        ],
      }),
    )
    const client = new LLMClient({ apiKey: 'sk-test' })
    const result = await client.chat({
      messages: [{ role: 'user', content: 'Hi' }],
    })
    expect(result.content).toBe('plain string text part ')
  })

  test('normalizes array of plain strings', async () => {
    mockFetch(
      okResponse({
        choices: [{ message: { content: ['a', 'b', 'c'] } }],
      }),
    )
    const client = new LLMClient({ apiKey: 'sk-test' })
    const result = await client.chat({
      messages: [{ role: 'user', content: 'Hi' }],
    })
    expect(result.content).toBe('abc')
  })

  test('normalizes empty array to empty string', async () => {
    mockFetch(okResponse({ choices: [{ message: { content: [] } }] }))
    const client = new LLMClient({ apiKey: 'sk-test' })
    const result = await client.chat({
      messages: [{ role: 'user', content: 'Hi' }],
    })
    expect(result.content).toBe('')
  })

  test('sends request to correct URL', async () => {
    const { getUrl } = capturedFetch()
    const client = new LLMClient({ baseUrl: 'http://custom:8080/v1', apiKey: 'key' })
    await client.chat({ messages: [{ role: 'user', content: 'Hi' }] })
    expect(getUrl()).toBe('http://custom:8080/v1/chat/completions')
  })

  test('trims trailing slash from baseUrl', async () => {
    const { getUrl } = capturedFetch()
    const client = new LLMClient({ baseUrl: 'http://local:11434/v1/', apiKey: 'key' })
    await client.chat({ messages: [{ role: 'user', content: 'Hi' }] })
    expect(getUrl()).toBe('http://local:11434/v1/chat/completions')
  })

  test('sends authorization header when apiKey is set', async () => {
    const { getInit } = capturedFetch()
    const client = new LLMClient({ apiKey: 'sk-secret' })
    await client.chat({ messages: [{ role: 'user', content: 'Hi' }] })
    const headers = new Headers(getInit().headers)
    expect(headers.get('authorization')).toBe('Bearer sk-secret')
  })

  test('omits authorization header when no apiKey', async () => {
    const { getInit } = capturedFetch()
    const client = new LLMClient({ baseUrl: 'http://local:11434', apiKey: '' })
    await client.chat({ messages: [{ role: 'user', content: 'Hi' }] })
    const headers = new Headers(getInit().headers)
    expect(headers.has('authorization')).toBe(false)
  })

  test('strips undefined fields from request body', async () => {
    let capturedBody: Record<string, unknown> = {}
    globalThis.fetch = ((_url: RequestInfo | URL, init?: RequestInit) => {
      capturedBody = JSON.parse(String(init?.body))
      return okResponse()
    }) as unknown as typeof fetch
    const client = new LLMClient({ apiKey: 'sk-test', model: 'gpt-4o' })
    await client.chat({
      messages: [{ role: 'user', content: 'Hi' }],
      temperature: undefined,
      max_tokens: 100,
    } as never)
    expect(capturedBody.model).toBe('gpt-4o')
    expect('temperature' in capturedBody).toBe(false)
    expect(capturedBody.max_tokens).toBe(100)
  })

  test('uses req.model over config.model', async () => {
    let capturedBody: Record<string, unknown> = {}
    globalThis.fetch = ((_url: RequestInfo | URL, init?: RequestInit) => {
      capturedBody = JSON.parse(String(init?.body))
      return okResponse()
    }) as unknown as typeof fetch
    const client = new LLMClient({ apiKey: 'sk-test', model: 'config-model' })
    await client.chat({
      model: 'req-model',
      messages: [{ role: 'user', content: 'Hi' }],
    })
    expect(capturedBody.model).toBe('req-model')
  })

  test('passes through arbitrary OpenAI-compatible fields', async () => {
    let capturedBody: Record<string, unknown> = {}
    globalThis.fetch = ((_url: RequestInfo | URL, init?: RequestInit) => {
      capturedBody = JSON.parse(String(init?.body))
      return okResponse()
    }) as unknown as typeof fetch
    const client = new LLMClient({ apiKey: 'sk-test' })
    await client.chat({
      messages: [{ role: 'user', content: 'Hi' }],
      response_format: { type: 'json_schema', json_schema: { name: 'x', schema: {} } },
      tools: [{ type: 'function', function: { name: 'fn', parameters: {} } }],
      tool_choice: 'auto',
      max_completion_tokens: 128,
      reasoning_effort: 'low',
      metadata: { session: 'abc' },
    })
    expect(capturedBody.response_format).toBeDefined()
    expect(capturedBody.tools).toBeDefined()
    expect(capturedBody.tool_choice).toBe('auto')
    expect(capturedBody.max_completion_tokens).toBe(128)
    expect(capturedBody.reasoning_effort).toBe('low')
    expect(capturedBody.metadata).toEqual({ session: 'abc' })
  })

  test('falls back to response model when model missing from choices', async () => {
    mockFetch(okResponse({ model: undefined }))
    const client = new LLMClient({ apiKey: 'sk-test', model: 'fallback-model' })
    const result = await client.chat({
      messages: [{ role: 'user', content: 'Hi' }],
    })
    expect(result.model).toBe('fallback-model')
  })

  test('defaults usage to zeros when missing', async () => {
    mockFetch(okResponse({ usage: undefined }))
    const client = new LLMClient({ apiKey: 'sk-test' })
    const result = await client.chat({
      messages: [{ role: 'user', content: 'Hi' }],
    })
    expect(result.usage).toEqual({ prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 })
  })

  test('handles empty choices array', async () => {
    mockFetch(okResponse({ choices: [] }))
    const client = new LLMClient({ apiKey: 'sk-test' })
    const result = await client.chat({
      messages: [{ role: 'user', content: 'Hi' }],
    })
    expect(result.content).toBe('')
  })

  test('handles missing choices', async () => {
    mockFetch(okResponse({ choices: undefined }))
    const client = new LLMClient({ apiKey: 'sk-test' })
    const result = await client.chat({
      messages: [{ role: 'user', content: 'Hi' }],
    })
    expect(result.content).toBe('')
  })
})

describe('LLMClient.chat - error handling', () => {
  test('throws with provider error message from OpenAI-compatible JSON errors', async () => {
    mockFetch(
      new Response(JSON.stringify({ error: { message: 'Insufficient quota' } }), {
        status: 429,
        headers: { 'content-type': 'application/json' },
      }),
    )
    const client = new LLMClient({ apiKey: 'sk-test' })
    await expect(client.chat({ messages: [{ role: 'user', content: 'Hi' }] })).rejects.toThrow(
      'Insufficient quota',
    )
  })

  test('throws with top-level error string when no .message', async () => {
    mockFetch(
      new Response(JSON.stringify({ error: 'rate_limit_exceeded' }), {
        status: 429,
        headers: { 'content-type': 'application/json' },
      }),
    )
    const client = new LLMClient({ apiKey: 'sk-test' })
    await expect(client.chat({ messages: [{ role: 'user', content: 'Hi' }] })).rejects.toThrow(
      'rate_limit_exceeded',
    )
  })

  test('throws with HTTP status when error body is not JSON', async () => {
    mockFetch(
      new Response('Service Unavailable', {
        status: 503,
        headers: { 'content-type': 'text/plain' },
      }),
    )
    const client = new LLMClient({ apiKey: 'sk-test' })
    await expect(client.chat({ messages: [{ role: 'user', content: 'Hi' }] })).rejects.toThrow(
      'Service Unavailable',
    )
  })

  test('throws with HTTP status when error body is empty', async () => {
    mockFetch(new Response('', { status: 500 }))
    const client = new LLMClient({ apiKey: 'sk-test' })
    await expect(client.chat({ messages: [{ role: 'user', content: 'Hi' }] })).rejects.toThrow(
      'HTTP 500',
    )
  })

  test('attaches status and code to thrown error', async () => {
    mockFetch(
      new Response(JSON.stringify({ error: { message: 'Unauthorized' } }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      }),
    )
    const client = new LLMClient({ apiKey: 'sk-test' })
    let err: unknown
    try {
      await client.chat({ messages: [{ role: 'user', content: 'Hi' }] })
    } catch (e) {
      err = e
    }
    expect(err).toBeDefined()
    expect((err as Error & { status: number; code: string }).status).toBe(401)
    expect((err as Error & { status: number; code: string }).code).toBe('LLM_ERROR')
  })
})

describe('LLMClient.chat - network errors', () => {
  test('re-throws fetch errors', async () => {
    globalThis.fetch = (async () => {
      throw new TypeError('fetch failed')
    }) as unknown as typeof fetch
    const client = new LLMClient({ apiKey: 'sk-test' })
    await expect(client.chat({ messages: [{ role: 'user', content: 'Hi' }] })).rejects.toThrow(
      'fetch failed',
    )
  })
})

describe('LLMClient.resolveApiKey', () => {
  test('uses OPENAI_API_KEY env for openai baseUrl', async () => {
    process.env.OPENAI_API_KEY = 'sk-openai-env'
    let capturedHeaders: Headers | undefined
    globalThis.fetch = ((_url: RequestInfo | URL, init?: RequestInit) => {
      capturedHeaders = new Headers(init?.headers)
      return okResponse()
    }) as unknown as typeof fetch
    const client = new LLMClient({
      baseUrl: 'https://api.openai.com/v1',
      apiKey: '',
      model: 'gpt-4o',
    })
    await client.chat({ messages: [{ role: 'user', content: 'Hi' }] })
    expect(capturedHeaders!.get('authorization')).toBe('Bearer sk-openai-env')
  })

  test('uses ANTHROPIC_API_KEY env for anthropic baseUrl', async () => {
    process.env.ANTHROPIC_API_KEY = 'sk-ant-env'
    let capturedHeaders: Headers | undefined
    globalThis.fetch = ((_url: RequestInfo | URL, init?: RequestInit) => {
      capturedHeaders = new Headers(init?.headers)
      return okResponse()
    }) as unknown as typeof fetch
    const client = new LLMClient({
      baseUrl: 'https://api.anthropic.com/v1',
      apiKey: '',
      model: 'claude-3',
    })
    await client.chat({ messages: [{ role: 'user', content: 'Hi' }] })
    expect(capturedHeaders!.get('authorization')).toBe('Bearer sk-ant-env')
  })

  test('falls back to LLM_API_KEY for unknown baseUrl', async () => {
    process.env.LLM_API_KEY = 'sk-llm-fallback'
    let capturedHeaders: Headers | undefined
    globalThis.fetch = ((_url: RequestInfo | URL, init?: RequestInit) => {
      capturedHeaders = new Headers(init?.headers)
      return okResponse()
    }) as unknown as typeof fetch
    const client = new LLMClient({
      baseUrl: 'http://ollama:11434',
      apiKey: '',
      model: 'llama3',
    })
    await client.chat({ messages: [{ role: 'user', content: 'Hi' }] })
    expect(capturedHeaders!.get('authorization')).toBe('Bearer sk-llm-fallback')
  })

  test('no auth header when all key sources are empty', async () => {
    delete process.env.OPENAI_API_KEY
    delete process.env.ANTHROPIC_API_KEY
    delete process.env.LLM_API_KEY
    let capturedHeaders: Headers | undefined
    globalThis.fetch = ((_url: RequestInfo | URL, init?: RequestInit) => {
      capturedHeaders = new Headers(init?.headers)
      return okResponse()
    }) as unknown as typeof fetch
    const client = new LLMClient({
      baseUrl: 'https://api.openai.com/v1',
      apiKey: '',
      model: 'gpt-4o',
    })
    await client.chat({ messages: [{ role: 'user', content: 'Hi' }] })
    expect(capturedHeaders!.has('authorization')).toBe(false)
  })
})

describe('LLMClient.chat - edge cases', () => {
  test('handles null content from API', async () => {
    mockFetch(okResponse({ choices: [{ message: { content: null } }] }))
    const client = new LLMClient({ apiKey: 'sk-test' })
    const result = await client.chat({
      messages: [{ role: 'user', content: 'Hi' }],
    })
    expect(result.content).toBe('')
  })

  test('handles undefined content from API', async () => {
    mockFetch(okResponse({ choices: [{ message: {} }] }))
    const client = new LLMClient({ apiKey: 'sk-test' })
    const result = await client.chat({
      messages: [{ role: 'user', content: 'Hi' }],
    })
    expect(result.content).toBe('')
  })

  test('handles number content from API', async () => {
    mockFetch(okResponse({ choices: [{ message: { content: 42 } }] }))
    const client = new LLMClient({ apiKey: 'sk-test' })
    const result = await client.chat({
      messages: [{ role: 'user', content: 'Hi' }],
    })
    expect(result.content).toBe('42')
  })

  test('handles boolean content from API', async () => {
    mockFetch(okResponse({ choices: [{ message: { content: true } }] }))
    const client = new LLMClient({ apiKey: 'sk-test' })
    const result = await client.chat({
      messages: [{ role: 'user', content: 'Hi' }],
    })
    expect(result.content).toBe('true')
  })

  test('handles partial usage data', async () => {
    mockFetch(
      okResponse({
        usage: { prompt_tokens: 5, total_tokens: 5 },
      }),
    )
    const client = new LLMClient({ apiKey: 'sk-test' })
    const result = await client.chat({
      messages: [{ role: 'user', content: 'Hi' }],
    })
    expect(result.usage.prompt_tokens).toBe(5)
    expect(result.usage.completion_tokens).toBe(0)
    expect(result.usage.total_tokens).toBe(5)
  })

  test('passes multiple concurrent requests', async () => {
    let callCount = 0
    globalThis.fetch = ((_url: RequestInfo | URL, init?: RequestInit) => {
      callCount++
      return okResponse({
        choices: [{ message: { content: `response-${callCount}` } }],
      })
    }) as unknown as typeof fetch
    const client = new LLMClient({ apiKey: 'sk-test' })
    const [r1, r2, r3] = await Promise.all([
      client.chat({ messages: [{ role: 'user', content: 'A' }] }),
      client.chat({ messages: [{ role: 'user', content: 'B' }] }),
      client.chat({ messages: [{ role: 'user', content: 'C' }] }),
    ])
    expect(r1.content).toBe('response-1')
    expect(r2.content).toBe('response-2')
    expect(r3.content).toBe('response-3')
    expect(callCount).toBe(3)
  })
})
