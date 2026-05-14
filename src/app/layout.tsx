import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'DocChat — Local RAG',
  description: 'Chat with your documents locally using Ollama',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
