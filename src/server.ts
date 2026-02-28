import path from "path";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import multer from "multer";
import dotenv from "dotenv";
import OpenAI from "openai";

import { extractResumeText } from "./resumeText";
import { extractResumeDataWithOpenAI } from "./openaiExtract";
import { ResumeDataSchema, type ResumeData } from "./types";
import { renderDocxFromTemplate } from "./docxRender";

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

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/api/parse", upload.single("resume"), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "Missing 'resume' file upload." });
      return;
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      res.status(500).json({ error: "OPENAI_API_KEY is not configured." });
      return;
    }

    const openai = new OpenAI({ apiKey });
    const resumeText = await extractResumeText({
      buffer: req.file.buffer,
      filename: req.file.originalname
    });

    if (!resumeText) {
      res.status(400).json({ error: "Could not extract text from the resume." });
      return;
    }

    const parsed = await extractResumeDataWithOpenAI({ openai, resumeText });
    res.json(parsed);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
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
    res.status(500).json({ error: msg });
  }
});

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Server listening on http://localhost:${port}`);
});

