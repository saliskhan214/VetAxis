import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  orderBy
} from 'firebase/firestore';
import { db, isFirebaseConfigured, handleFirestoreError, OperationType } from './firebase';
import { UserProfile, AdminBroadcast, VetNotification, UserRole } from '../types';
import { AdminService } from './adminService';
import { NotificationService } from './storage';
import { BrowserNotificationService } from './browserNotification';

const LOCAL_BROADCASTS_KEY = 'va_admin_broadcasts';

function cleanUndefined<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => cleanUndefined(item)) as any;
  }
  const result = { ...obj } as any;
  Object.keys(result).forEach(key => {
    if (result[key] === undefined) {
      delete result[key];
    } else if (typeof result[key] === 'object' && result[key] !== null) {
      result[key] = cleanUndefined(result[key]);
    }
  });
  return result;
}

export interface BroadcastSendOptions {
  title: string;
  message: string;
  category: 'announcement' | 'emergency' | 'maintenance' | 'update' | 'advisory';
  targetAudience: 'all' | UserRole;
  priority: 'normal' | 'urgent';
  sendInApp: boolean;
  sendBrowser: boolean;
}

export const BroadcastService = {
  /**
   * Fetch all previously sent broadcast announcements
   */
  async fetchBroadcastHistory(): Promise<AdminBroadcast[]> {
    if (isFirebaseConfigured && db) {
      try {
        const q = query(
          collection(db, 'admin_broadcasts'),
          orderBy('createdAt', 'desc')
        );
        const snap = await getDocs(q);
        const list = snap.docs.map(d => ({
          id: d.id,
          ...d.data()
        })) as AdminBroadcast[];
        return list;
      } catch (err) {
        console.warn('Error fetching broadcasts from Firestore, trying fallback:', err);
        try {
          handleFirestoreError(err, OperationType.LIST, 'admin_broadcasts');
        } catch {}
      }
    }

    try {
      const stored = localStorage.getItem(LOCAL_BROADCASTS_KEY);
      if (stored) {
        return JSON.parse(stored) as AdminBroadcast[];
      }
    } catch {}

    return [];
  },

  /**
   * Delete a broadcast record from history
   */
  async deleteBroadcast(broadcastId: string): Promise<boolean> {
    if (isFirebaseConfigured && db) {
      try {
        await deleteDoc(doc(db, 'admin_broadcasts', broadcastId));
      } catch (err) {
        console.warn('Error deleting broadcast doc:', err);
        try {
          handleFirestoreError(err, OperationType.DELETE, `admin_broadcasts/${broadcastId}`);
        } catch {}
      }
    }

    try {
      const list = await this.fetchBroadcastHistory();
      const updated = list.filter(b => b.id !== broadcastId);
      localStorage.setItem(LOCAL_BROADCASTS_KEY, JSON.stringify(updated));
    } catch {}

    return true;
  },

  /**
   * Send a system-wide broadcast notification to all targeted users
   * - Saves individual in-app notification in Firestore & localStorage for each targeted user
   * - Saves administrative broadcast record to admin_broadcasts
   * - Triggers real-time cross-tab and native browser push notifications
   */
  async sendBroadcast(
    admin: UserProfile,
    payload: BroadcastSendOptions
  ): Promise<{ success: boolean; recipientCount: number; broadcastId: string }> {
    const broadcastId = 'bcast_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);

    // 1. Fetch targeted users
    const allUsers = await AdminService.getAllUsers();
    
    let targetUsers: UserProfile[] = [];
    if (payload.targetAudience === 'all') {
      targetUsers = allUsers;
    } else {
      targetUsers = allUsers.filter(u => u.role === payload.targetAudience);
    }

    // Ensure we have at least one recipient if targetUsers is empty in dev environment
    if (targetUsers.length === 0 && admin) {
      targetUsers = [admin];
    }

    const timestamp = Date.now();

    // 2. Prepare individual notification payload for in-app delivery
    const broadcastRecord: AdminBroadcast = {
      id: broadcastId,
      adminUid: admin.uid,
      adminName: admin.name || 'System Admin',
      adminEmail: admin.email || 'saliskhan214@gmail.com',
      title: payload.title.trim(),
      message: payload.message.trim(),
      category: payload.category,
      targetAudience: payload.targetAudience,
      priority: payload.priority,
      recipientCount: targetUsers.length,
      sendInApp: payload.sendInApp,
      sendBrowser: payload.sendBrowser,
      createdAt: timestamp
    };

    // 3. Deliver in-app notifications if requested
    if (payload.sendInApp) {
      const notifPromises = targetUsers.map(async (u) => {
        const notif: Partial<VetNotification> = {
          id: 'notif_' + broadcastId + '_' + (u.uid || Math.random().toString(36).substring(2, 6)),
          userId: u.uid,
          senderId: admin.uid,
          senderName: `${admin.name || 'VetAxis Admin'} (Official)`,
          type: 'admin_broadcast',
          targetId: broadcastId,
          targetType: 'broadcast',
          title: payload.title.trim(),
          message: payload.message.trim(),
          priority: payload.priority,
          read: false
        };

        try {
          await NotificationService.createNotification(notif);
        } catch (err) {
          console.error(`Failed to deliver in-app notification to user ${u.uid}:`, err);
        }
      });

      // Execute delivery in parallel batches
      await Promise.allSettled(notifPromises);
    }

    // 4. Save to admin_broadcasts collection in Firestore
    if (isFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, 'admin_broadcasts', broadcastId), cleanUndefined(broadcastRecord));
      } catch (err) {
        console.warn('Error saving admin_broadcasts to Firestore:', err);
        try {
          handleFirestoreError(err, OperationType.CREATE, `admin_broadcasts/${broadcastId}`);
        } catch {}
      }
    }

    // 5. Save to local storage for offline resilience & history
    try {
      const history = await this.fetchBroadcastHistory();
      const updated = [broadcastRecord, ...history.filter(h => h.id !== broadcastId)];
      localStorage.setItem(LOCAL_BROADCASTS_KEY, JSON.stringify(updated.slice(0, 50)));
    } catch {}

    // 6. Broadcast across tabs and trigger native OS / browser notification for active viewers
    BrowserNotificationService.broadcastLocally({
      type: 'admin_broadcast',
      broadcastId,
      title: payload.title.trim(),
      message: payload.message.trim(),
      category: payload.category,
      priority: payload.priority,
      senderName: admin.name || 'VetAxis Administration',
      targetAudience: payload.targetAudience,
      sendBrowser: payload.sendBrowser,
      createdAt: timestamp
    });

    // 7. If browser notification is requested and supported on this client, trigger immediately
    if (payload.sendBrowser && BrowserNotificationService.isSupported() && BrowserNotificationService.getPermission() === 'granted') {
      BrowserNotificationService.showNotification(payload.title.trim(), {
        body: payload.message.trim(),
        tag: broadcastId,
        requireInteraction: payload.priority === 'urgent',
        badge: '/logo.png',
        icon: '/logo.png'
      });
    }

    return {
      success: true,
      recipientCount: targetUsers.length,
      broadcastId
    };
  }
};
