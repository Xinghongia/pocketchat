import { useEffect, useState } from 'react';
import { Expand, List, X } from 'lucide-react';
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
import { useDarkMode } from '@/lib/hooks/use-theme';
import { PortalContainerProvider } from '@/lib/portal-context';
import { cn } from '@/lib/utils';

interface FloatingAppProps {
  /** 面板定位（由 content script 根据悬浮按钮位置计算） */
  position: { right: number; bottom: number; w: number; h: number };
  /** Radix Portal 渲染容器（shadow 内部的 uiContainer） */
  portalContainer: HTMLElement | null;
  onClose: () => void;
  onExpand: () => void;
}

/**
 * 悬浮窗形态：渲染在网页的 Shadow DOM 内（由 content script 挂载），
 * 约 380×560 紧凑模式，不依赖 iframe，任何网站可用。
 */
export function FloatingApp({ position, portalContainer, onClose, onExpand }: FloatingAppProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [convOpen, setConvOpen] = useState(false);
  const dark = useDarkMode();

  // 把暗色 class 应用到 portal 容器（uiContainer）：
  // 既覆盖主体 UI，也覆盖 Dialog/Select 的 Portal 弹层（它们渲染在 uiContainer 下）
  useEffect(() => {
    portalContainer?.classList.toggle('dark', dark);
  }, [dark, portalContainer]);

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

  const handleNewChat = async () => {
    setConvOpen(false);
    await newConversation();
  };

  return (
    <div
      className={cn(
        'overflow-hidden rounded-2xl border bg-background text-foreground shadow-2xl',
        'animate-[pc-pop_0.18s_ease-out]',
      )}
      style={{
        position: 'fixed',
        right: position.right,
        bottom: position.bottom,
        width: position.w,
        height: position.h,
      }}
    >
      <PortalContainerProvider value={portalContainer}>
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
                  onClick={onExpand}
                  title="展开为全页面"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                >
                  <Expand className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  title="关闭"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
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
            compact
            emptyHint="随时随地，问点什么吧"
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
      </PortalContainerProvider>
    </div>
  );
}
