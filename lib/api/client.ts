import type { ChatMessage, ProviderConfig, StreamEvent } from '@/lib/types';
import { parseSseStream } from './streaming';
import { MAX_STREAM_LENGTH } from '@/lib/constants';

export interface ChatCompletionRequest {
  provider: ProviderConfig;
  model: string;
  messages: ChatMessage[];
  signal?: AbortSignal;
  temperature?: number;
}

export interface ChatCompletionResult {
  content: string;
  /** 思考过程（推理模型可选返回） */
  reasoning?: string;
}

/** 公共请求头（OpenAI 兼容） */
function buildHeaders(provider: ProviderConfig): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    ...(provider.apiKey ? { Authorization: `Bearer ${provider.apiKey}` } : {}),
  };
}

/** 解析非流式响应体中的消息字段 */
function parseMessagePayload(payload: unknown): ChatCompletionResult {
  const json = payload as {
    choices?: Array<{
      message?: { content?: string; reasoning_content?: string };
    }>;
    error?: { message?: string };
  };
  if (json.error?.message) throw new Error(json.error.message);
  const msg = json.choices?.[0]?.message;
  return {
    content: msg?.content ?? '',
    reasoning: msg?.reasoning_content || undefined,
  };
}

/**
 * 非流式对话请求：一次性返回完整结果（stream: false）。
 * 在扩展的 content script / 页面上下文中运行，避免 Service Worker 休眠中断。
 */
export async function chatCompletionOnce(
  req: ChatCompletionRequest,
): Promise<ChatCompletionResult> {
  const { provider, model, messages, signal, temperature } = req;
  const url = `${provider.baseUrl.replace(/\/+$/, '')}/chat/completions`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      signal,
      headers: buildHeaders(provider),
      body: JSON.stringify({
        model,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        stream: false,
        ...(temperature !== undefined ? { temperature } : {}),
      }),
    });
  } catch (err) {
    throw new Error(signal?.aborted ? '已中止' : err instanceof Error ? err.message : '网络请求失败');
  }

  if (!res.ok) {
    let detail = '';
    try {
      const body = (await res.json()) as { error?: { message?: string } };
      detail = body.error?.message ?? '';
    } catch {
      /* 忽略响应体解析失败 */
    }
    throw new Error(`服务商返回 ${res.status}${detail ? `：${detail}` : ''}`);
  }

  try {
    return parseMessagePayload(await res.json());
  } catch (err) {
    if (signal?.aborted) throw new Error('已中止');
    if (err instanceof SyntaxError) throw new Error('服务商返回了无法解析的响应');
    throw err;
  }
}

/**
 * OpenAI 兼容的流式对话客户端。
 * 返回异步生成器：逐段产出 delta / reasoning / done / error 事件。
 * 在扩展的 content script / 页面上下文中运行，避免 Service Worker 休眠中断流。
 */
export async function* chatCompletionStream(
  req: ChatCompletionRequest,
): AsyncGenerator<StreamEvent> {
  const { provider, model, messages, signal, temperature } = req;
  const url = `${provider.baseUrl.replace(/\/+$/, '')}/chat/completions`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      signal,
      headers: buildHeaders(provider),
      body: JSON.stringify({
        model,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        stream: true,
        ...(temperature !== undefined ? { temperature } : {}),
      }),
    });
  } catch (err) {
    if (signal?.aborted) {
      yield { type: 'error', message: '已中止' };
    } else {
      yield { type: 'error', message: err instanceof Error ? err.message : '网络请求失败' };
    }
    return;
  }

  if (!res.ok) {
    let detail = '';
    try {
      const body = (await res.json()) as { error?: { message?: string } };
      detail = body.error?.message ?? '';
    } catch {
      /* 忽略响应体解析失败 */
    }
    yield {
      type: 'error',
      message: `服务商返回 ${res.status}${detail ? `：${detail}` : ''}`,
    };
    return;
  }

  let full = '';
  for await (const evt of parseSseStream(res, signal)) {
    switch (evt.kind) {
      case 'delta':
        full += evt.content;
        if (full.length > MAX_STREAM_LENGTH) {
          yield { type: 'error', message: '响应超长，已截断' };
          yield { type: 'done', fullContent: full };
          return;
        }
        yield { type: 'delta', content: evt.content };
        break;
      case 'reasoning':
        yield { type: 'reasoning', content: evt.content };
        break;
      case 'done':
        yield { type: 'done', fullContent: full };
        return;
      case 'error':
        yield { type: 'error', message: evt.message };
        return;
    }
  }
}
