/**
 * 划词提问 / 右键菜单 / 页面总结的 prompt 桥接。
 *
 * content script（或 background 转发）在打开悬浮窗前把待发送的 prompt
 * 暂存到这里；FloatingApp 挂载时通过 takePendingPrompt() 取走并注入输入框。
 * 用模块级变量而不是 store：prompt 是一次性的 UI 初始值，不需要跨会话持久化。
 */

export interface PendingPrompt {
  /** 预填到输入框的内容 */
  prompt: string;
  /** true 时自动发送（如「总结当前页面」），默认 false 只预填 */
  autoSend?: boolean;
}

let pending: PendingPrompt | null = null;

export function setPendingPrompt(p: PendingPrompt | null): void {
  pending = p;
}

/** 取走并清空（FloatingApp 挂载时调用一次） */
export function takePendingPrompt(): PendingPrompt | null {
  const p = pending;
  pending = null;
  return p;
}
