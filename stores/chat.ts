import { create } from 'zustand';
import type { ChatMessage, Conversation, ProviderConfig, StreamStatus } from '@/lib/types';
import {
  listConversations,
  createConversation,
  deleteConversation,
  listMessages,
  saveMessage,
  updateMessage,
  touchConversation,
} from '@/lib/storage/db';
import { chatCompletionOnce, chatCompletionStream } from '@/lib/api/client';
import { titleFromText, uid } from '@/lib/utils';
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
  stop: () => void;
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
    const { activeId, messages, status, abortController } = get();
    if (status === 'streaming' || !content.trim()) return;

    const settings = useSettingsStore.getState().settings;
    const provider = selectActiveProvider(settings);
    // 未配置服务商：静默返回，由 UI 层拦截并引导去设置
    if (!provider) return;
    const model = settings?.activeModel ?? provider.models[0] ?? '';
    const streamMode = settings?.streamMode ?? 'stream';
    const showReasoning = settings?.showReasoning ?? true;

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

    // 3. 创建占位助手消息（流式/非流式共用）
    const assistantMsg: ChatMessage = {
      id: uid('msg'),
      role: 'assistant',
      content: '',
      createdAt: Date.now(),
    };

    const history: ChatMessage[] = [...get().messages, userMsg];
    const abort = new AbortController();
    set({
      activeId: convId,
      messages: [...history, assistantMsg],
      status: 'streaming',
      streamingMessageId: assistantMsg.id,
      abortController: abort,
    });

    // 4. 按设置的模式请求
    try {
      if (streamMode === 'stream') {
        await runStream(assistantMsg, abort, provider);
      } else {
        await runOnce(assistantMsg, abort, provider);
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

    // 5. 正常完成：回写
    await updateMessage(assistantMsg.id, assistantMsg.content, assistantMsg.reasoning);
    set({
      messages: [...get().messages.slice(0, -1), { ...assistantMsg }],
      status: 'idle',
      streamingMessageId: null,
      abortController: null,
    });
    await touchConversation(convId);

    // ---- 内部：流式执行 ----
    async function runStream(msg: ChatMessage, abort: AbortController, p: ProviderConfig) {
      for await (const evt of chatCompletionStream({
        provider: p,
        model,
        messages: history,
        signal: abort.signal,
      })) {
        if (evt.type === 'delta') {
          msg.content += evt.content;
          set({ messages: [...get().messages.slice(0, -1), { ...msg }] });
        } else if (evt.type === 'reasoning') {
          // 思考过程：是否展示由设置控制，但始终累积以便持久化
          msg.reasoning = (msg.reasoning ?? '') + evt.content;
          if (showReasoning) {
            set({ messages: [...get().messages.slice(0, -1), { ...msg }] });
          }
        } else if (evt.type === 'error') {
          throw new Error(evt.message);
        }
      }
    }

    // ---- 内部：非流式执行（一次性返回） ----
    async function runOnce(msg: ChatMessage, abort: AbortController, p: ProviderConfig) {
      const result = await chatCompletionOnce({
        provider: p,
        model,
        messages: history,
        signal: abort.signal,
      });
      msg.content = result.content;
      if (result.reasoning && showReasoning) msg.reasoning = result.reasoning;
      set({ messages: [...get().messages.slice(0, -1), { ...msg }] });
    }
  },

  stop: () => {
    const { abortController } = get();
    abortController?.abort();
    set({ status: 'idle', streamingMessageId: null, abortController: null });
  },
}));
