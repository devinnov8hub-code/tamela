<script setup>
import { computed, ref } from "vue";
import { useQuery } from "@tanstack/vue-query";
import AdminShell from "../components/AdminShell.vue";
import { useAuth } from "../composables/useAuth.js";
import {
  fetchAdminDashboardStats,
  fetchRecentReportActivity,
  fetchReportCountsByDepartment,
  fetchReportTrendByMonth,
} from "../services/reportService.js";
import { formatRelativeTime } from "../utils/formatDateTime.js";

const { hospitalId } = useAuth();

const ranges = ["1M", "1Y"];
const selectedLineRange = ref("1M");

const { data: stats, isLoading: statsLoading } = useQuery({
  queryKey: computed(() => ["admin-dashboard-stats", hospitalId.value]),
  enabled: computed(() => Boolean(hospitalId.value)),
  queryFn: async () => {
    const { stats: row, error } = await fetchAdminDashboardStats(hospitalId.value);
    if (error) throw error;
    return row;
  },
});

const { data: departmentBars, isLoading: barsLoading } = useQuery({
  queryKey: computed(() => ["admin-dashboard-bars", hospitalId.value]),
  enabled: computed(() => Boolean(hospitalId.value)),
  queryFn: async () => {
    const { bars, error } = await fetchReportCountsByDepartment(hospitalId.value);
    if (error) throw error;
    return bars;
  },
});

const { data: trend1m } = useQuery({
  queryKey: computed(() => ["admin-dashboard-trend-1m", hospitalId.value]),
  enabled: computed(() => Boolean(hospitalId.value)),
  queryFn: async () => {
    const result = await fetchReportTrendByMonth(hospitalId.value, 6);
    if (result.error) throw result.error;
    return result;
  },
});

const { data: trend1y } = useQuery({
  queryKey: computed(() => ["admin-dashboard-trend-1y", hospitalId.value]),
  enabled: computed(() => Boolean(hospitalId.value)),
  queryFn: async () => {
    const result = await fetchReportTrendByMonth(hospitalId.value, 12);
    if (result.error) throw result.error;
    return result;
  },
});

const { data: activityRows, isLoading: activityLoading } = useQuery({
  queryKey: computed(() => ["admin-dashboard-activity", hospitalId.value]),
  enabled: computed(() => Boolean(hospitalId.value)),
  queryFn: async () => {
    const { activity, error } = await fetchRecentReportActivity(hospitalId.value, 8);
    if (error) throw error;
    return activity;
  },
});

const metrics = computed(() => {
  const s = stats.value;
  return [
    {
      delta: "",
      deltaTone: "up",
      title: "Total Reports",
      value: statsLoading.value ? "…" : (s?.totalReports ?? 0).toLocaleString(),
      note: "All time for your hospital",
      iconTone: "blue",
      icon: "file-lines",
    },
    {
      delta: "",
      deltaTone: "down",
      title: "Processing",
      value: statsLoading.value ? "…" : (s?.processingReports ?? 0).toLocaleString(),
      note: "Reports in progress",
      iconTone: "purple",
      icon: "clock",
    },
    {
      delta: "",
      deltaTone: "up",
      title: "Active Clinicians",
      value: statsLoading.value ? "…" : (s?.activeClinicians ?? 0).toLocaleString(),
      note: "Non-suspended accounts",
      iconTone: "amber",
      icon: "user-group",
    },
  ];
});

const bars = computed(() => departmentBars.value ?? []);

const activeLineChartData = computed(() => {
  if (selectedLineRange.value === "1Y") {
    return trend1y.value ?? { labels: [], series: [] };
  }
  return trend1m.value ?? { labels: [], series: [] };
});

const yMin = 0;
const yMax = computed(() => {
  const max = Math.max(...(activeLineChartData.value.series ?? []), 1);
  return Math.ceil(max * 1.2);
});

const svgWidth = 520;
const svgHeight = 190;
const plotPadding = 14;

function toPolyline(values) {
  const spanX = svgWidth - plotPadding * 2;
  const spanY = svgHeight - plotPadding * 2;
  const safe = values.length ? values : [0];
  return safe
    .map((value, index) => {
      const x = plotPadding + (index * spanX) / (safe.length - 1 || 1);
      const normalized = Math.max(0, Math.min(1, (value - yMin) / (yMax.value - yMin || 1)));
      const y = svgHeight - plotPadding - normalized * spanY;
      return `${x},${y}`;
    })
    .join(" ");
}

const trendPoints = computed(() => toPolyline(activeLineChartData.value.series ?? []));
const totalInRange = computed(() =>
  (activeLineChartData.value.series ?? []).reduce((sum, n) => sum + n, 0)
);

function activityStatusLabel(status) {
  if (status === "completed") return "Completed";
  if (status === "processing") return "Processing";
  return "Draft";
}

function activityStatusTone(status) {
  if (status === "completed") return "green";
  if (status === "processing") return "blue";
  return "amber";
}

function initialsFromName(name) {
  const parts = String(name).split(/\s+/).filter(Boolean);
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}
</script>

<template>
  <AdminShell
    title="Admin Overview"
    subtitle="Real-time metrics and system health monitoring"
    active-nav="Dashboard"
  >
    <p v-if="!hospitalId" class="auth-form-message" role="alert">Hospital context is missing.</p>

    <template v-else>
      <section class="admin-metric-grid">
        <article v-for="item in metrics" :key="item.title" class="admin-metric-card">
          <span v-if="item.delta" :class="['metric-delta', item.deltaTone]">{{ item.delta }}</span>
          <span :class="['metric-icon', item.iconTone]">
            <font-awesome-icon :icon="['fas', item.icon]" />
          </span>
          <p>{{ item.title }}</p>
          <h3>{{ item.value }}</h3>
          <small>{{ item.note }}</small>
        </article>
      </section>

      <section class="admin-analytics-grid">
        <article class="admin-chart-card">
          <div class="chart-head">
            <div>
              <h3>Reports by Department</h3>
              <p>Volume across hospital departments</p>
            </div>
            <span class="today-pill">Live</span>
          </div>
          <p v-if="barsLoading" class="auth-form-message auth-form-message--info">Loading chart…</p>
          <div v-else-if="bars.length === 0" class="auth-form-message auth-form-message--info">
            No reports yet to chart.
          </div>
          <div v-else class="bar-chart">
            <div v-for="bar in bars" :key="bar.label" class="bar-item">
              <div class="bar-plot">
                <span class="bar" :style="{ height: `${bar.value}%` }"></span>
              </div>
              <small>{{ bar.label }}</small>
            </div>
          </div>
        </article>

        <article class="admin-chart-card">
          <div class="chart-head">
            <div>
              <h3>Report Trend</h3>
              <p><strong>{{ totalInRange }}</strong> reports in range</p>
            </div>
            <div class="range-pills">
              <button
                v-for="range in ranges"
                :key="`line-${range}`"
                type="button"
                :class="{ active: range === selectedLineRange }"
                @click="selectedLineRange = range"
              >
                {{ range }}
              </button>
            </div>
          </div>
          <div class="line-chart">
            <svg viewBox="0 0 520 190" preserveAspectRatio="none" class="line-chart-svg">
              <polyline class="line-grid" points="14,30 506,30" />
              <polyline class="line-grid" points="14,70 506,70" />
              <polyline class="line-grid" points="14,110 506,110" />
              <polyline class="line-grid" points="14,150 506,150" />
              <polyline class="line-poly purple" :points="trendPoints" />
            </svg>
            <div class="line-labels">
              <small v-for="label in activeLineChartData.labels" :key="label">{{ label }}</small>
            </div>
          </div>
        </article>
      </section>

      <section class="table-wrap admin-table">
        <table>
          <thead>
            <tr>
              <th>User</th>
              <th>Department</th>
              <th>Activity</th>
              <th>Status</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="activityLoading">
              <td colspan="5">Loading recent activity…</td>
            </tr>
            <tr v-else-if="!(activityRows?.length)">
              <td colspan="5">No recent report activity.</td>
            </tr>
            <tr v-for="row in activityRows" :key="row.id">
              <td>
                <div class="patient-name-cell">
                  <span class="avatar violet">{{ initialsFromName(row.clinicianName) }}</span>
                  <span>{{ row.clinicianName }}</span>
                </div>
              </td>
              <td>{{ row.department }}</td>
              <td>{{ row.caseTitle }}</td>
              <td>
                <span :class="['status-badge', activityStatusTone(row.status)]">
                  {{ activityStatusLabel(row.status) }}
                </span>
              </td>
              <td>{{ formatRelativeTime(row.createdAt) }}</td>
            </tr>
          </tbody>
        </table>
      </section>
    </template>
  </AdminShell>
</template>
