export const vClickOutside = {
  mounted(el, binding) {
    el.clickOutsideEvent = (event) => {
      if (!(el === event.target || el.contains(event.target))) {
        binding.value(event)
      }
    }
    document.addEventListener('click', el.clickOutsideEvent)
  },
  unmounted(el) {
    document.removeEventListener('click', el.clickOutsideEvent)
  },
}

export const vFocus = {
  mounted(el) {
    el.focus()
  },
}

export const vLoading = {
  updated(el, binding) {
    if (binding.value) {
      el.style.pointerEvents = 'none'
      el.style.opacity = '0.6'
    } else {
      el.style.pointerEvents = 'auto'
      el.style.opacity = '1'
    }
  },
}

export const vDebounce = {
  mounted(el, binding) {
    let timeout
    el.addEventListener('input', (e) => {
      clearTimeout(timeout)
      timeout = setTimeout(() => {
        binding.value(e)
      }, binding.arg || 300)
    })
  },
}

export const vCopy = {
  mounted(el, binding) {
    el.addEventListener('click', () => {
      navigator.clipboard.writeText(binding.value)
      const originalText = el.innerText
      el.innerText = 'Copied!'
      setTimeout(() => {
        el.innerText = originalText
      }, 2000)
    })
  },
}

export const vIntersect = {
  mounted(el, binding) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          binding.value(entry)
        }
      })
    })
    observer.observe(el)
  },
}
