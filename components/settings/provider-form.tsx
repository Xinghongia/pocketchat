import { useEffect, useState } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import type { ProviderConfig } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { fetchModelList } from '@/lib/api/client';
import { cn } from '@/lib/utils';

interface ProviderFormProps {
  /** 传入则编辑，null 则新建 */
  initial?: ProviderConfig | null;
  onSave: (p: ProviderConfig) => void;
  onCancel: () => void;
}

/**
 * 服务商编辑表单：名称 / Base URL / API Key / 模型列表（逗号分隔）。
 * 内置服务商不可编辑名称与 URL（保护预设），但可填 Key 与模型。
 */
export function ProviderForm({ initial, onSave, onCancel }: ProviderFormProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [baseUrl, setBaseUrl] = useState(initial?.baseUrl ?? '');
  const [apiKey, setApiKey] = useState(initial?.apiKey ?? '');
  const [models, setModels] = useState((initial?.models ?? []).join(', '));
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState('');

  const isBuiltin = initial?.builtin;
  const canSave = name.trim() && baseUrl.trim() && models.trim();

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
      setModels(list.join(', '));
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : '获取模型列表失败');
    } finally {
      setFetching(false);
    }
  };

  const handleSubmit = () => {
    if (!canSave) return;
    onSave({
      id: initial?.id ?? crypto.randomUUID(),
      name: name.trim(),
      baseUrl: baseUrl.trim().replace(/\/+$/, ''),
      apiKey: apiKey.trim(),
      models: models
        .split(/[,，]/)
        .map((m) => m.trim())
        .filter(Boolean),
      builtin: isBuiltin,
    });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
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
            title="从服务商拉取模型列表"
          >
            {fetching ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <RefreshCw className="h-3 w-3" />
            )}
            获取模型列表
          </button>
        </div>
        <Input
          value={models}
          onChange={(e) => setModels(e.target.value)}
          placeholder="gpt-4o, gpt-4o-mini"
          className={fetchError ? 'border-destructive' : undefined}
        />
        {fetchError ? (
          <p className="text-[11px] text-destructive">{fetchError}</p>
        ) : (
          <p className="text-[11px] text-muted-foreground/70">多个模型用逗号分隔，或点右上角自动获取</p>
        )}
      </div>

      <div className="mt-1 flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          取消
        </Button>
        <Button size="sm" onClick={handleSubmit} disabled={!canSave}>
          保存
        </Button>
      </div>
    </div>
  );
}
