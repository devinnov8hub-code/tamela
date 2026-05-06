<script setup>
import AppShell from "../components/AppShell.vue";

const allergies = ["Penicillin(Severe)", "Penicillin(Severe)", "Penicillin(Severe)"];
</script>

<template>
  <AppShell title="" subtitle="" active-nav="Patient Library">
    <section class="patient-profile-card">
      <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=220&h=220&fit=crop" alt="Patient profile" />

      <div class="patient-profile-main">
        <h2>Kofi Woods</h2>
        <p>35 Years Old | Female | Type O+</p>
        <p>Abuja, Nigeria &nbsp;&nbsp; +234 90 2345 6789</p>
        <p>kofiwoods@gmail.com</p>
      </div>

      <button class="export-btn start-record-btn">Start New Recording</button>
    </section>

    <section class="patient-detail-grid">
      <article class="detail-panel">
        <div class="panel-head">
          <h3>Active Medical Summary</h3>
          <button class="copy-btn">Copy</button>
        </div>

        <h4>Chronic Conditions</h4>
        <div class="condition-grid">
          <div class="condition-card">
            <strong>Hypertension</strong>
            <span>Diagnosed in 2019 - Managed</span>
          </div>
          <div class="condition-card">
            <strong>Type 2 Diabetes</strong>
            <span>Pre-diabetic range - Controlled</span>
          </div>
        </div>

        <h4>Allergies & reactions</h4>
        <div class="allergy-list">
          <span v-for="item in allergies" :key="item" class="allergy-pill">{{ item }}</span>
        </div>
      </article>

      <article class="detail-panel history">
        <div class="panel-head">
          <h3>Medical History</h3>
          <button class="copy-btn">Copy</button>
        </div>
      </article>

      <article class="emergency-card">
        <div class="panel-head">
          <h3>Emergency Contact</h3>
          <span class="muted">Spouse</span>
        </div>
        <p>Daniel Woods</p>
        <p>+233 78 1234 5678</p>
        <p>danielwoods@gmail.com</p>
      </article>
    </section>
  </AppShell>
</template>
