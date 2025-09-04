import { defineEventHandler, getRouterParam } from 'h3'
import { ensureMockEnabled } from '../../api/_utils/guards'
import { mockStore } from '../../utils/mockStore'

export default defineEventHandler((event) => {
  ensureMockEnabled(event)
  const rawId = getRouterParam(event, 'id')!
  const id = decodeURIComponent(rawId)
  const g = mockStore.groups.get(id)
  if (!g) return new Response('Not found', { status: 404 })
  return g
})

