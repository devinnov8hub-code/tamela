<script setup>
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import AppShell from "../components/AppShell.vue";
import { extractTranscriptionText, transcribeAudio } from "../services/scribeApi.js";
import {
  buildClinicalNotePlainText,
  copyTextToClipboard,
  downloadTextAsPdf,
} from "../utils/clinicalNoteExport.js";
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
const actionMessage = ref("");
const copyInProgress = ref(false);
const exportInProgress = ref(false);

const last = getLastTranscription();
if (last?.text) transcriptText.value = last.text;
if (last?.error) errorText.value = last.error;

const insightSections = [
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

const staticBlocks = [
  {
    heading: "Chief Complaint",
    body: "Patient presents with recurring abdominal pain localized in the right upper quadrant, persisting for 3 days.",
  },
  {
    heading: "History of Present Illness",
    body: "45-year-old male with a history of mild hypertension. Reports that the current episode began after a heavy dinner on Tuesday.",
  },
  {
    heading: "Physical Examination",
    body:
      "General: Alert and oriented x3, in moderate distress due to pain.\n" +
      "Vitals: BP 142/88, HR 92 bpm, Temp 98.6F, SpO2 99% on RA.\n" +
      "Abdomen: Positive Murphy's sign. Soft, but tender RUQ on deep palpation.",
  },
];

const exportableText = computed(() =>
  buildClinicalNotePlainText({
    title: "Clinical Consultation Note",
    caseRef: "Case Ref: #8821-JHK-2023",
    transcript: transcriptText.value,
    error: errorText.value,
    sections: insightSections,
    blocks: staticBlocks,
  })
);

const exportDisabled = computed(
  () =>
    isLoading.value ||
    copyInProgress.value ||
    exportInProgress.value ||
    !exportableText.value.trim()
);

function flashAction(message) {
  actionMessage.value = message;
  window.setTimeout(() => {
    if (actionMessage.value === message) {
      actionMessage.value = "";
    }
  }, 2500);
}

async function handleSmartCopy() {
  if (exportDisabled.value) return;

  copyInProgress.value = true;
  actionMessage.value = "";

  try {
    await copyTextToClipboard(exportableText.value);
    flashAction("Copied to clipboard.");
  } catch (error) {
    flashAction(error instanceof Error ? error.message : "Copy failed.");
  } finally {
    copyInProgress.value = false;
  }
}

async function handleExportPdf() {
  if (exportDisabled.value) return;

  exportInProgress.value = true;
  actionMessage.value = "";

  try {
    const stamp = new Date().toISOString().slice(0, 10);
    await downloadTextAsPdf(exportableText.value, `clinical-note-${stamp}.pdf`);
    flashAction("PDF download started.");
  } catch (error) {
    flashAction(error instanceof Error ? error.message : "Export failed.");
  } finally {
    exportInProgress.value = false;
  }
}

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
    router.replace({ path: "/clinician/recording/transcription" });
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
        <button type="button" class="toolbar-btn" disabled title="Coming soon">↶</button>
        <button type="button" class="toolbar-btn" disabled title="Coming soon">↷</button>
        <span class="divider"></span>
        <button type="button" class="toolbar-btn" disabled title="Coming soon">B</button>
        <button type="button" class="toolbar-btn" disabled title="Coming soon">I</button>
        <button type="button" class="toolbar-btn" disabled title="Coming soon">U</button>
      </div>
      <div class="toolbar-actions">
        <p v-if="actionMessage" class="transcription-action-msg" role="status">{{ actionMessage }}</p>
        <button
          type="button"
          class="secondary-btn small"
          :disabled="exportDisabled"
          @click="handleSmartCopy"
        >
          {{ copyInProgress ? "Copying…" : "Smart Copy" }}
        </button>
        <button
          type="button"
          class="export-btn small"
          :disabled="exportDisabled"
          @click="handleExportPdf"
        >
          {{ exportInProgress ? "Exporting…" : "Export to PDF" }}
        </button>
      </div>
    </section>

    <section class="transcription-layout">
      <article class="note-card">
        <template v-if="isLoading">
          <h3 class="loading-title">Report Transcription Loading...</h3>
          <div class="skeleton-line short" />
          <div class="skeleton-line"></div>
          <div class="skeleton-line medium"></div>
          <div class="skeleton-line short mt" />
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
            <p class="transcript-body">{{ transcriptText }}</p>
          </template>
          <template v-else>
            <h4>Transcript</h4>
            <p>No transcript available yet.</p>
          </template>

          <template v-for="block in staticBlocks" :key="block.heading">
            <h4>{{ block.heading }}</h4>
            <p class="transcript-body">{{ block.body }}</p>
          </template>
        </template>
      </article>

      <aside v-if="!isLoading" class="insight-stack">
        <article v-for="section in insightSections" :key="section.title" class="insight-card">
          <h4>{{ section.title }}</h4>
          <p v-for="item in section.items" :key="item">{{ item }}</p>
        </article>
      </aside>
    </section>
  </AppShell>
</template>

<style scoped>
.transcript-body {
  white-space: pre-wrap;
}

.transcription-action-msg {
  margin: 0 8px 0 0;
  font-size: 13px;
  color: #059669;
  font-weight: 600;
}

.toolbar-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}
</style>
