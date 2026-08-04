import { useEffect, useMemo, useRef, useState } from 'react';
import { MessageSquare, PanelLeftClose, PanelLeftOpen, Plus, Search, Trash2, X } from 'lucide-react';
import type { Conversation } from '@/lib/types';
import { searchMessages, type SearchHit } from '@/lib/storage/db';
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

/** 把命中关键词用 <mark> 高亮 */
function Highlight({ text, keyword }: { text: string; keyword: string }) {
  const parts = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    if (!kw) return [text];
    const out: React.ReactNode[] = [];
    let rest = text;
    let i = 0;
    while (rest) {
      const idx = rest.toLowerCase().indexOf(kw);
      if (idx < 0) {
        out.push(rest);
        break;
      }
      if (idx > 0) out.push(rest.slice(0, idx));
      out.push(
        <mark key={i++} className="rounded-sm bg-primary/25 px-0.5 text-inherit">
          {rest.slice(idx, idx + kw.length)}
        </mark>,
      );
      rest = rest.slice(idx + kw.length);
    }
    return out;
  }, [text, keyword]);
  return <>{parts}</>;
}

/**
 * 会话列表 + 全文搜索。
 * - 顶部搜索框：输入即搜（防抖），命中显示消息片段，点击跳到对应会话
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
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [searching, setSearching] = useState(false);

  // ---- panel 变体：可拖拽宽度 + 折叠（全页面用），宽度偏好存 localStorage ----
  const [panelWidth, setPanelWidth] = useState(() => {
    try {
      const v = Number(localStorage.getItem('pc-sidebar-width'));
      return v >= 200 && v <= 480 ? v : 240;
    } catch {
      return 240;
    }
  });
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem('pc-sidebar-collapsed') === '1';
    } catch {
      return false;
    }
  });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef<{ x: number; w: number } | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem('pc-sidebar-width', String(panelWidth));
    } catch {
      /* 忽略 */
    }
  }, [panelWidth]);

  useEffect(() => {
    try {
      localStorage.setItem('pc-sidebar-collapsed', collapsed ? '1' : '0');
    } catch {
      /* 忽略 */
    }
  }, [collapsed]);

  const handleDragStart = (e: React.PointerEvent<HTMLDivElement>) => {
    dragStart.current = { x: e.clientX, w: panelWidth };
    setDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const handleDragMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragStart.current;
    if (!d) return;
    setPanelWidth(Math.min(480, Math.max(200, d.w + e.clientX - d.x)));
  };
  const handleDragEnd = () => {
    dragStart.current = null;
    setDragging(false);
  };

  // 防抖搜索：300ms
  useEffect(() => {
    const kw = query.trim();
    if (!kw) {
      setHits([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        setHits(await searchMessages(kw));
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  const isSearching = query.trim().length > 0;

  const handleSelect = (id: string) => {
    setQuery('');
    onSelect(id);
  };

  const header = (
    <div className="flex h-12 shrink-0 items-center justify-between px-3">
      <span className="truncate text-sm font-semibold tracking-tight">对话记录</span>
      {variant === 'drawer' ? (
        <button
          onClick={onClose}
          className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      ) : (
        <button
          onClick={() => setCollapsed(true)}
          title="收起侧栏"
          className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <PanelLeftClose className="h-4 w-4" />
        </button>
      )}
    </div>
  );

  const content = (
    <>

      {/* 搜索框 */}
      <div className="px-3 pt-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/60" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索聊天记录…"
            className={cn(
              'h-8 w-full rounded-lg border border-border bg-muted/50 pl-8 pr-7 text-[13px]',
              'placeholder:text-muted-foreground/60 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30',
            )}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground/60 hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      <div className="mt-1 flex-1 overflow-y-auto p-2">
        {isSearching ? (
          // ---- 搜索结果 ----
          searching && hits.length === 0 ? (
            <p className="px-3 py-6 text-center text-xs text-muted-foreground/70">搜索中…</p>
          ) : hits.length === 0 ? (
            <p className="px-3 py-6 text-center text-xs text-muted-foreground/70">没有找到匹配内容</p>
          ) : (
            <ul className="space-y-1">
              {hits.map((h) => (
                <li key={h.messageId}>
                  <button
                    onClick={() => handleSelect(h.conversationId)}
                    className={cn(
                      'block w-full rounded-lg px-2.5 py-2 text-left transition-colors',
                      h.conversationId === activeId ? 'bg-accent/70' : 'hover:bg-accent/50',
                    )}
                  >
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <MessageSquare className="h-3 w-3 shrink-0" />
                      <span className="truncate font-medium">
                        <Highlight text={h.conversationTitle} keyword={query} />
                      </span>
                      <span className="ml-auto shrink-0">
                        {h.role === 'user' ? '问' : '答'} · {formatTime(h.createdAt)}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs leading-snug text-muted-foreground">
                      <Highlight text={h.snippet} keyword={query} />
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )
        ) : conversations.length === 0 ? (
          <p className="px-3 py-6 text-center text-xs text-muted-foreground/70">还没有对话记录</p>
        ) : (
          // ---- 会话列表 ----
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

      {/* 搜索模式下隐藏新建按钮，避免误触 */}
      {!isSearching && (
        <button
          onClick={onNew}
          className="mx-3 mb-3 flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-border py-2 text-[13px] text-muted-foreground transition-colors hover:border-primary/50 hover:bg-accent/50 hover:text-foreground"
        >
          <Plus className="h-3.5 w-3.5" />
          新建对话
        </button>
      )}
    </>
  );

  if (variant === 'panel') {
    return (
      <aside
        className={cn(
          'relative flex h-full shrink-0 flex-col bg-background',
          !collapsed && 'border-r',
          dragging ? '' : 'transition-[width] duration-150',
        )}
        style={{ width: collapsed ? 44 : panelWidth }}
      >
        {collapsed ? (
          <div className="flex h-12 shrink-0 items-center justify-center">
            <button
              onClick={() => setCollapsed(false)}
              title="展开侧栏"
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <PanelLeftOpen className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <>
            {header}
            {content}
          </>
        )}
        {!collapsed && (
          <div
            className="absolute inset-y-0 -right-[3px] z-10 w-1.5 cursor-col-resize hover:bg-primary/50 active:bg-primary/70"
            onPointerDown={handleDragStart}
            onPointerMove={handleDragMove}
            onPointerUp={handleDragEnd}
            onPointerCancel={handleDragEnd}
            title="拖拽调整宽度"
          />
        )}
      </aside>
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
        {header}
        {content}
      </aside>
    </>
  );
}
