# PocketChat 🦐

> 个人专属的浏览器 AI 助手：**侧边栏 / 悬浮窗 / 全页面** 三种形态，
> 连接任意 OpenAI 兼容的云端大模型，**所有聊天数据只留在你自己的设备上**。

## 技术栈

| 层 | 选型 |
|---|---|
| 框架 | WXT 0.21 + React 19 + TypeScript（Manifest V3） |
| 样式 | Tailwind CSS v4 + 自定义设计令牌（明暗双主题） |
| UI 组件 | shadcn 风格组件（class-variance-authority + tailwind-merge） |
| 图标 | lucide-react |
| 状态管理 | zustand |
| 动画 | motion |
| 本地存储 | IndexedDB（聊天记录）+ chrome.storage.local（设置） |

## 目录结构

```
pocketchat/
├── entrypoints/
│   ├── background.ts        # Service Worker：图标点击打开侧边栏等
│   ├── content.ts           # 悬浮窗机制：注入隔离 iframe + 悬浮按钮
│   ├── sidepanel/           # 侧边栏容器（chrome.sidePanel）
│   └── floating/            # 悬浮窗容器（网页内 iframe 页面）
├── components/
│   ├── ui/                  # 基础组件：Button / Input / Textarea（shadcn 风格）
│   └── placeholder.tsx      # 占位组件（架构阶段验证用）
├── lib/
│   ├── api/                 # OpenAI 兼容客户端 + SSE 流式解析 + 服务商预设
│   ├── storage/             # IndexedDB 封装 + 设置持久化
│   ├── types/               # 核心类型
│   ├── constants.ts         # 常量（存储键、数据库结构）
│   └── utils.ts             # cn() / uid() 等工具
├── stores/                  # zustand：settings（服务商/主题）、chat（对话/流式）
├── assets/main.css          # Tailwind 入口 + 设计令牌
└── wxt.config.ts            # Manifest 配置（权限、WAR、host_permissions）
```

## 常用命令

```bash
npm run dev          # 开发模式（自动打开浏览器加载临时扩展）
npm run dev:firefox  # Firefox 开发模式
npm run build        # 构建产物到 .output/
npm run zip          # 打包 zip（可上传商店）
npm run compile      # TypeScript 类型检查
```

## 隐私设计

- 聊天记录存在浏览器本地 IndexedDB，**不经过任何第三方服务器**；
- 服务商 API Key 存在 `chrome.storage.local`，只在你自己的浏览器 Profile 里；
- 支持随时导出 / 清空全部数据；
- 插件本体不访问任何服务器，只按你配置的服务商地址发起请求。

## 路线图

- [x] 项目架构：WXT + React + TS + 设计令牌 + 三容器入口
- [ ] 侧边栏聊天界面（流式对话、会话管理）
- [ ] 悬浮窗聊天界面 + 拖动定位
- [ ] 全页面模式
- [ ] 服务商管理页（增删改、模型选择）
- [ ] 数据导出（JSON / Markdown）
- [ ] 划词提问、页面总结等快捷指令
