/**
 * 悬浮窗机制（架构版）：
 * - 在网页底部注入一个极简悬浮按钮（占位样式，后续由正式设计替换）；
 * - 点击按钮开/关一个「隔离 iframe」——加载扩展自己的 floating.html。
 *   iframe 与网页完全隔离：不受网站样式/CSP 污染，也不污染网站。
 */
export default defineContentScript({
  matches: ['<all_urls>'],
  main() {
    const HOST_ID = 'pocketchat-host';
    if (document.getElementById(HOST_ID)) return;

    const host = document.createElement('div');
    host.id = HOST_ID;
    const shadow = host.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    style.textContent = `
      :host { all: initial; }
      #fab {
        position: fixed; right: 20px; bottom: 20px; z-index: 2147483647;
        width: 46px; height: 46px; border-radius: 50%;
        border: none; cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        background: linear-gradient(135deg, #8b5cf6, #6366f1);
        color: #fff; box-shadow: 0 8px 24px rgba(99, 102, 241, .35);
        transition: transform .15s ease;
      }
      #fab:hover { transform: scale(1.06); }
      #fab svg { width: 22px; height: 22px; }
      #panel {
        position: fixed; right: 20px; bottom: 78px; z-index: 2147483646;
        width: 400px; max-width: calc(100vw - 40px);
        height: 600px; max-height: calc(100vh - 100px);
        border: none; border-radius: 16px;
        box-shadow: 0 24px 64px rgba(0, 0, 0, .28);
        background: #fff; display: none;
      }
      #panel.open { display: block; }
    `;
    shadow.appendChild(style);

    // 悬浮按钮
    const fab = document.createElement('button');
    fab.id = 'fab';
    fab.title = 'PocketChat';
    fab.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2L12 3z"/></svg>`;

    // 隔离 iframe：加载扩展页面 floating.html（已在 manifest 中声明为可访问资源）
    const panel = document.createElement('iframe');
    panel.id = 'panel';
    panel.src = browser.runtime.getURL('/floating.html');

    fab.addEventListener('click', () => {
      panel.classList.toggle('open');
    });

    shadow.append(fab, panel);
    document.documentElement.appendChild(host);
  },
});
