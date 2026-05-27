# AutoProject

AutoProject is your ultimate **Bring Your Own Keys (BYOK)** tool to automate product and project management with AI-powered workflows. It combines a **SvelteKit 2 + Svelte 5 frontend** for human interaction with a **Bun/Hono backend + MCP server** that drives an AI-agent workflow engine, all deployable as a single Docker container.

---

## Architecture

```
autoproject/          SvelteKit 2 + Svelte 5 UI (port 3000)
  └── src/            AI-powered PRD, user stories, Linear integration, project view

backend/              Bun/Hono HTTP API + MCP server + workflow engine (port 3001)
  ├── src/
  │   ├── app.ts              Hono app (37 HTTP endpoints)
  │   ├── mcp/                MCP server (32 tools, 10 resources)
  │   ├── llm/                LLM client (OpenAI-compatible abstraction)
  │   ├── shared/             ApiError, response helpers, validation
  │   └── workflow-engine/    SQLite state machine, prompts, quality gates
  ├── dist/                   Compiled backend
  └── package.json

Dockerfile                Multi-stage build — both layers in one image
docker-entrypoint.sh      Starts backend then serves SvelteKit on port 3000
```

The frontend and backend are co-deployed in a single container. The SvelteKit app on port `3000` communicates with the backend API on port `3001`. AI agents use the **MCP server** (stdio) as their primary integration point; HTTP endpoints mirror the same operations for non-agent automation.

---

## Key Features

- **AI PRD Creation**: Feed your requirements and receive tailor-made PRDs.
- **AI User Story Generation**: Convert PRDs into smart, structured user stories.
- **Project View**: Manage your user stories, copy their details for AI prompting.
- **Tool Integration**: Instantly push stories into Linear.
- **AI-Agent Workflow Engine**: Requirements become incremental steps stored in SQLite; agents orchestrate the full lifecycle (scenarios, design, tests, gates).
- **Multiple Inference Support**: Choose from Gemini, Groq, OpenAI, Anthropic, LM Studio, or any OpenAI-compatible endpoint.
- **Preset Modes**: Specialized configurations for different use cases.

---

## Running with Docker (Recommended)

### Using Docker Compose

Ensure [Docker Desktop](https://www.docker.com/products/docker-desktop) is installed and the engine is running.

Prepare your `.env` file in `autoproject/`:

```bash
# PROJECT TOOLS API TOKENS
SECRET_LINEAR_API_KEY="Your linear api key"
SECRET_JIRA_API_TOKEN="Your jira api token"
SECRET_ASANA_API_TOKEN="Your asana api token"
SECRET_PLANE_API_TOKEN="Your plane api token"

# AI API TOKENS
SECRET_GEMINI_API_KEY="Your gemini api key"
SECRET_GROQ_API_KEY="Your groq api key"
SECRET_OPENAI_API_KEY="Your openai api key"
SECRET_ANTHROPIC_API_KEY="Your anthropic api key"

# Local inference
INFERENCE_SERVER_URL=http://127.0.0.1:1234
INFERENCE_SERVER_URL_DOCKER=http://host.docker.internal:1234

# LLM provider for the backend workflow engine (optional)
LLM_BASE_URL=http://127.0.0.1:1234/v1
LLM_MODEL=qwen/qwen3-1.7b
```

Use the provided compose file in `autoproject/docker-compose.yml`:

```bash
docker compose -f autoproject/docker-compose.yml up -d --build
```

Access the app at [http://localhost:3000](http://localhost:3000).

AutoProject stores SQLite state under `/data/.autoproject/autoproject.db`. The named volume keeps this data safe across restarts.

```bash
docker compose -f autoproject/docker-compose.yml stop
docker compose -f autoproject/docker-compose.yml down      # keep volume
docker compose -f autoproject/docker-compose.yml down -v    # delete all data
```

---

## Development Setup

### Prerequisites

- [Bun](https://bun.sh/) (latest version)
- Docker Desktop (optional, for Docker testing)
- API keys for your chosen AI providers

### Frontend (SvelteKit)

```bash
cd autoproject
bun install
cp .env.example .env        # Edit with your real API keys
bun run dev                  # Dev server at http://localhost:5173
bun run build                # Production build
bun run preview              # Preview at http://localhost:4173
```

### Backend (Hono API + MCP)

```bash
cd backend
bun install
bun run dev                  # HTTP API on http://127.0.0.1:3001
bun run mcp                  # MCP server on stdio
```

See `backend/README.md` for full MCP tool and HTTP endpoint reference.

---

## Environment Variables

| Variable                    | Required | Description                                    |
|:----------------------------|:--------:|:-----------------------------------------------|
| `SECRET_LINEAR_API_KEY`     | ✅       | Linear API access key                          |
| `SECRET_GEMINI_API_KEY`     | ✅       | Gemini API access key                          |
| `SECRET_GROQ_API_KEY`       | ✅       | Groq API access key                            |
| `SECRET_OPENAI_API_KEY`     |          | OpenAI API key (for LLM or AI SDK)             |
| `SECRET_ANTHROPIC_API_KEY`  |          | Anthropic API key                              |
| `SECRET_JIRA_API_TOKEN`     |          | Jira API token                                 |
| `SECRET_ASANA_API_TOKEN`    |          | Asana API token                                |
| `SECRET_PLANE_API_TOKEN`    |          | Plane API token                                |
| `INFERENCE_SERVER_URL`       |          | Local inference URL (default `http://127.0.0.1:1234`) |
| `INFERENCE_SERVER_URL_DOCKER`|          | Docker host inference URL                      |
| `LLM_BASE_URL_DOCKER`        |          | Docker host LLM URL override                   |
| `PORT`                      |          | Web server port (default `3000`)               |
| `HOST`                      |          | Web server host (default `0.0.0.0`)            |
| `BACKEND_PORT`              |          | Backend API port (default `3001`)              |
| `BACKEND_HOST`              |          | Backend API host (default `127.0.0.1`)         |
| `AUTOPROJECT_BACKEND_URL`   |          | Backend URL for web server (Docker auto-set)   |
| `DOCKER_ENV`                |          | Set to `true` inside Docker container          |
| `LLM_BASE_URL`              |          | OpenAI-compatible API base for backend         |
| `LLM_API_KEY`               |          | API key for the LLM provider                   |
| `LLM_MODEL`                 |          | Default LLM model for backend                  |
| `AUTOPROJECT_ROOT`          |          | Workspace root (default `/data` in Docker)     |

> No secrets are included in the public Docker image. All sensitive information must be provided at runtime via `.env`.

---

## Core Workflow (AI-Agent MCP)

```
requirements → prompts_execute (step-generation) → steps_import
  └→ for each step: test-scenarios → design → tests → implement → gates → complete
```

See `AUTOPROJECT.md` for the full methodology and agent work loop.

---

## Testing

```bash
# Backend tests
cd backend
bun test                     # All tests (600s timeout)
bun run test:unit            # Unit tests only (120s timeout)
bun run test:integration     # Service-level integration tests
bun run test:mcp             # MCP tool/resource tests
bun run test:live            # All live tests (workflow + LLM)
bun run test:live:workflow   # Live HTTP workflow E2E
bun run test:live:llm        # Live LLM integration (needs LLM provider)
```

See `TESTING.md` for the full testing checklist and `backend/TESTING.md` for backend-specific test details.

---

## Contributing

Contributions are welcome! Feel free to fork, clone, and submit PRs.

---

## License

Licensed under the [MIT License](LICENSE).
