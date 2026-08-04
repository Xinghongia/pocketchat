import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { ChatShell } from '@/components/chat/chat-shell';
import { ChatHeader } from '@/components/chat/chat-header';
import { MessageList } from '@/components/chat/message-list';
import { MessageInput } from '@/components/chat/message-input';
import { ConversationList } from '@/components/chat/conversation-list';
import { ModelSelect } from '@/components/chat/model-select';
import { SettingsDialog } from '@/components/settings/settings-dialog';
import { useChatStore } from '@/stores/chat';
import { useSettingsStore } from '@/stores/settings';
import { useTheme } from '@/lib/hooks/use-theme';

/**
 * 全页面形态：独立浏览器标签页（page.html）。
 * 左侧固定会话栏 + 右侧全屏聊天，空间最充裕。
 */
export default function App() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  useTheme();

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
  const stop = useChatStore((s) => s.stop);

  const activeTitle = activeId
    ? conversations.find((c) => c.id === activeId)?.title
    : undefined;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      {/* 左侧固定会话栏 */}
      <ConversationList
        variant="panel"
        conversations={conversations}
        activeId={activeId}
        onSelect={(id) => void openConversation(id)}
        onNew={() => void newConversation()}
        onDelete={(id) => void removeConversation(id)}
      />

      {/* 右侧聊天区 */}
      <ChatShell className="min-w-0 flex-1">
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
          emptyHint="点一下示例，或直接输入你的问题"
        />

        <MessageInput
          onSend={(text) => void sendMessage(text)}
          onStop={stop}
          streaming={status === 'streaming'}
        />
      </ChatShell>

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
}
