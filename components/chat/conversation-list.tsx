import { MessageSquare, Plus, Trash2, X } from 'lucide-react';
import type { Conversation } from '@/lib/types';
import { cn, formatTime } from '@/lib/utils';

interface ConversationListProps {
  /** drawer=滑入抽屉（侧边栏/悬浮窗）；panel=固定侧栏（全页面） */
  variant?: 'drawer' | 'panel';
  open?: boolean;
  onClose?: () => void;
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
}

/**
 * 会话列表。
 * - drawer（默认）：左侧滑入抽屉，fixed 定位 + 遮罩，用于侧边栏/悬浮窗
 * - panel：普通 flex 布局的固定侧栏，用于全页面
 */
export function ConversationList({
  variant = 'drawer',
  open,
  onClose,
  conversations,
  activeId,
  onSelect,
  onNew,
  onDelete,
}: ConversationListProps) {
  const body = (
    <>
      <div className="flex h-12 shrink-0 items-center justify-between border-b px-3">
        <span className="text-sm font-semibold tracking-tight">对话记录</span>
        {variant === 'drawer' && (
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <button
        onClick={onNew}
        className="mx-3 mt-3 flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-border py-2 text-[13px] text-muted-foreground transition-colors hover:border-primary/50 hover:bg-accent/50 hover:text-foreground"
      >
        <Plus className="h-3.5 w-3.5" />
        新建对话
      </button>

      <div className="flex-1 overflow-y-auto p-2">
        {conversations.length === 0 ? (
          <p className="px-3 py-6 text-center text-xs text-muted-foreground/70">还没有对话记录</p>
        ) : (
          <ul className="space-y-0.5">
            {conversations.map((c) => (
              <li key={c.id}>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelect(c.id)}
                  onKeyDown={(e) => e.key === 'Enter' && onSelect(c.id)}
                  className={cn(
                    'group flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 transition-colors',
                    c.id === activeId ? 'bg-accent/70 text-accent-foreground' : 'hover:bg-accent/50',
                  )}
                >
                  <MessageSquare className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] leading-tight">{c.title}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground/70">
                      {formatTime(c.updatedAt)}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(c.id);
                    }}
                    title="删除"
                    className="shrink-0 rounded p-1 text-muted-foreground/60 opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );

  if (variant === 'panel') {
    return (
      <aside className="flex h-full w-60 shrink-0 flex-col border-r bg-background">{body}</aside>
    );
  }

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/30 animate-[pc-fade-in_0.15s_ease-out]"
          onClick={onClose}
        />
      )}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r bg-background shadow-xl transition-transform duration-200',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {body}
      </aside>
    </>
  );
}
