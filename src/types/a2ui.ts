/**
 * A2UI (Agent Agentic User Interface) 协议
 * 用于前端动态渲染组件树
 *
 * 核心原理：
 * 后端推送 UINode（JSON） → SchemaRenderer 递归渲染 → 真实 React 组件
 * 所有数据都需要 Zod 校验，防止无效数据导致崩溃
 */

import { z } from 'zod'
import { createUID } from '@/src/shared/uid'

/**
 * 组件名称白名单（与 ComponentRegistry 保持同步）
 */
export const COMPONENT_NAMES = [
  // 基础
  'Button',
  'Card',
  'Badge',
  'Alert',
  'Separator',

  // 数据展示
  'DataTable',
  'Progress',
  'Tabs',

  // 表单
  'Form',
  'Input',
  'Select',
  'Textarea',
  'Checkbox',
  'RadioGroup',

  // 布局
  'Stack', // 行/列布局容器
  'Grid', // 网格布局
  'Flex', // 弹性布局

  // TODO 高级
  'Chart', // ECharts 图表
  'ActionBar', // 工具调用确认按钮
  'CitationBadge', // 文献引用徽章
  'Collapsible', // 可折叠区域

  // 自定义
  'Fragment', // 无包装容器（返回多个子组件）
] as const

export type ComponentName = (typeof COMPONENT_NAMES)[number]

function isValidComponentName(name: string): name is ComponentName {
  return COMPONENT_NAMES.includes(name as ComponentName)
}

/**
 * Props 类型定义（各组件特定）
 */

// 通用 props 基础类型
const BasePropsSchema = z.object({
  key: z.string(), // React key（防止重排）
  className: z.string().optional(), // 额外 CSS class
  style: z.record(z.string(), z.unknown()).optional(), // 内联样式
})

// Button props
const ButtonPropsSchema = BasePropsSchema.extend({
  label: z.string(), // 按钮文本
  size: z.enum(['sm', 'md', 'lg']),
  variant: z.enum(['default', 'secondary', 'destructive', 'ghost', 'outline']),
  disabled: z.boolean().optional(),
  onClick: z.string().optional(), // 事件处理器 ID（不支持函数序列化）
  loading: z.boolean().optional(),
}).strict()

// Input props
const InputPropsSchema = BasePropsSchema.extend({
  value: z.string(),
  type: z.enum(['text', 'password', 'email', 'number', 'url']).default('text'),
  placeholder: z.string().optional(),
  disabled: z.boolean().optional(),
  readOnly: z.boolean().optional(),
  onChange: z.string().optional(), // 事件处理器 ID
}).strict()

// 更简单的方案：Props 就是 Record<string, unknown>
export type UIProps = Record<string, unknown>

/**
 * UINode 递归定义（核心）
 */
// 前向声明（支持递归）
export interface UINode {
  component: ComponentName // 组件名称（白名单）
  key: string // React key
  props?: UIProps // 组件 props（运行时校验）
  children?: UINode[] | string // 子组件或纯文本
  condition?: unknown // 可选：条件渲染（Zod validation rules）
}

/**
 * UINode Zod Schema（支持递归）
 *
 * 使用 z.lazy() 实现递归类型定义
 * 这样既能编译期类型推导，又能运行期验证
 */
export const UINodeSchema: z.ZodType<UINode> = z.lazy(
  () =>
    z
      .object({
        component: z.enum(COMPONENT_NAMES).refine(name => isValidComponentName(name), {
          message: `无效的组件名称: ${COMPONENT_NAMES.join(', ')}`,
        }),
        props: z.record(z.string(), z.unknown()).optional(), // 任意 props，由 ComponentRegistry 决定校验
        children: z
          .union([
            z.array(UINodeSchema), // 子组件数组（递归）
            z.string(), // 纯文本内容
          ])
          .optional(),
        condition: z.unknown().optional(),
        key: z.string(),
      })
      .strict(), // 不允许额外字段
)

// 推导 TypeScript 类型（编译期 + 运行期双保险）
export type UINodeType = z.infer<typeof UINodeSchema>

/**
 * 具体组件 Props 类型（可选导出，用于类型检查）
 */
export type ButtonProps = z.infer<typeof ButtonPropsSchema>
// export type CardProps = z.infer<typeof CardPropsSchema>
// export type DataTableProps = z.infer<typeof DataTablePropsSchema>
export type InputProps = z.infer<typeof InputPropsSchema>
// export type SelectProps = z.infer<typeof SelectPropsSchema>
// export type ChartProps = z.infer<typeof ChartPropsSchema>
// export type ActionBarProps = z.infer<typeof ActionBarPropsSchema>

// 安全验证 UINode
export function validateUINode(data: unknown): {
  success: boolean
  data?: UINode
  error?: z.ZodError
} {
  const result = UINodeSchema.safeParse(data)

  if (!result.success) {
    console.warn(
      'UINode 校验失败:',
      result.error.issues.map(e => ({
        path: e.path.join('.'),
        message: e.message,
        code: e.code,
      })),
    )
  }

  return result.success
    ? { success: true, data: result.data }
    : { success: false, error: result.error }
}

// 宽松验证（提取可用字段，忽略无效字段）
export function validateUINodeLoose(data: unknown): UINode | null {
  if (typeof data !== 'object' || data == null) {
    return null
  }

  const obj = data as Record<string, unknown>
  const { component, key, props, children } = obj

  // 必须有 component 字段且是有效组件名
  if (!component || !isValidComponentName(String(component))) {
    return null
  }

  return {
    component: component as ComponentName,
    key: String(key),
    props: typeof props === 'object' && props ? (props as UIProps) : undefined,
    children: Array.isArray(children)
      ? children
      : typeof children === 'string'
        ? children
        : undefined,
  }
}

// 创建 UINode（带类型推导）
export function createUINode<T extends ComponentName>(
  component: T,
  props?: UIProps,
  children?: UINode[] | string,
): UINode {
  return { component, props, children, key: createUID('key') }
}

// TODO 判断是否为容器组件（有 children）
export function isContainerComponent(node: UINode): boolean {
  return ['Stack', 'Flex', 'Grid', 'Card', 'Collapsible', 'Form', 'Fragment'].includes(
    node.component,
  )
}

// TODO 深度优先遍历所有节点
export function traverseUINodes(
  node: UINode,
  callback: (node: UINode, depth: number) => void,
  depth = 0,
): void {
  callback(node, depth)

  if (Array.isArray(node.children)) {
    for (const child of node.children) {
      traverseUINodes(child, callback, depth + 1)
    }
  }
}

// TODO 计算树深度
export function getUINodeDepth(node: UINode): number {
  if (!Array.isArray(node.children) || node.children.length === 0) {
    return 1
  }
  return 1 + Math.max(...(node.children as UINode[]).map(getUINodeDepth))
}
