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
import { UserProfile, UserRole, LivestockFarm, PromotionalAd, JobPost, JobApplication, ManualPayment } from '../types';
import { NotificationService } from './storage';

const LOCAL_USERS_KEY = 'va_users';
const LOCAL_SESSION_KEY = 'va_session';
const LOCAL_FARMS_KEY = 'va_farms';

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
        handleFirestoreError(err, OperationType.LIST, 'users');
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
   * Fetch all registered livestock farms across the platform
   */
  async getAllFarms(): Promise<LivestockFarm[]> {
    if (isFirebaseConfigured && db) {
      try {
        const snap = await getDocs(collection(db, 'livestock_farms'));
        return snap.docs.map(docSnap => ({
          id: docSnap.id,
          ...docSnap.data()
        })) as LivestockFarm[];
      } catch (err) {
        console.error('AdminService: Error fetching all livestock farms:', err);
        handleFirestoreError(err, OperationType.LIST, 'livestock_farms');
      }
    }

    try {
      const local = localStorage.getItem(LOCAL_FARMS_KEY);
      if (local) {
        return JSON.parse(local) as LivestockFarm[];
      }
    } catch {}
    return [];
  },

  /**
   * Reassign Farm Ownership to a genuine practitioner or farmer
   */
  async reassignFarmOwner(
    farmId: string,
    newOwnerUser: UserProfile,
    options: { reason?: string; adminName?: string } = {}
  ): Promise<boolean> {
    const { reason = '', adminName = 'System Admin' } = options;

    if (isFirebaseConfigured && db) {
      try {
        const farmDocRef = doc(db, 'livestock_farms', farmId);
        const farmSnap = await getDoc(farmDocRef);
        
        let existingTeam: any[] = [];
        let existingMembers: string[] = [];
        let existingAuth: string[] = [];

        if (farmSnap.exists()) {
          const data = farmSnap.data() as LivestockFarm;
          existingTeam = data.team || [];
          existingMembers = data.memberUids || [];
          existingAuth = data.authorizedUsers || [];
        }

        // Add new owner to team if not present
        const updatedTeam = existingTeam.filter(t => t.uid !== newOwnerUser.uid);
        updatedTeam.unshift({
          uid: newOwnerUser.uid,
          name: newOwnerUser.name,
          email: newOwnerUser.email,
          role: 'Owner'
        });

        const updatedMembers = Array.from(new Set([...existingMembers, newOwnerUser.uid]));
        const updatedAuth = Array.from(new Set([...existingAuth, newOwnerUser.uid]));

        const updates = {
          ownerUid: newOwnerUser.uid,
          ownerId: newOwnerUser.uid,
          ownerName: newOwnerUser.name,
          ownerEmail: newOwnerUser.email,
          team: updatedTeam,
          memberUids: updatedMembers,
          authorizedUsers: updatedAuth
        };

        await updateDoc(farmDocRef, cleanUndefined(updates));
      } catch (err) {
        console.error(`AdminService: Failed to reassign farm owner for ${farmId}:`, err);
        handleFirestoreError(err, OperationType.UPDATE, `livestock_farms/${farmId}`);
        return false;
      }
    }

    // Update local storage
    try {
      const local = localStorage.getItem(LOCAL_FARMS_KEY);
      if (local) {
        const farms = JSON.parse(local) as LivestockFarm[];
        const idx = farms.findIndex(f => f.id === farmId);
        if (idx !== -1) {
          farms[idx].ownerUid = newOwnerUser.uid;
          farms[idx].ownerId = newOwnerUser.uid;
          farms[idx].ownerName = newOwnerUser.name;
          farms[idx].ownerEmail = newOwnerUser.email;
          localStorage.setItem(LOCAL_FARMS_KEY, JSON.stringify(farms));
        }
      }
    } catch {}

    // Send notification to the new owner
    try {
      await NotificationService.createNotification({
        userId: newOwnerUser.uid,
        senderId: 'admin',
        senderName: adminName,
        type: 'farm_assign',
        targetId: farmId,
        targetType: 'farm',
        message: `🌾 Farm Ownership Reassigned: You have been assigned as the official Owner of farm #${farmId}.${reason ? ` Note: "${reason}"` : ''}`
      });
    } catch (e) {
      console.warn('AdminService: Notification dispatch error:', e);
    }

    return true;
  },

  /**
   * Reassign or Appoint Farm Veterinary Manager
   */
  async reassignFarmManager(
    farmId: string,
    newManagerUser: UserProfile | null,
    options: { reason?: string; adminName?: string } = {}
  ): Promise<boolean> {
    const { reason = '', adminName = 'System Admin' } = options;

    if (isFirebaseConfigured && db) {
      try {
        const farmDocRef = doc(db, 'livestock_farms', farmId);
        const farmSnap = await getDoc(farmDocRef);

        let existingMembers: string[] = [];
        let existingAuth: string[] = [];

        if (farmSnap.exists()) {
          const data = farmSnap.data() as LivestockFarm;
          existingMembers = data.memberUids || [];
          existingAuth = data.authorizedUsers || [];
        }

        let updates: Record<string, any> = {};

        if (newManagerUser) {
          const updatedMembers = Array.from(new Set([...existingMembers, newManagerUser.uid]));
          const updatedAuth = Array.from(new Set([...existingAuth, newManagerUser.uid]));

          updates = {
            managerUid: newManagerUser.uid,
            managerName: newManagerUser.name,
            managerRole: newManagerUser.role as any,
            managerStatus: 'linked',
            memberUids: updatedMembers,
            authorizedUsers: updatedAuth
          };
        } else {
          updates = {
            managerUid: null,
            managerName: null,
            managerRole: null,
            managerStatus: 'unassigned'
          };
        }

        await updateDoc(farmDocRef, cleanUndefined(updates));
      } catch (err) {
        console.error(`AdminService: Failed to reassign farm manager for ${farmId}:`, err);
        handleFirestoreError(err, OperationType.UPDATE, `livestock_farms/${farmId}`);
        return false;
      }
    }

    // Local Storage update
    try {
      const local = localStorage.getItem(LOCAL_FARMS_KEY);
      if (local) {
        const farms = JSON.parse(local) as LivestockFarm[];
        const idx = farms.findIndex(f => f.id === farmId);
        if (idx !== -1) {
          if (newManagerUser) {
            farms[idx].managerUid = newManagerUser.uid;
            farms[idx].managerName = newManagerUser.name;
            farms[idx].managerRole = newManagerUser.role as any;
            farms[idx].managerStatus = 'linked';
          } else {
            farms[idx].managerUid = undefined;
            farms[idx].managerName = undefined;
            farms[idx].managerRole = undefined;
            farms[idx].managerStatus = 'unassigned';
          }
          localStorage.setItem(LOCAL_FARMS_KEY, JSON.stringify(farms));
        }
      }
    } catch {}

    // Send notification
    if (newManagerUser) {
      try {
        await NotificationService.createNotification({
          userId: newManagerUser.uid,
          senderId: 'admin',
          senderName: adminName,
          type: 'farm_assign',
          targetId: farmId,
          targetType: 'farm',
          message: `👨‍⚕️ Veterinary Assignment: You have been appointed as the Veterinary Manager for farm #${farmId} by the Administration.${reason ? ` Note: "${reason}"` : ''}`
        });
      } catch {}
    }

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
