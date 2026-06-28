/**
 * Drizzle Kit 配置
 * 用于生成迁移文件、连接数据库
 *
 * 执行命令：
 * npx drizzle-kit generate    → 生成迁移 SQL
 * npx drizzle-kit migrate     → 执行迁移
 * npx drizzle-kit push        → 直接推送到数据库（开发环境）
 * npx drizzle-kit drop        → 删除所有表（危险！仅开发）
 * npx drizzle-kit studio     → 启动 Web UI 查看数据库
 */

import type { Config } from 'drizzle-kit'
import { loadEnvConfig } from '@next/env'

loadEnvConfig(process.cwd())

const config = {
  // Schema 文件位置
  schema: './lib/db/schema.ts',
  // 迁移文件输出位置
  out: './lib/db/migrations',
  // 数据库连接
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },

  // 驱动配置
  dialect: 'postgresql',

  // 开发工具配置
  verbose: true, // 打印 SQL 语句
  strict: true, // 严格模式：检测架构变化
} satisfies Config

export default config
