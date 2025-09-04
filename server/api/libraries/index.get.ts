import { defineEventHandler } from 'h3'
import { ensureMockEnabled } from '../_utils/guards'
import { mockStore } from '../../utils/mockStore'

export default defineEventHandler((event) => {
  ensureMockEnabled(event)
  return Array.from(mockStore.libraries.values())
})

