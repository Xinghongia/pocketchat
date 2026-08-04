import type { ProviderConfig } from '@/lib/types';

/**
 * 内置服务商预设。
 * 全部走 OpenAI 兼容协议（/chat/completions + SSE 流式），
 * 用户可自行增删改，apiKey 一律留空由用户在本地填写。
 */
export const BUILTIN_PROVIDERS: ProviderConfig[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    apiKey: '',
    builtin: true,
    models: ['gpt-4o', 'gpt-4o-mini', 'o3-mini'],
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    apiKey: '',
    builtin: true,
    models: ['deepseek-chat', 'deepseek-reasoner'],
  },
  {
    id: 'dashscope',
    name: '通义千问',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    apiKey: '',
    builtin: true,
    models: ['qwen-max', 'qwen-plus', 'qwen-turbo', 'qwen-long'],
  },
  {
    id: 'zhipu',
    name: '智谱 GLM',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    apiKey: '',
    builtin: true,
    models: ['glm-4.5', 'glm-4.5-air', 'glm-4-flash'],
  },
  {
    id: 'moonshot',
    name: 'Kimi (Moonshot)',
    baseUrl: 'https://api.moonshot.cn/v1',
    apiKey: '',
    builtin: true,
    models: ['moonshot-v1-8k', 'moonshot-v1-32k', 'moonshot-v1-128k'],
  },
  {
    id: 'ollama',
    name: 'Ollama（本地）',
    baseUrl: 'http://localhost:11434/v1',
    apiKey: '',
    builtin: true,
    models: ['qwen3', 'llama3.1'],
  },
];

/** 服务商校验：URL 需要以 /v1 结尾（OpenAI 兼容惯例） */
export function normalizeBaseUrl(url: string): string {
  return url.trim().replace(/\/+$/, '');
}

export function isValidProvider(p: ProviderConfig): boolean {
  return p.name.trim().length > 0 && /^https?:\/\//.test(p.baseUrl) && p.models.length > 0;
}
