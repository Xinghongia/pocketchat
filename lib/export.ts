import { exportAll } from '@/lib/storage/db';
import type { ChatMessage, Conversation } from '@/lib/types';

/** 浏览器内触发文件下载（MV3 下 Blob URL 可用） */
function downloadBlob(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function safeFilename(s: string): string {
  return s.replace(/[\\/:*?"<>|]/g, '_').slice(0, 40) || 'pocketchat';
}

/** 导出全部会话为 JSON（含服务商无关的纯聊天数据） */
export async function exportAllJson(): Promise<void> {
  const bundle = await exportAll();
  const date = new Date().toISOString().slice(0, 10);
  downloadBlob(`pocketchat-全量导出-${date}.json`, JSON.stringify(bundle, null, 2), 'application/json');
}

/** 导出单个会话为 Markdown（人可读、可分享） */
export function exportConversationMarkdown(
  conv: Conversation | null,
  messages: ChatMessage[],
): void {
  const title = conv?.title ?? '未命名对话';
  const date = new Date().toLocaleString();
  const model = conv?.model ? `\n> 模型：${conv.model}` : '';

  const lines: string[] = [
    `# ${title}`,
    '',
    `> 导出时间：${date}${model}`,
    '',
  ];
  for (const m of messages) {
    const who = m.role === 'user' ? '用户' : 'PocketChat';
    lines.push(`## ${who}`, '', m.content || '_（空）_', '');
    if (m.reasoning) {
      lines.push(`<details><summary>思考过程</summary>`, '', m.reasoning, '', `</details>`, '');
    }
  }

  downloadBlob(`pocketchat-${safeFilename(title)}.md`, lines.join('\n'), 'text/markdown');
}
