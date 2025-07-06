'use client'

import { env } from '@/env'
import Typography from '@mui/material/Typography'
import { useEffect, useRef, useState } from 'react'

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
  const aiResponseRef = useRef('')

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
      `${env.NEXT_PUBLIC_FASTAPI_URL}/qa/stream?input_message=${encodedInput}&token=jessica`,
    )

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
    })

    eventSource.onerror = function (error) {
      console.error('EventSource failed:', error)
      eventSource.close()
    }

    setCurrentEventSource(eventSource)
  }

  // Handle send button
  const handleSend = () => {
    if (input.trim()) {
      startEventSource(input)
      setInput('')
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
      <div
        id="chat-display"
        style={{
          whiteSpace: 'pre-wrap',
          minHeight: 100,
          marginBottom: 8,
          border: '1px solid #ccc',
          padding: 8,
          overflowY: 'auto',
          maxHeight: 400,
          borderRadius: 4,
        }}>
        {chatMessages.map((msg, idx) =>
          msg.type === 'ai_chunk' ? (
            <div key={idx}>
              <b>AI:</b> {msg.content}
            </div>
          ) : (
            <div key={idx} style={{ color: '#888' }}>
              <i>
                Tool Executed: {msg.content}{' '}
                {msg.name && `(${msg.name})`}
              </i>
            </div>
          ),
        )}
      </div>
      <input
        type="text"
        id="message-input"
        placeholder="Type your message here..."
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSend()
        }}
      />
      <button id="send-button" onClick={handleSend}>
        ส่งข้อความ
      </button>
    </>
  )
}
