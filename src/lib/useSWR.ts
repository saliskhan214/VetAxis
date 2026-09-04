import { useState, useEffect, useCallback, useRef } from 'react';

// ─────────────────────────────────────────────────────────────────
// Lightweight SWR Data-Fetching Hook Pattern
// Implements Stale-While-Revalidate with automatic revalidation on:
// - Window / Tab focus
// - Tab visibility changes (returning from background tab)
// - Network reconnection (online)
// - BFCache restoration (pageshow)
// - Cross-tab broadcast events (vetaxis_data_update)
// ─────────────────────────────────────────────────────────────────

export interface SWROptions<T> {
  revalidateOnFocus?: boolean;
  revalidateOnReconnect?: boolean;
  focusThrottleInterval?: number;
  dedupingInterval?: number;
  refreshInterval?: number;
  fallbackData?: T;
  onSuccess?: (data: T) => void;
  onError?: (err: any) => void;
}

export interface SWRResponse<T> {
  data: T | undefined;
  error: any;
  isLoading: boolean;
  isValidating: boolean;
  mutate: (
    data?: T | Promise<T> | ((current?: T) => T),
    shouldRevalidate?: boolean
  ) => Promise<T | undefined>;
}

// In-memory cache and in-flight request deduplication
const swrCache = new Map<string, { data: any; timestamp: number }>();
const swrInFlight = new Map<string, Promise<any>>();
const swrSubscribers = new Map<string, Set<(data: any, error: any, isValidating: boolean) => void>>();

/**
 * Global cache accessor for inspecting or priming SWR cache
 */
export const swrGlobalCache = {
  get: <T = any>(key: string): T | undefined => swrCache.get(key)?.data,
  set: <T = any>(key: string, data: T) => swrCache.set(key, { data, timestamp: Date.now() }),
  delete: (key: string) => swrCache.delete(key),
  clear: () => swrCache.clear(),
};

/**
 * Lightweight SWR-style data-fetching hook with focus & tab revalidation
 */
export function useSWR<T = any>(
  key: string | null | undefined,
  fetcher: () => Promise<T>,
  options: SWROptions<T> = {}
): SWRResponse<T> {
  const {
    revalidateOnFocus = true,
    revalidateOnReconnect = true,
    focusThrottleInterval = 3000,
    dedupingInterval = 2000,
    refreshInterval = 0,
    fallbackData,
    onSuccess,
    onError,
  } = options;

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;

  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  const initialCached = key ? swrCache.get(key)?.data : undefined;
  const [data, setData] = useState<T | undefined>(() => initialCached ?? fallbackData);
  const [error, setError] = useState<any>(null);
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(() => !initialCached && fallbackData === undefined && !!key);

  const lastFocusTimeRef = useRef<number>(0);
  const isMountedRef = useRef<boolean>(true);

  // Sync state if key changes
  useEffect(() => {
    if (key) {
      const cached = swrCache.get(key)?.data;
      if (cached !== undefined) {
        setData(cached);
        setIsLoading(false);
      } else if (fallbackData !== undefined) {
        setData(fallbackData);
        setIsLoading(false);
      } else {
        setIsLoading(true);
      }
    } else {
      setIsLoading(false);
    }
  }, [key, fallbackData]);

  // Main Revalidation Logic
  const revalidate = useCallback(
    async (isFocusEvent: boolean = false): Promise<T | undefined> => {
      if (!key) return undefined;

      const now = Date.now();
      if (isFocusEvent && now - lastFocusTimeRef.current < focusThrottleInterval) {
        return swrCache.get(key)?.data;
      }
      if (isFocusEvent) {
        lastFocusTimeRef.current = now;
      }

      // If deduping is active and request is in flight, reuse existing promise
      if (swrInFlight.has(key)) {
        return swrInFlight.get(key);
      }

      // Check if recently fetched within dedupingInterval
      const cachedEntry = swrCache.get(key);
      if (!isFocusEvent && cachedEntry && now - cachedEntry.timestamp < dedupingInterval) {
        return cachedEntry.data;
      }

      if (isMountedRef.current) {
        setIsValidating(true);
      }

      const fetchPromise = (async () => {
        try {
          const freshData = await fetcherRef.current();
          swrCache.set(key, { data: freshData, timestamp: Date.now() });

          if (isMountedRef.current) {
            setData(freshData);
            setError(null);
            setIsLoading(false);
          }

          onSuccessRef.current?.(freshData);

          // Notify other subscribers watching the same key
          const subs = swrSubscribers.get(key);
          if (subs) {
            subs.forEach(cb => cb(freshData, null, false));
          }

          return freshData;
        } catch (err) {
          if (isMountedRef.current) {
            setError(err);
            setIsLoading(false);
          }
          onErrorRef.current?.(err);

          const subs = swrSubscribers.get(key);
          if (subs) {
            subs.forEach(cb => cb(undefined, err, false));
          }
          return undefined;
        } finally {
          swrInFlight.delete(key);
          if (isMountedRef.current) {
            setIsValidating(false);
          }
        }
      })();

      swrInFlight.set(key, fetchPromise);
      return fetchPromise;
    },
    [key, focusThrottleInterval, dedupingInterval]
  );

  // Mutate function (Optimistic updates & invalidation)
  const mutate = useCallback(
    async (
      newData?: T | Promise<T> | ((current?: T) => T),
      shouldRevalidate: boolean = true
    ): Promise<T | undefined> => {
      if (!key) return undefined;

      if (newData !== undefined) {
        let resolvedData: T;
        if (typeof newData === 'function') {
          resolvedData = (newData as (current?: T) => T)(data);
        } else if (newData instanceof Promise) {
          resolvedData = await newData;
        } else {
          resolvedData = newData;
        }

        swrCache.set(key, { data: resolvedData, timestamp: Date.now() });
        if (isMountedRef.current) {
          setData(resolvedData);
        }

        // Broadcast to other components watching same key
        const subs = swrSubscribers.get(key);
        if (subs) {
          subs.forEach(cb => cb(resolvedData, null, false));
        }
      }

      if (shouldRevalidate) {
        return revalidate(false);
      }

      return swrCache.get(key)?.data;
    },
    [key, data, revalidate]
  );

  // Component mount & subscription setup
  useEffect(() => {
    isMountedRef.current = true;
    if (!key) return;

    // Register subscriber
    let subs = swrSubscribers.get(key);
    if (!subs) {
      subs = new Set();
      swrSubscribers.set(key, subs);
    }
    const subscriber = (freshData: any, freshError: any, validating: boolean) => {
      if (!isMountedRef.current) return;
      if (freshData !== undefined) setData(freshData);
      if (freshError !== undefined) setError(freshError);
      setIsValidating(validating);
    };
    subs.add(subscriber);

    // Initial fetch
    revalidate(false);

    return () => {
      isMountedRef.current = false;
      const currentSubs = swrSubscribers.get(key);
      if (currentSubs) {
        currentSubs.delete(subscriber);
        if (currentSubs.size === 0) {
          swrSubscribers.delete(key);
        }
      }
    };
  }, [key, revalidate]);

  // Window Focus & Tab Visibility Auto-Revalidation (when returning from another browser tab)
  useEffect(() => {
    if (!key || !revalidateOnFocus || typeof window === 'undefined') return;

    const handleFocus = () => {
      revalidate(true);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        revalidate(true);
      }
    };

    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        revalidate(true);
      }
    };

    // Also listen to cross-tab updates via BroadcastChannel custom event
    const handleTabSync = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        revalidate(false);
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pageshow', handlePageShow);
    window.addEventListener('vetaxis_data_update', handleTabSync);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pageshow', handlePageShow);
      window.removeEventListener('vetaxis_data_update', handleTabSync);
    };
  }, [key, revalidateOnFocus, revalidate]);

  // Network Reconnection Auto-Revalidation
  useEffect(() => {
    if (!key || !revalidateOnReconnect || typeof window === 'undefined') return;

    const handleOnline = () => {
      revalidate(true);
    };

    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [key, revalidateOnReconnect, revalidate]);

  // Periodic Refresh Interval
  useEffect(() => {
    if (!key || refreshInterval <= 0) return;

    const intervalId = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        revalidate(false);
      }
    }, refreshInterval);

    return () => clearInterval(intervalId);
  }, [key, refreshInterval, revalidate]);

  return {
    data,
    error,
    isLoading,
    isValidating,
    mutate,
  };
}
