import type { AppSettings, ProviderConfig } from '@/lib/types';
import { STORAGE_KEYS } from '@/lib/constants';
import { BUILTIN_PROVIDERS } from '@/lib/api/providers';
import { uid } from '@/lib/utils';

/**
 * 设置持久化：chrome.storage.local。
 * 只存在用户浏览器 Profile 里，服务商 API Key 也不会离开本机。
 */

function defaultSettings(): AppSettings {
  return {
    activeProviderId: BUILTIN_PROVIDERS[0]?.id ?? '',
    activeModel: BUILTIN_PROVIDERS[0]?.models[0] ?? '',
    theme: 'system',
    providers: BUILTIN_PROVIDERS,
  };
}

export async function loadSettings(): Promise<AppSettings> {
  const stored = await browser.storage.local.get(STORAGE_KEYS.settings);
  const raw = stored[STORAGE_KEYS.settings] as AppSettings | undefined;
  if (!raw) return defaultSettings();
  // 合并内置预设（新增预设时老用户也能拿到），保留用户自定义项
  const builtinIds = new Set(BUILTIN_PROVIDERS.map((p) => p.id));
  const custom = (raw.providers ?? []).filter((p) => !builtinIds.has(p.id));
  const merged: AppSettings = {
    ...defaultSettings(),
    ...raw,
    providers: [...BUILTIN_PROVIDERS, ...custom],
  };
  return merged;
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  await browser.storage.local.set({ [STORAGE_KEYS.settings]: settings });
}

// ---------- 服务商 CRUD（便捷函数） ----------

export async function upsertProvider(
  settings: AppSettings,
  provider: ProviderConfig,
): Promise<AppSettings> {
  const idx = settings.providers.findIndex((p) => p.id === provider.id);
  const providers = [...settings.providers];
  if (idx >= 0) providers[idx] = provider;
  else providers.push({ ...provider, id: provider.id || uid('prov') });
  return { ...settings, providers };
}

export async function removeProvider(
  settings: AppSettings,
  providerId: string,
): Promise<AppSettings> {
  const providers = settings.providers.filter((p) => p.id !== providerId || p.builtin);
  const next: AppSettings = { ...settings, providers };
  if (next.activeProviderId === providerId) {
    const fallback = providers[0];
    next.activeProviderId = fallback?.id ?? '';
    next.activeModel = fallback?.models[0] ?? '';
  }
  return next;
}
