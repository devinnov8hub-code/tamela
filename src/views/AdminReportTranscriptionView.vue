<script setup>
import { computed } from "vue";
import { useRoute } from "vue-router";
import AdminShell from "../components/AdminShell.vue";
import { adminReports } from "../data/adminClinicians";

const route = useRoute();

const report = computed(() => {
  const id = Number(route.params.reportId);
  return adminReports.find((item) => item.id === id) || adminReports[0];
});

const sections = [
  {
    title: "Clinical Impression",
    items: [
      "Condition: Acute Cholecystitis (K81.0)",
      "Certainty: High (Based on Murphy's Sign)",
    ],
  },
  {
    title: "Differential Diagnosis",
    items: ["Conditions: Biliary Colic, Pancreatitis, PUD", "Risk Level: Moderate"],
  },
  {
    title: "Diagnostic Plan",
    items: ["Orders: Abdominal Ultrasound, CBC", "Status: Pending / Urgent"],
  },
];
</script>

<template>
  <AdminShell
    title="Report Transcription"
    subtitle="Transcribed clinical observations"
    active-nav="Reports"
    search-value=""
  >
    <section class="editor-toolbar">
      <div class="toolbar-left">
        <button type="button" class="toolbar-btn">↶</button>
        <button type="button" class="toolbar-btn">↷</button>
        <span class="divider"></span>
        <span class="toolbar-label">Normal Text</span>
        <button type="button" class="toolbar-btn">B</button>
        <button type="button" class="toolbar-btn">I</button>
        <button type="button" class="toolbar-btn">U</button>
      </div>
      <div class="toolbar-actions">
        <button type="button" class="secondary-btn small">Smart Copy</button>
        <button type="button" class="export-btn small">Export ToPDF</button>
      </div>
    </section>

    <section class="transcription-layout">
      <article class="note-card">
        <h2>Clinical Consultation Note</h2>
        <p class="case-ref">Case Ref: {{ report.reportId }}-JHK-2023</p>

        <h4>Chief Complaint</h4>
        <p>
          Patient presents with recurring abdominal pain localized in the right upper quadrant,
          persisting for 3 days. Patient describes it as "sharp and intermittent."
        </p>

        <h4>History of Present Illness</h4>
        <p>
          45-year-old male with a history of mild hypertension. Reports that the current episode
          began after a heavy dinner on Tuesday. Pain radiates to the right scapula. Associated
          symptoms include mild nausea but no vomiting.
        </p>

        <h4>Physical Examination</h4>
        <ul>
          <li><strong>General:</strong> Alert and oriented x3, in moderate distress due to pain.</li>
          <li><strong>Vitals:</strong> BP 142/88, HR 92 bpm, Temp 98.6F, SpO2 99% on RA.</li>
          <li><strong>Abdomen:</strong> Positive Murphy's sign. Soft, but tender RUQ on deep palpation.</li>
        </ul>

        <h4>Impressions &amp; Recommendations</h4>
        <p>
          Primary suspicion is acute cholecystitis. Differential diagnosis includes biliary colic,
          peptic ulcer disease, and pancreatitis. Plan: Ordered abdominal ultrasound and CBC/LFTs.
        </p>
      </article>

      <aside class="insight-stack">
        <article v-for="section in sections" :key="section.title" class="insight-card">
          <h4>{{ section.title.toUpperCase() }}</h4>
          <p v-for="item in section.items" :key="item">{{ item }}</p>
        </article>
      </aside>
    </section>
  </AdminShell>
</template>
