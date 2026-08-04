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
import { useSettingsStore } from '@/stores/settings';
import { useTheme } from '@/lib/hooks/use-theme';

/**
 * 侧边栏形态：整页高度（100vh），宽度由浏览器侧边栏决定（约 400px）。
 * 复用全部聊天组件，仅在组装层做形态编排。
 */
export default function App() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [convOpen, setConvOpen] = useState(false);
  useTheme();

  // 初始化加载
  const loadSettings = useSettingsStore((s) => s.load);
  const loadConversations = useChatStore((s) => s.loadConversations);
  useEffect(() => {
    void loadSettings();
    void loadConversations();
  }, [loadSettings, loadConversations]);

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
  const stop = useChatStore((s) => s.stop);

  const activeTitle = activeId
    ? conversations.find((c) => c.id === activeId)?.title
    : undefined;

  const handleNewChat = async () => {
    setConvOpen(false);
    await newConversation();
  };

  const handleExpand = () => {
    void browser.tabs.create({ url: browser.runtime.getURL('/page.html') });
  };

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
            <span className="truncate">{activeTitle ?? 'PocketChat'}</span>
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
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
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
        emptyHint="点一下示例，或直接输入你的问题"
      />

      <MessageInput
        onSend={(text) => void sendMessage(text)}
        onStop={stop}
        streaming={status === 'streaming'}
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
