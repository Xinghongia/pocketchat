import { useState } from 'react';
import { Download, FileJson, FileText, Monitor, Moon, Pencil, Plus, Sun, Trash2 } from 'lucide-react';
import type { ProviderConfig, StreamMode } from '@/lib/types';
import { useSettingsStore } from '@/stores/settings';
import { useChatStore } from '@/stores/chat';
import { exportAllJson, exportConversationMarkdown } from '@/lib/export';
import { clearAll } from '@/lib/storage/db';
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
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { ProviderDialog } from './provider-dialog';

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const THEMES = [
  { value: 'light', label: '浅色', icon: Sun },
  { value: 'dark', label: '深色', icon: Moon },
  { value: 'system', label: '跟随系统', icon: Monitor },
] as const;

const STREAM_MODES: Array<{ value: StreamMode; label: string; desc: string }> = [
  { value: 'stream', label: '流式输出', desc: '逐字显示，响应更快可见' },
  { value: 'non-stream', label: '一次性输出', desc: '等待完整结果后显示' },
];

/**
 * 设置弹窗：模型 / 服务商 / 外观 三个分区。
 * 弹窗在三种形态中尺寸一致，直接复用。
 */
export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const settings = useSettingsStore((s) => s.settings);
  const setActive = useSettingsStore((s) => s.setActive);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const setStreamMode = useSettingsStore((s) => s.setStreamMode);
  const setShowReasoning = useSettingsStore((s) => s.setShowReasoning);
  const addProvider = useSettingsStore((s) => s.addProvider);
  const updateProvider = useSettingsStore((s) => s.updateProvider);
  const removeProvider = useSettingsStore((s) => s.removeProvider);
  const activeId = useChatStore((s) => s.activeId);
  const chatMessages = useChatStore((s) => s.messages);
  const conversations = useChatStore((s) => s.conversations);

  const [editing, setEditing] = useState<ProviderConfig | null | undefined>(undefined);

  const providers = settings?.providers ?? [];
  const activeProvider = providers.find((p) => p.id === settings?.activeProviderId);

  const activeConv = conversations.find((c) => c.id === activeId) ?? null;

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
                      <SelectValue placeholder="未选择" />
                    </SelectTrigger>
                    <SelectContent>
                      {providers.length === 0 ? (
                        <div className="px-3 py-2 text-xs text-muted-foreground">
                          暂无服务商，点击下方「添加」
                        </div>
                      ) : (
                        providers.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))
                      )}
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
                    disabled={!activeProvider}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={activeProvider ? '选择模型' : '先选服务商'} />
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

            {/* 对话设置 */}
            <section className="space-y-2.5">
              <h3 className="text-[13px] font-medium text-foreground">对话</h3>

              {/* 输出模式 */}
              <div className="rounded-lg border border-border p-3">
                <p className="text-[13px] font-medium">输出模式</p>
                <div className="mt-2 grid gap-1.5">
                  {STREAM_MODES.map((m) => {
                    const active = (settings?.streamMode ?? 'stream') === m.value;
                    return (
                      <button
                        key={m.value}
                        onClick={() => void setStreamMode(m.value)}
                        className={cn(
                          'flex items-center justify-between rounded-lg border px-3 py-2 text-left transition-all',
                          active
                            ? 'border-primary/50 bg-accent/50'
                            : 'border-border hover:bg-accent/40',
                        )}
                      >
                        <div>
                          <p className="text-[13px] font-medium leading-tight">{m.label}</p>
                          <p className="text-[11px] text-muted-foreground/80">{m.desc}</p>
                        </div>
                        <span
                          className={cn(
                            'h-3.5 w-3.5 rounded-full border transition-colors',
                            active ? 'border-primary bg-primary' : 'border-muted-foreground/40',
                          )}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 思考过程开关 */}
              <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
                <div>
                  <p className="text-[13px] font-medium">显示思考过程</p>
                  <p className="text-[11px] text-muted-foreground/80">
                    推理模型（如 DeepSeek-R1）的思考内容
                  </p>
                </div>
                <Switch
                  checked={settings?.showReasoning ?? true}
                  onCheckedChange={(v) => void setShowReasoning(v)}
                />
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
                {providers.length === 0 ? (
                  <li className="rounded-lg border border-dashed border-border px-3 py-3 text-center text-xs text-muted-foreground">
                    还没有服务商，点击右上角「添加」开始配置
                  </li>
                ) : (
                  providers.map((p) => (
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
                  ))
                )}
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

            {/* 数据 */}
            <section className="space-y-2.5">
              <h3 className="text-[13px] font-medium text-foreground">数据</h3>
              <div className="space-y-1.5">
                <button
                  onClick={() => void exportAllJson()}
                  className="flex w-full items-center gap-2 rounded-lg border border-border px-3 py-2 text-left transition-colors hover:bg-accent/40"
                >
                  <FileJson className="h-4 w-4 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium leading-tight">导出全部数据</p>
                    <p className="text-[11px] text-muted-foreground/80">
                      所有会话导出为 JSON（可备份 / 迁移）
                    </p>
                  </div>
                  <Download className="h-3.5 w-3.5 text-muted-foreground/60" />
                </button>

                <button
                  onClick={() => exportConversationMarkdown(activeConv, chatMessages)}
                  disabled={!activeId || chatMessages.length === 0}
                  className="flex w-full items-center gap-2 rounded-lg border border-border px-3 py-2 text-left transition-colors hover:bg-accent/40 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium leading-tight">导出当前会话</p>
                    <p className="text-[11px] text-muted-foreground/80">
                      当前对话导出为 Markdown（可分享）
                    </p>
                  </div>
                  <Download className="h-3.5 w-3.5 text-muted-foreground/60" />
                </button>

                <button
                  onClick={() => {
                    if (window.confirm('确定清空所有对话记录？此操作不可恢复！')) {
                      void clearAll();
                      window.location.reload();
                    }
                  }}
                  className="flex w-full items-center gap-2 rounded-lg border border-destructive/30 px-3 py-2 text-left transition-colors hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium leading-tight text-destructive">清空所有数据</p>
                    <p className="text-[11px] text-muted-foreground/80">
                      删除全部会话与消息，不可恢复
                    </p>
                  </div>
                </button>
              </div>
            </section>
          </div>
      </DialogContent>

      {/* 新增 / 编辑服务商的独立弹窗（叠加在设置之上） */}
      <ProviderDialog
        open={editing !== undefined}
        initial={editing ?? null}
        onOpenChange={(o) => {
          if (!o) setEditing(undefined);
        }}
        onSave={handleSaveProvider}
      />
    </Dialog>
  );
}
