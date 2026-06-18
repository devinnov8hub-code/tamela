<script setup>
import { computed, nextTick, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useQuery, useQueryClient } from "@tanstack/vue-query";
import AppShell from "../components/AppShell.vue";
import { useAuth } from "../composables/useAuth.js";
import {
  extractTranscriptionText,
  reportFromText,
  transcribeAudio,
} from "../services/scribeApi.js";
import {
  fetchReportById,
  fetchReportTranscription,
  saveReportWithTranscription,
  updateReportContent,
} from "../services/reportService.js";
import { fetchSpecialtiesByHospital } from "../services/specialtyService.js";
import {
  buildClinicalNoteHtml,
  buildClinicalNotePlainText,
  copyRichTextToClipboard,
  downloadHtmlAsPdf,
} from "../utils/clinicalNoteExport.js";
import {
  buildFormattedReportPayload,
  criticalFieldsToInsightSections,
  normalizeReportFromTextResponse,
  parseSavedFormattedReport,
  templateTextToBlocks,
} from "../utils/reportFromTextFormat.js";
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
const loadingMessage = ref("Loading clinical report…");
const transcriptText = ref("");
const errorText = ref("");
const saveErrorText = ref("");
const actionMessage = ref("");
const copyInProgress = ref(false);
const exportInProgress = ref(false);
const savedReport = ref(null);
const reportMeta = ref({ caseTitle: "", sessionType: "", criticalFields: [] });
const reportBlocks = ref([]);
const insightSections = ref([]);
const reportContentKey = ref(0);
const blockEditorRefs = ref([]);
const savedSnapshot = ref("");
const isDirty = ref(false);
const saveInProgress = ref(false);
const autoSaveInProgress = ref(false);

const last = getLastTranscription();
if (last?.text) transcriptText.value = last.text;
if (last?.error) errorText.value = last.error;

const { data: specialtiesList } = useQuery({
  queryKey: computed(() => ["specialties", hospitalId.value]),
  enabled: computed(() => Boolean(hospitalId.value)),
  queryFn: async () => {
    const { specialties, error } = await fetchSpecialtiesByHospital(hospitalId.value);
    if (error) throw error;
    return specialties;
  },
});

const clinicianSpecialty = computed(() => {
  const specId = profile.value?.specialty_id;
  if (specId) {
    const match = (specialtiesList.value ?? []).find((s) => s.id === specId);
    if (match?.name) return match.name;
  }
  return "Radiology/Ultrasound";
});

const noteTitle = computed(
  () =>
    savedReport.value?.caseTitle ||
    reportMeta.value.caseTitle ||
    "Clinical Consultation Note"
);

const exportNotePayload = computed(() => ({
  title: noteTitle.value,
  error: errorText.value,
  blocks: reportBlocks.value.map((block) => ({
    heading: block.heading,
    body: block.html,
  })),
  sections: insightSections.value.map((section) => ({
    title: section.title,
    items: section.rows.map((row) => `${row.label}: ${row.value}`),
  })),
}));

const exportableText = computed(() => buildClinicalNotePlainText(exportNotePayload.value));

const exportableHtml = computed(() => buildClinicalNoteHtml(exportNotePayload.value));

function applyReportResponse(normalized) {
  reportMeta.value = {
    caseTitle: normalized.caseTitle,
    sessionType: normalized.sessionType,
    criticalFields: normalized.criticalFields,
  };
  reportBlocks.value = templateTextToBlocks(normalized.templateText);
  insightSections.value = criticalFieldsToInsightSections(normalized.criticalFields, []);
  reportContentKey.value += 1;
  blockEditorRefs.value = [];
}

function buildFormattedTranscription() {
  return buildFormattedReportPayload(
    reportBlocks.value,
    insightSections.value,
    reportMeta.value.criticalFields
  );
}

function serializeReportState() {
  syncAllBlocksFromEditors();
  return JSON.stringify(buildFormattedTranscription());
}

function markReportSaved() {
  savedSnapshot.value = serializeReportState();
  isDirty.value = false;
}

function updateDirtyState() {
  if (!savedReport.value?.id || !savedSnapshot.value) {
    isDirty.value = false;
    return;
  }
  isDirty.value = serializeReportState() !== savedSnapshot.value;
}

function setBlockEditorRef(el, index) {
  if (!el) return;
  blockEditorRefs.value[index] = el;
  const block = reportBlocks.value[index];
  if (block && el.innerHTML !== block.html) {
    el.innerHTML = block.html;
  }
}

watch(reportContentKey, () => {
  nextTick(() => {
    reportBlocks.value.forEach((block, index) => {
      const el = blockEditorRefs.value[index];
      if (el) el.innerHTML = block.html;
    });
  });
});

function syncBlockHtml(index, event) {
  const html = event.target.innerHTML;
  if (reportBlocks.value[index]) {
    reportBlocks.value[index].html = html;
  }
  updateDirtyState();
}

function syncAllBlocksFromEditors() {
  blockEditorRefs.value.forEach((el, index) => {
    if (el && reportBlocks.value[index]) {
      reportBlocks.value[index].html = el.innerHTML;
    }
  });
}

function focusEditorSelection() {
  const active = document.activeElement;
  if (active?.isContentEditable) return active;
  const first = blockEditorRefs.value.find((el) => el);
  first?.focus();
  return first ?? null;
}

function applyFormat(command, value = null) {
  focusEditorSelection();
  document.execCommand(command, false, value);
  syncAllBlocksFromEditors();
  updateDirtyState();
}

function applyBlockFormat(tag) {
  focusEditorSelection();
  document.execCommand("formatBlock", false, tag);
  syncAllBlocksFromEditors();
  updateDirtyState();
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

async function persistTranscription(text, caseTitle) {
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
    sessionType:
      reportMeta.value.sessionType?.trim() || getRecordingSessionType(),
    caseTitle: caseTitle || reportMeta.value.caseTitle || undefined,
  });

  if (error) {
    saveErrorText.value =
      error.message || "Report generated but could not be saved to the database.";
    return;
  }

  savedReport.value = report;
  setLastSavedReportId(report.id);
  await invalidateReportQueries();
  await nextTick();
  markReportSaved();
}

function revealGeneratedReport() {
  isLoading.value = false;
  clearPendingAudioForTranscription();
  router.replace({ path: "/clinician/recording/report", query: {} });
}

function startPersistTranscriptionInBackground(text, caseTitle) {
  void (async () => {
    autoSaveInProgress.value = true;
    saveErrorText.value = "";
    try {
      await persistTranscription(text, caseTitle);
      if (savedReport.value?.id) {
        router.replace({
          path: "/clinician/recording/report",
          query: { reportId: savedReport.value.id },
        });
      }
    } finally {
      autoSaveInProgress.value = false;
    }
  })();
}

function hydrateSavedFormattedReport(formatted) {
  const parsed = parseSavedFormattedReport(formatted);
  if (!parsed) return false;

  reportBlocks.value = parsed.blocks;
  insightSections.value = parsed.insightSections;
  reportMeta.value.criticalFields = parsed.criticalFields;
  reportContentKey.value += 1;
  blockEditorRefs.value = [];
  return true;
}

async function generateReportFromTranscript(text) {
  loadingMessage.value = "Generating clinical report…";
  const reportData = await reportFromText(text, { specialty: clinicianSpecialty.value });
  const normalized = normalizeReportFromTextResponse(reportData);
  applyReportResponse(normalized);

  if (!reportBlocks.value.length) {
    throw new Error("Report was generated but returned no note content.");
  }

  return normalized;
}

async function loadSavedReport(reportUuid) {
  const hid = hospitalId.value;
  if (!hid || !reportUuid) return;

  isLoading.value = true;
  loadingMessage.value = "Loading clinical report…";
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
    reportMeta.value.caseTitle = report.caseTitle || reportMeta.value.caseTitle;
    reportMeta.value.sessionType = report.sessionType || reportMeta.value.sessionType;
    setLastSavedReportId(report.id);

    if (transcription?.transcription) {
      transcriptText.value = String(transcription.transcription).trim();
    }

    const loaded = hydrateSavedFormattedReport(transcription?.formatted_transcription);
    if (loaded) {
      await nextTick();
      markReportSaved();
      return;
    }

    if (transcriptText.value) {
      const normalized = await generateReportFromTranscript(transcriptText.value);
      const uid = user.value?.id;
      if (savedReport.value?.id && uid) {
        await updateReportContent({
          hospitalId: hid,
          reportId: savedReport.value.id,
          clinicianId: uid,
          formattedTranscription: buildFormattedTranscription(),
          caseTitle: normalized.caseTitle || savedReport.value.caseTitle,
          sessionType: normalized.sessionType || reportMeta.value.sessionType,
        });
        await nextTick();
        markReportSaved();
      }
      return;
    }

    errorText.value = "No report content saved for this session yet.";
  } catch (error) {
    errorText.value = error instanceof Error ? error.message : "Could not load report.";
  } finally {
    isLoading.value = false;
  }
}

const canSaveChanges = computed(
  () =>
    Boolean(savedReport.value?.id) &&
    isDirty.value &&
    !isLoading.value &&
    !errorText.value &&
    reportBlocks.value.length > 0
);

const exportDisabled = computed(
  () =>
    isLoading.value ||
    copyInProgress.value ||
    exportInProgress.value ||
    saveInProgress.value ||
    Boolean(errorText.value) ||
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

  syncAllBlocksFromEditors();
  copyInProgress.value = true;
  actionMessage.value = "";

  try {
    await copyRichTextToClipboard(exportableHtml.value, exportableText.value);
    flashAction("Copied to clipboard.");
  } catch (error) {
    flashAction(error instanceof Error ? error.message : "Copy failed.");
  } finally {
    copyInProgress.value = false;
  }
}

async function handleExportPdf() {
  if (exportDisabled.value) return;

  syncAllBlocksFromEditors();
  exportInProgress.value = true;
  actionMessage.value = "";

  try {
    const stamp = new Date().toISOString().slice(0, 10);
    await downloadHtmlAsPdf(
      exportableHtml.value,
      `clinical-note-${stamp}.pdf`,
      exportableText.value
    );
    flashAction("PDF download started.");
  } catch (error) {
    flashAction(error instanceof Error ? error.message : "Export failed.");
  } finally {
    exportInProgress.value = false;
  }
}

async function handleSaveChanges() {
  if (!canSaveChanges.value || saveInProgress.value) return;

  const hid = hospitalId.value;
  const uid = user.value?.id;
  const reportId = savedReport.value?.id;
  if (!hid || !uid || !reportId) return;

  syncAllBlocksFromEditors();
  saveInProgress.value = true;
  saveErrorText.value = "";
  actionMessage.value = "";

  try {
    const { report, error } = await updateReportContent({
      hospitalId: hid,
      reportId,
      clinicianId: uid,
      formattedTranscription: buildFormattedTranscription(),
      caseTitle: noteTitle.value,
      sessionType: reportMeta.value.sessionType || getRecordingSessionType(),
    });

    if (error) {
      saveErrorText.value = error.message || "Could not save changes.";
      return;
    }

    if (report) {
      savedReport.value = report;
      reportMeta.value.caseTitle = report.caseTitle || reportMeta.value.caseTitle;
    }

    await invalidateReportQueries();
    markReportSaved();
    flashAction("Changes saved.");
  } catch (error) {
    saveErrorText.value = error instanceof Error ? error.message : "Could not save changes.";
  } finally {
    saveInProgress.value = false;
  }
}

async function resumeReportFromTranscript() {
  if (!transcriptText.value?.trim() || reportBlocks.value.length) return;

  isLoading.value = true;
  errorText.value = "";
  try {
    await generateReportFromTranscript(transcriptText.value);
  } catch (error) {
    errorText.value = error instanceof Error ? error.message : "Could not generate report.";
  } finally {
    isLoading.value = false;
  }
}

async function loadTranscription() {
  const existingReportId = reportIdFromRoute.value || getLastSavedReportId();
  if (!loadingFromQuery.value) {
    if (existingReportId) {
      await loadSavedReport(existingReportId);
      return;
    }
    await resumeReportFromTranscript();
    return;
  }

  const pendingAudio = takePendingAudioForTranscription();
  if (!pendingAudio) {
    isLoading.value = false;
    if (!reportBlocks.value.length && !transcriptText.value) {
      errorText.value = "No recorded audio found. Please record again.";
      setLastTranscriptionError(errorText.value);
    }
    return;
  }

  try {
    isLoading.value = true;
    errorText.value = "";
    saveErrorText.value = "";

    loadingMessage.value = "Transcribing audio…";
    const data = await transcribeAudio(pendingAudio);
    const text = extractTranscriptionText(data);
    const normalizedTranscript = text?.trim() || "";
    transcriptText.value = normalizedTranscript;
    setLastTranscription(transcriptText.value, data);

    if (!normalizedTranscript) {
      errorText.value = "Transcription succeeded but returned empty text.";
      setLastTranscriptionError(errorText.value);
      return;
    }

    const generated = await generateReportFromTranscript(normalizedTranscript);
    revealGeneratedReport();
    startPersistTranscriptionInBackground(
      normalizedTranscript,
      generated.caseTitle || undefined
    );
  } catch (error) {
    reportBlocks.value = [];
    insightSections.value = [];
    transcriptText.value = "";
    errorText.value = error instanceof Error ? error.message : "Could not generate report.";
    setLastTranscriptionError(errorText.value);
  } finally {
    if (isLoading.value) {
      isLoading.value = false;
      clearPendingAudioForTranscription();
      const nextQuery = savedReport.value?.id ? { reportId: savedReport.value.id } : {};
      router.replace({ path: "/clinician/recording/report", query: nextQuery });
    }
  }
}

onMounted(loadTranscription);
</script>

<template>
  <AppShell
    title="Clinical Report"
    subtitle="Review and edit your generated note"
    active-nav="Active Recording"
    search-placeholder="Search"
    wide-search
  >
    <section class="transcription-toolbar editor-toolbar">
      <div class="toolbar-left">
        <button
          type="button"
          class="toolbar-btn"
          title="Undo"
          aria-label="Undo"
          :disabled="isLoading || Boolean(errorText)"
          @click="applyFormat('undo')"
        >
          <font-awesome-icon :icon="['fas', 'rotate-left']" />
        </button>
        <button
          type="button"
          class="toolbar-btn"
          title="Redo"
          aria-label="Redo"
          :disabled="isLoading || Boolean(errorText)"
          @click="applyFormat('redo')"
        >
          <font-awesome-icon :icon="['fas', 'rotate-right']" />
        </button>
        <span class="divider" />
        <label class="toolbar-select-wrap">
          <span class="sr-only">Text style</span>
          <select
            class="toolbar-select"
            :disabled="isLoading || Boolean(errorText)"
            @change="applyBlockFormat($event.target.value)"
          >
            <option value="p">Normal Text</option>
            <option value="h3">Heading</option>
            <option value="h4">Subheading</option>
          </select>
        </label>
        <span class="divider" />
        <button
          type="button"
          class="toolbar-btn"
          title="Bold"
          :disabled="isLoading || Boolean(errorText)"
          @click="applyFormat('bold')"
        >
          <strong>B</strong>
        </button>
        <button
          type="button"
          class="toolbar-btn"
          title="Italic"
          :disabled="isLoading || Boolean(errorText)"
          @click="applyFormat('italic')"
        >
          <em>I</em>
        </button>
        <button
          type="button"
          class="toolbar-btn"
          title="Underline"
          :disabled="isLoading || Boolean(errorText)"
          @click="applyFormat('underline')"
        >
          <u>U</u>
        </button>
        <span class="divider" />
        <button
          type="button"
          class="toolbar-btn"
          title="Align left"
          aria-label="Align left"
          :disabled="isLoading || Boolean(errorText)"
          @click="applyFormat('justifyLeft')"
        >
          <font-awesome-icon :icon="['fas', 'align-left']" />
        </button>
        <button
          type="button"
          class="toolbar-btn"
          title="Align center"
          aria-label="Align center"
          :disabled="isLoading || Boolean(errorText)"
          @click="applyFormat('justifyCenter')"
        >
          <font-awesome-icon :icon="['fas', 'align-center']" />
        </button>
        <button
          type="button"
          class="toolbar-btn"
          title="Align right"
          aria-label="Align right"
          :disabled="isLoading || Boolean(errorText)"
          @click="applyFormat('justifyRight')"
        >
          <font-awesome-icon :icon="['fas', 'align-right']" />
        </button>
        <button
          type="button"
          class="toolbar-btn"
          title="Justify"
          aria-label="Justify"
          :disabled="isLoading || Boolean(errorText)"
          @click="applyFormat('justifyFull')"
        >
          <font-awesome-icon :icon="['fas', 'align-justify']" />
        </button>
        <button
          type="button"
          class="toolbar-btn"
          title="Bulleted list"
          aria-label="Bulleted list"
          :disabled="isLoading || Boolean(errorText)"
          @click="applyFormat('insertUnorderedList')"
        >
          <font-awesome-icon :icon="['fas', 'list-ul']" />
        </button>
      </div>
      <div class="toolbar-actions transcription-toolbar-actions">
        <p v-if="isDirty && !isLoading" class="transcription-unsaved-hint" role="status">
          Unsaved changes
        </p>
        <p v-if="actionMessage" class="transcription-action-msg" role="status">{{ actionMessage }}</p>
        <button
          v-if="canSaveChanges"
          type="button"
          class="secondary-btn small transcription-btn-save"
          :disabled="saveInProgress"
          @click="handleSaveChanges"
        >
          {{ saveInProgress ? "Saving…" : "Save changes" }}
        </button>
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
          <h3 class="loading-title">{{ loadingMessage }}</h3>
          <div class="skeleton-line short" />
          <div class="skeleton-line" />
          <div class="skeleton-line medium" />
          <div class="skeleton-line short mt" />
          <div class="skeleton-line" />
          <div class="skeleton-line medium" />
        </template>
        <template v-else>
          <h2 class="transcription-note-title">{{ noteTitle }}</h2>
          <p
            v-if="autoSaveInProgress"
            class="auth-form-message auth-form-message--info"
            role="status"
          >
            Saving report…
          </p>
          <p v-if="saveErrorText" class="save-error" role="alert">{{ saveErrorText }}</p>

          <template v-if="errorText">
            <h4 class="transcription-section-heading">Report Error</h4>
            <p class="transcription-paragraph">{{ errorText }}</p>
          </template>
          <template v-else-if="reportBlocks.length">
            <section
              v-for="(block, index) in reportBlocks"
              :key="`${reportContentKey}-${index}`"
              class="transcription-note-section"
            >
              <h4 class="transcription-section-heading">{{ block.heading }}</h4>
              <div
                :ref="(el) => setBlockEditorRef(el, index)"
                class="transcription-paragraph report-block-editor"
                contenteditable="true"
                spellcheck="true"
                role="textbox"
                aria-multiline="true"
                :aria-label="`${block.heading} content`"
                @input="syncBlockHtml(index, $event)"
                @blur="syncBlockHtml(index, $event)"
              />
            </section>
            <footer class="ai-draft-disclaimer" role="note">
              <p class="ai-draft-disclaimer-title">⚠️ AI-Generated Draft</p>
              <p>
                This report was generated with assistance from TScribe AI and may contain errors
                or omissions.
              </p>
              <p>
                A qualified healthcare professional must review, verify, and approve this report
                before clinical use.
              </p>
              <p>The clinician remains responsible for the final report content.</p>
            </footer>
          </template>
          <template v-else>
            <p class="transcription-paragraph">No report content available yet.</p>
          </template>
        </template>
      </article>

      <aside v-if="!isLoading && insightSections.length" class="insight-panel">
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

.report-block-editor {
  min-height: 48px;
  outline: none;
  cursor: text;
}

.report-block-editor:focus {
  box-shadow: inset 0 0 0 2px rgba(37, 99, 235, 0.18);
  border-radius: 8px;
}

.save-error {
  color: #b42318;
  font-size: 0.9rem;
  margin: 0 0 12px;
}

.ai-draft-disclaimer {
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid #e5e7eb;
  font-size: 0.8rem;
  line-height: 1.5;
  color: #6b7280;
}

.ai-draft-disclaimer-title {
  font-weight: 600;
  color: #92400e;
  margin: 0 0 8px;
}

.ai-draft-disclaimer p {
  margin: 0 0 6px;
}

.transcription-unsaved-hint {
  margin: 0;
  font-size: 13px;
  color: #b45309;
  font-weight: 600;
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

.toolbar-btn:disabled,
.toolbar-select:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
</style>
