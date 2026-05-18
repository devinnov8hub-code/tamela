<script setup>
import AppShell from "../components/AppShell.vue";
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef } from "vue";
import { useRouter } from "vue-router";
import { clearScribeSession, setPendingAudioForTranscription } from "../session/scribeSession.js";

const waveformBars = [30, 56, 80, 48, 34, 42, 92, 118, 96, 52, 76, 58, 36, 28];
const router = useRouter();
const fileInputRef = useTemplateRef("fileInput");

const isRecording = ref(false);
const elapsedMs = ref(0);
const micError = ref("");
const isFinishing = ref(false);
const streamRef = ref(null);
const mediaRecorderRef = ref(null);
const chunksRef = ref([]);
let timerId = null;
let startedAt = 0;
let accumulatedMs = 0;

function pickMimeType() {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
  ];
  for (const t of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(t)) return t;
  }
  return "";
}

function tick() {
  if (!startedAt) return;
  elapsedMs.value = accumulatedMs + (Date.now() - startedAt);
}

function startTimer() {
  if (timerId) return;
  startedAt = Date.now();
  timerId = setInterval(tick, 100);
}

function pauseTimer() {
  if (!timerId) return;
  clearInterval(timerId);
  timerId = null;
  if (startedAt) {
    accumulatedMs += Date.now() - startedAt;
    startedAt = 0;
  }
}

function resumeTimer() {
  if (timerId) return;
  startedAt = Date.now();
  timerId = setInterval(tick, 100);
}

function stopTimer() {
  pauseTimer();
  startedAt = 0;
  accumulatedMs = 0;
}

function stopMediaTracks() {
  const s = streamRef.value;
  if (s) {
    s.getTracks().forEach((t) => t.stop());
    streamRef.value = null;
  }
}

function beginRecordingWithStream(stream) {
  streamRef.value = stream;
  chunksRef.value = [];
  const mimeType = pickMimeType();
  const options = mimeType ? { mimeType } : undefined;
  const rec = new MediaRecorder(stream, options);
  mediaRecorderRef.value = rec;

  rec.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunksRef.value.push(e.data);
  };

  rec.onerror = () => {
    micError.value = "Recording error. Try again.";
  };

  rec.start(1000);
  isRecording.value = true;
  elapsedMs.value = 0;
  accumulatedMs = 0;
  startTimer();
}

async function startLiveRecording() {
  micError.value = "";
  if (!navigator.mediaDevices?.getUserMedia) {
    micError.value = "Microphone is not available in this browser.";
    return;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    beginRecordingWithStream(stream);
  } catch (e) {
    micError.value =
      e?.name === "NotAllowedError"
        ? "Microphone permission was denied."
        : "Could not access the microphone.";
  }
}

function pauseRecording() {
  const rec = mediaRecorderRef.value;
  if (!rec || rec.state !== "recording") return;
  if (typeof rec.pause === "function") {
    try {
      rec.pause();
    } catch {
      /* ignore */
    }
  }
  isRecording.value = false;
  pauseTimer();
}

function resumeRecording() {
  const rec = mediaRecorderRef.value;
  if (!rec || rec.state !== "paused") return;
  if (typeof rec.resume === "function") {
    try {
      rec.resume();
    } catch {
      /* ignore */
    }
  }
  isRecording.value = true;
  resumeTimer();
}

function finalizeBlobAndNavigate() {
  const rec = mediaRecorderRef.value;
  const mimeType = rec?.mimeType || "audio/webm";
  const parts = chunksRef.value;
  const blob = new Blob(parts, { type: mimeType });
  mediaRecorderRef.value = null;
  chunksRef.value = [];
  stopMediaTracks();
  stopTimer();

  if (!blob.size) {
    micError.value = "No audio was captured.";
    isFinishing.value = false;
    isRecording.value = false;
    return;
  }

  setPendingAudioForTranscription(blob);
  isFinishing.value = false;
  isRecording.value = false;
  router.push({ path: "/clinician/recording/transcription", query: { loading: "1" } });
}

function stopRecording() {
  const rec = mediaRecorderRef.value;
  if (!rec || rec.state === "inactive") {
    if (isFinishing.value) return;
    micError.value = "Nothing to stop — start recording first.";
    return;
  }
  isFinishing.value = true;
  pauseTimer();
  isRecording.value = false;

  rec.onstop = finalizeBlobAndNavigate;

  try {
    rec.stop();
  } catch {
    finalizeBlobAndNavigate();
  }
}

function triggerFilePick() {
  fileInputRef.value?.click();
}

function onFileSelected(ev) {
  const file = ev.target?.files?.[0];
  ev.target.value = "";
  if (!file) return;
  setPendingAudioForTranscription(file);
  router.push({ path: "/clinician/recording/transcription", query: { loading: "1" } });
}

const timeParts = computed(() => {
  const totalMs = elapsedMs.value;
  const centis = Math.floor((totalMs % 1000) / 10);
  const seconds = Math.floor((totalMs / 1000) % 60);
  const minutes = Math.floor((totalMs / 1000 / 60) % 60);

  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");
  const cs = String(centis).padStart(2, "0");

  return { main: `${mm} : ${ss}`, fraction: cs };
});

onMounted(() => {
  clearScribeSession();
  startLiveRecording();
});

onBeforeUnmount(() => {
  pauseTimer();
  const rec = mediaRecorderRef.value;
  if (rec && rec.state !== "inactive") {
    rec.onstop = null;
    try {
      rec.stop();
    } catch {
      /* ignore */
    }
  }
  stopMediaTracks();
  mediaRecorderRef.value = null;
});
</script>

<template>
  <AppShell
    title="Active Session"
    subtitle="Recording clinical observations"
    active-nav="Active Recording"
  >
    <section class="active-header-row">
      <div class="recording-headline">
        <h2>
          {{
            isFinishing
              ? "Finishing recording…"
              : isRecording
                ? "Recording In Progress..."
                : mediaRecorderRef?.state === "paused"
                  ? "Recording Paused"
                  : "Ready"
          }}
        </h2>
        <p>Recording clinical observations and patient symptoms</p>
        <p v-if="micError" class="mic-error" role="alert">{{ micError }}</p>
      </div>
      <input
        ref="fileInput"
        type="file"
        class="sr-only"
        accept="audio/*,.webm,.wav,.mp3,.m4a,.ogg"
        aria-hidden="true"
        @change="onFileSelected"
      />
      <button
        type="button"
        class="secondary-btn small upload-audio-btn"
        :disabled="isFinishing"
        @click="triggerFilePick"
      >
        <font-awesome-icon :icon="['fas', 'microphone']" />
        Upload Audio
      </button>
    </section>

    <section class="single-recording-panel">
      <article class="recording-card active">
        <div v-if="isRecording" class="rec-pill">Rec</div>

        <div class="waveform">
          <span
            v-for="(h, idx) in waveformBars"
            :key="idx"
            :class="['wave-bar', { live: isRecording }]"
            :style="{ height: `${h}px` }"
          ></span>
        </div>

        <h3 class="record-timer">
          {{ timeParts.main }}<span>.{{ timeParts.fraction }}</span>
        </h3>

        <div class="record-controls">
          <button
            type="button"
            class="control-btn muted"
            :disabled="isFinishing || !mediaRecorderRef || mediaRecorderRef.state === 'inactive'"
            @click="isRecording ? pauseRecording() : resumeRecording()"
          >
            <span>{{ isRecording ? "Ⅱ" : "▶" }}</span>
          </button>
          <button type="button" class="control-btn mic" aria-hidden="true">
            <span>◖</span>
          </button>
          <button type="button" class="control-btn stop" :disabled="isFinishing" @click="stopRecording">
            <span>■</span>
          </button>
        </div>

        <div class="control-labels">
          <span>{{ isRecording ? "Pause" : "Resume" }}</span>
          <span></span>
          <span>Stop</span>
        </div>
      </article>
    </section>
  </AppShell>
</template>

<style scoped>
.mic-error {
  color: #b42318;
  font-size: 0.9rem;
  margin-top: 0.5rem;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.upload-audio-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 148px;
  justify-content: center;
}
</style>
