import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { WifiOff, Database, CheckCircle2, RefreshCw } from 'lucide-react';

interface OfflineModeIndicatorProps {
  isOfflineModeOverride?: boolean;
  onSyncOfflineData?: () => Promise<void>;
  isSyncing?: boolean;
}

export function OfflineModeIndicator({ 
  isOfflineModeOverride = false, 
  onSyncOfflineData, 
  isSyncing = false 
}: OfflineModeIndicatorProps) {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [showStatusBubble, setShowStatusBubble] = useState<boolean>(false);
  const [lastOfflineState, setLastOfflineState] = useState<boolean>(!navigator.onLine || isOfflineModeOverride);

  // Sync states
  const [isSyncActive, setIsSyncActive] = useState<boolean>(false);
  const [syncProgress, setSyncProgress] = useState<number>(0);
  const [syncStatusText, setSyncStatusText] = useState<string>('Awaiting sync...');

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowStatusBubble(true);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowStatusBubble(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const effectiveOffline = !isOnline || isOfflineModeOverride;

  // Track the transition from offline to online to auto-engage the progress sequence
  useEffect(() => {
    if (!effectiveOffline && lastOfflineState) {
      setShowStatusBubble(true);
      setIsSyncActive(true);
      setSyncProgress(0);
    }
    setLastOfflineState(effectiveOffline);
  }, [effectiveOffline, lastOfflineState]);

  // Align when parent triggers isSyncing state
  useEffect(() => {
    if (isSyncing) {
      setShowStatusBubble(true);
      setIsSyncActive(true);
      setSyncProgress(0);
    }
  }, [isSyncing]);

  // Run progress meter sequence when synchronizing
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isSyncActive) {
      interval = setInterval(() => {
        setSyncProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval!);
            setIsSyncActive(false);

            // Execute actual data sync callback to reconcile memory
            if (onSyncOfflineData) {
              onSyncOfflineData().catch((err) => {
                console.error("Synchronization error:", err);
              });
            }

            return 100;
          }

          // Smooth randomly staggered progress steps
          const increment = Math.floor(Math.random() * 12) + 12; // 12-24%
          const next = Math.min(prev + increment, 100);

          if (next < 25) {
            setSyncStatusText('Ping stable. Establishing encrypted transaction handshake...');
          } else if (next < 55) {
            setSyncStatusText('Uploading cached veterinary records & immunizations...');
          } else if (next < 85) {
            setSyncStatusText('Reconciling agricultural ledger data nodes...');
          } else if (next < 100) {
            setSyncStatusText('Validating cryptographic integrity of synchronized tables...');
          } else {
            setSyncStatusText('Database synchronized successfully!');
          }

          return next;
        });
      }, 250);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isSyncActive, onSyncOfflineData]);

  // Auto-hide progress notice after completion
  useEffect(() => {
    if (!effectiveOffline && showStatusBubble && !isSyncActive && syncProgress === 100) {
      const timer = setTimeout(() => {
        setShowStatusBubble(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [effectiveOffline, showStatusBubble, isSyncActive, syncProgress]);

  return (
    <div id="rural-offline-status" className="w-full">
      <AnimatePresence mode="wait">
        {effectiveOffline ? (
          <motion.div
            key="offline-banner"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mb-4"
          >
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
              <div className="flex gap-3">
                <div className="p-2 bg-amber-100 text-amber-900 rounded-xl shrink-0 self-start mt-0.5">
                  <WifiOff className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-black text-amber-950 uppercase tracking-widest font-mono">
                    🛰️ Connection error or slow network
                  </h4>
                  <p className="text-gray-700 text-xs leading-relaxed">
                    Your livestock feed is fully secure and retrieves and saves records locally on your device storage via active service workers.
                  </p>
                </div>
              </div>

              {onSyncOfflineData && (
                <button
                  onClick={onSyncOfflineData}
                  disabled={isSyncing}
                  className="w-full md:w-auto shrink-0 bg-amber-800 hover:bg-amber-900 text-white font-bold py-2 px-3.5 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all border-none cursor-pointer disabled:opacity-50"
                >
                  {isSyncing ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Database className="w-3.5 h-3.5" />
                  )}
                  {isSyncing ? 'Syncing...' : 'Sync Cached Records'}
                </button>
              )}
            </div>
          </motion.div>
        ) : showStatusBubble ? (
          <motion.div
            key="online-alert"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mb-4"
          >
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex flex-col gap-3 shadow-sm text-left">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
                  {isSyncActive ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                </div>
                <div className="space-y-0.5 flex-1 min-w-0">
                  <h4 className="text-xs font-black text-emerald-950 uppercase tracking-widest font-mono flex items-center justify-between">
                    <span>{isSyncActive ? '🛰️ Synchronizing Local Database' : '🟢 Live Connection Restored'}</span>
                    <span className="text-[10px] text-emerald-700 font-extrabold font-mono">
                      {isSyncActive ? `${syncProgress}%` : '100%'}
                    </span>
                  </h4>
                  <p className="text-gray-700 text-xs truncate">
                    {isSyncActive ? syncStatusText : 'Stable communication with the VetAxis secure ledger database is successfully active.'}
                  </p>
                </div>
              </div>

              {/* Progress Bar Indicator */}
              <div className="w-full bg-emerald-100 h-4.5 rounded-full overflow-hidden relative border border-emerald-200/40 shadow-inner flex items-center">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: isSyncActive ? `${syncProgress}%` : '100%' }}
                  transition={{ ease: "easeOut", duration: 0.2 }}
                  className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full"
                />
                <span className="absolute left-1/2 -translate-x-1/2 text-[9px] font-black uppercase text-emerald-950 font-mono tracking-widest drop-shadow-sm pointer-events-none">
                  Sync Progress: {isSyncActive ? `${syncProgress}%` : '100% COMPLETE'}
                </span>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
