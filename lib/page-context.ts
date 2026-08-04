/**
 * 网页上下文提取：划词提问、页面总结、整页发送共用。
 * 优先抓 main/article 等正文容器，避免把导航/侧栏噪音带进 prompt。
 */

const CONTENT_SELECTORS = [
  'article',
  'main',
  '[role="main"]',
  '#content',
  '.content',
  '.post-content',
  '.entry-content',
  'body',
] as const;

/** 提取页面正文纯文本（截断到 maxLen，保留标题与地址） */
export function extractPageText(maxLen = 8000): string {
  const title = document.title || location.hostname;
  let el: HTMLElement | null = null;

  for (const sel of CONTENT_SELECTORS) {
    const node = document.querySelector(sel);
    if (node && (node as HTMLElement).innerText?.trim().length > 100) {
      el = node as HTMLElement;
      break;
    }
  }
  el = el ?? document.body;

  let text = (el.innerText ?? '').trim();
  text = text.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n');
  if (text.length > maxLen) {
    text = `${text.slice(0, maxLen)}\n…（内容过长，已截断）`;
  }

  return `网页标题：${title}\n网页地址：${location.href}\n\n${text}`;
}

/** 构造「总结当前页面」的 prompt（带固定指令，自动发送用） */
export function buildSummarizePrompt(): string {
  return (
    '请用简洁的中文总结这个网页的核心内容，分点列出要点，控制在 300 字以内。\n\n' +
    extractPageText()
  );
}
