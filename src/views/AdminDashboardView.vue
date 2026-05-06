<script setup>
import { computed, ref } from "vue";
import AdminShell from "../components/AdminShell.vue";

const metrics = [
  {
    delta: "+5%",
    deltaTone: "up",
    title: "Total Recordings",
    value: "20,756",
    note: "Previous 30 days",
    iconTone: "blue",
    icon: "microphone",
  },
  {
    delta: "-3%",
    deltaTone: "down",
    title: "Avg Processing Time",
    value: "90s",
    note: "Target <60s",
    iconTone: "purple",
    icon: "bell",
  },
  {
    delta: "+5%",
    deltaTone: "up",
    title: "Active Users",
    value: "987",
    note: "Target >1000",
    iconTone: "amber",
    icon: "user-group",
  },
];

const users = [
  { initials: "EA", name: "DR. Esther Ade", role: "Cardiologist", activity: "Update Report", status: "Completed", tone: "green", time: "10 mins ago", avatar: "violet" },
  { initials: "EA", name: "RN. Esther Ade", role: "Registered Nurse", activity: "Prescribe Medications", status: "Processing", tone: "blue", time: "2 hours ago", avatar: "amber" },
];

const ranges = ["1D", "1M", "1Y", "Max"];
const selectedLineRange = ref("1D");

const chartDataByRange = {
  "1D": {
    bars: [
      { label: "Cardiology", value: 88 },
      { label: "Radiology", value: 46 },
      { label: "ER", value: 63 },
      { label: "Oncology", value: 74 },
    ],
    labels: ["08:00", "10:00", "12:00", "14:00", "16:00", "18:00"],
    radiology: [320, 410, 460, 580, 640, 720],
    er: [780, 650, 590, 620, 540, 470],
  },
  "1M": {
    bars: [
      { label: "Cardiology", value: 92 },
      { label: "Radiology", value: 58 },
      { label: "ER", value: 72 },
      { label: "Oncology", value: 80 },
    ],
    labels: ["Week 1", "Week 2", "Week 3", "Week 4", "Week 5", "Week 6"],
    radiology: [280, 390, 560, 610, 700, 760],
    er: [720, 540, 610, 670, 490, 360],
  },
  "1Y": {
    bars: [
      { label: "Cardiology", value: 82 },
      { label: "Radiology", value: 76 },
      { label: "ER", value: 69 },
      { label: "Oncology", value: 91 },
    ],
    labels: ["Jan", "Mar", "May", "Jul", "Sep", "Nov"],
    radiology: [350, 420, 500, 610, 740, 820],
    er: [810, 700, 620, 560, 490, 430],
  },
  Max: {
    bars: [
      { label: "Cardiology", value: 86 },
      { label: "Radiology", value: 79 },
      { label: "ER", value: 73 },
      { label: "Oncology", value: 95 },
    ],
    labels: ["2021", "2022", "2023", "2024", "2025", "2026"],
    radiology: [260, 360, 470, 620, 760, 860],
    er: [690, 620, 570, 510, 420, 340],
  },
};

const fallbackChart = chartDataByRange["1D"];
const activeBarChartData = computed(() => chartDataByRange["1D"] || fallbackChart);
const activeLineChartData = computed(() => chartDataByRange[selectedLineRange.value] || fallbackChart);
const bars = computed(() => activeBarChartData.value?.bars || []);

const yMin = 200;
const yMax = 1000;
const svgWidth = 520;
const svgHeight = 190;
const plotPadding = 14;

function toPolyline(values) {
  const spanX = svgWidth - plotPadding * 2;
  const spanY = svgHeight - plotPadding * 2;
  return values
    .map((value, index) => {
      const x = plotPadding + (index * spanX) / (values.length - 1 || 1);
      const normalized = Math.max(0, Math.min(1, (value - yMin) / (yMax - yMin)));
      const y = svgHeight - plotPadding - normalized * spanY;
      return `${x},${y}`;
    })
    .join(" ");
}

const radiologyPoints = computed(() => toPolyline(activeLineChartData.value?.radiology || []));
const erPoints = computed(() => toPolyline(activeLineChartData.value?.er || []));
const totalHours = computed(() => {
  const radiology = activeLineChartData.value?.radiology || [];
  const er = activeLineChartData.value?.er || [];
  const lastRadiology = radiology.length ? radiology[radiology.length - 1] : 0;
  const lastEr = er.length ? er[er.length - 1] : 0;
  return Math.round((lastRadiology + lastEr) / 1.35);
});
</script>

<template>
  <AdminShell
    title="Admin Overview"
    subtitle="Real-time metrics and system health monitoring"
    active-nav="Dashboard"
  >
    <section class="admin-metric-grid">
      <article v-for="item in metrics" :key="item.title" class="admin-metric-card">
        <span :class="['metric-delta', item.deltaTone]">{{ item.delta }}</span>
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
            <h3>Transcription Volume</h3>
            <p>Daily Department Processed Audio Files</p>
          </div>
          <span class="today-pill">Today</span>
        </div>
        <div class="bar-chart">
          <div v-for="bar in bars" :key="`today-${bar.label}`" class="bar-item">
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
            <h3>Department Usage Overview</h3>
            <p><strong>{{ totalHours }}</strong> HRS</p>
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
            <polyline class="line-poly purple" :points="radiologyPoints" />
            <polyline class="line-poly blue" :points="erPoints" />
          </svg>
          <div class="line-labels">
            <small v-for="label in activeLineChartData.labels" :key="label">{{ label }}</small>
          </div>
        </div>
        <div class="line-legend">
          <span><i class="dot purple"></i>Radiology</span>
          <span><i class="dot blue"></i>ER</span>
        </div>
      </article>
    </section>

    <section class="table-wrap admin-table">
      <table>
        <thead>
          <tr>
            <th>User</th>
            <th>Role</th>
            <th>Activity</th>
            <th>Status</th>
            <th>Time</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in users" :key="`${row.name}-${row.time}`">
            <td>
              <div class="patient-name-cell">
                <span :class="['avatar', row.avatar]">{{ row.initials }}</span>
                <span>{{ row.name }}</span>
              </div>
            </td>
            <td>{{ row.role }}</td>
            <td>{{ row.activity }}</td>
            <td><span :class="['status-badge', row.tone]">{{ row.status }}</span></td>
            <td>{{ row.time }}</td>
          </tr>
        </tbody>
      </table>
    </section>
  </AdminShell>
</template>
