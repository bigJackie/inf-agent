/**
 * RAG（检索增强生成）相关类型
 * 用于知识库管理、向量检索、文献引用
 *
 * 架构：Document → Chunk → Vector Embedding → Retrieval
 */

import { z } from 'zod'

export const RAG_STATUS = ['pending', 'processing', 'completed', 'failed'] as const
export type RAGStatus = (typeof RAG_STATUS)[number]

/**
 * Document：上传的文档元信息
 */
export interface Document {
  id: string // 文档 ID（UUID）
  sessionId: string // 所属会话 ID（Session 级别）
  name: string // 文件名（如 'guide.pdf'）
  size: number // 文件大小（bytes）
  mimeType: string // MIME 类型（如 'application/pdf'）

  // 处理信息
  chunkCount: number // 生成的切片数
  status: RAGStatus
  errorMessage?: string // 处理失败的原因

  // 时间戳
  createdAt: number
  updatedAt: number
}

export const DocumentSchema = z
  .object({
    id: z.uuid(),
    sessionId: z.uuid(),
    name: z.string(),
    size: z.number().int().positive(),
    mimeType: z.string(),
    chunkCount: z.number().int().nonnegative(),
    status: z.enum(RAG_STATUS),
    errorMessage: z.string().optional(),
    createdAt: z.number(),
    updatedAt: z.number(),
  })
  .strict()

export type DocumentType = z.infer<typeof DocumentSchema>

/**
 * Chunk：文档的文本切片（向量化单位）
 */
export interface Chunk {
  id: string // 切片 ID（UUID）
  documentId: string // 所属文档 ID
  sessionId: string // 冗余存储（便于快速过滤）
  content: string // 切片文本内容
  index: number // 在文档中的顺序（0-based）

  // 向量信息
  embedding?: number[] // BAAI/bge-m3 生成的 1024 维向量
  embeddingModel?: string // 向量模型名称

  // 元数据
  charCount: number // 字符数
  createdAt: number
}

export const ChunkSchema = z
  .object({
    id: z.uuid(),
    documentId: z.uuid(),
    sessionId: z.uuid(),
    content: z.string(),
    index: z.number().int().nonnegative(),
    embedding: z.array(z.number()).length(1024).optional(), // BAAI/bge-m3 输出维度
    embeddingModel: z.string().optional(),
    charCount: z.number().int().positive(),
    createdAt: z.number(),
  })
  .strict()

export type ChunkType = z.infer<typeof ChunkSchema>

/**
 * RetrievalResult：向量检索的单个结果
 */
export interface RetrievalResult {
  chunkId: string // 对应的 Chunk ID
  documentId: string
  source: string // 文档名（便于显示）
  content: string // 切片内容
  score: number // 相似度分数 0-1（余弦相似度）

  // 元数据
  index?: number // 在文档中的位置
  charCount?: number
}

export const RetrievalResultSchema = z
  .object({
    chunkId: z.uuid(),
    documentId: z.uuid(),
    source: z.string(),
    content: z.string(),
    score: z.number().min(0).max(1),
    index: z.number().int().optional(),
    charCount: z.number().int().optional(),
  })
  .strict()

export type RetrievalResultType = z.infer<typeof RetrievalResultSchema>

/**
 * RetrievalQuery：检索查询参数
 */
export interface RetrievalQuery {
  query: string // 用户问题
  sessionId: string // 会话 ID（限制检索范围）
  topK?: number // 返回 Top K 结果（默认 5）
  scoreThreshold?: number // 分数阈值（默认 0.7，低于此忽略）
  documentIds?: string[] // 可选：只搜索特定文档
}

export const RetrievalQuerySchema = z
  .object({
    query: z.string().min(1),
    sessionId: z.uuid(),
    topK: z.number().int().positive().default(5),
    scoreThreshold: z.number().min(0).max(1).default(0.7),
    documentIds: z.array(z.uuid()).optional(),
  })
  .strict()

export type RetrievalQueryType = z.infer<typeof RetrievalQuerySchema>

/**
 * RetrievalState：检索过程的 UI 状态
 */
export const RETRIEVAL_PHASE = [
  'idle',
  'embedding',
  'searching',
  'ranking',
  'done',
  'error',
] as const
export type RetrievalPhase = (typeof RETRIEVAL_PHASE)[number]

export interface RetrievalState {
  phase: RetrievalPhase
  progress: number // 0-100，表示进度百分比

  // 检索过程
  query?: string // 当前查询
  resultCount?: number // 找到的结果数
  topResults?: RetrievalResult[] // Top 3-5 的结果预览

  // 错误信息
  error?: string
  errorCode?: string

  // 时间戳
  startedAt?: number
  completedAt?: number
}

export const RetrievalStateSchema = z
  .object({
    phase: z.enum(RETRIEVAL_PHASE),
    progress: z.number().min(0).max(100),
    query: z.string().optional(),
    resultCount: z.number().int().nonnegative().optional(),
    topResults: z.array(RetrievalResultSchema).optional(),
    error: z.string().optional(),
    errorCode: z.string().optional(),
    startedAt: z.number().optional(),
    completedAt: z.number().optional(),
  })
  .strict()

export type RetrievalStateType = z.infer<typeof RetrievalStateSchema>

/**
 * UploadProgress：文件上传处理进度
 */
export const UPLOAD_STEP = ['parsing', 'chunking', 'embedding', 'indexing'] as const
export const UPLOAD_STATUS = ['pending', 'in-progress', 'completed', 'failed'] as const
export type UploadStep = (typeof UPLOAD_STEP)[number]
export type UploadStatus = (typeof UPLOAD_STATUS)[number]

export interface UploadProgress {
  documentId: string
  fileName: string

  currentStep: UploadStep
  overallProgress: number // 0-100

  // 各步骤进度
  steps: Record<
    UploadStep,
    {
      status: UploadStatus
      progress: number
      errorMessage?: string
    }
  >
}

export const UploadProgressSchema = z
  .object({
    documentId: z.uuid(),
    fileName: z.string(),
    currentStep: z.enum(UPLOAD_STEP),
    overallProgress: z.number().min(0).max(100),
    steps: z.record(
      z.enum(UPLOAD_STEP),
      z.object({
        status: z.enum(UPLOAD_STATUS),
        progress: z.number().min(0).max(100),
        errorMessage: z.string().optional(),
      }),
    ),
  })
  .strict()

export type UploadProgressType = z.infer<typeof UploadProgressSchema>

/**
 * RAGConfig：RAG 行为配置
 */
export interface RAGConfig {
  enabled: boolean // 是否启用 RAG
  topK: number // 默认返回的结果数
  scoreThreshold: number // 相似度分数阈值
  embeddingModel: string // 使用的 embedding 模型
  chunkSize: number // 切片大小（字符数）
  chunkOverlap: number // 切片重叠量（字符数）
}

export const RAGConfigSchema = z
  .object({
    enabled: z.boolean().default(true),
    topK: z.number().int().positive().default(5),
    scoreThreshold: z.number().min(0).max(1).default(0.7),
    embeddingModel: z.string().default('BAAI/bge-m3'),
    chunkSize: z.number().int().positive().default(500),
    chunkOverlap: z.number().int().nonnegative().default(50),
  })
  .strict()

export type RAGConfigType = z.infer<typeof RAGConfigSchema>

/**
 * 创建文档元信息
 */
export function createDocument(
  sessionId: string,
  name: string,
  size: number,
  mimeType: string,
): Document {
  const now = Date.now()
  return {
    id: crypto.randomUUID(),
    sessionId,
    name,
    size,
    mimeType,
    chunkCount: 0,
    status: 'pending',
    createdAt: now,
    updatedAt: now,
  }
}

/**
 * 创建切片
 */
export function createChunk(
  documentId: string,
  sessionId: string,
  content: string,
  index: number,
  embedding?: number[],
): Chunk {
  return {
    id: crypto.randomUUID(),
    documentId,
    sessionId,
    content,
    index,
    embedding,
    embeddingModel: 'BAAI/bge-m3',
    charCount: content.length,
    createdAt: Date.now(),
  }
}

/**
 * 创建检索结果
 */
export function createRetrievalResult(
  chunkId: string,
  documentId: string,
  source: string,
  content: string,
  score: number,
): RetrievalResult {
  return {
    chunkId,
    documentId,
    source,
    content,
    score,
  }
}

/**
 * 创建初始检索状态
 */
export function createRetrievalState(): RetrievalState {
  return {
    phase: 'idle',
    progress: 0,
  }
}

/**
 * 更新检索状态（流式处理）
 */
export function updateRetrievalState(
  state: RetrievalState,
  phase: RetrievalPhase,
  progress: number,
  data?: Partial<RetrievalState>,
): RetrievalState {
  return {
    ...state,
    phase,
    progress,
    ...data,
  }
}

/**
 * 创建初始上传进度
 */
export function createUploadProgress(documentId: string, fileName: string): UploadProgress {
  return {
    documentId,
    fileName,
    currentStep: 'parsing',
    overallProgress: 0,
    steps: {
      parsing: { status: 'in-progress', progress: 0 },
      chunking: { status: 'pending', progress: 0 },
      embedding: { status: 'pending', progress: 0 },
      indexing: { status: 'pending', progress: 0 },
    },
  }
}

/**
 * 更新上传进度
 */
export function updateUploadProgress(
  progress: UploadProgress,
  step: UploadStep,
  stepProgress: number,
  overallProgress: number,
): UploadProgress {
  return {
    ...progress,
    currentStep: step,
    overallProgress,
    steps: {
      ...progress.steps,
      [step]: { ...progress.steps[step], progress: stepProgress, status: 'in-progress' },
    },
  }
}

/**
 * 标记上传步骤完成
 */
export function completeUploadStep(progress: UploadProgress, step: UploadStep): UploadProgress {
  return {
    ...progress,
    steps: {
      ...progress.steps,
      [step]: { ...progress.steps[step], status: 'completed', progress: 100 },
    },
  }
}

/**
 * 验证 Document
 */
export function validateDocument(data: unknown): {
  success: boolean
  data?: Document
  error?: z.ZodError
} {
  const result = DocumentSchema.safeParse(data)
  return result.success
    ? { success: true, data: result.data }
    : { success: false, error: result.error }
}

/**
 * 验证 RetrievalQuery
 */
export function validateRetrievalQuery(data: unknown): {
  success: boolean
  data?: RetrievalQuery
  error?: z.ZodError
} {
  const result = RetrievalQuerySchema.safeParse(data)
  return result.success
    ? { success: true, data: result.data }
    : { success: false, error: result.error }
}

/**
 * 检查相似度是否有效（高于阈值）
 */
export function isValidScore(score: number, threshold = 0.7): boolean {
  return score >= threshold
}

/**
 * 从检索结果生成上下文字符串（用于 Prompt）
 */
export function buildRetrievalContext(results: RetrievalResult[]): string {
  const lines = results.map((result, idx) => {
    return `[文档 ${idx + 1}] ${result.source}\n${result.content}\n`
  })
  return lines.join('\n---\n\n')
}
