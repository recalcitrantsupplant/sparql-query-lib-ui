import { defineEventHandler } from 'h3'
import { ensureMockEnabled, requireQuery } from '../_utils/guards'
import { mockStore } from '../../utils/mockStore'

export default defineEventHandler((event) => {
  ensureMockEnabled(event)
  const libraryId = requireQuery(event, 'libraryId')
  const list = Array.from(mockStore.queries.values()).filter(q => q['https://schema.org/isPartOf']?.some(ref => ref['@id'] === libraryId))
  return list
})

