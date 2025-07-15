'use client'

import { env } from '@/env'
import { api } from '@/trpc/react'
import { Box, Button, FilledInput } from '@mui/material'
import { useCallback, useEffect, useRef, useState } from 'react'

type ChatMessage = {
  type: 'ai_chunk' | 'tool_message'
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
  // state: is server ready to receive messages
  const [isReady, setIsReady] = useState<boolean | undefined>()
  // state: is connection established
  const [isConnected, setIsConnected] = useState(false)

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

  // Start SSE connection
  const startEventSource = (inputMessage: string) => {
    if (currentEventSource) currentEventSource.close()
    setChatMessages([]) // Optionally clear chat on new message
    aiResponseRef.current = ''

    const encodedInput = encodeURIComponent(inputMessage)

    // Create a new EventSource connection
    const eventSource = new EventSource(
      `${env.NEXT_PUBLIC_REVERSE_URL ?? ''}/api/proxy-sse?input_message=${encodedInput}&token=jessica`,
    )

    eventSource.onopen = function () {
      console.log('EventSource connection opened')
      setIsConnected(true)
    }

    eventSource.addEventListener('message_chunk', function (event) {
      const data = JSON.parse(event.data)
      if (data.type === 'ai_chunk') {
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
      eventSource.close()

      setIsConnected(false)
    })

    eventSource.onerror = function (error) {
      console.error('EventSource failed:', error)
      eventSource.close()

      setIsConnected(false)
    }

    setCurrentEventSource(eventSource)
  }

  // callback: create chat message after end_of_ai_response
  const handleCreateChat = useCallback(() => {
    if (
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
    if (input.trim()) {
      startEventSource(input)
      setInput('')
      setQuestion(input) // Store the question
    }
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
            sx={{ marginBottom: 2 }}
            endAdornment={
              <Button
                variant="contained"
                color="primary"
                onClick={handleSend}
                sx={{ marginLeft: 1, width: 100 }}>
                ส่งคำถาม
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
