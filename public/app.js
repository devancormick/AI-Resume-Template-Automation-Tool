const $ = (id) => document.getElementById(id);

const resumeInput = $("resume");
const templateInput = $("template");
const resumeDrop = $("resumeDrop");
const templateDrop = $("templateDrop");
const parseBtn = $("parseBtn");
const formatBtn = $("formatBtn");
const clearBtn = $("clearBtn");
const saveSettingsBtn = $("saveSettingsBtn");
const jsonPreview = $("jsonPreview");
const errorBox = $("errorBox");
const settingsStatus = $("settingsStatus");
const openaiApiKeyInput = $("openaiApiKey");
const groqApiKeyInput = $("groqApiKey");
const openrouterApiKeyInput = $("openrouterApiKey");
const openaiField = $("openaiField");
const groqField = $("groqField");
const openrouterField = $("openrouterField");
const openaiApiKeyHelp = $("openaiApiKeyHelp");
const groqApiKeyHelp = $("groqApiKeyHelp");
const openrouterApiKeyHelp = $("openrouterApiKeyHelp");

let resumeFile = null;
let templateFile = null;

function setError(msg) {
  errorBox.textContent = msg || "";
}

function setSettingsStatus(msg) {
  settingsStatus.textContent = msg || "";
}

function setFieldState(fieldEl, helpEl, state, message) {
  fieldEl.classList.remove("valid", "invalid");
  if (state) {
    fieldEl.classList.add(state);
  }
  helpEl.innerHTML = message;
}

function resetProviderFieldStates() {
  setFieldState(openaiField, openaiApiKeyHelp, "", 'Enter a real OpenAI key starting with <code>sk-</code>.');
  setFieldState(groqField, groqApiKeyHelp, "", 'Enter a Groq key starting with <code>gsk_</code>.');
  setFieldState(openrouterField, openrouterApiKeyHelp, "", 'Enter an OpenRouter key starting with <code>sk-or-</code>.');
}

function validateKeyFormat(value, prefix) {
  const trimmed = value.trim();
  if (!trimmed) {
    return { ok: true, empty: true };
  }

  if (!trimmed.startsWith(prefix)) {
    return { ok: false, empty: false, message: `Expected a key starting with <code>${prefix}</code>.` };
  }

  if (trimmed.length < prefix.length + 8) {
    return { ok: false, empty: false, message: "This key looks too short to be valid." };
  }

  return { ok: true, empty: false };
}

function applyClientValidation() {
  const validations = [
    {
      input: openaiApiKeyInput,
      field: openaiField,
      help: openaiApiKeyHelp,
      prefix: "sk-",
      idle: 'Enter a real OpenAI key starting with <code>sk-</code>.'
    },
    {
      input: groqApiKeyInput,
      field: groqField,
      help: groqApiKeyHelp,
      prefix: "gsk_",
      idle: 'Enter a Groq key starting with <code>gsk_</code>.'
    },
    {
      input: openrouterApiKeyInput,
      field: openrouterField,
      help: openrouterApiKeyHelp,
      prefix: "sk-or-",
      idle: 'Enter an OpenRouter key starting with <code>sk-or-</code>.'
    }
  ];

  let hasInvalidField = false;

  for (const item of validations) {
    const result = validateKeyFormat(item.input.value, item.prefix);
    if (result.empty) {
      setFieldState(item.field, item.help, "", item.idle);
      continue;
    }

    if (!result.ok) {
      hasInvalidField = true;
      setFieldState(item.field, item.help, "invalid", result.message);
      continue;
    }

    setFieldState(item.field, item.help, "valid", "Looks valid. The server will verify it before saving.");
  }

  return !hasInvalidField;
}

function showProviderServerError(message) {
  const normalized = String(message || "").toLowerCase();

  if (normalized.includes("openai")) {
    setFieldState(openaiField, openaiApiKeyHelp, "invalid", "OpenAI rejected this key. Double-check the value and try again.");
    return true;
  }

  if (normalized.includes("groq")) {
    setFieldState(groqField, groqApiKeyHelp, "invalid", "Groq rejected this key. Double-check the value and try again.");
    return true;
  }

  if (normalized.includes("openrouter")) {
    setFieldState(
      openrouterField,
      openrouterApiKeyHelp,
      "invalid",
      "OpenRouter rejected this key. Double-check the value and try again."
    );
    return true;
  }

  return false;
}

function tryParseJson(text) {
  return JSON.parse(text);
}

function getFilenameFromContentDisposition(contentDisposition) {
  if (!contentDisposition) return null;
  const match = contentDisposition.match(/filename="?([^"]+)"?/i);
  return match?.[1] ?? null;
}

function buildProviderSummary(providers) {
  return [
    `OpenAI: ${providers?.openai ? "configured" : "not configured"}`,
    `Groq: ${providers?.groq ? "configured" : "not configured"}`,
    `OpenRouter: ${providers?.openrouter ? "configured" : "not configured"}`
  ].join("\n");
}

async function loadSettingsSummary() {
  const resp = await fetch("/api/settings");
  const payload = await resp.json();

  if (!resp.ok) {
    throw new Error(payload?.error || "Could not load provider settings.");
  }

  setSettingsStatus(buildProviderSummary(payload.providers));
}

resetProviderFieldStates();

[openaiApiKeyInput, groqApiKeyInput, openrouterApiKeyInput].forEach((input) => {
  input.addEventListener("input", () => {
    applyClientValidation();
  });
});

function setupFileDrop(params) {
  const { dropEl, inputEl, onFile } = params;
  const defaultText = dropEl.textContent;

  dropEl.addEventListener("click", () => inputEl.click());
  dropEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      inputEl.click();
    }
  });

  inputEl.addEventListener("change", () => {
    const file = inputEl.files?.[0] ?? null;
    onFile(file, defaultText);
  });

  dropEl.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropEl.classList.add("over");
  });
  dropEl.addEventListener("dragleave", () => dropEl.classList.remove("over"));
  dropEl.addEventListener("drop", (e) => {
    e.preventDefault();
    dropEl.classList.remove("over");
    const file = e.dataTransfer.files?.[0] ?? null;
    if (!file) return;
    onFile(file, defaultText);
  });
}

setupFileDrop({
  dropEl: resumeDrop,
  inputEl: resumeInput,
  onFile: (file, defaultText) => {
    resumeFile = file;
    resumeDrop.textContent = file ? `Selected: ${file.name}` : defaultText;
  }
});

setupFileDrop({
  dropEl: templateDrop,
  inputEl: templateInput,
  onFile: (file, defaultText) => {
    templateFile = file;
    templateDrop.textContent = file ? `Selected: ${file.name}` : defaultText;
  }
});

saveSettingsBtn.addEventListener("click", async () => {
  setError("");
  setSettingsStatus("Validating provider keys...");

  if (!applyClientValidation()) {
    setSettingsStatus("");
    setError("Please fix the highlighted provider key fields before saving.");
    return;
  }

  try {
    saveSettingsBtn.disabled = true;

    const resp = await fetch("/api/settings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        openaiApiKey: openaiApiKeyInput.value,
        groqApiKey: groqApiKeyInput.value,
        openrouterApiKey: openrouterApiKeyInput.value
      })
    });

    const payload = await resp.json();
    if (!resp.ok) {
      throw new Error(payload?.error || "Could not save provider settings.");
    }

    openaiApiKeyInput.value = "";
    groqApiKeyInput.value = "";
    openrouterApiKeyInput.value = "";
    resetProviderFieldStates();
    setSettingsStatus(`Saved successfully.\n${buildProviderSummary(payload.providers)}`);
  } catch (e) {
    setSettingsStatus("");
    const message = e instanceof Error ? e.message : String(e);
    showProviderServerError(message);
    setError(message);
  } finally {
    saveSettingsBtn.disabled = false;
  }
});

parseBtn.addEventListener("click", async () => {
  setError("");
  try {
    if (!resumeFile) {
      setError("Please upload a resume (.pdf or .docx).");
      return;
    }

    const form = new FormData();
    form.append("resume", resumeFile);

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
  templateInput.value = "";
  resumeFile = null;
  templateFile = null;
  resumeDrop.textContent = "Drop resume here (PDF/DOCX) or click to choose";
  templateDrop.textContent = "Drop DOCX template here or click to choose";
});

loadSettingsSummary().catch((e) => {
  setError(e instanceof Error ? e.message : String(e));
});
