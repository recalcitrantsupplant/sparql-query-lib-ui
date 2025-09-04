import { defineEventHandler, readBody } from 'h3'
import { ensureMockEnabled } from '../_utils/guards'

// Lightweight mock that extracts output variable names from a SELECT query.
// - SELECT * -> [] (unknown at this stage)
// - SELECT ?a ?b (expr AS ?c) -> ["a","b","c"]
// Best-effort only for mock usage.

export default defineEventHandler(async (event) => {
  ensureMockEnabled(event)
  const body = await readBody<{ query?: string }>(event)
  const q = body?.query || ''

  const outputs = new Set<string>()

  if (/\bselect\b/i.test(q)) {
    // Get everything after SELECT up to a common clause keyword
    const m = /select\s+(?:distinct|reduced)?\s*([\s\S]*?)(?:\bwhere\b|\bfrom\b|\border\s+by\b|\bgroup\s+by\b|\blimit\b|\boffset\b|$)/i.exec(q)
    const part = (m && m[1]) ? m[1] : ''
    if (part) {
      if (!/\*/.test(part)) {
        // Aliases: (expr AS ?name)
        for (const a of part.matchAll(/\bAS\s+\?([A-Za-z_][\w]*)/gi)) {
          outputs.add(a[1])
        }
        // Standalone variables: ?var
        for (const v of part.matchAll(/\?([A-Za-z_][\w]*)/g)) {
          outputs.add(v[1])
        }
      }
    }
  }

  return Array.from(outputs)
})

