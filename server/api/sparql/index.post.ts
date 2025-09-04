import { defineEventHandler, readBody, setResponseHeader } from 'h3'
import { ensureMockEnabled } from '../_utils/guards'

export default defineEventHandler(async (event) => {
  ensureMockEnabled(event)
  const body = await readBody<any>(event)
  // For simplicity, return same JSON as /execute; client handles content-type
  return {
    head: { vars: ['s', 'p', 'o'] },
    results: {
      bindings: [
        { s: { type: 'uri', value: 'http://example.org/x' }, p: { type: 'uri', value: 'http://example.org/y' }, o: { type: 'literal', value: 'z' } },
      ],
    },
  }
})

