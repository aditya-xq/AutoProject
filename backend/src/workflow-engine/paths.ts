import { join, resolve } from 'node:path'

const srcDir = import.meta.dir

export const ROOT = process.env.AUTOPROJECT_ROOT
  ? resolve(process.env.AUTOPROJECT_ROOT)
  : resolve(srcDir, '..', '..', '..')

export const AUTOPROJECT_DIR = join(ROOT, '.autoproject')
export const DB_PATH = join(AUTOPROJECT_DIR, 'autoproject.db')
export const PROMPTS_PATH = join(srcDir, 'prompts.json')
export const PROJECT_CONTEXT_PATH = join(ROOT, 'PROJECT.md')
export const BACKEND_DIR = resolve(srcDir, '..', '..')
