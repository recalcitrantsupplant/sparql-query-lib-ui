import { defineEventHandler } from 'h3'
import { ensureMockEnabled, requireQuery } from '../_utils/guards'
import { mockStore } from '../../utils/mockStore'

export default defineEventHandler((event) => {
  ensureMockEnabled(event)
  const libraryId = requireQuery(event, 'libraryId')
  return Array.from(mockStore.groups.values()).filter(g => g.libraryId === libraryId)
})

