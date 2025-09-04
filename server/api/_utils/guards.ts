import { createError, H3Event, getQuery } from 'h3'

export const ensureMockEnabled = (event: H3Event) => {
  const cfg = useRuntimeConfig()
  if (!cfg.public?.useMock) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  }
}

export const requireQuery = (event: H3Event, name: string): string => {
  const q = getQuery(event)
  const v = q[name]
  if (!v || Array.isArray(v)) {
    throw createError({ statusCode: 400, statusMessage: `Missing query param: ${name}` })
  }
  return String(v)
}

