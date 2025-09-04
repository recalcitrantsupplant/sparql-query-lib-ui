import { defineEventHandler, readBody } from 'h3'
import { ensureMockEnabled } from '../_utils/guards'

export default defineEventHandler(async (event) => {
  ensureMockEnabled(event)
  const body = await readBody<any>(event)
  // Return a simple SPARQL results JSON structure
  return {
    head: { vars: ['s', 'p', 'o'] },
    results: {
      bindings: [
        { s: { type: 'uri', value: 'http://example.org/s' }, p: { type: 'uri', value: 'http://example.org/p' }, o: { type: 'literal', value: 'mock' } },
        { s: { type: 'uri', value: 'http://example.org/a' }, p: { type: 'uri', value: 'http://example.org/b' }, o: { type: 'literal', value: 'data' } },
      ],
    },
  }
})

