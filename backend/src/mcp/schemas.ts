import { z } from 'zod'

const stepFields = {
  step_number: z.string(),
  title: z.string(),
  objective: z.string(),
  context: z.string().optional(),
  test_suite_intent: z.string().optional(),
  implementation_plan_intent: z.string().optional(),
  validation: z.string().optional(),
  depends_on: z.string().nullable().optional(),
}

export const init = {}

export const seed = {
  steps: z.array(z.object(stepFields)),
}

export const projectStatus = {}
export const projectValidate = {}
export const projectContextGet = {}
export const projectContextUpdate = {
  content: z.string(),
}

export const stepsList = {}
export const stepsCurrent = {}

export const stepsGet = {
  id: z.string(),
}

export const stepsCreate = stepFields

export const stepsImport = {
  steps: z.array(z.object(stepFields)),
}

export const stepsUpdate = {
  id: z.string(),
  title: z.string().optional(),
  objective: z.string().optional(),
  context: z.string().optional(),
  test_suite_intent: z.string().optional(),
  implementation_plan_intent: z.string().optional(),
  validation: z.string().optional(),
  status: z.string().optional(),
  depends_on: z.string().nullable().optional(),
}

export const stepsDelete = {
  id: z.string(),
}

export const stepAction = {
  id: z.string(),
  action: z.string(),
}

export const promptsList = {}
export const promptsRender = {
  promptKey: z.string(),
  stepId: z.string().optional(),
  context: z.string().optional(),
}

export const promptsExecute = {
  promptKey: z.string(),
  stepId: z.string().optional(),
  context: z.string().optional(),
  model: z.string().optional(),
  temperature: z.number().optional(),
  max_tokens: z.number().optional(),
  max_completion_tokens: z.number().optional(),
  response_format: z.record(z.string(), z.any()).optional(),
  llm: z.record(z.string(), z.any()).optional(),
}

export const promptsComplete = {
  runId: z.string(),
  status: z.enum(['completed', 'failed']),
  outputRef: z.string().optional(),
}

export const scenariosList = {
  stepId: z.string(),
}

export const scenariosImport = {
  stepId: z.string(),
  promptRunId: z.string().optional(),
  scenarios: z.array(
    z.object({
      title: z.string(),
      category: z.string().optional(),
      priority: z.enum(['critical', 'high', 'medium', 'low']).optional(),
      preconditions: z.union([z.string(), z.array(z.string())]).optional(),
      steps: z.union([z.string(), z.array(z.string())]).optional(),
      expected_result: z.string(),
      automation_notes: z.string().optional(),
      coverage_tags: z.union([z.string(), z.array(z.string())]).optional(),
    }),
  ),
}

export const scenarioStatusUpdate = {
  id: z.string(),
  status: z.enum(['proposed', 'automated', 'passing', 'failing', 'deferred']),
}

export const designGet = {
  stepId: z.string(),
}

export const designImport = {
  stepId: z.string(),
  promptRunId: z.string().optional(),
  hld: z.record(z.string(), z.any()),
  lld: z.record(z.string(), z.any()),
}

export const testSuitesCreate = {
  stepId: z.string(),
  name: z.string(),
  filePatterns: z.array(z.string()).optional(),
}

export const testSuitesRun = {
  id: z.string(),
}

export const testSuitesStatus = {
  id: z.string().optional(),
}

export const qualityGatesRun = {
  stepId: z.string(),
}

export const qualityGatesStatus = {
  stepId: z.string().optional(),
}

export const requirementsAdd = {
  body: z.string(),
  source: z.string().optional(),
}

export const requirementsList = {}

export const worklog = {
  stepId: z.string().optional(),
}

export const onboard = {
  requirements: z.string(),
  projectContext: z.string(),
  generateSteps: z.boolean().optional(),
  steps: z.array(z.object(stepFields)).optional(),
}
