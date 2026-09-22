import { UserProfile, CommunityPost, Product, PetAd, JobPost } from '../types';
import { ExploreService, CommunityService, MarketplaceService, PetAdsService, JobBoardService, PromotionalAdsService } from './storage';
import { LivestockService } from './livestockService';
import { LivestockFarm } from '../types';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

// 5 minutes TTL for fresh cache, but stale-while-revalidate will return immediately and re-verify
const CACHE_TTL_MS = 5 * 60 * 1000;

class PredictivePrefetchService {
  private professionalsCache: Record<string, CacheEntry<UserProfile[]>> = {};
  private promoAdsCache: CacheEntry<any[]> | null = null;
  private communityCache: CacheEntry<CommunityPost[]> | null = null;
  private productsCache: CacheEntry<Product[]> | null = null;
  private petAdsCache: CacheEntry<PetAd[]> | null = null;
  private jobsCache: CacheEntry<JobPost[]> | null = null;
  private farmsCache: Record<string, CacheEntry<LivestockFarm[]>> = {};

  // In-flight promise tracker to deduplicate concurrent requests
  private inFlight = new Map<string, Promise<any>>();

  // Event listeners for live updates
  private listeners: Map<string, Set<(data: any) => void>> = new Map();

  constructor() {
    this.hydrateFromSession();
  }

  private emit(key: string, data: any) {
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

  // Session storage hydration for immediate cold-start snappy response
  private hydrateFromSession() {
    try {
      const sessDoctors = sessionStorage.getItem('va_prefetch_doctor');
      if (sessDoctors) {
        this.professionalsCache['doctor'] = JSON.parse(sessDoctors);
      }
      const sessClinics = sessionStorage.getItem('va_prefetch_clinic');
      if (sessClinics) {
        this.professionalsCache['clinic'] = JSON.parse(sessClinics);
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
  // 1. DOCTORS & CLINICS PRE-FETCHING (Home / Explore Feed)
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
        this.professionalsCache[role] = { data, timestamp: Date.now() };
        this.saveToSession(`va_prefetch_${role}`, { data, timestamp: Date.now() });
        this.emit(`professionals_${role}`, data);
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

  public async prefetchHome(options?: { force?: boolean }): Promise<void> {
    const force = options?.force || false;
    // Concurrently prefetch both doctors and clinics, plus assistants and promo ads
    await Promise.allSettled([
      this.prefetchProfessionals('doctor', force),
      this.prefetchProfessionals('clinic', force),
      this.prefetchProfessionals('assistant', force),
      this.prefetchPromoAds(force)
    ]);
  }

  // Promotional Billboard Ads
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
        this.promoAdsCache = { data: ads, timestamp: Date.now() };
        this.saveToSession('va_prefetch_ads', { data: ads, timestamp: Date.now() });
        this.emit('promo_ads', ads);
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

  // ─────────────────────────────────────────────────────────────
  // 2. COMMUNITY POSTS PRE-FETCHING
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
        this.communityCache = { data, timestamp: Date.now() };
        this.emit('community', data);
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

  public setCommunityCache(posts: CommunityPost[]) {
    this.communityCache = { data: posts, timestamp: Date.now() };
    this.emit('community', posts);
  }

  // ─────────────────────────────────────────────────────────────
  // 3. MARKETPLACE PRODUCTS PRE-FETCHING
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
        this.productsCache = { data, timestamp: Date.now() };
        this.emit('marketplace', data);
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

  public setProductsCache(products: Product[]) {
    this.productsCache = { data: products, timestamp: Date.now() };
    this.emit('marketplace', products);
  }

  // ─────────────────────────────────────────────────────────────
  // 4. PET ADS PRE-FETCHING
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
        this.petAdsCache = { data, timestamp: Date.now() };
        this.emit('pet_ads', data);
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

  public setPetAdsCache(ads: PetAd[]) {
    this.petAdsCache = { data: ads, timestamp: Date.now() };
    this.emit('pet_ads', ads);
  }

  // ─────────────────────────────────────────────────────────────
  // 5. JOB BOARD PRE-FETCHING
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
        this.jobsCache = { data, timestamp: Date.now() };
        this.emit('jobs', data);
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

  public setJobsCache(jobs: JobPost[]) {
    this.jobsCache = { data: jobs, timestamp: Date.now() };
    this.emit('jobs', jobs);
  }

  // ─────────────────────────────────────────────────────────────
  // 6. LIVESTOCK / FARM MANAGEMENT PRE-FETCHING
  // ─────────────────────────────────────────────────────────────

  public async prefetchLivestock(userUid?: string, force = false): Promise<LivestockFarm[]> {
    const farmKey = userUid || 'all';
    const key = `livestock_${farmKey}`;
    const cached = this.farmsCache[farmKey];
    const isStale = !cached || Date.now() - cached.timestamp > CACHE_TTL_MS;

    if (!force && !isStale) {
      return cached.data;
    }

    if (this.inFlight.has(key)) {
      return this.inFlight.get(key);
    }

    const promise = (async () => {
      try {
        const data = await LivestockService.fetchFarms(userUid);
        this.farmsCache[farmKey] = { data, timestamp: Date.now() };
        this.emit(`farms_${farmKey}`, data);
        return data;
      } catch (err) {
        console.warn('[Prefetch] Error prefetching farms:', err);
        return cached?.data || [];
      } finally {
        this.inFlight.delete(key);
      }
    })();

    this.inFlight.set(key, promise);
    return promise;
  }

  public getCachedFarms(userUid?: string): LivestockFarm[] | null {
    const farmKey = userUid || 'all';
    const cached = this.farmsCache[farmKey];
    return cached ? cached.data : null;
  }

  public setFarmsCache(farms: LivestockFarm[], userUid?: string) {
    const farmKey = userUid || 'all';
    this.farmsCache[farmKey] = { data: farms, timestamp: Date.now() };
    this.emit(`farms_${farmKey}`, farms);
  }

  // ─────────────────────────────────────────────────────────────
  // 7. PREDICTIVE NAVIGATION INTENT PRE-FETCHING
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
    } else if (s === 'livestock' || s === 'farm') {
      this.prefetchLivestock(userUid);
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
    schedule(() => this.prefetchHome(), 300);

    // 2. Warm up Pet Ads and Community
    schedule(() => {
      this.prefetchPetAds();
      this.prefetchCommunity();
    }, 1500);

    // 3. Warm up Marketplace and Job Board
    schedule(() => {
      this.prefetchMarketplace();
      this.prefetchJobs();
    }, 3000);

    // 4. Warm up Livestock
    if (userUid) {
      schedule(() => {
        this.prefetchLivestock(userUid);
      }, 4500);
    }
  }
}

export const PrefetchService = new PredictivePrefetchService();
