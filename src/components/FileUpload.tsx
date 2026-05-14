'use client'

import { useRef, useState, useCallback } from 'react'

interface Props {
  onUploadSuccess: () => void
}

export default function FileUpload({ onUploadSuccess }: Props) {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [message, setMessage] = useState<{
    text: string
    type: 'success' | 'error'
  } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const upload = useCallback(
    async (file: File) => {
      setIsUploading(true)
      setMessage(null)

      const form = new FormData()
      form.append('file', file)

      try {
        const res = await fetch('/api/upload', { method: 'POST', body: form })
        const data = await res.json()

        if (!res.ok) {
          setMessage({ text: data.error || 'Upload failed', type: 'error' })
        } else {
          setMessage({
            text: `✓ Indexed ${data.chunkCount} chunks from "${file.name}"`,
            type: 'success',
          })
          onUploadSuccess()
        }
      } catch {
        setMessage({ text: 'Network error — is Ollama running?', type: 'error' })
      } finally {
        setIsUploading(false)
        if (inputRef.current) inputRef.current.value = ''
      }
    },
    [onUploadSuccess]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const file = e.dataTransfer.files[0]
      if (file) upload(file)
    },
    [upload]
  )

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) upload(file)
    },
    [upload]
  )

  return (
    <div className="px-3 pb-3">
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => !isUploading && inputRef.current?.click()}
        className={`
          relative border-2 border-dashed rounded-xl p-4 text-center cursor-pointer
          transition-all duration-200 select-none
          ${isDragging ? 'border-indigo-400 bg-indigo-950/30' : 'border-gray-700 hover:border-gray-500 hover:bg-gray-800/30'}
          ${isUploading ? 'opacity-60 cursor-not-allowed' : ''}
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx,.txt,.md"
          onChange={handleFileChange}
          className="hidden"
        />

        {isUploading ? (
          <div className="flex flex-col items-center gap-2">
            <div className="w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-gray-400">Indexing document...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1">
            <svg
              className="w-8 h-8 text-gray-500 mb-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.338-2.32 5.75 5.75 0 011.344 10.837"
              />
            </svg>
            <p className="text-xs font-medium text-gray-300">
              Drop file or click to upload
            </p>
            <p className="text-xs text-gray-500">PDF, DOCX, TXT, MD</p>
          </div>
        )}
      </div>

      {message && (
        <p
          className={`mt-2 text-xs px-2 py-1.5 rounded-lg ${
            message.type === 'success'
              ? 'text-green-300 bg-green-950/40'
              : 'text-red-300 bg-red-950/40'
          }`}
        >
          {message.text}
        </p>
      )}
    </div>
  )
}
