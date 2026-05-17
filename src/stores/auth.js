import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '../services/supabase'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const session = ref(null)
  const loading = ref(false)
  const error = ref(null)
  const isAuthenticated = computed(() => !!user.value)
  const userRole = computed(() => user.value?.user_metadata?.role || 'clinician')

  const setUser = (newUser) => {
    user.value = newUser
  }

  const setSession = (newSession) => {
    session.value = newSession
  }

  const setLoading = (state) => {
    loading.value = state
  }

  const setError = (err) => {
    error.value = err
  }

  const clearError = () => {
    error.value = null
  }

  const signIn = async (email, password) => {
    loading.value = true
    error.value = null
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (signInError) throw signInError
      setUser(data.user)
      setSession(data.session)
      return data
    } catch (err) {
      error.value = err.message || 'Sign in failed'
      throw err
    } finally {
      loading.value = false
    }
  }

  const signUp = async (email, password, metadata = {}) => {
    loading.value = true
    error.value = null
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata,
        },
      })
      if (signUpError) throw signUpError
      return data
    } catch (err) {
      error.value = err.message || 'Sign up failed'
      throw err
    } finally {
      loading.value = false
    }
  }

  const signOut = async () => {
    loading.value = true
    error.value = null
    try {
      const { error: signOutError } = await supabase.auth.signOut()
      if (signOutError) throw signOutError
      setUser(null)
      setSession(null)
    } catch (err) {
      error.value = err.message || 'Sign out failed'
      throw err
    } finally {
      loading.value = false
    }
  }

  const resetPassword = async (email) => {
    loading.value = true
    error.value = null
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email)
      if (resetError) throw resetError
      return true
    } catch (err) {
      error.value = err.message || 'Password reset failed'
      throw err
    } finally {
      loading.value = false
    }
  }

  const updatePassword = async (newPassword) => {
    loading.value = true
    error.value = null
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      })
      if (updateError) throw updateError
      return true
    } catch (err) {
      error.value = err.message || 'Password update failed'
      throw err
    } finally {
      loading.value = false
    }
  }

  const updateUser = async (userData) => {
    loading.value = true
    error.value = null
    try {
      const { data, error: updateError } = await supabase.auth.updateUser(userData)
      if (updateError) throw updateError
      setUser(data.user)
      return data.user
    } catch (err) {
      error.value = err.message || 'User update failed'
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    user,
    session,
    loading,
    error,
    isAuthenticated,
    userRole,
    setUser,
    setSession,
    setLoading,
    setError,
    clearError,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    updateUser,
  }
})
