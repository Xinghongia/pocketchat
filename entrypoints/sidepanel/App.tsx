import { useEffect, useState } from 'react';
import { Expand, List } from 'lucide-react';
import { ChatShell } from '@/components/chat/chat-shell';
import { ChatHeader } from '@/components/chat/chat-header';
import { MessageList } from '@/components/chat/message-list';
import { MessageInput } from '@/components/chat/message-input';
import { ConversationList } from '@/components/chat/conversation-list';
import { ModelSelect } from '@/components/chat/model-select';
import { SettingsDialog } from '@/components/settings/settings-dialog';
import { Button } from '@/components/ui/button';
import { useChatStore } from '@/stores/chat';
import { useSettingsStore, selectActiveProvider } from '@/stores/settings';
import { useTheme } from '@/lib/hooks/use-theme';

const PENDING_KEY = 'pc.pendingPrompt';

interface PendingPromptPayload {
  prompt: string;
  autoSend?: boolean;
  ts: number;
}

/**
 * 侧边栏形态：整页高度（100vh），宽度由浏览器侧边栏决定（约 400px）。
 * 复用全部聊天组件，仅在组装层做形态编排。
 * 划词提问 / 右键菜单 / 页面总结的 prompt 经 chrome.storage.local 桥接进来。
 */
export default function App() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [convOpen, setConvOpen] = useState(false);
  const [pendingPrompt, setPendingPrompt] = useState<PendingPromptPayload | null>(null);
  useTheme();

  // 初始化加载
  const loadSettings = useSettingsStore((s) => s.load);
  const loadConversations = useChatStore((s) => s.loadConversations);
  useEffect(() => {
    void loadSettings();
    void loadConversations();
  }, [loadSettings, loadConversations]);

  // 接收来自 content script 的待发送 prompt（划词 / 右键 / 页面总结）：
  // 挂载时读一次；之后监听 storage 变化（侧边栏已打开时内容注入）。
  // autoSend 直接发送；否则预填输入框供用户编辑。
  useEffect(() => {
    const readPending = async () => {
      try {
        const res = await browser.storage.local.get(PENDING_KEY);
        const p = res[PENDING_KEY] as PendingPromptPayload | undefined;
        if (!p) return;
        await browser.storage.local.remove(PENDING_KEY);
        setPendingPrompt(p);
      } catch {
        /* 忽略 */
      }
    };
    void readPending();
    const onChanged = (
      changes: Record<string, { newValue?: unknown; oldValue?: unknown }>,
      area: string,
    ) => {
      if (area === 'local' && changes[PENDING_KEY]) void readPending();
    };
    browser.storage.onChanged.addListener(onChanged);
    return () => browser.storage.onChanged.removeListener(onChanged);
  }, []);

  // chat store
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

  const handleNewChat = async () => {
    setConvOpen(false);
    await newConversation();
  };

  const handleExpand = () => {
    // 通知 background：打开全页面并关闭当前侧边栏
    void browser.runtime.sendMessage({ type: 'PC_OPEN_FULL_PAGE' });
  };

  // 无服务商时：发送动作改为打开设置，引导用户配置
  const handleSend = (text: string) => {
    if (!hasProvider) {
      setSettingsOpen(true);
      return;
    }
    void sendMessage(text);
  };

  // 处理桥接进来的 prompt：autoSend 直接发送，否则预填（key 变化重挂载输入框）
  useEffect(() => {
    if (!pendingPrompt) return;
    if (pendingPrompt.autoSend) {
      handleSend(pendingPrompt.prompt);
      setPendingPrompt(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingPrompt]);

  return (
    <ChatShell>
      <ChatHeader
        title={
          <div className="flex min-w-0 items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setConvOpen(true)}
              title="对话记录"
              className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
            >
              <List className="h-4 w-4" />
            </Button>
            <span className="min-w-0 flex-1 truncate text-sm font-medium">
              {activeTitle ?? 'PocketChat'}
            </span>
          </div>
        }
        actions={
          <>
            <ModelSelect />
            <Button
              variant="ghost"
              size="icon"
              onClick={handleExpand}
              title="展开为全页面"
              className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
            >
              <Expand className="h-4 w-4" />
            </Button>
          </>
        }
        onNewChat={() => void handleNewChat()}
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
        key={pendingPrompt ? `pending-${pendingPrompt.ts}` : 'default'}
        initialValue={pendingPrompt?.prompt}
        onSend={handleSend}
        onStop={stop}
        streaming={status === 'streaming'}
        placeholder={hasProvider ? '输入消息，Enter 发送' : '请先在设置中添加服务商'}
      />

      <ConversationList
        open={convOpen}
        onClose={() => setConvOpen(false)}
        conversations={conversations}
        activeId={activeId}
        onSelect={(id) => {
          setConvOpen(false);
          void openConversation(id);
        }}
        onNew={() => void handleNewChat()}
        onDelete={(id) => void removeConversation(id)}
      />

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </ChatShell>
  );
}
