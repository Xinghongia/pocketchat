/**
 * 悬浮窗机制：
 * - 在网页右下角注入一个可拖动的悬浮按钮（Shadow DOM 隔离样式，不受网站 CSS 污染）；
 * - 点击按钮在按钮上方弹出「隔离 iframe」（加载扩展自己的 floating.html，与网页完全隔离）；
 * - 按钮可自由拖动，位置记忆到 chrome.storage.local；
 * - 监听 iframe 内发来的 close 消息，收起悬浮窗。
 */
export default defineContentScript({
  matches: ['<all_urls>'],
  main() {
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
      #panel {
        position: fixed; z-index: 2147483647;
        width: 380px; height: 560px; max-width: calc(100vw - 16px); max-height: calc(100vh - 16px);
        border: 1px solid rgba(0,0,0,.08); border-radius: 16px; overflow: hidden;
        box-shadow: 0 24px 64px rgba(0,0,0,.28);
        background: #fff; display: none;
      }
      #panel.open { display: block; animation: pc-pop .18s ease; }
      #panel iframe { width: 100%; height: 100%; border: none; }
      @keyframes pc-pop {
        from { opacity: 0; transform: translateY(10px) scale(.98); }
        to { opacity: 1; transform: none; }
      }
    `;
    shadow.appendChild(style);

    // 悬浮按钮（渐变圆角钮 + 星星图标）
    const fab = document.createElement('button');
    fab.id = 'fab';
    fab.title = 'PocketChat';
    fab.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2L12 3z"/></svg>`;

    // 隔离 iframe：加载扩展页面 floating.html（已在 manifest 声明为可访问资源）
    const panel = document.createElement('iframe');
    panel.id = 'panel';
    panel.src = browser.runtime.getURL('/floating.html');

    shadow.append(fab, panel);
    document.documentElement.appendChild(host);

    // ---------- 位置记忆 ----------
    const POS_KEY = 'pocketchat.floating.pos';
    const FRAME_W = 380;
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

    // ---------- 悬浮窗定位：在按钮上方弹出 ----------
    const positionPanel = () => {
      const r = fab.getBoundingClientRect();
      const w = Math.min(FRAME_W, window.innerWidth - 16);
      const h = Math.min(560, window.innerHeight - 16);
      let right = window.innerWidth - r.right;
      let bottom = window.innerHeight - r.top + 10;
      right = Math.max(8, Math.min(right, window.innerWidth - w - 8));
      bottom = Math.max(8, Math.min(bottom, window.innerHeight - 8));
      panel.style.right = `${right}px`;
      panel.style.bottom = `${bottom}px`;
      panel.style.width = `${w}px`;
      panel.style.height = `${h}px`;
    };

    const toggle = () => {
      if (!panel.classList.contains('open')) positionPanel();
      panel.classList.toggle('open');
    };

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
        toggle();
      }
      moved = false;
    });

    fab.addEventListener('pointercancel', () => {
      dragging = false;
      moved = false;
    });

    // ---------- 监听 iframe 内「关闭」消息 ----------
    window.addEventListener('message', (e) => {
      if (e.data?.source === 'pocketchat' && e.data?.type === 'close') {
        panel.classList.remove('open');
      }
    });
  },
});
