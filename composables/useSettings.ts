import { useState } from '#app'
import { watch } from 'vue'
import { useLocalStorage } from '@vueuse/core'

// Define keys for localStorage
const STORAGE_KEY_API_URL = 'backend-api-url'
const STORAGE_KEY_LIBRARY_ID = 'selected-library-id'
const DEFAULT_API_URL = 'http://localhost:3000'

export function useSettings() {
  // --- API URL State ---
  const apiUrl = useState<string>(STORAGE_KEY_API_URL, () => localStorage.getItem(STORAGE_KEY_API_URL) || DEFAULT_API_URL)
  const storedApiUrl = useLocalStorage<string>(STORAGE_KEY_API_URL, apiUrl.value)

  watch(apiUrl, (newValue) => {
    storedApiUrl.value = newValue
  })
  watch(storedApiUrl, (newValue) => {
    if (newValue !== null && apiUrl.value !== newValue) {
      apiUrl.value = newValue
    }
  })

  const setApiUrl = (newUrl: string) => {
    const trimmedUrl = newUrl.trim()
    if (trimmedUrl && (trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://'))) {
       // Remove trailing slash if present
       apiUrl.value = trimmedUrl.replace(/\/$/, '')
    } else {
       // Revert to default if invalid or empty
       apiUrl.value = DEFAULT_API_URL
       console.warn(`Invalid API URL provided: "${newUrl}". Reverting to default: "${DEFAULT_API_URL}"`)
    }
  }
  // --- End API URL State ---

  // --- Selected Library ID State ---
  const selectedLibraryId = useState<string | null>(STORAGE_KEY_LIBRARY_ID, () => localStorage.getItem(STORAGE_KEY_LIBRARY_ID) || null)
  const storedLibraryId = useLocalStorage<string | null>(STORAGE_KEY_LIBRARY_ID, selectedLibraryId.value)

  watch(selectedLibraryId, (newValue) => {
    storedLibraryId.value = newValue
  })
  watch(storedLibraryId, (newValue) => {
    // No need to check for null inequality here, as null is a valid state
    if (selectedLibraryId.value !== newValue) {
        selectedLibraryId.value = newValue
    }
  })

  const setSelectedLibraryId = (id: string | null) => {
    selectedLibraryId.value = id
  }
  // --- End Selected Library ID State ---

  return {
    apiUrl,
    setApiUrl,
    selectedLibraryId,
    setSelectedLibraryId,
  }
}
