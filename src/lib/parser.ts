export async function parseFile(
  buffer: Buffer,
  fileName: string
): Promise<string> {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? ''

  if (ext === 'pdf') {
    const pdfParse = (await import('pdf-parse')).default
    const data = await pdfParse(buffer)
    return data.text
  }

  if (ext === 'docx') {
    const mammoth = await import('mammoth')
    const result = await mammoth.extractRawText({ buffer })
    return result.value
  }

  if (ext === 'txt' || ext === 'md') {
    return buffer.toString('utf-8')
  }

  throw new Error(
    `Unsupported file type: .${ext}. Supported: pdf, docx, txt, md`
  )
}
