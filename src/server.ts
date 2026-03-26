import path from "path";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import multer from "multer";
import dotenv from "dotenv";

import { extractResumeText } from "./resumeText";
import { extractResumeDataWithFallback } from "./aiExtract";
import { ResumeDataSchema, type ResumeData } from "./types";
import { renderDocxFromTemplate } from "./docxRender";
import {
  readProviderSettings,
  writeProviderSettings,
  getProviderSettingsSummary,
  type ProviderSettings
} from "./providerSettings";

dotenv.config();

const app = express();
app.use(cors());
app.use(morgan("dev"));
app.use(express.json({ limit: "2mb" }));

const publicDir = path.join(process.cwd(), "public");
app.use(express.static(publicDir));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }
});

function buildOutputFilename(data: ResumeData): string {
  const parts = (data.name ?? "").trim().split(/\s+/).filter(Boolean);
  const firstName = parts[0] ?? "First";
  const lastName = parts.length >= 2 ? parts[parts.length - 1] : "Last";
  return `${lastName}_${firstName}_Prolink_Submission.docx`;
}

async function validateProviderKey(provider: "openai" | "groq" | "openrouter", apiKey: string): Promise<void> {
  const trimmed = apiKey.trim();
  if (!trimmed) return;

  const urlByProvider = {
    openai: "https://api.openai.com/v1/models",
    groq: "https://api.groq.com/openai/v1/models",
    openrouter: "https://openrouter.ai/api/v1/models"
  } as const;

  const response = await fetch(urlByProvider[provider], {
    method: "GET",
    headers: {
      Authorization: `Bearer ${trimmed}`
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`${provider} key is invalid (${response.status}): ${errorText}`);
  }
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/settings", async (_req, res) => {
  try {
    const settings = await readProviderSettings();
    res.json({
      providers: getProviderSettingsSummary(settings)
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    res.status(500).json({ error: msg });
  }
});

app.post("/api/settings", async (req, res) => {
  try {
    const body = (req.body ?? {}) as Partial<ProviderSettings>;
    const existingSettings = await readProviderSettings();
    const settings: ProviderSettings = {
      openaiApiKey:
        typeof body.openaiApiKey === "string" && body.openaiApiKey.trim()
          ? body.openaiApiKey.trim()
          : existingSettings.openaiApiKey,
      groqApiKey:
        typeof body.groqApiKey === "string" && body.groqApiKey.trim()
          ? body.groqApiKey.trim()
          : existingSettings.groqApiKey,
      openrouterApiKey:
        typeof body.openrouterApiKey === "string" && body.openrouterApiKey.trim()
          ? body.openrouterApiKey.trim()
          : existingSettings.openrouterApiKey
    };

    await validateProviderKey("openai", settings.openaiApiKey);
    await validateProviderKey("groq", settings.groqApiKey);
    await validateProviderKey("openrouter", settings.openrouterApiKey);
    await writeProviderSettings(settings);

    res.json({
      ok: true,
      providers: getProviderSettingsSummary(settings)
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Settings save error:", msg);
    res.status(400).json({ error: msg });
  }
});

app.get("/favicon.ico", (_req, res) => {
  res.status(204).end();
});

app.post("/api/parse", upload.single("resume"), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "Missing 'resume' file upload." });
      return;
    }
    const resumeText = await extractResumeText({
      buffer: req.file.buffer,
      filename: req.file.originalname
    });

    if (!resumeText) {
      res.status(400).json({ error: "Could not extract text from the resume." });
      return;
    }

    const settings = await readProviderSettings();
    const result = await extractResumeDataWithFallback(resumeText, settings);
    res.json({
      ...result.data,
      _meta: {
        provider: result.provider,
        model: result.model
      }
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    // Surface provider failures in the server log so config issues are easy to debug.
    console.error("Parse error:", msg);
    res.status(500).json({ error: msg });
  }
});

app.post("/api/format", upload.single("template"), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "Missing 'template' file upload." });
      return;
    }

    const dataRaw = req.body?.data;
    if (!dataRaw || typeof dataRaw !== "string") {
      res.status(400).json({ error: "Missing 'data' field (JSON string)." });
      return;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(dataRaw);
    } catch {
      res.status(400).json({ error: "Invalid JSON in 'data' field." });
      return;
    }

    const data: ResumeData = ResumeDataSchema.parse(parsed);
    const docxBuffer = await renderDocxFromTemplate({ templateBuffer: req.file.buffer, data });

    const filename = buildOutputFilename(data);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(docxBuffer);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Format error:", msg);
    res.status(500).json({ error: msg });
  }
});

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Server listening on http://localhost:${port}`);
});
