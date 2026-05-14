export interface TextChunk {
  content: string
  index: number
}

export function chunkText(
  text: string,
  chunkSize = 800,
  overlap = 100
): TextChunk[] {
  const cleaned = text
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  const chunks: TextChunk[] = []
  let start = 0
  let index = 0

  while (start < cleaned.length) {
    let end = Math.min(start + chunkSize, cleaned.length)

    // Prefer breaking at sentence or paragraph boundaries
    if (end < cleaned.length) {
      const lookbackStart = Math.max(end - 150, start)
      const segment = cleaned.slice(lookbackStart, end + 100)

      const newlinePos = segment.lastIndexOf('\n')
      const periodPos = segment.lastIndexOf('. ')

      if (newlinePos > 50) {
        end = lookbackStart + newlinePos + 1
      } else if (periodPos > 50) {
        end = lookbackStart + periodPos + 2
      }
    }

    const content = cleaned.slice(start, end).trim()
    if (content.length > 80) {
      chunks.push({ content, index })
      index++
    }

    // If we've reached the end of the text, stop
    if (end >= cleaned.length) break

    // Ensure we always move forward to prevent infinite loops
    const nextStart = end - overlap
    start = nextStart > start ? nextStart : start + 1
  }

  return chunks
}
