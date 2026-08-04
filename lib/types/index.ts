/** PocketChat 核心类型定义 */

export type ChatRole = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  /** 思考过程（推理模型如 DeepSeek-R1 返回，可选） */
  reasoning?: string;
  createdAt: number;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  /** 会话级模型记忆：该会话最近一次发送实际使用的服务商与模型 */
  providerId?: string;
  model?: string;
}

/** 服务商配置（OpenAI 兼容协议） */
export interface ProviderConfig {
  id: string;
  name: string;
  baseUrl: string;
  apiKey: string;
  models: string[];
  /** 内置预设不可删除 */
  builtin?: boolean;
}

export type ThemeMode = 'light' | 'dark' | 'system';

/** 输出模式：流式逐字 / 一次性完整返回 */
export type StreamMode = 'stream' | 'non-stream';

export interface AppSettings {
  /** 当前启用的服务商 ID（空 = 未选择，默认不选） */
  activeProviderId: string;
  /** 当前模型（空 = 未选择） */
  activeModel: string;
  theme: ThemeMode;
  /** 输出模式：流式 / 非流式（设置中可调） */
  streamMode: StreamMode;
  /** 是否显示模型的思考过程（reasoning） */
  showReasoning: boolean;
  providers: ProviderConfig[];
}

/** 流式输出事件 */
export type StreamEvent =
  | { type: 'delta'; content: string }
  | { type: 'reasoning'; content: string }
  | { type: 'done'; fullContent: string }
  | { type: 'error'; message: string };

/** 会话状态：消息流中的一次性字段 */
export type StreamStatus = 'idle' | 'streaming' | 'aborted' | 'error';
