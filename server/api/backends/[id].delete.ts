import { defineEventHandler, getRouterParam } from 'h3'
import { ensureMockEnabled } from '../../api/_utils/guards'
import { mockStore } from '../../utils/mockStore'

export default defineEventHandler((event) => {
  ensureMockEnabled(event)
  const rawId = getRouterParam(event, 'id')!
  const id = decodeURIComponent(rawId)
  const existed = mockStore.backends.delete(id)
  if (!existed) return new Response('Not found', { status: 404 })
  return { success: true }
})

