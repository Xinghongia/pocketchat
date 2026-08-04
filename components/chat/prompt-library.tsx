import { useState } from 'react';
import { Library, X } from 'lucide-react';
import { PROMPT_TEMPLATES } from '@/lib/prompts';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface PromptLibraryProps {
  /** 选择模板后回调（内容已就绪，可填入输入框） */
  onPick: (content: string) => void;
  disabled?: boolean;
}

/**
 * 提示词模板库：输入框左侧的图书按钮，点击弹出模板列表，
 * 选择后把模板内容填入输入框（可继续编辑）。
 * 基于 Radix Popover：自动定位、点击外部/ESC 关闭、焦点管理。
 */
export function PromptLibrary({ onPick, disabled }: PromptLibraryProps) {
  const [open, setOpen] = useState(false);

  const pick = (content: string) => {
    onPick(content);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          disabled={disabled}
          title="提示词模板"
          aria-label="提示词模板"
          className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors',
            'hover:bg-accent hover:text-foreground',
            open && 'bg-accent text-foreground',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
          )}
        >
          <Library className="h-4 w-4" />
        </button>
      </PopoverTrigger>

      <PopoverContent align="start" side="top" sideOffset={8} className="w-72">
        <div className="flex items-center justify-between border-b border-border/70 px-3 py-2">
          <span className="text-xs font-medium text-foreground">提示词模板</span>
          <button
            onClick={() => setOpen(false)}
            className="rounded p-0.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="max-h-72 overflow-y-auto p-1.5">
          {PROMPT_TEMPLATES.map((t) => (
            <button
              key={t.id}
              onClick={() => pick(t.content)}
              className="flex w-full flex-col items-start gap-0.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-accent"
            >
              <span className="text-[13px] font-medium text-foreground">{t.name}</span>
              <span className="text-[11px] text-muted-foreground">{t.desc}</span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
