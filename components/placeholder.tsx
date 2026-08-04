import { cn } from '@/lib/utils';

/**
 * 占位组件：仅用于架构阶段验证容器可用。
 * 后续正式页面会替换掉它。
 */
export function Placeholder({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4 p-8 text-center">
      <div
        className={cn(
          'flex h-12 w-12 items-center justify-center rounded-2xl',
          'bg-gradient-to-br from-primary/90 to-accent text-primary-foreground',
          'shadow-lg shadow-primary/20',
        )}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6">
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
        </svg>
      </div>
      <div>
        <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
        {hint && <p className="mt-1 text-sm text-muted-foreground">{hint}</p>}
      </div>
    </div>
  );
}
