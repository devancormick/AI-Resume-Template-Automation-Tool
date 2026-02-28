# AI Resume -> Template Automation Tool

Convert a resume (PDF or DOCX) into a recruiter-ready `.docx` submission document by extracting structured data with OpenAI and injecting it into an existing Word template.

## Features

- Upload a resume (`.pdf` or `.docx`)
- Extract structured data with OpenAI (JSON)
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

1. Copy `.env.example` to `.env` and set your OpenAI key.
2. Install dependencies.
3. Start the server.

```bash
npm install
npm run dev
```

Server runs on `http://localhost:3000`.

## Environment Variables

Create a `.env` file:

- `OPENAI_API_KEY` (required)
- `OPENAI_MODEL` (optional, default: `gpt-4o-mini`)

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
