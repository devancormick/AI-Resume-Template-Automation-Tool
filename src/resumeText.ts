import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";

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
    const parser = new PDFParse({ data: buffer });
    try {
      const data = await parser.getText();
      return (data.text ?? "").trim();
    } finally {
      await parser.destroy();
    }
  }

  if (lower.endsWith(".docx")) {
    const result = await mammoth.extractRawText({ buffer });
    return (result.value ?? "").trim();
  }

  throw new ResumeTextError(`Unsupported resume file type: ${filename}`);
}
