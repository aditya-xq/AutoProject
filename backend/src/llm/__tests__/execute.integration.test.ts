import { test } from 'bun:test'
import { setupIntegrationTests, BACKEND_URL, LIVE_SUITE } from './setup'
import { testReq, testExecuteReq } from './helpers'

setupIntegrationTests()

LIVE_SUITE('[Integration] Execute - Successful Execution', () => {
  test('Execute step-generation prompt', async () => {
    await testExecuteReq(
      'Execute step-generation prompt',
      `${BACKEND_URL}/api/llm/execute`,
      {
        promptKey: 'step-generation',
        context: 'Build a calculator app with add, subtract, multiply, divide.',
      },
      201,
      'step-generation can render and call the LLM without an existing step record.',
    )
  })

  test('Execute project-context-update prompt', async () => {
    await testExecuteReq(
      'Execute project-context-update prompt',
      `${BACKEND_URL}/api/llm/execute`,
      {
        promptKey: 'project-context-update',
        stepId: '__test__',
        context: 'Completed step 1: setup project',
      },
      201,
      'project-context-update accepts a dummy stepId in this route flow.',
    )
  })
})

LIVE_SUITE('[Integration] Execute - Validation Errors', () => {
  test('Rejects missing promptKey', async () => {
    await testReq(
      'Rejects missing promptKey',
      'POST',
      `${BACKEND_URL}/api/llm/execute`,
      { context: 'test' },
      400,
    )
  })

  test('Rejects missing stepId', async () => {
    await testReq(
      'Rejects missing stepId',
      'POST',
      `${BACKEND_URL}/api/llm/execute`,
      { promptKey: 'any-non-step-generation-key' },
      400,
    )
  })

  test('Rejects unknown promptKey', async () => {
    await testReq(
      'Rejects unknown promptKey',
      'POST',
      `${BACKEND_URL}/api/llm/execute`,
      { promptKey: 'does-not-exist-xyz', stepId: 'fake-test-step' },
      404,
    )
  })
})
