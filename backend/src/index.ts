import { serve } from 'bun'
import { app } from './app'

const port = Number(process.env.BACKEND_PORT || 3001)
const hostname = process.env.BACKEND_HOST || '127.0.0.1'

serve({
  port,
  hostname,
  fetch: app.fetch,
})

console.log(`AutoProject backend listening on http://${hostname}:${port}`)
