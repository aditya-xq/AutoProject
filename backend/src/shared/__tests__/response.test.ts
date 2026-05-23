import { describe, expect, test } from 'bun:test'
import { ok, readBody } from '../response'
import type { Context } from 'hono'

function mockC(overrides: Record<string, unknown> = {}): Context {
  const req = {
    header: () => (overrides.contentType as string) ?? 'application/json',
    json: async () => {
      const body = overrides.body
      if (body instanceof Error) throw body
      if (body === undefined) throw new Error('empty body')
      return body
    },
  }
  return {
    req: req as unknown as Context['req'],
    json: (data: unknown, status?: number) =>
      new Response(JSON.stringify(data), {
        status: status ?? 200,
        headers: { 'content-type': 'application/json' },
      }),
    get: (key: string) => (key === 'requestId' ? (overrides.requestId ?? 'req-123') : undefined),
    set: () => {},
  } as unknown as Context & { set: (key: string, value: unknown) => void }
}

describe('ok', () => {
  test('returns success response with data and requestId', async () => {
    const c = mockC()
    const res = ok(c, { message: 'hello' })
    const body = await res.json()
    expect(body).toEqual({
      success: true,
      data: { message: 'hello' },
      requestId: 'req-123',
    })
    expect(res.status).toBe(200)
  })

  test('uses custom status code', async () => {
    const c = mockC()
    const res = ok(c, {}, 201)
    expect(res.status).toBe(201)
  })

  test('defaults to 200 when no status given', () => {
    const c = mockC()
    const res = ok(c, null)
    expect(res.status).toBe(200)
  })

  test('includes requestId from context', async () => {
    const c = mockC({ requestId: 'custom-id' })
    const res = ok(c, 'data')
    const body = await res.json()
    expect(body.requestId).toBe('custom-id')
  })
})

describe('readBody', () => {
  test('parses JSON body when content-type is application/json', async () => {
    const c = mockC({ body: { foo: 'bar' } })
    const body = await readBody(c)
    expect(body).toEqual({ foo: 'bar' })
  })

  test('returns empty object when content-type is not JSON', async () => {
    const c = mockC({ contentType: 'text/plain', body: { should: 'not parse' } })
    const body = await readBody(c)
    expect(body).toEqual({})
  })

  test('returns empty object when JSON parse fails', async () => {
    const c = mockC({ body: new Error('parse error') })
    const body = await readBody(c)
    expect(body).toEqual({})
  })

  test('returns empty object when body is empty', async () => {
    const c = mockC({ body: undefined })
    const body = await readBody(c)
    expect(body).toEqual({})
  })
})
