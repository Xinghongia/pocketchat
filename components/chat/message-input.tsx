import { useEffect, useRef, useState } from 'react';
import { ArrowUp, Square } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MessageInputProps {
  onSend: (text: string) => void;
  onStop?: () => void;
  streaming?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  /** 初始预填内容（划词提问 / 页面总结注入用） */
  initialValue?: string;
}

/**
 * 消息输入区（GPT/Claude 风格）：
 * 大圆角悬浮输入框 + 聚焦发光 + 圆形渐变发送按钮。
 * Enter 发送，Shift+Enter 换行（兼容中文输入法组合态）。
 */
export function MessageInput({
  onSend,
  onStop,
  streaming,
  disabled,
  placeholder = '输入消息，Enter 发送，Shift+Enter 换行',
  className,
  initialValue,
}: MessageInputProps) {
  const [value, setValue] = useState(initialValue ?? '');
  const taRef = useRef<HTMLTextAreaElement>(null);

  // 预填内容：挂载时调整高度并聚焦，方便直接编辑/发送
  useEffect(() => {
    if (!initialValue) return;
    const el = taRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${Math.min(el.scrollHeight, 8 * 22 + 16)}px`;
      el.focus();
    }
    // 仅挂载时执行一次（划词注入的是一次性初始值）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    <div
      className={cn(
        'border-t bg-background/80 px-4 pb-3 pt-2.5 backdrop-blur',
        className,
      )}
    >
      <div
        className={cn(
          'flex items-end gap-2 rounded-[22px] border bg-card px-3.5 py-2.5',
          'shadow-sm transition-all duration-200',
          'focus-within:border-primary/40 focus-within:shadow-md focus-within:shadow-primary/10',
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
            'max-h-[176px] min-h-[26px] flex-1 resize-none bg-transparent px-1 py-1',
            'text-sm leading-relaxed text-foreground',
            'placeholder:text-muted-foreground/50',
            'focus:outline-none disabled:opacity-50',
          )}
        />
        {streaming ? (
          <button
            onClick={onStop}
            title="停止生成"
            className={cn(
              'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
              'bg-destructive/10 text-destructive transition-all',
              'hover:bg-destructive hover:text-destructive-foreground active:scale-95',
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
              'flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all duration-200',
              canSend
                ? 'bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-md shadow-primary/30 hover:scale-110 hover:shadow-lg hover:shadow-primary/40 active:scale-95'
                : 'bg-muted text-muted-foreground/40',
              'disabled:cursor-not-allowed',
            )}
          >
            <ArrowUp className="h-4 w-4" strokeWidth={2.5} />
          </button>
        )}
      </div>
      <p className="mt-2 select-none px-2 text-center text-[10.5px] tracking-wide text-muted-foreground/50">
        AI 生成内容仅供参考 · 数据仅保存在本地
      </p>
    </div>
  );
}
