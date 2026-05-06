<script setup>
import { computed } from "vue";
import { useRoute } from "vue-router";
import AdminShell from "../components/AdminShell.vue";
import { adminClinicians, clinicianRecentReports } from "../data/adminClinicians";

const route = useRoute();

const clinician = computed(() => {
  const id = Number(route.params.clinicianId);
  return adminClinicians.find((item) => item.id === id) || adminClinicians[0];
});

const statusMeta = {
  active: { label: "ACTIVE", tone: "active" },
  suspended: { label: "SUSPENDED", tone: "suspended" },
  pending: { label: "PENDING", tone: "pending" },
  processing: { label: "Processing", tone: "processing" },
  completed: { label: "Completed", tone: "completed" },
  approved: { label: "Approved", tone: "approved" },
  rejected: { label: "Rejected", tone: "rejected" },
  "in-review": { label: "In Review", tone: "in-review" },
  "on-hold": { label: "On Hold", tone: "on-hold" },
};

function getMeta(status) {
  return statusMeta[status] || statusMeta.pending;
}
</script>

<template>
  <AdminShell
    title=""
    subtitle=""
    active-nav="User Management"
  >
    <section class="clinician-hero-card">
      <div class="clinician-hero-avatar">
        <font-awesome-icon :icon="['fas', 'user-doctor']" />
      </div>
      <div class="clinician-hero-main">
        <h2>{{ clinician.name }}</h2>
        <p class="clinician-role-line">
          <font-awesome-icon :icon="['fas', 'user-doctor']" />
          <span>{{ clinician.position }}</span>
        </p>
        <div class="clinician-hero-meta">
          <span :class="['detail-badge', getMeta(clinician.status).tone]">{{ getMeta(clinician.status).label }}</span>
          <small>Member since {{ clinician.joinedOn }}</small>
        </div>
      </div>
      <button type="button" class="admin-add-user-btn">Edit Profile</button>
    </section>

    <section class="clinician-detail-grid">
      <article class="clinician-account-card">
        <h3>Account Information</h3>
        <div class="clinician-info-list">
          <div>
            <span>Employee ID</span>
            <strong>{{ clinician.employeeId }}</strong>
          </div>
          <div>
            <span>Department</span>
            <strong>{{ clinician.department }}</strong>
          </div>
          <div>
            <span>Position</span>
            <strong>{{ clinician.position }}</strong>
          </div>
          <div>
            <span>Work Station</span>
            <strong>{{ clinician.workstation }}</strong>
          </div>
          <div>
            <span>Email Address</span>
            <strong>{{ clinician.email }}</strong>
          </div>
          <div>
            <span>Last Login</span>
            <strong>{{ clinician.lastLogin }}</strong>
          </div>
        </div>
        <button type="button" class="detail-danger-btn">
          <font-awesome-icon :icon="['fas', 'user-slash']" />
          Suspend Profile
        </button>
      </article>

      <div class="clinician-side-panel">
        <section class="clinician-kpi-grid">
          <article class="admin-user-metric-card">
            <span class="admin-metric-icon-wrap blue"><font-awesome-icon :icon="['fas', 'users']" /></span>
            <p>Total patients</p>
            <h3>{{ clinician.totalPatients }}</h3>
          </article>
          <article class="admin-user-metric-card">
            <span class="admin-metric-icon-wrap amber"><font-awesome-icon :icon="['fas', 'file-lines']" /></span>
            <p>Reports Generated</p>
            <h3>{{ clinician.reports }}</h3>
          </article>
        </section>

        <section class="table-wrap clinician-report-table">
          <table>
            <thead>
              <tr>
                <th>Case Title</th>
                <th>Session Type</th>
                <th>Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="report in clinicianRecentReports" :key="`${report.title}-${report.status}`">
                <td>{{ report.title }}</td>
                <td>{{ report.sessionType }}</td>
                <td>{{ report.date }}</td>
                <td>
                  <span :class="['detail-badge', getMeta(report.status).tone]">
                    {{ getMeta(report.status).label }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </section>
      </div>
    </section>
  </AdminShell>
</template>
