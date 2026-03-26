# AI Resume -> Template Automation Tool

Convert a resume (PDF or DOCX) into a recruiter-ready `.docx` submission document by extracting structured data with an AI provider fallback chain and injecting it into an existing Word template.

Live app: `https://ai-resume-template-automation-tool.onrender.com/`

## Features

- Upload a resume (`.pdf` or `.docx`)
- Extract structured data with AI provider fallback (OpenAI -> Groq -> OpenRouter -> Ollama)
- Upload your fixed Prolink-style Word template (`.docx`)
- Inject extracted data into template placeholders (no HTML-based layout recreation)
- Download the generated `.docx`
- Simple JSON preview/edit step before download

## Template Placeholders

This app expects your DOCX template to contain bracket placeholders like:

- `[NAME]`
- `[LOCATION]`
- `[DISCIPLINE]`
- `[CONTACT_INFO]`
- `[EXPERIENCE]`
- `[CERTIFICATIONS]`
- `[LICENSES]`
- `[SKILLS]`
- `[EQUIPMENT]`

Notes:
- Placeholders must appear exactly (case-sensitive).
- Work history, licenses, certifications, skills, and equipment are injected as newline-separated strings.

## Setup

1. Copy `.env.example` to `.env` and set at least one AI provider key, or run Ollama locally.
2. Install dependencies.
3. Start the server.

```bash
npm install
npm run dev
```

Local server runs on `http://localhost:3000`.
Production app runs on `https://ai-resume-template-automation-tool.onrender.com/`.

## Deploy

### Railway

1. Create a new project from this repo.
2. Set the start command to `npm run start` if Railway does not detect it automatically.
3. Add your environment variables in Railway's Variables tab.
4. Deploy and open `/api/health` to confirm the service is live.

### Render

This repo includes [`render.yaml`](/Users/administrator/Documents/Github/Devan/AI-Resume-Template-Automation-Tool/render.yaml).

1. Create a new Blueprint or Web Service from the repo.
2. Set the required secret env vars in Render.
3. Deploy and verify `/api/health`.

### Docker

This repo includes [`Dockerfile`](/Users/administrator/Documents/Github/Devan/AI-Resume-Template-Automation-Tool/Dockerfile) and [`.dockerignore`](/Users/administrator/Documents/Github/Devan/AI-Resume-Template-Automation-Tool/.dockerignore).

Build and run locally:

```bash
docker build -t ai-resume-template-automation-tool .
docker run --rm -p 3000:3000 --env-file .env ai-resume-template-automation-tool
```

### VPS With PM2

1. Install Node 22 and clone the repo.
2. Run `npm install`.
3. Create the production `.env`.
4. Start the app with `pm2 start npm --name ai-resume-tool -- run start`.
5. Put Nginx or Caddy in front of port `3000`.

## Environment Variables

Create a `.env` file:

- `OPENAI_API_KEY` / `OPENAI_MODEL` (first priority)
- `GROQ_API_KEY` / `GROQ_MODEL` (second priority)
- `OPENROUTER_API_KEY` / `OPENROUTER_MODEL` (third priority)
- `OLLAMA_BASE_URL` / `OLLAMA_MODEL` (final local fallback)
- `OPENROUTER_SITE_URL` / `OPENROUTER_APP_NAME` (optional headers for OpenRouter)

The backend tries providers in this order:

1. OpenAI
2. Groq
3. OpenRouter
4. Ollama

Notes:
- Set at least one cloud provider key in production unless Ollama is running on the same host.
- Set `OPENROUTER_SITE_URL` to `https://ai-resume-template-automation-tool.onrender.com/` when using the current Render deployment.
- Do not commit your real `.env` file.

## API

### `POST /api/parse`

Multipart form:
- `resume` (required, PDF or DOCX)

Response:
- JSON body matching the extracted resume structure.

### `POST /api/format`

Multipart form:
- `template` (required, DOCX)
- `data` (required, JSON string matching the resume structure)

Response:
- The generated DOCX file.

## License
Private
