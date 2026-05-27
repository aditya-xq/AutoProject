# TESTING

Use this checklist before publishing or releasing AutoProject. Commands are written from the repository root unless a step says otherwise.

## Prerequisites

- Install [Bun](https://bun.sh/).
- Install Docker Desktop or another Docker engine for Docker checks.
- Create `autoproject/.env` from `autoproject/.env.example` for local UI and Docker runs.
- Do not commit or share `autoproject/.env`, `.autoproject/*.db`, `/data`, Docker volume backups, or `docker compose config` output.

## Backend Tests

All backend tests use [Bun's test runner](https://bun.sh/docs/cli/test). Run from `backend/`:

```bash
cd backend
bun test                        # all tests (unit + integration, 600s timeout)
bun run test:unit               # unit tests only, no external deps (120s)
bun run test:integration        # service-level workflow integration (300s)
bun run test:mcp                # MCP tool/resource tests (300s)
bun run test:live               # all live tests (workflow + LLM)
bun run test:live:workflow      # live HTTP workflow E2E; needs running backend
bun run test:live:llm           # live LLM; needs running backend + provider
```

See `backend/TESTING.md` for the full test layout, conventions, and live-test safety rules.

## Static Checks

1. Run backend type checks:

```bash
cd backend
bun install
bun run check
```

2. Run backend tests:

```bash
cd backend
bun test
```

3. Run SvelteKit checks:

```bash
cd autoproject
bun install
bun run check
```

4. Build the SvelteKit app:

```bash
cd autoproject
bun run build
```

5. Validate Docker Compose without printing secrets:

```bash
docker compose config --quiet
```

Do not run `docker compose config` without `--quiet` in shared logs because it expands `.env` values.

## Local Backend API

1. Start the backend:

```bash
cd backend
AUTOPROJECT_ROOT=.. BACKEND_HOST=127.0.0.1 BACKEND_PORT=3001 bun run start
```

2. Check health:

```bash
curl http://127.0.0.1:3001/health
```

Expected result: JSON with `success: true` and `data.status: "ok"`.

3. Initialize state:

```bash
curl -X POST http://127.0.0.1:3001/api/init
```

Expected result: `.autoproject/autoproject.db` exists locally and the response includes the DB path.

4. Check project status:

```bash
curl http://127.0.0.1:3001/api/project/status
```

Expected result: JSON response with `meta`, `steps`, `current`, and `stats`.

## Local SvelteKit App

1. Start the app:

```bash
cd autoproject
bun run dev
```

2. Open `http://localhost:5173`.

3. Verify the home page loads without console errors.

4. Open the projects page and verify existing project data renders if present.

5. Exercise configured AI providers only if the required keys are present in `autoproject/.env`.

## MCP Adapter

MCP is an agent adapter. It is not started by the Docker container.

1. Verify the MCP config exists:

```bash
cat .autoproject/mcp.json
```

Expected result: it launches `bun run --cwd backend mcp` and sets `AUTOPROJECT_ROOT`.

2. Start the MCP server manually:

```bash
bun run --cwd backend mcp
```

Expected result: stderr prints `AutoProject MCP server running on stdio` and the process waits for an MCP client.

3. Connect with an MCP-capable agent using `.autoproject/mcp.json`.

4. Call these tools in order:

```text
project_status
project_validate
steps_current
```

Expected result: the tools return JSON text responses and do not require the Docker web container.

## Docker Build And Run

1. Build the image:

```bash
docker build -t autoproject:test .
```

2. Run the image with a named volume:

```bash
docker run --rm --name autoproject_test -p 3000:3000 -v autoproject_test_data:/data --env-file autoproject/.env autoproject:test
```

3. Open `http://localhost:3000`.

4. Check container health in a second terminal:

```bash
docker inspect --format='{{json .State.Health}}' autoproject_test
```

Expected result: health eventually becomes `healthy`.

5. Stop the container with `Ctrl+C` or:

```bash
docker stop autoproject_test
```

## Docker Compose

1. Start from the source Compose file:

```bash
cd autoproject
docker compose up -d --build
```

2. Check logs:

```bash
docker compose logs -f
```

Expected result: backend logs `AutoProject backend listening on http://127.0.0.1:3001` and the web server starts on port `3000`.

3. Open `http://localhost:3000`.

4. Confirm the named volume exists:

```bash
docker volume inspect autoproject_data
```

5. Stop without deleting data:

```bash
docker compose down
```

6. Start again and verify existing state is still present:

```bash
docker compose up -d
```

## SQLite Persistence

1. Start Docker Compose:

```bash
cd autoproject
docker compose up -d --build
```

2. Initialize or create project state from the UI or backend API.

3. Verify the DB exists inside the volume:

```bash
docker compose exec autoproject ls -la /data/.autoproject
```

Expected result: `autoproject.db` exists. WAL files such as `autoproject.db-wal` and `autoproject.db-shm` may also exist while the app is running.

4. Stop and remove the container while keeping the volume:

```bash
docker compose down
docker compose up -d
```

5. Reopen the app and verify the project state is still present.

6. Only use the following command when intentionally deleting all persisted AutoProject data:

```bash
docker compose down -v
```

## Publish Workflow

1. Confirm the workflow builds, pushes, then scans the published image:

```bash
cat .github/workflows/docker-publish.yml
```

2. Push to `main` only after local checks pass.

3. In GitHub Actions, verify these steps pass:

```text
Build & Push (multi-arch)
Trivy Scan published image
```

4. Confirm DockerHub has updated tags for `xqbuilds/autoproject`.

5. Pull and run the published image using a named `/data` volume before announcing the release.

## End User Smoke Test

1. Create `autoproject/.env` with the required keys.

2. Start the app:

```bash
cd autoproject
docker compose up -d --build
```

3. Open `http://localhost:3000`.

4. Create or initialize project workflow state.

5. Restart the container:

```bash
docker compose restart
```

6. Verify the app loads and previous state remains available.

7. Stop the app without deleting state:

```bash
docker compose down
```
