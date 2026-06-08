'use client'

import { env } from '@/env'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import MemoryIcon from '@mui/icons-material/Memory'
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Chip,
  Divider,
  LinearProgress,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material'
import { useEffect, useRef, useState } from 'react'

// The backend snapshot is cheap (~5–10 ms) and not rate-limited, so a few-second
// poll is fine. We pause entirely while the tab is hidden to avoid waste.
const POLL_MS = 3000

// Mirror of the FastAPI StatsResponse (app/routers/stats.py).
type CpuStats = { percent: number; count: number }
type MemoryStats = { used_gb: number; total_gb: number; percent: number }
type GpuStats = {
  index: number
  name: string
  utilization_percent: number
  memory_used_gb: number
  memory_total_gb: number
  memory_percent: number
  temperature_c: number | null
}
type StatsResponse = {
  cpu: CpuStats
  memory: MemoryStats
  gpus: GpuStats[]
  llm_profile: string
  llm_model: string
  embedding_profile: string
  embedding_model: string
  retrieval_k: number
  retrieval_score_threshold: number
}

// Green under light load, amber as it fills, red when saturated.
function barColor(pct: number): 'success' | 'warning' | 'error' {
  if (pct >= 90) return 'error'
  if (pct >= 70) return 'warning'
  return 'success'
}

function Metric({
  label,
  detail,
  percent,
}: {
  label: string
  detail: string
  percent: number
}) {
  const value = Math.min(100, Math.max(0, percent))
  return (
    <Box sx={{ mb: 1.25 }}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          mb: 0.25,
        }}>
        <Typography variant="caption" sx={{ fontWeight: 600 }}>
          {label}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {detail}
        </Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={value}
        color={barColor(percent)}
        sx={{ height: 6, borderRadius: 3 }}
      />
    </Box>
  )
}

export default function SystemStats() {
  const [data, setData] = useState<StatsResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let cancelled = false
    let controller: AbortController | null = null
    const base = env.NEXT_PUBLIC_REVERSE_URL ?? ''

    const schedule = () => {
      if (cancelled) return
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(tick, POLL_MS)
    }

    const tick = async () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      // Don't poll a tab nobody is looking at; resume on visibilitychange.
      if (typeof document !== 'undefined' && document.hidden) {
        schedule()
        return
      }
      controller = new AbortController()
      try {
        const res = await fetch(`${base}/api/stats`, {
          signal: controller.signal,
          cache: 'no-store',
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = (await res.json()) as StatsResponse
        if (!cancelled) {
          setData(json)
          setError(null)
        }
      } catch (e) {
        if (!cancelled && (e as Error).name !== 'AbortError') {
          setError((e as Error).message)
        }
      } finally {
        schedule()
      }
    }

    // Becoming visible again: refresh immediately instead of waiting a full tick.
    const onVisible = () => {
      if (!document.hidden) void tick()
    }
    document.addEventListener('visibilitychange', onVisible)

    void tick()

    return () => {
      cancelled = true
      if (timerRef.current) clearTimeout(timerRef.current)
      controller?.abort()
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  // Compact one-liner shown in the collapsed header so a glance is enough.
  const summary = data
    ? `CPU ${data.cpu.percent.toFixed(0)}% · RAM ${data.memory.percent.toFixed(0)}%` +
      (data.gpus[0]
        ? ` · GPU ${data.gpus[0].utilization_percent.toFixed(0)}%`
        : '')
    : error
      ? 'ไม่พร้อมใช้งาน'
      : 'กำลังโหลด…'

  // Connection dot: green = live, red = error, grey = first load.
  const dotColor = error
    ? 'error.main'
    : data
      ? 'success.main'
      : 'text.disabled'

  return (
    <Accordion
      disableGutters
      sx={{
        mt: 1,
        bgcolor: 'transparent',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        '&:before': { display: 'none' },
      }}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            width: '100%',
            flexWrap: 'wrap',
          }}>
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              bgcolor: dotColor,
              flexShrink: 0,
            }}
          />
          <MemoryIcon fontSize="small" sx={{ color: 'text.secondary' }} />
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            สถานะระบบเซิร์ฟเวอร์
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ ml: 'auto' }}>
            {summary}
          </Typography>
        </Box>
      </AccordionSummary>

      <AccordionDetails>
        {error && !data ? (
          <Typography variant="body2" color="error.main">
            ไม่สามารถดึงข้อมูลสถานะระบบได้ในขณะนี้
          </Typography>
        ) : data ? (
          <>
            <Metric
              label="CPU (หน่วยประมวลผล)"
              detail={`${data.cpu.percent.toFixed(0)}% · ${data.cpu.count} cores`}
              percent={data.cpu.percent}
            />
            <Metric
              label="RAM (หน่วยความจำ)"
              detail={`${data.memory.used_gb.toFixed(1)} / ${data.memory.total_gb.toFixed(1)} GB · ${data.memory.percent.toFixed(0)}%`}
              percent={data.memory.percent}
            />

            {data.gpus.length === 0 ? (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: 'block', mt: 0.5 }}>
                ไม่พบ GPU (NVIDIA) บนเครื่องนี้
              </Typography>
            ) : (
              data.gpus.map((g) => (
                <Box key={g.index} sx={{ mt: 1.5 }}>
                  <Typography
                    variant="caption"
                    sx={{ fontWeight: 700, display: 'block', mb: 0.5 }}>
                    GPU {g.index}: {g.name}
                    {g.temperature_c != null
                      ? ` · ${g.temperature_c.toFixed(0)}°C`
                      : ''}
                  </Typography>
                  <Metric
                    label="GPU การใช้งาน"
                    detail={`${g.utilization_percent.toFixed(0)}%`}
                    percent={g.utilization_percent}
                  />
                  <Metric
                    label="VRAM (หน่วยความจำการ์ดจอ)"
                    detail={`${g.memory_used_gb.toFixed(1)} / ${g.memory_total_gb.toFixed(1)} GB · ${g.memory_percent.toFixed(0)}%`}
                    percent={g.memory_percent}
                  />
                </Box>
              ))
            )}

            <Divider sx={{ my: 1.5 }} />

            <Typography
              variant="caption"
              sx={{ fontWeight: 700, display: 'block', mb: 0.75 }}>
              โมเดลและการตั้งค่า
            </Typography>
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
              <Tooltip title={`profile: ${data.llm_profile}`}>
                <Chip size="small" label={`LLM · ${data.llm_model}`} />
              </Tooltip>
              <Tooltip title={`profile: ${data.embedding_profile}`}>
                <Chip
                  size="small"
                  label={`Embedding · ${data.embedding_model}`}
                />
              </Tooltip>
              <Chip
                size="small"
                variant="outlined"
                label={`retrieval k=${data.retrieval_k}`}
              />
              <Chip
                size="small"
                variant="outlined"
                label={`score ≥ ${data.retrieval_score_threshold.toFixed(2)}`}
              />
            </Stack>

            {error && (
              <Typography
                variant="caption"
                color="warning.main"
                sx={{ display: 'block', mt: 1 }}>
                อัปเดตล่าสุดไม่สำเร็จ กำลังลองใหม่…
              </Typography>
            )}
          </>
        ) : (
          <LinearProgress />
        )}
      </AccordionDetails>
    </Accordion>
  )
}
