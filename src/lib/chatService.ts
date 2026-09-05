import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  Unsubscribe
} from 'firebase/firestore';
import { db, isFirebaseConfigured, handleFirestoreError, OperationType } from './firebase';
import { ChatMessage, ChatConversation, UserProfile, UserRole } from '../types';
import { broadcastDataUpdate } from './tabSync';

// 15 days in milliseconds = 15 * 24 * 60 * 60 * 1000 = 1,296,000,000 ms
export const AUTO_DISAPPEAR_DURATION_MS = 15 * 24 * 60 * 60 * 1000;

const LOCAL_CONVERSATIONS_KEY = 'va_chat_conversations';
const LOCAL_MESSAGES_PREFIX = 'va_chat_messages_';

/**
 * Deterministically generates a unique conversation identifier between two users
 */
export function getConversationId(userId1: string, userId2: string): string {
  const id1 = String(userId1 || 'anon1').trim();
  const id2 = String(userId2 || 'anon2').trim();
  const sorted = [id1, id2].sort();
  return `conv_${sorted[0]}__${sorted[1]}`;
}

/**
 * Checks if a message has reached its 15-day auto-disappearing lifespan
 */
export function isMessageExpired(msg: ChatMessage): boolean {
  if (!msg) return true;
  const now = Date.now();
  if (msg.expiresAt && now >= msg.expiresAt) return true;
  if (msg.createdAt && (now - msg.createdAt) >= AUTO_DISAPPEAR_DURATION_MS) return true;
  return false;
}

/**
 * Formats the remaining time until a message disappears
 */
export function formatDisappearingCountdown(expiresAt: number): string {
  const remainingMs = expiresAt - Date.now();
  if (remainingMs <= 0) return 'Expired';
  const totalHours = Math.floor(remainingMs / (1000 * 60 * 60));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  if (days > 0) {
    return `${days}d ${hours}h left`;
  }
  const mins = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${mins}m left`;
}

// ─────────────────────────────────────────────────────────────────
// LOCAL STORAGE CACHE HELPERS (Lightning-fast, zero latency)
// ─────────────────────────────────────────────────────────────────

function getLocalMessages(conversationId: string): ChatMessage[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(`${LOCAL_MESSAGES_PREFIX}${conversationId}`);
    if (!raw) return [];
    const parsed: ChatMessage[] = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    
    // Auto-disappear: filter out any messages older than 15 days
    const active = parsed.filter(m => !isMessageExpired(m));
    if (active.length !== parsed.length) {
      // Prune expired messages from local storage
      localStorage.setItem(`${LOCAL_MESSAGES_PREFIX}${conversationId}`, JSON.stringify(active));
    }
    return active;
  } catch (err) {
    console.warn('[ChatService] Error reading local messages:', err);
    return [];
  }
}

function setLocalMessages(conversationId: string, messages: ChatMessage[]) {
  if (typeof window === 'undefined') return;
  try {
    // Only store active non-expired messages
    const active = messages.filter(m => !isMessageExpired(m));
    localStorage.setItem(`${LOCAL_MESSAGES_PREFIX}${conversationId}`, JSON.stringify(active));
  } catch (err) {
    console.warn('[ChatService] Error saving local messages:', err);
  }
}

function getLocalConversations(): ChatConversation[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_CONVERSATIONS_KEY);
    if (!raw) return [];
    const parsed: ChatConversation[] = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    return [];
  }
}

function setLocalConversations(convs: ChatConversation[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_CONVERSATIONS_KEY, JSON.stringify(convs));
  } catch (err) {
    console.warn('[ChatService] Error saving local conversations:', err);
  }
}

// ─────────────────────────────────────────────────────────────────
// CHAT SERVICE CORE API
// ─────────────────────────────────────────────────────────────────

export const ChatService = {
  /**
   * Retrieves active messages for a conversation (pruning anything older than 15 days)
   */
  async getMessages(conversationId: string): Promise<ChatMessage[]> {
    // 1. Instant return from local cache
    const local = getLocalMessages(conversationId);

    // 2. Fetch from Firestore if configured
    if (isFirebaseConfigured && db) {
      try {
        const messagesRef = collection(db, 'chat_messages');
        const q = query(
          messagesRef,
          where('conversationId', '==', conversationId),
          orderBy('createdAt', 'asc')
        );
        const snapshot = await getDocs(q);
        const remoteMessages: ChatMessage[] = [];
        snapshot.forEach(docSnap => {
          const data = docSnap.data() as ChatMessage;
          if (!isMessageExpired(data)) {
            remoteMessages.push({
              ...data,
              id: docSnap.id
            });
          }
        });

        if (remoteMessages.length > 0) {
          // Merge local and remote messages, deduplicating by id
          const map = new Map<string, ChatMessage>();
          local.forEach(m => map.set(m.id, m));
          remoteMessages.forEach(m => map.set(m.id, m));
          const merged = Array.from(map.values())
            .filter(m => !isMessageExpired(m))
            .sort((a, b) => a.createdAt - b.createdAt);

          setLocalMessages(conversationId, merged);
          return merged;
        }
      } catch (err) {
        console.warn('[ChatService] Remote fetch failed, using local cache:', err);
      }
    }

    return local;
  },

  /**
   * Sends a message with instant optimistic UI update (0ms lag) and 15-day auto-disappear timer
   */
  async sendMessage(params: {
    sender: UserProfile;
    receiver: UserProfile;
    text: string;
  }): Promise<ChatMessage> {
    const { sender, receiver, text } = params;
    const cleanText = text.trim();
    if (!cleanText) {
      throw new Error('Message cannot be empty');
    }

    const conversationId = getConversationId(sender.uid, receiver.uid);
    const now = Date.now();
    const expiresAt = now + AUTO_DISAPPEAR_DURATION_MS;

    const messageId = `msg_${now}_${Math.random().toString(36).substring(2, 8)}`;
    const newMessage: ChatMessage = {
      id: messageId,
      conversationId,
      senderId: sender.uid,
      senderName: sender.name,
      senderRole: sender.role,
      senderProfilePic: sender.profilePic,
      receiverId: receiver.uid,
      receiverName: receiver.name,
      receiverRole: receiver.role,
      text: cleanText,
      createdAt: now,
      expiresAt,
      delivered: true,
      read: false
    };

    // 1. OPTIMISTIC UPDATE: Write to local messages immediately
    const existing = getLocalMessages(conversationId);
    const updatedMessages = [...existing, newMessage];
    setLocalMessages(conversationId, updatedMessages);

    // 2. Update local conversation record
    const convs = getLocalConversations();
    const convIndex = convs.findIndex(c => c.id === conversationId);
    const convData: ChatConversation = {
      id: conversationId,
      participants: [sender.uid, receiver.uid],
      participantDetails: {
        [sender.uid]: {
          name: sender.name,
          role: sender.role,
          profilePic: sender.profilePic,
          email: sender.email,
          phone: sender.phone
        },
        [receiver.uid]: {
          name: receiver.name,
          role: receiver.role,
          profilePic: receiver.profilePic,
          email: receiver.email,
          phone: receiver.phone
        }
      },
      lastMessageText: cleanText,
      lastMessageTimestamp: now,
      lastSenderId: sender.uid,
      unreadCount: {
        ...(convIndex >= 0 ? convs[convIndex].unreadCount : {}),
        [receiver.uid]: ((convIndex >= 0 ? convs[convIndex].unreadCount?.[receiver.uid] : 0) || 0) + 1
      },
      createdAt: convIndex >= 0 ? convs[convIndex].createdAt : now,
      updatedAt: now
    };

    if (convIndex >= 0) {
      convs[convIndex] = convData;
    } else {
      convs.unshift(convData);
    }
    setLocalConversations(convs);

    // 3. Dispatch broadcast events for zero-delay cross-tab and in-tab synchronization
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('vetaxis_chat_new_message', { 
        detail: { conversationId, message: newMessage } 
      }));
    }
    broadcastDataUpdate('chat', { conversationId, messageId: newMessage.id });

    // 4. Background non-blocking persistence to Firestore
    if (isFirebaseConfigured && db) {
      (async () => {
        try {
          await setDoc(doc(db, 'chat_messages', newMessage.id), newMessage);
          await setDoc(doc(db, 'chat_conversations', conversationId), convData, { merge: true });
        } catch (err) {
          console.warn('[ChatService] Cloud sync deferred or failed:', err);
        }
      })();
    }

    return newMessage;
  },

  /**
   * Real-time subscription to a conversation's messages
   */
  subscribeToConversation(
    conversationId: string,
    callback: (messages: ChatMessage[]) => void
  ): () => void {
    // Immediately emit local cached active messages
    const initial = getLocalMessages(conversationId);
    callback(initial);

    // Listen to local tab and cross-tab events
    const handleLocalEvent = (e: any) => {
      if (e?.detail?.conversationId === conversationId || !e?.detail?.conversationId) {
        callback(getLocalMessages(conversationId));
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('vetaxis_chat_new_message', handleLocalEvent);
      window.addEventListener('vetaxis_data_update', (e: any) => {
        if (e?.detail?.entity === 'chat') {
          callback(getLocalMessages(conversationId));
        }
      });
    }

    let firestoreUnsub: Unsubscribe | null = null;
    if (isFirebaseConfigured && db) {
      try {
        const messagesRef = collection(db, 'chat_messages');
        const q = query(
          messagesRef,
          where('conversationId', '==', conversationId),
          orderBy('createdAt', 'asc')
        );

        firestoreUnsub = onSnapshot(q, (snapshot) => {
          const list: ChatMessage[] = [];
          snapshot.forEach(docSnap => {
            const data = docSnap.data() as ChatMessage;
            if (!isMessageExpired(data)) {
              list.push({ ...data, id: docSnap.id });
            }
          });
          if (list.length > 0) {
            setLocalMessages(conversationId, list);
            callback(list);
          }
        }, (err) => {
          console.warn('[ChatService] onSnapshot listener warning:', err);
        });
      } catch (err) {
        console.warn('[ChatService] Live listener could not be attached:', err);
      }
    }

    // Cleanup unsubscribe handler
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('vetaxis_chat_new_message', handleLocalEvent);
      }
      if (firestoreUnsub) {
        firestoreUnsub();
      }
    };
  },

  /**
   * Gets all conversations for a specific user ID
   */
  async getUserConversations(userId: string): Promise<ChatConversation[]> {
    const local = getLocalConversations().filter(c => c.participants?.includes(userId));

    if (isFirebaseConfigured && db) {
      try {
        const q = query(
          collection(db, 'chat_conversations'),
          where('participants', 'array-contains', userId)
        );
        const snap = await getDocs(q);
        const remote: ChatConversation[] = [];
        snap.forEach(d => {
          remote.push({ ...d.data(), id: d.id } as ChatConversation);
        });
        if (remote.length > 0) {
          const map = new Map<string, ChatConversation>();
          local.forEach(c => map.set(c.id, c));
          remote.forEach(c => map.set(c.id, c));
          const merged = Array.from(map.values()).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
          setLocalConversations(merged);
          return merged;
        }
      } catch (err) {
        console.warn('[ChatService] Failed to load remote conversations:', err);
      }
    }

    return local.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  },

  /**
   * Marks a conversation as read for a given user
   */
  async markAsRead(conversationId: string, userId: string) {
    const convs = getLocalConversations();
    const conv = convs.find(c => c.id === conversationId);
    if (conv && conv.unreadCount && conv.unreadCount[userId]) {
      conv.unreadCount[userId] = 0;
      setLocalConversations(convs);
      broadcastDataUpdate('chat', { conversationId });
    }

    const messages = getLocalMessages(conversationId);
    let changed = false;
    const now = Date.now();
    messages.forEach(m => {
      if (m.receiverId === userId) {
        if (!m.delivered) {
          m.delivered = true;
          changed = true;
        }
        if (!m.read) {
          m.read = true;
          m.readAt = now;
          changed = true;
        }
      }
    });
    if (changed) {
      setLocalMessages(conversationId, messages);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('vetaxis_chat_new_message', { 
          detail: { conversationId } 
        }));
      }
      broadcastDataUpdate('chat', { conversationId });
    }
  },

  /**
   * Interactive two-user communication simulation helper:
   * Allows testing replies from the doctor/clinic immediately with real clinical answers.
   */
  async simulateDoctorReply(doctor: UserProfile, patientUser: UserProfile, replyText: string): Promise<ChatMessage> {
    const convId = getConversationId(doctor.uid, patientUser.uid);
    // Doctor is replying, so any prior patient messages are now marked as read
    await this.markAsRead(convId, doctor.uid);

    return this.sendMessage({
      sender: doctor,
      receiver: patientUser,
      text: replyText
    });
  }
};
