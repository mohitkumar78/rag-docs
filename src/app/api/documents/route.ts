import { NextRequest, NextResponse } from 'next/server'
import { listDocuments, deleteDocument, getStats } from '@/lib/vectorStore'

export async function GET() {
  const documents = await listDocuments()
  const stats = await getStats()
  return NextResponse.json({ documents, stats })
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const docId = searchParams.get('id')

  if (!docId) {
    return NextResponse.json({ error: 'Document ID required' }, { status: 400 })
  }

  await deleteDocument(docId)
  return NextResponse.json({ success: true })
}
