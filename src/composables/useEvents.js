import { onMounted, onUnmounted } from 'vue'

export const useEventListener = (target, event, handler) => {
  onMounted(() => {
    const eventTarget = typeof target === 'string' ? window : target
    eventTarget.addEventListener(event, handler)
  })

  onUnmounted(() => {
    const eventTarget = typeof target === 'string' ? window : target
    eventTarget.removeEventListener(event, handler)
  })
}

export const useKeyboard = (key, handler) => {
  const handleKeyPress = (e) => {
    if (e.key === key) {
      handler(e)
    }
  }

  useEventListener('keydown', handleKeyPress)
}

export const useClickOutside = (target, handler) => {
  const handleClickOutside = (e) => {
    if (target.value && !target.value.contains(e.target)) {
      handler(e)
    }
  }

  useEventListener(document, 'click', handleClickOutside)
}

export const useScroll = () => {
  const x = ref(0)
  const y = ref(0)

  const handleScroll = () => {
    x.value = window.scrollX
    y.value = window.scrollY
  }

  useEventListener(window, 'scroll', handleScroll)

  return {
    x: computed(() => x.value),
    y: computed(() => y.value),
  }
}

export const useWindowSize = () => {
  const width = ref(window.innerWidth)
  const height = ref(window.innerHeight)

  const handleResize = () => {
    width.value = window.innerWidth
    height.value = window.innerHeight
  }

  useEventListener(window, 'resize', handleResize)

  return {
    width: computed(() => width.value),
    height: computed(() => height.value),
  }
}

export const useMediaQuery = (query) => {
  const matches = ref(false)

  const mediaQuery = window.matchMedia(query)

  const handleChange = (e) => {
    matches.value = e.matches
  }

  onMounted(() => {
    matches.value = mediaQuery.matches
    mediaQuery.addEventListener('change', handleChange)
  })

  onUnmounted(() => {
    mediaQuery.removeEventListener('change', handleChange)
  })

  return computed(() => matches.value)
}

import { ref, computed } from 'vue'
