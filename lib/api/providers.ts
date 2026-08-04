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
];

/** 服务商校验：URL 需要以 /v1 结尾（OpenAI 兼容惯例） */
export function normalizeBaseUrl(url: string): string {
  return url.trim().replace(/\/+$/, '');
}

export function isValidProvider(p: ProviderConfig): boolean {
  return p.name.trim().length > 0 && /^https?:\/\//.test(p.baseUrl) && p.models.length > 0;
}
