import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import type { ChatMessage, StreamStatus } from '@/lib/types';
import { cn } from '@/lib/utils';
import { MessageItem } from './message-item';
import { EmptyState } from './empty-state';

/** 判断两个时间戳是否同一天（本地时区） */
function isSameDay(a: number, b: number) {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

/** 时间分组标签：今天 / 昨天 / M月D日 / YYYY年M月D日 */
function dayLabel(ts: number) {
  const d = new Date(ts);
  const now = new Date();
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.round((startOf(now) - startOf(d)) / 86400000);
  if (diffDays === 0) return '今天';
  if (diffDays === 1) return '昨天';
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return y === now.getFullYear() ? `${m}月${day}日` : `${y}年${m}月${day}日`;
}

/** 时间分隔线：两侧淡线 + 居中日期标签 */
function DayDivider({ ts }: { ts: number }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2">
      <div className="h-px flex-1 bg-border/50" />
      <span className="select-none text-[11px] text-muted-foreground/60">{dayLabel(ts)}</span>
      <div className="h-px flex-1 bg-border/50" />
    </div>
  );
}

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

  // 当前显示的用户消息：滚动时找「视口中心最近」的那条用户消息元素。
  // 用元素实际位置而不是 scrollTop 比例映射：消息变多/容器高度变化时不会漂移，跟随更准。
  const updateActive = useCallback(() => {
    const container = scrollRef.current;
    const ids = userIdsRef.current;
    if (!container || ids.length === 0) {
      setActiveUIdx(-1);
      return;
    }
    const cRect = container.getBoundingClientRect();
    const centerY = cRect.top + cRect.height / 2;
    let best = -1;
    let bestDist = Infinity;
    ids.forEach((id, i) => {
      const el = userEls.current.get(id);
      if (!el) return;
      const r = el.getBoundingClientRect();
      const d = Math.abs(r.top + r.height / 2 - centerY);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    });
    setActiveUIdx(best);
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

  // 滚动 / 尺寸变化时更新指示条。
  // 不用 scroll 事件监听，改用 rAF 轮询对比 scrollTop / clientHeight / scrollHeight：
  // 容器晚挂载（空状态早退）导致事件漏绑的情况天然免疫；
  // 每帧只做属性对比，无变化不触发 updateActive，开销可忽略。
  useEffect(() => {
    let lastTop = -1;
    let lastH = -1;
    let lastSH = -1;
    let raf = 0;
    const tick = () => {
      const c = scrollRef.current;
      if (c && (c.scrollTop !== lastTop || c.clientHeight !== lastH || c.scrollHeight !== lastSH)) {
        lastTop = c.scrollTop;
        lastH = c.clientHeight;
        lastSH = c.scrollHeight;
        updateActive();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
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
      // 空状态也渲染 scrollRef 容器：保证滚动容器从挂载起就存在，
      // 否则滚动监听 effect 挂载时拿到 null 会漏绑，消息加载后指示条永不更新
      <div className={cn('relative flex-1 overflow-hidden', className)}>
        <div ref={scrollRef} className="h-full overflow-y-auto overscroll-contain">
          <EmptyState
            hint={emptyHint}
            compact={compact}
            hasProvider={hasProvider}
            onPick={onPick}
            onOpenSettings={onOpenSettings}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={cn('relative flex-1 overflow-hidden', className)}>
      <div ref={scrollRef} className="h-full overflow-y-auto overscroll-contain">
        <div className="mx-auto w-full max-w-5xl">
          <div className={cn(compact ? 'py-2' : 'py-3')}>
            {messages.map((m, i) => {
              const prev = messages[i - 1];
              const showDivider = !prev || !isSameDay(prev.createdAt, m.createdAt);
              return (
                <Fragment key={m.id}>
                  {showDivider && <DayDivider ts={m.createdAt} />}
                  {/* 消息入场：淡入 + 轻微上移（流式增量更新不重播，仅新插入时播一次） */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <MessageItem
                      message={m}
                      compact={compact}
                      streaming={m.id === streamingMessageId && status === 'streaming'}
                      onRegenerate={onRegenerate}
                      onEdit={onEdit}
                      rootRef={m.role === 'user' ? setUserRef(m.id) : undefined}
                    />
                  </motion.div>
                </Fragment>
              );
            })}
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
            // 4 个梯度：距离 0/1/2/≥3 -> 最长/次长/中/最短（CSS 过渡平滑，跟随滚动即时更新）
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
                className={cn(
                  'h-1 cursor-pointer rounded-full transition-all duration-150',
                  width,
                  color,
                )}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
