import { useEffect, useRef, useState } from 'react';
import { Loader2, Plus, RefreshCw, X } from 'lucide-react';
import type { ProviderConfig } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { fetchModelList } from '@/lib/api/client';
import { cn } from '@/lib/utils';
import { ModelPickerDialog } from './model-picker-dialog';

interface ProviderFormProps {
  /** 传入则编辑，null 则新建 */
  initial?: ProviderConfig | null;
  onSave: (p: ProviderConfig) => void;
  onCancel: () => void;
}

/**
 * 服务商编辑表单：名称 / Base URL / API Key / 模型列表。
 * 模型以标签（chip）形式展示，可手动添加、移除，
 * 或点「获取模型列表」拉取后弹窗勾选（不全部塞入）。
 */
export function ProviderForm({ initial, onSave, onCancel }: ProviderFormProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [baseUrl, setBaseUrl] = useState(initial?.baseUrl ?? '');
  const [apiKey, setApiKey] = useState(initial?.apiKey ?? '');
  const [models, setModels] = useState<string[]>(initial?.models ?? []);
  const [modelInput, setModelInput] = useState('');
  const modelInputRef = useRef<HTMLInputElement>(null);

  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [fetchedAll, setFetchedAll] = useState<string[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);

  const isBuiltin = initial?.builtin;
  const canSave = name.trim() && baseUrl.trim() && models.length > 0;
  const canFetch = baseUrl.trim().length > 0 && !fetching;

  const handleFetchModels = async () => {
    if (!canFetch) return;
    setFetching(true);
    setFetchError('');
    try {
      const list = await fetchModelList({
        baseUrl: baseUrl.trim(),
        apiKey: apiKey.trim() || undefined,
      });
      setFetchedAll(list);
      setPickerOpen(true);
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : '获取模型列表失败');
    } finally {
      setFetching(false);
    }
  };

  const handleAddModel = () => {
    const m = modelInput.trim();
    if (!m) return;
    setModels((prev) => (prev.includes(m) ? prev : [...prev, m]));
    setModelInput('');
    modelInputRef.current?.focus();
  };

  const handleRemoveModel = (m: string) => {
    setModels((prev) => prev.filter((x) => x !== m));
  };

  const handleSubmit = () => {
    if (!canSave) return;
    onSave({
      id: initial?.id ?? crypto.randomUUID(),
      name: name.trim(),
      baseUrl: baseUrl.trim().replace(/\/+$/, ''),
      apiKey: apiKey.trim(),
      models,
      builtin: isBuiltin,
    });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // 模型输入框内回车 = 添加模型，不提交整个表单
      if (e.target === modelInputRef.current) return;
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div className="flex flex-col gap-3.5">
      <div className="grid gap-1.5">
        <Label>名称</Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="如：DeepSeek"
          disabled={isBuiltin}
        />
      </div>

      <div className="grid gap-1.5">
        <Label>Base URL</Label>
        <Input
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
          placeholder="https://api.example.com/v1"
          disabled={isBuiltin}
        />
        <p className="text-[11px] text-muted-foreground/70">需为 OpenAI 兼容地址，以 /v1 结尾</p>
      </div>

      <div className="grid gap-1.5">
        <Label>API Key</Label>
        <Input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="sk-..."
          autoComplete="off"
        />
        <p className="text-[11px] text-muted-foreground/70">仅保存在本地浏览器，不会上传到任何服务器</p>
      </div>

      <div className="grid gap-1.5">
        <div className="flex items-center justify-between">
          <Label>模型列表</Label>
          <button
            type="button"
            onClick={() => void handleFetchModels()}
            disabled={!canFetch}
            className={cn(
              'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px]',
              'text-primary transition-colors hover:bg-accent',
              'disabled:cursor-not-allowed disabled:opacity-50',
            )}
            title="从服务商拉取模型列表，勾选要使用的"
          >
            {fetching ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <RefreshCw className="h-3 w-3" />
            )}
            获取模型列表
          </button>
        </div>

        {/* 已选模型：标签列表 */}
        {models.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 rounded-lg border bg-muted/40 p-2">
            {models.map((m) => (
              <span
                key={m}
                className="inline-flex items-center gap-1 rounded-md border bg-background px-2 py-0.5 text-[12px]"
              >
                {m}
                <button
                  type="button"
                  onClick={() => handleRemoveModel(m)}
                  className="text-muted-foreground transition-colors hover:text-destructive"
                  title="移除"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        ) : (
          <p className="rounded-lg border border-dashed px-3 py-4 text-center text-[11px] text-muted-foreground">
            尚未选择模型：点右上角获取后勾选，或手动添加
          </p>
        )}

        {/* 手动添加 */}
        <div className="flex gap-1.5">
          <Input
            ref={modelInputRef}
            value={modelInput}
            onChange={(e) => setModelInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                e.preventDefault();
                handleAddModel();
              }
            }}
            placeholder="手动输入模型名，回车添加"
            className={cn('h-8 text-[12px]', fetchError && 'border-destructive')}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddModel}
            disabled={!modelInput.trim()}
            className="h-8 shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
            添加
          </Button>
        </div>

        {fetchError && <p className="text-[11px] text-destructive">{fetchError}</p>}
      </div>

      <div className="mt-1 flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          取消
        </Button>
        <Button size="sm" onClick={handleSubmit} disabled={!canSave}>
          保存
        </Button>
      </div>

      {/* 获取模型后的勾选弹窗 */}
      <ModelPickerDialog
        open={pickerOpen}
        models={fetchedAll}
        selected={models}
        onOpenChange={setPickerOpen}
        onConfirm={(list) => setModels(list)}
      />
    </div>
  );
}
