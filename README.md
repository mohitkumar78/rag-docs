# DocChat — Local RAG

Chat with your documents locally. No API keys, no cloud, no cost. 100% private.

Built with **Next.js 14**, **TypeScript**, **Ollama**, and **Tailwind CSS**.

---

## How it works

```
Your PDF/DOCX/TXT
      ↓
Split into chunks (800 chars each)
      ↓
Convert chunks → vectors via Ollama (nomic-embed-text)
      ↓
Store in local JSON vector database

When you ask a question:
      ↓
Convert question → vector
      ↓
Find top 5 most similar chunks (cosine similarity)
      ↓
Send chunks + question → Ollama (llama3)
      ↓
Stream answer back to you
```

---

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | v18+ | https://nodejs.org |
| Ollama | latest | https://ollama.com |

---

## Quick Start

```bash
# 1. Clone / navigate to project
cd rag-docs

# 2. Run setup (installs deps + pulls Ollama models)
chmod +x setup.sh
./setup.sh

# 3. Start the app
npm run dev

# 4. Open browser
open http://localhost:3000
```

---

## Manual Setup

```bash
# Install dependencies
npm install

# Copy env file
cp .env.local.example .env.local

# Start Ollama (in a separate terminal)
ollama serve

# Pull required models
ollama pull llama3
ollama pull nomic-embed-text

# Start the app
npm run dev
```

---

## Supported File Types

| Format | Extension |
|--------|-----------|
| PDF | `.pdf` |
| Word Document | `.docx` |
| Plain Text | `.txt` |
| Markdown | `.md` |

---

## Environment Variables

Edit `.env.local` to configure:

```env
OLLAMA_URL=http://localhost:11434   # Ollama server URL
LLM_MODEL=llama3                    # Model for chat (llama3, mistral, phi3, gemma2)
EMBEDDING_MODEL=nomic-embed-text    # Model for embeddings
CHUNK_SIZE=800                      # Characters per chunk
CHUNK_OVERLAP=100                   # Overlap between chunks
TOP_K_RESULTS=5                     # Number of chunks retrieved per query
```

### Alternative Models

```bash
# Faster, smaller
ollama pull phi3
# Set LLM_MODEL=phi3

# Better reasoning
ollama pull mistral
# Set LLM_MODEL=mistral

# Larger context
ollama pull llama3:70b
# Set LLM_MODEL=llama3:70b
```

---

## Project Structure

```
rag-docs/
├── src/
│   ├── app/
│   │   ├── page.tsx              # Main UI
│   │   ├── layout.tsx
│   │   └── api/
│   │       ├── upload/route.ts   # File upload & indexing
│   │       ├── chat/route.ts     # RAG query + streaming
│   │       ├── documents/route.ts # List & delete docs
│   │       └── status/route.ts   # Ollama health check
│   ├── lib/
│   │   ├── ollama.ts             # Ollama API client
│   │   ├── vectorStore.ts        # Local JSON vector DB
│   │   ├── chunker.ts            # Text chunking
│   │   └── parser.ts             # PDF/DOCX/TXT parsing
│   └── components/
│       ├── FileUpload.tsx        # Drag & drop upload
│       ├── DocumentList.tsx      # Uploaded docs list
│       └── MessageBubble.tsx     # Chat message + sources
├── data/
│   └── vectorstore.json          # Your indexed documents (auto-created)
├── .env.local                    # Your config
└── setup.sh                      # One-click setup
```

---

## Features

- **Streaming responses** — see the answer as it's generated
- **Source citations** — see exactly which part of which document was used
- **Multi-document** — upload and query across many files at once
- **Drag & drop** upload
- **Delete documents** — removes from index instantly
- **Conversation history** — context-aware follow-up questions
- **Ollama status indicator** — shows if the local model is running
- **Suggested questions** — quick-start prompts when docs are loaded

---

## Upgrade to SaaS

To turn this into a paid product:

1. **Add auth** — NextAuth.js with Google/GitHub login
2. **Per-user storage** — namespace the vector store by `userId`
3. **Deploy** — Vercel (frontend) + VPS with Ollama (backend)
4. **Billing** — Stripe subscription ($5-15/month per user)
5. **Cloud LLM option** — swap Ollama for Claude/GPT for hosted users

---

## License

MIT — free for personal and commercial use.
