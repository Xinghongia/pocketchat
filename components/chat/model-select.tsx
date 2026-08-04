import { Sparkles } from 'lucide-react';
import { useSettingsStore, selectActiveProvider } from '@/stores/settings';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface ModelSelectProps {
  className?: string;
}

/**
 * 模型选择器：显示当前模型，点击切换。
 * 自动跟随当前服务商的模型列表；未配置时显示提示。
 */
export function ModelSelect({ className }: ModelSelectProps) {
  const settings = useSettingsStore((s) => s.settings);
  const setActive = useSettingsStore((s) => s.setActive);

  const provider = selectActiveProvider(settings);
  const models = provider?.models ?? [];

  const handleChange = (model: string) => {
    if (provider) void setActive(provider.id, model);
  };

  return (
    <Select value={settings?.activeModel ?? ''} onValueChange={handleChange}>
      <SelectTrigger
        className={cn(
          'h-7 w-auto gap-1 rounded-md border-transparent bg-transparent px-2 text-xs',
          'shadow-none hover:bg-accent hover:text-accent-foreground',
          'focus-visible:ring-1 data-[state=open]:bg-accent',
          className,
        )}
      >
        <Sparkles className="h-3 w-3 text-primary" />
        <SelectValue placeholder={provider ? '选择模型' : '未配置模型'} />
      </SelectTrigger>
      <SelectContent align="end">
        {models.length === 0 ? (
          <div className="px-3 py-2 text-xs text-muted-foreground">请先在设置中配置模型</div>
        ) : (
          models.map((m) => (
            <SelectItem key={m} value={m}>
              {m}
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
}
