import { NextRequest, NextResponse } from 'next/server'
import { getEmbedding, streamChat } from '@/lib/ai'
import { searchSimilar } from '@/lib/vectorStore'

export const maxDuration = 120

export async function POST(req: NextRequest) {
  try {
    const { question, history = [] } = await req.json()

    if (!question?.trim()) {
      return NextResponse.json({ error: 'Question is required' }, { status: 400 })
    }

    const topK = parseInt(process.env.TOP_K_RESULTS || '5')
    const queryEmbedding = await getEmbedding(question)
    const relevantChunks = await searchSimilar(queryEmbedding, topK)

    const sources = relevantChunks.map((c) => ({
      docName: c.docName,
      content: c.content.slice(0, 200) + (c.content.length > 200 ? '...' : ''),
      score: Math.round(c.score * 100) / 100,
    }))

    let systemPrompt: string
    if (relevantChunks.length === 0) {
      systemPrompt = `You are a helpful document assistant. No documents have been uploaded yet.
Politely let the user know they need to upload documents first before you can answer questions about them.
Keep your response brief.`
    } else {
      const context = relevantChunks
        .map((c, i) => `[Source ${i + 1}: ${c.docName}]\n${c.content}`)
        .join('\n\n---\n\n')

      systemPrompt = `You are a helpful document assistant. Answer the user's question using ONLY the context below.
If the answer is not in the context, say "I couldn't find that in the uploaded documents."
Be concise and accurate. Cite which source document you used when relevant.

CONTEXT:
${context}`
    }

    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-6),
      { role: 'user', content: question },
    ]

    const sourcesLine = `__SOURCES__${JSON.stringify(sources)}__END__\n`

    const stream = new ReadableStream({
      async start(controller) {
        const enc = new TextEncoder()
        try {
          controller.enqueue(enc.encode(sourcesLine))
          for await (const chunk of streamChat(messages)) {
            controller.enqueue(enc.encode(chunk))
          }
        } catch (streamErr) {
          const msg = streamErr instanceof Error ? streamErr.message : 'Stream error'
          console.error('[chat] stream error:', msg)
          controller.enqueue(enc.encode(`\n\n⚠️ Error: ${msg}`))
        } finally {
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'X-Accel-Buffering': 'no',
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Chat failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
