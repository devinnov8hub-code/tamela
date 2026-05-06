let pendingAudioBlob = null;
let lastTranscript = "";
let lastTranscriptionError = "";
let lastRaw = null;

export function setPendingAudioForTranscription(blob) {
  pendingAudioBlob = blob;
}

export function peekPendingAudioForTranscription() {
  return pendingAudioBlob;
}

export function takePendingAudioForTranscription() {
  const b = pendingAudioBlob;
  pendingAudioBlob = null;
  return b;
}

export function clearPendingAudioForTranscription() {
  pendingAudioBlob = null;
}

export function setLastTranscription(text, raw = null) {
  lastTranscript = text;
  lastRaw = raw;
  lastTranscriptionError = "";
}

export function setLastTranscriptionError(msg) {
  lastTranscriptionError = msg;
  lastTranscript = "";
  lastRaw = null;
}

export function getLastTranscription() {
  return { text: lastTranscript, error: lastTranscriptionError, raw: lastRaw };
}

/** Call when starting a new live recording so stale transcript does not flash. */
export function clearScribeSession() {
  pendingAudioBlob = null;
  lastTranscript = "";
  lastTranscriptionError = "";
  lastRaw = null;
}
