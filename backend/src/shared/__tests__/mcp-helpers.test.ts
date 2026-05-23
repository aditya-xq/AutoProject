import { describe, expect, test } from 'bun:test'
import { mcpOk, mcpFail, wrapTool } from '../mcp-helpers'
import { ApiError } from '../errors'

describe('mcpOk', () => {
  test('wraps data in MCP text-content format', () => {
    const result = mcpOk({ hello: 'world' })
    expect(result).toEqual({
      content: [{ type: 'text', text: JSON.stringify({ hello: 'world' }) }],
    })
  })

  test('handles primitive values', () => {
    expect(mcpOk(42).content[0].text).toBe('42')
    expect(mcpOk('string').content[0].text).toBe('"string"')
    expect(mcpOk(null).content[0].text).toBe('null')
  })

  test('does not include isError flag', () => {
    const result = mcpOk('ok')
    expect((result as Record<string, unknown>).isError).toBeUndefined()
  })
})

describe('mcpFail', () => {
  test('serializes ApiError with structured fields', () => {
    const err = new ApiError('NOT_FOUND', 'Step not found', 404)
    const result = mcpFail(err)
    expect(result.isError).toBe(true)
    expect(JSON.parse(result.content[0].text)).toEqual({
      code: 'NOT_FOUND',
      message: 'Step not found',
      status: 404,
    })
  })

  test('serializes generic Error as flat ERROR', () => {
    const result = mcpFail(new Error('something broke'))
    expect(result.isError).toBe(true)
    expect(JSON.parse(result.content[0].text)).toEqual({
      code: 'ERROR',
      message: 'something broke',
    })
  })

  test('serializes non-Error thrown values as string', () => {
    const result = mcpFail('just a string')
    expect(JSON.parse(result.content[0].text)).toEqual({
      code: 'ERROR',
      message: 'just a string',
    })
  })

  test('serializes object thrown values', () => {
    const result = mcpFail({ foo: 'bar' })
    expect(JSON.parse(result.content[0].text)).toEqual({
      code: 'ERROR',
      message: '[object Object]',
    })
  })
})

describe('wrapTool', () => {
  test('returns mcpOk when handler succeeds', async () => {
    const handler = wrapTool(() => 'success')
    const result = await handler(undefined)
    expect(result).toEqual(mcpOk('success'))
  })

  test('returns mcpFail when handler throws synchronously', async () => {
    const handler = wrapTool(() => {
      throw new Error('sync fail')
    })
    const result = await handler(undefined)
    expect(JSON.parse(result.content[0].text)).toEqual({
      code: 'ERROR',
      message: 'sync fail',
    })
    expect((result as Record<string, unknown>).isError).toBe(true)
  })

  test('returns mcpFail when async handler rejects', async () => {
    const handler = wrapTool(async () => {
      throw new Error('async fail')
    })
    const result = await handler(undefined)
    expect(JSON.parse(result.content[0].text).message).toBe('async fail')
    expect((result as Record<string, unknown>).isError).toBe(true)
  })

  test('awaits async handler result', async () => {
    const handler = wrapTool(async () => 'async value')
    const result = await handler(undefined)
    expect(JSON.parse(result.content[0].text)).toBe('async value')
  })

  test('passes params through to handler', async () => {
    const handler = wrapTool((params: { x: number }) => params.x * 2)
    const result = await handler({ x: 5 })
    expect(JSON.parse(result.content[0].text)).toBe(10)
  })
})
