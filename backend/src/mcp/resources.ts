import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js'
import { autoProjectService } from '../workflow-engine/service'

export function registerResources(server: McpServer) {
  const svc = autoProjectService

  server.registerResource(
    'project-status',
    'autoproject://project/status',
    {
      description: 'Full project state including steps, current step, and statistics',
      mimeType: 'application/json',
    },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          text: JSON.stringify(svc.projectStatus(), null, 2),
          mimeType: 'application/json',
        },
      ],
    }),
  )

  server.registerResource(
    'project-context',
    'autoproject://project/context',
    {
      description: 'PROJECT.md markdown content tracking project summary',
      mimeType: 'text/markdown',
    },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          text: svc.getProjectContext().content || '(empty)',
          mimeType: 'text/markdown',
        },
      ],
    }),
  )

  server.registerResource(
    'steps',
    'autoproject://steps',
    {
      description: 'All steps ordered by sort_order',
      mimeType: 'application/json',
    },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          text: JSON.stringify(svc.listSteps(), null, 2),
          mimeType: 'application/json',
        },
      ],
    }),
  )

  server.registerResource(
    'requirements',
    'autoproject://requirements',
    {
      description: 'All project requirements',
      mimeType: 'application/json',
    },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          text: JSON.stringify(svc.listRequirements(), null, 2),
          mimeType: 'application/json',
        },
      ],
    }),
  )

  server.registerResource(
    'prompts',
    'autoproject://prompts',
    {
      description: 'Available prompt templates for LLM interactions',
      mimeType: 'application/json',
    },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          text: JSON.stringify(svc.listPrompts(), null, 2),
          mimeType: 'application/json',
        },
      ],
    }),
  )

  server.registerResource(
    'worklog',
    'autoproject://worklog',
    {
      description: 'Recent worklog entries across all steps',
      mimeType: 'application/json',
    },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          text: JSON.stringify(svc.worklog(), null, 2),
          mimeType: 'application/json',
        },
      ],
    }),
  )

  server.registerResource(
    'step-detail',
    new ResourceTemplate('autoproject://steps/{stepId}', { list: undefined }),
    {
      description: 'Details for a specific step by ID',
      mimeType: 'application/json',
    },
    async (uri, variables) => {
      const stepId = Array.isArray(variables.stepId) ? variables.stepId[0] : variables.stepId
      return {
        contents: [
          {
            uri: uri.href,
            text: JSON.stringify(svc.getStep(stepId), null, 2),
            mimeType: 'application/json',
          },
        ],
      }
    },
  )

  server.registerResource(
    'step-scenarios',
    new ResourceTemplate('autoproject://steps/{stepId}/scenarios', { list: undefined }),
    {
      description: 'Test scenarios for a specific step',
      mimeType: 'application/json',
    },
    async (uri, variables) => {
      const stepId = Array.isArray(variables.stepId) ? variables.stepId[0] : variables.stepId
      return {
        contents: [
          {
            uri: uri.href,
            text: JSON.stringify(svc.listScenarios(stepId), null, 2),
            mimeType: 'application/json',
          },
        ],
      }
    },
  )

  server.registerResource(
    'step-design',
    new ResourceTemplate('autoproject://steps/{stepId}/design', { list: undefined }),
    {
      description: 'HLD and LLD design artifacts for a specific step',
      mimeType: 'application/json',
    },
    async (uri, variables) => {
      const stepId = Array.isArray(variables.stepId) ? variables.stepId[0] : variables.stepId
      return {
        contents: [
          {
            uri: uri.href,
            text: JSON.stringify(svc.getDesign(stepId), null, 2),
            mimeType: 'application/json',
          },
        ],
      }
    },
  )

  server.registerResource(
    'step-quality-gates',
    new ResourceTemplate('autoproject://steps/{stepId}/quality-gates', { list: undefined }),
    {
      description: 'Quality gate run history for a specific step',
      mimeType: 'application/json',
    },
    async (uri, variables) => {
      const stepId = Array.isArray(variables.stepId) ? variables.stepId[0] : variables.stepId
      return {
        contents: [
          {
            uri: uri.href,
            text: JSON.stringify(svc.qualityGateStatus(stepId), null, 2),
            mimeType: 'application/json',
          },
        ],
      }
    },
  )
}
