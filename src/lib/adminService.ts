import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  arrayUnion
} from 'firebase/firestore';
import { db, auth, isFirebaseConfigured, handleFirestoreError, OperationType } from './firebase';
import { UserProfile, UserRole, PromotionalAd, JobPost, JobApplication, ManualPayment } from '../types';
import { NotificationService } from './storage';

const LOCAL_USERS_KEY = 'va_users';
const LOCAL_SESSION_KEY = 'va_session';

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

export const AdminService = {
  /**
   * Fetch all registered users in the platform
   */
  async getAllUsers(): Promise<UserProfile[]> {
    if (isFirebaseConfigured && db) {
      try {
        const snap = await getDocs(collection(db, 'users'));
        return snap.docs.map(docSnap => {
          const data = docSnap.data() as UserProfile;
          return {
            ...data,
            uid: data.uid || docSnap.id
          };
        });
      } catch (err) {
        console.error('AdminService: Error fetching all users:', err);
        try {
          handleFirestoreError(err, OperationType.LIST, 'users');
        } catch {
          // Allow fallback to localStorage
        }
      }
    }

    // LocalStorage fallback
    try {
      const local = localStorage.getItem(LOCAL_USERS_KEY);
      if (local) {
        return JSON.parse(local) as UserProfile[];
      }
    } catch {}
    return [];
  },

  /**
   * Modify User Role with automatic privilege revocation and safety checks
   */
  async modifyUserRole(
    userId: string,
    newRole: UserRole,
    options: {
      revokeSubscriptions?: boolean;
      revokeVerification?: boolean;
      deactivateBillboardAds?: boolean;
      reason?: string;
      adminName?: string;
    } = {}
  ): Promise<boolean> {
    const {
      revokeSubscriptions = true,
      revokeVerification = true,
      deactivateBillboardAds = true,
      reason = '',
      adminName = 'System Admin'
    } = options;

    const updates: Record<string, any> = {
      role: newRole
    };

    if (revokeSubscriptions) {
      updates.subscriptionTier = null;
      updates.subscriptionExpiresAt = null;
      updates.promoAdsUsed = 0;
    }

    if (revokeVerification) {
      updates.isVerified = false;
    }

    // Update in Firestore
    if (isFirebaseConfigured && db) {
      try {
        await updateDoc(doc(db, 'users', userId), cleanUndefined(updates));
      } catch (err) {
        console.error(`AdminService: Failed to update role for user ${userId}:`, err);
        handleFirestoreError(err, OperationType.UPDATE, `users/${userId}`);
        return false;
      }

      // If deactivating billboard ads for non-clinician role
      if (deactivateBillboardAds && (newRole === 'user' || newRole === 'assistant')) {
        try {
          const qAds = query(collection(db, 'promotional_ads'), where('ownerUid', '==', userId));
          const snapAds = await getDocs(qAds);
          for (const adDoc of snapAds.docs) {
            await updateDoc(doc(db, 'promotional_ads', adDoc.id), {
              status: 'rejected',
              approved: false
            });
          }
        } catch (adErr) {
          console.warn('AdminService: Error deactivating user billboard ads:', adErr);
        }
      }
    }

    // Update Local Storage cache
    try {
      const local = localStorage.getItem(LOCAL_USERS_KEY);
      if (local) {
        const users = JSON.parse(local) as UserProfile[];
        const idx = users.findIndex(u => u.uid === userId);
        if (idx !== -1) {
          users[idx].role = newRole;
          if (revokeSubscriptions) {
            users[idx].subscriptionTier = undefined;
            users[idx].subscriptionExpiresAt = undefined;
            users[idx].promoAdsUsed = 0;
          }
          if (revokeVerification) {
            users[idx].isVerified = false;
          }
          localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
        }
      }

      // Update current active session if modifying own account
      const rawSession = localStorage.getItem(LOCAL_SESSION_KEY);
      if (rawSession) {
        const sess = JSON.parse(rawSession);
        if (sess && sess.uid === userId) {
          sess.role = newRole;
          if (revokeSubscriptions) {
            sess.subscriptionTier = undefined;
            sess.subscriptionExpiresAt = undefined;
            sess.promoAdsUsed = 0;
          }
          if (revokeVerification) {
            sess.isVerified = false;
          }
          localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(sess));
        }
      }
    } catch (e) {
      console.warn('AdminService: Local storage cache update warning:', e);
    }

    // Send direct status change notification
    try {
      const roleLabels: Record<UserRole, string> = {
        doctor: 'Veterinary Doctor',
        clinic: 'Veterinary Hospital / Clinic',
        vendor: 'Pet Store / Vendor / Supplier',
        assistant: 'Veterinary Assistant / Paravet',
        user: 'Livestock Farmer / Pet Owner'
      };

      const customMsg = reason.trim()
        ? ` Your account role was modified to "${roleLabels[newRole]}". Admin Note: "${reason.trim()}".`
        : ` Your account role has been updated to "${roleLabels[newRole]}" by the administration.`;

      await NotificationService.createNotification({
        userId,
        senderId: 'admin',
        senderName: adminName,
        type: 'status_change',
        targetId: userId,
        targetType: 'appointment',
        message: `Account Role Update:${customMsg}${revokeSubscriptions ? ' Any active subscription tiers and directory priority checkmarks have been reassigned.' : ''}`
      });
    } catch (notifErr) {
      console.warn('AdminService: Failed to dispatch role update notification:', notifErr);
    }

    return true;
  },

  /**
   * Toggle Verification Badge for a Doctor or Clinic
   */
  async toggleUserVerification(userId: string, isVerified: boolean, adminName = 'System Admin'): Promise<boolean> {
    if (isFirebaseConfigured && db) {
      try {
        await updateDoc(doc(db, 'users', userId), {
          isVerified
        });
      } catch (err) {
        console.error('AdminService: Error updating verification badge:', err);
        handleFirestoreError(err, OperationType.UPDATE, `users/${userId}`);
        return false;
      }
    }

    // Update local storage
    try {
      const local = localStorage.getItem(LOCAL_USERS_KEY);
      if (local) {
        const users = JSON.parse(local) as UserProfile[];
        const idx = users.findIndex(u => u.uid === userId);
        if (idx !== -1) {
          users[idx].isVerified = isVerified;
          localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
        }
      }
    } catch {}

    // Send notification
    try {
      await NotificationService.createNotification({
        userId,
        senderId: 'admin',
        senderName: adminName,
        type: 'status_change',
        targetId: userId,
        targetType: 'appointment',
        message: isVerified
          ? '🎉 Congratulations! Your practitioner profile has been officially VERIFIED by the VetAxis Medical Board.'
          : 'Your practitioner profile verification checkmark has been removed by the administrator.'
      });
    } catch {}

    return true;
  },

  /**
   * Migrate Clinic Job Postings and Applications to a real doctor/clinic account
   */
  async transferClinicData(
    sourceClinicUidOrEmail: string,
    targetPractitioner: UserProfile,
    options: { adminName?: string } = {}
  ): Promise<{ jobsMigrated: number; applicationsMigrated: number }> {
    const { adminName = 'System Admin' } = options;
    let jobsMigrated = 0;
    let applicationsMigrated = 0;

    if (isFirebaseConfigured && db) {
      try {
        // 1. Migrate Job Posts
        const snapJobs = await getDocs(collection(db, 'job_posts'));
        for (const jobDoc of snapJobs.docs) {
          const data = jobDoc.data() as JobPost;
          if (data.clinicId === sourceClinicUidOrEmail || data.clinicEmail === sourceClinicUidOrEmail) {
            await updateDoc(doc(db, 'job_posts', jobDoc.id), {
              clinicId: targetPractitioner.uid,
              clinicName: targetPractitioner.name,
              clinicEmail: targetPractitioner.email
            });
            jobsMigrated++;
          }
        }

        // 2. Migrate Job Applications
        const snapApps = await getDocs(collection(db, 'job_applications'));
        for (const appDoc of snapApps.docs) {
          const data = appDoc.data() as JobApplication;
          if (data.clinicId === sourceClinicUidOrEmail) {
            await updateDoc(doc(db, 'job_applications', appDoc.id), {
              clinicId: targetPractitioner.uid
            });
            applicationsMigrated++;
          }
        }
      } catch (err) {
        console.error('AdminService: Error transferring clinic data:', err);
      }
    }

    // Send notification
    try {
      await NotificationService.createNotification({
        userId: targetPractitioner.uid,
        senderId: 'admin',
        senderName: adminName,
        type: 'status_change',
        targetId: targetPractitioner.uid,
        targetType: 'job',
        message: `🏢 Clinic Data Migration Complete: ${jobsMigrated} job postings and ${applicationsMigrated} applicant files have been linked to your verified practitioner profile.`
      });
    } catch {}

    return { jobsMigrated, applicationsMigrated };
  }
};
