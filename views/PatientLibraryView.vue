<script setup>
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import { useQuery } from "@tanstack/vue-query";
import AppShell from "../components/AppShell.vue";
import { useAuth } from "../composables/useAuth.js";
import { fetchDepartmentsByHospital } from "../services/departmentService.js";
import { fetchReportsForClinician } from "../services/reportService.js";
import { formatReportDate } from "../utils/formatDateTime.js";

const router = useRouter();
const { displayName, hospitalId, user } = useAuth();
const activeFilter = ref("all");

const { data: reportsData, isLoading, isError, error: loadError } = useQuery({
  queryKey: computed(() => ["clinician-library-reports", hospitalId.value, user.value?.id]),
  enabled: computed(() => Boolean(hospitalId.value && user.value?.id)),
  queryFn: async () => {
    const { reports, error } = await fetchReportsForClinician(hospitalId.value, user.value.id);
    if (error) throw error;
    return reports;
  },
});

const { data: departmentsData } = useQuery({
  queryKey: computed(() => ["departments", hospitalId.value]),
  enabled: computed(() => Boolean(hospitalId.value)),
  queryFn: async () => {
    const { departments, error } = await fetchDepartmentsByHospital(hospitalId.value);
    if (error) throw error;
    return departments;
  },
});

const reports = computed(() => reportsData.value ?? []);

const filters = computed(() => {
  const base = [{ key: "all", label: "All cases" }];
  const fromDepartments = (departmentsData.value ?? []).map((dept) => ({
    key: dept.id,
    label: dept.name,
  }));
  return [...base, ...fromDepartments];
});

function reportStatusUi(status) {
  if (status === "completed") return { label: "Completed", tone: "green" };
  if (status === "processing") return { label: "Processing", tone: "amber" };
  return { label: "Draft", tone: "gray" };
}

function initialsFromTitle(title) {
  const parts = String(title).split(/\s+/).filter(Boolean);
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("") || "—";
}

const libraryRows = computed(() => {
  const list = reports.value;
  const filtered =
    activeFilter.value === "all"
      ? list
      : list.filter((row) => row.departmentId === activeFilter.value);

  return filtered.map((row, index) => {
    const status = reportStatusUi(row.status);
    return {
      id: row.id,
      initials: initialsFromTitle(row.caseTitle),
      name: row.caseTitle,
      session: row.sessionType || row.department,
      date: formatReportDate(row.createdAt),
      clinician: displayName.value,
      status: status.label,
      tone: status.tone,
      avatarTone: ["violet", "amber", "pink", "lime"][index % 4],
    };
  });
});

function openReport(row) {
  router.push({ name: "clinician-transcription", query: { reportId: row.id } });
}
</script>

<template>
  <AppShell title="Reports" subtitle="Your clinical cases and session reports" active-nav="Reports" :show-search="false">
    <section class="library-toolbar">
      <div class="filter-pills">
        <button
          v-for="filter in filters"
          :key="filter.key"
          type="button"
          class="filter-pill"
          :class="{ active: activeFilter === filter.key }"
          @click="activeFilter = filter.key"
        >
          <span :class="['filter-icon', filter.key === 'all' ? 'icon-general' : 'icon-radiology']"></span>
          {{ filter.label }}
        </button>
      </div>
      <button class="export-btn" type="button" disabled title="Coming soon">Export to CSV</button>
    </section>

    <p v-if="isLoading" class="auth-form-message auth-form-message--info">Loading cases…</p>
    <p v-else-if="isError" class="auth-form-message" role="alert">
      {{ loadError?.message || "Could not load cases." }}
    </p>

    <section v-else class="table-wrap library-table">
      <table>
        <thead>
          <tr>
            <th>Case</th>
            <th>Session Type</th>
            <th>Last Updated</th>
            <th>Clinician</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="libraryRows.length === 0">
            <td colspan="5">No cases found.</td>
          </tr>
          <tr
            v-for="row in libraryRows"
            :key="row.id"
            class="clickable-row"
            @click="openReport(row)"
          >
            <td>
              <div class="patient-name-cell">
                <span :class="['avatar', row.avatarTone]">{{ row.initials }}</span>
                <span>{{ row.name }}</span>
              </div>
            </td>
            <td>{{ row.session }}</td>
            <td>{{ row.date }}</td>
            <td>{{ row.clinician }}</td>
            <td><span :class="['status-badge', row.tone]">{{ row.status }}</span></td>
          </tr>
        </tbody>
      </table>
    </section>
  </AppShell>
</template>
