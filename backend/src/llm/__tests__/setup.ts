import { beforeAll, describe } from 'bun:test'
import { fetchJSON, C } from './helpers'

export const BACKEND_URL = process.env.BACKEND_URL ?? 'http://127.0.0.1:3001'
export const LLM_BASE_URL = process.env.LLM_BASE_URL ?? 'http://127.0.0.1:1234/v1'
export const LLM_API_KEY = process.env.LLM_API_KEY ?? ''
export const LLM_MODEL = process.env.LLM_MODEL ?? 'qwen/qwen3-1.7b'

export const CONFIG = { BACKEND_URL, LLM_BASE_URL, LLM_API_KEY, LLM_MODEL }

async function checkBackend(url: string): Promise<boolean> {
  try {
    const res = await fetch(`${url}/health`, { signal: AbortSignal.timeout(3000) })
    return res.ok
  } catch {
    return false
  }
}

export const BACKEND_ALIVE = await checkBackend(BACKEND_URL)
export const LIVE_SUITE = BACKEND_ALIVE ? describe : describe.skip

let _setupDone = false

export function setupIntegrationTests(): void {
  if (_setupDone) return
  _setupDone = true

  if (!BACKEND_ALIVE) {
    console.log(
      `  ${C.yellow}⊘${C.nc} LLM integration tests skipped: backend at ${BACKEND_URL} is not reachable`,
    )
    return
  }

  beforeAll(async () => {
    console.log()
    console.log(`${C.bold}${C.cyan}══ LLM Integration Test Suite${' ═'.repeat(20)}${C.nc}`)
    console.log(`  ${C.cyan}Backend:${C.nc} ${BACKEND_URL}`)
    console.log(`  ${C.cyan}Model:${C.nc}   ${LLM_MODEL}`)
    console.log()

    try {
      const health = await fetchJSON(`${BACKEND_URL}/health`)
      if (health.ok && health.status === 200) {
        console.log(`  ${C.green}✓${C.nc} Backend is healthy`)
      } else {
        console.log(`  ${C.yellow}⚠${C.nc} Backend health: HTTP ${health.status}${C.nc}`)
      }
    } catch (e) {
      console.log(`  ${C.yellow}⚠${C.nc} Backend health check: ${(e as Error).message}${C.nc}`)
    }
    console.log()
  })
}
