<script setup>
import { onMounted } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();

onMounted(() => {
  router.replace({ name: "auth-admin-register" });
});
</script>

<template>
  <p class="auth-form-message auth-form-message--info" role="status">Redirecting…</p>
</template>
