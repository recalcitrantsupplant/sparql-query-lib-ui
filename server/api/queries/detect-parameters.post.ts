import { defineEventHandler, readBody } from 'h3'
import { ensureMockEnabled } from '../_utils/guards'

// Very lightweight mock implementation that heuristically detects:
// - VALUES groups: variables declared in VALUES clauses
// - LIMIT/OFFSET numeric placeholders
// This is only for local mock usage; real backend will do proper parsing.

export default defineEventHandler(async (event) => {
  ensureMockEnabled(event)
  const body = await readBody<{ query?: string }>(event)
  const q = body?.query || ''

  const valuesParameters: string[][] = []
  const limitParameters: string[] = []
  const offsetParameters: string[] = []

  if (q) {
    // Detect VALUES groups like: VALUES (?a ?b) { ... }
    const valuesGroupRegex = /VALUES\s*\(([^)]+)\)/gi
    let m: RegExpExecArray | null
    while ((m = valuesGroupRegex.exec(q)) !== null) {
      const groupSrc = m[1]
      const vars = Array.from(groupSrc.matchAll(/[?$]([A-Za-z_][\w]*)/g)).map((v) => v[1])
      if (vars.length > 0) valuesParameters.push(vars)
    }

    // Detect single-var VALUES form: VALUES ?var { ... }
    const valuesSingleVarRegex = /VALUES\s+([?$][A-Za-z_][\w]*)\s*\{/gi
    let sm: RegExpExecArray | null
    while ((sm = valuesSingleVarRegex.exec(q)) !== null) {
      const name = sm[1].replace(/^[?$]/, '')
      valuesParameters.push([name])
    }

    // Detect numeric placeholders for LIMIT/OFFSET (e.g., LIMIT 10, LIMIT $10)
    const lim = /LIMIT\s+\$?(\d+)/i.exec(q)
    if (lim && lim[1]) limitParameters.push(lim[1])
    const off = /OFFSET\s+\$?(\d+)/i.exec(q)
    if (off && off[1]) offsetParameters.push(off[1])
  }

  return {
    valuesParameters,
    limitParameters,
    offsetParameters,
  }
})
