import { defineEventHandler, getRouterParam } from 'h3'
import { ensureMockEnabled } from '../../../_utils/guards'
import { mockStore } from '../../../../utils/mockStore'

export default defineEventHandler((event) => {
  ensureMockEnabled(event)
  const gid = decodeURIComponent(getRouterParam(event, 'id')!)
  const nodeId = decodeURIComponent(getRouterParam(event, 'nodeId')!)
  const group = mockStore.groups.get(gid)
  if (!group) return new Response('Group not found', { status: 404 })
  group.nodes = (group.nodes || []).filter(n => n['@id'] !== nodeId)
  group['https://schema.org/dateModified'] = mockStore.now()
  mockStore.groups.set(gid, group)
  return { success: true }
})

