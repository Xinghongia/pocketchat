import type { ReactNode } from 'react';
import { Settings, SquarePen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface ChatHeaderProps {
  /** 左侧内容：标题 / Logo / 会话名（由各形态自行决定） */
  title?: ReactNode;
  /** 中间/右侧可插入自定义操作（如模型选择） */
  actions?: ReactNode;
  /** 新建对话回调（不传则隐藏按钮） */
  onNewChat?: () => void;
  /** 打开设置回调（必传，设置按钮是三大形态的通用入口） */
  onOpenSettings?: () => void;
  className?: string;
}

/**
 * 顶部栏：三种形态共用。
 * - 侧边栏：会话标题 + 模型选择 + 新建 + 设置
 * - 悬浮窗：紧凑标题 + 设置
 * - 全页面：左侧可放品牌/会话名
 */
export function ChatHeader({
  title,
  actions,
  onNewChat,
  onOpenSettings,
  className,
}: ChatHeaderProps) {
  return (
    <header
      className={cn(
        'flex h-12 shrink-0 items-center gap-1.5 bg-background/80 px-3 backdrop-blur',
        className,
      )}
    >
      <div className="min-w-0 flex-1 truncate text-sm font-medium tracking-tight">{title}</div>
      {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
      {onNewChat && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onNewChat}
          title="新建对话"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
        >
          <SquarePen className="h-4 w-4" />
        </Button>
      )}
      {onOpenSettings && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onOpenSettings}
          title="设置"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
        >
          <Settings className="h-4 w-4" />
        </Button>
      )}
    </header>
  );
}
