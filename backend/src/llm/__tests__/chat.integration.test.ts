import { describe, test } from 'bun:test'
import { setupIntegrationTests, BACKEND_URL, LLM_MODEL } from './setup'
import { testReq, testRawReq } from './helpers'

setupIntegrationTests()

describe('[Integration] Chat - Successful Requests', () => {
  test('Basic chat request', async () => {
    await testReq(
      'Basic chat request',
      'POST',
      `${BACKEND_URL}/api/llm/chat`,
      {
        messages: [{ role: 'user', content: 'Say hello in one word.' }],
        model: LLM_MODEL,
        max_tokens: 50,
      },
      200,
      undefined,
      'Confirms the backend can proxy a minimal chat completion.',
    )
  })

  test('Chat with temperature', async () => {
    await testReq(
      'Chat with temperature',
      'POST',
      `${BACKEND_URL}/api/llm/chat`,
      {
        messages: [{ role: 'user', content: 'Count to 3.' }],
        model: LLM_MODEL,
        temperature: 0.8,
        max_tokens: 30,
      },
      200,
      undefined,
      'Shows non-default generation settings are accepted.',
    )
  })

  test('Chat with system prompt', async () => {
    await testReq(
      'Chat with system prompt',
      'POST',
      `${BACKEND_URL}/api/llm/chat`,
      {
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: 'What is 2+2?' },
        ],
        model: LLM_MODEL,
        max_tokens: 20,
      },
      200,
      undefined,
      'Exercises a normal system + user conversation shape.',
    )
  })

  test('JSON response format', async () => {
    await testReq(
      'JSON response format',
      'POST',
      `${BACKEND_URL}/api/llm/chat`,
      {
        messages: [{ role: 'user', content: "Return JSON with key 'answer' and value 42." }],
        model: LLM_MODEL,
        max_tokens: 50,
      },
      200,
      'answer',
      'Verifies the generated text contains the requested key.',
    )
  })
})

describe('[Integration] Chat - Validation Errors', () => {
  test('Rejects empty messages array', async () => {
    await testReq('Rejects empty messages array', 'POST', `${BACKEND_URL}/api/llm/chat`, { messages: [] }, 400)
  })

  test('Rejects missing messages', async () => {
    await testReq('Rejects missing messages', 'POST', `${BACKEND_URL}/api/llm/chat`, {}, 400)
  })

  test('Rejects non-array messages', async () => {
    await testReq('Rejects non-array messages', 'POST', `${BACKEND_URL}/api/llm/chat`, { messages: 'not-array' }, 400)
  })

  test('Streaming enabled', async () => {
    await testReq(
      'Streaming enabled',
      'POST',
      `${BACKEND_URL}/api/llm/chat`,
      { messages: [{ role: 'user', content: 'Hi' }], stream: true },
      500,
      undefined,
      'Documents current non-streaming behavior through this endpoint.',
    )
  })
})

describe('[Integration] Chat - Message Shapes & Edge Cases', () => {
  test('Arbitrary fields passthrough', async () => {
    await testReq(
      'Arbitrary fields passthrough',
      'POST',
      `${BACKEND_URL}/api/llm/chat`,
      {
        messages: [{ role: 'user', content: 'Hi' }],
        model: LLM_MODEL,
        top_p: 0.9,
        presence_penalty: 0.5,
        frequency_penalty: 0.3,
        metadata: { test: true },
      },
      200,
      undefined,
      'Confirms extra OpenAI-compatible fields are passed through.',
    )
  })

  test('Long content in message', async () => {
    await testReq(
      'Long content in message',
      'POST',
      `${BACKEND_URL}/api/llm/chat`,
      {
        messages: [{ role: 'user', content: Array(20).fill('word').join(' ') }],
        model: LLM_MODEL,
        max_tokens: 10,
      },
      200,
      undefined,
      'Keeps longer prompts readable in the report through syntax highlighting.',
    )
  })

  test('Special characters in message', async () => {
    await testReq(
      'Special characters in message',
      'POST',
      `${BACKEND_URL}/api/llm/chat`,
      { messages: [{ role: 'user', content: 'Hello! 你好 🌍 {"key": "value"}' }], model: LLM_MODEL },
      200,
      undefined,
      'Exercises Unicode, emoji, and embedded JSON-like text.',
    )
  })

  test('All message roles', async () => {
    await testReq(
      'All message roles',
      'POST',
      `${BACKEND_URL}/api/llm/chat`,
      {
        messages: [
          { role: 'system', content: 'Be concise.' },
          { role: 'user', content: 'Hi' },
          { role: 'assistant', content: 'Hello!' },
          { role: 'user', content: 'How are you?' },
        ],
        model: LLM_MODEL,
        max_tokens: 20,
      },
      200,
      undefined,
      'Covers system → user → assistant → user conversation shape.',
    )
  })

  test('Developer role (OpenAI-specific)', async () => {
    await testReq(
      'Developer role (OpenAI-specific)',
      'POST',
      `${BACKEND_URL}/api/llm/chat`,
      {
        messages: [
          { role: 'developer', content: 'You are a helpful assistant.' },
          { role: 'user', content: 'Hi' },
        ],
        model: LLM_MODEL,
        max_tokens: 20,
      },
      200,
      undefined,
      'Checks whether the configured provider accepts the developer role.',
    )
  })

  test('Tool message with tool_call_id', async () => {
    await testReq(
      'Tool message with tool_call_id',
      'POST',
      `${BACKEND_URL}/api/llm/chat`,
      {
        messages: [
          { role: 'user', content: "What's the weather?" },
          {
            role: 'assistant',
            content: null,
            tool_calls: [
              { id: 'call_1', type: 'function', function: { name: 'get_weather', arguments: '{}' } },
            ],
          },
          { role: 'tool', tool_call_id: 'call_1', content: '{"temp": 72}' },
          { role: 'user', content: 'Thanks!' },
        ],
        model: LLM_MODEL,
        max_tokens: 20,
      },
      200,
      undefined,
      'Checks tool-call transcript compatibility.',
    )
  })

  test('Rejects text/plain body', async () => {
    await testRawReq(
      'Rejects text/plain body',
      'POST',
      `${BACKEND_URL}/api/llm/chat`,
      { headers: { 'Content-Type': 'text/plain' }, body: 'this is not json' },
      400,
      'Router should not treat a plain text body as valid chat JSON.',
    )
  })

  test('Rejects malformed JSON body', async () => {
    await testRawReq(
      'Rejects malformed JSON body',
      'POST',
      `${BACKEND_URL}/api/llm/chat`,
      { headers: { 'Content-Type': 'application/json' }, body: '{bad json' },
      400,
      'Parser failures should become a clean validation response.',
    )
  })
})
