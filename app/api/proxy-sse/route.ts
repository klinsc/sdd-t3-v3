// app/api/proxy-sse/route.ts
import { env } from '@/env'
import { NextRequest } from 'next/server'

export const runtime = 'nodejs' // Node runtime so we can stream the upstream body
export const dynamic = 'force-dynamic' // never cache the SSE stream

const FASTAPI_URL = env.NEXT_PUBLIC_FASTAPI_URL.replace(/\/+$/, '')

const SSE_HEADERS = {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache',
  Connection: 'keep-alive',
  'X-Accel-Buffering': 'no', // disable proxy buffering (nginx, etc.)
} as const

/**
 * A one-shot SSE stream that emits a single `error` event followed by
 * `stream_end`, so the browser's EventSource closes cleanly. EventSource
 * cannot read a non-2xx body, so we surface failures as in-band SSE events
 * over a 200 response instead.
 */
function errorStream(code: string, message: string): Response {
  const body =
    `event: error\ndata: ${JSON.stringify({ type: 'error', code, message })}\n\n` +
    `event: stream_end\ndata: {}\n\n`
  return new Response(body, { status: 200, headers: SSE_HEADERS })
}

/**
 * GET /api/proxy-sse?input_message=...&session_id=...
 *
 * The browser connects with EventSource, which can only issue a GET and
 * cannot set custom headers. We translate that into the backend contract:
 * POST /qa/stream with the shared X-API-Key header and a JSON body, then
 * stream the SSE response straight back to the browser.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const inputMessage = searchParams.get('input_message')?.trim()
  const sessionId = searchParams.get('session_id') ?? undefined

  if (!inputMessage) {
    return errorStream('bad_request', 'input_message is required')
  }

  let upstream: Response
  try {
    upstream = await fetch(`${FASTAPI_URL}/qa/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': env.FASTAPI_API_KEY,
        Accept: 'text/event-stream',
      },
      body: JSON.stringify({
        input_message: inputMessage,
        session_id: sessionId,
      }),
      // Forward the browser's disconnect: when the EventSource closes, Next
      // aborts req.signal, which aborts this fetch and drops the upstream
      // socket, so FastAPI's request.is_disconnected() fires and generation
      // stops instead of leaving a zombie LLM run occupying the GPU.
      signal: req.signal,
      // Don't buffer the upstream stream.
      cache: 'no-store',
    })
  } catch (err) {
    // Client went away mid-flight — there's nothing to stream back to.
    if (req.signal.aborted || (err as Error)?.name === 'AbortError') {
      return new Response(null, { status: 499 })
    }
    return errorStream(
      'upstream_unreachable',
      `ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้: ${(err as Error).message}`,
    )
  }

  if (!upstream.ok || !upstream.body) {
    const detail = await upstream.text().catch(() => '')
    return errorStream(
      'upstream_error',
      `[HTTP ${upstream.status}] ${detail || upstream.statusText}`,
    )
  }

  return new Response(upstream.body, { status: 200, headers: SSE_HEADERS })
}

/**
 * HEAD /api/proxy-sse — readiness probe the chat UI runs before opening the
 * stream. Reports ready (200) only when the backend's /healthz says so; any
 * unreachable/not-ready state maps to 503 so the UI shows its error state.
 */
export async function HEAD() {
  try {
    const res = await fetch(`${FASTAPI_URL}/healthz`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    })
    if (!res.ok) return new Response(null, { status: 503 })
    const data = (await res.json().catch(() => null)) as {
      ready?: boolean
    } | null
    return new Response(null, { status: data?.ready ? 200 : 503 })
  } catch {
    return new Response(null, { status: 503 })
  }
}
