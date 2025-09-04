import { defineEventHandler, readBody, getRouterParam } from 'h3'
import { ensureMockEnabled } from '../../../_utils/guards'
import { mockStore } from '../../../../utils/mockStore'

export default defineEventHandler(async (event) => {
  ensureMockEnabled(event)
  const gid = decodeURIComponent(getRouterParam(event, 'id')!)
  const edgeId = decodeURIComponent(getRouterParam(event, 'edgeId')!)
  const group = mockStore.groups.get(gid)
  if (!group) return new Response('Group not found', { status: 404 })
  const updated = await readBody<any>(event)
  group.edges = (group.edges || []).map(e => (e['@id'] === edgeId ? updated : e))
  group['https://schema.org/dateModified'] = mockStore.now()
  mockStore.groups.set(gid, group)
  return updated
})

