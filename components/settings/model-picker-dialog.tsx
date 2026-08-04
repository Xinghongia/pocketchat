import { useEffect, useMemo, useState } from 'react';
import { Check, Search } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface ModelPickerDialogProps {
  open: boolean;
  /** 服务商返回的全部候选模型 */
  models: string[];
  /** 当前已选模型 */
  selected: string[];
  onOpenChange: (open: boolean) => void;
  onConfirm: (selected: string[]) => void;
}

/**
 * 模型选择对话框：勾选要使用的模型（不全部塞入）。
 * 支持搜索过滤，确定后按候选顺序返回勾选结果。
 */
export function ModelPickerDialog({
  open,
  models,
  selected,
  onOpenChange,
  onConfirm,
}: ModelPickerDialogProps) {
  const [query, setQuery] = useState('');
  const [checked, setChecked] = useState<Set<string>>(() => new Set(selected));

  // 每次打开时同步勾选状态与清空搜索
  useEffect(() => {
    if (open) {
      setChecked(new Set(selected));
      setQuery('');
    }
  }, [open, selected]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return models;
    return models.filter((m) => m.toLowerCase().includes(q));
  }, [models, query]);

  const toggle = (m: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(m)) next.delete(m);
      else next.add(m);
      return next;
    });
  };

  const confirm = () => {
    // 保持候选顺序，去重
    const order = new Map(models.map((m, i) => [m, i]));
    const list = Array.from(checked).sort((a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0));
    onConfirm(list);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader className="border-b px-5 pb-3 pt-4">
          <DialogTitle>选择模型</DialogTitle>
          <DialogDescription>共 {models.length} 个可用模型，勾选你需要的</DialogDescription>
        </DialogHeader>

        <div className="px-5 py-4">
          {/* 搜索框 */}
          <div className="relative mb-3">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索模型…"
              className="pl-8"
              autoFocus
            />
          </div>

          {/* 勾选列表 */}
          <div className="max-h-64 overflow-y-auto rounded-lg border bg-card">
            {filtered.length === 0 ? (
              <p className="px-3 py-6 text-center text-xs text-muted-foreground">没有匹配的模型</p>
            ) : (
              filtered.map((m) => {
                const on = checked.has(m);
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => toggle(m)}
                    className={cn(
                      'flex w-full items-center gap-2.5 border-b border-border/60 px-3 py-2 text-left text-[13px] last:border-0',
                      'transition-colors hover:bg-accent/60',
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors',
                        on
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-input bg-transparent',
                      )}
                    >
                      {on && <Check className="h-3 w-3" />}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{m}</span>
                  </button>
                );
              })
            )}
          </div>

          {/* 底部操作 */}
          <div className="mt-3 flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">已选 {checked.size} 个</span>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
                取消
              </Button>
              <Button size="sm" onClick={confirm} disabled={checked.size === 0}>
                确定
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
