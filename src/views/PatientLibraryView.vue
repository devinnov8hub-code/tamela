<script setup>
import AppShell from "../components/AppShell.vue";

const filters = [
  { key: "general", label: "General Medicine" },
  { key: "radiology", label: "Radiology" },
  { key: "er", label: "ER" },
];

const patients = [
  { initials: "EA", name: "Esther Ade", session: "General Medicine", date: "Feb 21, 2026", clinician: "Dr Chisom Odogwu", status: "Active", tone: "green", avatarTone: "violet" },
  { initials: "EA", name: "Esther Ade", session: "ER", date: "Feb 21, 2026", clinician: "RN, Maryam Saliu", status: "In Treatment", tone: "amber", avatarTone: "amber" },
  { initials: "EA", name: "Esther Ade", session: "Radiology", date: "Feb 21, 2026", clinician: "Dr Chisom Odogwu", status: "Active", tone: "green", avatarTone: "pink" },
  { initials: "EA", name: "Esther Ade", session: "General Medicine", date: "Feb 21, 2026", clinician: "Self", status: "In Treatment", tone: "amber", avatarTone: "lime" },
  { initials: "EA", name: "Esther Ade", session: "ER", date: "Feb 21, 2026", clinician: "Self", status: "In Treatment", tone: "amber", avatarTone: "pink" },
  { initials: "EA", name: "Esther Ade", session: "General Medicine", date: "Feb 21, 2026", clinician: "Dr Chisom Odogwu", status: "Active", tone: "green", avatarTone: "violet" },
  { initials: "EA", name: "Esther Ade", session: "ER", date: "Feb 21, 2026", clinician: "Self", status: "Active", tone: "green", avatarTone: "amber" },
  { initials: "EA", name: "Esther Ade", session: "Radiology", date: "Feb 21, 2026", clinician: "Self", status: "In Treatment", tone: "amber", avatarTone: "pink" },
  { initials: "EA", name: "Esther Ade", session: "General Medicine", date: "Feb 21, 2026", clinician: "Self", status: "Discharged", tone: "gray", avatarTone: "lime" },
  { initials: "EA", name: "Esther Ade", session: "General Medicine", date: "Feb 21, 2026", clinician: "Dr Chisom Odogwu", status: "Discharged", tone: "gray", avatarTone: "violet" },
];
</script>

<template>
  <AppShell
    title=""
    subtitle=""
    active-nav="Patient Library"
  >
    <section class="library-heading">
      <h2>Patient Library</h2>
      <p>Access, manage, and export your historical clinical documentation.</p>
    </section>

    <section class="library-toolbar">
      <div class="filter-pills">
        <button v-for="filter in filters" :key="filter.key" class="filter-pill">
          <span :class="['filter-icon', `icon-${filter.key}`]"></span>
          {{ filter.label }}
        </button>
      </div>
      <button class="export-btn">Export to CSV</button>
    </section>

    <section class="table-wrap library-table">
      <table>
        <thead>
          <tr>
            <th>Patient Name</th>
            <th>Session Type</th>
            <th>Last Visit</th>
            <th>Primary Clinician</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="patient in patients"
            :key="`${patient.name}-${patient.session}-${patient.clinician}`"
            class="clickable-row"
            @click="$router.push('/patients/details')"
          >
            <td>
              <div class="patient-name-cell">
                <span :class="['avatar', patient.avatarTone]">{{ patient.initials }}</span>
                <span>{{ patient.name }}</span>
              </div>
            </td>
            <td>{{ patient.session }}</td>
            <td>{{ patient.date }}</td>
            <td>{{ patient.clinician }}</td>
            <td><span :class="['status-badge', patient.tone]">{{ patient.status }}</span></td>
          </tr>
        </tbody>
      </table>
    </section>
  </AppShell>
</template>
