import { NextResponse } from 'next/server'
import { checkStatus } from '@/lib/ai'

export async function GET() {
  const status = await checkStatus()
  return NextResponse.json({
    ...status,
    hasGroqKey: !!process.env.GROQ_API_KEY,
    hasHfKey: !!process.env.HUGGINGFACE_API_KEY,
    hasUpstash: !!process.env.UPSTASH_REDIS_REST_URL,
  })
}
