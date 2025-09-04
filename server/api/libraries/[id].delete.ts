import { defineEventHandler, getRouterParam } from 'h3'
import { ensureMockEnabled } from '../../api/_utils/guards'
import { mockStore } from '../../utils/mockStore'

export default defineEventHandler((event) => {
  ensureMockEnabled(event)
  const rawId = getRouterParam(event, 'id')!
  const id = decodeURIComponent(rawId)
  const existed = mockStore.libraries.delete(id)
  if (!existed) return new Response('Not found', { status: 404 })
  // cascade: remove queries/groups referencing this library
  for (const [qid, q] of mockStore.queries) {
    if (q['https://schema.org/isPartOf']?.some(ref => ref['@id'] === id)) {
      mockStore.queries.delete(qid)
    }
  }
  for (const [gid, g] of mockStore.groups) {
    if (g.libraryId === id) mockStore.groups.delete(gid)
  }
  return { success: true }
})

