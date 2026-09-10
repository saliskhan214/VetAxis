import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getAnalytics, isSupported } from 'firebase/analytics';
import { 
  initializeFirestore, 
  getFirestore,
  doc, 
  getDoc,
  setDoc,
  collection,
  getDocs,
  limit,
  query,
  persistentLocalCache, 
  persistentMultipleTabManager,
  persistentSingleTabManager,
  memoryLocalCache
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

export const FIRESTORE_DATABASE_ID = (firebaseConfig as any).firestoreDatabaseId || 'ai-studio-vetaxis-5a8cee99-a29c-45f0-b339-2d74ef068510';

export function isNativeApp(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean((window as any).AndroidNative?.isNativeApp?.() || (window as any).AndroidNative);
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

// Check if we previously encountered a quota limit error in this session to prevent loading crash loops
const getQuotaExceeded = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    const expires = localStorage.getItem('firebase_quota_expires_at');
    if (expires) {
      if (Date.now() > parseInt(expires, 10)) {
        clearQuotaExceeded();
        return false;
      }
      return true;
    }
    // Clean up any stale unexpired flag from previous runs so live connection is restored
    if (localStorage.getItem('firebase_quota_exceeded') || sessionStorage.getItem('firebase_quota_exceeded')) {
      clearQuotaExceeded();
    }
  } catch {}
  return false;
};

export function clearQuotaExceeded(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem('firebase_quota_exceeded');
    localStorage.removeItem('firebase_quota_exceeded');
    localStorage.removeItem('firebase_quota_expires_at');
  } catch {}
}

// Automatically clear legacy stale flags on module load to restore user's live database connection
getQuotaExceeded();

// Resolve configuration dynamically prioritizing environment variables
const targetDatabaseId = 
  import.meta.env.VITE_FIREBASE_DATABASE_ID || 
  (firebaseConfig as any).firestoreDatabaseId || 
  FIRESTORE_DATABASE_ID;

const resolvedConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || firebaseConfig.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfig.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || firebaseConfig.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfig.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfig.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || firebaseConfig.appId,
  firestoreDatabaseId: targetDatabaseId,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || firebaseConfig.measurementId,
};

export const isFirebaseConfigured = Boolean(
  resolvedConfig.apiKey &&
  !resolvedConfig.apiKey.includes('mock-api-key') &&
  !resolvedConfig.apiKey.includes('PLACEHOLDER')
);

let app: any;
let db: any = null;
let auth: any = null;
let analytics: any = null;

if (isFirebaseConfigured) {
  try {
    app = getApps().length > 0 ? getApp() : initializeApp(resolvedConfig);
    const firestoreDbId = (resolvedConfig.firestoreDatabaseId && resolvedConfig.firestoreDatabaseId !== '(default)')
      ? resolvedConfig.firestoreDatabaseId
      : undefined;

    // Determine if running inside the dedicated Android Native shell vs web browser
    const isActualNativeApp = typeof window !== 'undefined' && (
      Boolean((window as any).AndroidNative?.isNativeApp?.()) ||
      Boolean((window as any).AndroidNative)
    );

    try {
      // In native Android WebView shell, persistentSingleTabManager guarantees fast, lock-free IndexedDB access.
      // In mobile and desktop web browsers, persistentMultipleTabManager provides seamless real-time multi-tab synchronization.
      const cacheManager = isActualNativeApp
        ? persistentSingleTabManager({ forceOwnership: true })
        : persistentMultipleTabManager();

      db = initializeFirestore(app, {
        localCache: persistentLocalCache({
          tabManager: cacheManager
        }),
        experimentalAutoDetectLongPolling: true,
      }, firestoreDbId);
    } catch (cacheErr) {
      console.warn('[VetAxis] Preferred persistent cache initialization failed. Trying fallback persistent cache:', cacheErr);
      try {
        db = initializeFirestore(app, {
          localCache: persistentLocalCache({
            tabManager: persistentSingleTabManager({ forceOwnership: false })
          }),
          experimentalAutoDetectLongPolling: true,
        }, firestoreDbId);
      } catch (singleErr) {
        console.warn('[VetAxis] Persistent cache unavailable. Falling back to memory cache:', singleErr);
        try {
          db = initializeFirestore(app, {
            localCache: memoryLocalCache(),
            experimentalAutoDetectLongPolling: true,
          }, firestoreDbId);
        } catch (initErr) {
          // If Firestore instance was previously initialized in HMR/module reuse, bind existing instance
          db = firestoreDbId ? getFirestore(app, firestoreDbId) : getFirestore(app);
        }
      }
    }

    auth = getAuth(app);

    if (typeof window !== 'undefined' && resolvedConfig.measurementId) {
      isSupported().then(supported => {
        if (supported && app) {
          analytics = getAnalytics(app);
        }
      }).catch(() => {});
    }
  } catch (err) {
    console.error('[VetAxis] Failed to initialize live Firebase services. Falling back.', err);
  }
}

export { db, auth, analytics };

/**
 * Mandatory Error Handler for "insufficient permissions" or other Firestore blocks.
 * Formats errors into a very specific structured JSON string.
 */
export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const message = error instanceof Error ? error.message : String(error);
  
  if (typeof window !== 'undefined') {
    const isQuota = message.toLowerCase().includes('quota') || 
                    message.toLowerCase().includes('resource-exhausted') || 
                    message.toLowerCase().includes('resource_exhausted') ||
                    message.toLowerCase().includes('exhausted');
    if (isQuota) {
      try {
        sessionStorage.setItem('firebase_quota_exceeded', 'true');
        localStorage.setItem('firebase_quota_exceeded', 'true');
        localStorage.setItem('firebase_quota_expires_at', String(Date.now() + 10 * 60 * 1000));
      } catch (e) {
        console.warn('Storage saving failed:', e);
      }
      window.dispatchEvent(new CustomEvent('firestore-quota-exceeded', { detail: { message } }));
    }
  }
  
  const errInfo: FirestoreErrorInfo = {
    error: message,
    operationType,
    path,
    authInfo: {
      userId: auth?.currentUser?.uid || null,
      email: auth?.currentUser?.email ? '[REDACTED]' : null,
      emailVerified: auth?.currentUser?.emailVerified || null,
      isAnonymous: auth?.currentUser?.isAnonymous || null,
      tenantId: auth?.currentUser?.tenantId || null,
      providerInfo: auth?.currentUser?.providerData?.map((provider) => ({
        providerId: provider.providerId,
        email: provider.email ? '[REDACTED]' : null,
      })) || [],
    },
  };

  console.error('[VetAxis] Firestore Error Captured:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export interface DiagnosticResult {
  configured: boolean;
  databaseId: string;
  isNative: boolean;
  online: boolean;
  readSuccess: boolean;
  writeSuccess: boolean;
  latencyMs: number;
  readError?: string | null;
  writeError?: string | null;
  collectionSync?: {
    broadcastsCount?: number;
    blogsCount?: number;
    accessible?: boolean;
    error?: string;
  };
  syncStatus: 'SYNCED' | 'OFFLINE_CACHE' | 'DEGRADED' | 'ERROR';
}

/**
 * Comprehensive Startup & Runtime Connection Check for Web App and APK App Synchronization
 */
export async function runFirebaseDiagnostics(): Promise<DiagnosticResult> {
  const activeDbId = (db as any)?._databaseId?.database || resolvedConfig.firestoreDatabaseId || '(default)';
  const isNative = isNativeApp();
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  const result: DiagnosticResult = {
    configured: isFirebaseConfigured,
    databaseId: activeDbId,
    isNative,
    online: isOnline,
    readSuccess: false,
    writeSuccess: false,
    latencyMs: 0,
    syncStatus: 'ERROR',
  };

  if (!isFirebaseConfigured || !db) {
    console.warn('[VetAxis Diagnostic] Live Firebase services not configured or Firestore instance missing.');
    return result;
  }

  const startTime = performance.now();
  const testRef = doc(db, 'test-metadata-connection', 'connectivity-diagnostic');

  // Test 1: Write diagnostic ping
  try {
    const payload = {
      timestamp: Date.now(),
      iso: new Date().toISOString(),
      client: isNative ? 'VetAxis-APK-Native' : 'VetAxis-WebApp-Browser',
      databaseId: activeDbId,
      isNative,
    };
    await setDoc(testRef, payload, { merge: true });
    result.writeSuccess = true;
  } catch (wErr: any) {
    result.writeError = wErr?.message || String(wErr);
  }

  // Test 2: Read diagnostic document
  try {
    const snapshot = await getDoc(testRef);
    result.readSuccess = snapshot.exists();
  } catch (rErr: any) {
    result.readError = rErr?.message || String(rErr);
  }

  // Test 3: Collection Sync verification (fetch active broadcasts and blogs)
  try {
    const [bcastSnap, blogSnap] = await Promise.allSettled([
      getDocs(query(collection(db, 'broadcast_notifications'), limit(10))),
      getDocs(query(collection(db, 'blogs'), limit(10)))
    ]);

    const broadcastsCount = bcastSnap.status === 'fulfilled' ? bcastSnap.value.size : 0;
    const blogsCount = blogSnap.status === 'fulfilled' ? blogSnap.value.size : 0;

    result.collectionSync = {
      broadcastsCount,
      blogsCount,
      accessible: bcastSnap.status === 'fulfilled' || blogSnap.status === 'fulfilled',
    };
  } catch (colErr: any) {
    result.collectionSync = {
      accessible: false,
      error: colErr?.message || String(colErr)
    };
  }

  result.latencyMs = Math.round(performance.now() - startTime);

  if (result.readSuccess && result.writeSuccess) {
    result.syncStatus = 'SYNCED';
  } else if (result.readSuccess || !isOnline) {
    result.syncStatus = 'OFFLINE_CACHE';
  } else {
    result.syncStatus = 'DEGRADED';
  }

  console.log(
    `%c[VetAxis Firestore Diagnostic]%c Env: %c${isNative ? '📱 APK App' : '🌐 Web App'}%c | DB: %c${result.databaseId}%c | Read: %c${result.readSuccess ? '✅ OK' : '❌ FAIL'}%c | Write: %c${result.writeSuccess ? '✅ OK' : '❌ FAIL'}%c | Sync: %c${result.syncStatus}%c | Latency: ${result.latencyMs}ms`,
    'background:#2d4a39;color:#fff;padding:2px 6px;border-radius:4px;font-weight:bold;',
    'color:#333;',
    'font-weight:bold;color:#0284c7;',
    'color:#333;',
    'font-weight:bold;color:#a0522d;',
    'color:#333;',
    result.readSuccess ? 'color:#16a34a;font-weight:bold;' : 'color:#dc2626;font-weight:bold;',
    'color:#333;',
    result.writeSuccess ? 'color:#16a34a;font-weight:bold;' : 'color:#dc2626;font-weight:bold;',
    'color:#333;',
    result.syncStatus === 'SYNCED' ? 'color:#16a34a;font-weight:bold;' : 'color:#f59e0b;font-weight:bold;',
    'color:#666;'
  );

  return result;
}

export const testConnection = runFirebaseDiagnostics;
