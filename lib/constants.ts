/** 全局常量：存储键、默认值、消息数量上限等 */

export const STORAGE_KEYS = {
  /** 应用设置（服务商列表、当前模型、主题等） */
  settings: 'pocketchat.settings.v1',
} as const;

export const DB = {
  name: 'pocketchat',
  version: 1,
  stores: {
    conversations: 'conversations',
    messages: 'messages',
  },
} as const;

/** 单条消息内容的最大长度保护 */
export const MAX_MESSAGE_LENGTH = 64_000;

/** 流式输出最大字符数（防止异常响应刷爆内存） */
export const MAX_STREAM_LENGTH = 128_000;
