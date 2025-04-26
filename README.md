# 🚀 AutoProject

AutoProject is your ultimate **Bring Your Own Keys (BYOK)** tool to automate product and project management with AI-powered workflows.  
Run locally, in production, or securely in Docker — your choice.

---

## 🌟 Key Features

- **Generative PRD Creation**: Feed your requirements and receive tailor-made PRDs.
- **AI-Powered User Story Generation**: Convert PRDs into smart, structured user stories.
- **Tool Integration**: Instantly push stories into Linear, Asana, Jira, or Plane.

---

## 🛠️ Tech Stack

| Part | Technology |
|:-----|:-----------|
| Backend | SvelteKit (API routes) |
| Frontend | Svelte 5 + TailwindCSS v4 |
| AI Engines | Gemini, Groq, LM Studio (local inference) |
| Project Management API | Linear SDK |

Built with ⚡ **Bun** for fast runtime performance.

---

## 🚀 Getting Started (Development Mode)

### Prerequisites

- [Bun](https://bun.sh/) (latest version)
- [Docker Desktop](https://www.docker.com/products/docker-desktop) (for Docker option)
- API Keys:
  - **Linear API Key** — [Create here](https://linear.app/settings/api)
  - **Gemini API Key** — [Create here](https://ai.google.dev/)
  - **Groq API Key** — [Create here](https://console.groq.com/keys)

---

### 1. Local Development Setup

Clone and install dependencies:

```bash
git clone https://github.com/aditya-xq/AutoProject.git
cd AutoProject/autoproject
bun install
```

Create your `.env` file:

```bash
cp .env.example .env
# Edit .env and add your real API keys
```

Run the app in development mode:

```bash
bun run dev
```

Access the app at [http://localhost:5173](http://localhost:5173).

---

## 🔥 Running in Production Mode

Build the app:

```bash
bun run build
```

Preview the production build:

```bash
bun run preview
```

Default preview port: **4173**.  
Access it at [http://localhost:4173](http://localhost:4173).

---

## 🐳 Running with Docker

### 1. Using Docker Compose (Recommended)

Prepare your `.env` file:

```bash
cp .env.example .env
# Fill in your API keys
```

Use the provided `docker-compose.yml` or create one like this:

```yaml
services:
  autoproject:
    image: xqbuilds/autoproject:latest
    ports:
      - "3000:3000"
    env_file:
      - .env
    environment:
      NODE_ENV: production
    restart: unless-stopped
```

Run:

```bash
docker-compose up -d
```

Access the app at [http://localhost:3000](http://localhost:3000).

---

### 2. Running Manually Without Compose

```bash
docker run --env-file .env -p 3000:3000 xqbuilds/autoproject:latest
```

---

## 📜 Environment Variables

| Variable | Required | Description |
|:---------|:--------:|:------------|
| `SECRET_GEMINI_API_KEY` | ✅ | Gemini API access key |
| `SECRET_LINEAR_API_KEY` | ✅ | Linear API access key |
| `SECRET_GROQ_API_KEY` | ✅ | Groq API access key |
| `PORT` | ❌ | (Optional) Web server port, defaults to 3000 |
| `HOST` | ❌ | (Optional) Web server host, defaults to 0.0.0.0 |

**Important:**  
> 🚨 No secrets are included inside the public Docker image. All sensitive information must be provided by the user at runtime.

---

## 🙌 Contributing

Contributions are welcome! Feel free to fork, clone, and submit PRs.

---

## 💬 Feedback

Connect on Twitter [@xq_is_here](https://x.com/xq_is_here) and share your feedback!

---

## 📄 License

Licensed under the [MIT License](LICENSE).

---
