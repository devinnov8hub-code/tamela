<script setup>
import { useTemplateRef } from "vue";
import { useRouter } from "vue-router";
import AppShell from "../components/AppShell.vue";
import { setPendingAudioForTranscription, setRecordingSessionType } from "../session/scribeSession.js";

const router = useRouter();
const fileInputRef = useTemplateRef("fileInput");

function startRecording() {
  router.push({ name: "clinician-recording-active" });
}

function triggerFilePick() {
  fileInputRef.value?.click();
}

function onFileSelected(ev) {
  const file = ev.target?.files?.[0];
  ev.target.value = "";
  if (!file) return;
  setRecordingSessionType("Audio Upload");
  setPendingAudioForTranscription(file);
  router.push({ path: "/clinician/recording/transcription", query: { loading: "1" } });
}
</script>

<template>
  <AppShell
    title="New Consultation"
    subtitle="Record clinical observations"
    active-nav="Active Recording"
    :show-search="false"
    :show-notifications="false"
  >
    <section class="single-recording-panel fresh-recording-panel">
      <article class="recording-card fresh-recording-card">
        <header class="fresh-recording-card-head">
          <h2>Start Recording</h2>
          <p>Press the button below to start recording the clinical encounter.</p>
        </header>

        <div class="fresh-recording-actions">
          <button type="button" class="record-btn" aria-label="Start recording" @click="startRecording">
            <font-awesome-icon :icon="['fas', 'microphone']" class="record-btn-mic" />
            <span class="record-btn-label">START RECORDING</span>
          </button>

          <input
            ref="fileInput"
            type="file"
            class="sr-only"
            accept="audio/*,.webm,.wav,.mp3,.m4a,.ogg"
            aria-hidden="true"
            @change="onFileSelected"
          />
          <button type="button" class="fresh-upload-btn" @click="triggerFilePick">
            <font-awesome-icon :icon="['fas', 'arrow-up-from-bracket']" />
            Upload Audio
          </button>
        </div>
      </article>
    </section>
  </AppShell>
</template>

<style scoped>
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
</style>
