import OpenAI from "openai";
import { ResumeDataSchema, type ResumeData } from "./types";

function extractJsonObject(text: string): string {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return text;
  return text.slice(start, end + 1);
}

export async function extractResumeDataWithOpenAI(params: {
  openai: OpenAI;
  resumeText: string;
  model?: string;
}): Promise<ResumeData> {
  const { openai, resumeText, model } = params;
  const chosenModel = model ?? process.env.OPENAI_MODEL ?? "gpt-4o-mini";

  const schemaHint = {
    name: "string",
    location: "string",
    discipline: "string",
    contact: { email: "string (optional)", phone: "string (optional)", linkedin: "string (optional)", website: "string (optional)" },
    workHistory: [{ organization: "string (optional)", title: "string (optional)", startDate: "string (optional)", endDate: "string (optional)", summary: "string (optional)" }],
    certifications: ["string"],
    licenses: ["string"],
    skills: ["string"],
    equipment: ["string"]
  };

  const system = [
    "You are a healthcare recruiter assistant.",
    "Extract only what is present in the resume.",
    "If a field is missing, use an empty string or empty array; do not guess.",
    "Return a single valid JSON object with EXACT keys matching the schema hint.",
    "No markdown. No extra text."
  ].join("\n");

  const user = [
    "Resume text:",
    resumeText,
    "",
    "Schema keys (use these exact keys):",
    JSON.stringify(schemaHint, null, 2)
  ].join("\n");

  const tryOnce = async (lastError?: string) => {
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: "system", content: system },
      { role: "user", content: user + (lastError ? `\n\nPrevious JSON error:\n${lastError}\n\nReturn corrected JSON only.` : "") }
    ];

    const resp = await openai.chat.completions.create({
      model: chosenModel,
      temperature: 0,
      messages
    });

    const content = resp.choices?.[0]?.message?.content ?? "";
    const jsonText = extractJsonObject(content);
    const parsed = JSON.parse(jsonText);
    return ResumeDataSchema.parse(parsed);
  };

  try {
    return await tryOnce();
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return await tryOnce(message);
  }
}

