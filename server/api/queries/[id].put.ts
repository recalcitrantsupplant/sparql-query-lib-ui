import { defineEventHandler, readBody, getRouterParam } from 'h3'
import { ensureMockEnabled } from '../../api/_utils/guards'
import { mockStore } from '../../utils/mockStore'

export default defineEventHandler(async (event) => {
  ensureMockEnabled(event)
  const rawId = getRouterParam(event, 'id')!
  const id = decodeURIComponent(rawId)
  const existing = mockStore.queries.get(id)
  if (!existing) return new Response('Not found', { status: 404 })
  const body = await readBody<any>(event)
  existing.name = body.name ?? existing.name
  existing.description = body.description ?? existing.description
  existing.query = body.query ?? existing.query
  if (Array.isArray(body.parameters) || body.parameters === null) existing.parameters = body.parameters
  existing['https://schema.org/dateModified'] = mockStore.now()
  mockStore.queries.set(id, existing)
  return existing
})

