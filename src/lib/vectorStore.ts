// Auto-selects storage backend:
// Production (UPSTASH_REDIS_REST_URL set) → Upstash Redis
// Local (no env var)                      → local JSON file

export interface Chunk {
  id: string
  docId: string
  docName: string
  content: string
  embedding: number[]
  chunkIndex: number
}

export interface Document {
  id: string
  name: string
  uploadedAt: string
  chunkCount: number
  fileSize: number
}

interface Store {
  documents: Document[]
  chunks: Chunk[]
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  if (normA === 0 || normB === 0) return 0
  return dot / (Math.sqrt(normA) * Math.sqrt(normB))
}

// ─── Upstash Redis backend ───────────────────────────────────────────────────

const REDIS_KEY = 'rag:store'

async function redisRead(): Promise<Store> {
  const res = await fetch(
    `${process.env.UPSTASH_REDIS_REST_URL}/get/${REDIS_KEY}`,
    { headers: { Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}` } }
  )
  const json = await res.json()
  if (!json.result) return { documents: [], chunks: [] }
  return JSON.parse(json.result) as Store
}

async function redisWrite(store: Store): Promise<void> {
  const body = JSON.stringify(store)
  await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/set/${REDIS_KEY}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify([body]),
  })
}

// ─── Local file backend ──────────────────────────────────────────────────────

async function fileRead(): Promise<Store> {
  const fs = await import('fs')
  const path = await import('path')
  const dir = path.join(process.cwd(), 'data')
  const file = path.join(dir, 'vectorstore.json')
  if (!fs.existsSync(file)) return { documents: [], chunks: [] }
  return JSON.parse(fs.readFileSync(file, 'utf-8')) as Store
}

async function fileWrite(store: Store): Promise<void> {
  const fs = await import('fs')
  const path = await import('path')
  const dir = path.join(process.cwd(), 'data')
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, 'vectorstore.json'), JSON.stringify(store))
}

// ─── Public API ──────────────────────────────────────────────────────────────

function isRedis() {
  return !!process.env.UPSTASH_REDIS_REST_URL
}

async function read(): Promise<Store> {
  return isRedis() ? redisRead() : fileRead()
}

async function write(store: Store): Promise<void> {
  return isRedis() ? redisWrite(store) : fileWrite(store)
}

export async function addDocument(doc: Document, chunks: Chunk[]): Promise<void> {
  const store = await read()
  store.documents.push(doc)
  store.chunks = store.chunks.concat(chunks)
  await write(store)
}

export async function deleteDocument(docId: string): Promise<void> {
  const store = await read()
  store.documents = store.documents.filter((d) => d.id !== docId)
  store.chunks = store.chunks.filter((c) => c.docId !== docId)
  await write(store)
}

export async function listDocuments(): Promise<Document[]> {
  return (await read()).documents
}

export async function searchSimilar(
  queryEmbedding: number[],
  topK = 5
): Promise<Array<Chunk & { score: number }>> {
  const { chunks } = await read()
  if (chunks.length === 0) return []

  return chunks
    .map((chunk) => ({ ...chunk, score: cosineSimilarity(queryEmbedding, chunk.embedding) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
}

export async function getStats(): Promise<{ documentCount: number; chunkCount: number }> {
  const store = await read()
  return { documentCount: store.documents.length, chunkCount: store.chunks.length }
}
