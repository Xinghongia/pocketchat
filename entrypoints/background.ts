export default defineBackground(() => {
  // 点击工具栏图标 -> 直接打开侧边栏（Chrome 114+ 的 sidePanel API）
  // Firefox 不支持 sidePanel，此处做能力检测，静默降级。
  if (browser.sidePanel?.setPanelBehavior) {
    browser.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {
      /* 忽略：某些浏览器/环境不支持 */
    });
  }

  // 安装/更新时初始化（后续可在此做默认设置写入等）
  browser.runtime.onInstalled.addListener(() => {
    console.log('[PocketChat] installed');
  });

  // 「展开为全页面」：打开 page.html，并关闭当前侧边栏。
  // Chrome 没有官方关闭 side panel 的 API，用 setOptions({enabled:false})
  // 临时禁用再恢复的 hack 实现收起（Chrome 114+）。
  browser.runtime.onMessage.addListener((msg) => {
    if (msg?.type !== 'PC_OPEN_FULL_PAGE') return;

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
  });
});
