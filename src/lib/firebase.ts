import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  initializeFirestore, 
  doc, 
  getDoc,
  persistentLocalCache, 
  persistentMultipleTabManager 
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

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

// Check if we previously encountered a quota limit error in this session/day to prevent loading crash loops
const getQuotaExceeded = (): boolean => {
  if (typeof window === 'undefined') return false;
  return sessionStorage.getItem('firebase_quota_exceeded') === 'true' || 
         localStorage.getItem('firebase_quota_exceeded') === 'true';
};

// Resolve configuration dynamically prioritizing environment variables
const resolvedConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || firebaseConfig.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfig.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || firebaseConfig.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfig.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfig.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || firebaseConfig.appId,
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_DATABASE_ID || firebaseConfig.firestoreDatabaseId,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || firebaseConfig.measurementId,
};

export let isFirebaseConfigured =
  resolvedConfig.apiKey &&
  !resolvedConfig.apiKey.includes('mock-api-key') &&
  !resolvedConfig.apiKey.includes('PLACEHOLDER') &&
  !getQuotaExceeded();

let app;
let db: any = null;
let auth: any = null;

if (isFirebaseConfigured) {
  try {
    app = getApps().length > 0 ? getApp() : initializeApp(resolvedConfig);
    db = initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
      }),
      experimentalForceLongPolling: true,
    }, resolvedConfig.firestoreDatabaseId);
    auth = getAuth(app);
  } catch (err) {
    console.error('[VetAxis] Failed to initialize live Firebase services. Falling back.', err);
  }
}

export { db, auth };

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
      isFirebaseConfigured = false;
      try {
        sessionStorage.setItem('firebase_quota_exceeded', 'true');
        localStorage.setItem('firebase_quota_exceeded', 'true');
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

/**
 * Startup Connection Check to ensure correctness of Firebase instance connection 
 */
export async function testConnection() {
  if (!isFirebaseConfigured || !db) return;
  try {
    // Graceful connectivity healthcheck using standard dynamic getDoc which respects offline localCache.
    await getDoc(doc(db, 'test-metadata-connection', 'connectivity-check'));
    console.log('[VetAxis] Live database connection verified.');
  } catch (error) {
    console.warn('[VetAxis] Connection info: Live database is currently in sandbox or offline capability mode:', error);
  }
}
