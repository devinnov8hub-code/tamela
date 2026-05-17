import { ref, computed } from 'vue'

export const useAsync = (asyncFn, immediate = true) => {
  const loading = ref(false)
  const error = ref(null)
  const data = ref(null)

  const execute = async (...args) => {
    loading.value = true
    error.value = null
    try {
      data.value = await asyncFn(...args)
      return data.value
    } catch (err) {
      error.value = err.message || 'An error occurred'
      throw err
    } finally {
      loading.value = false
    }
  }

  if (immediate) {
    execute()
  }

  return {
    loading,
    error,
    data,
    execute,
  }
}

export const useToggle = (initialValue = false) => {
  const state = ref(initialValue)

  const toggle = () => {
    state.value = !state.value
  }

  const set = (newValue) => {
    state.value = newValue
  }

  return {
    state: computed(() => state.value),
    toggle,
    set,
  }
}

export const useCount = (initialValue = 0) => {
  const count = ref(initialValue)

  const increment = () => count.value++
  const decrement = () => count.value--
  const reset = () => (count.value = initialValue)

  return {
    count: computed(() => count.value),
    increment,
    decrement,
    reset,
  }
}

export const usePagination = (items, pageSize = 10) => {
  const currentPage = ref(1)

  const totalPages = computed(() => Math.ceil((items?.length || 0) / pageSize))
  const startIndex = computed(() => (currentPage.value - 1) * pageSize)
  const endIndex = computed(() => Math.min(startIndex.value + pageSize, items?.length || 0))
  const paginatedItems = computed(() => items?.slice(startIndex.value, endIndex.value) || [])

  const goToPage = (page) => {
    currentPage.value = Math.max(1, Math.min(page, totalPages.value))
  }

  const nextPage = () => goToPage(currentPage.value + 1)
  const prevPage = () => goToPage(currentPage.value - 1)
  const reset = () => (currentPage.value = 1)

  return {
    currentPage: computed(() => currentPage.value),
    totalPages,
    paginatedItems,
    goToPage,
    nextPage,
    prevPage,
    reset,
    hasNextPage: computed(() => currentPage.value < totalPages.value),
    hasPrevPage: computed(() => currentPage.value > 1),
  }
}

export const useSearch = (items, searchFn) => {
  const searchQuery = ref('')

  const results = computed(() => {
    if (!searchQuery.value) return items
    return items?.filter((item) => searchFn(item, searchQuery.value)) || []
  })

  const clear = () => {
    searchQuery.value = ''
  }

  return {
    searchQuery: computed({
      get: () => searchQuery.value,
      set: (newVal) => (searchQuery.value = newVal),
    }),
    results,
    clear,
  }
}

export const useFilter = (items, filters = {}) => {
  const activeFilters = ref(filters)

  const filteredItems = computed(() => {
    return items?.filter((item) => {
      return Object.entries(activeFilters.value).every(([key, value]) => {
        if (!value) return true
        return item[key] === value
      })
    }) || []
  })

  const setFilter = (key, value) => {
    activeFilters.value[key] = value
  }

  const clearFilters = () => {
    activeFilters.value = {}
  }

  return {
    activeFilters: computed(() => activeFilters.value),
    filteredItems,
    setFilter,
    clearFilters,
  }
}

export const useLocalStorage = (key, initialValue = null) => {
  const value = ref(initialValue)

  const read = () => {
    try {
      const item = window.localStorage.getItem(key)
      if (item) {
        value.value = JSON.parse(item)
      }
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error)
    }
  }

  const write = () => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value.value))
    } catch (error) {
      console.error(`Error writing localStorage key "${key}":`, error)
    }
  }

  const remove = () => {
    try {
      window.localStorage.removeItem(key)
      value.value = initialValue
    } catch (error) {
      console.error(`Error removing localStorage key "${key}":`, error)
    }
  }

  read()

  return {
    value: computed({
      get: () => value.value,
      set: (newVal) => {
        value.value = newVal
        write()
      },
    }),
    read,
    write,
    remove,
  }
}
