import { describe, expect, test } from 'bun:test'

describe('paths exports', () => {
  test('all path exports are defined', async () => {
    const paths = await import('../paths')
    expect(paths.ROOT).toBeDefined()
    expect(paths.AUTOPROJECT_DIR).toBeDefined()
    expect(paths.DB_PATH).toBeDefined()
    expect(paths.PROMPTS_PATH).toBeDefined()
    expect(paths.PROJECT_CONTEXT_PATH).toBeDefined()
    expect(paths.BACKEND_DIR).toBeDefined()
  })

  test('ROOT is a valid path', async () => {
    const { ROOT } = await import('../paths')
    expect(ROOT).toBeTruthy()
    expect(typeof ROOT).toBe('string')
  })

  test('BACKEND_DIR is a valid path', async () => {
    const { BACKEND_DIR } = await import('../paths')
    expect(BACKEND_DIR).toBeTruthy()
    expect(typeof BACKEND_DIR).toBe('string')
  })
})
