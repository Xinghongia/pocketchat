import { useCallback, useEffect, useRef, useState } from 'react';
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
  /** 重新生成 AI 回复 */
  onRegenerate?: (messageId: string) => void;
  /** 编辑用户消息 */
  onEdit?: (messageId: string, content: string) => void;
  className?: string;
}

/**
 * 消息列表：自动滚动到底部。
 * 三种形态复用，通过 compact 控制间距密度。
 * 右侧带「对话进度指示条」：每条用户消息一个指示点，
 * 当前显示的变长、悬停变长、点击跳转到对应消息。
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
  onRegenerate,
  onEdit,
  className,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  /** 指示条列容器（整列都是 hover 热区） */
  const railRef = useRef<HTMLDivElement>(null);
  /** 用户消息元素 Map（id -> 根元素），供指示条定位 */
  const userEls = useRef(new Map<string, HTMLDivElement>());
  /** 用户消息 id 的有序列表（最新数据，ref 避免流式时重复建监听） */
  const userIdsRef = useRef<string[]>([]);
  const [activeUIdx, setActiveUIdx] = useState(-1);
  /** 鼠标悬停在指示条列上的位置（-1 = 未悬停，跟随滚动位置） */
  const [hoverIdx, setHoverIdx] = useState(-1);

  const userMsgs = messages.filter((m) => m.role === 'user');

  const setUserRef = useCallback((id: string) => (el: HTMLDivElement | null) => {
    if (el) userEls.current.set(id, el);
    else userEls.current.delete(id);
  }, []);

  // 当前显示的用户消息：用滚动进度映射到消息索引（顶部->第 0 条，底部->最后一条）
  const updateActive = useCallback(() => {
    const container = scrollRef.current;
    const ids = userIdsRef.current;
    if (!container || ids.length === 0) {
      setActiveUIdx(-1);
      return;
    }
    const maxScroll = container.scrollHeight - container.clientHeight;
    const progress = maxScroll > 0 ? container.scrollTop / maxScroll : 0;
    const active = Math.min(
      ids.length - 1,
      Math.max(0, Math.round(progress * (ids.length - 1))),
    );
    setActiveUIdx(active);
  }, []);

  // 新消息 / 流式增量 / 状态变化时滚动到底部
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, status]);

  // 同步用户消息 id 列表，并在 DOM 稳定后重算「当前显示」
  useEffect(() => {
    userIdsRef.current = userMsgs.map((m) => m.id);
    const raf = requestAnimationFrame(updateActive);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  // 滚动 / 窗口变化时更新指示条
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(updateActive);
    };
    container.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    updateActive();
    return () => {
      container.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      cancelAnimationFrame(raf);
    };
  }, [updateActive]);

  // 点击指示条：平滑滚动到对应用户消息（居中）
  const jumpTo = (idx: number) => {
    const el = userEls.current.get(userMsgs[idx]?.id ?? '');
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  // 鼠标在指示条整列区域移动时跟随（不需要精确对准小条）：
  // 条高 4px + 间距 8px = 12px，鼠标 Y 相对列顶 / 12 取整即索引
  const handleRailMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rail = railRef.current;
    if (!rail || userMsgs.length === 0) return;
    const rect = rail.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const idx = Math.floor(y / 12);
    setHoverIdx(Math.min(userMsgs.length - 1, Math.max(0, idx)));
  };

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
    <div className={cn('relative flex-1 overflow-hidden', className)}>
      <div ref={scrollRef} className="h-full overflow-y-auto overscroll-contain">
        <div className="mx-auto w-full max-w-3xl">
          <div className={cn(compact ? 'py-2' : 'py-3')}>
            {messages.map((m) => (
              <MessageItem
                key={m.id}
                message={m}
                compact={compact}
                streaming={m.id === streamingMessageId && status === 'streaming'}
                onRegenerate={onRegenerate}
                onEdit={onEdit}
                rootRef={m.role === 'user' ? setUserRef(m.id) : undefined}
              />
            ))}
            <div ref={bottomRef} className="h-px" />
          </div>
        </div>
      </div>

      {/* 右侧对话进度指示条：滚动时以当前位置为中心，离得最近的最长，依次递减；
          鼠标在整列区域移动时以鼠标位置为中心跟随；点击跳转 */}
      {userMsgs.length >= 2 && (
        <div
          ref={railRef}
          onMouseMove={handleRailMove}
          onMouseLeave={() => setHoverIdx(-1)}
          className="absolute right-4 top-1/2 z-10 flex -translate-y-1/2 flex-col items-end gap-2 py-2 pl-6"
        >
          {userMsgs.map((m, i) => {
            // 悬停时以鼠标位置为中心，否则以当前显示为中心
            const center = hoverIdx >= 0 ? hoverIdx : activeUIdx;
            const dist = center < 0 ? 99 : Math.abs(i - center);
            // 4 个梯度：距离 0/1/2/≥3 -> 最长/次长/中/最短
            const width = dist === 0 ? 'w-8' : dist === 1 ? 'w-6' : dist === 2 ? 'w-4' : 'w-2';
            const color =
              dist === 0
                ? 'bg-primary'
                : dist === 1
                  ? 'bg-primary/50'
                  : dist === 2
                    ? 'bg-foreground/30'
                    : 'bg-foreground/15';
            return (
              <button
                key={m.id}
                onClick={() => jumpTo(i)}
                title={m.content.replace(/\s+/g, ' ').slice(0, 40)}
                className={cn('h-1 rounded-full transition-all duration-300', width, color)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
