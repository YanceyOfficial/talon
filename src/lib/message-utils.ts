/**
 * Message utility functions for processing OpenClaw messages
 */

import type { ChatHistoryMessage } from '@/types/gateway'
import {
  type ContentBlock,
  MessageRole,
  type OpenClawMessage
} from '@/types/openclaw'

/**
 * Extract plain text from message content (string or content blocks).
 * Used internally in hooks for streaming updates.
 */
export function extractText(content: unknown): string {
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    return content
      .map((block: { type?: string; text?: string; thinking?: string }) => {
        if (block.type === 'text' && block.text) return block.text
        if (block.type === 'thinking' && block.thinking) return block.thinking
        return ''
      })
      .filter(Boolean)
      .join('\n')
  }
  return ''
}

/**
 * Extract text content from message content for display purposes.
 * Handles thinking blocks with a prefix label.
 */
export function extractTextContent(
  content: string | ContentBlock[] | unknown
): string {
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    return content
      .map((block) => {
        if (typeof block === 'object' && block !== null) {
          const typedBlock = block as {
            type?: string
            text?: string
            thinking?: string
          }
          if (typedBlock.type === 'text' && typedBlock.text)
            return typedBlock.text
          if (typedBlock.type === 'thinking' && typedBlock.thinking)
            return `[Thinking: ${typedBlock.thinking}]`
          if ('text' in typedBlock && typedBlock.text) return typedBlock.text
        }
        return ''
      })
      .filter(Boolean)
      .join('\n\n')
  }
  return ''
}

/**
 * Update or append a streaming assistant message.
 */
export function updateAssistantMessage(
  prevMessages: OpenClawMessage[],
  content: string,
  isFinal = false
): OpenClawMessage[] {
  const lastMsg = prevMessages[prevMessages.length - 1]
  const isLastAssistantStreaming =
    lastMsg && lastMsg.role === MessageRole.ASSISTANT && !lastMsg.isFinal

  if (isLastAssistantStreaming) {
    return [...prevMessages.slice(0, -1), { ...lastMsg, content, isFinal }]
  } else if (content) {
    return [
      ...prevMessages,
      { role: MessageRole.ASSISTANT, content, timestamp: Date.now(), isFinal }
    ]
  }
  return prevMessages
}

/**
 * Mark the last streaming assistant message as final.
 */
export function markLastMessageFinal(
  prevMessages: OpenClawMessage[]
): OpenClawMessage[] {
  const lastMsg = prevMessages[prevMessages.length - 1]
  if (lastMsg && lastMsg.role === MessageRole.ASSISTANT && !lastMsg.isFinal) {
    return [...prevMessages.slice(0, -1), { ...lastMsg, isFinal: true }]
  }
  return prevMessages
}

/**
 * Convert raw Gateway chat history messages to OpenClawMessage format.
 */
export function convertHistoryMessages(
  messages: ChatHistoryMessage[]
): OpenClawMessage[] {
  return messages.map((msg) => ({
    role: msg.role as MessageRole,
    content: msg.content as string | ContentBlock[],
    timestamp: msg.timestamp || Date.now(),
    isFinal: true,
    toolCallId: msg.toolCallId,
    toolName: msg.toolName,
    details: msg.details,
    isError: msg.isError,
    api: msg.api,
    provider: msg.provider,
    model: msg.model,
    usage: msg.usage,
    stopReason: msg.stopReason
  }))
}
