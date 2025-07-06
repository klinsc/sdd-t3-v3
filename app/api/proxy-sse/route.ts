// app/api/proxy-sse/route.ts
import { env } from '@/env'
import { NextRequest } from 'next/server'

export const runtime = 'nodejs' // Ensures streaming works

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const input_message = searchParams.get('input_message')
  const token = searchParams.get('token')

  const targetUrl = `${env.NEXT_PUBLIC_FASTAPI_URL}/qa/stream?input_message=${encodeURIComponent(input_message || '')}&token=${encodeURIComponent(token || '')}`

  const response = await fetch(targetUrl, {
    method: 'GET',
    headers: {
      Accept: 'text/event-stream',
    },
  })

  // Stream the response directly to the client
  return new Response(response.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
