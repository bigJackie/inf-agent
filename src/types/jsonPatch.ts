export interface JSONPatchOptions {
  op: 'add' | 'remove' | 'replace'
  path: string
  value?: unknown
}
