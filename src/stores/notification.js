import { defineStore } from 'pinia'
import { ref } from 'vue'
import { generateId } from '../utils/helpers'

export const useNotificationStore = defineStore('notification', () => {
  const notifications = ref([])

  const addNotification = (message, type = 'info', duration = 3000) => {
    const id = generateId()
    const notification = {
      id,
      message,
      type, // 'success', 'error', 'info', 'warning'
      duration,
    }

    notifications.value.push(notification)

    if (duration > 0) {
      setTimeout(() => {
        removeNotification(id)
      }, duration)
    }

    return id
  }

  const removeNotification = (id) => {
    const index = notifications.value.findIndex((n) => n.id === id)
    if (index > -1) {
      notifications.value.splice(index, 1)
    }
  }

  const success = (message, duration = 3000) => {
    return addNotification(message, 'success', duration)
  }

  const error = (message, duration = 4000) => {
    return addNotification(message, 'error', duration)
  }

  const info = (message, duration = 3000) => {
    return addNotification(message, 'info', duration)
  }

  const warning = (message, duration = 3000) => {
    return addNotification(message, 'warning', duration)
  }

  return {
    notifications,
    addNotification,
    removeNotification,
    success,
    error,
    info,
    warning,
  }
})
