import { NextResponse } from 'next/server'
import { checkStatus } from '@/lib/ai'

export async function GET() {
  const status = await checkStatus()
  return NextResponse.json(status)
}
