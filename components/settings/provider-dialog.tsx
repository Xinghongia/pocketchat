import type { ProviderConfig } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ProviderForm } from './provider-form';

interface ProviderDialogProps {
  open: boolean;
  /** null = 新建，ProviderConfig = 编辑 */
  initial: ProviderConfig | null;
  onOpenChange: (open: boolean) => void;
  onSave: (p: ProviderConfig) => void;
}

/**
 * 服务商编辑独立弹窗（叠加在设置弹窗之上）。
 * 新增 / 编辑服务商时单独打开，不与设置内容混在一起。
 */
export function ProviderDialog({ open, initial, onOpenChange, onSave }: ProviderDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader className="border-b px-5 pb-3 pt-4">
          <DialogTitle>{initial ? `编辑「${initial.name}」` : '添加服务商'}</DialogTitle>
          <DialogDescription>
            {initial?.builtin
              ? '内置服务商：可填写 API Key 与模型'
              : '任意 OpenAI 兼容服务商，Key 仅保存在本地'}
          </DialogDescription>
        </DialogHeader>
        <div className="px-5 py-4">
          <ProviderForm
            initial={initial}
            onSave={(p) => {
              onSave(p);
              onOpenChange(false);
            }}
            onCancel={() => onOpenChange(false)}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
