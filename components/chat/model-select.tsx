import { Sparkles } from 'lucide-react';
import { useSettingsStore, selectActiveProvider } from '@/stores/settings';
import { useChatStore } from '@/stores/chat';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface ModelSelectProps {
  className?: string;
}

/**
 * 模型选择器：显示当前模型，点击切换。
 * - 会话有模型记忆（该会话最近一次发送用的模型）时，显示并切换会话记忆；
 * - 无记忆（新会话）时回退全局设置，此时切换写入全局。
 * 切换会话自动恢复各自记忆的模型。
 */
export function ModelSelect({ className }: ModelSelectProps) {
  const settings = useSettingsStore((s) => s.settings);
  const setActive = useSettingsStore((s) => s.setActive);
  const activeId = useChatStore((s) => s.activeId);
  const convProviderId = useChatStore((s) => s.convProviderId);
  const convModel = useChatStore((s) => s.convModel);
  const setConversationModel = useChatStore((s) => s.setConversationModel);

  const globalProvider = selectActiveProvider(settings);
  const convProvider = convProviderId
    ? (settings?.providers.find((p) => p.id === convProviderId) ?? null)
    : null;
  const provider = convProvider ?? globalProvider;
  const models = provider?.models ?? [];

  // 会话记忆优先；记忆的模型不在列表（服务商已更新）时回退全局
  const value =
    convProvider && convModel && models.includes(convModel)
      ? convModel
      : (settings?.activeModel ?? '');

  const handleChange = (model: string) => {
    if (!provider) return;
    if (activeId) void setConversationModel(provider.id, model);
    else void setActive(provider.id, model);
  };

  return (
    <Select value={value} onValueChange={handleChange}>
      <SelectTrigger
        className={cn(
          // 固定宽度：模型名长短不影响顶部栏布局，超长省略号截断
          'h-7 w-[136px] gap-1 rounded-md border-transparent bg-transparent px-2 text-xs',
          'shadow-none hover:bg-accent hover:text-accent-foreground',
          'focus-visible:ring-1 data-[state=open]:bg-accent',
          '[&>span]:min-w-0',
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
