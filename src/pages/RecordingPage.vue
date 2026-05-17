<template>
  <ClinicianLayout page-title="New Recording">
    <div class="max-w-2xl mx-auto">
      <Card>
        <div class="space-y-6">
          <!-- Recording Status -->
          <div class="text-center">
            <div
              v-if="!isRecording"
              class="w-20 h-20 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-4"
            >
              <font-awesome-icon icon="microphone" class="text-3xl text-primary" />
            </div>
            <div
              v-else
              class="w-20 h-20 mx-auto bg-red-500/10 rounded-full flex items-center justify-center mb-4 animate-pulse"
            >
              <font-awesome-icon icon="microphone" class="text-3xl text-red-500" />
            </div>
            <h2 class="text-2xl font-bold mb-2">
              {{ isRecording ? 'Recording in Progress' : 'Ready to Record' }}
            </h2>
            <p class="text-muted-foreground">
              {{ isRecording ? recordingTime : 'Click the button below to start recording' }}
            </p>
          </div>

          <!-- Waveform -->
          <div v-if="isRecording" class="bg-muted rounded p-4 h-20 flex items-center justify-center">
            <div class="flex items-center gap-1">
              <div
                v-for="i in 20"
                :key="i"
                class="bg-primary rounded"
                :style="{
                  height: `${Math.random() * 60 + 20}%`,
                  width: '4px',
                }"
              />
            </div>
          </div>

          <!-- Recording Controls -->
          <div class="flex items-center justify-center gap-4">
            <Button
              v-if="!isRecording"
              size="lg"
              @click="startRecording"
              :disabled="loading"
            >
              <font-awesome-icon icon="play" class="mr-2" />
              Start Recording
            </Button>
            <div v-else class="flex gap-2">
              <Button
                variant="outline"
                size="lg"
                @click="pauseRecording"
                :disabled="loading"
              >
                <font-awesome-icon icon="pause" class="mr-2" />
                Pause
              </Button>
              <Button
                variant="destructive"
                size="lg"
                @click="stopRecording"
                :disabled="loading"
              >
                <font-awesome-icon icon="square" class="mr-2" />
                Stop
              </Button>
            </div>
          </div>

          <!-- Volume Control -->
          <div class="space-y-2">
            <label class="text-sm font-medium">Microphone Volume: {{ volume }}%</label>
            <input
              type="range"
              v-model.number="volume"
              min="0"
              max="100"
              class="w-full"
            />
          </div>

          <!-- Notes -->
          <div>
            <label class="text-sm font-medium block mb-2">Initial Notes (Optional)</label>
            <Textarea
              v-model="initialNotes"
              placeholder="Add any initial notes about this recording..."
              :rows="4"
            />
          </div>
        </div>
      </Card>
    </div>
  </ClinicianLayout>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useNotificationStore } from '../stores/notification'
import ClinicianLayout from '../components/layout/ClinicianLayout.vue'
import Card from '../components/ui/Card.vue'
import Button from '../components/ui/Button.vue'
import Textarea from '../components/ui/Textarea.vue'
import { formatTime } from '../utils/helpers'
import { setPendingAudioForTranscription, clearScribeSession } from '../session/scribeSession'

const router = useRouter()
const notificationStore = useNotificationStore()

const isRecording = ref(false)
const recordingSeconds = ref(0)
const volume = ref(80)
const initialNotes = ref('')
const loading = ref(false)
let mediaRecorder = null
let audioChunks = []

const recordingTime = computed(() => formatTime(recordingSeconds.value))

const startRecording = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    mediaRecorder = new MediaRecorder(stream)
    audioChunks = []

    mediaRecorder.ondataavailable = (event) => {
      audioChunks.push(event.data)
    }

    mediaRecorder.onstop = () => {
      const audioBlob = new Blob(audioChunks, { type: 'audio/webm' })
      // Store the audio blob in an in-memory scribe session and navigate
      setPendingAudioForTranscription(audioBlob)
      // Also store initial notes temporarily (will be picked up by transcription page)
      sessionStorage.setItem('initialNotes', initialNotes.value)
      router.push('/recording/transcription')
    }

    mediaRecorder.start()
    isRecording.value = true
    recordingSeconds.value = 0

    // Update recording time
    const interval = setInterval(() => {
      recordingSeconds.value++
    }, 1000)

    // Store interval for cleanup
    mediaRecorder.intervalId = interval
  } catch (error) {
    notificationStore.error('Failed to access microphone')
  }
}

// Clear any stale scribe session on component mount
clearScribeSession()

const pauseRecording = () => {
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.pause()
    isRecording.value = false
  }
}

const stopRecording = () => {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    clearInterval(mediaRecorder.intervalId)
    mediaRecorder.stop()
    const tracks = mediaRecorder.stream.getTracks()
    tracks.forEach((track) => track.stop())
    isRecording.value = false
  }
}
</script>
