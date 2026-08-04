import { createContext, useContext } from 'react';

/**
 * Radix Portal 容器上下文。
 * 侧边栏/全页面：默认 document.body（不提供 Provider）。
 * 悬浮窗（Shadow DOM）：指向 shadow 内部的 uiContainer，
 * 确保 Dialog / Select 弹层渲染在 Shadow 内、样式不丢失。
 */
const PortalContainerContext = createContext<HTMLElement | null>(null);

export const PortalContainerProvider = PortalContainerContext.Provider;

export function usePortalContainer(): HTMLElement | null {
  return useContext(PortalContainerContext);
}
