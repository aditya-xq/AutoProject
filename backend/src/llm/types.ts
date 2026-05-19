export interface ChatMessage {
  role: 'system' | 'developer' | 'user' | 'assistant' | 'tool' | string
  content?: unknown
  [key: string]: unknown
}

export interface LLMConfig {
  baseUrl: string
  apiKey: string
  model: string
}

export interface LLMRequest {
  messages: ChatMessage[]
  model?: string
  temperature?: number
  max_tokens?: number
  max_completion_tokens?: number
  response_format?: Record<string, unknown>
  stream?: boolean
  [key: string]: unknown
}

export interface LLMResponse {
  content: string
  model: string
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
  raw: unknown
}

export function defaultConfig(): LLMConfig {
  return {
    baseUrl: process.env.LLM_BASE_URL || 'http://127.0.0.1:1234/v1',
    apiKey: process.env.LLM_API_KEY || '',
    model: process.env.LLM_MODEL || 'qwen/qwen3-1.7b',
  }
}
