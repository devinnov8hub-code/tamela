<script setup>
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import { useQuery, useQueryClient } from "@tanstack/vue-query";
import AppShell from "../components/AppShell.vue";
import { useAuth } from "../composables/useAuth.js";
import {
  deleteReportById,
  fetchReportsForClinician,
} from "../services/reportService.js";
import { formatClinicianReportTimestamp } from "../utils/formatDateTime.js";

const router = useRouter();
const queryClient = useQueryClient();
const { displayName, hospitalId, user } = useAuth();

const searchQuery = ref("");
const editTarget = ref(null);
const deleteTarget = ref(null);
const deleteInProgress = ref(false);
const deleteError = ref("");

const { data: reportsData, isLoading, isError, error: loadError } = useQuery({
  queryKey: computed(() => ["clinician-library-reports", hospitalId.value, user.value?.id]),
  enabled: computed(() => Boolean(hospitalId.value && user.value?.id)),
  queryFn: async () => {
    const { reports, error } = await fetchReportsForClinician(hospitalId.value, user.value.id);
    if (error) throw error;
    return reports;
  },
});

const reports = computed(() => reportsData.value ?? []);

const welcomeName = computed(() => {
  const name = displayName.value?.trim() || "Clinician";
  const first = name.split(/\s+/)[0];
  return first.endsWith(".") ? first : `${first}.`;
});

const stats = computed(() => {
  const list = reports.value;
  const today = new Date();
  const completedToday = list.filter((row) => {
    if (row.rawStatus !== "COMPLETED" || !row.createdAt) return false;
    const created = new Date(row.createdAt);
    return (
      created.getFullYear() === today.getFullYear() &&
      created.getMonth() === today.getMonth() &&
      created.getDate() === today.getDate()
    );
  }).length;

  return [
    { label: "Total Reports", value: list.length, color: "blue", icon: "file-lines" },
    {
      label: "Processing",
      value: list.filter((row) => row.status === "processing").length,
      color: "orange",
      icon: "gears",
    },
    { label: "Completed Today", value: completedToday, color: "green", icon: "circle-check" },
  ];
});

function statusLabel(status) {
  if (status === "completed") return "Completed";
  if (status === "processing") return "Processing";
  return "Draft";
}

const tableRows = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  return reports.value
    .filter((row) => {
      if (!q) return true;
      const haystack = [
        row.caseTitle,
        row.sessionType,
        row.department,
        statusLabel(row.status),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    })
    .map((row) => ({
      id: row.id,
      caseTitle: row.caseTitle || "—",
      sessionType: row.sessionType || "—",
      timestamp: formatClinicianReportTimestamp(row.createdAt),
      status: row.status,
      statusLabel: statusLabel(row.status),
    }));
});

function openEditModal(row) {
  editTarget.value = row;
}

function closeEditModal() {
  editTarget.value = null;
}

function openDeleteModal(row) {
  deleteError.value = "";
  deleteTarget.value = row;
}

function closeDeleteModal() {
  if (deleteInProgress.value) return;
  deleteTarget.value = null;
  deleteError.value = "";
}

function confirmOpenReport() {
  if (!editTarget.value) return;
  router.push({ name: "clinician-report", query: { reportId: editTarget.value.id } });
  closeEditModal();
}

async function confirmDeleteReport() {
  const target = deleteTarget.value;
  const hid = hospitalId.value;
  const uid = user.value?.id;
  if (!target || !hid || !uid) return;

  deleteInProgress.value = true;
  deleteError.value = "";

  try {
    const { error } = await deleteReportById(hid, target.id, uid);
    if (error) throw error;

    await queryClient.invalidateQueries({
      queryKey: ["clinician-library-reports", hid, uid],
    });
    await queryClient.invalidateQueries({
      queryKey: ["clinician-dashboard-reports", hid, uid],
    });
    closeDeleteModal();
  } catch (err) {
    deleteError.value = err instanceof Error ? err.message : "Could not delete report.";
  } finally {
    deleteInProgress.value = false;
  }
}

function exportToCsv() {
  const rows = tableRows.value;
  if (!rows.length) return;

  const escape = (value) => `"${String(value).replace(/"/g, '""')}"`;
  const lines = [
    ["Case Title", "Session Type", "Timestamp", "Status"].map(escape).join(","),
    ...rows.map((row) =>
      [row.caseTitle, row.sessionType, row.timestamp, row.statusLabel].map(escape).join(",")
    ),
  ];

  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `reports-${new Date().toISOString().slice(0, 10)}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}
</script>

<template>
  <AppShell
    v-model:search-value="searchQuery"
    title="Clinician Overview"
    subtitle="Real-time metrics and system health monitoring"
    active-nav="Reports"
    search-placeholder="Search by case title, session type, or status"
    wide-search
  >
    <section class="welcome-row clinician-reports-welcome">
      <div>
        <h2>Welcome {{ welcomeName }}</h2>
        <p>Review of latest activity and report status.</p>
      </div>
      <button class="export-btn" type="button" :disabled="!tableRows.length" @click="exportToCsv">
        Export to CSV
      </button>
    </section>

    <section class="stats-grid clinician-reports-stats">
      <article v-for="stat in stats" :key="stat.label" class="stat-card">
        <span :class="['stat-icon', stat.color]">
          <font-awesome-icon :icon="['fas', stat.icon]" />
        </span>
        <div>
          <p>{{ stat.label }}</p>
          <h3>{{ isLoading ? "…" : stat.value.toLocaleString() }}</h3>
        </div>
      </article>
    </section>

    <p v-if="isLoading" class="auth-form-message auth-form-message--info">Loading reports…</p>
    <p v-else-if="isError" class="auth-form-message" role="alert">
      {{ loadError?.message || "Could not load reports." }}
    </p>

    <section v-else class="table-wrap clinician-reports-table">
      <table>
        <thead>
          <tr>
            <th>Case Title</th>
            <th>Session Type</th>
            <th>Timestamp</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="tableRows.length === 0">
            <td colspan="4" class="clinician-reports-empty">No reports found.</td>
          </tr>
          <tr v-for="row in tableRows" :key="row.id">
            <td class="col-case-title">{{ row.caseTitle }}</td>
            <td class="col-session">{{ row.sessionType }}</td>
            <td class="col-timestamp">{{ row.timestamp }}</td>
            <td class="actions-cell">
              <button
                type="button"
                class="report-action-btn"
                title="Edit report"
                aria-label="Edit report"
                @click="openEditModal(row)"
              >
                <font-awesome-icon :icon="['fas', 'pen-to-square']" />
              </button>
              <button
                type="button"
                class="report-action-btn report-action-btn--danger"
                title="Delete report"
                aria-label="Delete report"
                @click="openDeleteModal(row)"
              >
                <font-awesome-icon :icon="['fas', 'trash-can']" />
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </section>

    <!-- Edit popup -->
    <div v-if="editTarget" class="admin-modal-backdrop" @click.self="closeEditModal">
      <div class="admin-modal-card clinician-report-modal" role="dialog" aria-labelledby="edit-report-title">
        <div class="admin-modal-head">
          <span class="admin-modal-chip">
            <font-awesome-icon :icon="['fas', 'pen-to-square']" />
          </span>
          <h3 id="edit-report-title">Edit report</h3>
        </div>
        <p class="clinician-report-modal-lead">
          <strong>{{ editTarget.caseTitle }}</strong>
        </p>
        <p class="clinician-report-modal-meta">
          {{ editTarget.sessionType }} · {{ editTarget.timestamp }}
        </p>
        <p>Open this report to review or update the transcription and clinical note.</p>
        <div class="admin-modal-actions">
          <button type="button" class="admin-modal-btn ghost" @click="closeEditModal">Cancel</button>
          <button type="button" class="admin-modal-btn create" @click="confirmOpenReport">
            Open report
          </button>
        </div>
      </div>
    </div>

    <!-- Delete popup -->
    <div v-if="deleteTarget" class="admin-modal-backdrop" @click.self="closeDeleteModal">
      <div class="admin-modal-card clinician-report-modal" role="dialog" aria-labelledby="delete-report-title">
        <div class="admin-modal-head">
          <span class="admin-modal-chip clinician-report-modal-chip--danger">
            <font-awesome-icon :icon="['fas', 'trash-can']" />
          </span>
          <h3 id="delete-report-title">Delete report</h3>
        </div>
        <p class="clinician-report-modal-lead">
          Remove <strong>{{ deleteTarget.caseTitle }}</strong>?
        </p>
        <p>This permanently deletes the report and its transcription. This cannot be undone.</p>
        <p v-if="deleteError" class="save-error" role="alert">{{ deleteError }}</p>
        <div class="admin-modal-actions">
          <button
            type="button"
            class="admin-modal-btn ghost"
            :disabled="deleteInProgress"
            @click="closeDeleteModal"
          >
            Cancel
          </button>
          <button
            type="button"
            class="admin-modal-btn clinician-modal-btn-danger"
            :disabled="deleteInProgress"
            @click="confirmDeleteReport"
          >
            {{ deleteInProgress ? "Deleting…" : "Delete" }}
          </button>
        </div>
      </div>
    </div>
  </AppShell>
</template>

<style scoped>
.clinician-report-modal h3 {
  margin: 0;
  font-size: 20px;
  color: #1e293b;
}

.clinician-report-modal-lead {
  margin: 0 0 6px;
  font-size: 15px;
  color: #334155;
}

.clinician-report-modal-meta {
  margin: 0 0 12px;
  font-size: 13px;
  color: #64748b;
}

.clinician-report-modal p:not(.clinician-report-modal-lead):not(.clinician-report-modal-meta):not(.save-error) {
  margin: 0 0 16px;
  font-size: 14px;
  color: #64748b;
  line-height: 1.5;
}

.clinician-report-modal-chip--danger {
  background: #fee2e2;
  color: #dc2626;
}

.clinician-modal-btn-danger {
  background: #ef4444;
  color: #fff;
}

.clinician-modal-btn-danger:hover:not(:disabled) {
  background: #dc2626;
}

.save-error {
  color: #b42318;
  font-size: 14px;
}
</style>
