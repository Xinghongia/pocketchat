import { create } from 'zustand';
import type { ChatMessage, Conversation, ProviderConfig, StreamStatus } from '@/lib/types';
import {
  listConversations,
  createConversation,
  deleteConversation,
  listMessages,
  saveMessage,
  updateMessage,
  updateMessageContent,
  deleteMessage,
  touchConversation,
} from '@/lib/storage/db';
import { chatCompletionOnce, chatCompletionStream } from '@/lib/api/client';
import { titleFromText } from '@/lib/utils';
import { useSettingsStore, selectActiveProvider } from './settings';

interface ChatState {
  conversations: Conversation[];
  activeId: string | null;
  messages: ChatMessage[];
  status: StreamStatus;
  /** 当前流式消息的 id（用于流式回写） */
  streamingMessageId: string | null;
  abortController: AbortController | null;

  loadConversations: () => Promise<void>;
  openConversation: (id: string) => Promise<void>;
  newConversation: () => Promise<void>;
  removeConversation: (id: string) => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  /** 重新生成某条 AI 回复：截断其后所有消息并重新请求 */
  regenerate: (messageId: string) => Promise<void>;
  /** 编辑某条用户消息：更新内容、截断其后消息并重新请求 */
  editMessage: (messageId: string, content: string) => Promise<void>;
  stop: () => void;
  /** 内部：对给定历史执行一次补全（流式/非流式按设置），末尾追加助手消息 */
  runCompletion: (convId: string, history: ChatMessage[]) => Promise<void>;
}

/** 是否已配置并激活服务商（由 UI 用来展示引导） */
export function useHasProvider(): boolean {
  const settings = useSettingsStore((s) => s.settings);
  return !!selectActiveProvider(settings);
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  activeId: null,
  messages: [],
  status: 'idle',
  streamingMessageId: null,
  abortController: null,

  loadConversations: async () => {
    const conversations = await listConversations();
    set({ conversations });
  },

  openConversation: async (id) => {
    const messages = await listMessages(id);
    set({ activeId: id, messages, status: 'idle', streamingMessageId: null, abortController: null });
  },

  newConversation: async () => {
    const conv = await createConversation();
    await get().loadConversations();
    set({ activeId: conv.id, messages: [], status: 'idle', streamingMessageId: null, abortController: null });
  },

  removeConversation: async (id) => {
    await deleteConversation(id);
    const { activeId, loadConversations } = get();
    if (activeId === id) {
      set({ activeId: null, messages: [], status: 'idle', streamingMessageId: null });
    }
    await loadConversations();
  },

  sendMessage: async (content) => {
    const { activeId, messages, status } = get();
    if (status === 'streaming' || !content.trim()) return;

    // 1. 确保有会话容器
    let convId = activeId;
    if (!convId) {
      const conv = await createConversation(titleFromText(content));
      convId = conv.id;
      await get().loadConversations();
    }

    // 2. 写入用户消息
    const userMsg = await saveMessage(convId, { role: 'user', content });
    await touchConversation(convId, messages.length === 0 ? titleFromText(content) : undefined);

    // 3. 更新内存并执行补全
    const history: ChatMessage[] = [...get().messages, userMsg];
    set({ activeId: convId, messages: history });
    await get().runCompletion(convId, history);
  },

  regenerate: async (messageId) => {
    const { messages, status, activeId } = get();
    if (status === 'streaming' || !activeId) return;
    const idx = messages.findIndex((m) => m.id === messageId);
    const target = messages[idx];
    // 只允许对助手消息重新生成
    if (!target || target.role !== 'assistant') return;

    // 截断：删除该 AI 消息及其之后的所有消息（DB + 内存）
    const tail = messages.slice(idx);
    for (const m of tail) await deleteMessage(m.id);
    const history = messages.slice(0, idx);
    set({ messages: history });
    await get().runCompletion(activeId, history);
  },

  editMessage: async (messageId, content) => {
    const { messages, status, activeId } = get();
    if (status === 'streaming' || !content.trim() || !activeId) return;
    const idx = messages.findIndex((m) => m.id === messageId);
    const target = messages[idx];
    if (!target || target.role !== 'user') return;

    // 更新该用户消息，删除其后所有消息（DB + 内存）
    const updated: ChatMessage = { ...target, content };
    await updateMessageContent(messageId, content);
    const tail = messages.slice(idx + 1);
    for (const m of tail) await deleteMessage(m.id);
    const history = [...messages.slice(0, idx), updated];
    set({ messages: history });
    await touchConversation(activeId);
    await get().runCompletion(activeId, history);
  },

  runCompletion: async (convId, history) => {
    const settings = useSettingsStore.getState().settings;
    const provider = selectActiveProvider(settings);
    // 未配置服务商：静默返回，由 UI 层拦截并引导去设置
    if (!provider) return;
    const model = settings?.activeModel ?? provider.models[0] ?? '';
    const streamMode = settings?.streamMode ?? 'stream';
    const showReasoning = settings?.showReasoning ?? true;

    // 创建占位助手消息并【立即落库】。
    // 必须一开始就写入：完成后 updateMessage 是按 id 查找更新的，
    // 若库里没有这条记录，AI 回复将永远无法持久化。
    const assistantMsg = await saveMessage(convId, { role: 'assistant', content: '' });
    const abort = new AbortController();
    set({
      activeId: convId,
      messages: [...history, assistantMsg],
      status: 'streaming',
      streamingMessageId: assistantMsg.id,
      abortController: abort,
    });

    try {
      if (streamMode === 'stream') {
        for await (const evt of chatCompletionStream({
          provider,
          model,
          messages: history,
          signal: abort.signal,
        })) {
          if (evt.type === 'delta') {
            assistantMsg.content += evt.content;
            set({ messages: [...get().messages.slice(0, -1), { ...assistantMsg }] });
          } else if (evt.type === 'reasoning') {
            // 思考过程：是否展示由设置控制，但始终累积以便持久化
            assistantMsg.reasoning = (assistantMsg.reasoning ?? '') + evt.content;
            if (showReasoning) {
              set({ messages: [...get().messages.slice(0, -1), { ...assistantMsg }] });
            }
          } else if (evt.type === 'error') {
            throw new Error(evt.message);
          }
        }
      } else {
        const result = await chatCompletionOnce({
          provider,
          model,
          messages: history,
          signal: abort.signal,
        });
        assistantMsg.content = result.content;
        if (result.reasoning && showReasoning) assistantMsg.reasoning = result.reasoning;
        set({ messages: [...get().messages.slice(0, -1), { ...assistantMsg }] });
      }
    } catch (err) {
      // 中止：保留已生成内容，状态回到 idle
      if (abort.signal.aborted) {
        await updateMessage(assistantMsg.id, assistantMsg.content, assistantMsg.reasoning);
        set({
          messages: [...get().messages.slice(0, -1), { ...assistantMsg }],
          status: 'idle',
          streamingMessageId: null,
          abortController: null,
        });
        return;
      }
      // 真实错误：把错误信息拼进消息尾部，便于用户看到原因
      const reason = err instanceof Error ? err.message : '请求失败';
      assistantMsg.content += `\n\n⚠️ ${reason}`;
      await updateMessage(assistantMsg.id, assistantMsg.content, assistantMsg.reasoning);
      set({
        messages: [...get().messages.slice(0, -1), { ...assistantMsg }],
        status: 'error',
        streamingMessageId: null,
        abortController: null,
      });
      return;
    }

    // 正常完成：回写
    await updateMessage(assistantMsg.id, assistantMsg.content, assistantMsg.reasoning);
    set({
      messages: [...get().messages.slice(0, -1), { ...assistantMsg }],
      status: 'idle',
      streamingMessageId: null,
      abortController: null,
    });
    await touchConversation(convId);
  },

  stop: () => {
    const { abortController } = get();
    abortController?.abort();
    set({ status: 'idle', streamingMessageId: null, abortController: null });
  },
}));
