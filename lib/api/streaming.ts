/**
 * SSE（Server-Sent Events）流式解析器。
 * 负责把 OpenAI 兼容接口返回的 `data: {...}` 逐行解析成结构化事件。
 */

export type SseEvent =
  | { kind: 'delta'; content: string }
  | { kind: 'reasoning'; content: string }
  | { kind: 'done' }
  | { kind: 'error'; message: string };

interface Delta {
  content?: string;
  reasoning_content?: string;
}

/** 逐行读取响应体，产出 SSE 事件（异步生成器） */
export async function* parseSseStream(
  res: Response,
  signal?: AbortSignal,
): AsyncGenerator<SseEvent> {
  if (!res.body) {
    yield { kind: 'error', message: '响应为空：服务商未返回数据流' };
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  const readLine = () => {
    const idx = buffer.indexOf('\n');
    if (idx === -1) return null;
    const line = buffer.slice(0, idx).replace(/\r$/, '');
    buffer = buffer.slice(idx + 1);
    return line;
  };

  try {
    while (true) {
      if (signal?.aborted) {
        yield { kind: 'error', message: '已中止' };
        return;
      }
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let line: string | null;
      while ((line = readLine()) !== null) {
        if (!line.startsWith('data:')) continue;
        const payload = line.slice(5).trim();
        if (!payload) continue;
        if (payload === '[DONE]') {
          yield { kind: 'done' };
          return;
        }
        try {
          const json = JSON.parse(payload) as {
            choices?: Array<{ delta?: Delta; message?: Delta; finish_reason?: string | null }>;
            error?: { message?: string };
          };
          if (json.error?.message) {
            yield { kind: 'error', message: json.error.message };
            return;
          }
          const choice = json.choices?.[0];
          const delta = choice?.delta ?? choice?.message;
          if (delta?.content) yield { kind: 'delta', content: delta.content };
          if (delta?.reasoning_content) yield { kind: 'reasoning', content: delta.reasoning_content };
        } catch {
          // 忽略非 JSON 的 data 行（部分服务商的注释行）
        }
      }
    }
    // 流正常结束但未收到 [DONE]（部分服务商行为），视为完成
    yield { kind: 'done' };
  } catch (err) {
    if (signal?.aborted) {
      yield { kind: 'error', message: '已中止' };
    } else {
      yield { kind: 'error', message: err instanceof Error ? err.message : '网络错误' };
    }
  } finally {
    reader.releaseLock();
  }
}
