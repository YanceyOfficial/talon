/**
 * Message Bubble Component
 * Renders different types of message content (text, thinking, toolCall, toolResult)
 */

import { Markdown } from '@/components/markdown'
import { extractTextContent } from '@/lib/message-utils'
import {
  MessageRole,
  type ContentBlock,
  type OpenClawMessage
} from '@/types/openclaw'
import { Brain, CheckCircle, Wrench, XCircle } from 'lucide-react'

interface MessageBubbleProps {
  message: OpenClawMessage
}

export function MessageBubble({ message }: MessageBubbleProps) {
  // User message
  if (message.role === MessageRole.USER || message.role === 'user') {
    const textContent = extractTextContent(message.content)

    return (
      <div className="flex justify-end">
        <div className="bg-card border-border max-w-[85%] rounded-lg border px-4 py-3 text-sm">
          <Markdown content={textContent} />
        </div>
      </div>
    )
  }

  // Tool result message
  if (
    message.role === MessageRole.TOOL_RESULT ||
    message.role === 'toolResult'
  ) {
    const resultText = extractTextContent(message.content)
    const INLINE_THRESHOLD = 80
    const PREVIEW_MAX_CHARS = 80

    // Determine display mode
    const isInline = resultText.length <= INLINE_THRESHOLD
    const isEmpty = !resultText.trim()

    return (
      <div className="flex justify-start">
        <div className="border-border bg-muted/30 max-w-[85%] rounded-lg border px-3 py-2">
          <div className="text-muted-foreground mb-1 flex items-center gap-2 text-xs font-medium">
            <Wrench className="h-3.5 w-3.5" />
            <span>{message.toolName}</span>
            {message.isError ? (
              <XCircle className="text-destructive h-3.5 w-3.5" />
            ) : (
              <CheckCircle className="h-3.5 w-3.5 text-green-600" />
            )}
          </div>

          {isEmpty ? (
            <div className="text-muted-foreground text-xs">Completed</div>
          ) : isInline ? (
            <pre className="overflow-x-auto text-xs wrap-break-word whitespace-pre-wrap">
              {resultText}
            </pre>
          ) : (
            <details className="group">
              <summary className="text-muted-foreground hover:text-foreground cursor-pointer text-xs">
                {resultText.slice(0, PREVIEW_MAX_CHARS)}
                {resultText.length > PREVIEW_MAX_CHARS && '...'}
                <span className="ml-2 opacity-60 group-open:hidden">
                  ▸ Show more
                </span>
                <span className="ml-2 hidden opacity-60 group-open:inline">
                  ▾ Show less
                </span>
              </summary>
              <div className="mt-2 text-sm">
                <Markdown content={resultText} />
              </div>

              {/* <pre className="bg-background/50 mt-2 overflow-x-auto rounded p-2 text-xs wrap-break-word whitespace-pre-wrap">
                {resultText}
              </pre> */}
            </details>
          )}
        </div>
      </div>
    )
  }

  // Assistant message
  if (message.role === MessageRole.ASSISTANT || message.role === 'assistant') {
    const blocks = Array.isArray(message.content)
      ? (message.content as ContentBlock[])
      : [{ type: 'text' as const, text: message.content as string }]

    return (
      <div className="flex justify-start">
        <div className="max-w-[85%] space-y-3">
          {blocks.map((block, index) => {
            // Thinking block (commented out - internal only)
            if (block.type === 'thinking') {
              return (
                <div
                  key={index}
                  className="rounded-lg border border-purple-200 bg-purple-50 px-4 py-3 dark:border-purple-800 dark:bg-purple-950"
                >
                  <div className="mb-2 flex items-center gap-2 text-sm font-medium text-purple-700 dark:text-purple-300">
                    <Brain className="h-4 w-4" />
                    <span>Thinking</span>
                  </div>
                  <p className="text-sm text-purple-600 dark:text-purple-400">
                    <Markdown content={block.thinking} />
                  </p>
                </div>
              )
            }

            // Tool call block
            if (block.type === 'toolCall') {
              return (
                <div
                  key={index}
                  className="border-border bg-muted/30 rounded-lg border px-3 py-2"
                >
                  <div className="mb-1 flex items-center gap-2 text-xs font-medium">
                    <Wrench className="text-muted-foreground h-3.5 w-3.5" />
                    <span className="text-foreground">{block.name}</span>
                  </div>
                  {Object.keys(block.arguments).length > 0 && (
                    <details className="group">
                      <summary className="text-muted-foreground hover:text-foreground cursor-pointer text-xs">
                        {Object.keys(block.arguments).length} argument
                        {Object.keys(block.arguments).length > 1 ? 's' : ''}
                        <span className="ml-2 opacity-60 group-open:hidden">
                          ▸ Show
                        </span>
                        <span className="ml-2 hidden opacity-60 group-open:inline">
                          ▾ Hide
                        </span>
                      </summary>
                      <pre className="bg-background/50 mt-2 overflow-x-auto rounded p-2 text-xs whitespace-pre-wrap">
                        {JSON.stringify(block.arguments, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              )
            }

            // Text block (markdown)
            if (block.type === 'text' && block.text) {
              return (
                <div
                  key={index}
                  className="bg-muted rounded-lg px-4 py-3 text-sm"
                >
                  <Markdown content={block.text} />
                </div>
              )
            }

            return null
          })}
        </div>
      </div>
    )
  }

  // Fallback for unknown message types
  return (
    <div className="flex justify-start">
      <div className="bg-muted max-w-[85%] rounded-lg px-4 py-3">
        <p className="text-muted-foreground text-sm">
          Unknown message type: {message.role}
        </p>
      </div>
    </div>
  )
}
