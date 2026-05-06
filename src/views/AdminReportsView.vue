<script setup>
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import AdminShell from "../components/AdminShell.vue";
import { adminReports } from "../data/adminClinicians";

const router = useRouter();
const searchTerm = ref("");

const filteredReports = computed(() => {
  const query = searchTerm.value.trim().toLowerCase();
  if (!query) return adminReports;

  return adminReports.filter((report) =>
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
const activeNow = computed(() => filteredReports.value.filter((item) => item.status === "processing").length.toLocaleString());
const pendingInvites = computed(() => "42");

function statusLabel(status) {
  return status === "completed" ? "Completed" : "Processing";
}

function openClinician(report) {
  router.push({ name: "admin-clinician-detail", params: { clinicianId: String(report.clinicianId) } });
}

function openTranscription(report) {
  router.push({ name: "admin-report-transcription", params: { reportId: String(report.id) } });
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
    <section class="admin-user-metrics">
      <article class="admin-user-metric-card">
        <span class="admin-metric-icon-wrap blue"><font-awesome-icon :icon="['fas', 'file-lines']" /></span>
        <p>Total Reports</p>
        <h3>{{ totalReports }}</h3>
      </article>
      <article class="admin-user-metric-card">
        <span class="admin-metric-icon-wrap purple"><font-awesome-icon :icon="['fas', 'bell']" /></span>
        <p>Active Now</p>
        <h3>{{ activeNow }}</h3>
      </article>
      <article class="admin-user-metric-card">
        <span class="admin-metric-icon-wrap amber"><font-awesome-icon :icon="['fas', 'user-clock']" /></span>
        <p>Pending Invites</p>
        <h3>{{ pendingInvites }}</h3>
      </article>
    </section>

    <section class="table-wrap admin-reports-table-wrap">
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
          <tr v-for="report in filteredReports" :key="report.id" class="admin-user-row">
            <td>
              <div class="admin-clinician-cell">
                <span class="admin-clinician-avatar"><font-awesome-icon :icon="['fas', 'user-doctor']" /></span>
                <div>
                  <button type="button" class="table-link" @click="openClinician(report)">{{ report.clinicianName }}</button>
                  <small>{{ report.email }}</small>
                </div>
              </div>
            </td>
            <td>
              <button type="button" class="table-link" @click="openTranscription(report)">{{ report.caseTitle }}</button>
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
  </AdminShell>
</template>
