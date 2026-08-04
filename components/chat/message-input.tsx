import { useRef, useState } from 'react';
import { ArrowUp, Square } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MessageInputProps {
  onSend: (text: string) => void;
  onStop?: () => void;
  streaming?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

/**
 * 消息输入区：自适应高度文本框 + 发送/停止按钮。
 * Enter 发送，Shift+Enter 换行（兼容中文输入法组合态）。
 */
export function MessageInput({
  onSend,
  onStop,
  streaming,
  disabled,
  placeholder = '输入消息，Enter 发送，Shift+Enter 换行',
  className,
}: MessageInputProps) {
  const [value, setValue] = useState('');
  const taRef = useRef<HTMLTextAreaElement>(null);

  const canSend = value.trim().length > 0 && !streaming && !disabled;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      if (canSend) submit();
    }
  };

  const submit = () => {
    if (!canSend) return;
    onSend(value.trim());
    setValue('');
    requestAnimationFrame(() => {
      if (taRef.current) taRef.current.style.height = 'auto';
      taRef.current?.focus();
    });
  };

  // 自适应高度：最多 8 行
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 8 * 22 + 16)}px`;
  };

  return (
    <div className={cn('border-t bg-background/80 backdrop-blur px-3 pb-3 pt-2', className)}>
      <div
        className={cn(
          'flex items-end gap-2 rounded-xl border bg-card px-2.5 py-2 shadow-sm transition-colors',
          'focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-ring/30',
        )}
      >
        <textarea
          ref={taRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          rows={1}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            'max-h-[176px] min-h-[24px] flex-1 resize-none bg-transparent px-1 py-0.5 text-[13.5px] leading-6',
            'placeholder:text-muted-foreground/60',
            'focus:outline-none disabled:opacity-50',
          )}
        />
        {streaming ? (
          <button
            onClick={onStop}
            title="停止生成"
            className={cn(
              'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
              'bg-destructive text-destructive-foreground shadow-sm transition-transform hover:scale-105 active:scale-95',
            )}
          >
            <Square className="h-3.5 w-3.5 fill-current" />
          </button>
        ) : (
          <button
            onClick={submit}
            disabled={!canSend}
            title="发送"
            className={cn(
              'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all',
              canSend
                ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/30 hover:scale-105 active:scale-95'
                : 'bg-muted text-muted-foreground/50',
              'disabled:cursor-not-allowed',
            )}
          >
            <ArrowUp className="h-4 w-4" strokeWidth={2.5} />
          </button>
        )}
      </div>
      <p className="mt-1.5 px-1 text-[11px] text-muted-foreground/60">
        AI 生成内容仅供参考 · 数据仅保存在本地
      </p>
    </div>
  );
}
