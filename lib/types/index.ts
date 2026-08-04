/** PocketChat 核心类型定义 */

export type ChatRole = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: number;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
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

export interface AppSettings {
  /** 当前启用的服务商 ID */
  activeProviderId: string;
  /** 当前模型 */
  activeModel: string;
  theme: ThemeMode;
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
