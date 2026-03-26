import fs from "fs/promises";
import path from "path";

export type ProviderSettings = {
  openaiApiKey: string;
  groqApiKey: string;
  openrouterApiKey: string;
};

const settingsDir = path.join(process.cwd(), ".runtime");
const settingsPath = path.join(settingsDir, "provider-settings.json");

function normalizeApiKey(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export async function readProviderSettings(): Promise<ProviderSettings> {
  try {
    const raw = await fs.readFile(settingsPath, "utf8");
    const parsed = JSON.parse(raw) as Partial<ProviderSettings>;

    return {
      openaiApiKey: normalizeApiKey(parsed.openaiApiKey),
      groqApiKey: normalizeApiKey(parsed.groqApiKey),
      openrouterApiKey: normalizeApiKey(parsed.openrouterApiKey)
    };
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      return {
        openaiApiKey: "",
        groqApiKey: "",
        openrouterApiKey: ""
      };
    }

    throw error;
  }
}

export async function writeProviderSettings(settings: ProviderSettings): Promise<void> {
  await fs.mkdir(settingsDir, { recursive: true });
  await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2), "utf8");
}

export function getConfiguredProviderKeys(settings: ProviderSettings): ProviderSettings {
  return {
    openaiApiKey: settings.openaiApiKey || process.env.OPENAI_API_KEY?.trim() || "",
    groqApiKey: settings.groqApiKey || process.env.GROQ_API_KEY?.trim() || "",
    openrouterApiKey: settings.openrouterApiKey || process.env.OPENROUTER_API_KEY?.trim() || ""
  };
}

export function getProviderSettingsSummary(settings: ProviderSettings) {
  const configured = getConfiguredProviderKeys(settings);

  return {
    openai: Boolean(configured.openaiApiKey),
    groq: Boolean(configured.groqApiKey),
    openrouter: Boolean(configured.openrouterApiKey)
  };
}
