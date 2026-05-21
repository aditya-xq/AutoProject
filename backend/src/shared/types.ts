export type Json = Record<string, unknown>

export type ApiSuccessResponse<T = unknown> = {
  success: true
  data: T
  requestId: string
}

export type ApiErrorResponse = {
  success: false
  error: {
    code: string
    message: string
  }
  requestId: string
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse
