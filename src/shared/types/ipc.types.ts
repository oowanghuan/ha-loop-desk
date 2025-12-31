/**
 * IPC 通信类型定义
 * 对应 40_DESIGN_FINAL.md API 契约
 */

import type { Step, Phase, Feature, Project, Artifact, PhaseGateStatus } from './project.types'

// ============================================================
// CLI 相关
// ============================================================

/** CLI 执行请求 */
export interface CliExecuteRequest {
  command: string
  projectPath: string
  featureId?: string
  stepId?: string
  mode?: 'print' | 'full_interactive'
}

/** CLI 执行响应 */
export interface CliExecuteResponse {
  executionId: string
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled'
  startedAt?: string
}

/** CLI 取消请求 */
export interface CliCancelRequest {
  executionId: string
}

/** CLI 输出事件 */
export interface CliOutputEvent {
  executionId: string
  type: 'stdout' | 'stderr' | 'system'
  content: string
  timestamp: string
}

/** CLI 完成事件 */
export interface CliCompleteEvent {
  executionId: string
  exitCode: number
  duration: number
}

// ============================================================
// 项目相关
// ============================================================

/** 打开项目请求 */
export interface ProjectOpenRequest {
  path: string
}

/** 扫描到的模板信息 */
export interface ScannedTemplate {
  name: string
  path: string
  description: string
  phaseId: number | null
  type: 'markdown' | 'yaml'
  isLocal: true
}

/** 模板扫描结果 */
export interface TemplateScanResult {
  /** 按 Phase 分组的模板（使用 Record 而非 Map 以支持 IPC 序列化） */
  byPhase: Record<number, ScannedTemplate[]>
  common: ScannedTemplate[]
  all: ScannedTemplate[]
  stats: {
    totalTemplates: number
    scanTime: number
  }
}

/** Schema Discovery 扫描结果（用于 GUI 展示） */
export interface ScanResultForGUI {
  features: FeatureWithValidation[]
  unknownSchemaCount: number
  scanStats: {
    totalFiles: number
    schemaFiles: number
    scanTime: number
  }
  warnings: string[]
  /** 扫描到的模板 */
  templates?: TemplateScanResult
}

/** 发现的文件信息 */
export interface DiscoveredFileInfo {
  fileType: string
  path: string
  displayName: string
  schema: string
}

/** 扩展的 Feature 类型，包含校验信息 */
export interface FeatureWithValidation extends Feature {
  validationStatus: 'valid' | 'warning' | 'error'
  missingRequired: string[]
  missingForPhase: string[]
  hasConflicts: boolean
  conflicts: ConflictInfo[]
  /** 发现的文件列表 */
  discoveredFiles: DiscoveredFileInfo[]
}

/** 冲突信息 */
export interface ConflictInfo {
  fileType: string
  instances: Array<{
    path: string
    isPrimary: boolean
    selectionReason?: string
  }>
}

/** 打开项目响应 */
export interface ProjectOpenResponse {
  project: Project
  /** Schema Discovery 扫描结果（可选，降级时为 null） */
  scanResult?: ScanResultForGUI | null
}

/** 获取项目状态响应 */
export interface ProjectStateResponse {
  project: Project
  features: Feature[]
  activeFeature?: Feature
  /** Schema Discovery 扫描结果（可选） */
  scanResult?: ScanResultForGUI | null
}

// ============================================================
// 文件相关
// ============================================================

/** 读取文件请求 */
export interface FileReadRequest {
  path: string
  projectPath: string
  maxSize?: number
}

/** 读取文件响应 */
export interface FileReadResponse {
  content: string
  path: string
  size: number
  mimeType: string
  lastModified: string
}

/** 文件变更事件 */
export interface FileChangeEvent {
  path: string
  type: 'create' | 'update' | 'delete'
  timestamp: string
}

// ============================================================
// 审批相关
// ============================================================

/** 审批提交请求 */
export interface ApprovalSubmitRequest {
  stepId: string
  featureId: string
  action: 'approve' | 'reject'
  note?: string
}

/** 审批提交响应 */
export interface ApprovalSubmitResponse {
  success: boolean
  stepId: string
  newStatus: 'approved' | 'rejected' | 'pending'
  approvedBy: string
  approvedAt: string
}

/** 审批状态查询请求 */
export interface ApprovalStatusRequest {
  featureId: string
}

/** 审批状态查询响应 */
export interface ApprovalStatusResponse {
  gates: PhaseGateStatus[]
  steps: Array<{
    stepId: string
    status: 'approved' | 'rejected' | 'pending'
    approvedBy?: string
    approvedAt?: string
  }>
}

// ============================================================
// 错误类型
// ============================================================

/** IPC 错误响应 */
export interface IpcError {
  code: string
  message: string
  details?: Record<string, unknown>
}

/** IPC 响应包装 */
export type IpcResult<T> =
  | { success: true; data: T }
  | { success: false; error: IpcError }

// ============================================================
// Shell 相关
// ============================================================

/** 打开终端请求 */
export interface ShellOpenTerminalRequest {
  cwd: string
  prompt?: string
}

/** 打开终端响应 */
export interface ShellOpenTerminalResponse {
  success: boolean
  promptCopied: boolean
}

// ============================================================
// GUI-CLI Session 相关
// ============================================================

/** Session 终端信息 */
export interface SessionTerminalInfo {
  type: 'console' | 'vscode' | 'idea' | 'unknown'
  platform: 'darwin' | 'win32' | 'linux'
  title: string
}

/** Session 状态 */
export type SessionStatus = 'active' | 'stale' | 'disconnected'

/** Session 元信息 */
export interface Session {
  id: string
  pid: number
  createdAt: string
  lastActiveAt: string
  heartbeatAt: string
  terminal: SessionTerminalInfo
  status: SessionStatus
  projectPath: string
}

/** 获取 Session 列表请求 */
export interface SessionListRequest {
  projectPath: string
}

/** 获取 Session 列表响应 */
export interface SessionListResponse {
  sessions: Session[]
}

/** 发送命令请求 */
export interface SessionSendCommandRequest {
  sessionId: string
  projectPath: string
  command: string
  context?: {
    phaseId?: number
    featureId?: string
    stepId?: string
  }
}

/** 发送命令响应 */
export interface SessionSendCommandResponse {
  cmdId: string
  status: 'sent' | 'received' | 'duplicate' | 'timeout' | 'error'
  retryCount: number
  error?: string
}

/** 等待执行结果请求 */
export interface SessionWaitResultRequest {
  sessionId: string
  projectPath: string
  cmdId: string
  timeout?: number
}

/** 执行结果响应 */
export interface SessionExecutionResult {
  cmdId: string
  status: 'success' | 'failed' | 'timeout'
  timestamp?: string
  duration?: number
  output?: string
  error?: string
}

/** Session 状态变更事件 */
export interface SessionChangeEvent {
  sessions: Session[]
  timestamp: string
}
