import { useState } from 'react';
import { Monitor, Moon, Pencil, Plus, Sun, Trash2 } from 'lucide-react';
import type { ProviderConfig } from '@/lib/types';
import { useSettingsStore } from '@/stores/settings';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { ProviderForm } from './provider-form';

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const THEMES = [
  { value: 'light', label: '浅色', icon: Sun },
  { value: 'dark', label: '深色', icon: Moon },
  { value: 'system', label: '跟随系统', icon: Monitor },
] as const;

/**
 * 设置弹窗：模型 / 服务商 / 外观 三个分区。
 * 弹窗在三种形态中尺寸一致，直接复用。
 */
export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const settings = useSettingsStore((s) => s.settings);
  const setActive = useSettingsStore((s) => s.setActive);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const addProvider = useSettingsStore((s) => s.addProvider);
  const updateProvider = useSettingsStore((s) => s.updateProvider);
  const removeProvider = useSettingsStore((s) => s.removeProvider);

  const [editing, setEditing] = useState<ProviderConfig | null | undefined>(undefined);

  const providers = settings?.providers ?? [];
  const activeProvider = providers.find((p) => p.id === settings?.activeProviderId);

  const handleSaveProvider = (p: ProviderConfig) => {
    if (p.builtin) {
      void updateProvider(p);
    } else {
      void (editing ? updateProvider(p) : addProvider(p));
    }
    setEditing(undefined);
  };

  const handleRemove = (p: ProviderConfig) => {
    if (window.confirm(`确定删除服务商「${p.name}」？`)) {
      void removeProvider(p.id);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader className="border-b px-5 pb-3 pt-4">
          <DialogTitle>设置</DialogTitle>
          <DialogDescription>模型 · 服务商 · 外观</DialogDescription>
        </DialogHeader>

        {editing !== undefined ? (
          <div className="px-5 py-4">
            <h3 className="mb-3 text-sm font-semibold">
              {editing ? `编辑「${editing.name}」` : '添加服务商'}
            </h3>
            <ProviderForm
              initial={editing}
              onSave={handleSaveProvider}
              onCancel={() => setEditing(undefined)}
            />
          </div>
        ) : (
          <div className="max-h-[60vh] space-y-5 overflow-y-auto px-5 py-4">
            {/* 模型选择 */}
            <section className="space-y-2.5">
              <h3 className="text-[13px] font-medium text-foreground">当前模型</h3>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <p className="text-[11px] text-muted-foreground">服务商</p>
                  <Select
                    value={settings?.activeProviderId ?? ''}
                    onValueChange={(id) => void setActive(id)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择服务商" />
                    </SelectTrigger>
                    <SelectContent>
                      {providers.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <p className="text-[11px] text-muted-foreground">模型</p>
                  <Select
                    value={settings?.activeModel ?? ''}
                    onValueChange={(m) =>
                      activeProvider && void setActive(activeProvider.id, m)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择模型" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeProvider?.models.map((m) => (
                        <SelectItem key={m} value={m}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </section>

            {/* 服务商管理 */}
            <section className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-[13px] font-medium text-foreground">服务商</h3>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1 text-xs"
                  onClick={() => setEditing(null)}
                >
                  <Plus className="h-3 w-3" />
                  添加
                </Button>
              </div>
              <ul className="space-y-1.5">
                {providers.map((p) => (
                  <li
                    key={p.id}
                    className={cn(
                      'flex items-center gap-2 rounded-lg border px-3 py-2',
                      p.id === settings?.activeProviderId
                        ? 'border-primary/40 bg-accent/40'
                        : 'border-border',
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium leading-tight">
                        {p.name}
                        {p.id === settings?.activeProviderId && (
                          <span className="ml-1.5 text-[10px] font-normal text-primary">当前</span>
                        )}
                      </p>
                      <p className="truncate text-[11px] text-muted-foreground/80">
                        {p.models.length > 0 ? p.models.join(' · ') : '未配置模型'}
                      </p>
                    </div>
                    <button
                      onClick={() => setEditing(p)}
                      className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                      title="编辑"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    {!p.builtin && (
                      <button
                        onClick={() => handleRemove(p)}
                        className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                        title="删除"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </section>

            {/* 外观 */}
            <section className="space-y-2.5">
              <h3 className="text-[13px] font-medium text-foreground">外观</h3>
              <div className="grid grid-cols-3 gap-2">
                {THEMES.map((t) => {
                  const Icon = t.icon;
                  const active = settings?.theme === t.value;
                  return (
                    <button
                      key={t.value}
                      onClick={() => void setTheme(t.value)}
                      className={cn(
                        'flex flex-col items-center gap-1.5 rounded-lg border py-2.5 text-xs transition-all',
                        active
                          ? 'border-primary/50 bg-accent/50 text-foreground shadow-sm'
                          : 'border-border text-muted-foreground hover:bg-accent/40 hover:text-foreground',
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
