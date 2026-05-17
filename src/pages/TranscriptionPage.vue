<template>
  <ClinicianLayout page-title="Transcription">
    <div class="max-w-4xl mx-auto space-y-6">
      <!-- Header -->
      <div>
        <h2 class="text-2xl font-bold">Transcription</h2>
        <p class="text-muted-foreground">Review and edit your transcription</p>
      </div>

      <!-- Audio Player -->
      <Card>
        <div class="space-y-4">
          <h3 class="font-semibold">Audio Playback</h3>
          <audio
            v-if="audioUrl"
            controls
            :src="audioUrl"
            class="w-full"
          />
          <div v-else class="text-center py-8 text-muted-foreground">
            No audio available
          </div>
        </div>
      </Card>

      <!-- AI Processing -->
      <Card>
        <div class="space-y-4">
          <h3 class="font-semibold">AI Processing</h3>
          <div v-if="isProcessing" class="flex items-center justify-center py-8">
            <div class="text-center">
              <font-awesome-icon icon="spinner" class="text-2xl text-primary animate-spin mb-4" />
              <p>Processing transcription...</p>
              <div class="mt-4">
                <Button variant="outline" @click="abortProcessing">Cancel</Button>
              </div>
            </div>
          </div>
          <div v-else>
            <div class="grid grid-cols-2 gap-4 mb-4">
              <Input
                v-model="form.caseTitle"
                label="Case Title"
                placeholder="e.g., Patient Follow-up Visit"
              />
              <Select
                v-model="form.sessionType"
                label="Session Type"
                :options="sessionTypeOptions"
              />
            </div>
          </div>
        </div>
      </Card>

      <!-- Transcription Editor -->
      <Card>
        <div class="space-y-4">
          <h3 class="font-semibold">Transcription</h3>
          <Textarea
            v-model="form.transcription"
            placeholder="Your transcription will appear here..."
            :rows="10"
          />
        </div>
      </Card>

      <!-- Actions -->
      <div class="flex gap-2 justify-end">
        <Button variant="outline" @click="cancel" :disabled="isProcessing || loading">Cancel</Button>
        <Button @click="save" :loading="loading || isProcessing" :disabled="isProcessing || loading">Save Report</Button>
      </div>
    </div>
  </ClinicianLayout>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useNotificationStore } from '../stores/notification'
import { useAuthStore } from '../stores/auth'
import ClinicianLayout from '../components/layout/ClinicianLayout.vue'
import Card from '../components/ui/Card.vue'
import Input from '../components/ui/Input.vue'
import Select from '../components/ui/Select.vue'
import Button from '../components/ui/Button.vue'
import Textarea from '../components/ui/Textarea.vue'
import { SESSION_TYPES } from '../constants'
import { reportService } from '../services/reports'
import { takePendingAudioForTranscription, clearScribeSession, peekPendingAudioForTranscription } from '../session/scribeSession'
import { transcribeAudio, extractTranscriptionText, suggestMetadata, fetchMetadataFromServer } from '../services/scribeApi'

const router = useRouter()
const notificationStore = useNotificationStore()
const authStore = useAuthStore()

const audioUrl = ref('')
const isProcessing = ref(false)
const loading = ref(false)
const abortController = ref(null)

const form = ref({
  caseTitle: '',
  sessionType: '',
  transcription: '',
})

const sessionTypeOptions = SESSION_TYPES

const processTranscription = async (audioBlob = null) => {
  isProcessing.value = true
  try {
    const pending = audioBlob || peekPendingAudioForTranscription()
    abortController.value = new AbortController()
    const signal = abortController.value.signal

    if (pending) {
      // Use real scribe API with abort support
      const result = await transcribeAudio(pending, { signal })
      const text = extractTranscriptionText(result)
      form.value.transcription = text || ''

      // Try server-side metadata extraction first (higher quality)
      try {
        const meta = await fetchMetadataFromServer(form.value.transcription, { signal })
        if (meta?.case_title && !form.value.caseTitle) form.value.caseTitle = meta.case_title
        if (meta?.session_type && !form.value.sessionType) form.value.sessionType = meta.session_type
      } catch (metaErr) {
        // Fallback to client-side suggestion if server extraction fails
        const suggestions = suggestMetadata(form.value.transcription, { sessionTypeOptions })
        if (suggestions.case_title && !form.value.caseTitle) form.value.caseTitle = suggestions.case_title
        if (suggestions.session_type && !form.value.sessionType) form.value.sessionType = suggestions.session_type
      }

      notificationStore.success('Transcription processed successfully')
      // clear pending audio
      clearScribeSession()
    } else {
      // Fallback simulated transcription
      await new Promise((resolve) => setTimeout(resolve, 1200))
      form.value.transcription = 'Patient presents with complaints of...'
      const suggestions = suggestMetadata(form.value.transcription, { sessionTypeOptions })
      if (suggestions.case_title && !form.value.caseTitle) form.value.caseTitle = suggestions.case_title
      if (suggestions.session_type && !form.value.sessionType) form.value.sessionType = suggestions.session_type
      notificationStore.success('Transcription processed (simulated)')
    }
  } catch (error) {
    if (error?.name === 'AbortError') {
      // Show persistent, dismissible toast for aborts
      notificationStore.error('Transcription aborted', 0)
    } else {
      notificationStore.error('Failed to process transcription')
    }
  } finally {
    isProcessing.value = false
    abortController.value = null
  }
}

const save = async () => {
  if (!form.value.caseTitle || !form.value.sessionType || !form.value.transcription) {
    notificationStore.error('Please fill in all fields')
    return
  }

  loading.value = true
  try {
    await reportService.create({
      case_title: form.value.caseTitle,
      session_type: form.value.sessionType,
      transcription: form.value.transcription,
      clinician_id: authStore.user.id,
      status: 'completed',
    })
    notificationStore.success('Report saved successfully')
    router.push('/reports')
  } catch (error) {
    notificationStore.error('Failed to save report')
  } finally {
    loading.value = false
  }
}

const cancel = () => {
  if (confirm('Discard this transcription?')) {
    router.push('/dashboard')
  }
}

const abortProcessing = () => {
  if (abortController.value) {
    try {
      abortController.value.abort()
    } catch {}
  }
}

onMounted(() => {
  // Load audio from in-memory scribe session (preferred)
  const audioBlob = takePendingAudioForTranscription()
  if (audioBlob) {
    audioUrl.value = URL.createObjectURL(audioBlob)
    // Load initial notes
    const notes = sessionStorage.getItem('initialNotes')
    if (notes) form.value.transcription = notes
    // Process transcription using scribe API
    processTranscription(audioBlob)
    return
  }

  // Fallback: load initial notes only
  const notes = sessionStorage.getItem('initialNotes')
  if (notes) form.value.transcription = notes
  // No audio available: do nothing
})

onUnmounted(() => {
  // Revoke audio URL to avoid memory leaks
  if (audioUrl.value) {
    try {
      URL.revokeObjectURL(audioUrl.value)
    } catch {}
    audioUrl.value = ''
  }

  // Abort any in-flight transcription
  if (abortController.value) {
    try {
      abortController.value.abort()
    } catch {}
    abortController.value = null
  }
})
</script>
