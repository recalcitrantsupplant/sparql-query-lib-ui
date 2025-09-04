import { defineEventHandler, readBody, getRouterParam } from 'h3'
import { ensureMockEnabled } from '../../api/_utils/guards'
import { mockStore } from '../../utils/mockStore'

export default defineEventHandler(async (event) => {
  ensureMockEnabled(event)
  const rawId = getRouterParam(event, 'id')!
  const id = decodeURIComponent(rawId)
  const existing = mockStore.libraries.get(id)
  if (!existing) return new Response('Not found', { status: 404 })
  const body = await readBody<Partial<typeof existing>>(event)
  existing.name = body.name ?? existing.name
  existing.description = body.description ?? existing.description
  existing['https://schema.org/dateModified'] = mockStore.now()
  mockStore.libraries.set(id, existing)
  return existing
})

