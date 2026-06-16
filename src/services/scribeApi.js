/** Tamela Scribe MVP — audio → text. See Swagger: base + /docs */
const DEFAULT_BASE = "https://js24tdd3kz.eu-west-1.awsapprunner.com";
const DEFAULT_BEARER_TOKEN = "Secure@innov8-iwyer6wegbcfw8y";
const DEV_PROXY_BASE = "/scribe-api";
export const SCRIBE_TRANSCRIBE_PATH = "/api/audio/transcribe";
export const SCRIBE_REPORT_FROM_TEXT_PATH = "/api/report/from-text";

/** Public Scribe host (vite/vercel proxy target). Browser calls use DEV_PROXY_BASE to avoid CORS. */
export function getScribeApiBase() {
  return DEV_PROXY_BASE;
}

export function getScribeApiDirectBase() {
  return DEFAULT_BASE;
}

function scribeApiUrl(path, base = getScribeApiBase()) {
  const normalizedBase = base.endsWith("/") ? base.slice(0, -1) : base;
  if (normalizedBase.startsWith("/")) {
    return `${normalizedBase}${path}`;
  }
  return new URL(path, `${normalizedBase}/`).href;
}

function transcribeUrl(base = getScribeApiBase()) {
  return scribeApiUrl(SCRIBE_TRANSCRIBE_PATH, base);
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
 * POST multipart/form-data with field name `file` (OpenAPI: Body_transcribe_api_audio_transcribe_post).
 * @param {Blob|File} file
 * @param {{ baseUrl?: string, token?: string, signal?: AbortSignal }} [opts]
 * @returns {Promise<Record<string, unknown>>}
 */
export async function transcribeAudio(file, opts = {}) {
  const token = opts.token ?? DEFAULT_BEARER_TOKEN;
  const body = new FormData();
  const mime = file?.type || "audio/webm";
  const safeName =
    file instanceof File && file.name
      ? file.name
      : `recording.${extensionForMime(mime)}`;
  body.append("file", file, safeName);

  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const url = transcribeUrl(opts.baseUrl);
  const res = await fetch(url, {
    method: "POST",
    body,
    headers,
    signal: opts.signal,
  });

  const responseHeaders = Object.fromEntries(res.headers.entries());

  if (!res.ok) {
    const text = await res.text();
    console.log("[scribe] transcription response (error):", {
      url,
      status: res.status,
      statusText: res.statusText,
      ok: res.ok,
      headers: responseHeaders,
      body: text,
    });
    throw new Error(`Transcribe failed (${res.status}): ${text.slice(0, 800)}`);
  }

  const data = await res.json();
  console.log("[scribe] transcription response:", {
    url,
    status: res.status,
    statusText: res.statusText,
    ok: res.ok,
    headers: responseHeaders,
    body: data,
  });
  return data;
}

/**
 * POST JSON { text, specialty } → formatted clinical report.
 * @param {string} text
 * @param {{ specialty?: string, baseUrl?: string, token?: string, signal?: AbortSignal }} [opts]
 * @returns {Promise<Record<string, unknown>>}
 */
export async function reportFromText(text, opts = {}) {
  const token = opts.token ?? DEFAULT_BEARER_TOKEN;
  const trimmed = (text || "").trim();
  if (trimmed.length < 10) {
    throw new Error("Transcript is too short to generate a report (minimum 10 characters).");
  }

  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const url = scribeApiUrl(SCRIBE_REPORT_FROM_TEXT_PATH, opts.baseUrl);
  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      text: trimmed,
      specialty: opts.specialty ?? "Radiology/Ultrasound",
    }),
    signal: opts.signal,
  });

  const responseHeaders = Object.fromEntries(res.headers.entries());

  if (!res.ok) {
    const bodyText = await res.text();
    console.log("[scribe] report/from-text response (error):", {
      url,
      status: res.status,
      statusText: res.statusText,
      ok: res.ok,
      headers: responseHeaders,
      body: bodyText,
    });
    throw new Error(`Report generation failed (${res.status}): ${bodyText.slice(0, 800)}`);
  }

  const data = await res.json();
  console.log("[scribe] report/from-text response:", {
    url,
    status: res.status,
    statusText: res.statusText,
    ok: res.ok,
    headers: responseHeaders,
    body: data,
  });
  return data;
}

/** Normalize transcribe JSON — backend shape may vary beyond OpenAPI stub. */
export function extractTranscriptionText(data) {
  if (typeof data === "string") return data;
  if (data == null) return "";
  const keys = ["text", "transcription", "transcript", "result", "message", "content"];
  for (const k of keys) {
    const v = data[k];
    if (typeof v === "string" && v.trim()) return v;
  }
  // Common nested response shapes from speech-to-text APIs.
  const nestedCandidates = [
    data.data,
    data.output,
    data.response,
    data.result,
    data.payload,
  ];
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
