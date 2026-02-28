const $ = (id) => document.getElementById(id);

const resumeInput = $("resume");
const templateInput = $("template");
const parseBtn = $("parseBtn");
const formatBtn = $("formatBtn");
const clearBtn = $("clearBtn");
const jsonPreview = $("jsonPreview");
const errorBox = $("errorBox");

function setError(msg) {
  errorBox.textContent = msg || "";
}

function tryParseJson(text) {
  return JSON.parse(text);
}

function getFilenameFromContentDisposition(contentDisposition) {
  if (!contentDisposition) return null;
  const match = contentDisposition.match(/filename="?([^"]+)"?/i);
  return match?.[1] ?? null;
}

parseBtn.addEventListener("click", async () => {
  setError("");
  try {
    const file = resumeInput.files?.[0];
    if (!file) {
      setError("Please upload a resume (.pdf or .docx).");
      return;
    }

    const form = new FormData();
    form.append("resume", file);

    parseBtn.disabled = true;
    const resp = await fetch("/api/parse", { method: "POST", body: form });
    const payload = await resp.json();

    if (!resp.ok) throw new Error(payload?.error || "Parse request failed.");

    jsonPreview.value = JSON.stringify(payload, null, 2);
  } catch (e) {
    setError(e instanceof Error ? e.message : String(e));
  } finally {
    parseBtn.disabled = false;
  }
});

formatBtn.addEventListener("click", async () => {
  setError("");
  try {
    const templateFile = templateInput.files?.[0];
    if (!templateFile) {
      setError("Please upload a .docx template.");
      return;
    }

    const jsonText = jsonPreview.value?.trim();
    if (!jsonText) {
      setError("Nothing to format. Run Extract & Preview first.");
      return;
    }

    // Validate JSON on the client to fail fast.
    const parsed = tryParseJson(jsonText);

    const form = new FormData();
    form.append("template", templateFile);
    form.append("data", JSON.stringify(parsed));

    formatBtn.disabled = true;
    const resp = await fetch("/api/format", { method: "POST", body: form });

    if (!resp.ok) {
      const payload = await resp.json().catch(() => ({}));
      throw new Error(payload?.error || "Format request failed.");
    }

    const blob = await resp.blob();
    const filename = getFilenameFromContentDisposition(resp.headers.get("content-disposition")) ?? "submission.docx";

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (e) {
    setError(e instanceof Error ? e.message : String(e));
  } finally {
    formatBtn.disabled = false;
  }
});

clearBtn.addEventListener("click", () => {
  setError("");
  jsonPreview.value = "";
  resumeInput.value = "";
});

