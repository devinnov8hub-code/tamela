<script setup>
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import { useQuery } from "@tanstack/vue-query";
import AdminShell from "../components/AdminShell.vue";
import { useAuth } from "../composables/useAuth.js";
import { fetchReportsByHospital } from "../services/reportService.js";

const router = useRouter();
const { hospitalId } = useAuth();
const searchTerm = ref("");

const {
  data: reportsData,
  isLoading,
  isError,
  error: loadError,
} = useQuery({
  queryKey: computed(() => ["admin-reports", hospitalId.value]),
  enabled: computed(() => Boolean(hospitalId.value)),
  queryFn: async () => {
    const { reports, error } = await fetchReportsByHospital(hospitalId.value);
    if (error) throw error;
    return reports;
  },
});

const reports = computed(() => reportsData.value ?? []);

const filteredReports = computed(() => {
  const query = searchTerm.value.trim().toLowerCase();
  const list = reports.value;
  if (!query) return list;

  return list.filter((report) =>
    [
      report.clinicianName,
      report.email,
      report.caseTitle,
      report.reportId,
      report.department,
      report.status,
    ].some((field) => String(field).toLowerCase().includes(query))
  );
});

const totalReports = computed(() => filteredReports.value.length.toLocaleString());
const processingNow = computed(() =>
  filteredReports.value.filter((item) => item.status === "processing").length.toLocaleString()
);
const completedCount = computed(() =>
  filteredReports.value.filter((item) => item.status === "completed").length.toLocaleString()
);

function statusLabel(status) {
  if (status === "completed") return "Completed";
  if (status === "processing") return "Processing";
  return "Draft";
}

function openClinician(report) {
  router.push({ name: "admin-clinician-detail", params: { clinicianId: report.clinicianId } });
}

function openTranscription(report) {
  router.push({ name: "admin-report-transcription", params: { reportId: report.id } });
}
</script>

<template>
  <AdminShell
    title="Report Repository"
    subtitle=""
    active-nav="Reports"
    :search-value="searchTerm"
    @update:search-value="searchTerm = $event"
  >
    <p v-if="!hospitalId" class="auth-form-message" role="alert">Hospital context is missing.</p>

    <template v-else>
      <section class="admin-user-metrics">
        <article class="admin-user-metric-card">
          <span class="admin-metric-icon-wrap blue"><font-awesome-icon :icon="['fas', 'file-lines']" /></span>
          <p>Total Reports</p>
          <h3>{{ isLoading ? "…" : totalReports }}</h3>
        </article>
        <article class="admin-user-metric-card">
          <span class="admin-metric-icon-wrap purple"><font-awesome-icon :icon="['fas', 'bell']" /></span>
          <p>Processing</p>
          <h3>{{ isLoading ? "…" : processingNow }}</h3>
        </article>
        <article class="admin-user-metric-card">
          <span class="admin-metric-icon-wrap amber"><font-awesome-icon :icon="['fas', 'user-check']" /></span>
          <p>Completed</p>
          <h3>{{ isLoading ? "…" : completedCount }}</h3>
        </article>
      </section>

      <p v-if="isLoading" class="auth-form-message auth-form-message--info">Loading reports…</p>
      <p v-else-if="isError" class="auth-form-message" role="alert">
        {{ loadError?.message || "Could not load reports." }}
      </p>

      <section v-else class="table-wrap admin-reports-table-wrap">
        <table>
          <thead>
            <tr>
              <th>Clinician Name</th>
              <th>Case Title</th>
              <th>Report ID</th>
              <th>Department</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="filteredReports.length === 0">
              <td colspan="5">No reports found for this hospital.</td>
            </tr>
            <tr v-for="report in filteredReports" :key="report.id" class="admin-user-row">
              <td>
                <div class="admin-clinician-cell">
                  <span class="admin-clinician-avatar"><font-awesome-icon :icon="['fas', 'user-doctor']" /></span>
                  <div>
                    <button type="button" class="table-link" @click="openClinician(report)">
                      {{ report.clinicianName }}
                    </button>
                    <small>{{ report.email }}</small>
                  </div>
                </div>
              </td>
              <td>
                <button type="button" class="table-link" @click="openTranscription(report)">
                  {{ report.caseTitle }}
                </button>
              </td>
              <td>{{ report.reportId }}</td>
              <td>{{ report.department }}</td>
              <td>
                <span :class="['admin-pill', report.status === 'completed' ? 'active' : 'processing']">
                  {{ statusLabel(report.status) }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </section>
    </template>
  </AdminShell>
</template>
