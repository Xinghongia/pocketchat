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
});
