import { defineEventHandler, readBody } from 'h3'
import { ensureMockEnabled } from '../_utils/guards'
import { mockStore } from '../../utils/mockStore'

export default defineEventHandler(async (event) => {
  ensureMockEnabled(event)
  const body = await readBody<{ name: string; description?: string }>(event)
  if (!body?.name) {
    return new Response('Name is required', { status: 400 })
  }
  const id = mockStore.makeId('libraries')
  const lib = {
    '@id': id,
    '@type': 'Library' as const,
    name: body.name,
    description: body.description,
    queries: [],
    'https://schema.org/dateCreated': mockStore.now(),
    'https://schema.org/dateModified': mockStore.now(),
  }
  mockStore.libraries.set(id, lib)
  return lib
})

