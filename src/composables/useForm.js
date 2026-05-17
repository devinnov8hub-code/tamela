import { ref, computed } from 'vue'

export const useForm = (initialValues = {}, onSubmit) => {
  const values = ref(initialValues)
  const errors = ref({})
  const touched = ref({})
  const isDirty = computed(() => {
    return JSON.stringify(values.value) !== JSON.stringify(initialValues)
  })

  const setFieldValue = (field, value) => {
    values.value[field] = value
  }

  const setFieldError = (field, error) => {
    errors.value[field] = error
  }

  const setFieldTouched = (field, isTouched = true) => {
    touched.value[field] = isTouched
  }

  const reset = () => {
    values.value = { ...initialValues }
    errors.value = {}
    touched.value = {}
  }

  const submit = async () => {
    if (onSubmit) {
      await onSubmit(values.value)
    }
  }

  return {
    values: computed(() => values.value),
    errors: computed(() => errors.value),
    touched: computed(() => touched.value),
    isDirty,
    setFieldValue,
    setFieldError,
    setFieldTouched,
    reset,
    submit,
  }
}

export const useValidation = (data, schema) => {
  const errors = ref({})

  const validate = async () => {
    try {
      await schema.parseAsync(data.value || data)
      errors.value = {}
      return true
    } catch (error) {
      errors.value = {}
      error.errors?.forEach((err) => {
        const field = err.path.join('.')
        errors.value[field] = err.message
      })
      return false
    }
  }

  const clearErrors = () => {
    errors.value = {}
  }

  const getFieldError = (field) => {
    return errors.value[field] || null
  }

  return {
    errors: computed(() => errors.value),
    validate,
    clearErrors,
    getFieldError,
  }
}
