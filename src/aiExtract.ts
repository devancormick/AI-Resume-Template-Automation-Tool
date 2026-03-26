import { ResumeDataSchema, type ResumeData } from "./types";

type ProviderName = "openai" | "groq" | "openrouter" | "ollama";

type ProviderConfig = {
  name: ProviderName;
  apiKey?: string;
  model: string;
  baseURL: string;
  headers?: Record<string, string>;
};

function isUsableApiKey(value?: string): boolean {
  if (!value) return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (trimmed.includes("your_") && trimmed.includes("_key_here")) return false;
  if (trimmed.toLowerCase() === "changeme") return false;
  return true;
}

function extractJsonObject(text: string): string {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return text;
  return text.slice(start, end + 1);
}

function buildPrompt(resumeText: string, lastError?: string) {
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
    JSON.stringify(schemaHint, null, 2),
    lastError ? `\nPrevious JSON error:\n${lastError}\n\nReturn corrected JSON only.` : ""
  ].join("\n");

  return { system, user };
}

function getProviderConfigs(): ProviderConfig[] {
  return [
    {
      name: "openai",
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      baseURL: "https://api.openai.com/v1"
    },
    {
      name: "groq",
      apiKey: process.env.GROQ_API_KEY,
      model: process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile",
      baseURL: "https://api.groq.com/openai/v1"
    },
    {
      name: "openrouter",
      apiKey: process.env.OPENROUTER_API_KEY,
      model: process.env.OPENROUTER_MODEL ?? "meta-llama/llama-3.1-8b-instruct:free",
      baseURL: "https://openrouter.ai/api/v1",
      headers: {
        "HTTP-Referer": process.env.OPENROUTER_SITE_URL ?? "http://localhost:3000",
        "X-Title": process.env.OPENROUTER_APP_NAME ?? "AI Resume Template Automation Tool"
      }
    },
    {
      name: "ollama",
      model: process.env.OLLAMA_MODEL ?? "llama3.1",
      baseURL: process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434/v1"
    }
  ];
}

function getEnabledProviders(): ProviderConfig[] {
  return getProviderConfigs().filter((provider) => {
    if (provider.name === "ollama") return true;
    return isUsableApiKey(provider.apiKey);
  });
}

async function createChatCompletion(provider: ProviderConfig, system: string, user: string) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...provider.headers
  };

  if (provider.apiKey) {
    headers.Authorization = `Bearer ${provider.apiKey}`;
  }

  const response = await fetch(`${provider.baseURL}/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: provider.model,
      temperature: 0,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user }
      ]
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`${provider.name} request failed (${response.status}): ${errorText}`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string | Array<{ type?: string; text?: string }> } }>;
  };

  const content = payload.choices?.[0]?.message?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((item) => (typeof item?.text === "string" ? item.text : ""))
      .join("");
  }

  throw new Error(`${provider.name} returned an empty response.`);
}

async function extractWithProvider(provider: ProviderConfig, resumeText: string): Promise<ResumeData> {
  const tryOnce = async (lastError?: string) => {
    const { system, user } = buildPrompt(resumeText, lastError);
    const content = await createChatCompletion(provider, system, user);
    const jsonText = extractJsonObject(content);
    const parsed = JSON.parse(jsonText);
    return ResumeDataSchema.parse(parsed);
  };

  try {
    return await tryOnce();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return await tryOnce(message);
  }
}

export async function extractResumeDataWithFallback(resumeText: string): Promise<{
  data: ResumeData;
  provider: ProviderName;
  model: string;
}> {
  const providers = getEnabledProviders();
  if (providers.length === 0) {
    throw new Error("No AI provider is configured. Set OPENAI_API_KEY, GROQ_API_KEY, OPENROUTER_API_KEY, or run Ollama locally.");
  }

  const failures: string[] = [];

  for (const provider of providers) {
    try {
      const data = await extractWithProvider(provider, resumeText);
      return { data, provider: provider.name, model: provider.model };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push(`${provider.name}: ${message}`);
    }
  }

  throw new Error(`All AI providers failed. ${failures.join(" | ")}`);
}
