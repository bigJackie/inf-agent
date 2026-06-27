import { z } from 'zod'

// 引用元数据
export interface Citation {
  id: string // citation ID
  index: number // [1], [2], ... 的数字
  chunkId: string // 引用的 chunk ID（来自 chunks 表）
  documentId: string // 文档 ID（来自 documents 表）
  source: string // 文档名（显示用）
  chunk: string // 原始文本片段
  score: number // 相关度 0-1
}

export const CitationSchema = z
  .object({
    id: z.uuid(),
    index: z.number().int().positive(),
    chunkId: z.uuid(),
    documentId: z.uuid(),
    source: z.string(),
    chunk: z.string(),
    score: z.number().min(0).max(1),
  })
  .strict()
