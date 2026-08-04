import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ChatShellProps {
  children: ReactNode;
  className?: string;
}

/**
 * 聊天布局壳：纵向三明治结构（顶部栏 / 内容 / 输入区）。
 * 三种形态只需传入各自的宽度/高度容器，内部结构完全复用。
 */
export function ChatShell({ children, className }: ChatShellProps) {
  return <div className={cn('flex h-full w-full flex-col overflow-hidden', className)}>{children}</div>;
}
