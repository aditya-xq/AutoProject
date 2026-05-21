import { ApiError, ErrorCodes } from '../shared/errors'
import type { LLMConfig, LLMRequest, LLMResponse } from './types'
import { defaultConfig } from './types'

function withoutUndefined(input: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined))
}

function normalizeContent(content: unknown): string {
  if (typeof content === 'string') return content
  if (typeof content === 'number' || typeof content === 'boolean') return String(content)
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === 'string') return part
        if (part && typeof part === 'object' && 'text' in part)
          return String((part as { text: unknown }).text || '')
        return ''
      })
      .join('')
  }
  return ''
}

export class LLMClient {
  private config: LLMConfig

  constructor(config?: Partial<LLMConfig>) {
    this.config = { ...defaultConfig(), ...config }
  }

  private get baseUrl(): string {
    return this.config.baseUrl.replace(/\/+$/, '')
  }

  async chat(req: LLMRequest): Promise<LLMResponse> {
    const apiKey = this.config.apiKey || this.resolveApiKey()
    const model = req.model || this.config.model
    if (!Array.isArray(req.messages) || req.messages.length === 0)
      throw new Error('messages must be a non-empty array')
    if (req.stream)
      throw new Error(
        'Streaming chat completions are not supported by this helper; use a direct provider stream.',
      )

    const { model: _model, ...rest } = req
    const body = withoutUndefined({ model, ...rest })
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (apiKey) headers.Authorization = `Bearer ${apiKey}`

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(120_000),
    })

    if (!res.ok) {
      const errBody = await res.text().catch(() => '')
      let message: string
      try {
        const parsed = JSON.parse(errBody)
        message = parsed.error?.message || parsed.error || errBody
      } catch {
        message = errBody || `HTTP ${res.status}`
      }
      throw new ApiError(ErrorCodes.LLM_ERROR, message, res.status)
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: unknown } }[]
      model?: string
      usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number }
    }

    return {
      content: normalizeContent(data.choices?.[0]?.message?.content),
      model: data.model || model,
      usage: {
        prompt_tokens: data.usage?.prompt_tokens || 0,
        completion_tokens: data.usage?.completion_tokens || 0,
        total_tokens: data.usage?.total_tokens || 0,
      },
      raw: data,
    }
  }

  private resolveApiKey(): string {
    const base = this.config.baseUrl.toLowerCase()
    if (base.includes('api.openai.com')) return process.env.OPENAI_API_KEY || ''
    if (base.includes('anthropic')) return process.env.ANTHROPIC_API_KEY || ''
    return process.env.LLM_API_KEY || ''
  }
}

export const llmClient = new LLMClient()
