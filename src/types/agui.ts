/**
 * AG-UI 事件类型
 * 后端通过 SSE 向前端发送的事件类型
 */

import { JSONPatchOptions } from '@/src/types/jsonPatch'

export type ActivityType =
  | 'PLAN' // Agent 制定计划
  | 'SEARCH' // 搜索信息
  | 'SCRAPE' // 抓取网页
  | 'TOOL_USE' // 调用工具/函数
  | 'REASONING' // 推理过程
  | 'REVIEW' // 审查结果
  | 'EXECUTE' // 执行操作
  | 'ERROR' // 错误处理
  | string // 也支持自定义类型

export type AguiCategorizeEvent =
  | 'lifecycle'
  | 'text'
  | 'tool'
  | 'state'
  | 'activity'
  | 'reasoning'
  | 'special'

export const TEXT_MESSAGE_ROLES = ['developer', 'user', 'assistant', 'system', 'tool'] as const

export type TextMessageRole = (typeof TEXT_MESSAGE_ROLES)[number]

export type TextMessageChunkRole = Exclude<TextMessageRole, 'tool'>

/**
 * LifeCycle Events 监控 Agent 运行的 开始 / 结束 / 步骤
 */
export interface RunStartedEvent {
  type: 'RunStarted'
  threadId: string // 对话线程 ID
  runId: string // 本次运行唯一 ID
  parentRunId?: string // 可选：分支 / 时间旅行的父 runId
  input?: unknown // 可选：本次运行的输入 payload
  timestamp?: number // 可选：事件发生的时间戳
}

export interface RunFinishedEvent {
  type: 'RunFinished'
  result?: unknown // 可选：最终结果
  outcome?: { type: 'success' } | { type: 'interrupt'; interrupts: unknown[] } // 中断处理
  timestamp?: number
}

export interface RunErrorEvent {
  type: 'RunError'
  message: string // 错误描述
  code?: string // 可选：错误码
  timestamp?: number
}

export interface StepStartedEvent {
  type: 'StepStarted'
  stepName: string // 步骤名称（如 'parsing', 'searching'）
  timestamp?: number
}

export interface StepFinishedEvent {
  type: 'StepFinished'
  stepName: string // 与 StepStarted 的 stepName 对应
  timestamp?: number
}

/**
 * Text Message Events 流式文本消息（含便利事件）
 */
export interface TextMessageStartEvent {
  type: 'TextMessageStart'
  messageId: string // 本条消息唯一 ID
  role: TextMessageRole
  timestamp?: number
}

export interface TextMessageContentEvent {
  type: 'TextMessageContent'
  messageId: string // 对应的消息 ID
  delta: string // 本次增量文本（非空）
  timestamp?: number
}

export interface TextMessageEndEvent {
  type: 'TextMessageEnd'
  messageId: string // 对应的消息 ID
  timestamp?: number
}

// 便利事件：自动展开为 Start → Content → End
export interface TextMessageChunkEvent {
  type: 'TextMessageChunk'
  messageId?: string // 第一个 chunk 必须有，后续可选
  role?: TextMessageChunkRole // 可选，默认 assistant
  delta?: string // 可选文本内容
  timestamp?: number
}

/**
 * Tool Call Events 工具调用与执行结果（含便利事件）
 */
export interface ToolCallStartEvent {
  type: 'ToolCallStart'
  toolCallId: string // 本次工具调用唯一 ID
  toolCallName: string // 工具名称
  parentMessageId?: string // 可选：关联的父消息 ID
  timestamp?: number
}

export interface ToolCallArgsEvent {
  type: 'ToolCallArgs'
  toolCallId: string // 对应的工具调用 ID
  delta: string // 参数增量（JSON 片段，需拼接）
  timestamp?: number
}

export interface ToolCallEndEvent {
  type: 'ToolCallEnd'
  toolCallId: string // 对应的工具调用 ID
  timestamp?: number
}

export interface ToolCallResultEvent {
  type: 'ToolCallResult'
  messageId: string // 对话消息 ID
  toolCallId: string // 对应的工具调用 ID
  content: string // 工具执行结果
  role?: 'tool'
  timestamp?: number
}

// 便利事件：自动展开为 Start → Args → End
export interface ToolCallChunkEvent {
  type: 'ToolCallChunk'
  toolCallId?: string // 第一个 chunk 必须有
  toolCallName?: string // 第一个 chunk 必须有
  parentMessageId?: string
  delta?: string // 参数增量
  timestamp?: number
}

/**
 * State Management Events 快照 + 增量状态同步
 */
export interface StateSnapshotEvent {
  type: 'StateSnapshot'
  snapshot: unknown // 完整状态快照，替换前端状态
  timestamp?: number
}

export interface StateDeltaEvent {
  type: 'StateDelta'
  delta: JSONPatchOptions[] // RFC 6902 JSON Patch 操作数组
  timestamp?: number
}

export interface MessagesSnapshotEvent {
  type: 'MessagesSnapshot'
  messages: unknown[] // 完整消息历史数组
  timestamp?: number
}

/**
 * Activity Events 活动进度（如搜索、规划）
 */
export interface ActivitySnapshotEvent {
  type: 'ActivitySnapshot'
  messageId: string
  activityType: ActivityType // 活动类型（如 'PLAN', 'SEARCH'）
  content: unknown // 完整活动状态
  replace?: boolean // 默认 true, 当为false时，如果消息已经存在，则忽略该快照
  timestamp?: number
}

export interface ActivityDeltaEvent {
  type: 'ActivityDelta'
  messageId: string
  activityType: ActivityType // 活动类型
  patch: JSONPatchOptions[] // JSON Patch 增量
  timestamp?: number
}

/**
 * Special Events Raw 和 Custom 扩展事件
 */
export interface RawEvent {
  type: 'Raw'
  event: unknown // 来自外部系统的原始事件
  source?: string // 事件源标识
  timestamp?: number
}

export interface CustomEvent {
  type: 'Custom'
  name: string // 自定义事件名称
  value: unknown // 关联数据
  timestamp?: number
}

/**
 * Reasoning Events LLM 思维链（含推理）
 */
export interface ReasoningStartEvent {
  type: 'ReasoningStart'
  messageId: string // 推理上下文 ID
  timestamp?: number
}

export interface ReasoningMessageStartEvent {
  type: 'ReasoningMessageStart'
  messageId: string // 推理消息 ID
  role: 'reasoning'
  timestamp?: number
}

export interface ReasoningMessageContentEvent {
  type: 'ReasoningMessageContent'
  messageId: string // 对应推理消息 ID
  delta: string // 推理内容增量
  timestamp?: number
}

export interface ReasoningMessageEndEvent {
  type: 'ReasoningMessageEnd'
  messageId: string
  timestamp?: number
}

export interface ReasoningMessageChunkEvent {
  type: 'ReasoningMessageChunk'
  messageId: string // 必须有
  delta: string // 空字符串关闭消息
  timestamp?: number
}

export interface ReasoningEndEvent {
  type: 'ReasoningEnd'
  messageId: string
  timestamp?: number
}

export interface ReasoningEncryptedValueEvent {
  type: 'ReasoningEncryptedValue'
  subtype: 'message' | 'tool-call' // 实体类型
  entityId: string // 消息或工具调用 ID
  encryptedValue: string // 加密的链式思维内容
  timestamp?: number
}

export type AguiEvent =
  // Lifecycle
  | RunStartedEvent
  | StepStartedEvent
  | StepFinishedEvent
  | RunFinishedEvent
  | RunErrorEvent
  // Text Message
  | TextMessageStartEvent
  | TextMessageContentEvent
  | TextMessageEndEvent
  | TextMessageChunkEvent
  // Tool Call
  | ToolCallStartEvent
  | ToolCallArgsEvent
  | ToolCallEndEvent
  | ToolCallResultEvent
  | ToolCallChunkEvent
  // State Management
  | StateSnapshotEvent
  | StateDeltaEvent
  | MessagesSnapshotEvent
  // Activity
  | ActivitySnapshotEvent
  | ActivityDeltaEvent
  // Reasoning
  | ReasoningStartEvent
  | ReasoningMessageStartEvent
  | ReasoningMessageContentEvent
  | ReasoningMessageEndEvent
  | ReasoningMessageChunkEvent
  | ReasoningEndEvent
  | ReasoningEncryptedValueEvent
  // Special
  | RawEvent
  | CustomEvent

const VALID_EVENT_TYPES = new Set<string>([
  'RunStarted',
  'StepStarted',
  'StepFinished',
  'RunFinished',
  'RunError',
  'TextMessageStart',
  'TextMessageContent',
  'TextMessageEnd',
  'TextMessageChunk',
  'ToolCallStart',
  'ToolCallArgs',
  'ToolCallEnd',
  'ToolCallResult',
  'ToolCallChunk',
  'StateSnapshot',
  'StateDelta',
  'MessagesSnapshot',
  'ActivitySnapshot',
  'ActivityDelta',
  'ReasoningStart',
  'ReasoningMessageStart',
  'ReasoningMessageContent',
  'ReasoningMessageEnd',
  'ReasoningMessageChunk',
  'ReasoningEnd',
  'ReasoningEncryptedValue',
  'Raw',
  'Custom',
  'MetaEvent',
])

export function isAguiEvent(obj: unknown): obj is AguiEvent {
  if (obj == null || typeof obj !== 'object') {
    return false
  }

  const type = (obj as Record<string, unknown>).type
  return VALID_EVENT_TYPES.has(String(type))
}

// TODO 事件分类工具（可选：用于 FSM 路由）
export function categorizeEvent(event: AguiEvent): AguiCategorizeEvent {
  const type = event.type

  if (['RunStarted', 'StepStarted', 'StepFinished', 'RunFinished', 'RunError'].includes(type)) {
    return 'lifecycle'
  }

  if (
    ['TextMessageStart', 'TextMessageContent', 'TextMessageEnd', 'TextMessageChunk'].includes(type)
  ) {
    return 'text'
  }

  if (
    ['ToolCallStart', 'ToolCallArgs', 'ToolCallEnd', 'ToolCallResult', 'ToolCallChunk'].includes(
      type,
    )
  ) {
    return 'tool'
  }

  if (['StateSnapshot', 'StateDelta', 'MessagesSnapshot'].includes(type)) {
    return 'state'
  }

  if (['ActivitySnapshot', 'ActivityDelta'].includes(type)) {
    return 'activity'
  }

  if (type.startsWith('Reasoning')) {
    return 'reasoning'
  }

  return 'special'
}
