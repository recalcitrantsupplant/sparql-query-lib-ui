import { defineEventHandler, readBody } from 'h3'
import { ensureMockEnabled } from '../_utils/guards'
import { mockStore, MockQueryGroup } from '../../utils/mockStore'

export default defineEventHandler(async (event) => {
  ensureMockEnabled(event)
  const body = await readBody<any>(event)
  if (!body?.name || !body?.libraryId) {
    return new Response('Missing required fields', { status: 400 })
  }
  const id = mockStore.makeId('queryGroups')
  const now = mockStore.now()
  const g: MockQueryGroup = {
    '@id': id,
    '@type': 'QueryGroup',
    name: body.name,
    description: body.description,
    nodes: body.nodes || [],
    edges: body.edges || [],
    startNodeIds: body.startNodeIds || [],
    endNodeIds: body.endNodeIds || [],
    libraryId: body.libraryId,
    canvasLayout: body.canvasLayout,
    'https://schema.org/dateCreated': now,
    'https://schema.org/dateModified': now,
  }
  mockStore.groups.set(id, g)
  return g
})

