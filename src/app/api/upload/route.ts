import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { parseFile } from '@/lib/parser'
import { chunkText } from '@/lib/chunker'
import { getEmbedding } from '@/lib/ai'
import { addDocument, type Chunk } from '@/lib/vectorStore'

export const maxDuration = 300

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const allowedExts = ['.pdf', '.docx', '.txt', '.md']
    const fileExt = '.' + file.name.split('.').pop()?.toLowerCase()

    if (!allowedExts.includes(fileExt)) {
      return NextResponse.json(
        { error: `Unsupported file type. Use: ${allowedExts.join(', ')}` },
        { status: 400 }
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())

    let text: string
    try {
      text = await parseFile(buffer, file.name)
    } catch (parseErr) {
      const msg = parseErr instanceof Error ? parseErr.message : String(parseErr)
      return NextResponse.json({ error: `Parse error: ${msg}` }, { status: 500 })
    }

    if (!text.trim()) {
      return NextResponse.json({ error: 'Could not extract text from file' }, { status: 400 })
    }

    const chunkSize = parseInt(process.env.CHUNK_SIZE || '800')
    const chunkOverlap = parseInt(process.env.CHUNK_OVERLAP || '100')
    const textChunks = chunkText(text, chunkSize, chunkOverlap)

    if (textChunks.length === 0) {
      return NextResponse.json({ error: 'File has too little content to index' }, { status: 400 })
    }

    const docId = uuidv4()
    const chunks: Chunk[] = []

    for (let i = 0; i < textChunks.length; i++) {
      const tc = textChunks[i]
      let embedding: number[]
      try {
        embedding = await getEmbedding(tc.content)
      } catch (embErr) {
        const msg = embErr instanceof Error ? embErr.message : String(embErr)
        return NextResponse.json({ error: `Embedding error: ${msg}` }, { status: 500 })
      }
      chunks.push({
        id: uuidv4(),
        docId,
        docName: file.name,
        content: tc.content,
        embedding,
        chunkIndex: tc.index,
      })
    }

    await addDocument(
      {
        id: docId,
        name: file.name,
        uploadedAt: new Date().toISOString(),
        chunkCount: chunks.length,
        fileSize: file.size,
      },
      chunks
    )

    return NextResponse.json({
      success: true,
      document: {
        id: docId,
        name: file.name,
        uploadedAt: new Date().toISOString(),
        chunkCount: chunks.length,
        fileSize: file.size,
      },
      chunkCount: chunks.length,
      message: `Indexed ${chunks.length} chunks from "${file.name}"`,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upload failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
