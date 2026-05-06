<script setup>
import { reactive, ref } from "vue";
import AdminShell from "../components/AdminShell.vue";

const searchTerm = ref("");

const securityForm = reactive({
  currentPassword: "..........",
  newPassword: "",
  confirmNewPassword: "",
});

const identityForm = reactive({
  legalName: "St. Catherine's Medical Center",
  departmentIdentifier: "",
});
</script>

<template>
  <AdminShell
    title="Admin Settings"
    subtitle=""
    active-nav="Settings"
    :search-value="searchTerm"
    @update:search-value="searchTerm = $event"
  >
    <section class="admin-settings-stack">
      <article class="admin-settings-card">
        <header class="admin-settings-head">
          <h3><font-awesome-icon :icon="['fas', 'user-gear']" /> Security &amp; Account</h3>
        </header>
        <div class="admin-settings-body">
          <div class="admin-settings-grid">
            <label>
              Current Password
              <input v-model="securityForm.currentPassword" type="password" />
            </label>
            <span></span>
            <label>
              New Password
              <input v-model="securityForm.newPassword" type="password" placeholder="Enter New Password" />
            </label>
            <label>
              Confirm New Password
              <input v-model="securityForm.confirmNewPassword" type="password" placeholder="Repeat New Password" />
            </label>
          </div>
          <div class="admin-settings-actions">
            <button type="button" class="admin-settings-btn">Update Password</button>
          </div>
        </div>
      </article>

      <article class="admin-settings-card">
        <header class="admin-settings-head">
          <h3><font-awesome-icon :icon="['fas', 'file-lines']" /> Hospital Identity</h3>
        </header>
        <div class="admin-settings-body">
          <div class="admin-identity-grid">
            <div>
              <label>Confirm New Password</label>
              <div class="admin-logo-upload">
                <font-awesome-icon :icon="['fas', 'plus']" />
                <strong>UPLOAD LOGO</strong>
              </div>
              <small>PNG or JPG. Max 2MB</small>
            </div>
            <div class="admin-identity-fields">
              <label>
                Hospital Legal Name
                <input v-model="identityForm.legalName" type="text" />
              </label>
              <label>
                Department Identifier
                <input v-model="identityForm.departmentIdentifier" type="text" placeholder="e.g. Radiology, Cardiology, ER" />
              </label>
            </div>
          </div>
          <div class="admin-settings-actions">
            <button type="button" class="admin-settings-btn">Save Changes</button>
          </div>
        </div>
      </article>
    </section>
  </AdminShell>
</template>
