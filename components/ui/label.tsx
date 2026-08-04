import { cn } from '@/lib/utils';

interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {}

/** 表单标签（shadcn 风格） */
export function Label({ className, ...props }: LabelProps) {
  return (
    <label
      className={cn(
        'text-[13px] font-medium leading-none text-foreground peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
        className,
      )}
      {...props}
    />
  );
}
