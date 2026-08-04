import { useEffect, useState } from 'react';
import type { AppSettings } from '@/lib/types';
import { useSettingsStore } from '@/stores/settings';

function resolveDark(theme: AppSettings['theme'] | undefined): boolean {
  if (theme === 'dark') return true;
  if (theme === 'light') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/**
 * 返回当前是否为暗色模式（跟随主题设置 + 系统偏好）。
 * 不修改任何 DOM，由调用方决定应用到哪里：
 * - 侧边栏/全页面：useTheme() 应用到 document.documentElement
 * - 悬浮窗（Shadow DOM）：把返回值作为 class 应用到 shadow 内容根
 */
export function useDarkMode(): boolean {
  const theme = useSettingsStore((s) => s.settings?.theme);
  const [dark, setDark] = useState<boolean>(() => resolveDark(theme));

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => setDark(resolveDark(theme));
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [theme]);

  return dark;
}

/** 应用到页面根（侧边栏 / 全页面用） */
export function useTheme(): void {
  const dark = useDarkMode();
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);
}
