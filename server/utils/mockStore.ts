import { randomUUID } from 'node:crypto'

type DateString = string

export interface MockLibrary {
  '@id': string
  '@type': 'Library'
  name: string
  description?: string
  queries?: { '@id': string }[]
  'https://schema.org/dateCreated': DateString
  'https://schema.org/dateModified': DateString
}

export interface MockQuery {
  '@id': string
  '@type': 'StoredQuery'
  name: string
  description: string
  query: string
  queryType: string
  outputVars: string[]
  parameters: any[] | null
  'https://schema.org/isPartOf': { '@id': string }[]
  'https://schema.org/dateCreated': DateString
  'https://schema.org/dateModified': DateString
}

export interface MockBackend {
  '@id': string
  '@type': 'Backend'
  name: string
  description?: string
  endpoint?: string
  backendType: 'HTTP' | 'OxigraphMemory'
  'https://schema.org/dateCreated': DateString
  'https://schema.org/dateModified': DateString
}

export interface MockQueryGroup {
  '@id': string
  '@type': 'QueryGroup'
  name: string
  description?: string
  nodes?: any[]
  edges?: any[]
  startNodeIds?: string[]
  endNodeIds?: string[]
  libraryId?: string
  canvasLayout?: string
  'https://schema.org/dateCreated'?: DateString
  'https://schema.org/dateModified'?: DateString
}

const BASE = 'http://mock.local'

const now = (): DateString => new Date().toISOString()
const makeId = (prefix: string) => `${BASE}/${prefix}/${randomUUID()}`

// In-memory stores
const libraries = new Map<string, MockLibrary>()
const queries = new Map<string, MockQuery>()
const backends = new Map<string, MockBackend>()
const groups = new Map<string, MockQueryGroup>()

// Seed data
const seed = () => {
  if (libraries.size > 0) return
  const libId = makeId('libraries')
  const lib: MockLibrary = {
    '@id': libId,
    '@type': 'Library',
    name: 'Demo Library',
    description: 'Sample library for test mode',
    queries: [],
    'https://schema.org/dateCreated': now(),
    'https://schema.org/dateModified': now(),
  }
  libraries.set(libId, lib)

  const qId = makeId('queries')
  const q: MockQuery = {
    '@id': qId,
    '@type': 'StoredQuery',
    name: 'Sample: All triples',
    description: 'Returns a few triples',
    query: 'SELECT * WHERE { ?s ?p ?o } LIMIT 10',
    queryType: 'SELECT',
    outputVars: ['s', 'p', 'o'],
    parameters: null,
    'https://schema.org/isPartOf': [{ '@id': libId }],
    'https://schema.org/dateCreated': now(),
    'https://schema.org/dateModified': now(),
  }
  queries.set(qId, q)
  lib.queries?.push({ '@id': qId })

  const beId = makeId('backends')
  const be: MockBackend = {
    '@id': beId,
    '@type': 'Backend',
    name: 'Mock HTTP Endpoint',
    description: 'Simulated SPARQL endpoint',
    endpoint: 'http://example.org/sparql',
    backendType: 'HTTP',
    'https://schema.org/dateCreated': now(),
    'https://schema.org/dateModified': now(),
  }
  backends.set(beId, be)

  const gId = makeId('queryGroups')
  const group: MockQueryGroup = {
    '@id': gId,
    '@type': 'QueryGroup',
    name: 'Sample Group',
    description: 'A demo group',
    nodes: [],
    edges: [],
    libraryId: libId,
    'https://schema.org/dateCreated': now(),
    'https://schema.org/dateModified': now(),
  }
  groups.set(gId, group)
}

seed()

export const mockStore = {
  now,
  makeId,
  libraries,
  queries,
  backends,
  groups,
}

