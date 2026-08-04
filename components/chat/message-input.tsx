import { useEffect, useRef, useState } from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import { ArrowUp, Square } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PromptLibrary } from './prompt-library';

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
 * 自适应高度交给 react-textarea-autosize（min 1 行 / max 8 行）。
 * Enter 发送，Shift+Enter 换行（兼容中文输入法组合态）。
 */
export function MessageInput({
  onSend,
  onStop,
  streaming,
  disabled,
  placeholder = '输入消息，Enter 发送',
  className,
  initialValue,
}: MessageInputProps) {
  const [value, setValue] = useState(initialValue ?? '');
  const taRef = useRef<HTMLTextAreaElement>(null);

  // 预填内容：挂载时聚焦，方便直接编辑/发送
  useEffect(() => {
    if (!initialValue) return;
    const el = taRef.current;
    if (el) el.focus();
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
    requestAnimationFrame(() => taRef.current?.focus());
  };

  // 模板填入：替换当前内容并聚焦
  const applyPrompt = (content: string) => {
    setValue(content);
    requestAnimationFrame(() => taRef.current?.focus());
  };

  return (
    <div className={cn('bg-background/80 px-4 pb-4 pt-3 backdrop-blur', className)}>
      <div className="mx-auto w-full max-w-3xl">
        <div
          className={cn(
            'flex items-end gap-2 rounded-[24px] border border-border/70 bg-card px-4 py-3',
            'shadow-[0_1px_6px_rgba(0,0,0,0.05)] transition-all duration-200',
            'hover:border-border',
            'focus-within:border-primary/40 focus-within:shadow-[0_2px_10px_rgba(99,102,241,0.08)]',
          )}
        >
          <PromptLibrary onPick={applyPrompt} disabled={disabled} />
          <TextareaAutosize
            ref={taRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            minRows={1}
            maxRows={8}
            placeholder={placeholder}
            disabled={disabled}
            className={cn(
              'min-h-[28px] flex-1 resize-none bg-transparent px-1 py-1.5',
              'text-sm leading-relaxed text-foreground',
              'placeholder:text-muted-foreground/50',
              // 占位文字强制单行：侧边栏宽度不足时省略号截断，不换行撑高输入框
              'placeholder:whitespace-nowrap placeholder:overflow-hidden placeholder:text-ellipsis',
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
        <p className="mt-2.5 select-none text-center text-[10.5px] tracking-wide text-muted-foreground/50">
          AI 生成内容仅供参考 · 数据仅保存在本地
        </p>
      </div>
    </div>
  );
}
