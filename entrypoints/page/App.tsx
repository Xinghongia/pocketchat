import { useEffect, useState } from 'react';
import {
  Group,
  Panel,
  Separator,
  usePanelRef,
  type Layout,
  type LayoutChangedMeta,
} from 'react-resizable-panels';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ChatShell } from '@/components/chat/chat-shell';
import { ChatHeader } from '@/components/chat/chat-header';
import { MessageList } from '@/components/chat/message-list';
import { MessageInput } from '@/components/chat/message-input';
import { ConversationList } from '@/components/chat/conversation-list';
import { ModelSelect } from '@/components/chat/model-select';
import { SettingsDialog } from '@/components/settings/settings-dialog';
import { useChatStore } from '@/stores/chat';
import { useSettingsStore, selectActiveProvider } from '@/stores/settings';
import { useTheme } from '@/lib/hooks/use-theme';

/**
 * 全页面形态：独立浏览器标签页（page.html）。
 * 左侧会话栏（react-resizable-panels：可拖拽调宽、可折叠、布局持久化）+ 右侧全屏聊天。
 */
export default function App() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  useTheme();

  // ---- 左侧栏：react-resizable-panels（宽度 200-480px、折叠 44px、布局存 localStorage）----
  // 布局（百分比）与折叠状态分别持久化：折叠态用独立标志，避免百分比推断误差
  const LAYOUT_KEY = 'pc-page-layout';
  const COLLAPSED_KEY = 'pc-sidebar-collapsed';

  const readLayout = (): Layout | undefined => {
    try {
      const raw = localStorage.getItem(LAYOUT_KEY);
      return raw ? (JSON.parse(raw) as Layout) : undefined;
    } catch {
      return undefined;
    }
  };

  const sidebarRef = usePanelRef();
  const [initialLayout] = useState<Layout | undefined>(readLayout);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSED_KEY) === '1';
    } catch {
      return false;
    }
  });

  const handleLayoutChanged = (next: Layout, meta: LayoutChangedMeta) => {
    try {
      localStorage.setItem(LAYOUT_KEY, JSON.stringify(next));
    } catch {
      /* 忽略 */
    }
    const collapsed = sidebarRef.current?.isCollapsed() ?? false;
    setSidebarCollapsed(collapsed);
    try {
      localStorage.setItem(COLLAPSED_KEY, collapsed ? '1' : '0');
    } catch {
      /* 忽略 */
    }
  };

  const toggleSidebar = () => {
    const p = sidebarRef.current;
    if (!p) return;
    if (p.isCollapsed()) p.expand();
    else p.collapse();
  };

  const loadSettings = useSettingsStore((s) => s.load);
  const loadConversations = useChatStore((s) => s.loadConversations);
  useEffect(() => {
    void loadSettings();
    void loadConversations();
  }, [loadSettings, loadConversations]);

  const conversations = useChatStore((s) => s.conversations);
  const activeId = useChatStore((s) => s.activeId);
  const messages = useChatStore((s) => s.messages);
  const status = useChatStore((s) => s.status);
  const streamingMessageId = useChatStore((s) => s.streamingMessageId);
  const openConversation = useChatStore((s) => s.openConversation);
  const newConversation = useChatStore((s) => s.newConversation);
  const removeConversation = useChatStore((s) => s.removeConversation);
  const sendMessage = useChatStore((s) => s.sendMessage);
  const regenerate = useChatStore((s) => s.regenerate);
  const editMessage = useChatStore((s) => s.editMessage);
  const stop = useChatStore((s) => s.stop);

  const activeTitle = activeId
    ? conversations.find((c) => c.id === activeId)?.title
    : undefined;

  // 是否已激活服务商：控制空状态引导与输入拦截
  const hasProvider = !!selectActiveProvider(useSettingsStore.getState().settings);
  useSettingsStore((s) => s.settings); // 订阅，使 hasProvider 响应式

  // 无服务商时：发送动作改为打开设置，引导用户配置
  const handleSend = (text: string) => {
    if (!hasProvider) {
      setSettingsOpen(true);
      return;
    }
    void sendMessage(text);
  };

  return (
    <>
      <Group
        orientation="horizontal"
        defaultLayout={initialLayout}
        onLayoutChanged={handleLayoutChanged}
        className="flex h-screen w-screen overflow-hidden bg-background text-foreground"
      >
        {/* 左侧会话栏 */}
        <Panel
          id="sidebar"
          panelRef={sidebarRef}
          defaultSize={240}
          minSize={200}
          maxSize={480}
          collapsible
          collapsedSize={44}
        >
          <ConversationList
            variant="panel"
            collapsed={sidebarCollapsed}
            onToggleCollapse={toggleSidebar}
            conversations={conversations}
            activeId={activeId}
            onSelect={(id) => void openConversation(id)}
            onNew={() => void newConversation()}
            onDelete={(id) => void removeConversation(id)}
          />
        </Panel>

        {/* 拖拽分隔条：折叠时隐藏边界线，hover 仍高亮提示可拖拽 */}
        <Separator className="group relative z-10 w-1.5 shrink-0 outline-none">
          <div
            className={cn(
              'absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-border transition-all',
              'group-hover:bg-primary/50 group-active:bg-primary/70',
              sidebarCollapsed && 'opacity-0',
            )}
          />
        </Separator>

        {/* 右侧聊天区 */}
        <Panel id="chat" minSize={300}>
          <ChatShell className="min-w-0">
            <ChatHeader
              title={
                <div className="flex min-w-0 items-center gap-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent text-primary-foreground">
                    <Sparkles className="h-3.5 w-3.5" />
                  </span>
                  <span className="truncate">{activeTitle ?? 'PocketChat'}</span>
                </div>
              }
              actions={<ModelSelect />}
              onNewChat={() => void newConversation()}
              onOpenSettings={() => setSettingsOpen(true)}
            />

            <MessageList
              messages={messages}
              status={status}
              streamingMessageId={streamingMessageId}
              hasProvider={hasProvider}
              onOpenSettings={() => setSettingsOpen(true)}
              onPick={(text) => handleSend(text)}
              onRegenerate={(id) => void regenerate(id)}
              onEdit={(id, c) => void editMessage(id, c)}
              emptyHint="点一下示例，或直接输入你的问题"
            />

            <MessageInput
              onSend={handleSend}
              onStop={stop}
              streaming={status === 'streaming'}
              placeholder={
                hasProvider
                  ? '输入消息，Enter 发送，Shift+Enter 换行'
                  : '请先在设置中添加服务商'
              }
            />
          </ChatShell>
        </Panel>
      </Group>

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </>
  );
}
