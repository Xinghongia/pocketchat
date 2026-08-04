# PocketChat 🦐

> 个人专属的浏览器 AI 助手：**侧边栏 / 悬浮窗 / 全页面** 三种形态，
> 连接任意 OpenAI 兼容的云端大模型，**所有聊天数据只留在你自己的设备上**。

## ✨ 功能特性

- **三种形态**：浏览器侧边栏（`Ctrl+B`）、网页右下角悬浮窗（可拖动、可展开聊天）、独立全页面，共用同一套聊天数据
- **流式对话**：SSE 流式输出、可随时停止生成、保留已生成内容
- **会话管理**：会话列表、按天分组（今天 / 昨天 / 日期）、全文搜索（命中高亮、点击跳转）
- **消息操作**：编辑已发消息、重新生成回复、一键复制代码块
- **提示词模板库**：翻译 / 总结 / 代码审查 / 润色 / 头脑风暴等常用模板一键填入
- **服务商管理**：任意 OpenAI 兼容接口（OpenAI / DeepSeek / 通义 / 智谱 / Kimi / Ollama 等），自定义 Base URL 与模型列表，**拖拽排序**，切换即用
- **会话级模型记忆**：每个会话记住你最后选的模型，切回来自动恢复
- **快捷指令**：网页划词提问（浮动小条）、右键菜单发送选中文本、一键总结当前页面
- **数据导出**：聊天记录一键导出 JSON / Markdown
- **明暗主题**：跟随系统，也可手动切换
- **全页面可调布局**：左侧会话栏可拖拽调宽、可折叠成窄条，布局状态自动记忆

## 🛠 技术栈

| 层 | 选型 |
|---|---|
| 框架 | WXT 0.21 + React 19 + TypeScript（Manifest V3） |
| 样式 | Tailwind CSS v4 + 自定义设计令牌（明暗双主题） |
| UI 组件 | Radix UI（Dialog / Select / Switch / Popover）+ shadcn 风格封装 |
| 拖拽 | @dnd-kit（服务商排序）、react-resizable-panels（侧栏调宽）、interact.js（悬浮按钮拖动） |
| 动画 | motion（消息入场、抽屉、指示条） |
| 定位 | Floating UI（划词浮条，自动防溢出） |
| Markdown | react-markdown + remark-gfm + rehype-highlight + highlight.js |
| 输入框 | react-textarea-autosize（自适应高度） |
| 图标 / 状态 | lucide-react / zustand |
| 本地存储 | IndexedDB（聊天记录）+ chrome.storage.local（设置） |

## 📁 目录结构

```
pocketchat/
├── entrypoints/
│   ├── background.ts        # Service Worker：图标点击打开侧边栏、右键菜单
│   ├── content.tsx          # 悬浮窗机制（Shadow DOM 隔离）+ 划词提问浮条
│   ├── sidepanel/           # 侧边栏形态（chrome.sidePanel）
│   ├── page/                # 全页面形态（独立标签页 + 可调宽侧栏）
│   └── floating/            # 悬浮窗形态（网页内 Shadow Root 应用）
├── components/
│   ├── chat/                # 聊天核心：消息列表/输入框/会话列表/模板库/模型选择
│   ├── settings/            # 设置弹窗：服务商管理（拖拽排序）/ 模型选择
│   ├── ui/                  # 基础组件：Button/Dialog/Select/Switch/Popover...
│   └── floating-app.tsx     # 悬浮窗应用装配
├── lib/
│   ├── api/                 # OpenAI 兼容客户端 + SSE 流式解析 + 服务商预设
│   ├── storage/             # IndexedDB 封装 + 设置持久化 + 全文搜索
│   ├── types/               # 核心类型
│   ├── hooks/               # use-theme 等
│   ├── prompts.ts           # 提示词模板库
│   ├── export.ts            # 数据导出（JSON / Markdown）
│   ├── page-context.ts      # 页面文本提取 / 总结提示词构建
│   └── constants.ts         # 常量（存储键、数据库结构）
├── stores/                  # zustand：settings（服务商/主题）、chat（对话/流式）
├── assets/main.css          # Tailwind 入口 + 设计令牌 + 动画
└── wxt.config.ts            # Manifest 配置
```

## 🚀 快速开始

```bash
npm install          # 安装依赖
npm run dev          # 开发模式（自动打开浏览器加载临时扩展）
npm run build        # 构建产物到 .output/
npm run compile      # TypeScript 类型检查
npm run zip          # 打包 zip（可上传商店）
```

### 加载到浏览器

1. `npm run build` 后打开 `chrome://extensions`
2. 开启右上角「开发者模式」
3. 点击「加载已解压的扩展程序」，选择 `.output/chrome-mv3` 目录
4. 浏览器工具栏点击扩展图标，或按 `Ctrl+B` 打开侧边栏

### 配置服务商

设置 → 添加服务商 → 填入 Base URL 和 API Key（可选，可留到请求时输入），
选择模型即可开始对话。内置 OpenAI 预设，其他兼容服务商按需添加。

## 🔒 隐私设计

- 聊天记录存在浏览器本地 IndexedDB，**不经过任何第三方服务器**；
- 服务商 API Key 存在 `chrome.storage.local`，只在你自己的浏览器 Profile 里；
- 支持随时导出 / 清空全部数据；
- 插件本体不访问任何服务器，只按你配置的服务商地址发起请求。

## 🗺 路线图

- [x] 项目架构：WXT + React + TS + 设计令牌 + 三容器入口
- [x] 侧边栏聊天界面（流式对话、会话管理、全文搜索）
- [x] 悬浮窗聊天界面 + 拖动定位
- [x] 全页面模式 + 可调宽 / 可折叠侧栏
- [x] 服务商管理（增删改、模型选择、拖拽排序）
- [x] 划词提问、右键菜单、页面总结
- [x] 消息编辑 / 重新生成 / 停止生成
- [x] 提示词模板库、时间分隔线、会话级模型记忆
- [x] 数据导出（JSON / Markdown）
- [ ] 多标签页会话并行、消息搜索高亮定位到原文
- [ ] 自定义提示词模板（增删改）
- [ ] 本地知识库 / RAG
