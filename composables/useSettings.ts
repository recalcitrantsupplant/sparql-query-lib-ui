import { useState, useRuntimeConfig } from '#app'
import { watch } from 'vue'
import { useLocalStorage } from '@vueuse/core'

// Define keys for localStorage
const STORAGE_KEY_API_URL = 'backend-api-url'
const STORAGE_KEY_LIBRARY_ID = 'selected-library-id'
// DEFAULT_API_URL is now sourced from runtime config

export function useSettings() {
  const config = useRuntimeConfig()
  const defaultApiUrlFromConfig = config.public.apiUrl as string

  // --- API URL State ---
  // Initialize with localStorage value, fallback to runtime config default
  const apiUrl = useState<string>(STORAGE_KEY_API_URL, () => localStorage.getItem(STORAGE_KEY_API_URL) || defaultApiUrlFromConfig)
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
        apiUrl.value = defaultApiUrlFromConfig
        console.warn(`Invalid API URL provided: "${newUrl}". Reverting to default: "${defaultApiUrlFromConfig}"`)
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
