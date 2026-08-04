import { useState } from 'react';
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Database,
  Download,
  FileJson,
  FileText,
  GripVertical,
  MessageSquare,
  Monitor,
  Moon,
  Palette,
  Pencil,
  Plus,
  Server,
  Sun,
  Trash2,
} from 'lucide-react';
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

/** 分区标题：小图标 + 标题 + 可选右侧操作 */
function SectionTitle({
  icon: Icon,
  title,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between">
      <h3 className="flex items-center gap-1.5 text-[13px] font-medium text-foreground">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        {title}
      </h3>
      {action}
    </div>
  );
}

/**
 * 可拖拽服务商行：@dnd-kit useSortable。
 * - 手柄（⠿）拖拽排序，拖拽时其他行自动让位动画
 * - 点击行切换为当前服务商，编辑/删除独立不冲突
 */
function SortableProviderItem({
  provider,
  isActive,
  activeModel,
  onSelect,
  onEdit,
  onRemove,
  onModelChange,
}: {
  provider: ProviderConfig;
  isActive: boolean;
  activeModel: string | undefined;
  onSelect: (id: string) => void;
  onEdit: (p: ProviderConfig) => void;
  onRemove: (p: ProviderConfig) => void;
  onModelChange: (id: string, model: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: provider.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li ref={setNodeRef} style={style} className={isDragging ? 'relative z-50' : ''}>
      <div
        role="button"
        tabIndex={0}
        onClick={() => onSelect(provider.id)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelect(provider.id);
          }
        }}
        className={cn(
          'group rounded-xl border px-3 py-2.5 transition-colors',
          isActive
            ? 'border-primary/40 bg-accent/40 shadow-sm'
            : 'border-border hover:border-primary/25 hover:bg-accent/30',
          isDragging && 'scale-[1.02] border-primary/60 shadow-xl ring-2 ring-primary/30',
        )}
      >
        <div className="flex items-center gap-2.5">
          {/* 拖拽手柄：按住拖动排序 */}
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab touch-none rounded p-0.5 text-muted-foreground/30 transition-colors hover:bg-accent hover:text-muted-foreground active:cursor-grabbing"
            title="拖动排序"
          >
            <GripVertical className="h-4 w-4" />
          </button>

          <p className="min-w-0 flex-1 truncate text-[13px] font-medium leading-tight">
            {provider.name}
            {isActive && (
              <span className="ml-1.5 rounded-full bg-primary/15 px-1.5 py-px align-middle text-[10px] font-normal text-primary">
                当前
              </span>
            )}
          </p>

          {/* 管理操作：不触发切换 */}
          <div className="flex shrink-0 items-center" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => onEdit(provider)}
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              title="编辑"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            {!provider.builtin && (
              <button
                onClick={() => onRemove(provider)}
                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                title="删除"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* 第二行：当前项内嵌模型下拉；非当前项展示模型列表 */}
        <div className="mt-1.5" onClick={(e) => e.stopPropagation()}>
          {isActive ? (
            provider.models.length > 0 ? (
              <Select
                value={activeModel ?? ''}
                onValueChange={(m) => onModelChange(provider.id, m)}
              >
                <SelectTrigger className="h-7 max-w-[220px] text-xs shadow-none">
                  <SelectValue placeholder="选择模型" />
                </SelectTrigger>
                <SelectContent>
                  {provider.models.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-[11px] text-muted-foreground/70">未配置模型，点击 ✎ 编辑添加</p>
            )
          ) : (
            <p className="truncate text-[11px] text-muted-foreground/80">
              {provider.models.length > 0 ? provider.models.join(' · ') : '未配置模型'}
            </p>
          )}
        </div>
      </div>
    </li>
  );
}

/**
 * 设置弹窗：服务商 / 对话 / 外观 / 数据 四个分区。
 * 服务商列表即选择器：点击任意项设为当前，当前项内嵌模型下拉，手柄拖拽排序。
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
  const reorderProviders = useSettingsStore((s) => s.reorderProviders);
  const activeId = useChatStore((s) => s.activeId);
  const chatMessages = useChatStore((s) => s.messages);
  const conversations = useChatStore((s) => s.conversations);

  const [editing, setEditing] = useState<ProviderConfig | null | undefined>(undefined);

  const providers = settings?.providers ?? [];

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  // 拖拽结束：按 id 定位前后位置并持久化
  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = providers.findIndex((p) => p.id === active.id);
    const newIndex = providers.findIndex((p) => p.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    void reorderProviders(oldIndex, newIndex);
  };

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
      <DialogContent className="max-w-lg">
        <DialogHeader className="px-5 pb-2 pt-4">
          <DialogTitle>设置</DialogTitle>
          <DialogDescription>服务商 · 对话 · 外观 · 数据</DialogDescription>
        </DialogHeader>

        <div className="max-h-[62vh] space-y-6 overflow-y-auto px-5 py-4">
          {/* 服务商：列表即选择器 */}
          <section className="space-y-2.5">
            <SectionTitle
              icon={Server}
              title="服务商"
              action={
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1 text-xs"
                  onClick={() => setEditing(null)}
                >
                  <Plus className="h-3 w-3" />
                  添加
                </Button>
              }
            />

            {providers.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
                还没有服务商，点击右上角「添加」开始配置
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={providers.map((p) => p.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <ul className="space-y-1.5">
                    {providers.map((p) => (
                      <SortableProviderItem
                        key={p.id}
                        provider={p}
                        isActive={p.id === settings?.activeProviderId}
                        activeModel={settings?.activeModel}
                        onSelect={(id) => void setActive(id)}
                        onEdit={(prov) => setEditing(prov)}
                        onRemove={handleRemove}
                        onModelChange={(id, m) => void setActive(id, m)}
                      />
                    ))}
                  </ul>
                </SortableContext>
              </DndContext>
            )}
          </section>

          {/* 对话 */}
          <section className="space-y-2.5">
            <SectionTitle icon={MessageSquare} title="对话" />

            {/* 输出模式 */}
            <div className="rounded-xl border border-border p-3">
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
            <div className="flex items-center justify-between rounded-xl border border-border px-3 py-2.5">
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

          {/* 外观 */}
          <section className="space-y-2.5">
            <SectionTitle icon={Palette} title="外观" />
            <div className="grid grid-cols-3 gap-2">
              {THEMES.map((t) => {
                const Icon = t.icon;
                const active = settings?.theme === t.value;
                return (
                  <button
                    key={t.value}
                    onClick={() => void setTheme(t.value)}
                    className={cn(
                      'flex flex-col items-center gap-1.5 rounded-xl border py-2.5 text-xs transition-all',
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
            <SectionTitle icon={Database} title="数据" />
            <div className="space-y-1.5">
              <button
                onClick={() => void exportAllJson()}
                className="flex w-full items-center gap-2 rounded-xl border border-border px-3 py-2 text-left transition-colors hover:bg-accent/40"
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
                className="flex w-full items-center gap-2 rounded-xl border border-border px-3 py-2 text-left transition-colors hover:bg-accent/40 disabled:cursor-not-allowed disabled:opacity-40"
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
                className="flex w-full items-center gap-2 rounded-xl border border-destructive/30 px-3 py-2 text-left transition-colors hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4 text-destructive" />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium leading-tight text-destructive">
                    清空所有数据
                  </p>
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
