/** Tamela Scribe MVP — audio → text, then text → report + critical fields. See /docs */
const DEFAULT_BASE = "https://tamela-scribe-mvp-1088499026862.us-east1.run.app";
const DEFAULT_BEARER_TOKEN = "Secure@innov8-iwyer6wegbcfw8y";
const DEV_PROXY_BASE = "/scribe-api";

export const SCRIBE_TRANSCRIBE_PATH = "/api/audio/transcribe";
/** Step 1: audio → markdown transcription (response is a string). */
export const SCRIBE_TRANSCRIBE_AND_REPORT_PATH = "/api/audio/transcribe-and-report";
/** Step 2: transcript text → template + critical fields (ReportResponse JSON). */
export const SCRIBE_REPORT_FROM_TEXT_PATH = "/api/report/from-text";

const DEFAULT_SPECIALTY = "Radiology/Ultrasound";
const MIN_REPORT_TEXT_LENGTH = 10;

/** Public Scribe host (vite/vercel proxy target). Browser calls use DEV_PROXY_BASE to avoid CORS. */
export function getScribeApiBase() {
  return DEV_PROXY_BASE;
}

export function getScribeApiDirectBase() {
  return DEFAULT_BASE;
}

function scribeUrl(path, base = getScribeApiBase()) {
  const normalizedBase = base.endsWith("/") ? base.slice(0, -1) : base;
  if (normalizedBase.startsWith("/")) {
    return `${normalizedBase}${path}`;
  }
  return new URL(path, `${normalizedBase}/`).href;
}

function extensionForMime(mime = "") {
  const normalized = mime.toLowerCase();
  if (normalized.includes("webm")) return "webm";
  if (normalized.includes("wav")) return "wav";
  if (normalized.includes("mpeg") || normalized.includes("mp3")) return "mp3";
  if (normalized.includes("mp4") || normalized.includes("m4a")) return "m4a";
  if (normalized.includes("ogg")) return "ogg";
  return "webm";
}

/**
 * @param {string} stepLabel
 * @param {string} path
 * @param {string} url
 * @param {number} status
 * @param {Record<string, string>} headers
 * @param {unknown} body
 * @param {Record<string, unknown>} [requestMeta]
 */
function logScribeStepResponse(stepLabel, path, url, status, headers, body, requestMeta = {}) {
  const preview =
    typeof body === "string"
      ? body.length > 1200
        ? `${body.slice(0, 1200)}… (${body.length} chars total)`
        : body
      : body;

  // Top-level log — easy to spot in Chrome DevTools (filter: "SCRIBE STEP")
  if (stepLabel.includes("Step 1")) {
    console.info("SCRIBE STEP 1 RESPONSE (transcribe-and-report):", body);
  } else if (stepLabel.includes("Step 2")) {
    console.info("SCRIBE STEP 2 RESPONSE (report/from-text):", body);
  }

  console.group(`[scribe] ${stepLabel}`);
  console.log("endpoint:", path);
  console.log("url:", url);
  console.log("status:", status);
  if (Object.keys(requestMeta).length) {
    console.log("request:", requestMeta);
  }
  console.log("response headers:", headers);
  console.log("response body:", body);
  if (typeof body === "string") {
    console.log("response length (chars):", body.length);
    console.log("response preview:", preview);
  } else if (body && typeof body === "object") {
    console.log("response (parsed):", body);
  }
  console.groupEnd();
}

/**
 * @param {string} path
 * @param {RequestInit} init
 * @param {{
 *   baseUrl?: string,
 *   token?: string,
 *   signal?: AbortSignal,
 *   stepLabel?: string,
 *   requestMeta?: Record<string, unknown>,
 * }} [opts]
 */
async function requestScribe(path, init, opts = {}) {
  const token = opts.token ?? DEFAULT_BEARER_TOKEN;
  const headers = new Headers(init.headers || {});
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const url = scribeUrl(path, opts.baseUrl);
  const stepLabel = opts.stepLabel || path;
  const res = await fetch(url, { ...init, headers, signal: opts.signal });
  const responseHeaders = Object.fromEntries(res.headers.entries());

  if (!res.ok) {
    const text = await res.text();
    logScribeStepResponse(
      `${stepLabel} (error)`,
      path,
      url,
      res.status,
      responseHeaders,
      text,
      opts.requestMeta
    );
    throw new Error(`Scribe request failed (${res.status}): ${text.slice(0, 800)}`);
  }

  const contentType = res.headers.get("content-type") || "";
  let data;
  if (contentType.includes("application/json")) {
    data = await res.json();
  } else {
    data = await res.text();
  }

  logScribeStepResponse(stepLabel, path, url, res.status, responseHeaders, data, opts.requestMeta);
  return data;
}

/**
 * POST multipart/form-data with field name `file` (legacy transcribe — markdown string).
 * @param {Blob|File} file
 * @param {{ baseUrl?: string, token?: string, signal?: AbortSignal }} [opts]
 */
export async function transcribeAudio(file, opts = {}) {
  const body = new FormData();
  const mime = file?.type || "audio/webm";
  const safeName =
    file instanceof File && file.name
      ? file.name
      : `recording.${extensionForMime(mime)}`;
  body.append("file", file, safeName);
  return requestScribe(SCRIBE_TRANSCRIBE_PATH, { method: "POST", body }, opts);
}

/**
 * Step 1 — audio → markdown transcription string (`transcribe-and-report`).
 * @param {Blob|File} file
 * @param {{ baseUrl?: string, token?: string, signal?: AbortSignal, specialty?: string }} [opts]
 */
export async function transcribeAndReportAudio(file, opts = {}) {
  const body = new FormData();
  const mime = file?.type || "audio/webm";
  const safeName =
    file instanceof File && file.name
      ? file.name
      : `recording.${extensionForMime(mime)}`;
  body.append("file", file, safeName);
  const specialty = opts.specialty?.trim() || "";
  if (specialty) {
    body.append("specialty", specialty);
  }

  return requestScribe(
    SCRIBE_TRANSCRIBE_AND_REPORT_PATH,
    { method: "POST", body },
    {
      ...opts,
      stepLabel: "Step 1 — transcribe-and-report response",
      requestMeta: {
        fileName: safeName,
        mimeType: mime,
        fileSizeBytes: file?.size ?? 0,
        specialty: specialty || DEFAULT_SPECIALTY,
      },
    }
  );
}

/**
 * Step 2 — transcript text → formatted report + critical fields (`report/from-text`).
 * @param {string} text
 * @param {{ baseUrl?: string, token?: string, signal?: AbortSignal, specialty?: string }} [opts]
 */
export async function reportFromText(text, opts = {}) {
  const payload = {
    text: String(text ?? "").trim(),
    specialty: opts.specialty?.trim() || DEFAULT_SPECIALTY,
  };

  return requestScribe(
    SCRIBE_REPORT_FROM_TEXT_PATH,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    {
      ...opts,
      stepLabel: "Step 2 — report/from-text response",
      requestMeta: {
        specialty: payload.specialty,
        textLength: payload.text.length,
        textPreview: payload.text.slice(0, 300),
      },
    }
  );
}

/**
 * Normalize audio transcribe JSON — plain markdown string or wrapped text fields.
 * @param {unknown} data
 */
export function extractTranscriptionText(data) {
  if (typeof data === "string") return data;
  if (data == null) return "";
  const keys = ["text", "transcription", "transcript", "result", "message", "content"];
  for (const k of keys) {
    const v = data[k];
    if (typeof v === "string" && v.trim()) return v;
  }
  const nestedCandidates = [data.data, data.output, data.response, data.result, data.payload];
  for (const nested of nestedCandidates) {
    if (!nested || typeof nested !== "object") continue;
    for (const k of keys) {
      const v = nested[k];
      if (typeof v === "string" && v.trim()) return v;
    }
  }
  try {
    return JSON.stringify(data, null, 2);
  } catch {
    return String(data);
  }
}

/**
 * Parse `/api/report/from-text` → ReportResponse.
 * @param {unknown} data
 * @returns {{
 *   templateText: string,
 *   criticalFields: Array<{ label: string, value: string, severity?: string, reason?: string }>,
 *   caseTitle: string,
 *   sessionType: string,
 * }}
 */
export function parseReportResponse(data) {
  let parsed = data;

  if (typeof data === "string") {
    const trimmed = data.trim();
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      try {
        parsed = JSON.parse(trimmed);
      } catch {
        return {
          templateText: "",
          criticalFields: [],
          caseTitle: "",
          sessionType: "",
        };
      }
    } else {
      return {
        templateText: "",
        criticalFields: [],
        caseTitle: "",
        sessionType: "",
      };
    }
  }

  if (!parsed || typeof parsed !== "object") {
    return {
      templateText: "",
      criticalFields: [],
      caseTitle: "",
      sessionType: "",
    };
  }

  const templateText =
    (typeof parsed.template_text === "string" && parsed.template_text) ||
    (typeof parsed.templateText === "string" && parsed.templateText) ||
    "";

  const rawFields = parsed.critical_fields ?? parsed.criticalFields ?? [];
  const criticalFields = Array.isArray(rawFields)
    ? rawFields
        .filter((item) => item && typeof item === "object")
        .map((item) => ({
          label: String(item.label ?? ""),
          value: String(item.value ?? ""),
          severity: item.severity ? String(item.severity) : "",
          reason: item.reason ? String(item.reason) : "",
        }))
    : [];

  return {
    templateText: templateText.trim(),
    criticalFields,
    caseTitle: String(parsed.case_title ?? parsed.caseTitle ?? "").trim(),
    sessionType: String(parsed.session_type ?? parsed.sessionType ?? "").trim(),
  };
}

/**
 * Full pipeline: audio → transcription string → report/from-text.
 * @param {Blob|File} file
 * @param {{ baseUrl?: string, token?: string, signal?: AbortSignal, specialty?: string, onStage?: (stage: string) => void }} [opts]
 */
export async function transcribeAudioAndGenerateReport(file, opts = {}) {
  const specialty = opts.specialty?.trim() || DEFAULT_SPECIALTY;

  opts.onStage?.("Transcribing audio…");
  const audioData = await transcribeAndReportAudio(file, { ...opts, specialty });
  const rawTranscript = extractTranscriptionText(audioData).trim();

  console.info("SCRIBE STEP 1 — extracted transcript text:", rawTranscript);

  if (!rawTranscript) {
    throw new Error("No transcription returned from audio.");
  }
  if (rawTranscript.length < MIN_REPORT_TEXT_LENGTH) {
    throw new Error(
      `Transcription must be at least ${MIN_REPORT_TEXT_LENGTH} characters to generate a report.`
    );
  }

  opts.onStage?.("Generating clinical report…");
  const reportData = await reportFromText(rawTranscript, { ...opts, specialty });
  const report = parseReportResponse(reportData);

  console.info("SCRIBE STEP 2 — parsed report object:", report);

  return {
    rawTranscript,
    ...report,
  };
}

/** @deprecated Use parseReportResponse — kept for older imports */
export function parseTranscribeAndReportResponse(data) {
  return parseReportResponse(data);
}
