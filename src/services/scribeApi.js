/** Tamela Scribe MVP — audio → text. See Swagger: base + /docs */
const DEFAULT_BASE = "https://tamela-scribe-mvp-1088499026862.us-east1.run.app";
const DEFAULT_BEARER_TOKEN = "Secure@innov8-iwyer6wegbcfw8y";
const DEV_PROXY_BASE = "/scribe-api";
export const SCRIBE_TRANSCRIBE_PATH = "/api/audio/transcribe";

export function getScribeApiBase() {
  const raw = import.meta.env.VITE_SCRIBE_API_BASE?.trim();
  if (raw) return raw;
  return import.meta.env.DEV ? DEV_PROXY_BASE : DEFAULT_BASE;
}

function transcribeUrl(base = getScribeApiBase()) {
  const normalizedBase = base.endsWith("/") ? base.slice(0, -1) : base;
  // Allow relative dev proxy base (e.g. "/scribe-api") without URL constructor errors.
  if (normalizedBase.startsWith("/")) {
    return `${normalizedBase}${SCRIBE_TRANSCRIBE_PATH}`;
  }
  return new URL(SCRIBE_TRANSCRIBE_PATH, `${normalizedBase}/`).href;
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
  const token = opts.token ?? import.meta.env.VITE_SCRIBE_API_TOKEN?.trim() ?? DEFAULT_BEARER_TOKEN;
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
