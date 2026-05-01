# AutoProject

SvelteKit app with Bun runtime for AI-powered project management.

## Developer Commands

```bash
cd autoproject
bun install          # Install dependencies
bun run dev          # Dev server at http://localhost:5173
bun run build        # Production build
bun run preview      # Preview production at http://localhost:4173
bun run check        # TypeScript + Svelte type checking
```

## Tech Stack

- **Runtime**: Bun (not Node.js)
- **Framework**: SvelteKit 2 + Svelte 5
- **Build**: Vite + TailwindCSS v4
- **Adapter**: svelte-adapter-bun
- **AI**: @ai-sdk/google, @ai-sdk/groq, @ai-sdk/openai
- **Integration**: @linear/sdk

## Environment

Create `.env` from `.env.example`. Required vars:
- `SECRET_GEMINI_API_KEY`
- `SECRET_LINEAR_API_KEY`
- `SECRET_GROQ_API_KEY`

## Notes

- Run all commands from `autoproject/` directory
- SvelteKit uses `svelte-adapter-bun` - not compatible with Node adapters
- TailwindCSS v4 uses `@tailwindcss/vite` plugin (not PostCSS)
- Svelte 5 runes mode enabled by default

## Self-Improvement

Capture learnings from errors, corrections, and discoveries. Update this file when:

- **User corrections**: When you get corrected, note what you got wrong and why
- **Pointed out mistakes**: When the user highlights an error, record the correct approach
- **Self-corrections**: When you catch and fix your own mistake during work, document the lesson
- **Discovered context**: Commands, quirks, conventions, or gotchas that took time to figure out
- **Non-obvious behavior**: Anything that differs from docs/defaults

Before ending a session, ask: "Did I learn anything that would help a future agent?" If yes, update AGENTS.md.