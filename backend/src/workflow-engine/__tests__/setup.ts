import { beforeAll, describe } from 'bun:test'
import { C, fetchJSON } from './helpers'

export const BACKEND_URL = process.env.BACKEND_URL ?? 'http://127.0.0.1:3001'

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

export function setupWorkflowLiveTests(): void {
  if (!BACKEND_ALIVE) {
    console.log(
      `  ${C.yellow}⊘${C.nc} Workflow live E2E tests skipped: backend at ${BACKEND_URL} is not reachable`,
    )
    return
  }

  beforeAll(async () => {
    console.log()
    console.log(`${C.bold}${C.cyan}══ Workflow Live E2E Test Suite${' ═'.repeat(12)}${C.nc}`)
    console.log(`  ${C.cyan}Backend:${C.nc} ${BACKEND_URL}`)
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
