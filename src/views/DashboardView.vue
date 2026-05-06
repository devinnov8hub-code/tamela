<script setup>
import AppShell from "../components/AppShell.vue";

const stats = [
  { label: "Total Reports", value: 125, color: "blue", icon: "file-lines" },
  { label: "Processing", value: 7, color: "orange", icon: "clock" },
  { label: "Completed Today", value: 16, color: "green", icon: "user-check" },
];

const rows = [
  {
    title: "Medication Titration",
    sessionType: "General Consultation",
    timestamp: "9.30 Am Feb 21, 2026",
    status: "Processing",
    tone: "blue",
  },
  {
    title: "Acute Post-Operative Review",
    sessionType: "Cardiology Follow-up",
    timestamp: "1.30 Pm Feb 21, 2026",
    status: "Processing",
    tone: "blue",
  },
  {
    title: "Urgent Respiratory Evaluation",
    sessionType: "Neurology Intake",
    timestamp: "2.45 Pm Feb 21, 2026",
    status: "Completed",
    tone: "green",
  },
  {
    title: "Suspected Viral Infection",
    sessionType: "Dermatology Screen",
    timestamp: "3.15 Pm Feb 21, 2026",
    status: "Completed",
    tone: "green",
  },
  {
    title: "Diabetes Mellitus Type 2",
    sessionType: "Cardiology Consult",
    timestamp: "11.30 Am Feb 21, 2026",
    status: "Completed",
    tone: "green",
  },
  {
    title: "Telehealth",
    sessionType: "Psychiatry Evaluation",
    timestamp: "12.00 Pm Feb 21, 2026",
    status: "Processing",
    tone: "blue",
  },
  {
    title: "Chronic Pain Consultation",
    sessionType: "Endocrinology Follow-up",
    timestamp: "4.00 Pm Feb 21, 2026",
    status: "Processing",
    tone: "blue",
  },
  {
    title: "New Patient Physical",
    sessionType: "Gastroenterology Review",
    timestamp: "5.30 Pm Feb 21, 2026",
    status: "Completed",
    tone: "green",
  },
  {
    title: "Annual Wellness Examination",
    sessionType: "Orthopedic Assessment",
    timestamp: "6.15 Pm Feb 21, 2026",
    status: "Completed",
    tone: "green",
  },
  {
    title: "Prenatal Care: Second Trimester",
    sessionType: "Pulmonary Function Test",
    timestamp: "7.00 Pm Feb 21, 2026",
    status: "Processing",
    tone: "blue",
  },
];

</script>

<template>
  <AppShell
    title="Clinician Overview"
    subtitle="Real-time metrics and system health monitoring"
    active-nav="Dashboard"
  >
      <section class="welcome-row">
        <div>
          <h2>Welcome Back Dr Grace.</h2>
          <p>Review of latest activity and report status.</p>
        </div>
        <button class="export-btn">Export to CSV</button>
      </section>

      <section class="stats-grid">
        <article v-for="stat in stats" :key="stat.label" class="stat-card">
          <span :class="['stat-icon', stat.color]">
            <font-awesome-icon :icon="['fas', stat.icon]" />
          </span>
          <div>
            <p>{{ stat.label }}</p>
            <h3>{{ stat.value }}</h3>
          </div>
        </article>
      </section>

      <section class="table-wrap">
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
            <tr v-for="row in rows" :key="`${row.title}-${row.timestamp}`">
              <td>{{ row.title }}</td>
              <td>{{ row.sessionType }}</td>
              <td>{{ row.timestamp }}</td>
              <td>
                <span :class="['status-badge', row.tone]">{{ row.status }}</span>
              </td>
              <td class="actions-cell">
                <button class="ghost-btn" title="Edit"><font-awesome-icon :icon="['fas', 'pen-to-square']" /></button>
                <button class="ghost-btn" title="Delete"><font-awesome-icon :icon="['fas', 'trash-can']" /></button>
              </td>
            </tr>
          </tbody>
        </table>
      </section>
  </AppShell>
</template>
