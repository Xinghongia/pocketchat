import { memo, useRef, useState } from 'react';
import { Bot, Check, ChevronDown, Copy, Pencil, RefreshCw, X } from 'lucide-react';
import type { ChatMessage } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Markdown } from './markdown';

interface MessageItemProps {
  message: ChatMessage;
  /** 是否正在流式输出（显示光标 + 隐藏操作按钮） */
  streaming?: boolean;
  /** 紧凑模式：悬浮窗等小尺寸容器使用 */
  compact?: boolean;
  /** 重新生成该 AI 回复 */
  onRegenerate?: (messageId: string) => void;
  /** 编辑该用户消息 */
  onEdit?: (messageId: string, content: string) => void;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          /* 剪贴板不可用时静默 */
        }
      }}
      className={cn(
        'inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px]',
        'text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground',
      )}
      title="复制"
    >
      {copied ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3" />}
      {copied ? '已复制' : '复制'}
    </button>
  );
}

/** 小号图标操作按钮（hover 显示的操作区共用） */
function ActionButton({
  onClick,
  title,
  children,
}: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={cn(
        'inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px]',
        'text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground',
      )}
    >
      {children}
    </button>
  );
}

/**
 * 思考过程块：推理模型（如 DeepSeek-R1）的 reasoning 内容。
 * 折叠展示；流式中自动展开，完成后可手动收放。
 */
function ReasoningBlock({ text, streaming }: { text: string; streaming?: boolean }) {
  const [open, setOpen] = useState(true);
  return (
    <details
      open={streaming || open}
      onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}
      className="group mb-1.5"
    >
      <summary className="flex cursor-pointer select-none items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground">
        <ChevronDown className="h-3 w-3 transition-transform group-open:rotate-180" />
        {streaming ? '思考中…' : '已深度思考'}
      </summary>
      <div className="mt-1 border-l-2 border-border/50 pl-2.5 text-[12px] leading-relaxed text-muted-foreground whitespace-pre-wrap">
        {text}
      </div>
    </details>
  );
}

/**
 * 单条聊天消息（聊天风格，宽度自适应不占满）。
 * - 用户消息：右侧主色气泡（聊天惯例），hover 可编辑
 * - 助手消息：左侧头像 + 纯文字内容（无背景气泡），上限 85%，hover 可复制/重新生成
 */
export const MessageItem = memo(function MessageItem({
  message,
  streaming,
  compact,
  onRegenerate,
  onEdit,
}: MessageItemProps) {
  const isUser = message.role === 'user';
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.content);
  const taRef = useRef<HTMLTextAreaElement>(null);

  // 进入编辑：填入当前内容并聚焦
  const startEdit = () => {
    setDraft(message.content);
    setEditing(true);
    requestAnimationFrame(() => {
      taRef.current?.focus();
      taRef.current?.select();
    });
  };

  const commitEdit = () => {
    const text = draft.trim();
    if (text && text !== message.content) onEdit?.(message.id, text);
    setEditing(false);
  };

  if (isUser) {
    // 编辑模式：内联文本框 + 保存/取消
    if (editing) {
      return (
        <div className={cn('flex justify-end', compact ? 'px-2 py-1.5' : 'px-4 py-2.5')}>
          <div className="w-full max-w-[85%]">
            <textarea
              ref={taRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  commitEdit();
                }
                if (e.key === 'Escape') setEditing(false);
              }}
              rows={Math.min(6, Math.max(2, draft.split('\n').length))}
              className={cn(
                'w-full resize-none rounded-xl border bg-card px-3 py-2 text-[13.5px]',
                'focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-ring/30',
              )}
              placeholder="修改这条消息…"
            />
            <div className="mt-1.5 flex justify-end gap-1.5">
              <button
                onClick={() => setEditing(false)}
                className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent"
              >
                <X className="h-3.5 w-3.5" /> 取消
              </button>
              <button
                onClick={commitEdit}
                disabled={!draft.trim()}
                className="inline-flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1 text-xs text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                <Check className="h-3.5 w-3.5" /> 发送
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className={cn('group flex justify-end', compact ? 'px-2 py-1.5' : 'px-4 py-2.5')}>
        <div className="min-w-0 max-w-[85%]">
          <div
            className={cn(
              'whitespace-pre-wrap rounded-2xl rounded-br-md',
              'bg-primary text-primary-foreground shadow-sm shadow-primary/20',
              compact ? 'px-3 py-2 text-[13px]' : 'px-3.5 py-2.5 text-[13.5px]',
            )}
          >
            {message.content}
          </div>
          {/* 操作区：hover 显示编辑 */}
          {!streaming && (
            <div
              className={cn(
                'flex justify-end pr-1 opacity-0 transition-opacity group-hover:opacity-100',
                compact ? 'mt-0.5' : 'mt-1',
              )}
            >
              <ActionButton onClick={startEdit} title="编辑并重新提问">
                <Pencil className="h-3 w-3" /> 编辑
              </ActionButton>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('group flex w-full items-start gap-2.5', compact ? 'px-2 py-1.5' : 'px-4 py-2.5')}>
      {/* 头像 */}
      <div
        className={cn(
          'mt-1 flex shrink-0 items-center justify-center rounded-lg',
          'bg-gradient-to-br from-primary/90 to-accent text-primary-foreground shadow-sm',
          compact ? 'h-6 w-6' : 'h-7 w-7',
        )}
      >
        <Bot className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
      </div>

      {/* 内容：纯文字（无气泡背景），宽度上限 85% 不占满整行 */}
      <div className="min-w-0 max-w-[85%]">
        <div className={compact ? 'py-0.5' : 'py-1'}>
          {message.reasoning && <ReasoningBlock text={message.reasoning} streaming={streaming} />}
          {message.content ? (
            <Markdown
              content={message.content}
              className={compact ? 'text-[13px]' : 'text-[13.5px] leading-[1.7]'}
            />
          ) : (
            <span className="text-muted-foreground">…</span>
          )}
          {streaming && (
            <span
              className="ml-0.5 inline-block h-3.5 w-[2px] translate-y-0.5 rounded-full bg-primary align-baseline"
              style={{ animation: 'pc-blink 1s step-end infinite' }}
            />
          )}
        </div>

        {/* 操作区：hover 显示 复制 / 重新生成 */}
        {!streaming && message.content && (
          <div
            className={cn(
              'flex pl-1 opacity-0 transition-opacity group-hover:opacity-100',
              compact ? 'mt-0.5' : 'mt-1',
            )}
          >
            <CopyButton text={message.content} />
            <ActionButton onClick={() => onRegenerate?.(message.id)} title="重新生成">
              <RefreshCw className="h-3 w-3" /> 重新生成
            </ActionButton>
          </div>
        )}
      </div>
    </div>
  );
});
