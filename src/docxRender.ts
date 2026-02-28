import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { type ResumeData } from "./types";

export class DocxRenderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DocxRenderError";
  }
}

function joinLines(lines: Array<string | undefined | null>): string {
  return lines
    .map((v) => (typeof v === "string" ? v.trim() : ""))
    .filter((v) => v.length > 0)
    .join("\n");
}

function formatContact(contact: ResumeData["contact"] | undefined): string {
  if (!contact) return "";
  const parts = [
    contact.email,
    contact.phone,
    contact.linkedin,
    contact.website
  ].map((v) => (v ?? "").trim()).filter((v) => v.length > 0);
  return parts.join(" | ");
}

function formatWorkHistory(items: ResumeData["workHistory"]): string {
  if (!items?.length) return "";
  return items
    .map((it) => {
      const role = [it.title, it.organization].filter((x) => (x ?? "").trim().length > 0).join(" - ");
      const dates = [it.startDate, it.endDate].filter((x) => (x ?? "").trim().length > 0).join(" to ");
      const summary = (it.summary ?? "").trim();
      const header = [role, dates].filter((x) => x.trim().length > 0).join("\n");
      return [header, summary].filter((x) => x.trim().length > 0).join("\n");
    })
    .join("\n\n");
}

export async function renderDocxFromTemplate(params: {
  templateBuffer: Buffer;
  data: ResumeData;
}): Promise<Buffer> {
  const { templateBuffer, data } = params;

  try {
    const zip = new PizZip(templateBuffer);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      nullGetter: () => "",
      delimiters: { start: "[", end: "]" }
    });

    const firstName = data.name.split(/\s+/).slice(0, 1).join(" ").trim();
    const lastName = data.name.split(/\s+/).slice(1).join(" ").trim();

    doc.setData({
      NAME: data.name ?? "",
      LOCATION: data.location ?? "",
      DISCIPLINE: data.discipline ?? "",
      CONTACT_INFO: formatContact(data.contact),
      EXPERIENCE: formatWorkHistory(data.workHistory),
      CERTIFICATIONS: joinLines(data.certifications ?? []),
      LICENSES: joinLines(data.licenses ?? []),
      SKILLS: joinLines(data.skills ?? []),
      EQUIPMENT: joinLines(data.equipment ?? []),
      FIRST_NAME: firstName,
      LAST_NAME: lastName
    });

    doc.render();
    return doc.getZip().generate({ type: "nodebuffer" });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new DocxRenderError(`DOCX render failed: ${msg}`);
  }
}

