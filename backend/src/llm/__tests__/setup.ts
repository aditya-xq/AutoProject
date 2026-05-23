import { beforeAll } from 'bun:test'
import { fetchJSON, C, results } from './helpers'

export const BACKEND_URL = process.env.BACKEND_URL ?? 'http://127.0.0.1:3001'
export const LLM_BASE_URL = process.env.LLM_BASE_URL ?? 'http://127.0.0.1:1234/v1'
export const LLM_API_KEY = process.env.LLM_API_KEY ?? ''
export const LLM_MODEL = process.env.LLM_MODEL ?? 'qwen/qwen3-1.7b'

export const CONFIG = { BACKEND_URL, LLM_BASE_URL, LLM_API_KEY, LLM_MODEL }

let _setupDone = false

export function setupIntegrationTests(): void {
  if (_setupDone) return
  _setupDone = true

  beforeAll(async () => {
    console.log()
    console.log(`${C.bold}${C.cyan}══ LLM Integration Test Suite${' ═'.repeat(20)}${C.nc}`)
    console.log(`  ${C.cyan}Backend:${C.nc} ${BACKEND_URL}`)
    console.log(`  ${C.cyan}Model:${C.nc}   ${LLM_MODEL}`)
    console.log()

    const health = await fetchJSON(`${BACKEND_URL}/health`)
    if (!health.ok || health.status !== 200) {
      console.log(`${C.red}${C.bold}Backend not reachable at ${BACKEND_URL}${C.nc}`)
      console.log(`  Health: HTTP ${health.status} — ${JSON.stringify(health.body).slice(0, 120)}`)
      console.log(`  ${C.yellow}Start the backend first: cd backend && bun run dev${C.nc}`)
      process.exit(1)
    }
    results.pop()
    console.log(`  ${C.green}✓${C.nc} Backend is healthy`)
    console.log()
  })
}
