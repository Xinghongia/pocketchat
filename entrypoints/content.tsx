/**
 * 划词提问机制：
 * - 在网页中选中文字后，选区上方浮现小浮条「✨ 问 PocketChat」（独立 Shadow DOM 隔离页面样式）；
 * - 点击浮条（或通过右键菜单 / 页面总结指令）后，把待发送内容暂存到
 *   chrome.storage.local 的 pendingPrompt，再通知 background 打开侧边栏；
 * - 侧边栏挂载或监听 storage 变化取走 pendingPrompt，预填输入框（可编辑后发送）。
 * 悬浮窗形态已移除，所有入口统一走侧边栏 / 全页面。
 */
import { computePosition, flip, offset, shift } from '@floating-ui/dom';
import { buildSummarizePrompt, extractPageText } from '@/lib/page-context';

const PENDING_KEY = 'pc.pendingPrompt';

/** 带 prompt 打开侧边栏（划词 / 右键 / 页面总结共用） */
const askSidepanel = async (p: { prompt: string; autoSend?: boolean }) => {
  try {
    await browser.storage.local.set({ [PENDING_KEY]: { ...p, ts: Date.now() } });
  } catch {
    /* 忽略：存储不可用时静默降级 */
  }
  void browser.runtime.sendMessage({ type: 'PC_OPEN_SIDEPANEL' });
};

export default defineContentScript({
  matches: ['<all_urls>'],
  cssInjectionMode: 'manual',
  main() {
    if (!document.documentElement) return;

    // ---------- 划词提问工具栏 ----------
    const TOOLBAR_ID = 'pocketchat-selection-bar';
    let toolbarHost: HTMLElement | null = null;
    let toolbarShadow: ShadowRoot | null = null;
    let barVisible = false;

    const isInsideOurUI = (node: Node | null): boolean => {
      let n: Node | null = node;
      while (n) {
        const root = n.getRootNode();
        if (root === toolbarShadow) return true;
        if (root instanceof ShadowRoot) n = root.host;
        else n = n.parentNode;
      }
      return false;
    };

    const ensureToolbar = () => {
      if (toolbarHost) return;
      toolbarHost = document.createElement('div');
      toolbarHost.id = TOOLBAR_ID;
      toolbarShadow = toolbarHost.attachShadow({ mode: 'open' });
      const style = document.createElement('style');
      style.textContent = `
        :host { all: initial; }
        .pc-bar {
          position: fixed; left: 0; top: 0; z-index: 2147483646;
          display: flex; align-items: center; gap: 5px;
          padding: 5px 11px; border: none; border-radius: 999px;
          background: rgba(30, 41, 59, .96); color: #fff;
          font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
          font-size: 12px; font-weight: 500; line-height: 1; white-space: nowrap;
          cursor: pointer; box-shadow: 0 4px 16px rgba(0, 0, 0, .28);
          transform: translateX(-50%);
          opacity: 0; pointer-events: none;
          transition: opacity .12s ease;
          user-select: none; -webkit-user-select: none;
        }
        .pc-bar:hover { background: rgba(51, 65, 85, .98); }
        .pc-bar svg { width: 14px; height: 14px; flex-shrink: 0; }
      `;
      toolbarShadow.appendChild(style);
      const bar = document.createElement('button');
      bar.type = 'button';
      bar.className = 'pc-bar';
      bar.innerHTML =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2L12 3z"/></svg><span>问 PocketChat</span>';
      bar.addEventListener('click', () => {
        const text = window.getSelection()?.toString().trim();
        hideToolbar();
        if (text) void askSidepanel({ prompt: text });
      });
      toolbarShadow.appendChild(bar);
      document.documentElement.appendChild(toolbarHost);
    };

    const showToolbar = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !sel.rangeCount) {
        hideToolbar();
        return;
      }
      if (isInsideOurUI(sel.anchorNode) || isInsideOurUI(sel.focusNode)) {
        hideToolbar();
        return;
      }
      const text = sel.toString().trim();
      if (!text || text.length > 5000) {
        hideToolbar();
        return;
      }
      const rect = sel.getRangeAt(0).getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) {
        hideToolbar();
        return;
      }
      ensureToolbar();
      const bar = toolbarShadow?.querySelector<HTMLElement>('.pc-bar');
      if (!bar) return;
      // Floating UI：以上方弹出为主，空间不足自动翻转到底部，并防溢出视口
      const virtualEl = { getBoundingClientRect: () => rect };
      void computePosition(virtualEl, bar, {
        strategy: 'fixed',
        placement: 'top',
        middleware: [offset(10), flip({ padding: 8 }), shift({ padding: 8 })],
      }).then(({ x, y }) => {
        bar.style.left = `${x}px`;
        bar.style.top = `${y}px`;
        bar.style.opacity = '1';
        bar.style.pointerEvents = 'auto';
      });
      barVisible = true;
    };

    const hideToolbar = () => {
      if (!barVisible || !toolbarShadow) return;
      const bar = toolbarShadow.querySelector<HTMLElement>('.pc-bar');
      if (bar) {
        bar.style.opacity = '0';
        bar.style.pointerEvents = 'none';
      }
      barVisible = false;
    };

    let selTimer: number | undefined;
    document.addEventListener('selectionchange', () => {
      window.clearTimeout(selTimer);
      selTimer = window.setTimeout(showToolbar, 120);
    });
    document.addEventListener('scroll', hideToolbar, true);
    window.addEventListener('blur', hideToolbar);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') hideToolbar();
    });
    document.addEventListener('mousedown', (e) => {
      // 点击浮条本身不隐藏（保证 click 能触发）；点其他任何地方都收起
      if (e.target instanceof Node && e.target.getRootNode() !== toolbarShadow) hideToolbar();
    });

    // ---------- 监听扩展消息 ----------
    // 右键菜单 / 页面总结指令：写入 pendingPrompt 并打开侧边栏
    browser.runtime.onMessage.addListener((msg) => {
      if (
        msg?.type === 'PC_ASK_WITH_PROMPT' &&
        typeof msg.prompt === 'string' &&
        msg.prompt.trim()
      ) {
        void askSidepanel({ prompt: msg.prompt });
      } else if (msg?.type === 'PC_SUMMARIZE_PAGE') {
        void askSidepanel({ prompt: buildSummarizePrompt(), autoSend: true });
      } else if (msg?.type === 'PC_SEND_PAGE') {
        void askSidepanel({ prompt: extractPageText() });
      }
    });
  },
});
