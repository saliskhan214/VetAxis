import { prefetchSWR } from './useSWR';
import { 
  CommunityService, 
  MarketplaceService, 
  PetAdsService, 
  JobBoardService, 
  ExploreService, 
  PromotionalAdsService,
  AuthService 
} from './storage';
import { BlogService } from './blogService';
import { LivestockService } from './livestockService';
import { UserProfile } from '../types';

// Registry of dynamic chunk loaders for critical sections
export const routeChunkLoaders: Record<string, () => Promise<any>> = {
  explore: () => import('../components/ExploreFeed'),
  community: () => import('../components/CommunityFeed'),
  admin: () => import('../components/AdminPanel'),
  marketplace: () => import('../components/Marketplace'),
  pet_ads: () => import('../components/PetAds'),
  profile: () => import('../components/ProfilePage'),
  jobs: () => import('../components/JobBoard'),
  livestock: () => import('../components/LivestockManagement'),
  subscription: () => import('../components/SubscriptionPortal'),
  clinic_management: () => import('../components/ClinicManagement'),
  news: () => import('../components/BlogSection'),
  clinical_tools: () => import('../components/VeterinaryClinicalSuite'),
  clinical_suite: () => import('../components/VeterinaryClinicalSuite'),
  about: () => import('../components/LegalAndAbout'),
  terms: () => import('../components/LegalAndAbout'),
  privacy: () => import('../components/LegalAndAbout'),
  contact: () => import('../components/LegalAndAbout'),
  careers_safety: () => import('../components/LegalAndAbout'),
  messenger: () => import('../components/MessengerModal'),
  chat: () => import('../components/ChatModal'),
  about_directory: () => import('../components/AboutUsDirectory'),
};

// Track recently prefetched routes to prevent redundant background work within 15 seconds
const prefetchedRoutes = new Set<string>();
const prefetchedDataTimestamps = new Map<string, number>();

/**
 * Predictively prefetch the JavaScript chunk for a section on mouse hover or touch.
 */
export function prefetchRoute(section: string): void {
  const normalized = section.toLowerCase().trim();
  if (prefetchedRoutes.has(normalized)) return;

  const loader = routeChunkLoaders[normalized];
  if (loader) {
    prefetchedRoutes.add(normalized);
    loader().catch(err => {
      console.warn(`[Prefetch] Failed to preload route chunk "${normalized}":`, err);
      prefetchedRoutes.delete(normalized);
    });
  }
}

/**
 * Predictively prefetch primary data queries for a section into the SWR cache.
 */
export async function prefetchSectionData(
  section: string, 
  currentUser?: UserProfile | null
): Promise<void> {
  const normalized = section.toLowerCase().trim();
  const now = Date.now();
  const lastPrefetch = prefetchedDataTimestamps.get(normalized) || 0;
  
  // Throttle data prefetching per section to once every 20 seconds
  if (now - lastPrefetch < 20000) return;
  prefetchedDataTimestamps.set(normalized, now);

  try {
    switch (normalized) {
      case 'explore': {
        await Promise.allSettled([
          prefetchSWR('professionals_clinic', () => ExploreService.fetchProfessionals('clinic')),
          prefetchSWR('professionals_doctor', () => ExploreService.fetchProfessionals('doctor')),
          prefetchSWR('promotional_ads', () => PromotionalAdsService.fetchActiveAds(true)),
        ]);
        break;
      }
      case 'community': {
        await prefetchSWR('community_posts', () => CommunityService.fetchPosts());
        break;
      }
      case 'marketplace': {
        await prefetchSWR('marketplace_products', () => MarketplaceService.fetchProducts());
        break;
      }
      case 'pet_ads': {
        await prefetchSWR('pet_ads', () => PetAdsService.fetchAds());
        break;
      }
      case 'jobs': {
        await prefetchSWR('job_posts', () => JobBoardService.fetchJobs());
        break;
      }
      case 'news': {
        await prefetchSWR('blog_articles', () => BlogService.fetchArticles());
        break;
      }
      case 'livestock': {
        if (currentUser?.uid) {
          await Promise.allSettled([
            prefetchSWR(`livestock_farms_${currentUser.uid}`, () => LivestockService.fetchFarms(currentUser.uid)),
            prefetchSWR(`livestock_animals_${currentUser.uid}`, () => LivestockService.fetchAnimals(currentUser.uid)),
          ]);
        }
        break;
      }
      case 'admin': {
        if (currentUser && (currentUser.email?.toLowerCase() === 'vetaxis360@gmail.com' || currentUser.email === 'saliskhan214@gmail.com' || currentUser.isAdmin === true)) {
          await Promise.allSettled([
            prefetchSWR('admin_users', () => AuthService.getAllUsers()),
            prefetchSWR('job_posts', () => JobBoardService.fetchJobs()),
            prefetchSWR('pet_ads', () => PetAdsService.fetchAds()),
            prefetchSWR('marketplace_products', () => MarketplaceService.fetchProducts()),
          ]);
        }
        break;
      }
      case 'messenger': {
        routeChunkLoaders.messenger?.();
        break;
      }
      default:
        break;
    }
  } catch (err) {
    console.warn(`[Prefetch] Error prefetching data for "${normalized}":`, err);
  }
}

/**
 * Combined high-speed prefetch for both route JavaScript module and SWR data.
 */
export function prefetchSection(section: string, currentUser?: UserProfile | null): void {
  prefetchRoute(section);
  // Execute data prefetching non-blockingly
  prefetchSectionData(section, currentUser).catch(() => {});
}

/**
 * Returns accessible event props (mouse hover, touch start, keyboard focus)
 * to attach to any navigation link or button for instant predictive prefetching.
 */
export function getPrefetchProps(section: string, currentUser?: UserProfile | null) {
  let timer: any = null;
  return {
    onMouseEnter: () => {
      // Immediate chunk prefetch + debounced data prefetch (60ms) to avoid noise on fast mouse sweep
      prefetchRoute(section);
      timer = setTimeout(() => {
        prefetchSectionData(section, currentUser).catch(() => {});
      }, 60);
    },
    onMouseLeave: () => {
      if (timer) clearTimeout(timer);
    },
    onFocus: () => {
      prefetchSection(section, currentUser);
    },
    onTouchStart: () => {
      prefetchSection(section, currentUser);
    },
  };
}

/**
 * Idle prefetcher: Preloads the top frequently visited sections during browser idle time.
 */
export function initIdlePrefetch(currentUser?: UserProfile | null): () => void {
  if (typeof window === 'undefined') return () => {};

  let cancelled = false;
  const idleCallback = (window as any).requestIdleCallback || ((cb: Function) => setTimeout(cb, 2500));
  const cancelIdle = (window as any).cancelIdleCallback || ((id: any) => clearTimeout(id));

  const handle = idleCallback(async () => {
    if (cancelled) return;
    // Preload Community and Marketplace during idle
    prefetchRoute('community');
    prefetchRoute('marketplace');
    prefetchRoute('pet_ads');
    
    // Warm up community posts and pet ads
    try {
      await Promise.allSettled([
        prefetchSWR('community_posts', () => CommunityService.fetchPosts()),
        prefetchSWR('pet_ads', () => PetAdsService.fetchAds()),
      ]);
    } catch {
      // Non-critical background warmup
    }
  });

  return () => {
    cancelled = true;
    cancelIdle(handle);
  };
}
