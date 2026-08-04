import { useEffect } from 'react';
import { useSettingsStore } from '@/stores/settings';

/**
 * 主题应用：根据 settings.theme 切换 <html> 的 .dark class。
 * 支持 light / dark / system 三态，跟随系统变化。
 */
export function useTheme() {
  const theme = useSettingsStore((s) => s.settings?.theme);

  useEffect(() => {
    const root = document.documentElement;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');

    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && mq.matches);
      root.classList.toggle('dark', dark);
    };

    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [theme]);
}
