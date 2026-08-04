import { useEffect, useRef } from 'react';
import type { ChatMessage, StreamStatus } from '@/lib/types';
import { cn } from '@/lib/utils';
import { MessageItem } from './message-item';
import { EmptyState } from './empty-state';

interface MessageListProps {
  messages: ChatMessage[];
  status: StreamStatus;
  streamingMessageId: string | null;
  compact?: boolean;
  /** 空状态提示语 */
  emptyHint?: string;
  /** 是否已激活服务商（控制空状态引导） */
  hasProvider?: boolean;
  /** 点击示例直接发送 */
  onPick?: (text: string) => void;
  /** 打开设置弹窗（无服务商引导用） */
  onOpenSettings?: () => void;
  className?: string;
}

/**
 * 消息列表：自动滚动到底部。
 * 三种形态复用，通过 compact 控制间距密度。
 */
export function MessageList({
  messages,
  status,
  streamingMessageId,
  compact,
  emptyHint,
  hasProvider,
  onPick,
  onOpenSettings,
  className,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // 新消息 / 流式增量 / 状态变化时滚动到底部
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, status]);

  if (messages.length === 0) {
    return (
      <div className={cn('flex-1 overflow-y-auto', className)}>
        <EmptyState
          hint={emptyHint}
          compact={compact}
          hasProvider={hasProvider}
          onPick={onPick}
          onOpenSettings={onOpenSettings}
        />
      </div>
    );
  }

  return (
    <div className={cn('flex-1 overflow-y-auto overscroll-contain', className)}>
      <div className={cn(compact ? 'py-2' : 'py-3')}>
        {messages.map((m) => (
          <MessageItem
            key={m.id}
            message={m}
            compact={compact}
            streaming={m.id === streamingMessageId && status === 'streaming'}
          />
        ))}
        <div ref={bottomRef} className="h-px" />
      </div>
    </div>
  );
}
