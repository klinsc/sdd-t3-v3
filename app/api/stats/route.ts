// app/api/stats/route.ts
import { env } from '@/env'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs' // Node runtime, consistent with the SSE proxy
export const dynamic = 'force-dynamic' // never cache — this is a live snapshot

const FASTAPI_URL = env.NEXT_PUBLIC_FASTAPI_URL.replace(/\/+$/, '')

/**
 * GET /api/stats — proxies the backend's GET /stats, attaching the shared
 * X-API-Key header server-side so the secret never reaches the browser (same
 * reason /api/proxy-sse exists). The chat page polls this for a live CPU / RAM /
 * GPU snapshot plus the active model + retrieval config.
 *
 * Failures are returned as JSON with a non-2xx status; the widget renders an
 * "unavailable" state rather than crashing.
 */
export async function GET(req: NextRequest) {
  try {
    const upstream = await fetch(`${FASTAPI_URL}/stats`, {
      method: 'GET',
      headers: {
        'X-API-Key': env.FASTAPI_API_KEY,
        Accept: 'application/json',
      },
      // Drop the upstream request if the browser navigates away mid-poll.
      signal: req.signal,
      cache: 'no-store',
    })

    if (!upstream.ok) {
      const detail = await upstream.text().catch(() => '')
      return NextResponse.json(
        { error: 'upstream_error', status: upstream.status, detail },
        { status: 502, headers: { 'Cache-Control': 'no-store' } },
      )
    }

    const data: unknown = await upstream.json()
    return NextResponse.json(data, {
      status: 200,
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (err) {
    // Client went away mid-flight — nothing to return.
    if (req.signal.aborted || (err as Error)?.name === 'AbortError') {
      return new NextResponse(null, { status: 499 })
    }
    return NextResponse.json(
      { error: 'upstream_unreachable', message: (err as Error).message },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}
