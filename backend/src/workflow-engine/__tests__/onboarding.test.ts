import { describe, expect, test } from 'bun:test'
import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const { AutoProjectService } = await import('../service')
const { BACKEND_DIR, PROMPTS_PATH } = await import('../paths')

function isolatedService(name: string) {
  const root = join(tmpdir(), name)
  rmSync(root, { recursive: true, force: true })
  mkdirSync(root, { recursive: true })
  const autoprojectDir = join(root, '.autoproject')
  return {
    root,
    autoprojectDir,
    service: new AutoProjectService({
      root,
      autoprojectDir,
      dbPath: join(autoprojectDir, 'autoproject.db'),
      promptsPath: PROMPTS_PATH,
      projectContextPath: join(root, 'PROJECT.md'),
      backendDir: BACKEND_DIR,
    }),
  }
}

describe('Onboarding assets', () => {
  test('init writes MCP-first agent assets without requiring existing files', () => {
    const { root, autoprojectDir, service } = isolatedService(
      'workflow-engine-onboarding-init-test',
    )
    const result = service.init()

    expect(result.assets.created.some((p) => p.endsWith('AGENTS.md'))).toBe(true)
    expect(existsSync(join(autoprojectDir, 'AGENTS.md'))).toBe(true)
    expect(existsSync(join(autoprojectDir, 'runtime-skill.md'))).toBe(true)
    expect(existsSync(join(autoprojectDir, 'init-skill.md'))).toBe(true)
    expect(existsSync(join(autoprojectDir, 'mcp.json'))).toBe(true)

    const mcpConfig = JSON.parse(readFileSync(join(autoprojectDir, 'mcp.json'), 'utf-8'))
    expect(mcpConfig.mcpServers.autoproject.command).toBe('bun')
    expect(mcpConfig.mcpServers.autoproject.env.AUTOPROJECT_ROOT).toBe(root)
  })

  test('onboard records requirements, PROJECT.md context, assets, and supplied steps', () => {
    const { root, autoprojectDir, service } = isolatedService(
      'workflow-engine-onboarding-flow-test',
    )
    service.init()

    const result = service.onboard({
      requirements: 'Modernize the existing application safely.',
      projectContext: 'Existing Bun backend with MCP tooling.',
      steps: [
        {
          step_number: '1',
          title: 'Audit',
          objective: 'Audit the current project',
          depends_on: null,
        },
      ],
    })

    expect(result.message).toContain('Onboarded')
    expect(result.requirementId).toMatch(/^req-/)
    expect('stepsCreated' in result ? result.stepsCreated : 0).toBe(1)
    expect(readFileSync(join(root, 'PROJECT.md'), 'utf-8')).toContain(
      'Existing Bun backend with MCP tooling.',
    )
    expect(readFileSync(join(autoprojectDir, 'AGENTS.md'), 'utf-8')).toContain('MCP')

    const requirements = service.listRequirements().requirements as {
      source: string
      body: string
    }[]
    expect(
      requirements.some((req) => req.source === 'onboard' && req.body.includes('Modernize')),
    ).toBe(true)
  })
})
