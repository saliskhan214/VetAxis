import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  updateDoc,
  arrayUnion,
  query,
  where,
  orderBy,
  onSnapshot,
  Unsubscribe
} from 'firebase/firestore';
import { db, isFirebaseConfigured, handleFirestoreError, OperationType } from './firebase';
import { ChatMessage, ChatConversation, UserProfile, UserRole } from '../types';
import { broadcastDataUpdate } from './tabSync';
import { NotificationService } from './storage';

// 15 days in milliseconds = 15 * 24 * 60 * 60 * 1000 = 1,296,000,000 ms
export const AUTO_DISAPPEAR_DURATION_MS = 15 * 24 * 60 * 60 * 1000;

const LOCAL_CONVERSATIONS_KEY = 'va_chat_conversations';
const LOCAL_MESSAGES_PREFIX = 'va_chat_messages_';
const LOCAL_DELETED_PREFIX = 'va_chat_deleted_';

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
 * Gets a map of deleted conversation IDs and deletion timestamps for a given user
 */
function getDeletedConversations(userId: string): Record<string, number> {
  if (typeof window === 'undefined' || !userId) return {};
  try {
    const raw = localStorage.getItem(`${LOCAL_DELETED_PREFIX}${userId}`);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * Marks a conversation as permanently deleted locally for a given user
 */
function markConversationDeletedLocally(conversationId: string, userId: string): void {
  if (typeof window === 'undefined' || !userId || !conversationId) return;
  try {
    const map = getDeletedConversations(userId);
    map[conversationId] = Date.now();
    localStorage.setItem(`${LOCAL_DELETED_PREFIX}${userId}`, JSON.stringify(map));
  } catch (err) {
    console.warn('[ChatService] Failed to record deleted conversation locally:', err);
  }
}

/**
 * Clears the deleted mark for a conversation when a fresh message is sent or received
 */
function unmarkConversationDeletedLocally(conversationId: string, userId: string): void {
  if (typeof window === 'undefined' || !userId || !conversationId) return;
  try {
    const map = getDeletedConversations(userId);
    if (map[conversationId]) {
      delete map[conversationId];
      localStorage.setItem(`${LOCAL_DELETED_PREFIX}${userId}`, JSON.stringify(map));
    }
  } catch {}
}

/**
 * Checks if a conversation is marked as deleted for a specific user
 */
export function isConversationDeletedForUser(
  conversationId: string,
  userId: string,
  lastMessageTimestamp?: number
): boolean {
  if (!userId || !conversationId) return false;
  const map = getDeletedConversations(userId);
  const deletedAt = map[conversationId];
  if (!deletedAt) return false;
  // If no message or last message was before the deletion timestamp, it is deleted
  if (!lastMessageTimestamp || lastMessageTimestamp <= deletedAt) {
    return true;
  }
  // A fresh message arrived strictly after deletion timestamp
  return false;
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

    // Clear any previous deletion records so the conversation becomes active again
    unmarkConversationDeletedLocally(conversationId, sender.uid);
    unmarkConversationDeletedLocally(conversationId, receiver.uid);

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
      deletedBy: [],
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

    // 4. Create and dispatch notification for the recipient (doctor, clinic or patient)
    try {
      await NotificationService.createNotification({
        userId: receiver.uid,
        senderId: sender.uid,
        senderName: sender.name,
        type: 'chat_message',
        targetId: conversationId,
        targetType: 'chat',
        message: `💬 ${sender.name}: ${cleanText.length > 50 ? cleanText.substring(0, 47) + '...' : cleanText}`,
        read: false
      });

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('vetaxis_notification_received', {
          detail: { recipientId: receiver.uid, senderId: sender.uid, conversationId, text: cleanText }
        }));

        // Native browser/desktop notification if permitted
        if ('Notification' in window && Notification.permission === 'granted') {
          try {
            new Notification(`💬 ${sender.name} (VetAxis)`, {
              body: cleanText.length > 100 ? cleanText.substring(0, 97) + '...' : cleanText,
              icon: sender.profilePic || undefined
            });
          } catch (e) {
            console.warn('[ChatService] Native notification suppressed:', e);
          }
        }
      }
    } catch (notifErr) {
      console.warn('[ChatService] Notification dispatch deferred or handled offline:', notifErr);
    }

    // 5. Background non-blocking persistence to Firestore
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
   * Gets all conversations for a specific user ID, with 15-day auto-disappearing validation
   */
  async getUserConversations(userId: string): Promise<ChatConversation[]> {
    const now = Date.now();
    const local = getLocalConversations()
      .filter(c => c.participants?.includes(userId))
      .filter(c => !isConversationDeletedForUser(c.id, userId, c.lastMessageTimestamp) && !c.deletedBy?.includes(userId))
      .map(c => {
        // Enforce 15-day auto-disappearing rule on messages and snippet
        const msgs = getLocalMessages(c.id);
        if (msgs.length === 0 && c.lastMessageTimestamp && (now - c.lastMessageTimestamp) >= AUTO_DISAPPEAR_DURATION_MS) {
          return {
            ...c,
            lastMessageText: '🕒 All previous messages auto-disappeared after 15 days',
            isExpired: true
          } as ChatConversation & { isExpired?: boolean };
        } else if (msgs.length > 0) {
          const lastMsg = msgs[msgs.length - 1];
          return {
            ...c,
            lastMessageText: lastMsg.text,
            lastMessageTimestamp: lastMsg.createdAt
          };
        }
        return c;
      });

    if (isFirebaseConfigured && db) {
      try {
        const q = query(
          collection(db, 'chat_conversations'),
          where('participants', 'array-contains', userId)
        );
        const snap = await getDocs(q);
        const remote: ChatConversation[] = [];
        snap.forEach(d => {
          const item = { ...d.data(), id: d.id } as ChatConversation;
          // CRITICAL: Filter out any conversation deleted by this user!
          if (!item.deletedBy?.includes(userId) && !isConversationDeletedForUser(item.id, userId, item.lastMessageTimestamp)) {
            remote.push(item);
          }
        });

        // Merge only valid, non-deleted conversations
        const map = new Map<string, ChatConversation>();
        local.forEach(c => {
          if (!isConversationDeletedForUser(c.id, userId, c.lastMessageTimestamp) && !c.deletedBy?.includes(userId)) {
            map.set(c.id, c);
          }
        });
        remote.forEach(c => {
          if (!isConversationDeletedForUser(c.id, userId, c.lastMessageTimestamp) && !c.deletedBy?.includes(userId)) {
            map.set(c.id, c);
          }
        });

        const merged = Array.from(map.values()).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

        // Clean local storage cache so deleted conversations don't linger
        const allStored = getLocalConversations().filter(c => {
          if (c.participants?.includes(userId) && (isConversationDeletedForUser(c.id, userId, c.lastMessageTimestamp) || c.deletedBy?.includes(userId))) {
            return false;
          }
          return true;
        });
        const storedMap = new Map<string, ChatConversation>();
        allStored.forEach(c => storedMap.set(c.id, c));
        merged.forEach(c => storedMap.set(c.id, c));
        setLocalConversations(Array.from(storedMap.values()));

        return merged;
      } catch (err) {
        console.warn('[ChatService] Failed to load remote conversations:', err);
      }
    }

    return local.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  },

  /**
   * Real-time subscription to a user's conversation list for the Messenger inbox
   */
  subscribeToUserConversations(
    userId: string,
    callback: (conversations: ChatConversation[]) => void
  ): () => void {
    // 1. Immediately emit current active cached conversations
    const emit = async () => {
      const convs = await this.getUserConversations(userId);
      callback(convs);
    };
    emit();

    // 2. Listen to local custom events and broadcast channel
    const handleUpdate = () => {
      emit();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('vetaxis_chat_new_message', handleUpdate);
      window.addEventListener('vetaxis_data_update', (e: any) => {
        if (e?.detail?.entity === 'chat') {
          handleUpdate();
        }
      });
      window.addEventListener('storage', (e: StorageEvent) => {
        if (e.key === LOCAL_CONVERSATIONS_KEY || e.key?.startsWith(LOCAL_MESSAGES_PREFIX) || e.key?.startsWith(LOCAL_DELETED_PREFIX)) {
          handleUpdate();
        }
      });
    }

    // 3. Optional Firestore live listener
    let firestoreUnsub: Unsubscribe | null = null;
    if (isFirebaseConfigured && db) {
      try {
        const q = query(
          collection(db, 'chat_conversations'),
          where('participants', 'array-contains', userId)
        );
        firestoreUnsub = onSnapshot(q, (snapshot) => {
          const list: ChatConversation[] = [];
          snapshot.forEach(docSnap => {
            const item = { ...docSnap.data(), id: docSnap.id } as ChatConversation;
            if (!item.deletedBy?.includes(userId) && !isConversationDeletedForUser(item.id, userId, item.lastMessageTimestamp)) {
              list.push(item);
            }
          });

          // Merge with local state, strictly filtering out deleted conversations
          const currentLocal = getLocalConversations().filter(c => 
            c.participants?.includes(userId) ? (!isConversationDeletedForUser(c.id, userId, c.lastMessageTimestamp) && !c.deletedBy?.includes(userId)) : true
          );
          const map = new Map<string, ChatConversation>();
          currentLocal.filter(c => c.participants?.includes(userId)).forEach(c => map.set(c.id, c));
          list.forEach(c => map.set(c.id, c));
          const merged = Array.from(map.values()).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

          // Clean local cache without re-injecting deleted conversations
          const allStored = getLocalConversations().filter(c => {
            if (c.participants?.includes(userId) && (isConversationDeletedForUser(c.id, userId, c.lastMessageTimestamp) || c.deletedBy?.includes(userId))) {
              return false;
            }
            return true;
          });
          const storedMap = new Map<string, ChatConversation>();
          allStored.forEach(c => storedMap.set(c.id, c));
          merged.forEach(c => storedMap.set(c.id, c));
          setLocalConversations(Array.from(storedMap.values()));

          callback(merged.filter(c => c.participants?.includes(userId)));
        }, (err) => {
          console.warn('[ChatService] User conversations onSnapshot warning:', err);
        });
      } catch (err) {
        console.warn('[ChatService] Live conversation listener could not be attached:', err);
      }
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('vetaxis_chat_new_message', handleUpdate);
        window.removeEventListener('storage', handleUpdate);
      }
      if (firestoreUnsub) {
        firestoreUnsub();
      }
    };
  },

  /**
   * Calculates total unread messages count for a user across all conversations
   */
  getUnreadMessagesCount(userId: string): number {
    if (!userId) return 0;
    const convs = getLocalConversations().filter(c => 
      c.participants?.includes(userId) &&
      !isConversationDeletedForUser(c.id, userId, c.lastMessageTimestamp) &&
      !c.deletedBy?.includes(userId)
    );
    let total = 0;
    for (const c of convs) {
      if (c.unreadCount && typeof c.unreadCount[userId] === 'number') {
        total += c.unreadCount[userId];
      }
    }
    return total;
  },

  /**
   * Deletes or clears a conversation for the user
   */
  async deleteConversation(conversationId: string, userId: string): Promise<void> {
    // 1. Immediately record in persistent deleted blacklist so any immediate or subsequent reads ignore this conversation
    markConversationDeletedLocally(conversationId, userId);

    // 2. Remove from local active conversations cache
    const currentLocal = getLocalConversations();
    const updatedLocal = currentLocal.filter(c => c.id !== conversationId);
    setLocalConversations(updatedLocal);

    // 3. Clear local messages for this conversation
    if (typeof window !== 'undefined') {
      localStorage.removeItem(`${LOCAL_MESSAGES_PREFIX}${conversationId}`);
    }

    // 4. Persistence to Firestore (if configured)
    if (isFirebaseConfigured && db) {
      try {
        const convDocRef = doc(db, 'chat_conversations', conversationId);

        // A. Add user to deletedBy array in Firestore so other query fetches exclude it
        try {
          await updateDoc(convDocRef, {
            deletedBy: arrayUnion(userId)
          });
        } catch {
          // Document may have already been deleted or permissions restricted
        }

        // B. Attempt to delete the conversation document directly
        try {
          await deleteDoc(convDocRef);
        } catch {
          // If deleteDoc is restricted because other participant has it, deletedBy handles exclusion
        }

        // C. Clean up messages for this conversation from Firestore
        try {
          const messagesQuery = query(
            collection(db, 'chat_messages'),
            where('conversationId', '==', conversationId)
          );
          const messagesSnap = await getDocs(messagesQuery);
          const deletions = messagesSnap.docs.map(mDoc => deleteDoc(mDoc.ref).catch(() => {}));
          await Promise.allSettled(deletions);
        } catch (msgErr) {
          console.warn('[ChatService] Firestore messages cleanup deferred:', msgErr);
        }
      } catch (err) {
        console.warn('[ChatService] Firestore deleteConversation failed or restricted:', err);
      }
    }

    // 5. Dispatch notification and broadcast events AFTER local and cloud state are permanently purged
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('vetaxis_chat_new_message', {
        detail: { conversationId, deleted: true }
      }));
    }
    broadcastDataUpdate('chat', { conversationId, action: 'delete' });
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

    // Also update remote conversation unread status if Firebase is ready
    if (isFirebaseConfigured && db) {
      try {
        await updateDoc(doc(db, 'chat_conversations', conversationId), {
          [`unreadCount.${userId}`]: 0
        });
      } catch (err) {
        // Non-blocking
      }
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
