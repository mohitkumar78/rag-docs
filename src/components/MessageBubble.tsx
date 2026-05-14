'use client'

import { useState } from 'react'

export interface Source {
  docName: string
  content: string
  score: number
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources?: Source[]
  isStreaming?: boolean
}

interface Props {
  message: Message
}

export default function MessageBubble({ message }: Props) {
  const [showSources, setShowSources] = useState(false)
  const isUser = message.role === 'user'

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      <div
        className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
          ${isUser ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-200'}`}
      >
        {isUser ? 'U' : 'AI'}
      </div>

      {/* Bubble */}
      <div className={`max-w-[80%] ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
        <div
          className={`px-4 py-3 rounded-2xl text-sm leading-relaxed
            ${isUser
              ? 'bg-indigo-600 text-white rounded-tr-sm'
              : 'bg-gray-800 text-gray-100 rounded-tl-sm'
            }`}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div
              className="prose-answer"
              dangerouslySetInnerHTML={{
                __html: formatMarkdown(message.content),
              }}
            />
          )}

          {/* Streaming cursor */}
          {message.isStreaming && (
            <span className="inline-block w-1.5 h-4 bg-gray-400 animate-pulse ml-0.5 align-middle rounded-sm" />
          )}
        </div>

        {/* Sources */}
        {!isUser && message.sources && message.sources.length > 0 && !message.isStreaming && (
          <div className="w-full">
            <button
              onClick={() => setShowSources((v) => !v)}
              className="text-xs text-gray-500 hover:text-gray-300 transition-colors flex items-center gap-1 mt-1"
            >
              <svg
                className={`w-3 h-3 transition-transform ${showSources ? 'rotate-90' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              {message.sources.length} source{message.sources.length > 1 ? 's' : ''} used
            </button>

            {showSources && (
              <div className="mt-2 space-y-2">
                {message.sources.map((src, i) => (
                  <div
                    key={i}
                    className="bg-gray-900 border border-gray-700 rounded-lg p-3 text-xs"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-indigo-400 font-medium truncate">
                        📄 {src.docName}
                      </span>
                      <span className="text-gray-500 shrink-0 ml-2">
                        {Math.round(src.score * 100)}% match
                      </span>
                    </div>
                    <p className="text-gray-400 leading-relaxed">{src.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function formatMarkdown(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^### (.+)$/gm, '<h3 class="text-base font-semibold mt-3 mb-1 text-white">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-lg font-semibold mt-3 mb-1 text-white">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-xl font-bold mt-3 mb-1 text-white">$1</h1>')
    .replace(/^\s*[-*] (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
    .replace(/\n{2,}/g, '</p><p>')
    .replace(/^(?!<[h|u|o|l|p|c])(.*)/gm, (match) =>
      match ? match : ''
    )
    .replace(/^(.+?)(<\/p>|$)/gm, (_, p) =>
      p.startsWith('<') ? _ : `<p>${p}</p>`
    )
}
