<script setup>
import { computed } from "vue";
import { useQuery } from "@tanstack/vue-query";
import AppShell from "../components/AppShell.vue";
import { useAuth } from "../composables/useAuth.js";
import { fetchReportsForClinician } from "../services/reportService.js";
import { formatReportDate } from "../utils/formatDateTime.js";

const { displayName, hospitalId, user } = useAuth();

const {
  data: reportsData,
  isLoading,
  isError,
  error: loadError,
} = useQuery({
  queryKey: computed(() => ["clinician-dashboard-reports", hospitalId.value, user.value?.id]),
  enabled: computed(() => Boolean(hospitalId.value && user.value?.id)),
  queryFn: async () => {
    const { reports, error } = await fetchReportsForClinician(hospitalId.value, user.value.id);
    if (error) throw error;
    return reports;
  },
});

const reports = computed(() => reportsData.value ?? []);

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
      icon: "clock",
    },
    { label: "Completed Today", value: completedToday, color: "green", icon: "user-check" },
  ];
});

const rows = computed(() =>
  reports.value.map((row) => ({
    id: row.id,
    title: row.caseTitle,
    sessionType: row.sessionType,
    timestamp: formatReportDate(row.createdAt),
    status:
      row.status === "completed" ? "Completed" : row.status === "processing" ? "Processing" : "Draft",
    tone: row.status === "completed" ? "green" : row.status === "processing" ? "blue" : "amber",
  }))
);

const signedInUserName = computed(() => displayName.value);
</script>

<template>
  <AppShell
    title="Clinician Overview"
    subtitle="Real-time metrics and system health monitoring"
    active-nav="Dashboard"
  >
    <section class="welcome-row">
      <div>
        <h2>Welcome Back {{ signedInUserName }}.</h2>
        <p>Review of latest activity and report status.</p>
      </div>
      <button class="export-btn" type="button" disabled title="Coming soon">Export to CSV</button>
    </section>

    <section class="stats-grid">
      <article v-for="stat in stats" :key="stat.label" class="stat-card">
        <span :class="['stat-icon', stat.color]">
          <font-awesome-icon :icon="['fas', stat.icon]" />
        </span>
        <div>
          <p>{{ stat.label }}</p>
          <h3>{{ isLoading ? "…" : stat.value }}</h3>
        </div>
      </article>
    </section>

    <p v-if="isLoading" class="auth-form-message auth-form-message--info">Loading your reports…</p>
    <p v-else-if="isError" class="auth-form-message" role="alert">
      {{ loadError?.message || "Could not load reports." }}
    </p>

    <section v-else class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Case Title</th>
            <th>Session Type</th>
            <th>Timestamp</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="rows.length === 0">
            <td colspan="5">No reports yet.</td>
          </tr>
          <tr v-for="row in rows" :key="row.id">
            <td>{{ row.title }}</td>
            <td>{{ row.sessionType }}</td>
            <td>{{ row.timestamp }}</td>
            <td>
              <span :class="['status-badge', row.tone]">{{ row.status }}</span>
            </td>
            <td class="actions-cell">
              <button class="ghost-btn" type="button" title="Edit" disabled>
                <font-awesome-icon :icon="['fas', 'pen-to-square']" />
              </button>
              <button class="ghost-btn" type="button" title="Delete" disabled>
                <font-awesome-icon :icon="['fas', 'trash-can']" />
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </section>
  </AppShell>
</template>
