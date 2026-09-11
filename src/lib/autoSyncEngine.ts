import { 
  collection, 
  onSnapshot, 
  Unsubscribe 
} from 'firebase/firestore';
import { db, isFirebaseConfigured, auth } from './firebase';
import { 
  PetAdsService, 
  MarketplaceService, 
  CommunityService, 
  JobBoardService,
  BroadcastNotificationService
} from './storage';
import {
  PetAd,
  Product,
  CommunityPost,
  JobPost,
  BroadcastNotification
} from '../types';
import { swrGlobalCache } from './useSWR';
import { broadcastDataUpdate } from './tabSync';

/**
 * VetAxis 360 Continuous Real-Time Cloud Synchronization Engine
 * 
 * Automatically synchronizes changes between APK mobile app and website in real time:
 * 1. Attaches active Firestore snapshot listeners (onSnapshot) to core collections:
 *    - pet_ads
 *    - marketplace_products
 *    - community_posts
 *    - job_posts
 *    - broadcast_notifications
 * 2. Whenever an action is performed on the APK app, Firestore triggers onSnapshot
 *    on the website within ~100ms.
 * 3. Immediately updates memory SWR caches, localStorage offline ledgers, and dispatches
 *    react re-render broadcast events.
 * 4. Maintains an automatic background heartbeat sync (every 15s) and reconnect triggers
 *    so manual opening of the diagnostic center is NEVER required.
 */

class AutoSyncEngine {
  private activeSubscriptions: Map<string, Unsubscribe> = new Map();
  private isStarted = false;
  private heartbeatTimer: any = null;
  private isSyncingNow = false;
  private lastSyncTimestamp: number = 0;

  public start() {
    if (this.isStarted || typeof window === 'undefined') return;
    this.isStarted = true;

    console.log('[AutoSyncEngine] Initializing automatic cloud synchronization...');

    // 1. Initial snapshot attachments
    this.setupListeners();

    // 2. Setup auth state listener so subscriptions refresh if user signs in/out
    if (auth) {
      auth.onAuthStateChanged((user: any) => {
        if (user) {
          this.setupListeners();
          // Trigger immediate fresh synchronization on sign-in
          setTimeout(() => this.performFullSync(false), 500);
        } else {
          this.teardownListeners();
        }
      });
    }

    // 3. Window focus and visibility triggers: immediately sync whenever user views window
    window.addEventListener('focus', () => {
      this.handleQuickRevalidate('window_focus');
    });

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.handleQuickRevalidate('visibility_visible');
      }
    });

    window.addEventListener('online', () => {
      console.log('[AutoSyncEngine] Network reconnected. Re-binding listeners & syncing...');
      this.setupListeners();
      this.performFullSync(true);
    });

    // 4. Background heartbeat auto-sync (every 15 seconds)
    // Ensures background changes are continually verified even without user interaction
    this.heartbeatTimer = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        this.performFullSync(false);
      }
    }, 15000);

    // Initial background sync run
    setTimeout(() => {
      this.performFullSync(false);
    }, 1200);
  }

  private handleQuickRevalidate(reason: string) {
    const now = Date.now();
    if (now - this.lastSyncTimestamp > 5000) {
      console.log(`[AutoSyncEngine] Revalidating on ${reason}...`);
      this.performFullSync(false);
    }
  }

  public setupListeners() {
    if (!isFirebaseConfigured || !db) {
      console.warn('[AutoSyncEngine] Firebase db not ready, skipping real-time listeners.');
      return;
    }

    // A. Real-Time PET ADS Listener
    if (!this.activeSubscriptions.has('pet_ads')) {
      try {
        const adsCol = collection(db, 'pet_ads');
        const unsub = onSnapshot(adsCol, (snapshot) => {
          try {
            const ads = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as PetAd[];
            ads.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

            // Update localStorage
            localStorage.setItem('va_pet_ads', JSON.stringify(ads));

            // Prime SWR cache so queries get 0ms fresh hits
            swrGlobalCache.set('pet_ads', ads);

            // Notify UI components
            broadcastDataUpdate('pet_ads', { source: 'firestore_snapshot', count: ads.length, ads });
            this.recordSyncSuccess();
          } catch (err) {
            console.warn('[AutoSyncEngine] Error parsing pet_ads snapshot:', err);
          }
        }, (err) => {
          console.warn('[AutoSyncEngine] pet_ads snapshot listener notice:', err.message);
        });

        this.activeSubscriptions.set('pet_ads', unsub);
      } catch (e) {
        console.warn('[AutoSyncEngine] Failed to bind pet_ads onSnapshot:', e);
      }
    }

    // B. Real-Time MARKETPLACE PRODUCTS Listener
    if (!this.activeSubscriptions.has('marketplace_products')) {
      try {
        const prodCol = collection(db, 'marketplace_products');
        const unsub = onSnapshot(prodCol, (snapshot) => {
          try {
            const prods = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Product[];
            prods.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

            localStorage.setItem('va_accessories', JSON.stringify(prods));
            swrGlobalCache.set('marketplace_products', prods);

            broadcastDataUpdate('marketplace', { source: 'firestore_snapshot', count: prods.length, products: prods });
            this.recordSyncSuccess();
          } catch (err) {
            console.warn('[AutoSyncEngine] Error parsing marketplace snapshot:', err);
          }
        }, (err) => {
          console.warn('[AutoSyncEngine] marketplace snapshot listener notice:', err.message);
        });

        this.activeSubscriptions.set('marketplace_products', unsub);
      } catch (e) {
        console.warn('[AutoSyncEngine] Failed to bind marketplace onSnapshot:', e);
      }
    }

    // C. Real-Time COMMUNITY POSTS Listener
    if (!this.activeSubscriptions.has('community_posts')) {
      try {
        const postCol = collection(db, 'community_posts');
        const unsub = onSnapshot(postCol, (snapshot) => {
          try {
            const posts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as CommunityPost[];
            posts.sort((a, b) => (b.ts || 0) - (a.ts || 0));

            localStorage.setItem('va_community_posts', JSON.stringify(posts));
            swrGlobalCache.set('community_posts', posts);

            broadcastDataUpdate('community', { source: 'firestore_snapshot', count: posts.length, posts });
            this.recordSyncSuccess();
          } catch (err) {
            console.warn('[AutoSyncEngine] Error parsing community snapshot:', err);
          }
        }, (err) => {
          console.warn('[AutoSyncEngine] community snapshot listener notice:', err.message);
        });

        this.activeSubscriptions.set('community_posts', unsub);
      } catch (e) {
        console.warn('[AutoSyncEngine] Failed to bind community onSnapshot:', e);
      }
    }

    // D. Real-Time JOB POSTS Listener
    if (!this.activeSubscriptions.has('job_posts')) {
      try {
        const jobCol = collection(db, 'job_posts');
        const unsub = onSnapshot(jobCol, (snapshot) => {
          try {
            const jobs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as JobPost[];
            jobs.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

            localStorage.setItem('va_job_posts', JSON.stringify(jobs));
            swrGlobalCache.set('job_posts', jobs);

            broadcastDataUpdate('jobs', { source: 'firestore_snapshot', count: jobs.length, jobs });
            this.recordSyncSuccess();
          } catch (err) {
            console.warn('[AutoSyncEngine] Error parsing jobs snapshot:', err);
          }
        }, (err) => {
          console.warn('[AutoSyncEngine] jobs snapshot listener notice:', err.message);
        });

        this.activeSubscriptions.set('job_posts', unsub);
      } catch (e) {
        console.warn('[AutoSyncEngine] Failed to bind job_posts onSnapshot:', e);
      }
    }

    // E. Real-Time BROADCAST NOTIFICATIONS Listener
    if (!this.activeSubscriptions.has('broadcast_notifications')) {
      try {
        const bcastCol = collection(db, 'broadcast_notifications');
        const unsub = onSnapshot(bcastCol, (snapshot) => {
          try {
            const bcasts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as BroadcastNotification[];
            bcasts.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

            localStorage.setItem('va_broadcasts', JSON.stringify(bcasts));
            broadcastDataUpdate('broadcasts', { source: 'firestore_snapshot', count: bcasts.length, broadcasts: bcasts });
            this.recordSyncSuccess();
          } catch (err) {
            console.warn('[AutoSyncEngine] Error parsing broadcasts snapshot:', err);
          }
        }, (err) => {
          console.warn('[AutoSyncEngine] broadcasts snapshot listener notice:', err.message);
        });

        this.activeSubscriptions.set('broadcast_notifications', unsub);
      } catch (e) {
        console.warn('[AutoSyncEngine] Failed to bind broadcasts onSnapshot:', e);
      }
    }
  }

  public teardownListeners() {
    this.activeSubscriptions.forEach((unsub) => {
      try {
        unsub();
      } catch {}
    });
    this.activeSubscriptions.clear();
  }

  public async performFullSync(forceRefresh: boolean = false): Promise<void> {
    if (this.isSyncingNow || typeof window === 'undefined') return;
    if (!navigator.onLine) return;

    this.isSyncingNow = true;

    try {
      if (forceRefresh) {
        swrGlobalCache.clear();
      }

      // Fetch latest states concurrently
      const [adsRes, prodsRes, postsRes, jobsRes, bcastsRes] = await Promise.allSettled([
        PetAdsService.fetchAds(),
        MarketplaceService.fetchProducts(),
        CommunityService.fetchPosts(),
        JobBoardService.fetchJobs(),
        BroadcastNotificationService.fetchBroadcasts(),
      ]);

      if (adsRes.status === 'fulfilled' && adsRes.value) {
        swrGlobalCache.set('pet_ads', adsRes.value);
      }
      if (prodsRes.status === 'fulfilled' && prodsRes.value) {
        swrGlobalCache.set('marketplace_products', prodsRes.value);
      }
      if (postsRes.status === 'fulfilled' && postsRes.value) {
        swrGlobalCache.set('community_posts', postsRes.value);
      }
      if (jobsRes.status === 'fulfilled' && jobsRes.value) {
        swrGlobalCache.set('job_posts', jobsRes.value);
      }

      this.recordSyncSuccess();

      // Trigger cross-component sync event so visible components refresh their lists
      broadcastDataUpdate('all', { source: 'automatic_cloud_sync', forceRefresh });
    } catch (err) {
      console.warn('[AutoSyncEngine] Periodic sync roundtrip error:', err);
    } finally {
      this.isSyncingNow = false;
    }
  }

  private recordSyncSuccess() {
    this.lastSyncTimestamp = Date.now();
    try {
      const isoStr = new Date().toISOString();
      localStorage.setItem('vetaxis_last_sync_timestamp', isoStr);
      window.dispatchEvent(new CustomEvent('vetaxis-sync-complete', { detail: { timestamp: isoStr } }));
    } catch {}
  }

  public stop() {
    this.teardownListeners();
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    this.isStarted = false;
  }
}

export const autoSyncEngine = new AutoSyncEngine();

export function initAutoSyncEngine() {
  autoSyncEngine.start();
}

export function triggerAutoSync(force: boolean = false) {
  return autoSyncEngine.performFullSync(force);
}
