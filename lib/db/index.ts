/**
 * Drizzle ORM + PostgreSQL 连接初始化
 * 使用 postgres.js 驱动（轻量、Serverless 友好）
 */

import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

import * as schema from './schema'

function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL

  // 仅在运行时（Server-Side）检查，build 时不检查
  if (!url && typeof window === 'undefined') {
    // 只在服务器端执行此代码（typeof window === 'undefined'）
    // 在 build 时 (Node.js) 会执行，但 DATABASE_URL 可能不存在
    // 所以返回一个占位符，实际调用时再报错
    if (process.env.NODE_ENV === 'production') {
      console.warn('⚠️  DATABASE_URL 未设置，生产环境需要配置此变量')
      return 'postgresql://placeholder' // 占位符，不会真实连接
    }
    throw new Error(
      '❌ DATABASE_URL 环境变量未设置\n' +
        '请在 .env.local 中添加:\n' +
        'DATABASE_URL="postgresql://...?pgbouncer=true"',
    )
  }

  return url || 'postgresql://placeholder'
}

/**
 * 创建 postgres.js 客户端（Lazy 初始化）
 */
let clientInstance: ReturnType<typeof postgres> | null = null

function getClient() {
  if (!clientInstance) {
    const url = getDatabaseUrl()

    clientInstance = postgres(url, {
      max: 1, // Serverless 环境：单连接
      idle_timeout: 30, // 30s 无活动则关闭
      connect_timeout: 10, // 10s 连接超时
      // 开发环境打印 SQL
      debug: process.env.NODE_ENV === 'development',
    })
  }
  return clientInstance
}

/**
 * Drizzle ORM 实例
 *
 * 参数：
 * - client: postgres.js 连接对象
 * - schema: 包含所有表定义和关系的对象
 */
export const db = drizzle(getClient(), {
  schema, // 包含所有表 + relations
  logger: process.env.NODE_ENV === 'development', // 开发环境打印 SQL
})

export type Database = typeof db

/**
 * 手动关闭数据库连接
 * 用于应用关闭时的清理
 */
export async function closeDatabase() {
  if (clientInstance) {
    await clientInstance.end()
    clientInstance = null
  }
}
