import { defineEventHandler, readBody } from 'h3'
import { ensureMockEnabled } from '../_utils/guards'
import { mockStore, MockQuery } from '../../utils/mockStore'

export default defineEventHandler(async (event) => {
  ensureMockEnabled(event)
  const body = await readBody<any>(event)
  if (!body?.name || !body?.libraryId || !body?.query) {
    return new Response('Missing required fields', { status: 400 })
  }
  const id = mockStore.makeId('queries')
  const now = mockStore.now()
  const query: MockQuery = {
    '@id': id,
    '@type': 'StoredQuery',
    name: body.name,
    description: body.description || '',
    query: body.query,
    queryType: 'SELECT',
    outputVars: [],
    parameters: body.parameters ?? null,
    'https://schema.org/isPartOf': [{ '@id': body.libraryId }],
    'https://schema.org/dateCreated': now,
    'https://schema.org/dateModified': now,
  }
  mockStore.queries.set(id, query)
  // add to library index if present
  const lib = mockStore.libraries.get(body.libraryId)
  if (lib) lib.queries = [...(lib.queries || []), { '@id': id }]
  return query
})

