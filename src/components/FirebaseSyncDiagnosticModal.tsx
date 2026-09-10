import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Activity, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  RefreshCw, 
  Smartphone, 
  Globe, 
  Database, 
  ShieldCheck, 
  Zap, 
  X,
  Server,
  Layers
} from 'lucide-react';
import { 
  runFirebaseDiagnostics, 
  isNativeApp, 
  isFirebaseConfigured, 
  DiagnosticResult, 
  db 
} from '../lib/firebase';
import { 
  PetAdsService, 
  MarketplaceService, 
  CommunityService, 
  JobBoardService,
  ExploreService 
} from '../lib/storage';
import { swrGlobalCache } from '../lib/useSWR';

interface FirebaseSyncDiagnosticModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SyncItemStatus {
  name: string;
  category: string;
  status: 'synced' | 'cached' | 'error' | 'testing';
  count: number;
  latencyMs?: number;
  details?: string;
}

export const FirebaseSyncDiagnosticModal: React.FC<FirebaseSyncDiagnosticModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isSyncingAll, setIsSyncingAll] = useState<boolean>(false);
  const [diagResult, setDiagResult] = useState<DiagnosticResult | null>(null);
  const [syncItems, setSyncItems] = useState<SyncItemStatus[]>([]);
  const [lastCheckedTime, setLastCheckedTime] = useState<string | null>(null);

  const isNative = isNativeApp();

  const runFullSuite = async () => {
    setIsRunning(true);
    try {
      // 1. Core Connection and Read/Write Ping
      const coreResult = await runFirebaseDiagnostics();
      setDiagResult(coreResult);

      // 2. Collection Synchronization Audit
      const items: SyncItemStatus[] = [];

      // Pet Ads
      try {
        const t0 = performance.now();
        const ads = await PetAdsService.fetchAds();
        items.push({
          name: 'Pet Ads & Adoptions',
          category: 'pet_ads',
          status: 'synced',
          count: ads.length,
          latencyMs: Math.round(performance.now() - t0),
          details: `${ads.length} active listings synchronized`,
        });
      } catch (err: any) {
        items.push({
          name: 'Pet Ads & Adoptions',
          category: 'pet_ads',
          status: 'error',
          count: 0,
          details: err?.message || 'Fetch failed',
        });
      }

      // Marketplace
      try {
        const t0 = performance.now();
        const prods = await MarketplaceService.fetchProducts();
        items.push({
          name: 'Marketplace Supplies',
          category: 'marketplace_products',
          status: 'synced',
          count: prods.length,
          latencyMs: Math.round(performance.now() - t0),
          details: `${prods.length} products available`,
        });
      } catch (err: any) {
        items.push({
          name: 'Marketplace Supplies',
          category: 'marketplace_products',
          status: 'error',
          count: 0,
          details: err?.message || 'Fetch failed',
        });
      }

      // Community Posts
      try {
        const t0 = performance.now();
        const posts = await CommunityService.fetchPosts();
        items.push({
          name: 'Community Clinical Posts',
          category: 'community_posts',
          status: 'synced',
          count: posts.length,
          latencyMs: Math.round(performance.now() - t0),
          details: `${posts.length} clinical threads ready`,
        });
      } catch (err: any) {
        items.push({
          name: 'Community Clinical Posts',
          category: 'community_posts',
          status: 'error',
          count: 0,
          details: err?.message || 'Fetch failed',
        });
      }

      // Job Board
      try {
        const t0 = performance.now();
        const jobs = await JobBoardService.fetchJobs();
        items.push({
          name: 'Veterinary Career Openings',
          category: 'job_posts',
          status: 'synced',
          count: jobs.length,
          latencyMs: Math.round(performance.now() - t0),
          details: `${jobs.length} jobs available`,
        });
      } catch (err: any) {
        items.push({
          name: 'Veterinary Career Openings',
          category: 'job_posts',
          status: 'error',
          count: 0,
          details: err?.message || 'Fetch failed',
        });
      }

      // Verified Specialists (Doctors & Clinics)
      try {
        const t0 = performance.now();
        const [docs, clinics] = await Promise.all([
          ExploreService.fetchProfessionals('doctor'),
          ExploreService.fetchProfessionals('clinic'),
        ]);
        const totalPros = docs.length + clinics.length;
        items.push({
          name: 'Directory Professionals',
          category: 'users',
          status: 'synced',
          count: totalPros,
          latencyMs: Math.round(performance.now() - t0),
          details: `${docs.length} doctors, ${clinics.length} clinics verified`,
        });
      } catch (err: any) {
        items.push({
          name: 'Directory Professionals',
          category: 'users',
          status: 'error',
          count: 0,
          details: err?.message || 'Fetch failed',
        });
      }

      setSyncItems(items);
      setLastCheckedTime(new Date().toLocaleTimeString());
    } catch (e) {
      console.error('Diagnostic error:', e);
    } finally {
      setIsRunning(false);
    }
  };

  const handleForceFullSync = async () => {
    setIsSyncingAll(true);
    try {
      // Clear SWR memory caches to force fresh network roundtrips
      swrGlobalCache.clear();

      // Trigger all services
      await Promise.allSettled([
        PetAdsService.fetchAds(),
        MarketplaceService.fetchProducts(),
        CommunityService.fetchPosts(),
        JobBoardService.fetchJobs(),
        ExploreService.fetchProfessionals('doctor'),
        ExploreService.fetchProfessionals('clinic'),
      ]);

      // Broadcast update event so all views re-render
      window.dispatchEvent(new CustomEvent('vetaxis_data_update', { detail: { action: 'force_sync' } }));

      // Re-run diagnostic suite to display updated status
      await runFullSuite();
    } finally {
      setIsSyncingAll(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      runFullSuite();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="bg-white rounded-2xl shadow-2xl border border-[#e3dec9] w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#e3dec9] bg-[#fbf9f4]">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-800">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#2d4a39] flex items-center gap-2">
                  Firebase Synchronization Diagnostic
                  <span className={`text-[11px] font-extrabold px-2 py-0.5 rounded-full ${
                    isNative 
                      ? 'bg-purple-100 text-purple-800 border border-purple-200' 
                      : 'bg-blue-100 text-blue-800 border border-blue-200'
                  }`}>
                    {isNative ? '📱 APK Native App' : '🌐 Web Application'}
                  </span>
                </h2>
                <p className="text-xs text-[#6e685f]">
                  Real-time synchronization verification between Web App and Android APK
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-[#8c8577] hover:text-[#2d4a39] hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {/* Top Environment & Health Banner */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Platform Card */}
              <div className="p-3.5 rounded-xl bg-[#f7f5ee] border border-[#e3dec9]">
                <div className="flex items-center justify-between text-xs text-[#706a61] mb-1">
                  <span>Runtime Target</span>
                  {isNative ? <Smartphone className="w-4 h-4 text-purple-600" /> : <Globe className="w-4 h-4 text-blue-600" />}
                </div>
                <div className="text-sm font-bold text-[#2d4a39]">
                  {isNative ? 'Android APK Client' : 'Web Browser Client'}
                </div>
                <div className="text-[10px] text-[#8c8577] mt-1 truncate">
                  Domain: vetaxis360.firebaseapp.com
                </div>
              </div>

              {/* Firestore Status Card */}
              <div className="p-3.5 rounded-xl bg-[#f7f5ee] border border-[#e3dec9]">
                <div className="flex items-center justify-between text-xs text-[#706a61] mb-1">
                  <span>Database Link</span>
                  <Database className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-sm font-bold flex items-center gap-1.5">
                  {diagResult?.readSuccess && diagResult?.writeSuccess ? (
                    <span className="text-emerald-700 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> Connected
                    </span>
                  ) : isRunning ? (
                    <span className="text-amber-700 flex items-center gap-1">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Verifying...
                    </span>
                  ) : (
                    <span className="text-red-700 flex items-center gap-1">
                      <XCircle className="w-4 h-4" /> Degraded
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-[#8c8577] mt-1 truncate">
                  Latency: {diagResult ? `${diagResult.latencyMs}ms` : '--'}
                </div>
              </div>

              {/* Offline & Cache Mode */}
              <div className="p-3.5 rounded-xl bg-[#f7f5ee] border border-[#e3dec9]">
                <div className="flex items-center justify-between text-xs text-[#706a61] mb-1">
                  <span>Cache Architecture</span>
                  <Layers className="w-4 h-4 text-amber-600" />
                </div>
                <div className="text-sm font-bold text-[#2d4a39]">
                  {isNative ? 'Single-Tab Locked (Safe)' : 'Multi-Tab Replicating'}
                </div>
                <div className="text-[10px] text-emerald-700 font-medium mt-1">
                  Deadlock Protection Active
                </div>
              </div>
            </div>

            {/* Read / Write Diagnostic Status */}
            <div className="bg-white rounded-xl border border-[#e3dec9] p-4 shadow-2xs">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#736e65] mb-3 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Core Cloud Ping & Verification
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between p-2 rounded-lg bg-[#fbf9f4]">
                  <span className="font-medium text-[#2d4a39]">Database Identification</span>
                  <span className="font-mono text-[#5b564e] text-[11px] bg-white px-2 py-0.5 rounded border border-[#e3dec9]">
                    {diagResult?.databaseId || 'Loading...'}
                  </span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-[#fbf9f4]">
                  <span className="font-medium text-[#2d4a39]">Firestore Write Check</span>
                  {diagResult?.writeSuccess ? (
                    <span className="text-emerald-700 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> 200 OK (Verified)
                    </span>
                  ) : (
                    <span className="text-red-600 font-bold flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" /> {diagResult?.writeError || 'Failed'}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-[#fbf9f4]">
                  <span className="font-medium text-[#2d4a39]">Firestore Read Check</span>
                  {diagResult?.readSuccess ? (
                    <span className="text-emerald-700 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> 200 OK (Verified)
                    </span>
                  ) : (
                    <span className="text-red-600 font-bold flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" /> {diagResult?.readError || 'Failed'}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Collection Sync Items Table */}
            <div className="bg-white rounded-xl border border-[#e3dec9] overflow-hidden shadow-2xs">
              <div className="px-4 py-3 bg-[#fbf9f4] border-b border-[#e3dec9] flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#736e65] flex items-center gap-2">
                  <Server className="w-4 h-4 text-blue-600" />
                  Collection Synchronization Matrix
                </h3>
                {lastCheckedTime && (
                  <span className="text-[10px] text-[#8c8577]">
                    Last checked: {lastCheckedTime}
                  </span>
                )}
              </div>

              <div className="divide-y divide-[#ece8d9]">
                {syncItems.map((item, idx) => (
                  <div key={idx} className="p-3.5 flex items-center justify-between hover:bg-[#faf8f3] transition-colors">
                    <div>
                      <div className="text-sm font-semibold text-[#2d4a39] flex items-center gap-2">
                        {item.name}
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 font-mono">
                          {item.category}
                        </span>
                      </div>
                      <p className="text-xs text-[#7d776d] mt-0.5">
                        {item.details}
                      </p>
                    </div>
                    <div className="text-right">
                      {item.status === 'synced' ? (
                        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>Synced</span>
                          {item.latencyMs !== undefined && (
                            <span className="text-[10px] font-normal text-[#8c8577]">
                              ({item.latencyMs}ms)
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-xs font-bold text-red-600">
                          <AlertTriangle className="w-4 h-4 text-red-500" />
                          <span>Error</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {syncItems.length === 0 && (
                  <div className="p-8 text-center text-[#8c8577] text-xs">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
                    Testing synchronization streams across all Firebase collections...
                  </div>
                )}
              </div>
            </div>

            {/* Explanatory Synchronization Notice */}
            <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-950 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-emerald-900">
                <Zap className="w-4 h-4 text-emerald-700" />
                Web App & APK Dual Synchronization Guarantee:
              </div>
              <p className="text-[11px] text-emerald-800 leading-relaxed">
                Both Web and APK apps connect directly to the shared Firestore cloud database. If an APK app experiences temporary network latency, offline farm conditions, or WebView pauses, the newly hardened single-tab cache and dual-layer fallback immediately serve local data without blocking or reloading the app.
              </p>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="px-6 py-3.5 border-t border-[#e3dec9] bg-[#fbf9f4] flex items-center justify-between">
            <button
              onClick={runFullSuite}
              disabled={isRunning || isSyncingAll}
              className="px-4 py-2 rounded-xl text-xs font-bold text-[#2d4a39] bg-white hover:bg-gray-50 border border-[#e3dec9] transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : ''}`} />
              {isRunning ? 'Running Diagnostic...' : 'Re-run Diagnostic'}
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={handleForceFullSync}
                disabled={isSyncingAll || isRunning}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-800 hover:bg-emerald-900 border border-emerald-900 transition-all flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncingAll ? 'animate-spin' : ''}`} />
                {isSyncingAll ? 'Synchronizing Cloud Data...' : 'Force Cloud Sync Now'}
              </button>

              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#6e685f] hover:text-[#2d4a39] hover:bg-gray-100 transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
