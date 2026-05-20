<script setup>
import AppShell from "../components/AppShell.vue";
import { useRouter } from "vue-router";

const router = useRouter();

function startRecording() {
  router.push("/clinician/recording/active");
}
</script>

<template>
  <AppShell
    title="New Consultation"
    subtitle="Record clinical observations"
    active-nav="Active Recording"
  >
    <section class="recording-headline">
      <h2>Start Recording</h2>
      <p>Press the button below to start recording the clinical encounter.</p>
    </section>

    <section class="single-recording-panel">
      <article class="recording-card">
        <button class="record-btn" aria-label="Start recording" @click="startRecording">
          <span class="mic-icon">◖</span>
          <span>START RECORDING</span>
        </button>
      </article>
    </section>
  </AppShell>
</template>
