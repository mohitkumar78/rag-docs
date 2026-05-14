'use client'

import { useState } from 'react'

interface Document {
  id: string
  name: string
  uploadedAt: string
  chunkCount: number
  fileSize: number
}

interface Props {
  documents: Document[]
  onDelete: (id: string) => void
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function fileIcon(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase()
  if (ext === 'pdf') return '📄'
  if (ext === 'docx') return '📝'
  if (ext === 'md') return '📋'
  return '📃'
}

export default function DocumentList({ documents, onDelete }: Props) {
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      await fetch(`/api/documents?id=${id}`, { method: 'DELETE' })
      onDelete(id)
    } finally {
      setDeletingId(null)
    }
  }

  if (documents.length === 0) {
    return (
      <div className="px-4 py-6 text-center">
        <p className="text-xs text-gray-500">No documents uploaded yet.</p>
        <p className="text-xs text-gray-600 mt-1">
          Upload a file above to get started.
        </p>
      </div>
    )
  }

  return (
    <div className="px-3 space-y-1.5">
      {documents.map((doc) => (
        <div
          key={doc.id}
          className="flex items-start gap-2 p-2.5 rounded-lg bg-gray-800/50 group hover:bg-gray-800 transition-colors"
        >
          <span className="text-base mt-0.5 shrink-0">{fileIcon(doc.name)}</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-200 truncate">
              {doc.name}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              {doc.chunkCount} chunks · {formatSize(doc.fileSize)}
            </p>
          </div>
          <button
            onClick={() => handleDelete(doc.id)}
            disabled={deletingId === doc.id}
            className="shrink-0 opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 transition-all p-0.5 rounded"
            title="Delete document"
          >
            {deletingId === doc.id ? (
              <div className="w-3.5 h-3.5 border border-gray-500 border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            )}
          </button>
        </div>
      ))}
    </div>
  )
}
