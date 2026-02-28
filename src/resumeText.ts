import mammoth from "mammoth";
import pdfParse from "pdf-parse";

export class ResumeTextError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ResumeTextError";
  }
}

export async function extractResumeText(params: {
  buffer: Buffer;
  filename: string;
}): Promise<string> {
  const { buffer, filename } = params;
  const lower = filename.toLowerCase();

  if (lower.endsWith(".pdf")) {
    // `pdf-parse` has varying TypeScript typings depending on module settings.
    const data = await (pdfParse as any)(buffer);
    return (data.text ?? "").trim();
  }

  if (lower.endsWith(".docx")) {
    const result = await mammoth.extractRawText({ buffer });
    return (result.value ?? "").trim();
  }

  throw new ResumeTextError(`Unsupported resume file type: ${filename}`);
}

