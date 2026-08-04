import { create } from 'zustand';
import type { ChatMessage, Conversation, StreamStatus } from '@/lib/types';
import {
  listConversations,
  createConversation,
  deleteConversation,
  listMessages,
  saveMessage,
  updateMessage,
  touchConversation,
} from '@/lib/storage/db';
import { chatCompletionStream } from '@/lib/api/client';
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
    set({ activeId: id, messages });
  },

  newConversation: async () => {
    const conv = await createConversation();
    await get().loadConversations();
    set({ activeId: conv.id, messages: [], status: 'idle', streamingMessageId: null });
  },

  removeConversation: async (id) => {
    await deleteConversation(id);
    const { activeId, loadConversations } = get();
    if (activeId === id) {
      set({ activeId: null, messages: [], status: 'idle' });
    }
    await loadConversations();
  },

  sendMessage: async (content) => {
    const { activeId, messages, status, abortController } = get();
    if (status === 'streaming' || !content.trim()) return;

    const settings = useSettingsStore.getState().settings;
    const provider = selectActiveProvider(settings);
    if (!provider) {
      set({ status: 'error' });
      return;
    }
    const model = settings?.activeModel ?? provider.models[0] ?? '';

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

    // 3. 创建占位助手消息（流式写入）
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

    // 4. 流式请求
    try {
      for await (const evt of chatCompletionStream({
        provider,
        model,
        messages: history,
        signal: abort.signal,
      })) {
        if (evt.type === 'delta') {
          assistantMsg.content += evt.content;
          set({
            messages: [...get().messages.slice(0, -1), { ...assistantMsg }],
          });
        } else if (evt.type === 'error') {
          assistantMsg.content += `\n\n⚠️ ${evt.message}`;
          set({
            messages: [...get().messages.slice(0, -1), { ...assistantMsg }],
            status: 'error',
          });
          await updateMessage(assistantMsg.id, assistantMsg.content);
          return;
        }
      }
      // 正常完成
      await updateMessage(assistantMsg.id, assistantMsg.content);
      set({
        messages: [...get().messages.slice(0, -1), { ...assistantMsg }],
        status: 'idle',
        streamingMessageId: null,
        abortController: null,
      });
      await touchConversation(convId);
    } catch {
      await updateMessage(assistantMsg.id, assistantMsg.content);
      set({ status: 'error', streamingMessageId: null, abortController: null });
    }
  },

  stop: () => {
    const { abortController } = get();
    abortController?.abort();
    set({ status: 'idle', streamingMessageId: null, abortController: null });
  },
}));
