import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

const SUGGESTIONS = [
  '用通俗的话解释一下量子计算',
  '帮我把这段文字润色得更专业',
  '总结一下当前页面的主要内容',
  '写一段 Python 快速排序的代码',
];

interface EmptyStateProps {
  hint?: string;
  compact?: boolean;
  onPick?: (text: string) => void;
}

/**
 * 空会话欢迎页：品牌标识 + 快捷示例。
 * 点击示例可填入输入框（由父组件通过 onPick 处理）。
 */
export function EmptyState({ hint, compact, onPick }: EmptyStateProps) {
  return (
    <div className={cn('flex h-full flex-col items-center justify-center', compact ? 'gap-3 px-4' : 'gap-4 px-6')}>
      <div
        className={cn(
          'flex items-center justify-center rounded-2xl',
          'bg-gradient-to-br from-primary/90 to-accent text-primary-foreground',
          'shadow-lg shadow-primary/25',
          compact ? 'h-10 w-10' : 'h-12 w-12',
        )}
      >
        <Sparkles className={compact ? 'h-5 w-5' : 'h-6 w-6'} />
      </div>

      <div className="text-center">
        <h2 className={cn('font-semibold tracking-tight', compact ? 'text-[15px]' : 'text-base')}>
          PocketChat
        </h2>
        <p className={cn('mt-0.5 text-muted-foreground', compact ? 'text-xs' : 'text-[13px]')}>
          {hint ?? '随时随地的 AI 助手 · 数据只留在你的设备上'}
        </p>
      </div>

      {onPick && (
        <div className={cn('grid w-full gap-1.5', compact ? 'max-w-[300px]' : 'max-w-sm')}>
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => onPick(s)}
              className={cn(
                'rounded-lg border bg-card px-3 py-2 text-left text-[12.5px] text-muted-foreground',
                'transition-all hover:border-primary/40 hover:bg-accent/60 hover:text-foreground',
                'cursor-pointer',
              )}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
