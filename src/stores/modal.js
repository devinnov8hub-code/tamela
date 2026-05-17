import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useModalStore = defineStore('modal', () => {
  const modals = ref({})

  const openModal = (name, data = {}) => {
    modals.value[name] = {
      isOpen: true,
      data,
    }
  }

  const closeModal = (name) => {
    if (modals.value[name]) {
      modals.value[name].isOpen = false
    }
  }

  const closeAllModals = () => {
    Object.keys(modals.value).forEach((key) => {
      modals.value[key].isOpen = false
    })
  }

  const isModalOpen = (name) => {
    return modals.value[name]?.isOpen ?? false
  }

  const getModalData = (name) => {
    return modals.value[name]?.data ?? {}
  }

  return {
    modals,
    openModal,
    closeModal,
    closeAllModals,
    isModalOpen,
    getModalData,
  }
})
