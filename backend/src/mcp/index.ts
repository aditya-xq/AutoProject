import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { registerTools } from './tools'
import { registerResources } from './resources'

const server = new McpServer(
  {
    name: 'autoproject-mcp',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  },
)

registerTools(server)
registerResources(server)

async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error('AutoProject MCP server running on stdio')
}

main().catch((err) => {
  console.error('Fatal MCP server error:', err)
  process.exit(1)
})

async function shutdown() {
  console.error('Shutting down MCP server...')
  const timer = setTimeout(() => {
    console.error('Shutdown timeout — forcing exit')
    process.exit(0)
  }, 5_000)
  timer.unref()
  try {
    await server.close()
  } catch {
    // best-effort close
  }
  clearTimeout(timer)
  process.exit(0)
}

process.on('SIGINT', () => shutdown().catch(() => process.exit(1)))
process.on('SIGTERM', () => shutdown().catch(() => process.exit(1)))
