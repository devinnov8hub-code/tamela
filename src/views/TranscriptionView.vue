<script setup>
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useQueryClient } from "@tanstack/vue-query";
import AppShell from "../components/AppShell.vue";
import { useAuth } from "../composables/useAuth.js";
import { extractTranscriptionText, transcribeAudio } from "../services/scribeApi.js";
import {
  fetchReportById,
  fetchReportTranscription,
  saveReportWithTranscription,
} from "../services/reportService.js";
import {
  buildClinicalNotePlainText,
  copyTextToClipboard,
  downloadTextAsPdf,
} from "../utils/clinicalNoteExport.js";
import {
  clearPendingAudioForTranscription,
  getLastSavedReportId,
  getLastTranscription,
  getRecordingSessionType,
  setLastSavedReportId,
  setLastTranscription,
  setLastTranscriptionError,
  takePendingAudioForTranscription,
} from "../session/scribeSession.js";

const route = useRoute();
const router = useRouter();
const queryClient = useQueryClient();
const { hospitalId, user, profile } = useAuth();

const loadingFromQuery = computed(() => route.query.loading === "1");
const reportIdFromRoute = computed(() => String(route.query.reportId ?? "").trim());
const isLoading = ref(loadingFromQuery.value);
const transcriptText = ref("");
const errorText = ref("");
const saveErrorText = ref("");
const actionMessage = ref("");
const copyInProgress = ref(false);
const exportInProgress = ref(false);
const savedReport = ref(null);

const last = getLastTranscription();
if (last?.text) transcriptText.value = last.text;
if (last?.error) errorText.value = last.error;

const insightSections = [
  {
    title: "Clinical Impression",
    icon: "stethoscope",
    rows: [
      { label: "Localized Pain Location", value: "Right Upper Quadrant" },
      { label: "Pain Radiation Point", value: "Right Scapula" },
    ],
  },
  {
    title: "Differential Diagnosis",
    icon: "magnifying-glass",
    rows: [
      { label: "Vitals", value: "BP 142/88, HR 92 bpm, Temp 98.6°F, SpO2 99%" },
      { label: "Risk Level", value: "Moderate" },
    ],
  },
  {
    title: "Diagnostic Plan",
    icon: "clipboard-list",
    rows: [
      { label: "Orders", value: "Abdominal Ultrasound, CBC/LFTs" },
      { label: "Status", value: "Pending / Urgent" },
    ],
  },
];

const staticBlocks = [
  {
    heading: "Chief Complaint",
    html:
      'Patient presents with recurring abdominal pain localized in the <span class="transcript-highlight">right upper quadrant</span>, persisting for 3 days.',
  },
  {
    heading: "History of Present Illness",
    html:
      '45-year-old male with a history of mild hypertension. Reports that the current episode began after a heavy dinner on Tuesday, with pain radiating to the <span class="transcript-highlight">right scapula</span>.',
  },
  {
    heading: "Physical Examination",
    html: `<ul class="transcript-list">
<li><strong>General:</strong> Alert and oriented x3, in moderate distress due to pain.</li>
<li><strong>Vitals:</strong> <span class="transcript-highlight">BP 142/88</span>, <span class="transcript-highlight">HR 92 bpm</span>, <span class="transcript-highlight">Temp 98.6°F</span>, <span class="transcript-highlight">SpO2 99%</span> on RA.</li>
<li><strong>Abdomen:</strong> Positive Murphy's sign. Soft, but tender <span class="transcript-highlight">RUQ</span> on deep palpation.</li>
</ul>`,
  },
  {
    heading: "Impressions & Recommendations",
    html:
      'Clinical suspicion for acute cholecystitis based on <span class="transcript-highlight">RUQ</span> pain and positive Murphy\'s sign. Plan for urgent abdominal ultrasound and <span class="transcript-highlight">CBC/LFTs</span>.',
  },
];

const noteTitle = computed(() => savedReport.value?.caseTitle || "Clinical Consultation Note");
const caseRefLabel = computed(() => {
  if (savedReport.value?.reportId) {
    return `Report ID: ${savedReport.value.reportId}`;
  }
  return "Report ID: (not saved yet)";
});

const exportableText = computed(() =>
  buildClinicalNotePlainText({
    title: noteTitle.value,
    caseRef: caseRefLabel.value,
    transcript: transcriptText.value,
    error: errorText.value,
    sections: insightSections.map((s) => ({
      title: s.title,
      items: s.rows.map((r) => `${r.label}: ${r.value}`),
    })),
    blocks: staticBlocks.map((b) => ({ heading: b.heading, body: b.html.replace(/<[^>]+>/g, "") })),
  })
);

function buildFormattedTranscription() {
  return {
    sections: insightSections,
    blocks: staticBlocks.map((b) => ({ heading: b.heading, html: b.html })),
  };
}

async function invalidateReportQueries() {
  const hid = hospitalId.value;
  const uid = user.value?.id;
  if (!hid || !uid) return;

  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ["clinician-dashboard-reports", hid, uid] }),
    queryClient.invalidateQueries({ queryKey: ["clinician-library-reports", hid, uid] }),
    queryClient.invalidateQueries({ queryKey: ["admin-reports", hid] }),
    queryClient.invalidateQueries({ queryKey: ["clinician-reports", hid, uid] }),
  ]);
}

async function persistTranscription(text) {
  saveErrorText.value = "";

  const hid = hospitalId.value;
  const uid = user.value?.id;
  if (!hid || !uid) {
    saveErrorText.value = "Could not save report: missing hospital or user context.";
    return;
  }

  const { report, error } = await saveReportWithTranscription({
    hospitalId: hid,
    clinicianId: uid,
    departmentId: profile.value?.department_id ?? null,
    transcription: text,
    formattedTranscription: buildFormattedTranscription(),
    sessionType: getRecordingSessionType(),
  });

  if (error) {
    saveErrorText.value =
      error.message || "Transcription completed but could not be saved to the database.";
    return;
  }

  savedReport.value = report;
  setLastSavedReportId(report.id);
  await invalidateReportQueries();
}

async function loadSavedReport(reportUuid) {
  const hid = hospitalId.value;
  if (!hid || !reportUuid) return;

  isLoading.value = true;
  errorText.value = "";
  saveErrorText.value = "";

  try {
    const [{ report, error: reportError }, { transcription, error: transcriptionError }] =
      await Promise.all([
        fetchReportById(hid, reportUuid),
        fetchReportTranscription(reportUuid),
      ]);

    if (reportError) throw reportError;
    if (!report) {
      errorText.value = "Report not found.";
      return;
    }

    if (transcriptionError) throw transcriptionError;

    savedReport.value = {
      id: report.id,
      reportId: report.reportId,
      caseTitle: report.caseTitle,
    };
    setLastSavedReportId(report.id);

    if (transcription?.transcription) {
      transcriptText.value = String(transcription.transcription).trim();
    } else {
      transcriptText.value = "";
      errorText.value = "No transcription saved for this report yet.";
    }
  } catch (error) {
    errorText.value = error instanceof Error ? error.message : "Could not load report.";
  } finally {
    isLoading.value = false;
  }
}

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
  const existingReportId = reportIdFromRoute.value || getLastSavedReportId();
  if (!loadingFromQuery.value) {
    if (existingReportId) {
      await loadSavedReport(existingReportId);
    }
    return;
  }

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
    saveErrorText.value = "";

    const data = await transcribeAudio(pendingAudio);
    const text = extractTranscriptionText(data);
    const normalized = text?.trim() || "";
    transcriptText.value = normalized || "Transcription succeeded but returned empty text.";
    setLastTranscription(transcriptText.value, data);

    if (normalized) {
      await persistTranscription(normalized);
    }
  } catch (error) {
    transcriptText.value = "";
    errorText.value = error instanceof Error ? error.message : "Transcription failed.";
    setLastTranscriptionError(errorText.value);
  } finally {
    isLoading.value = false;
    clearPendingAudioForTranscription();
    const nextQuery = savedReport.value?.id ? { reportId: savedReport.value.id } : {};
    router.replace({ path: "/clinician/recording/transcription", query: nextQuery });
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
    wide-search
  >
    <section class="transcription-toolbar editor-toolbar">
      <div class="toolbar-left">
        <button type="button" class="toolbar-btn" disabled title="Undo (coming soon)" aria-label="Undo">
          <font-awesome-icon :icon="['fas', 'rotate-left']" />
        </button>
        <button type="button" class="toolbar-btn" disabled title="Redo (coming soon)" aria-label="Redo">
          <font-awesome-icon :icon="['fas', 'rotate-right']" />
        </button>
        <span class="divider" />
        <label class="toolbar-select-wrap">
          <span class="sr-only">Text style</span>
          <select class="toolbar-select" disabled>
            <option>Normal Text</option>
          </select>
        </label>
        <span class="divider" />
        <button type="button" class="toolbar-btn" disabled title="Bold (coming soon)"><strong>B</strong></button>
        <button type="button" class="toolbar-btn" disabled title="Italic (coming soon)"><em>I</em></button>
        <button type="button" class="toolbar-btn" disabled title="Underline (coming soon)"><u>U</u></button>
        <button type="button" class="toolbar-btn" disabled title="Text color (coming soon)" aria-label="Text color">
          <span class="toolbar-color-a">A</span>
        </button>
        <button type="button" class="toolbar-btn" disabled title="Highlight (coming soon)" aria-label="Highlight">
          <font-awesome-icon :icon="['fas', 'highlighter']" />
        </button>
        <span class="divider" />
        <button type="button" class="toolbar-btn" disabled title="Align left (coming soon)" aria-label="Align left">
          <font-awesome-icon :icon="['fas', 'align-left']" />
        </button>
        <button type="button" class="toolbar-btn" disabled title="Align center (coming soon)" aria-label="Align center">
          <font-awesome-icon :icon="['fas', 'align-center']" />
        </button>
        <button type="button" class="toolbar-btn" disabled title="Align right (coming soon)" aria-label="Align right">
          <font-awesome-icon :icon="['fas', 'align-right']" />
        </button>
        <button type="button" class="toolbar-btn" disabled title="Justify (coming soon)" aria-label="Justify">
          <font-awesome-icon :icon="['fas', 'align-justify']" />
        </button>
        <button type="button" class="toolbar-btn" disabled title="Link (coming soon)" aria-label="Insert link">
          <font-awesome-icon :icon="['fas', 'link']" />
        </button>
      </div>
      <div class="toolbar-actions transcription-toolbar-actions">
        <p v-if="actionMessage" class="transcription-action-msg" role="status">{{ actionMessage }}</p>
        <button
          type="button"
          class="transcription-btn-copy"
          :disabled="exportDisabled"
          @click="handleSmartCopy"
        >
          <font-awesome-icon :icon="['fas', 'copy']" />
          {{ copyInProgress ? "Copying…" : "Smart Copy" }}
        </button>
        <button
          type="button"
          class="transcription-btn-pdf"
          :disabled="exportDisabled"
          @click="handleExportPdf"
        >
          <font-awesome-icon :icon="['fas', 'file-pdf']" />
          {{ exportInProgress ? "Exporting…" : "Export To PDF" }}
        </button>
      </div>
    </section>

    <section class="transcription-layout">
      <article class="note-card transcription-note-card">
        <template v-if="isLoading">
          <h3 class="loading-title">Report Transcription Loading...</h3>
          <div class="skeleton-line short" />
          <div class="skeleton-line" />
          <div class="skeleton-line medium" />
          <div class="skeleton-line short mt" />
          <div class="skeleton-line" />
          <div class="skeleton-line medium" />
        </template>
        <template v-else>
          <h2 class="transcription-note-title">{{ noteTitle }}</h2>
          <p class="case-ref">{{ caseRefLabel }}</p>
          <p v-if="saveErrorText" class="save-error" role="alert">{{ saveErrorText }}</p>

          <template v-if="errorText">
            <h4 class="transcription-section-heading">Transcription Error</h4>
            <p class="transcription-paragraph">{{ errorText }}</p>
          </template>
          <template v-else-if="transcriptText">
            <h4 class="transcription-section-heading">Transcript</h4>
            <p class="transcription-paragraph transcript-body">{{ transcriptText }}</p>
          </template>
          <template v-else>
            <h4 class="transcription-section-heading">Transcript</h4>
            <p class="transcription-paragraph">No transcript available yet.</p>
          </template>

          <section
            v-for="block in staticBlocks"
            :key="block.heading"
            class="transcription-note-section"
          >
            <h4 class="transcription-section-heading">{{ block.heading }}</h4>
            <!-- eslint-disable-next-line vue/no-v-html -->
            <div class="transcription-paragraph" v-html="block.html" />
          </section>
        </template>
      </article>

      <aside v-if="!isLoading" class="insight-panel">
        <article v-for="section in insightSections" :key="section.title" class="insight-card">
          <header class="insight-card-head">
            <span class="insight-card-icon" aria-hidden="true">
              <font-awesome-icon :icon="['fas', section.icon]" />
            </span>
            <h4>{{ section.title }}</h4>
          </header>
          <dl class="insight-rows">
            <div v-for="row in section.rows" :key="row.label" class="insight-row">
              <dt>{{ row.label }}</dt>
              <dd>{{ row.value }}</dd>
            </div>
          </dl>
        </article>
      </aside>
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

.transcript-body {
  white-space: pre-wrap;
}

.save-error {
  color: #b42318;
  font-size: 0.9rem;
  margin: 0 0 12px;
}

.transcription-action-msg {
  margin: 0;
  font-size: 13px;
  color: #059669;
  font-weight: 600;
}

.transcription-toolbar-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}
</style>
