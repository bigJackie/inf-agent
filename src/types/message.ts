/**
 * 前端消息类型系统
 * 用于消息列表、Zustand store、FSM 状态管理
 */
import { z } from 'zod'
import { UINode } from '@/src/types/a2ui'
import { TEXT_MESSAGE_ROLES, TextMessageRole } from '@/src/types/agui'
import { Citation, CitationSchema } from '@/src/types/Citation'

export const TOOL_CALL_STATUS = ['pending', 'running', 'success', 'error'] as const
export const UI_STATUS = ['pending', 'rendering', 'done'] as const
export type ToolCallStatus = (typeof TOOL_CALL_STATUS)[number]
export type UISchemaStatus = (typeof UI_STATUS)[number]

// 文本内容 Part
export interface TextPart {
  type: 'text'
  content: string
}

// 工具调用 Part
export interface ToolCallPart {
  type: 'toolCall'
  toolCallId: string
  toolCallName: string
  args: Record<string, unknown> // 已完整解析的参数
  status?: ToolCallStatus
}

// 工具执行结果 Part
export interface ToolResultPart {
  type: 'toolResult'
  toolCallId: string // 关联的工具调用 ID
  content: string // 结果内容（可能是 JSON 字符串）
  error?: boolean // 执行是否失败
  errorMessage?: string
}

// UI Schema Part（GenUI 渲染）
export interface SchemaPart {
  type: 'schema'
  schema: UINode | unknown // UINode
  status?: UISchemaStatus // 渲染状态
}

// 所有 Part 类型的联合
export type MessagePart = TextPart | ToolCallPart | ToolResultPart | SchemaPart

// Zod Schema（运行时校验）
const TextPartSchema = z.object({
  type: z.literal('text'),
  content: z.string(),
})

const ToolCallPartSchema = z.object({
  type: z.literal('toolCall'),
  toolCallId: z.uuid(),
  toolCallName: z.string(),
  args: z.record(z.string(), z.unknown()),
  status: z.enum(TOOL_CALL_STATUS).optional(),
})

const ToolResultPartSchema = z.object({
  type: z.literal('toolResult'),
  toolCallId: z.uuid(),
  content: z.string(),
  error: z.boolean().optional(),
  errorMessage: z.string().optional(),
})

const SchemaPartSchema = z.object({
  type: z.literal('schema'),
  schema: z.unknown(),
  status: z.enum(UI_STATUS).optional(),
})

export const MessagePartSchema = z.discriminatedUnion('type', [
  TextPartSchema,
  ToolCallPartSchema,
  ToolResultPartSchema,
  SchemaPartSchema,
])

/**
 * Message：单条消息的完整结构
 */
export interface Message {
  id: string // 消息 ID（唯一）
  sessionId: string // 所属会话 ID
  role: TextMessageRole // 消息角色：developer / user / assistant / system / tool
  parts: MessagePart[] // 消息各部分
  citations?: Citation[] // 引用元数据
  createdAt: number // 毫秒时间戳
  updatedAt: number

  // 流式处理状态
  streaming?: boolean // 是否还在流式接收
  truncated?: boolean // 是否被截断（超时或出错）
  truncationReason?: string // 截断原因

  // 元数据
  model?: string // 生成该消息的模型名
  tokens?: {
    input: number
    output: number
  }
}

export const MessageSchema = z
  .object({
    id: z.uuid(),
    sessionId: z.uuid(),
    role: z.enum(TEXT_MESSAGE_ROLES),
    parts: z.array(MessagePartSchema),
    citations: z.array(CitationSchema).optional(),
    createdAt: z.number(),
    updatedAt: z.number(),
    streaming: z.boolean().optional(),
    truncated: z.boolean().optional(),
    truncationReason: z.string().optional(),
    model: z.string().optional(),
    tokens: z
      .object({
        input: z.number(),
        output: z.number(),
      })
      .optional(),
  })
  .strict()

export type MessageType = z.infer<typeof MessageSchema>

/**
 * Snapshot：消息快照（用于 FSM rollback）
 */

export interface MessageSnapshot {
  id: string // 快照 ID（timestampId）
  messages: Message[] // 快照时刻的所有消息
  timestamp: number // 快照创建时间
  description?: string // 快照描述（如 'Before tool call'）
}

export const MessageSnapshotSchema = z.object({
  id: z.uuid(),
  messages: z.array(MessageSchema),
  timestamp: z.number(),
  description: z.string().optional(),
})

export type MessageSnapshotType = z.infer<typeof MessageSnapshotSchema>

/**
 * 类型守卫（discriminated union 类型缩小）
 */

export function isTextPart(part: MessagePart): part is TextPart {
  return part.type === 'text'
}

export function isToolCallPart(part: MessagePart): part is ToolCallPart {
  return part.type === 'toolCall'
}

export function isToolResultPart(part: MessagePart): part is ToolResultPart {
  return part.type === 'toolResult'
}

export function isSchemaPart(part: MessagePart): part is SchemaPart {
  return part.type === 'schema'
}

/**
 * 创建新消息
 */
export function createMessage(
  id: string,
  sessionId: string,
  role: TextMessageRole,
  parts: MessagePart[] = [],
  citations: Citation[] = [],
): Message {
  const now = Date.now()
  return {
    id,
    sessionId,
    role,
    parts,
    citations: citations.length > 0 ? citations : undefined,
    createdAt: now,
    updatedAt: now,
    streaming: true,
  }
}

/**
 * 创建文本 Part
 */
export function createTextPart(content: string): TextPart {
  return { type: 'text', content }
}

/**
 * 创建工具调用 Part
 */
export function createToolCallPart(
  toolCallId: string,
  toolCallName: string,
  args: Record<string, unknown> = {},
): ToolCallPart {
  return {
    type: 'toolCall',
    toolCallId,
    toolCallName,
    args,
    status: 'pending',
  }
}

/**
 * 创建工具结果 Part
 */
export function createToolResultPart(
  toolCallId: string,
  content: string,
  error = false,
): ToolResultPart {
  return {
    type: 'toolResult',
    toolCallId,
    content,
    error,
  }
}

/**
 * 创建引用 Part
 */
export function createCitation(
  index: number,
  chunkId: string,
  documentId: string,
  source: string,
  chunk: string,
  score: number,
): Citation {
  return {
    id: `cite-${Date.now()}-${index}`,
    index,
    chunkId,
    documentId,
    source,
    chunk,
    score,
  }
}

/**
 * 创建消息快照
 */
export function createSnapshot(messages: Message[], description?: string): MessageSnapshot {
  const timestamp = Date.now()
  return {
    id: `snap-${timestamp}`,
    messages,
    timestamp,
    description,
  }
}

/**
 * 从消息中提取所有文本（去掉 tool call 等）
 */
export function extractMessageText(message: Message): string {
  return message.parts
    .filter(isTextPart)
    .map(part => part.content)
    .join('')
}

/**
 * 从消息中提取所有工具调用
 */
export function extractToolCalls(message: Message): ToolCallPart[] {
  return message.parts.filter(isToolCallPart)
}

/**
 * 从消息中提取所有引用
 */
export function extractCitations(message: Message): Citation[] {
  return message.citations ?? []
}

/**
 * 检查消息是否包含工具调用
 */
export function hasToolCalls(message: Message): boolean {
  return message.parts.some(isToolCallPart)
}

/**
 * 检查消息是否还在流式接收
 */
export function isStreamingMessage(message: Message): boolean {
  return message.streaming === true && !message.truncated
}

/**
 * 标记消息流式完成
 */
export function finalizeMessage(message: Message): Message {
  return {
    ...message,
    streaming: false,
    updatedAt: Date.now(),
  }
}

/**
 * 添加 Part 到消息
 */
export function addPartToMessage(message: Message, part: MessagePart): Message {
  return {
    ...message,
    parts: [...message.parts, part],
    updatedAt: Date.now(),
  }
}

/**
 * 设置消息的引用（RAG 检索完成时调用）
 */
export function setCitationsToMessage(message: Message, citations: Citation[]): Message {
  return {
    ...message,
    citations,
    updatedAt: Date.now(),
  }
}

/**
 * 合并连续的文本 Part（优化存储）
 */
export function compactTextParts(message: Message): Message {
  const compacted: MessagePart[] = []
  let lastTextContent = ''

  for (const part of message.parts) {
    if (isTextPart(part)) {
      lastTextContent += part.content
    } else {
      if (lastTextContent) {
        compacted.push(createTextPart(lastTextContent))
        lastTextContent = ''
      }
      compacted.push(part)
    }
  }

  if (lastTextContent) {
    compacted.push(createTextPart(lastTextContent))
  }

  return {
    ...message,
    parts: compacted,
  }
}

/**
 * 验证消息结构
 */
export function validateMessage(data: unknown): {
  success: boolean
  data?: Message
  error?: z.ZodError
} {
  const result = MessageSchema.safeParse(data)

  if (!result.success) {
    console.warn('Message 校验失败:', result.error.issues)
  }

  return result.success
    ? { success: true, data: result.data }
    : { success: false, error: result.error }
}
