import type { Client } from '@modelcontextprotocol/sdk/client/index.js'

export function getToolNames(tools: { name: string }[]): string[] {
  return tools.map((t) => t.name).sort()
}

export function getResourceNames(resources: { name: string }[]): string[] {
  return resources.map((r) => r.name).sort()
}

/** Parse text content from an MCP tool call result. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseJsonContent(result: any): unknown {
  return JSON.parse(result.content[0].text as string)
}

/** Get the first step ID from the seeded steps. */
export async function getFirstStepId(client: Client): Promise<string> {
  const list = await client.callTool({ name: 'steps_list', arguments: {} })
  return (parseJsonContent(list) as { steps: { id: string }[] }).steps[0].id
}

/** Get the last step ID from the seeded steps. */
export async function getLastStepId(client: Client): Promise<string> {
  const list = await client.callTool({ name: 'steps_list', arguments: {} })
  const data = parseJsonContent(list) as { steps: { id: string }[] }
  return data.steps[data.steps.length - 1].id
}

/** Get a scenario ID for a given step. */
export async function getScenarioId(client: Client, stepId: string, index = 0): Promise<string> {
  const list = await client.callTool({ name: 'scenarios_list', arguments: { stepId } })
  const data = parseJsonContent(list) as { scenarios: { id: string }[] }
  return data.scenarios[index].id
}

/** Get the first test suite ID. */
export async function getSuiteId(client: Client): Promise<string> {
  const list = await client.callTool({ name: 'test_suites_status', arguments: {} })
  const data = parseJsonContent(list) as { suites: { id: string }[] }
  return data.suites[0].id
}
