'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { v4 as uuidv4 } from 'uuid'
import FileUpload from '@/components/FileUpload'
import DocumentList from '@/components/DocumentList'
import MessageBubble, { type Message, type Source } from '@/components/MessageBubble'

interface Document {
  id: string
  name: string
  uploadedAt: string
  chunkCount: number
  fileSize: number
}

interface Stats {
  documentCount: number
  chunkCount: number
}

interface OllamaStatus {
  running: boolean
  provider: string
  model: string
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([])
  const [documents, setDocuments] = useState<Document[]>([])
  const [stats, setStats] = useState<Stats>({ documentCount: 0, chunkCount: 0 })
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [ollamaStatus, setOllamaStatus] = useState<OllamaStatus | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  const loadDocuments = useCallback(async () => {
    const res = await fetch('/api/documents')
    const data = await res.json()
    setDocuments(data.documents || [])
    setStats(data.stats || { documentCount: 0, chunkCount: 0 })
  }, [])

  const loadStatus = useCallback(async () => {
    const res = await fetch('/api/status')
    const data = await res.json()
    setOllamaStatus(data)
  }, [])

  useEffect(() => {
    loadDocuments()
    loadStatus()
  }, [loadDocuments, loadStatus])

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 160) + 'px'
  }, [input])

  const handleDeleteDocument = useCallback(
    (id: string) => {
      setDocuments((prev) => prev.filter((d) => d.id !== id))
      setStats((prev) => ({ ...prev, documentCount: prev.documentCount - 1 }))
    },
    []
  )

  const sendMessage = useCallback(async () => {
    const question = input.trim()
    if (!question || isStreaming) return

    setInput('')
    setIsStreaming(true)

    const userMsg: Message = {
      id: uuidv4(),
      role: 'user',
      content: question,
    }

    const assistantId = uuidv4()
    const assistantMsg: Message = {
      id: assistantId,
      role: 'assistant',
      content: '',
      isStreaming: true,
    }

    setMessages((prev) => [...prev, userMsg, assistantMsg])

    const history = messages.slice(-6).map((m) => ({
      role: m.role,
      content: m.content,
    }))

    abortRef.current = new AbortController()

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, history }),
        signal: abortRef.current.signal,
      })

      if (!res.ok) {
        const err = await res.json()
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: `Error: ${err.error}`, isStreaming: false }
              : m
          )
        )
        return
      }

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let fullText = ''
      let sources: Source[] = []
      let sourcesExtracted = false

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)

        if (!sourcesExtracted) {
          fullText += chunk
          const marker = '__SOURCES__'
          const endMarker = '__END__\n'
          const startIdx = fullText.indexOf(marker)
          const endIdx = fullText.indexOf(endMarker)

          if (startIdx !== -1 && endIdx !== -1) {
            const jsonStr = fullText.slice(startIdx + marker.length, endIdx)
            try {
              sources = JSON.parse(jsonStr)
            } catch {
              sources = []
            }
            fullText = fullText.slice(endIdx + endMarker.length)
            sourcesExtracted = true

            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, content: fullText, sources }
                  : m
              )
            )
          }
        } else {
          fullText += chunk
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: fullText } : m
            )
          )
        }
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId ? { ...m, isStreaming: false } : m
        )
      )
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content: 'Connection error. Is Ollama running?',
                  isStreaming: false,
                }
              : m
          )
        )
      }
    } finally {
      setIsStreaming(false)
    }
  }, [input, isStreaming, messages])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const clearChat = () => {
    abortRef.current?.abort()
    setMessages([])
    setIsStreaming(false)
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-950">
      {/* Sidebar */}
      <aside
        className={`
          flex flex-col bg-gray-900 border-r border-gray-800
          transition-all duration-300 overflow-hidden
          ${sidebarOpen ? 'w-72' : 'w-0'}
        `}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-800 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-sm font-bold text-white">DocChat</h1>
              <p className="text-xs text-gray-500">Local RAG</p>
            </div>
          </div>

          {/* Stats */}
          <div className="flex gap-3 mt-3">
            <div className="flex-1 bg-gray-800 rounded-lg px-3 py-2 text-center">
              <p className="text-lg font-bold text-indigo-400">{stats.documentCount}</p>
              <p className="text-xs text-gray-500">Docs</p>
            </div>
            <div className="flex-1 bg-gray-800 rounded-lg px-3 py-2 text-center">
              <p className="text-lg font-bold text-indigo-400">{stats.chunkCount}</p>
              <p className="text-xs text-gray-500">Chunks</p>
            </div>
          </div>
        </div>

        {/* Ollama Status */}
        {ollamaStatus && (
          <div className="px-3 pt-3 shrink-0">
            <div
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs
                ${ollamaStatus.running ? 'bg-green-950/40 text-green-300' : 'bg-red-950/40 text-red-300'}`}
            >
              <div
                className={`w-2 h-2 rounded-full ${ollamaStatus.running ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}
              />
              {ollamaStatus.running
                ? `${ollamaStatus.provider} · ${ollamaStatus.model}`
                : `${ollamaStatus.provider} not running`}
            </div>
          </div>
        )}

        {/* Upload Section */}
        <div className="mt-3 shrink-0">
          <p className="px-3 pb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Upload Document
          </p>
          <FileUpload onUploadSuccess={loadDocuments} />
        </div>

        {/* Document List */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          <p className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Documents
          </p>
          <DocumentList documents={documents} onDelete={handleDeleteDocument} />
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="shrink-0 flex items-center gap-3 px-4 py-3 border-b border-gray-800 bg-gray-900/50 backdrop-blur">
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-gray-800 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <h2 className="flex-1 text-sm font-semibold text-gray-200">
            Chat with your documents
          </h2>

          {isStreaming && (
            <div className="flex items-center gap-2 text-xs text-indigo-400">
              <div className="w-3 h-3 border border-indigo-400 border-t-transparent rounded-full animate-spin" />
              Thinking...
            </div>
          )}

          {messages.length > 0 && (
            <button
              onClick={clearChat}
              className="text-xs text-gray-500 hover:text-gray-300 px-2.5 py-1.5 rounded-lg hover:bg-gray-800 transition-colors"
            >
              Clear chat
            </button>
          )}
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-6 space-y-6">
          {messages.length === 0 ? (
            <EmptyState hasDocuments={documents.length > 0} />
          ) : (
            messages.map((msg) => <MessageBubble key={msg.id} message={msg} />)
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="shrink-0 border-t border-gray-800 bg-gray-900/50 backdrop-blur p-4">
          <div className="flex gap-3 items-end max-w-4xl mx-auto">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                documents.length === 0
                  ? 'Upload a document first...'
                  : 'Ask anything about your documents... (Enter to send, Shift+Enter for newline)'
              }
              rows={1}
              className="flex-1 resize-none bg-gray-800 border border-gray-700 focus:border-indigo-500
                rounded-xl px-4 py-3 text-sm text-gray-100 placeholder-gray-500
                focus:outline-none focus:ring-1 focus:ring-indigo-500/50
                scrollbar-thin transition-colors"
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || isStreaming}
              className="shrink-0 w-10 h-10 rounded-xl bg-indigo-600 hover:bg-indigo-500
                disabled:opacity-40 disabled:cursor-not-allowed
                flex items-center justify-center transition-colors"
            >
              {isStreaming ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
            </button>
          </div>
          <p className="text-center text-xs text-gray-600 mt-2">
            Powered by Ollama · Running 100% locally · Your data never leaves your machine
          </p>
        </div>
      </main>
    </div>
  )
}

function EmptyState({ hasDocuments }: { hasDocuments: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center py-16 select-none">
      <div className="w-16 h-16 bg-gray-800 rounded-2xl flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-gray-300 mb-2">
        {hasDocuments ? 'Start asking questions' : 'No documents yet'}
      </h3>
      <p className="text-sm text-gray-500 max-w-xs leading-relaxed">
        {hasDocuments
          ? 'Your documents are indexed and ready. Ask anything — your data stays local.'
          : 'Upload a PDF, DOCX, or TXT file using the sidebar. All processing happens on your machine.'}
      </p>
      {hasDocuments && (
        <div className="mt-6 grid grid-cols-1 gap-2 text-left max-w-sm w-full">
          {[
            'Summarize the key points of this document',
            'What are the main conclusions?',
            'Find all mentions of deadlines or dates',
          ].map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => {
                const ta = document.querySelector('textarea')
                if (ta) {
                  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
                    window.HTMLTextAreaElement.prototype,
                    'value'
                  )?.set
                  nativeInputValueSetter?.call(ta, suggestion)
                  ta.dispatchEvent(new Event('input', { bubbles: true }))
                  ta.focus()
                }
              }}
              className="text-left text-xs text-gray-400 bg-gray-800 hover:bg-gray-700
                px-3 py-2 rounded-lg transition-colors border border-gray-700 hover:border-gray-600"
            >
              &quot;{suggestion}&quot;
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
