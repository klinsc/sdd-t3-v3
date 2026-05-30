'use client'

import { env } from '@/env'
import { api } from '@/trpc/react'
import { Box, Button, CircularProgress, FilledInput } from '@mui/material'
import { useCallback, useEffect, useRef, useState } from 'react'

// Cap the question client-side. The chat uses EventSource, which can only GET,
// so input_message rides in the URL query string. Thai characters expand to
// ~9 bytes each once percent-encoded, so a long Thai question can exceed the
// server/proxy request-URL limit (e.g. nginx's 8 KB default) and fail before
// it reaches the API. MAX_ENCODED_LEN is the real guard; MAX_INPUT_CHARS is a
// coarse character cap on the input field.
const MAX_INPUT_CHARS = 1000
const MAX_ENCODED_LEN = 6000

type ChatMessage = {
  type: 'ai_chunk' | 'tool_message' | 'error'
  content: string
  metadata?: any
  name?: string
}

export default function SubstationChat() {
  const [currentEventSource, setCurrentEventSource] =
    useState<EventSource | null>(null)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [question, setQuestion] = useState('')
  const aiResponseRef = useRef('')
  // tracks whether the current turn ended cleanly (stream_end) vs. errored —
  // gates persistence and distinguishes a dropped connection from a clean close
  const streamOkRef = useRef(false)
  // state: is server ready to receive messages
  const [isReady, setIsReady] = useState<boolean | undefined>()
  // state: is connection established
  const [isConnected, setIsConnected] = useState(false)
  // status of the current turn — drives the activity animation
  const [status, setStatus] = useState<
    'idle' | 'connecting' | 'thinking' | 'streaming' | 'done' | 'error'
  >('idle')
  // elapsed seconds for the in-flight turn (cold model loads can take ~60s)
  const [elapsedSec, setElapsedSec] = useState(0)
  const startTimeRef = useRef(0)
  const isBusy =
    status === 'connecting' || status === 'thinking' || status === 'streaming'

  // trcp: chat create
  const createChat = api.chat.create.useMutation()

  // Check if server is ready
  useEffect(() => {
    const checkServerReady = async () => {
      try {
        // const response = await fetch('/api/proxy-sse?token=jessica')
        // timeout to avoid long waits
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 seconds timeout

        const response = await fetch(
          `${env.NEXT_PUBLIC_REVERSE_URL ?? ''}/api/proxy-sse?token=jessica`,
          {
            method: 'HEAD', // Use HEAD to check server status without body
            headers: {
              'Content-Type': 'application/json',
            },
            signal: controller.signal,
          },
        )
        clearTimeout(timeoutId)

        if (response.ok) {
          setIsReady(true)
        } else {
          console.error('Server not ready:', response.statusText)
          setIsReady(false)
        }
      } catch (error) {
        console.error('Error checking server readiness:', error)
        setIsReady(false)
      }
    }

    checkServerReady()
  }, [])

  // Helper to append messages
  const appendMessage = (msg: ChatMessage) => {
    setChatMessages((prev) => [...prev, msg])
  }

  // Tick an elapsed-time counter while a turn is in flight, so the long wait
  // before the first token (retrieval + cold model load) feels responsive.
  useEffect(() => {
    if (!isBusy) return
    const id = setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - startTimeRef.current) / 1000))
    }, 250)
    return () => clearInterval(id)
  }, [isBusy])

  // Start SSE connection
  const startEventSource = (inputMessage: string) => {
    if (currentEventSource) currentEventSource.close()
    setChatMessages([]) // Optionally clear chat on new message
    aiResponseRef.current = ''
    streamOkRef.current = false
    setStatus('connecting')

    const encodedInput = encodeURIComponent(inputMessage)

    // Create a new EventSource connection
    const eventSource = new EventSource(
      `${env.NEXT_PUBLIC_REVERSE_URL ?? ''}/api/proxy-sse?input_message=${encodedInput}&token=jessica`,
    )

    eventSource.onopen = function () {
      console.log('EventSource connection opened')
      setIsConnected(true)
      setStatus('thinking')
    }

    eventSource.addEventListener('message_chunk', function (event) {
      const data = JSON.parse(event.data)
      if (data.type === 'ai_chunk') {
        setStatus('streaming')
        aiResponseRef.current += data.content
        // Replace the last AI chunk or add new
        setChatMessages((prev) => {
          const last = prev[prev.length - 1]
          if (last && last.type === 'ai_chunk') {
            return [
              ...prev.slice(0, -1),
              {
                ...last,
                content: aiResponseRef.current,
                metadata: data.metadata,
              },
            ]
          }
          return [
            ...prev,
            {
              type: 'ai_chunk',
              content: aiResponseRef.current,
              metadata: data.metadata,
            },
          ]
        })
      }
    })

    eventSource.addEventListener('tool_message', function (event) {
      const data = JSON.parse(event.data)
      appendMessage({
        type: 'tool_message',
        content: data.content,
        name: data.name,
        metadata: data.metadata,
      })
    })

    eventSource.addEventListener(
      'end_of_ai_response',
      function (event) {
        // Optionally handle metadata from end_of_ai_response
        aiResponseRef.current = ''
      },
    )

    eventSource.addEventListener('stream_end', function () {
      streamOkRef.current = true
      setStatus('done')
      eventSource.close()
      setIsConnected(false)
    })

    // Both an in-band `event: error` (JSON {type,code,message} from the proxy
    // or backend, e.g. llm_timeout) and a transport-level connection failure
    // dispatch as the "error" event type. Distinguish them by whether a JSON
    // data payload is present, and surface a Thai message either way.
    eventSource.addEventListener('error', function (event) {
      const data = (event as MessageEvent)?.data
      if (typeof data === 'string' && data) {
        let content = 'เกิดข้อผิดพลาดในการประมวลผล กรุณาลองใหม่อีกครั้ง'
        try {
          content = JSON.parse(data)?.message || content
        } catch {
          /* keep the generic message */
        }
        appendMessage({ type: 'error', content })
      } else if (!streamOkRef.current) {
        // Data-less error on an unfinished stream = connection dropped.
        appendMessage({
          type: 'error',
          content: 'การเชื่อมต่อกับเซิร์ฟเวอร์ขัดข้อง กรุณาลองใหม่อีกครั้ง',
        })
      }
      setStatus('error')
      eventSource.close()
      setIsConnected(false)
    })

    setCurrentEventSource(eventSource)
  }

  // callback: create chat message after end_of_ai_response
  const handleCreateChat = useCallback(() => {
    if (
      streamOkRef.current &&
      question &&
      aiResponseRef.current &&
      aiResponseRef.current ==
        chatMessages[chatMessages.length - 1]?.content
    ) {
      createChat.mutate({
        incomingMessage: question,
        outgoingMessage: aiResponseRef.current,
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question, chatMessages])

  // effect: on connection established, create chat message
  useEffect(() => {
    if (!isConnected && question) {
      // Create a chat message when connection is established
      handleCreateChat()
    }
  }, [isConnected, question, handleCreateChat])

  // Handle send button
  const handleSend = () => {
    if (isBusy) return
    const trimmed = input.trim()
    if (!trimmed) return
    if (
      trimmed.length > MAX_INPUT_CHARS ||
      encodeURIComponent(trimmed).length > MAX_ENCODED_LEN
    ) {
      setQuestion(trimmed)
      setChatMessages([
        {
          type: 'error',
          content:
            'คำถามยาวเกินไป กรุณาพิมพ์ให้สั้นลง (ข้อความภาษาไทยที่ยาวจะใช้พื้นที่มากเป็นพิเศษ)',
        },
      ])
      setInput('')
      setStatus('idle')
      return
    }
    startTimeRef.current = Date.now()
    setElapsedSec(0)
    startEventSource(trimmed)
    setInput('')
    setQuestion(trimmed) // Store the question
  }

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (currentEventSource) currentEventSource.close()
    }
  }, [currentEventSource])

  return (
    <>
      {/* Display loading state while checking server readiness */}
      {isReady === true && (
        <Box
          sx={{
            width: '100%',
            '& .actions': {
              color: 'text.secondary',
            },
            '& .textPrimary': {
              color: 'text.primary',
            },
          }}>
          <div
            id="chat-display"
            style={{
              whiteSpace: 'pre-wrap',
              minHeight: 100,
              marginBottom: 8,
              // border: '1px solid #ccc',
              padding: 8,
              overflowY: 'auto',
              maxHeight: 400,
              borderRadius: 4,
            }}>
            {/* Display welcome message */}
            {!question && (
              <div className="textPrimary">
                <b>ถามอะไรตอบได้!</b>
              </div>
            )}

            {/* Display Question */}
            {question && (
              <div>
                <b>คำถาม:</b> {question}
              </div>
            )}

            {/* Display AI Responses */}
            {chatMessages.map((msg, idx) =>
              msg.type === 'ai_chunk' ? (
                <div key={idx}>
                  <b>น้องกอฟ:</b> {msg.content}
                  {idx === chatMessages.length - 1 &&
                    status === 'streaming' && (
                      <Box
                        component="span"
                        sx={{
                          display: 'inline-block',
                          ml: '2px',
                          '@keyframes blink': {
                            '0%, 100%': { opacity: 1 },
                            '50%': { opacity: 0 },
                          },
                          animation: 'blink 1s step-start infinite',
                        }}>
                        ▍
                      </Box>
                    )}
                </div>
              ) : msg.type === 'error' ? (
                <div key={idx} style={{ color: 'red', marginTop: 4 }}>
                  <b>⚠️</b> {msg.content}
                </div>
              ) : (
                <></>
                // <div key={idx} style={{ color: '#888' }}>
                //   <i>
                //     Tool Executed: {msg.content}{' '}
                //     {msg.name && `(${msg.name})`}
                //   </i>
                // </div>
              ),
            )}

            {/* Activity animation: shown after send, before the first token
                (covers retrieval + cold model load). */}
            {(status === 'connecting' || status === 'thinking') && (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  mt: 1,
                  color: 'text.secondary',
                  fontStyle: 'italic',
                }}>
                <CircularProgress size={16} thickness={5} />
                <span>
                  <b>น้องกอฟ</b>{' '}
                  {elapsedSec < 4
                    ? 'กำลังค้นหาเอกสารมาตรฐาน'
                    : 'กำลังเรียบเรียงคำตอบ'}
                </span>
                <Box
                  component="span"
                  sx={{
                    display: 'inline-flex',
                    gap: '2px',
                    '@keyframes dotPulse': {
                      '0%, 80%, 100%': { opacity: 0.2 },
                      '40%': { opacity: 1 },
                    },
                    '& > span': { animation: 'dotPulse 1.2s infinite' },
                    '& > span:nth-of-type(2)': { animationDelay: '0.2s' },
                    '& > span:nth-of-type(3)': { animationDelay: '0.4s' },
                  }}>
                  <span>.</span>
                  <span>.</span>
                  <span>.</span>
                </Box>
                <Box
                  component="span"
                  sx={{ ml: 'auto', fontSize: 12, opacity: 0.7 }}>
                  {elapsedSec}s
                </Box>
              </Box>
            )}
          </div>
          <FilledInput
            id="message-input"
            placeholder="Type your message here..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSend()
            }}
            fullWidth
            inputProps={{ maxLength: MAX_INPUT_CHARS }}
            sx={{ marginBottom: 2 }}
            endAdornment={
              <Button
                variant="contained"
                color="primary"
                onClick={handleSend}
                disabled={isBusy}
                sx={{ marginLeft: 1, width: 100 }}>
                {isBusy ? (
                  <CircularProgress size={20} color="inherit" />
                ) : (
                  'ส่งคำถาม'
                )}
              </Button>
            }
          />
        </Box>
      )}

      {/* Display error if server is not ready */}
      {isReady === false && (
        <div style={{ color: 'red' }}>
          เซิร์ฟเวอร์ไม่พร้อมใช้งาน กรุณาลองใหม่ภายหลัง
        </div>
      )}

      {/* Display loading state while checking server readiness */}
      {isReady === undefined && (
        <div style={{ color: 'blue' }}>
          กำลังตรวจสอบสถานะเซิร์ฟเวอร์...
        </div>
      )}
    </>
  )
}
