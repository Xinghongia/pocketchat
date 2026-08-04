import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  dev: {
    // 固定端口：避免每次重启后端口漂移（3000→3002→3003…），
    // 导致 Chrome 里加载的旧扩展实例指向旧端口而变成「无效」。
    server: {
      port: 3000,
      strictPort: true,
    },
  },
  vite: () => ({
    plugins: [tailwindcss()],
  }),
  manifest: {
    name: 'PocketChat',
    description: '个人专属的浏览器 AI 助手：侧边栏 / 悬浮窗 / 全页面，数据只留在你自己的设备上。',
    permissions: ['sidePanel', 'storage', 'unlimitedStorage', 'contextMenus'],
    // 用户可自由接入任意 OpenAI 兼容服务商（云端 API 或本地 Ollama），
    // 因此放开跨域请求权限；插件本身不访问任何第三方服务器。
    host_permissions: ['<all_urls>'],
    action: {
      default_title: 'PocketChat',
    },
  },
});
