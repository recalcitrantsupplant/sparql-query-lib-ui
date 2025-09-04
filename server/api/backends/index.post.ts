import { defineEventHandler, readBody } from 'h3'
import { ensureMockEnabled } from '../_utils/guards'
import { mockStore, MockBackend } from '../../utils/mockStore'

export default defineEventHandler(async (event) => {
  ensureMockEnabled(event)
  const body = await readBody<any>(event)
  if (!body?.name || !body?.backendType) {
    return new Response('Missing required fields', { status: 400 })
  }
  if (body.backendType === 'HTTP' && !body.endpoint) {
    return new Response('Endpoint required for HTTP backends', { status: 400 })
  }
  const id = mockStore.makeId('backends')
  const now = mockStore.now()
  const be: MockBackend = {
    '@id': id,
    '@type': 'Backend',
    name: body.name,
    description: body.description,
    endpoint: body.endpoint,
    backendType: body.backendType,
    'https://schema.org/dateCreated': now,
    'https://schema.org/dateModified': now,
  }
  mockStore.backends.set(id, be)
  return be
})

