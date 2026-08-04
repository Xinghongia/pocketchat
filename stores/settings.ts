import { create } from 'zustand';
import type { AppSettings, ProviderConfig, StreamMode } from '@/lib/types';
import { loadSettings, saveSettings, upsertProvider, removeProvider } from '@/lib/storage/settings';

interface SettingsState {
  settings: AppSettings | null;
  loaded: boolean;
  load: () => Promise<void>;
  save: () => Promise<void>;
  setActive: (providerId: string, model?: string) => Promise<void>;
  addProvider: (p: ProviderConfig) => Promise<void>;
  updateProvider: (p: ProviderConfig) => Promise<void>;
  removeProvider: (providerId: string) => Promise<void>;
  setTheme: (theme: AppSettings['theme']) => Promise<void>;
  setStreamMode: (mode: StreamMode) => Promise<void>;
  setShowReasoning: (show: boolean) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: null,
  loaded: false,

  load: async () => {
    const settings = await loadSettings();
    set({ settings, loaded: true });
  },

  save: async () => {
    const { settings } = get();
    if (settings) await saveSettings(settings);
  },

  setActive: async (providerId, model) => {
    const { settings } = get();
    if (!settings) return;
    const provider = settings.providers.find((p) => p.id === providerId);
    const nextModel = model ?? provider?.models[0] ?? settings.activeModel;
    const next = { ...settings, activeProviderId: providerId, activeModel: nextModel };
    set({ settings: next });
    await saveSettings(next);
  },

  addProvider: async (p) => {
    const { settings } = get();
    if (!settings) return;
    const next = await upsertProvider(settings, p);
    set({ settings: next });
    await saveSettings(next);
  },

  updateProvider: async (p) => {
    const { settings } = get();
    if (!settings) return;
    const next = await upsertProvider(settings, p);
    set({ settings: next });
    await saveSettings(next);
  },

  removeProvider: async (providerId) => {
    const { settings } = get();
    if (!settings) return;
    const next = await removeProvider(settings, providerId);
    set({ settings: next });
    await saveSettings(next);
  },

  setTheme: async (theme) => {
    const { settings } = get();
    if (!settings) return;
    const next = { ...settings, theme };
    set({ settings: next });
    await saveSettings(next);
  },

  setStreamMode: async (mode) => {
    const { settings } = get();
    if (!settings) return;
    const next = { ...settings, streamMode: mode };
    set({ settings: next });
    await saveSettings(next);
  },

  setShowReasoning: async (show) => {
    const { settings } = get();
    if (!settings) return;
    const next = { ...settings, showReasoning: show };
    set({ settings: next });
    await saveSettings(next);
  },
}));

/** 便捷选择器：当前激活的服务商 */
export function selectActiveProvider(s: AppSettings | null): ProviderConfig | null {
  if (!s) return null;
  return s.providers.find((p) => p.id === s.activeProviderId) ?? null;
}
