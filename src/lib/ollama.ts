const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434'
const LLM_MODEL = process.env.LLM_MODEL || 'llama3'
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || 'nomic-embed-text'

export async function getEmbedding(text: string): Promise<number[]> {
  const res = await fetch(`${OLLAMA_URL}/api/embeddings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: EMBEDDING_MODEL, prompt: text }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Ollama embedding failed: ${err}`)
  }

  const data = await res.json()
  return data.embedding as number[]
}

export async function* streamChat(
  messages: { role: string; content: string }[]
): AsyncGenerator<string> {
  const res = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: LLM_MODEL, messages, stream: true }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Ollama chat failed: ${err}`)
  }

  const reader = res.body!.getReader()
  const decoder = new TextDecoder()

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    const lines = decoder.decode(value).split('\n').filter(Boolean)
    for (const line of lines) {
      try {
        const parsed = JSON.parse(line)
        if (parsed.message?.content) {
          yield parsed.message.content as string
        }
      } catch {
        // skip malformed lines
      }
    }
  }
}

export async function checkOllamaStatus(): Promise<{
  running: boolean
  models: string[]
}> {
  try {
    const res = await fetch(`${OLLAMA_URL}/api/tags`)
    if (!res.ok) return { running: false, models: [] }
    const data = await res.json()
    const models = (data.models || []).map((m: { name: string }) => m.name)
    return { running: true, models }
  } catch {
    return { running: false, models: [] }
  }
}
