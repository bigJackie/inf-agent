/**
 * Drizzle ORM Schema 定义
 * PostgreSQL + pgvector 向量支持
 */

import { pgTable, uuid, text, integer, timestamp, jsonb, index } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// 导入自定义 pgvector 类型
import { vector } from 'drizzle-orm/pg-core'
import { RAG_STATUS } from '@/src/types/rag'

/**
 * sessions 表：会话（对话线程）
 */
export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),

  // 基础信息
  title: text('title').notNull().default('新对话'),
  prompt: text('prompt'), // system prompt（可选）
  model: text('model').notNull().default('deepseek-ai/DeepSeek-V3'), // 当前使用的模型（如 deepseek-ai/DeepSeek-V3）

  // 时间戳
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export type Session = typeof sessions.$inferSelect
export type NewSession = typeof sessions.$inferInsert

/**
 * documents 表：上传的文档
 */
export const documents = pgTable(
  'documents',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    // 外键关系
    sessionId: uuid('session_id')
      .notNull()
      .references(() => sessions.id, { onDelete: 'cascade' }),

    // 文件信息
    name: text('name').notNull(), // 文件名
    size: integer('size').notNull(), // 文件大小（bytes）
    mimeType: text('mime_type').notNull(), // MIME 类型（application/pdf）

    // 处理状态
    status: text('status', {
      enum: RAG_STATUS,
    })
      .notNull()
      .default('pending'),
    chunkCount: integer('chunk_count').notNull().default(0), // 切片数
    errorMessage: text('error_message'), // 处理失败原因

    // 时间戳
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  t => [
    // 索引：按会话查文档
    index('doc_session_idx').on(t.sessionId),
    // 索引：按会话和更新时间排序
    index('doc_session_updated_idx').on(t.sessionId, t.updatedAt),
  ],
)

export type Document = typeof documents.$inferSelect
export type NewDocument = typeof documents.$inferInsert

/**
 * chunks 表：文档切片（向量化单位）
 */
export const chunks = pgTable(
  'chunks',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    // 外键关系
    documentId: uuid('document_id')
      .notNull()
      .references(() => documents.id, { onDelete: 'cascade' }),

    // 切片信息
    content: text('content').notNull(), // 切片文本内容
    index: integer('index').notNull(), // 在文档中的顺序（0-based）
    charCount: integer('char_count').notNull(), // 字符数

    // 向量信息（BAAI/bge-m3 输出 1024 维）
    embedding: vector('embedding', { dimensions: 1024 }),

    // 时间戳
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  t => [
    // 索引：按文档查切片
    index('chunk_doc_idx').on(t.documentId),

    // 复合索引：按文档和顺序查切片
    index('chunk_doc_order_idx').on(t.documentId, t.index),

    // HNSW 索引：向量相似度搜索（余弦相似度）
    // 这个索引是关键，使得大规模向量搜索变得高效
    index('chunk_embedding_hnsw_idx').using('hnsw', t.embedding.op('vector_cosine_ops')),
  ],
)

export type Chunk = typeof chunks.$inferSelect
export type NewChunk = typeof chunks.$inferInsert

/**
 * messages 表：对话消息
 */
export const messages = pgTable(
  'messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    // 外键关系
    sessionId: uuid('session_id')
      .notNull()
      .references(() => sessions.id, { onDelete: 'cascade' }),

    // 消息内容
    role: text('role', {
      enum: ['user', 'assistant', 'system', 'tool'],
    }).notNull(),

    // 消息 Parts（MessagePart[] 的 JSON 数组）
    // 格式：[{ type: 'text', content: '...' }, { type: 'toolCall', toolCallId: '...', ... }, ...]
    parts: jsonb('parts').notNull(),

    // RAG 引用信息（Citation[] 的 JSON 数组）
    // 格式：[{ id, index, chunkId, documentId, source, chunk, score }, ...]
    citations: jsonb('citations'),

    // 流式/截断标记
    streaming: integer('streaming').notNull().default(0), // boolean 作为 0/1 存储
    truncated: integer('truncated').notNull().default(0),
    truncationReason: text('truncation_reason'),

    // 元数据
    model: text('model'), // 生成该消息的模型名
    tokensInput: integer('tokens_input'), // 输入 tokens
    tokensOutput: integer('tokens_output'), // 输出 tokens

    // 时间戳
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  t => [
    // 索引：按会话查消息
    index('msg_session_idx').on(t.sessionId),

    // 复合索引：按会话和时间排序（用于加载消息历史）
    index('msg_session_time_idx').on(t.sessionId, t.createdAt),

    // 索引：找未完成的流式消息（RUN_FINISHED 后设置 streaming=0）
    index('msg_streaming_idx').on(t.streaming),
  ],
)

export type Message = typeof messages.$inferSelect
export type NewMessage = typeof messages.$inferInsert

/**
 * 关系定义（用于 Drizzle 的关系查询）
 */
export const sessionsRelations = relations(sessions, ({ many }) => ({
  documents: many(documents),
  messages: many(messages),
}))

export const documentsRelations = relations(documents, ({ one, many }) => ({
  session: one(sessions, {
    fields: [documents.sessionId],
    references: [sessions.id],
  }),
  chunks: many(chunks),
}))

export const chunksRelations = relations(chunks, ({ one }) => ({
  document: one(documents, {
    fields: [chunks.documentId],
    references: [documents.id],
  }),
}))

export const messagesRelations = relations(messages, ({ one }) => ({
  session: one(sessions, {
    fields: [messages.sessionId],
    references: [sessions.id],
  }),
}))
