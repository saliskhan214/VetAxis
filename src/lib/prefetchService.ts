import { collection, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { UserProfile, CommunityPost, Product, PetAd, JobPost } from '../types';
import { 
  ExploreService, 
  CommunityService, 
  MarketplaceService, 
  PetAdsService, 
  JobBoardService, 
  PromotionalAdsService,
  NotificationService
} from './storage';
import { db, isFirebaseConfigured } from './firebase';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

// 5 minutes baseline TTL, with real-time onSnapshot listeners keeping cache permanently live
const CACHE_TTL_MS = 5 * 60 * 1000;

class PredictivePrefetchService {
  private professionalsCache: Record<string, CacheEntry<UserProfile[]>> = {};
  private promoAdsCache: CacheEntry<any[]> | null = null;
  private communityCache: CacheEntry<CommunityPost[]> | null = null;
  private productsCache: CacheEntry<Product[]> | null = null;
  private petAdsCache: CacheEntry<PetAd[]> | null = null;
  private jobsCache: CacheEntry<JobPost[]> | null = null;
  private notificationsCache: CacheEntry<any[]> | null = null;

  // In-flight promise tracker to deduplicate concurrent requests
  private inFlight = new Map<string, Promise<any>>();

  // Event listeners for live synchronized component updates
  private listeners: Map<string, Set<(data: any) => void>> = new Map();

  // Active Firestore onSnapshot listeners
  private unsubs: Map<string, Unsubscribe> = new Map();

  // Cross-tab real-time synchronization channel
  private broadcastChannel: BroadcastChannel | null = null;

  // Live sync active state
  private isLiveSyncActive = false;
  private activeUserUid: string | null = null;

  constructor() {
    this.hydrateFromSession();
    this.initBroadcastChannel();
    this.initLocalMutationListener();
  }

  // ─────────────────────────────────────────────────────────────
  // EVENT BUS & SUBSCRIBER REGISTRY
  // ─────────────────────────────────────────────────────────────

  public emit(key: string, data: any) {
    const subs = this.listeners.get(key);
    if (subs) {
      subs.forEach((cb) => {
        try {
          cb(data);
        } catch (e) {
          console.error(`Error in prefetch listener for ${key}:`, e);
        }
      });
    }
  }

  public subscribe(key: string, callback: (data: any) => void): () => void {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key)!.add(callback);
    return () => {
      this.listeners.get(key)?.delete(callback);
    };
  }

  // ─────────────────────────────────────────────────────────────
  // CROSS-TAB & LOCAL MUTATION SYNCHRONIZATION
  // ─────────────────────────────────────────────────────────────

  private initBroadcastChannel() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.broadcastChannel = new BroadcastChannel('vetaxis_live_sync');
        this.broadcastChannel.onmessage = (event) => {
          if (event.data && event.data.type === 'SYNC_DATA') {
            this.handleIncomingSync(event.data.entity, event.data.data, false);
          }
        };
      } catch (err) {
        console.warn('[Prefetch] BroadcastChannel not supported:', err);
      }
    }
  }

  private broadcastChange(entity: string, data: any) {
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({
          type: 'SYNC_DATA',
          entity,
          data,
          timestamp: Date.now()
        });
      } catch {}
    }
  }

  private initLocalMutationListener() {
    if (typeof window !== 'undefined') {
      window.addEventListener('vetaxis:data_mutation', ((event: CustomEvent) => {
        if (event.detail && event.detail.entity) {
          this.handleIncomingSync(event.detail.entity, event.detail.data, true);
        }
      }) as EventListener);
    }
  }

  private handleIncomingSync(entity: string, data: any, shouldBroadcast = true) {
    switch (entity) {
      case 'doctor':
      case 'clinic':
      case 'assistant':
        this.setProfessionalsCache(entity as any, data, shouldBroadcast);
        break;
      case 'community':
        this.setCommunityCache(data, shouldBroadcast);
        break;
      case 'marketplace':
        this.setProductsCache(data, shouldBroadcast);
        break;
      case 'pet_ads':
        this.setPetAdsCache(data, shouldBroadcast);
        break;
      case 'jobs':
        this.setJobsCache(data, shouldBroadcast);
        break;
      case 'promo_ads':
        this.setPromoAdsCache(data, shouldBroadcast);
        break;
      case 'notifications':
        this.setNotificationsCache(data, shouldBroadcast);
        break;
    }
  }

  // ─────────────────────────────────────────────────────────────
  // SESSION STORAGE CACHE HYDRATION
  // ─────────────────────────────────────────────────────────────

  private hydrateFromSession() {
    try {
      const sessDoctors = sessionStorage.getItem('va_prefetch_doctor');
      if (sessDoctors) {
        const parsed = JSON.parse(sessDoctors);
        if (parsed?.data && Array.isArray(parsed.data)) {
          parsed.data = parsed.data.filter((u: any) => u && !u.uid?.startsWith('seed_') && !u.uid?.startsWith('demo_') && !u.uid?.startsWith('gmap_'));
          this.professionalsCache['doctor'] = parsed;
        }
      }
      const sessClinics = sessionStorage.getItem('va_prefetch_clinic');
      if (sessClinics) {
        const parsed = JSON.parse(sessClinics);
        if (parsed?.data && Array.isArray(parsed.data)) {
          parsed.data = parsed.data.filter((u: any) => u && !u.uid?.startsWith('seed_') && !u.uid?.startsWith('demo_') && !u.uid?.startsWith('gmap_'));
          this.professionalsCache['clinic'] = parsed;
        }
      }
      const sessAds = sessionStorage.getItem('va_prefetch_ads');
      if (sessAds) {
        this.promoAdsCache = JSON.parse(sessAds);
      }
    } catch {
      // Ignore sessionStorage issues
    }
  }

  private saveToSession(key: string, value: any) {
    try {
      sessionStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Ignore quota exceeded errors
    }
  }

  // ─────────────────────────────────────────────────────────────
  // LIVE REAL-TIME DATA SYNCHRONIZATION ENGINE
  // ─────────────────────────────────────────────────────────────

  /**
   * Starts live synchronized listeners across the app.
   * Runs whenever user is logged in or active in the web app.
   */
  public startLiveSync(currentUser?: UserProfile | null): void {
    const currentUid = currentUser?.uid || null;

    // If user changed, tear down old user-specific listeners
    if (this.isLiveSyncActive && this.activeUserUid !== currentUid) {
      this.stopLiveSync();
    }

    if (this.isLiveSyncActive) {
      return;
    }

    this.isLiveSyncActive = true;
    this.activeUserUid = currentUid;

    // Immediately prefetch all sections concurrently so user never waits
    this.prefetchAll(currentUser);

    // If Firebase Firestore is active, attach live onSnapshot synchronization listeners
    if (isFirebaseConfigured && db) {
      try {
        // 1. Live Practitioners Sync (Registered Doctors & Clinics)
        const unsubsUsers = onSnapshot(
          collection(db, 'users'),
          (snap) => {
            const doctors: UserProfile[] = [];
            const clinics: UserProfile[] = [];
            snap.docs.forEach((doc) => {
              const u = { ...doc.data(), uid: doc.id } as UserProfile;
              if (u.uid.startsWith('seed_') || u.uid.startsWith('demo_') || u.uid.startsWith('gmap_')) return;
              if (u.role === 'doctor') doctors.push(u);
              if (u.role === 'clinic') clinics.push(u);
            });
            this.setProfessionalsCache('doctor', doctors);
            this.setProfessionalsCache('clinic', clinics);
          },
          (err) => console.warn('[Prefetch] Live users onSnapshot notice:', err)
        );
        this.unsubs.set('users', unsubsUsers);

        // 2. Live Community Posts Sync
        const unsubsCommunity = onSnapshot(
          collection(db, 'community_posts'),
          (snap) => {
            const posts: CommunityPost[] = snap.docs.map(d => ({ id: d.id, ...d.data() } as CommunityPost));
            posts.sort((a, b) => (b.ts || 0) - (a.ts || 0));
            this.setCommunityCache(posts);
          },
          (err) => console.warn('[Prefetch] Live community onSnapshot notice:', err)
        );
        this.unsubs.set('community', unsubsCommunity);

        // 3. Live Marketplace Products Sync
        const unsubsMarketplace = onSnapshot(
          collection(db, 'marketplace_products'),
          (snap) => {
            const products: Product[] = snap.docs.map(d => ({ id: d.id, ...d.data() } as Product));
            products.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
            this.setProductsCache(products);
          },
          (err) => console.warn('[Prefetch] Live marketplace onSnapshot notice:', err)
        );
        this.unsubs.set('marketplace', unsubsMarketplace);

        // 4. Live Pet Ads Sync
        const unsubsPetAds = onSnapshot(
          collection(db, 'pet_ads'),
          (snap) => {
            const ads: PetAd[] = snap.docs.map(d => ({ id: d.id, ...d.data() } as PetAd));
            ads.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
            this.setPetAdsCache(ads);
          },
          (err) => console.warn('[Prefetch] Live pet ads onSnapshot notice:', err)
        );
        this.unsubs.set('pet_ads', unsubsPetAds);

        // 5. Live Job Vacancies Sync
        const unsubsJobs = onSnapshot(
          collection(db, 'job_posts'),
          (snap) => {
            const jobs: JobPost[] = snap.docs.map(d => ({ id: d.id, ...d.data() } as JobPost));
            jobs.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
            this.setJobsCache(jobs);
          },
          (err) => console.warn('[Prefetch] Live jobs onSnapshot notice:', err)
        );
        this.unsubs.set('jobs', unsubsJobs);

        // 6. Live Promotional Ads Sync
        const unsubsPromo = onSnapshot(
          collection(db, 'promotional_ads'),
          (snap) => {
            const ads = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            this.setPromoAdsCache(ads);
          },
          (err) => console.warn('[Prefetch] Live promotional ads onSnapshot notice:', err)
        );
        this.unsubs.set('promo_ads', unsubsPromo);

        // 7. Live User Notifications Sync (if logged in)
        if (currentUid) {
          const unsubsNotifs = onSnapshot(
            collection(db, 'users', currentUid, 'notifications'),
            (snap) => {
              const notifs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
              this.setNotificationsCache(notifs);
            },
            (err) => console.warn('[Prefetch] Live notifications onSnapshot notice:', err)
          );
          this.unsubs.set('notifications', unsubsNotifs);
        }
      } catch (err) {
        console.warn('[Prefetch] Error establishing live Firestore synchronization:', err);
      }
    }
  }

  /**
   * Stop active synchronization listeners.
   */
  public stopLiveSync(): void {
    this.unsubs.forEach((unsub) => {
      try {
        unsub();
      } catch {}
    });
    this.unsubs.clear();
    this.isLiveSyncActive = false;
    this.activeUserUid = null;
  }

  /**
   * Eagerly pre-fetches all major application data sections concurrently.
   * Guarantees instantaneous loading when user navigates to any tab.
   */
  public async prefetchAll(currentUser?: UserProfile | null): Promise<void> {
    const tasks: Promise<any>[] = [
      this.prefetchHome({ force: true }),
      this.prefetchCommunity(true),
      this.prefetchMarketplace(true),
      this.prefetchPetAds(true),
      this.prefetchJobs(true),
      this.prefetchPromoAds(true)
    ];

    if (currentUser?.uid) {
      tasks.push(this.prefetchNotifications(currentUser.uid, true));
    }

    await Promise.allSettled(tasks);
  }

  // ─────────────────────────────────────────────────────────────
  // 1. DOCTORS & CLINICS PRE-FETCHING
  // ─────────────────────────────────────────────────────────────

  public async prefetchProfessionals(role: 'doctor' | 'clinic' | 'assistant' = 'doctor', force = false): Promise<UserProfile[]> {
    const key = `prof_${role}`;
    const cached = this.professionalsCache[role];
    const isStale = !cached || Date.now() - cached.timestamp > CACHE_TTL_MS;

    if (!force && !isStale) {
      return cached.data;
    }

    if (this.inFlight.has(key)) {
      return this.inFlight.get(key);
    }

    const promise = (async () => {
      try {
        const data = await ExploreService.fetchProfessionals(role);
        this.setProfessionalsCache(role, data);
        return data;
      } catch (err) {
        console.warn(`[Prefetch] Error fetching ${role}s:`, err);
        return cached?.data || [];
      } finally {
        this.inFlight.delete(key);
      }
    })();

    this.inFlight.set(key, promise);
    return promise;
  }

  public getCachedProfessionals(role: 'doctor' | 'clinic' | 'assistant'): UserProfile[] | null {
    const cached = this.professionalsCache[role];
    return cached ? cached.data : null;
  }

  public setProfessionalsCache(role: 'doctor' | 'clinic' | 'assistant', list: UserProfile[], shouldBroadcast = true) {
    const cleanList = (list || []).filter(u => u && u.uid && !u.uid.startsWith('seed_') && !u.uid.startsWith('demo_') && !u.uid.startsWith('gmap_'));
    this.professionalsCache[role] = { data: cleanList, timestamp: Date.now() };
    this.saveToSession(`va_prefetch_${role}`, { data: cleanList, timestamp: Date.now() });
    this.emit(`professionals_${role}`, cleanList);
    if (shouldBroadcast) {
      this.broadcastChange(role, cleanList);
    }
  }

  public invalidateProfessionalsCache(role?: 'doctor' | 'clinic' | 'assistant' | 'all') {
    if (!role || role === 'all') {
      delete this.professionalsCache.doctor;
      delete this.professionalsCache.clinic;
      delete this.professionalsCache.assistant;
      try {
        sessionStorage.removeItem('va_prefetch_doctor');
        sessionStorage.removeItem('va_prefetch_clinic');
        sessionStorage.removeItem('va_prefetch_assistant');
      } catch {}
    } else {
      delete this.professionalsCache[role];
      try {
        sessionStorage.removeItem(`va_prefetch_${role}`);
      } catch {}
    }
  }

  public async refreshProfessionals(role?: 'doctor' | 'clinic' | 'assistant' | 'all'): Promise<void> {
    this.invalidateProfessionalsCache(role);
    if (!role || role === 'all') {
      await Promise.allSettled([
        this.prefetchProfessionals('doctor', true),
        this.prefetchProfessionals('clinic', true),
        this.prefetchProfessionals('assistant', true)
      ]);
    } else {
      await this.prefetchProfessionals(role, true);
    }
  }

  public async prefetchHome(options?: { force?: boolean }): Promise<void> {
    const force = options?.force || false;
    await Promise.allSettled([
      this.prefetchProfessionals('doctor', force),
      this.prefetchProfessionals('clinic', force),
      this.prefetchProfessionals('assistant', force),
      this.prefetchPromoAds(force)
    ]);
  }

  // ─────────────────────────────────────────────────────────────
  // 2. PROMOTIONAL BILLBOARD ADS
  // ─────────────────────────────────────────────────────────────

  public async prefetchPromoAds(force = false): Promise<any[]> {
    const key = 'promo_ads';
    const isStale = !this.promoAdsCache || Date.now() - this.promoAdsCache.timestamp > CACHE_TTL_MS;

    if (!force && !isStale) {
      return this.promoAdsCache.data;
    }

    if (this.inFlight.has(key)) {
      return this.inFlight.get(key);
    }

    const promise = (async () => {
      try {
        const ads = await PromotionalAdsService.fetchActiveAds(false);
        this.setPromoAdsCache(ads);
        return ads;
      } catch (err) {
        console.warn('[Prefetch] Error prefetching promotional ads:', err);
        return this.promoAdsCache?.data || [];
      } finally {
        this.inFlight.delete(key);
      }
    })();

    this.inFlight.set(key, promise);
    return promise;
  }

  public getCachedAds(): any[] | null {
    return this.promoAdsCache ? this.promoAdsCache.data : null;
  }

  public setPromoAdsCache(ads: any[], shouldBroadcast = true) {
    this.promoAdsCache = { data: ads, timestamp: Date.now() };
    this.saveToSession('va_prefetch_ads', { data: ads, timestamp: Date.now() });
    this.emit('promo_ads', ads);
    if (shouldBroadcast) {
      this.broadcastChange('promo_ads', ads);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 3. COMMUNITY POSTS PRE-FETCHING
  // ─────────────────────────────────────────────────────────────

  public async prefetchCommunity(force = false): Promise<CommunityPost[]> {
    const key = 'community';
    const isStale = !this.communityCache || Date.now() - this.communityCache.timestamp > CACHE_TTL_MS;

    if (!force && !isStale) {
      return this.communityCache.data;
    }

    if (this.inFlight.has(key)) {
      return this.inFlight.get(key);
    }

    const promise = (async () => {
      try {
        const data = await CommunityService.fetchPosts();
        this.setCommunityCache(data);
        return data;
      } catch (err) {
        console.warn('[Prefetch] Error prefetching community posts:', err);
        return this.communityCache?.data || [];
      } finally {
        this.inFlight.delete(key);
      }
    })();

    this.inFlight.set(key, promise);
    return promise;
  }

  public getCachedCommunityPosts(): CommunityPost[] | null {
    return this.communityCache ? this.communityCache.data : null;
  }

  public setCommunityCache(posts: CommunityPost[], shouldBroadcast = true) {
    this.communityCache = { data: posts, timestamp: Date.now() };
    this.emit('community', posts);
    if (shouldBroadcast) {
      this.broadcastChange('community', posts);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 4. MARKETPLACE PRODUCTS PRE-FETCHING
  // ─────────────────────────────────────────────────────────────

  public async prefetchMarketplace(force = false): Promise<Product[]> {
    const key = 'marketplace';
    const isStale = !this.productsCache || Date.now() - this.productsCache.timestamp > CACHE_TTL_MS;

    if (!force && !isStale) {
      return this.productsCache.data;
    }

    if (this.inFlight.has(key)) {
      return this.inFlight.get(key);
    }

    const promise = (async () => {
      try {
        const data = await MarketplaceService.fetchProducts();
        this.setProductsCache(data);
        return data;
      } catch (err) {
        console.warn('[Prefetch] Error prefetching marketplace products:', err);
        return this.productsCache?.data || [];
      } finally {
        this.inFlight.delete(key);
      }
    })();

    this.inFlight.set(key, promise);
    return promise;
  }

  public getCachedProducts(): Product[] | null {
    return this.productsCache ? this.productsCache.data : null;
  }

  public setProductsCache(products: Product[], shouldBroadcast = true) {
    this.productsCache = { data: products, timestamp: Date.now() };
    this.emit('marketplace', products);
    if (shouldBroadcast) {
      this.broadcastChange('marketplace', products);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 5. PET ADS PRE-FETCHING
  // ─────────────────────────────────────────────────────────────

  public async prefetchPetAds(force = false): Promise<PetAd[]> {
    const key = 'pet_ads';
    const isStale = !this.petAdsCache || Date.now() - this.petAdsCache.timestamp > CACHE_TTL_MS;

    if (!force && !isStale) {
      return this.petAdsCache.data;
    }

    if (this.inFlight.has(key)) {
      return this.inFlight.get(key);
    }

    const promise = (async () => {
      try {
        const data = await PetAdsService.fetchAds();
        this.setPetAdsCache(data);
        return data;
      } catch (err) {
        console.warn('[Prefetch] Error prefetching pet ads:', err);
        return this.petAdsCache?.data || [];
      } finally {
        this.inFlight.delete(key);
      }
    })();

    this.inFlight.set(key, promise);
    return promise;
  }

  public getCachedPetAds(): PetAd[] | null {
    return this.petAdsCache ? this.petAdsCache.data : null;
  }

  public setPetAdsCache(ads: PetAd[], shouldBroadcast = true) {
    this.petAdsCache = { data: ads, timestamp: Date.now() };
    this.emit('pet_ads', ads);
    if (shouldBroadcast) {
      this.broadcastChange('pet_ads', ads);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 6. JOB BOARD PRE-FETCHING
  // ─────────────────────────────────────────────────────────────

  public async prefetchJobs(force = false): Promise<JobPost[]> {
    const key = 'jobs';
    const isStale = !this.jobsCache || Date.now() - this.jobsCache.timestamp > CACHE_TTL_MS;

    if (!force && !isStale) {
      return this.jobsCache.data;
    }

    if (this.inFlight.has(key)) {
      return this.inFlight.get(key);
    }

    const promise = (async () => {
      try {
        const data = await JobBoardService.fetchJobs();
        this.setJobsCache(data);
        return data;
      } catch (err) {
        console.warn('[Prefetch] Error prefetching jobs:', err);
        return this.jobsCache?.data || [];
      } finally {
        this.inFlight.delete(key);
      }
    })();

    this.inFlight.set(key, promise);
    return promise;
  }

  public getCachedJobs(): JobPost[] | null {
    return this.jobsCache ? this.jobsCache.data : null;
  }

  public setJobsCache(jobs: JobPost[], shouldBroadcast = true) {
    this.jobsCache = { data: jobs, timestamp: Date.now() };
    this.emit('jobs', jobs);
    if (shouldBroadcast) {
      this.broadcastChange('jobs', jobs);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 7. USER NOTIFICATIONS PRE-FETCHING
  // ─────────────────────────────────────────────────────────────

  public async prefetchNotifications(userId: string, force = false): Promise<any[]> {
    const key = `notifs_${userId}`;
    const cached = this.notificationsCache;
    const isStale = !cached || Date.now() - cached.timestamp > CACHE_TTL_MS;

    if (!force && !isStale) {
      return cached.data;
    }

    if (this.inFlight.has(key)) {
      return this.inFlight.get(key);
    }

    const promise = (async () => {
      try {
        const notifs = await NotificationService.fetchNotifications(userId);
        this.setNotificationsCache(notifs);
        return notifs;
      } catch (err) {
        console.warn('[Prefetch] Error prefetching notifications:', err);
        return cached?.data || [];
      } finally {
        this.inFlight.delete(key);
      }
    })();

    this.inFlight.set(key, promise);
    return promise;
  }

  public getCachedNotifications(): any[] | null {
    return this.notificationsCache ? this.notificationsCache.data : null;
  }

  public setNotificationsCache(notifs: any[], shouldBroadcast = true) {
    this.notificationsCache = { data: notifs, timestamp: Date.now() };
    this.emit('notifications', notifs);
    if (shouldBroadcast) {
      this.broadcastChange('notifications', notifs);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 8. PREDICTIVE NAVIGATION INTENT PRE-FETCHING
  // ─────────────────────────────────────────────────────────────

  /**
   * Called when user hovers or focuses on menu items or links.
   * Anticipates where the user is navigating and fires off pre-fetch in background.
   */
  public prefetchOnIntent(section: string, userUid?: string): void {
    const s = (section || '').toLowerCase();
    if (s === 'explore' || s === 'home' || s === 'doctors' || s === 'clinics') {
      this.prefetchHome();
    } else if (s === 'community') {
      this.prefetchCommunity();
    } else if (s === 'marketplace' || s === 'products') {
      this.prefetchMarketplace();
    } else if (s === 'pet_ads' || s === 'pets') {
      this.prefetchPetAds();
    } else if (s === 'jobs' || s === 'job_board') {
      this.prefetchJobs();
    } else if (s === 'radar' || s === 'near_me') {
      this.prefetchProfessionals('clinic');
    }
  }

  /**
   * Staggered background warm-up during idle CPU cycles.
   * Guarantees zero-latency navigation when coming from menu to any page.
   */
  public warmupIdle(userUid?: string): void {
    const schedule = (task: () => void, delayMs: number) => {
      if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        window.setTimeout(() => {
          (window as any).requestIdleCallback(() => task(), { timeout: 2000 });
        }, delayMs);
      } else {
        setTimeout(task, delayMs);
      }
    };

    // 1. Immediately warm up Doctors and Clinics (Home Page)
    schedule(() => this.prefetchHome(), 100);

    // 2. Warm up Pet Ads and Community
    schedule(() => {
      this.prefetchPetAds();
      this.prefetchCommunity();
    }, 600);

    // 3. Warm up Marketplace and Job Board
    schedule(() => {
      this.prefetchMarketplace();
      this.prefetchJobs();
    }, 1200);

    if (userUid) {
      schedule(() => this.prefetchNotifications(userUid), 1500);
    }
  }
}

export const PrefetchService = new PredictivePrefetchService();
