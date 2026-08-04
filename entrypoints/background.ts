export default defineBackground(() => {
  // 点击工具栏图标 -> 直接打开侧边栏（Chrome 114+ 的 sidePanel API）
  // Firefox 不支持 sidePanel，此处做能力检测，静默降级。
  if (browser.sidePanel?.setPanelBehavior) {
    browser.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {
      /* 忽略：某些浏览器/环境不支持 */
    });
  }

  // ---------- 右键菜单 ----------
  // 菜单项持久化在浏览器里，这里每次启动重建以保证与代码同步。
  // 防御：contextMenus 可能因权限缺失或环境不支持而不存在，
  // 必须整体包在条件判断里，否则 SW 启动时抛错会导致扩展「无效」。
  if (browser.contextMenus) {
    const setupMenus = () => {
      void browser.contextMenus
        .removeAll()
        .then(() => {
          void browser.contextMenus.create({
            id: 'pc-ask-selection',
            title: '向 PocketChat 提问：「%s」',
            contexts: ['selection'],
          });
          void browser.contextMenus.create({
            id: 'pc-summarize-page',
            title: '用 PocketChat 总结当前页面',
            contexts: ['page'],
          });
          void browser.contextMenus.create({
            id: 'pc-send-page',
            title: '将当前页面发送给 PocketChat',
            contexts: ['page'],
          });
        })
        .catch(() => {
          /* 忽略：某些环境不支持 contextMenus */
        });
    };
    setupMenus();

    browser.runtime.onInstalled.addListener(() => {
      console.log('[PocketChat] installed');
      setupMenus();
    });

    // 右键菜单点击 -> 转发给对应标签页的 content script 处理
    browser.contextMenus.onClicked.addListener((info, tab) => {
      const tabId = tab?.id;
      if (tabId == null) return;
      const send = (msg: unknown) => void browser.tabs.sendMessage(tabId, msg).catch(() => {});
      if (info.menuItemId === 'pc-ask-selection' && info.selectionText) {
        send({ type: 'PC_ASK_WITH_PROMPT', prompt: info.selectionText });
      } else if (info.menuItemId === 'pc-summarize-page') {
        send({ type: 'PC_SUMMARIZE_PAGE' });
      } else if (info.menuItemId === 'pc-send-page') {
        send({ type: 'PC_SEND_PAGE' });
      }
    });
  }

  // 「展开为全页面」：打开 page.html，并关闭当前侧边栏。
  // Chrome 没有官方关闭 side panel 的 API，用 setOptions({enabled:false})
  // 临时禁用再恢复的 hack 实现收起（Chrome 114+）。
  // 「打开侧边栏」：划词 / 右键菜单 / 页面总结发来的请求（Chrome 116+ 的 sidePanel.open）。
  browser.runtime.onMessage.addListener((msg, sender) => {
    if (msg?.type === 'PC_OPEN_FULL_PAGE') {
      void browser.tabs.create({ url: browser.runtime.getURL('/page.html') });

      const sp = browser.sidePanel;
      if (sp?.setOptions) {
        sp.setOptions({ enabled: false })
          .then(() => {
            setTimeout(() => {
              sp.setOptions({ enabled: true }).catch(() => {
                /* 忽略 */
              });
            }, 120);
          })
          .catch(() => {
            /* 忽略：某些浏览器/环境不支持 */
          });
      }
    } else if (msg?.type === 'PC_OPEN_SIDEPANEL') {
      const tabId = sender.tab?.id;
      if (tabId != null && browser.sidePanel?.open) {
        browser.sidePanel.open({ tabId }).catch(() => {
          /* 忽略：浏览器不支持时静默降级 */
        });
      }
    }
  });
});
