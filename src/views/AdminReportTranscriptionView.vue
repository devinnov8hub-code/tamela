<script setup>
import { computed, ref } from "vue";
import { useRoute } from "vue-router";
import { useQuery } from "@tanstack/vue-query";
import AdminShell from "../components/AdminShell.vue";
import { useAuth } from "../composables/useAuth.js";
import ClinicalMarkdown from "../components/ClinicalMarkdown.vue";
import { fetchReportById, fetchReportTranscription } from "../services/reportService.js";
import { insightSectionsFromTranscriptionRow } from "../utils/criticalFields.js";
import {
  buildClinicalNoteDocument,
  copyClinicalNotePreview,
  downloadClinicalNotePdf,
} from "../utils/clinicalNoteExport.js";
import { formatReportDate } from "../utils/formatDateTime.js";

const route = useRoute();
const { hospitalId } = useAuth();

const reportId = computed(() => String(route.params.reportId ?? ""));
const actionMessage = ref("");
const copyInProgress = ref(false);
const exportInProgress = ref(false);

const {
  data: report,
  isLoading: reportLoading,
  isError: reportError,
  error: reportLoadError,
} = useQuery({
  queryKey: computed(() => ["admin-report", hospitalId.value, reportId.value]),
  enabled: computed(() => Boolean(hospitalId.value && reportId.value)),
  queryFn: async () => {
    const { report: row, error } = await fetchReportById(hospitalId.value, reportId.value);
    if (error) throw error;
    if (!row) throw new Error("Report not found.");
    return row;
  },
});

const {
  data: transcriptionRow,
  isLoading: transcriptionLoading,
} = useQuery({
  queryKey: computed(() => ["admin-report-transcription", reportId.value]),
  enabled: computed(() => Boolean(reportId.value)),
  queryFn: async () => {
    const { transcription, error } = await fetchReportTranscription(reportId.value);
    if (error) throw error;
    return transcription;
  },
});

const transcriptionText = computed(() => {
  const row = transcriptionRow.value;
  if (!row?.transcription) return "";
  return String(row.transcription).trim();
});

const formattedSections = computed(() =>
  insightSectionsFromTranscriptionRow(transcriptionRow.value)
);

const isLoading = computed(() => reportLoading.value || transcriptionLoading.value);

const exportDocument = computed(() => {
  const row = report.value;
  if (!row) {
    return { html: "", plainText: "" };
  }

  const caseRef = [
    `Report ID: ${row.reportId}`,
    row.clinicianName,
    row.department,
    row.createdAt ? `Created ${formatReportDate(row.createdAt)}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return buildClinicalNoteDocument({
    title: row.caseTitle,
    caseRef,
    transcript: transcriptionText.value,
    sections: formattedSections.value,
  });
});

const exportDisabled = computed(
  () =>
    isLoading.value ||
    copyInProgress.value ||
    exportInProgress.value ||
    !exportDocument.value.plainText.trim()
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
    await copyClinicalNotePreview(exportDocument.value);
    flashAction("Copied formatted note to clipboard.");
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
    const id = report.value?.reportId?.replace(/[^\w-]+/g, "-") || "report";
    await downloadClinicalNotePdf(exportDocument.value, `${id}.pdf`);
    flashAction("PDF download started.");
  } catch (error) {
    flashAction(error instanceof Error ? error.message : "Export failed.");
  } finally {
    exportInProgress.value = false;
  }
}
</script>

<template>
  <AdminShell
    title="Report Transcription"
    subtitle="Transcribed clinical observations"
    active-nav="Reports"
    search-value=""
  >
    <p v-if="!hospitalId" class="auth-form-message" role="alert">Hospital context is missing.</p>

    <p v-else-if="isLoading" class="auth-form-message auth-form-message--info">Loading transcription…</p>

    <p v-else-if="reportError" class="auth-form-message" role="alert">
      {{ reportLoadError?.message || "Could not load report." }}
    </p>

    <template v-else-if="report">
      <section class="editor-toolbar">
        <div class="toolbar-left">
          <button type="button" class="toolbar-btn" disabled title="Coming soon">↶</button>
          <button type="button" class="toolbar-btn" disabled title="Coming soon">↷</button>
          <span class="divider"></span>
          <span class="toolbar-label">Normal Text</span>
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
          <h2>{{ report.caseTitle }}</h2>
          <p class="case-ref">
            Report ID: {{ report.reportId }} · {{ report.clinicianName }} · {{ report.department }}
          </p>
          <p v-if="report.createdAt" class="case-ref">Created {{ formatReportDate(report.createdAt) }}</p>

          <template v-if="transcriptionText">
            <ClinicalMarkdown :content="transcriptionText" />
          </template>
          <p v-else class="auth-form-message auth-form-message--info">
            No transcription has been saved for this report yet.
          </p>
        </article>

        <aside v-if="formattedSections.length" class="insight-stack">
          <article v-for="section in formattedSections" :key="section.title" class="insight-card">
            <h4>{{ section.title.toUpperCase() }}</h4>
            <p v-for="item in section.items" :key="item">{{ item }}</p>
          </article>
        </aside>
      </section>
    </template>
  </AdminShell>
</template>

<style scoped>
.transcription-body {
  white-space: pre-wrap;
  line-height: 1.6;
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
