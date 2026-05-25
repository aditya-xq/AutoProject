import { test } from 'bun:test'
import { setupIntegrationTests, BACKEND_URL, LIVE_SUITE } from './setup'
import { testReq } from './helpers'

setupIntegrationTests()

LIVE_SUITE('[Integration] Health & Routing', () => {
  test('GET /health', async () => {
    await testReq('GET /health', 'GET', `${BACKEND_URL}/health`, undefined, 200)
  })

  test('GET /api/llm (no route)', async () => {
    await testReq('GET /api/llm (no route)', 'GET', `${BACKEND_URL}/api/llm`, undefined, 404)
  })

  test('POST unknown route', async () => {
    await testReq('POST unknown route', 'POST', `${BACKEND_URL}/api/llm/nonexistent`, {}, 404)
  })
})
