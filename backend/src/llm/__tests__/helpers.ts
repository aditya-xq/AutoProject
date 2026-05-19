import { join } from 'node:path'
import { tmpdir } from 'node:os'

export const C = {
  red: '\x1b[0;31m',
  green: '\x1b[0;32m',
  yellow: '\x1b[1;33m',
  cyan: '\x1b[0;36m',
  bold: '\x1b[1m',
  nc: '\x1b[0m',
} as const

export interface ScenarioResult {
  number: number
  section: string
  label: string
  status: 'pass' | 'fail' | 'skip'
  detail?: string
  expectation?: string
  note?: string
  timingMs: number
  request: {
    method: string
    path: string
    headers: Record<string, string>
    body: unknown
  } | null
  response: {
    status: number
    body: unknown
  } | null
  llmContent: string | null
  errorMessage: string | null
}

export const results: ScenarioResult[] = []
export let passCount = 0
export let failCount = 0
export let skipCount = 0

export function resetCounters(): void {
  results.length = 0
  passCount = 0
  failCount = 0
  skipCount = 0
}

export function extractContent(body: unknown): string | null {
  if (!body || typeof body !== 'object') return null
  const data = (body as Record<string, unknown>).data
  if (data && typeof data === 'object') {
    const content = (data as Record<string, unknown>).content
    if (typeof content === 'string' && content.trim()) return content.trim()
  }
  return null
}

export function extractError(body: unknown): string | null {
  if (!body || typeof body !== 'object') return null
  const error = (body as Record<string, unknown>).error
  if (!error || typeof error !== 'object') return null
  const e = error as Record<string, unknown>
  const code = typeof e.code === 'string' ? `[${e.code}] ` : ''
  const message = typeof e.message === 'string' ? e.message : JSON.stringify(error)
  return `${code}${message}`
}

export function buildExpectation(expectedStatus?: number, expectContains?: string): string {
  return [
    expectedStatus !== undefined ? `HTTP ${expectedStatus}` : 'any 2xx',
    expectContains ? `body contains "${expectContains}"` : null,
  ]
    .filter(Boolean)
    .join(' and ')
}

function printVerdict(status: string, label: string): void {
  const icon = status === 'pass' ? `${C.green}✓` : status === 'fail' ? `${C.red}✗` : `${C.yellow}⊘`
  const color = status === 'pass' ? C.green : status === 'fail' ? C.red : C.yellow
  console.log(`  ${icon}${C.nc} ${color}${label}${C.nc}`)
}

export async function fetchJSON(
  url: string,
  init?: RequestInit & { _rawBody?: unknown },
): Promise<{ ok: boolean; status: number; body: unknown }> {
  const start = performance.now()
  let responseStatus = 0
  let responseBody: unknown = null
  let errorMsg: string | null = null

  try {
    const res = await fetch(url, { ...init, signal: AbortSignal.timeout(180_000) })
    responseStatus = res.status
    const text = await res.text()
    try {
      responseBody = JSON.parse(text)
    } catch {
      responseBody = text
    }
  } catch (e) {
    errorMsg = (e as Error).message
    responseStatus = 0
  }

  const elapsed = Math.round(performance.now() - start)

  const reqBody = init?._rawBody ?? (init?.body ? String(init.body) : null)
  let parsedReqBody: unknown = reqBody
  if (typeof reqBody === 'string') {
    try {
      parsedReqBody = JSON.parse(reqBody)
    } catch {
      parsedReqBody = reqBody
    }
  }

  const entry: ScenarioResult = {
    number: results.length + 1,
    section: '',
    label: '',
    status: 'pass',
    timingMs: elapsed,
    request: {
      method: (init?.method as string) || 'GET',
      path: url,
      headers: (init?.headers as Record<string, string>) ?? {},
      body: parsedReqBody,
    },
    response: responseStatus > 0 ? { status: responseStatus, body: responseBody } : null,
    llmContent: extractContent(responseBody),
    errorMessage: errorMsg,
  }

  results.push(entry)
  return {
    ok: responseStatus >= 200 && responseStatus < 300,
    status: responseStatus,
    body: responseBody,
  }
}

export async function testReq(
  label: string,
  method: string,
  url: string,
  body?: unknown,
  expectedStatus?: number,
  expectContains?: string,
  note?: string,
): Promise<void> {
  const jsonBody = body !== undefined ? JSON.stringify(body) : undefined
  const headers: Record<string, string> = {}
  if (jsonBody !== undefined) {
    headers['Content-Type'] = 'application/json'
  }

  const entryIdx = results.length
  const res = await fetchJSON(url, { method, headers, body: jsonBody, _rawBody: body })

  const entry = results[entryIdx]
  entry.label = label
  entry.expectation = buildExpectation(expectedStatus, expectContains)
  entry.note = note

  let ok = true
  let detail: string | undefined

  if (expectedStatus !== undefined) {
    if (res.status !== expectedStatus) {
      detail = `Expected HTTP ${expectedStatus}, got ${res.status}`
      ok = false
    }
  } else if (!res.ok) {
    detail = `Expected 2xx, got HTTP ${res.status}`
    ok = false
  }

  if (ok && expectContains) {
    const bodyStr = typeof res.body === 'string' ? res.body : JSON.stringify(res.body)
    if (!bodyStr.includes(expectContains)) {
      detail = `Response does not contain "${expectContains}"`
      ok = false
    }
  }

  entry.status = ok ? 'pass' : 'fail'
  entry.detail = detail
  if (!ok) {
    const error = extractError(res.body)
    if (error) entry.errorMessage = error
  }

  if (ok) {
    passCount++
    printVerdict('pass', label)
  } else {
    failCount++
    printVerdict('fail', label)
    if (detail) console.log(`         ${C.red}${detail}${C.nc}`)
  }
}

export async function testRawReq(
  label: string,
  method: string,
  url: string,
  init: RequestInit,
  expectedStatus: number,
  note?: string,
): Promise<void> {
  const entryIdx = results.length
  const res = await fetchJSON(url, { ...init, method, _rawBody: init.body })

  const entry = results[entryIdx]
  entry.label = label
  entry.expectation = `HTTP ${expectedStatus}`
  entry.note = note

  const ok = res.status === expectedStatus
  const detail = ok ? undefined : `Expected HTTP ${expectedStatus}, got ${res.status}`
  entry.status = ok ? 'pass' : 'fail'
  entry.detail = detail
  if (!ok) {
    const error = extractError(res.body)
    if (error) entry.errorMessage = error
  }

  if (ok) {
    passCount++
    printVerdict('pass', label)
  } else {
    failCount++
    printVerdict('fail', label)
    if (detail) console.log(`         ${C.red}${detail}${C.nc}`)
  }
}

export async function testSkip(label: string, reason?: string): Promise<void> {
  skipCount++
  results.push({
    number: results.length + 1,
    section: '',
    label,
    status: 'skip',
    detail: reason,
    timingMs: 0,
    request: null,
    response: null,
    llmContent: null,
    errorMessage: null,
  })
  printVerdict('skip', `${label}${reason ? ` (${reason})` : ''}`)
}

export async function testExecuteReq(
  label: string,
  url: string,
  body: { promptKey: string; stepId?: string; context?: string },
  expectedStatus: number,
  note?: string,
): Promise<void> {
  const entryIdx = results.length
  const res = await fetchJSON(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    _rawBody: body,
  })

  const entry = results[entryIdx]
  entry.label = label
  entry.expectation = `HTTP ${expectedStatus} with valid content/runId/model/usage in body`
  entry.note = note

  const checks: string[] = []
  if (res.status !== expectedStatus)
    checks.push(`Expected HTTP ${expectedStatus}, got ${res.status}`)

  let data: Record<string, unknown> | null = null
  if (res.body && typeof res.body === 'object') {
    const b = res.body as Record<string, unknown>
    if (b.success && b.data && typeof b.data === 'object') {
      data = b.data as Record<string, unknown>
      if (typeof data.content !== 'string' || !data.content.trim())
        checks.push('data.content is missing or empty')
      if (typeof data.runId !== 'string') checks.push('data.runId is missing')
      if (typeof data.model !== 'string') checks.push('data.model is missing')
      if (typeof data.promptKey !== 'string') checks.push('data.promptKey is missing')
      if (!data.usage || typeof data.usage !== 'object') checks.push('data.usage is missing')
    } else {
      checks.push('response body missing success/data structure')
    }
  } else {
    checks.push('response body is not an object')
  }

  const ok = checks.length === 0
  entry.status = ok ? 'pass' : 'fail'
  entry.detail = ok ? undefined : checks.join('; ')
  if (!ok) {
    const error = extractError(res.body)
    if (error) entry.errorMessage = error
  }

  if (ok) {
    passCount++
    printVerdict('pass', label)
  } else {
    failCount++
    printVerdict('fail', label)
    if (entry.detail) console.log(`         ${C.red}${entry.detail}${C.nc}`)
  }
}

export function getReportPath(): string {
  return process.env.REPORT_PATH ?? join(tmpdir(), `llm-test-report-${Date.now()}.html`)
}
