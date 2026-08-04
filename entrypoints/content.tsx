/**
 * 悬浮窗机制（Shadow Root UI 方案）：
 * - 在网页右下角注入一个可拖动的悬浮按钮（Shadow DOM 隔离样式）；
 * - 点击按钮，用 WXT 的 createShadowRootUi 把 PocketChat 的 React 应用
 *   挂载进一个 Shadow Root（隔离 iframe 不可靠：很多网站的 CSP 会拦截
 *   chrome-extension:// 的 iframe，Shadow Root 方案完全绕开该问题）；
 * - 按钮可拖动，位置记忆到 chrome.storage.local。
 */
import { createRoot, type Root } from 'react-dom/client';
import { createShadowRootUi } from 'wxt/utils/content-script-ui/shadow-root';
import { FloatingApp } from '@/components/floating-app';
import '@/assets/main.css';

type FloatingUi = Awaited<ReturnType<typeof createShadowRootUi<Root>>>;

export default defineContentScript({
  matches: ['<all_urls>'],
  cssInjectionMode: 'ui',
  main(ctx) {
    const HOST_ID = 'pocketchat-host';
    if (document.getElementById(HOST_ID)) return;
    if (!document.documentElement) return;

    const host = document.createElement('div');
    host.id = HOST_ID;
    const shadow = host.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    style.textContent = `
      :host { all: initial; }
      * { box-sizing: border-box; }
      #fab {
        position: fixed; right: 20px; bottom: 20px; z-index: 2147483646;
        width: 46px; height: 46px; border-radius: 14px;
        border: none; cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        background: linear-gradient(135deg, #8b5cf6, #6366f1);
        color: #fff; box-shadow: 0 8px 24px rgba(99, 102, 241, .4);
        transition: transform .15s ease, box-shadow .15s ease;
        touch-action: none; user-select: none; -webkit-user-select: none;
      }
      #fab:hover { transform: scale(1.06); box-shadow: 0 10px 28px rgba(99, 102, 241, .5); }
      #fab:active { transform: scale(.96); }
      #fab svg { width: 22px; height: 22px; pointer-events: none; }
    `;
    shadow.appendChild(style);

    // 悬浮按钮（渐变圆角钮 + 星星图标）
    const fab = document.createElement('button');
    fab.id = 'fab';
    fab.title = 'PocketChat';
    fab.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2L12 3z"/></svg>`;
    shadow.appendChild(fab);
    document.documentElement.appendChild(host);

    // ---------- 位置记忆 ----------
    const POS_KEY = 'pocketchat.floating.pos';
    let saved = { right: 20, bottom: 20 };
    void browser.storage.local.get(POS_KEY).then((res) => {
      const pos = res[POS_KEY] as { right?: number; bottom?: number } | undefined;
      if (pos && typeof pos.right === 'number' && typeof pos.bottom === 'number') {
        saved = { right: pos.right, bottom: pos.bottom };
        fab.style.right = `${pos.right}px`;
        fab.style.bottom = `${pos.bottom}px`;
      }
    });

    const savePos = () => {
      const right = parseFloat(fab.style.right) || 20;
      const bottom = parseFloat(fab.style.bottom) || 20;
      saved = { right, bottom };
      void browser.storage.local.set({ [POS_KEY]: saved });
    };

    // ---------- 悬浮面板（Shadow Root UI） ----------
    const FRAME_W = 380;
    const FRAME_H = 560;
    let ui: FloatingUi | null = null;

    const computePanelPos = () => {
      const r = fab.getBoundingClientRect();
      const w = Math.min(FRAME_W, window.innerWidth - 16);
      const h = Math.min(FRAME_H, window.innerHeight - 16);
      let right = Math.max(8, Math.min(window.innerWidth - r.right, window.innerWidth - w - 8));
      let bottom = Math.min(window.innerHeight - r.top + 10, window.innerHeight - h - 8);
      bottom = Math.max(8, bottom);
      return { right, bottom, w, h };
    };

    const closePanel = () => {
      if (ui) {
        ui.remove();
        ui = null;
      }
    };

    const openPanel = async () => {
      if (ui) return;
      const pos = computePanelPos();
      const panelUi = await createShadowRootUi(ctx, {
        name: 'pocketchat-floating',
        position: 'overlay',
        zIndex: 2147483647,
        anchor: document.documentElement,
        alignment: 'top-left',
        onMount(container) {
          const root = createRoot(container);
          root.render(
            <FloatingApp
              position={pos}
              portalContainer={container}
              onClose={closePanel}
              onExpand={() => {
                // 1) 先收起悬浮窗（content script 自己发的 runtime 消息
                //    不会回传给发送方，onMessage 监听器收不到，必须主动关）
                // 2) 再通知 background 打开全页面（顺带关闭侧边栏）。
                //    content script 环境无 tabs API，不能直接 tabs.create。
                closePanel();
                void browser.runtime.sendMessage({ type: 'PC_OPEN_FULL_PAGE' });
              }}
            />,
          );
          return root;
        },
        onRemove(root) {
          root?.unmount();
        },
      });
      panelUi.mount();
      ui = panelUi;
    };

    const togglePanel = () => {
      if (ui) closePanel();
      else void openPanel();
    };

    // ---------- 监听扩展消息 ----------
    // 侧边栏展开全页面时会广播 PC_OPEN_FULL_PAGE 到所有 content script，
    // 此时本页若开着悬浮窗也应收起（避免两个 UI 同时存在）。
    // 注意：自己发的消息不会回传，本页展开走 onExpand 里的主动 closePanel()。
    browser.runtime.onMessage.addListener((msg) => {
      if (msg?.type === 'PC_OPEN_FULL_PAGE' || msg?.type === 'PC_CLOSE_FLOATING') {
        closePanel();
      }
    });

    // ---------- 拖动（pointer events，区分点击与拖动） ----------
    let dragging = false;
    let moved = false;
    let startX = 0;
    let startY = 0;
    let origRight = 0;
    let origBottom = 0;

    fab.addEventListener('pointerdown', (e) => {
      dragging = true;
      moved = false;
      startX = e.clientX;
      startY = e.clientY;
      const r = fab.getBoundingClientRect();
      origRight = window.innerWidth - r.right;
      origBottom = window.innerHeight - r.bottom;
      fab.setPointerCapture(e.pointerId);
    });

    fab.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (Math.abs(dx) + Math.abs(dy) > 4) moved = true;
      if (moved) {
        const right = Math.min(Math.max(origRight - dx, 8), window.innerWidth - 8);
        const bottom = Math.min(Math.max(origBottom - dy, 8), window.innerHeight - 8);
        fab.style.right = `${right}px`;
        fab.style.bottom = `${bottom}px`;
      }
    });

    fab.addEventListener('pointerup', () => {
      dragging = false;
      if (moved) {
        savePos();
      } else {
        togglePanel();
      }
      moved = false;
    });

    fab.addEventListener('pointercancel', () => {
      dragging = false;
      moved = false;
    });
  },
});
