import { invalid } from './errors'

export function normalizeStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String)
  if (typeof value === 'string' && value.trim()) return [value]
  return []
}

export function requireNonEmpty(value: unknown, field: string): string {
  const text = String(value || '').trim()
  if (!text) throw invalid(`${field} is required`)
  return text
}

export function stepIdFor(stepNumber: string): string {
  return `step-${stepNumber.trim().replace(/\./g, '-')}`
}
