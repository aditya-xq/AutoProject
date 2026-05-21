export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status = 400,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export function notFound(message: string) {
  return new ApiError('NOT_FOUND', message, 404)
}

export function invalid(message: string) {
  return new ApiError('INVALID', message, 400)
}

export function conflict(code: string, message: string) {
  return new ApiError(code, message, 409)
}

export const ErrorCodes = {
  NOT_FOUND: 'NOT_FOUND',
  INVALID: 'INVALID',
  ACTIVE_STEP: 'ACTIVE_STEP',
  BLOCKED: 'BLOCKED',
  WRONG_STEP: 'WRONG_STEP',
  NO_SCENARIOS: 'NO_SCENARIOS',
  NO_DESIGN: 'NO_DESIGN',
  NO_TEST_SUITES: 'NO_TEST_SUITES',
  UNAUTOMATED_SCENARIOS: 'UNAUTOMATED_SCENARIOS',
  MISSING_WORKLOG: 'MISSING_WORKLOG',
  NO_QUALITY_GATES: 'NO_QUALITY_GATES',
  QUALITY_GATES_FAILED: 'QUALITY_GATES_FAILED',
  ALREADY_SEEDED: 'ALREADY_SEEDED',
  DUPLICATE_STEP: 'DUPLICATE_STEP',
  ALREADY_INITIALIZED: 'ALREADY_INITIALIZED',
  NO_DB: 'NO_DB',
  LLM_ERROR: 'LLM_ERROR',
  INTERNAL: 'INTERNAL',
  ERROR: 'ERROR',
} as const
