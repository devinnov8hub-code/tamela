<script setup>
import { computed, ref } from "vue";
import { useRoute } from "vue-router";
import { useQuery } from "@tanstack/vue-query";
import AdminShell from "../components/AdminShell.vue";
import { useAuth } from "../composables/useAuth.js";
import { fetchReportById, fetchReportTranscription } from "../services/reportService.js";
import {
  AI_DISCLAIMER_SHORT,
  buildClinicalNoteHtml,
  buildClinicalNotePlainText,
  copyRichTextToClipboard,
  downloadHtmlAsPdf,
} from "../utils/clinicalNoteExport.js";
import { parseSavedFormattedReport } from "../utils/reportFromTextFormat.js";
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

const parsedReport = computed(() =>
  parseSavedFormattedReport(transcriptionRow.value?.formatted_transcription)
);

const reportBlocks = computed(() => parsedReport.value?.blocks ?? []);

const insightSections = computed(() => parsedReport.value?.insightSections ?? []);

const isLoading = computed(() => reportLoading.value || transcriptionLoading.value);

const exportNotePayload = computed(() => {
  const row = report.value;
  if (!row) return null;

  const caseRef = [
    `Report ID: ${row.reportId}`,
    row.clinicianName,
    row.department,
    row.createdAt ? `Created ${formatReportDate(row.createdAt)}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return {
    title: row.caseTitle,
    caseRef,
    blocks: reportBlocks.value.map((block) => ({
      heading: block.heading,
      body: block.html,
    })),
    disclaimerShort: AI_DISCLAIMER_SHORT,
  };
});

/** Smart Copy omits the disclaimer so the note pastes cleanly. */
const copyNotePayload = computed(() => {
  if (!exportNotePayload.value) return null;
  const { disclaimerShort: _omit, ...rest } = exportNotePayload.value;
  return rest;
});

const exportableText = computed(() =>
  exportNotePayload.value ? buildClinicalNotePlainText(exportNotePayload.value) : ""
);

const exportableHtml = computed(() =>
  exportNotePayload.value ? buildClinicalNoteHtml(exportNotePayload.value) : ""
);

const copyableText = computed(() =>
  copyNotePayload.value ? buildClinicalNotePlainText(copyNotePayload.value) : ""
);

const copyableHtml = computed(() =>
  copyNotePayload.value ? buildClinicalNoteHtml(copyNotePayload.value) : ""
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
    await copyRichTextToClipboard(copyableHtml.value, copyableText.value);
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
    const id = report.value?.reportId?.replace(/[^\w-]+/g, "-") || "report";
    await downloadHtmlAsPdf(exportableHtml.value, `${id}.pdf`, exportableText.value);
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
    title="Clinical Report"
    subtitle="Generated clinical note"
    active-nav="Reports"
    search-value=""
  >
    <p v-if="!hospitalId" class="auth-form-message" role="alert">Hospital context is missing.</p>

    <p v-else-if="isLoading" class="auth-form-message auth-form-message--info">Loading report…</p>

    <p v-else-if="reportError" class="auth-form-message" role="alert">
      {{ reportLoadError?.message || "Could not load report." }}
    </p>

    <template v-else-if="report">
      <section class="editor-toolbar">
        <div class="toolbar-left">
          <button type="button" class="toolbar-btn" disabled title="Read only">↶</button>
          <button type="button" class="toolbar-btn" disabled title="Read only">↷</button>
          <span class="divider"></span>
          <span class="toolbar-label">Clinical report (read only)</span>
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

          <template v-if="reportBlocks.length">
            <section
              v-for="(block, index) in reportBlocks"
              :key="`${block.heading}-${index}`"
              class="transcription-note-section"
            >
              <h4 class="transcription-section-heading">{{ block.heading }}</h4>
              <div class="transcription-paragraph report-block-readonly" v-html="block.html" />
            </section>
          </template>
          <p v-else class="auth-form-message auth-form-message--info">
            No formatted report content saved for this session yet.
          </p>
        </article>

        <aside v-if="insightSections.length" class="insight-panel">
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
    </template>
  </AdminShell>
</template>

<style scoped>
.report-block-readonly {
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
