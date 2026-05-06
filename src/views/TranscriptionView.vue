<script setup>
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import AppShell from "../components/AppShell.vue";
import { extractTranscriptionText, transcribeAudio } from "../services/scribeApi.js";
import {
  clearPendingAudioForTranscription,
  getLastTranscription,
  setLastTranscription,
  setLastTranscriptionError,
  takePendingAudioForTranscription,
} from "../session/scribeSession.js";

const route = useRoute();
const router = useRouter();
const loadingFromQuery = computed(() => route.query.loading === "1");
const isLoading = ref(loadingFromQuery.value);
const transcriptText = ref("");
const errorText = ref("");

const last = getLastTranscription();
if (last?.text) transcriptText.value = last.text;
if (last?.error) errorText.value = last.error;

const sections = [
  {
    title: "Clinical Impression",
    items: [
      "Condition: Acute Cholecystitis (K81.0)",
      "Certainty: High (Based on Murphy's Sign)",
    ],
  },
  {
    title: "Differential Diagnosis",
    items: ["Conditions: Biliary Colic, Pancreatitis, PUD", "Risk Level: Moderate"],
  },
  {
    title: "Diagnostic Plan",
    items: ["Orders: Abdominal Ultrasound, CBC", "Status: Pending / Urgent"],
  },
];

async function loadTranscription() {
  if (!loadingFromQuery.value) return;

  const pendingAudio = takePendingAudioForTranscription();
  if (!pendingAudio) {
    isLoading.value = false;
    if (!transcriptText.value) {
      errorText.value = "No recorded audio found. Please record again.";
      setLastTranscriptionError(errorText.value);
    }
    return;
  }

  try {
    isLoading.value = true;
    errorText.value = "";
    const data = await transcribeAudio(pendingAudio);
    const text = extractTranscriptionText(data);
    transcriptText.value = text || "Transcription succeeded but returned empty text.";
    setLastTranscription(transcriptText.value, data);
  } catch (error) {
    transcriptText.value = "";
    errorText.value = error instanceof Error ? error.message : "Transcription failed.";
    setLastTranscriptionError(errorText.value);
  } finally {
    isLoading.value = false;
    clearPendingAudioForTranscription();
    router.replace({ path: "/recording/transcription" });
  }
}

onMounted(loadTranscription);
</script>

<template>
  <AppShell
    title="Report Transcription"
    subtitle="Transcribed clinical observations"
    active-nav="Active Recording"
    search-placeholder="Search"
  >
    <section class="editor-toolbar">
      <div class="toolbar-left">
        <button type="button" class="toolbar-btn">↶</button>
        <button type="button" class="toolbar-btn">↷</button>
        <span class="divider"></span>
        <button type="button" class="toolbar-btn">B</button>
        <button type="button" class="toolbar-btn">I</button>
        <button type="button" class="toolbar-btn">U</button>
      </div>
      <div class="toolbar-actions">
        <button type="button" class="secondary-btn small" :disabled="isLoading">Smart Copy</button>
        <button type="button" class="export-btn small" :disabled="isLoading">Export to PDF</button>
      </div>
    </section>

    <section class="transcription-layout">
      <article class="note-card">
        <template v-if="isLoading">
          <h3 class="loading-title">Report Transcription Loading...</h3>
          <div class="skeleton-line short"></div>
          <div class="skeleton-line"></div>
          <div class="skeleton-line medium"></div>
          <div class="skeleton-line short mt"></div>
          <div class="skeleton-line"></div>
          <div class="skeleton-line"></div>
          <div class="skeleton-line"></div>
          <div class="skeleton-line medium"></div>
          <div class="skeleton-line short mt"></div>
          <div class="skeleton-line"></div>
          <div class="skeleton-line"></div>
          <div class="skeleton-line medium"></div>
        </template>
        <template v-else>
          <h2>Clinical Consultation Note</h2>
          <p class="case-ref">Case Ref: #8821-JHK-2023</p>

          <template v-if="errorText">
            <h4>Transcription Error</h4>
            <p>{{ errorText }}</p>
          </template>
          <template v-else-if="transcriptText">
            <h4>Transcript</h4>
            <p style="white-space: pre-wrap">{{ transcriptText }}</p>
          </template>
          <template v-else>
            <h4>Transcript</h4>
            <p>No transcript available yet.</p>
          </template>

          <h4>Chief Complaint</h4>
          <p>
            Patient presents with recurring abdominal pain localized in the right upper quadrant,
            persisting for 3 days.
          </p>

          <h4>History of Present Illness</h4>
          <p>
            45-year-old male with a history of mild hypertension. Reports that the current episode
            began after a heavy dinner on Tuesday.
          </p>

          <h4>Physical Examination</h4>
          <ul>
            <li>General: Alert and oriented x3, in moderate distress due to pain.</li>
            <li>Vitals: BP 142/88, HR 92 bpm, Temp 98.6F, SpO2 99% on RA.</li>
            <li>Abdomen: Positive Murphy's sign. Soft, but tender RUQ on deep palpation.</li>
          </ul>
        </template>
      </article>

      <aside class="insight-stack" v-if="!isLoading">
        <article v-for="section in sections" :key="section.title" class="insight-card">
          <h4>{{ section.title }}</h4>
          <p v-for="item in section.items" :key="item">{{ item }}</p>
        </article>
      </aside>
    </section>
  </AppShell>
</template>
