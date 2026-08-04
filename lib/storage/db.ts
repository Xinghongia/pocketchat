import type { ChatMessage, Conversation } from '@/lib/types';
import { DB } from '@/lib/constants';
import { uid } from '@/lib/utils';

/**
 * IndexedDB 封装：聊天记录全部存在浏览器本地，
 * 不经过任何第三方服务器，实现「数据留在个人手上」。
 */

interface PocketChatSchema {
  conversations: Conversation;
  messages: ChatMessage;
}

type StoreName = keyof PocketChatSchema;

let dbPromise: Promise<IDBDatabase> | null = null;

function requestToPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('IndexedDB 操作失败'));
  });
}

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB.name, DB.version);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(DB.stores.conversations)) {
        db.createObjectStore(DB.stores.conversations, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(DB.stores.messages)) {
        const store = db.createObjectStore(DB.stores.messages, { keyPath: 'id' });
        store.createIndex('conversationId', 'conversationId', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('无法打开本地数据库'));
  });
  return dbPromise;
}

function tx<T>(
  store: StoreName,
  mode: IDBTransactionMode,
  fn: (s: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDB().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(store, mode);
        const req = fn(t.objectStore(store));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error ?? new Error('数据库操作失败'));
      }),
  );
}

/** 读取全部（用于列表/导出） */
function getAll<T>(store: StoreName): Promise<T[]> {
  return openDB().then(
    (db) =>
      new Promise<T[]>((resolve, reject) => {
        const t = db.transaction(store, 'readonly');
        const req = t.objectStore(store).getAll();
        req.onsuccess = () => resolve(req.result as T[]);
        req.onerror = () => reject(req.error ?? new Error('读取失败'));
      }),
  );
}

// ---------- 会话 ----------

export async function listConversations(): Promise<Conversation[]> {
  const all = await getAll<Conversation>(DB.stores.conversations);
  return all.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function createConversation(title = '新对话'): Promise<Conversation> {
  const conv: Conversation = {
    id: uid('conv'),
    title,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  await tx(DB.stores.conversations, 'readwrite', (s) => s.put(conv));
  return conv;
}

export async function touchConversation(id: string, title?: string): Promise<void> {
  await openDB().then(
    (db) =>
      new Promise<void>((resolve, reject) => {
        const t = db.transaction(DB.stores.conversations, 'readwrite');
        const getReq = t.objectStore(DB.stores.conversations).get(id);
        getReq.onsuccess = () => {
          const conv = getReq.result as Conversation | undefined;
          if (conv) {
            conv.updatedAt = Date.now();
            if (title) conv.title = title;
            t.objectStore(DB.stores.conversations).put(conv);
          }
        };
        t.oncomplete = () => resolve();
        t.onerror = () => reject(t.error ?? new Error('更新会话失败'));
      }),
  );
}

export async function deleteConversation(id: string): Promise<void> {
  await openDB().then(
    (db) =>
      new Promise<void>((resolve, reject) => {
        const t = db.transaction([DB.stores.conversations, DB.stores.messages], 'readwrite');
        t.objectStore(DB.stores.conversations).delete(id);
        const idx = t.objectStore(DB.stores.messages).index('conversationId');
        const req = idx.openCursor(IDBKeyRange.only(id));
        req.onsuccess = () => {
          const cursor = req.result;
          if (cursor) {
            cursor.delete();
            cursor.continue();
          }
        };
        t.oncomplete = () => resolve();
        t.onerror = () => reject(t.error ?? new Error('删除会话失败'));
      }),
  );
}

// ---------- 消息 ----------

export async function listMessages(conversationId: string): Promise<ChatMessage[]> {
  return openDB().then(
    (db) =>
      new Promise<ChatMessage[]>((resolve, reject) => {
        const t = db.transaction(DB.stores.messages, 'readonly');
        const idx = t.objectStore(DB.stores.messages).index('conversationId');
        const req = idx.getAll(IDBKeyRange.only(conversationId));
        req.onsuccess = () => {
          const rows = req.result as ChatMessage[];
          resolve(rows.sort((a, b) => a.createdAt - b.createdAt));
        };
        req.onerror = () => reject(req.error ?? new Error('读取消息失败'));
      }),
  );
}

export async function saveMessage(
  conversationId: string,
  msg: Omit<ChatMessage, 'id' | 'createdAt'>,
): Promise<ChatMessage> {
  const full: ChatMessage = {
    ...msg,
    id: uid('msg'),
    createdAt: Date.now(),
  };
  await openDB().then(
    (db) =>
      new Promise<void>((resolve, reject) => {
        const t = db.transaction(DB.stores.messages, 'readwrite');
        t.objectStore(DB.stores.messages).put({ ...full, conversationId });
        t.oncomplete = () => resolve();
        t.onerror = () => reject(t.error ?? new Error('保存消息失败'));
      }),
  );
  return full;
}

/** 更新一条已存在的消息（流式完成后回写最终内容 / 思考过程） */
export async function updateMessage(
  id: string,
  content: string,
  reasoning?: string,
): Promise<void> {
  await openDB().then(
    (db) =>
      new Promise<void>((resolve, reject) => {
        const t = db.transaction(DB.stores.messages, 'readwrite');
        const getReq = t.objectStore(DB.stores.messages).get(id);
        getReq.onsuccess = () => {
          const row = getReq.result as ChatMessage | undefined;
          if (row) {
            row.content = content;
            if (reasoning !== undefined) row.reasoning = reasoning;
            t.objectStore(DB.stores.messages).put(row);
          }
        };
        t.oncomplete = () => resolve();
        t.onerror = () => reject(t.error ?? new Error('更新消息失败'));
      }),
  );
}

// ---------- 数据导出 / 清空 ----------

export interface ExportBundle {
  version: 1;
  exportedAt: number;
  conversations: Conversation[];
  messages: Array<ChatMessage & { conversationId: string }>;
}

export async function exportAll(): Promise<ExportBundle> {
  const [conversations, messages] = await Promise.all([
    getAll<Conversation>(DB.stores.conversations),
    getAll<ChatMessage & { conversationId: string }>(DB.stores.messages),
  ]);
  return { version: 1, exportedAt: Date.now(), conversations, messages };
}

export async function clearAll(): Promise<void> {
  await openDB().then(
    (db) =>
      new Promise<void>((resolve, reject) => {
        const t = db.transaction([DB.stores.conversations, DB.stores.messages], 'readwrite');
        t.objectStore(DB.stores.conversations).clear();
        t.objectStore(DB.stores.messages).clear();
        t.oncomplete = () => resolve();
        t.onerror = () => reject(t.error ?? new Error('清空数据失败'));
      }),
  );
}
