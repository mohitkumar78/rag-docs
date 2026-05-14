// Unified AI provider — auto-selects cloud or local based on env vars
// Cloud:  GROQ_API_KEY → Groq LLM  |  HUGGINGFACE_API_KEY → HF embeddings
// Local:  falls back to Ollama for both

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434'

// ─── LLM ────────────────────────────────────────────────────────────────────

export async function* streamChat(
  messages: { role: string; content: string }[]
): AsyncGenerator<string> {
  if (process.env.GROQ_API_KEY) {
    yield* streamGroq(messages)
  } else {
    yield* streamOllama(messages)
  }
}

async function* streamGroq(
  messages: { role: string; content: string }[]
): AsyncGenerator<string> {
  const model = process.env.LLM_MODEL || 'llama3-8b-8192'
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model, messages, stream: true }),
  })

  if (!res.ok) {
    throw new Error(`Groq error: ${await res.text()}`)
  }

  const reader = res.body!.getReader()
  const decoder = new TextDecoder()

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    const lines = decoder.decode(value).split('\n')
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const data = line.slice(6).trim()
      if (data === '[DONE]') return
      try {
        const parsed = JSON.parse(data)
        const content = parsed.choices?.[0]?.delta?.content
        if (content) yield content as string
      } catch {
        // skip malformed lines
      }
    }
  }
}

async function* streamOllama(
  messages: { role: string; content: string }[]
): AsyncGenerator<string> {
  const model = process.env.LLM_MODEL || 'llama3'
  const res = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages, stream: true }),
  })

  if (!res.ok) throw new Error(`Ollama chat failed: ${await res.text()}`)

  const reader = res.body!.getReader()
  const decoder = new TextDecoder()

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    const lines = decoder.decode(value).split('\n').filter(Boolean)
    for (const line of lines) {
      try {
        const parsed = JSON.parse(line)
        if (parsed.message?.content) yield parsed.message.content as string
      } catch {
        // skip
      }
    }
  }
}

// ─── Embeddings ─────────────────────────────────────────────────────────────

export async function getEmbedding(text: string): Promise<number[]> {
  if (process.env.HUGGINGFACE_API_KEY) {
    return getHuggingFaceEmbedding(text)
  }
  return getOllamaEmbedding(text)
}

async function getHuggingFaceEmbedding(text: string): Promise<number[]> {
  const model =
    process.env.EMBEDDING_MODEL ||
    'sentence-transformers/all-MiniLM-L6-v2'

  const res = await fetch(
    `https://api-inference.huggingface.co/models/${model}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: text,
        options: { wait_for_model: true },
      }),
    }
  )

  if (!res.ok) throw new Error(`HuggingFace embedding failed: ${await res.text()}`)

  const data = await res.json()
  // HF returns [[...]] for single string input — flatten one level
  return Array.isArray(data[0]) ? (data[0] as number[]) : (data as number[])
}

async function getOllamaEmbedding(text: string): Promise<number[]> {
  const model = process.env.EMBEDDING_MODEL || 'nomic-embed-text'
  const res = await fetch(`${OLLAMA_URL}/api/embeddings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, prompt: text }),
  })

  if (!res.ok) throw new Error(`Ollama embedding failed: ${await res.text()}`)

  const data = await res.json()
  return data.embedding as number[]
}

// ─── Status ──────────────────────────────────────────────────────────────────

export async function checkStatus(): Promise<{
  running: boolean
  provider: string
  model: string
}> {
  if (process.env.GROQ_API_KEY) {
    return {
      running: true,
      provider: 'Groq',
      model: process.env.LLM_MODEL || 'llama3-8b-8192',
    }
  }

  try {
    const res = await fetch(`${OLLAMA_URL}/api/tags`)
    if (!res.ok) return { running: false, provider: 'Ollama', model: '' }
    return {
      running: true,
      provider: 'Ollama',
      model: process.env.LLM_MODEL || 'llama3',
    }
  } catch {
    return { running: false, provider: 'Ollama', model: '' }
  }
}
