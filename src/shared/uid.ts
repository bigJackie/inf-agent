// 创建唯一 UId，格式为 namespace_ + UUID（如果环境支持）或时间戳 + 随机字符串
export function createUID(namespace: string = ''): string {
  const prefix = !!namespace ? `${namespace}_` : ''
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}${crypto.randomUUID()}`
  }

  return `${prefix}${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}
