import { useEffect, useRef } from 'react';

export type SyncEntity = 
  | 'pet_ads' 
  | 'marketplace' 
  | 'community' 
  | 'jobs' 
  | 'livestock' 
  | 'clinic' 
  | 'explore' 
  | 'news' 
  | 'notifications' 
  | 'broadcasts'
  | 'auth' 
  | 'campaigns'
  | 'chat'
  | 'all';

interface SyncMessage {
  entity: SyncEntity;
  timestamp: number;
  sourceTabId: string;
  payload?: any;
}

// Generate unique ID for this browser tab instance
const CURRENT_TAB_ID = 'tab_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
const BROADCAST_CHANNEL_NAME = 'vetaxis_cross_tab_sync';
const LOCAL_STORAGE_SYNC_KEY = 'vetaxis_storage_sync_event';

// Keep track of when tab became hidden to detect background duration
let tabHiddenTimestamp = 0;
let lastGlobalRevalidateTime = 0;

// Initialize native BroadcastChannel if supported
let broadcastChannel: BroadcastChannel | null = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
  } catch (e) {
    console.warn('[VetAxis Sync] BroadcastChannel initialization failed, using storage fallback:', e);
  }
}

/**
 * Broadcast a data update to all tabs and locally within this tab
 */
export function broadcastDataUpdate(entity: SyncEntity, payload?: any) {
  if (typeof window === 'undefined') return;

  const message: SyncMessage = {
    entity,
    timestamp: Date.now(),
    sourceTabId: CURRENT_TAB_ID,
    payload,
  };

  // 1. Dispatch locally in current window
  try {
    window.dispatchEvent(new CustomEvent('vetaxis_data_update', { detail: message }));
  } catch (e) {
    console.warn('[VetAxis Sync] Local dispatch failed:', e);
  }

  // 2. Dispatch to other tabs via BroadcastChannel
  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage(message);
    } catch (e) {
      console.warn('[VetAxis Sync] BroadcastChannel postMessage failed:', e);
    }
  }

  // 3. Dispatch to other tabs via localStorage event fallback
  try {
    localStorage.setItem(LOCAL_STORAGE_SYNC_KEY, JSON.stringify(message));
  } catch (e) {
    // Ignore quota or private browsing errors
  }
}

/**
 * Global lifecycle listener setup (run once at app startup)
 */
let isLifecycleInitialized = false;

export function initializeTabLifecycleSync() {
  if (typeof window === 'undefined' || isLifecycleInitialized) return;
  isLifecycleInitialized = true;

  // Track visibility state transitions
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      tabHiddenTimestamp = Date.now();
    } else if (document.visibilityState === 'visible') {
      const now = Date.now();
      const hiddenDuration = tabHiddenTimestamp > 0 ? now - tabHiddenTimestamp : 0;
      tabHiddenTimestamp = 0;

      // If hidden for more than 2 seconds, trigger revalidation
      if (hiddenDuration > 2000 || now - lastGlobalRevalidateTime > 10000) {
        lastGlobalRevalidateTime = now;
        console.log(`[VetAxis Sync] Tab reopened/visible after ${Math.round(hiddenDuration / 1000)}s background state. Triggering fresh data sync.`);
        broadcastDataUpdate('all', { reason: 'tab_visible', hiddenDuration });
      }
    }
  });

  // Track window focus (e.g. switching between browser windows or desktop apps)
  window.addEventListener('focus', () => {
    const now = Date.now();
    if (now - lastGlobalRevalidateTime > 8000) {
      lastGlobalRevalidateTime = now;
      console.log('[VetAxis Sync] Window focused. Triggering fresh data sync.');
      broadcastDataUpdate('all', { reason: 'window_focus' });
    }
  });

  // Track pageshow (handles bfcache restoration on Safari/Chrome mobile & desktop)
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
      console.log('[VetAxis Sync] Page restored from bfcache. Revalidating all fresh state.');
      broadcastDataUpdate('all', { reason: 'bfcache_restored' });
    }
  });

  // Track online reconnection
  window.addEventListener('online', () => {
    console.log('[VetAxis Sync] Network reconnected. Synchronizing latest remote datasets.');
    broadcastDataUpdate('all', { reason: 'network_online' });
  });

  // Listen to BroadcastChannel messages from other tabs
  if (broadcastChannel) {
    broadcastChannel.onmessage = (event) => {
      const msg: SyncMessage = event.data;
      if (msg && msg.sourceTabId !== CURRENT_TAB_ID) {
        window.dispatchEvent(new CustomEvent('vetaxis_data_update', { detail: msg }));
      }
    };
  }

  // Listen to cross-tab localStorage events (fallback for browsers or cross-domain tabs)
  window.addEventListener('storage', (event) => {
    if (event.key === LOCAL_STORAGE_SYNC_KEY && event.newValue) {
      try {
        const msg: SyncMessage = JSON.parse(event.newValue);
        if (msg && msg.sourceTabId !== CURRENT_TAB_ID) {
          window.dispatchEvent(new CustomEvent('vetaxis_data_update', { detail: msg }));
        }
      } catch (e) {
        // Ignore parse errors
      }
    }
  });
}

/**
 * Custom React Hook: Automatically re-fetches and updates data when:
 * 1. Tab is reopened or refocused after being in the background
 * 2. Another tab updates this entity
 * 3. Network reconnects
 * 4. Periodic background interval (while tab is active and visible)
 */
export function useTabRevalidation({
  entity,
  onRevalidate,
  enabled = true,
  throttleMs = 3000,
  periodicIntervalMs = 60000, // Auto-refresh quietly every 60s while visible
}: {
  entity: SyncEntity | SyncEntity[];
  onRevalidate: () => void | Promise<void>;
  enabled?: boolean;
  throttleMs?: number;
  periodicIntervalMs?: number;
}) {
  const lastRevalidateRef = useRef<number>(0);
  const callbackRef = useRef(onRevalidate);

  useEffect(() => {
    callbackRef.current = onRevalidate;
  }, [onRevalidate]);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    // Ensure lifecycle handlers are bound
    initializeTabLifecycleSync();

    const entities = Array.isArray(entity) ? entity : [entity];

    const executeRevalidation = (reason: string) => {
      const now = Date.now();
      if (now - lastRevalidateRef.current < throttleMs) {
        return; // Throttled to prevent rapid repeated calls
      }
      lastRevalidateRef.current = now;

      try {
        const res = callbackRef.current();
        if (res && typeof (res as Promise<any>).catch === 'function') {
          (res as Promise<any>).catch((err) => {
            console.warn(`[VetAxis Sync] Error revalidating ${entities.join(',')}:`, err);
          });
        }
      } catch (err) {
        console.warn(`[VetAxis Sync] Error revalidating ${entities.join(',')}:`, err);
      }
    };

    // 1. Listen for custom broadcast events
    const handleDataUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<SyncMessage>;
      const msg = customEvent.detail;
      if (!msg) return;

      const isMatch = 
        msg.entity === 'all' || 
        entities.includes('all') || 
        entities.includes(msg.entity);

      if (isMatch) {
        executeRevalidation(`event_${msg.entity}`);
      }
    };

    window.addEventListener('vetaxis_data_update', handleDataUpdate);

    // 2. Direct visibilitychange handler for instantaneous update on tab switch
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        executeRevalidation('visibility_visible');
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // 3. Direct focus handler for instantaneous update on window focus
    const handleFocus = () => {
      executeRevalidation('window_focus');
    };
    window.addEventListener('focus', handleFocus);

    // 4. Periodic background sync while tab is actively open and visible
    let intervalId: any = null;
    if (periodicIntervalMs > 0) {
      intervalId = setInterval(() => {
        if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
          // Check if quota wasn't exceeded
          const isQuota = sessionStorage.getItem('firebase_quota_exceeded') === 'true' || 
                          localStorage.getItem('firebase_quota_exceeded') === 'true';
          if (!isQuota) {
            executeRevalidation('periodic_poll');
          }
        }
      }, periodicIntervalMs);
    }

    return () => {
      window.removeEventListener('vetaxis_data_update', handleDataUpdate);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      if (intervalId) clearInterval(intervalId);
    };
  }, [enabled, entity, throttleMs, periodicIntervalMs]);
}
