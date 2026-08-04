import { memo, useState } from 'react';
import { Bot, Check, Copy } from 'lucide-react';
import type { ChatMessage } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Markdown } from './markdown';

interface MessageItemProps {
  message: ChatMessage;
  /** 是否正在流式输出（显示光标 + 隐藏操作按钮） */
  streaming?: boolean;
  /** 紧凑模式：悬浮窗等小尺寸容器使用 */
  compact?: boolean;
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

/**
 * 单条聊天消息。
 * - 用户消息：右侧主色气泡
 * - 助手消息：左侧卡片 + 头像 + 复制按钮
 */
export const MessageItem = memo(function MessageItem({
  message,
  streaming,
  compact,
}: MessageItemProps) {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <div className={cn('flex justify-end', compact ? 'px-2 py-1.5' : 'px-4 py-2')}>
        <div
          className={cn(
            'max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md',
            'bg-primary text-primary-foreground shadow-sm shadow-primary/20',
            compact ? 'px-3 py-2 text-[13px]' : 'px-3.5 py-2.5 text-[13.5px]',
          )}
        >
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('group flex gap-2.5', compact ? 'px-2 py-1.5' : 'px-4 py-2')}>
      {/* 头像 */}
      <div
        className={cn(
          'mt-0.5 flex shrink-0 items-center justify-center rounded-lg',
          'bg-gradient-to-br from-primary/90 to-accent text-primary-foreground shadow-sm',
          compact ? 'h-6 w-6' : 'h-7 w-7',
        )}
      >
        <Bot className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
      </div>

      {/* 内容卡片 */}
      <div className="min-w-0 flex-1">
        <div
          className={cn(
            'rounded-2xl rounded-tl-md border bg-card text-card-foreground shadow-sm',
            compact ? 'px-3 py-2' : 'px-3.5 py-2.5',
          )}
        >
          {message.content ? (
            <Markdown content={message.content} className={compact ? 'text-[13px]' : undefined} />
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

        {/* 操作区 */}
        {!streaming && message.content && (
          <div className={cn('flex opacity-0 transition-opacity group-hover:opacity-100', compact ? 'mt-0.5' : 'mt-1')}>
            <CopyButton text={message.content} />
          </div>
        )}
      </div>
    </div>
  );
});
