import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  writeBatch
} from 'firebase/firestore';
import { db, isFirebaseConfigured, handleFirestoreError, OperationType } from './firebase';
import { ChatMessage, Conversation, ConversationParticipant, MessageStatus, UserProfile, UserRole } from '../types';

export const FIFTEEN_DAYS_MS = 15 * 24 * 60 * 60 * 1000; // 15 days in milliseconds
const LOCAL_CONVERSATIONS_KEY = 'va_messenger_conversations';
const LOCAL_MESSAGES_KEY = 'va_messenger_messages';

export class MessengerService {
  /**
   * Deterministic, conflict-free conversation ID between two users
   */
  public static getConversationId(uid1: string, uid2: string): string {
    const sorted = [uid1.trim(), uid2.trim()].sort();
    return `conv_${sorted[0]}_${sorted[1]}`;
  }

  /**
   * Check if a timestamp is older than 15 days
   */
  public static isExpired(timestamp: number): boolean {
    return Date.now() - timestamp > FIFTEEN_DAYS_MS;
  }

  /**
   * Calculate remaining retention days for a message
   */
  public static getRemainingDays(timestamp: number): number {
    const elapsed = Date.now() - timestamp;
    const remainingMs = FIFTEEN_DAYS_MS - elapsed;
    if (remainingMs <= 0) return 0;
    return Math.ceil(remainingMs / (24 * 60 * 60 * 1000));
  }

  /**
   * Get or create a conversation between current user and target participant
   */
  public static async getOrCreateConversation(
    currentUser: UserProfile,
    target: { uid: string; name: string; role?: UserRole; profilePic?: string; email?: string }
  ): Promise<Conversation> {
    if (!currentUser.uid || !target.uid) {
      throw new Error('Valid participant UIDs are required to start a conversation.');
    }

    const convId = this.getConversationId(currentUser.uid, target.uid);
    const now = Date.now();

    const currentParticipant: ConversationParticipant = {
      uid: currentUser.uid,
      name: currentUser.name || 'User',
      email: currentUser.email,
      role: currentUser.role || 'user',
      profilePic: currentUser.profilePic || 'default',
      isOnline: currentUser.isOnline ?? true,
      lastSeen: currentUser.lastSeen || now
    };

    const targetParticipant: ConversationParticipant = {
      uid: target.uid,
      name: target.name || 'Professional',
      email: target.email,
      role: target.role || 'doctor',
      profilePic: target.profilePic || 'default'
    };

    const initialConv: Conversation = {
      id: convId,
      participantIds: [currentUser.uid, target.uid],
      participants: {
        [currentUser.uid]: currentParticipant,
        [target.uid]: targetParticipant
      },
      lastMessage: '',
      lastMessageTime: now,
      unreadCounts: {
        [currentUser.uid]: 0,
        [target.uid]: 0
      },
      createdAt: now,
      updatedAt: now
    };

    if (isFirebaseConfigured && db) {
      try {
        const convRef = doc(db, 'conversations', convId);
        const snap = await getDoc(convRef);
        if (snap.exists()) {
          const data = snap.data() as Conversation;
          // Refresh current participant's profile details
          const updatedParticipants = {
            ...(data.participants || {}),
            [currentUser.uid]: {
              ...(data.participants?.[currentUser.uid] || {}),
              ...currentParticipant
            },
            [target.uid]: {
              ...(data.participants?.[target.uid] || {}),
              ...targetParticipant
            }
          };
          await updateDoc(convRef, {
            participants: updatedParticipants,
            updatedAt: now
          });
          return {
            ...data,
            id: convId,
            participants: updatedParticipants
          };
        } else {
          await setDoc(convRef, initialConv);
          this.saveLocalConversation(initialConv);
          return initialConv;
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `conversations/${convId}`);
      }
    }

    // LocalStorage fallback
    const local = this.getLocalConversations();
    const existing = local.find(c => c.id === convId);
    if (existing) {
      existing.participants[currentUser.uid] = currentParticipant;
      existing.participants[target.uid] = targetParticipant;
      existing.updatedAt = now;
      this.saveAllLocalConversations(local);
      return existing;
    }

    local.unshift(initialConv);
    this.saveAllLocalConversations(local);
    return initialConv;
  }

  /**
   * Real-time subscription to all conversations for a user
   */
  public static subscribeToConversations(
    userId: string,
    onUpdate: (conversations: Conversation[]) => void,
    onError?: (error: any) => void
  ): () => void {
    if (!userId) {
      onUpdate([]);
      return () => {};
    }

    if (isFirebaseConfigured && db) {
      try {
        const q = query(
          collection(db, 'conversations'),
          where('participantIds', 'array-contains', userId)
        );

        const unsubscribe = onSnapshot(
          q,
          (snapshot) => {
            const list: Conversation[] = [];
            const cutoff = Date.now() - FIFTEEN_DAYS_MS;

            snapshot.forEach((docSnap) => {
              const data = docSnap.data() as Conversation;
              const conv: Conversation = { ...data, id: docSnap.id };

              // If conversation last message or creation is within 15 days retention
              const activityTime = conv.lastMessageTime || conv.updatedAt || conv.createdAt;
              if (activityTime >= cutoff) {
                list.push(conv);
              }
            });

            // Sort most recent first
            list.sort((a, b) => (b.lastMessageTime || b.updatedAt) - (a.lastMessageTime || a.updatedAt));

            // Sync to local cache for resilience
            this.syncConversationsToLocal(list);
            onUpdate(list);
          },
          (err) => {
            handleFirestoreError(err, OperationType.LIST, 'conversations');
            if (onError) onError(err);
            // Fallback to local
            const local = this.getLocalConversationsForUser(userId);
            onUpdate(local);
          }
        );

        return unsubscribe;
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, 'conversations');
      }
    }

    // Offline / Local fallback subscription polling
    const local = this.getLocalConversationsForUser(userId);
    onUpdate(local);
    const interval = setInterval(() => {
      onUpdate(this.getLocalConversationsForUser(userId));
    }, 1500);

    return () => clearInterval(interval);
  }

  /**
   * Real-time subscription to messages inside a conversation with automatic delivery & read receipts
   */
  public static subscribeToMessages(
    conversationId: string,
    currentUserId: string,
    isConversationActive: boolean,
    onUpdate: (messages: ChatMessage[]) => void,
    onError?: (error: any) => void
  ): () => void {
    if (!conversationId) {
      onUpdate([]);
      return () => {};
    }

    if (isFirebaseConfigured && db) {
      try {
        const msgsRef = collection(db, 'conversations', conversationId, 'messages');
        const q = query(msgsRef, orderBy('timestamp', 'asc'));

        const unsubscribe = onSnapshot(
          q,
          async (snapshot) => {
            const rawMessages: ChatMessage[] = [];
            const cutoff = Date.now() - FIFTEEN_DAYS_MS;
            const expiredDocIds: string[] = [];
            const toDeliverDocIds: string[] = [];
            const toSeenDocIds: string[] = [];

            snapshot.forEach((d) => {
              const msg = { ...d.data(), id: d.id } as ChatMessage;
              if (msg.timestamp < cutoff) {
                expiredDocIds.push(d.id);
              } else {
                rawMessages.push(msg);

                // Check for status updates on incoming messages destined for current user
                if (msg.receiverId === currentUserId) {
                  if (isConversationActive && msg.status !== 'seen') {
                    toSeenDocIds.push(d.id);
                  } else if (!isConversationActive && msg.status === 'sent') {
                    toDeliverDocIds.push(d.id);
                  }
                }
              }
            });

            // Asynchronously clean up expired (> 15 days) messages
            if (expiredDocIds.length > 0) {
              this.deleteExpiredMessagesAsync(conversationId, expiredDocIds);
            }

            // Asynchronously update message statuses to prevent conflicts
            if (toSeenDocIds.length > 0) {
              this.batchUpdateMessageStatus(conversationId, toSeenDocIds, 'seen');
              this.resetUnreadCountAsync(conversationId, currentUserId);
            } else if (toDeliverDocIds.length > 0) {
              this.batchUpdateMessageStatus(conversationId, toDeliverDocIds, 'delivered');
            }

            // Sync to local
            this.syncMessagesToLocal(conversationId, rawMessages);
            onUpdate(rawMessages);
          },
          (err) => {
            handleFirestoreError(err, OperationType.LIST, `conversations/${conversationId}/messages`);
            if (onError) onError(err);
            const local = this.getLocalMessages(conversationId);
            onUpdate(local);
          }
        );

        return unsubscribe;
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, `conversations/${conversationId}/messages`);
      }
    }

    // Local fallback
    const local = this.getLocalMessages(conversationId);
    onUpdate(local);
    const interval = setInterval(() => {
      onUpdate(this.getLocalMessages(conversationId));
    }, 1200);

    return () => clearInterval(interval);
  }

  /**
   * Send a message in a conversation.
   * Immediately sets status: 'sent' (Single tick).
   */
  public static async sendMessage(
    conversationId: string,
    sender: UserProfile,
    receiver: { uid: string; name: string; role?: UserRole; profilePic?: string; email?: string },
    text: string
  ): Promise<ChatMessage> {
    const trimmed = text.trim();
    if (!trimmed) throw new Error('Message text cannot be empty.');
    if (!sender.uid || !receiver.uid) throw new Error('Missing sender or receiver identity.');

    const now = Date.now();
    const msgId = `msg_${now}_${Math.random().toString(36).substring(2, 9)}`;

    const message: ChatMessage = {
      id: msgId,
      conversationId,
      senderId: sender.uid,
      senderName: sender.name || 'User',
      senderRole: sender.role,
      senderPic: sender.profilePic || 'default',
      receiverId: receiver.uid,
      text: trimmed,
      timestamp: now,
      status: 'sent', // Single tick initially
      createdAt: now
    };

    // Save to local storage immediately for optimistic UI
    this.addLocalMessage(conversationId, message);

    if (isFirebaseConfigured && db) {
      try {
        const msgRef = doc(db, 'conversations', conversationId, 'messages', msgId);
        await setDoc(msgRef, message);

        // Update conversation summary
        const convRef = doc(db, 'conversations', conversationId);
        const convSnap = await getDoc(convRef);

        const currentUnread = convSnap.exists()
          ? (convSnap.data().unreadCounts?.[receiver.uid] || 0) + 1
          : 1;

        const updatedParticipants: Record<string, ConversationParticipant> = {
          [sender.uid]: {
            uid: sender.uid,
            name: sender.name || 'User',
            role: sender.role || 'user',
            profilePic: sender.profilePic || 'default',
            isOnline: true,
            lastSeen: now
          },
          [receiver.uid]: {
            uid: receiver.uid,
            name: receiver.name || 'Professional',
            role: receiver.role || 'doctor',
            profilePic: receiver.profilePic || 'default'
          }
        };

        await setDoc(
          convRef,
          {
            id: conversationId,
            participantIds: [sender.uid, receiver.uid],
            participants: updatedParticipants,
            lastMessage: trimmed,
            lastMessageTime: now,
            lastSenderId: sender.uid,
            unreadCounts: {
              ...(convSnap.exists() ? convSnap.data().unreadCounts : {}),
              [receiver.uid]: currentUnread,
              [sender.uid]: 0
            },
            updatedAt: now
          },
          { merge: true }
        );

        return message;
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `conversations/${conversationId}/messages/${msgId}`);
      }
    }

    // Local update conversation summary
    const localConvs = this.getLocalConversations();
    let conv = localConvs.find(c => c.id === conversationId);
    if (!conv) {
      conv = {
        id: conversationId,
        participantIds: [sender.uid, receiver.uid],
        participants: {
          [sender.uid]: { uid: sender.uid, name: sender.name, role: sender.role, profilePic: sender.profilePic },
          [receiver.uid]: { uid: receiver.uid, name: receiver.name, role: receiver.role || 'doctor', profilePic: receiver.profilePic }
        },
        unreadCounts: { [receiver.uid]: 1, [sender.uid]: 0 },
        createdAt: now,
        updatedAt: now
      };
      localConvs.unshift(conv);
    }
    conv.lastMessage = trimmed;
    conv.lastMessageTime = now;
    conv.lastSenderId = sender.uid;
    conv.unreadCounts = {
      ...(conv.unreadCounts || {}),
      [receiver.uid]: ((conv.unreadCounts?.[receiver.uid] || 0) + 1),
      [sender.uid]: 0
    };
    conv.updatedAt = now;
    this.saveAllLocalConversations(localConvs);

    return message;
  }

  /**
   * Mark all unread messages as 'seen' (Double Blue Ticks)
   */
  public static async markMessagesAsSeen(conversationId: string, currentUserId: string): Promise<void> {
    if (!conversationId || !currentUserId) return;

    if (isFirebaseConfigured && db) {
      try {
        const msgsRef = collection(db, 'conversations', conversationId, 'messages');
        const q = query(
          msgsRef,
          where('receiverId', '==', currentUserId)
        );

        const snap = await getDocs(q);
        const docIdsToUpdate: string[] = [];
        snap.forEach((d) => {
          const data = d.data();
          if (data.status !== 'seen') {
            docIdsToUpdate.push(d.id);
          }
        });

        if (docIdsToUpdate.length > 0) {
          await this.batchUpdateMessageStatus(conversationId, docIdsToUpdate, 'seen');
        }

        // Reset conversation unread counter
        await this.resetUnreadCountAsync(conversationId, currentUserId);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `conversations/${conversationId}/seen`);
      }
    }

    // Local update
    const localMsgs = this.getLocalMessages(conversationId);
    let changed = false;
    localMsgs.forEach((m) => {
      if (m.receiverId === currentUserId && m.status !== 'seen') {
        m.status = 'seen';
        changed = true;
      }
    });
    if (changed) {
      this.syncMessagesToLocal(conversationId, localMsgs);
    }

    const localConvs = this.getLocalConversations();
    const conv = localConvs.find(c => c.id === conversationId);
    if (conv && conv.unreadCounts) {
      conv.unreadCounts[currentUserId] = 0;
      this.saveAllLocalConversations(localConvs);
    }
  }

  /**
   * Subscribe to total unread messages count for badges on slide bar and top bar
   */
  public static subscribeToTotalUnreadCount(
    userId: string,
    onUpdate: (count: number) => void
  ): () => void {
    if (!userId) {
      onUpdate(0);
      return () => {};
    }

    return this.subscribeToConversations(userId, (conversations) => {
      const total = conversations.reduce((sum, c) => sum + (c.unreadCounts?.[userId] || 0), 0);
      onUpdate(total);
    });
  }

  /**
   * Asynchronously batch updates message status ('delivered' or 'seen')
   */
  private static async batchUpdateMessageStatus(
    conversationId: string,
    messageIds: string[],
    newStatus: MessageStatus
  ): Promise<void> {
    if (!db || messageIds.length === 0) return;

    try {
      // Chunk batches of max 200 writes
      const chunkSize = 200;
      for (let i = 0; i < messageIds.length; i += chunkSize) {
        const chunk = messageIds.slice(i, i + chunkSize);
        const batch = writeBatch(db);
        chunk.forEach((msgId) => {
          const ref = doc(db, 'conversations', conversationId, 'messages', msgId);
          batch.update(ref, { status: newStatus });
        });
        await batch.commit();
      }
    } catch {
      // Non-blocking status sync
    }
  }

  /**
   * Reset unread counter on conversation doc
   */
  private static async resetUnreadCountAsync(conversationId: string, userId: string): Promise<void> {
    if (!db) return;
    try {
      const convRef = doc(db, 'conversations', conversationId);
      await updateDoc(convRef, {
        [`unreadCounts.${userId}`]: 0
      });
    } catch {
      // Non-blocking
    }
  }

  /**
   * Delete messages older than 15 days asynchronously
   */
  private static async deleteExpiredMessagesAsync(conversationId: string, messageIds: string[]): Promise<void> {
    if (!db || messageIds.length === 0) return;
    try {
      const batch = writeBatch(db);
      messageIds.forEach((id) => {
        const ref = doc(db, 'conversations', conversationId, 'messages', id);
        batch.delete(ref);
      });
      await batch.commit();
    } catch {
      // Non-blocking
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // LOCALSTORAGE FALLBACK HELPERS
  // ─────────────────────────────────────────────────────────────────
  private static getLocalConversations(): Conversation[] {
    try {
      const raw = localStorage.getItem(LOCAL_CONVERSATIONS_KEY);
      if (!raw) return [];
      const parsed: Conversation[] = JSON.parse(raw);
      const cutoff = Date.now() - FIFTEEN_DAYS_MS;
      return parsed.filter(c => (c.lastMessageTime || c.updatedAt) >= cutoff);
    } catch {
      return [];
    }
  }

  private static getLocalConversationsForUser(userId: string): Conversation[] {
    return this.getLocalConversations()
      .filter(c => c.participantIds && c.participantIds.includes(userId))
      .sort((a, b) => (b.lastMessageTime || b.updatedAt) - (a.lastMessageTime || a.updatedAt));
  }

  private static saveAllLocalConversations(convs: Conversation[]): void {
    try {
      const cutoff = Date.now() - FIFTEEN_DAYS_MS;
      const valid = convs.filter(c => (c.lastMessageTime || c.updatedAt) >= cutoff);
      localStorage.setItem(LOCAL_CONVERSATIONS_KEY, JSON.stringify(valid));
    } catch {
      // Storage quota safe
    }
  }

  private static saveLocalConversation(conv: Conversation): void {
    const all = this.getLocalConversations();
    const idx = all.findIndex(c => c.id === conv.id);
    if (idx >= 0) {
      all[idx] = conv;
    } else {
      all.unshift(conv);
    }
    this.saveAllLocalConversations(all);
  }

  private static syncConversationsToLocal(convs: Conversation[]): void {
    const existing = this.getLocalConversations();
    const map = new Map<string, Conversation>();
    existing.forEach(c => map.set(c.id, c));
    convs.forEach(c => map.set(c.id, c));
    this.saveAllLocalConversations(Array.from(map.values()));
  }

  public static getLocalMessages(conversationId: string): ChatMessage[] {
    try {
      const raw = localStorage.getItem(`${LOCAL_MESSAGES_KEY}_${conversationId}`);
      if (!raw) return [];
      const parsed: ChatMessage[] = JSON.parse(raw);
      const cutoff = Date.now() - FIFTEEN_DAYS_MS;
      return parsed.filter(m => m.timestamp >= cutoff);
    } catch {
      return [];
    }
  }

  private static syncMessagesToLocal(conversationId: string, messages: ChatMessage[]): void {
    try {
      const cutoff = Date.now() - FIFTEEN_DAYS_MS;
      const valid = messages.filter(m => m.timestamp >= cutoff);
      localStorage.setItem(`${LOCAL_MESSAGES_KEY}_${conversationId}`, JSON.stringify(valid));
    } catch {
      // Storage quota safe
    }
  }

  private static addLocalMessage(conversationId: string, message: ChatMessage): void {
    const current = this.getLocalMessages(conversationId);
    current.push(message);
    this.syncMessagesToLocal(conversationId, current);
  }
}
