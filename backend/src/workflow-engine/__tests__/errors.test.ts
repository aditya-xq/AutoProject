import { describe, expect, test } from 'bun:test'
import { ApiError, notFound, invalid, conflict } from '../../shared/errors'

describe('ApiError', () => {
  test('creates with default status 400', () => {
    const err = new ApiError('TEST_CODE', 'test message')
    expect(err).toBeInstanceOf(Error)
    expect(err.name).toBe('ApiError')
    expect(err.code).toBe('TEST_CODE')
    expect(err.message).toBe('test message')
    expect(err.status).toBe(400)
  })

  test('creates with custom status', () => {
    const err = new ApiError('NOT_FOUND', 'not found', 404)
    expect(err.status).toBe(404)
  })
})

describe('notFound', () => {
  test('creates 404 ApiError', () => {
    const err = notFound('Step not found')
    expect(err).toBeInstanceOf(ApiError)
    expect(err.code).toBe('NOT_FOUND')
    expect(err.status).toBe(404)
    expect(err.message).toBe('Step not found')
  })
})

describe('invalid', () => {
  test('creates 400 ApiError', () => {
    const err = invalid('title is required')
    expect(err).toBeInstanceOf(ApiError)
    expect(err.code).toBe('INVALID')
    expect(err.status).toBe(400)
    expect(err.message).toBe('title is required')
  })
})

describe('conflict', () => {
  test('creates 409 ApiError with custom code', () => {
    const err = conflict('ALREADY_SEEDED', 'Database already has steps')
    expect(err).toBeInstanceOf(ApiError)
    expect(err.code).toBe('ALREADY_SEEDED')
    expect(err.status).toBe(409)
    expect(err.message).toBe('Database already has steps')
  })
})
