import { Settings2, Sparkles } from 'lucide-react';
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
  /** 是否已激活服务商（false 时显示「去添加」引导） */
  hasProvider?: boolean;
  /** 点击示例直接发送 */
  onPick?: (text: string) => void;
  /** 打开设置弹窗（无服务商引导用） */
  onOpenSettings?: () => void;
}

/**
 * 空会话欢迎页。
 * - 未配置服务商：引导卡片「去添加服务商」
 * - 已配置：品牌标识 + 快捷示例（点击直接发送）
 */
export function EmptyState({ hint, compact, hasProvider = true, onPick, onOpenSettings }: EmptyStateProps) {
  if (!hasProvider) {
    return (
      <div className={cn('flex h-full flex-col items-center justify-center', compact ? 'gap-3 px-4' : 'gap-4 px-6')}>
        <div
          className={cn(
            'flex items-center justify-center rounded-2xl',
            'bg-muted text-muted-foreground',
            compact ? 'h-10 w-10' : 'h-12 w-12',
          )}
        >
          <Sparkles className={compact ? 'h-5 w-5' : 'h-6 w-6'} />
        </div>

        <div className="text-center">
          <h2 className={cn('font-semibold tracking-tight', compact ? 'text-[15px]' : 'text-base')}>
            还没有配置服务商
          </h2>
          <p className={cn('mx-auto mt-1 max-w-[260px] text-muted-foreground', compact ? 'text-xs' : 'text-[13px]')}>
            在设置中添加一个 OpenAI 兼容的服务商（云端 API 或本地 Ollama 均可），填上 Key 就能开始对话
          </p>
        </div>

        <button
          onClick={onOpenSettings}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[13px] font-medium',
            'bg-primary text-primary-foreground shadow-sm shadow-primary/25',
            'transition-all hover:bg-primary/90 active:scale-[.98]',
          )}
        >
          <Settings2 className="h-4 w-4" />
          去添加服务商
        </button>

        {onPick && (
          <p className={cn('text-[11px] text-muted-foreground/70', compact ? 'mt-1' : 'mt-2')}>
            已内置 OpenAI / DeepSeek / 通义 / 智谱 / Kimi / Ollama 预设，填 Key 即可用
          </p>
        )}
      </div>
    );
  }

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
