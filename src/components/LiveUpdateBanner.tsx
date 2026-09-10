import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  RefreshCw, 
  X, 
  Smartphone, 
  Globe, 
  Wifi, 
  WifiOff, 
  CheckCircle2, 
  CloudCheck, 
  ArrowUpRight 
} from 'lucide-react';
import { useLiveCloudSync, useLiveAppUpdates } from '../lib/androidBridge';

interface LiveUpdateBannerProps {
  onOpenDownloadModal?: () => void;
}

export function LiveUpdateBanner({ onOpenDownloadModal }: LiveUpdateBannerProps) {
  const { 
    isOnline, 
    lastSyncedAt, 
    syncState, 
    platform, 
    isAndroidShell, 
    triggerManualSync 
  } = useLiveCloudSync();

  const { 
    hasUpdate, 
    newVersion, 
    changelog, 
    applyUpdate, 
    dismissUpdate 
  } = useLiveAppUpdates();

  const [isSyncPillExpanded, setIsSyncPillExpanded] = useState(false);

  const formatLastSync = (date: Date) => {
    const diffSec = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (diffSec < 15) return 'Just now';
    if (diffSec < 60) return `${diffSec}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <>
      {/* 1. TOP FLOATING HOT-UPDATE BANNER (When web app receives new version) */}
      <AnimatePresence>
        {hasUpdate && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-0 left-0 right-0 z-[400] bg-[#2b2b24] text-white px-4 py-2.5 shadow-xl border-b border-amber-500/30 flex items-center justify-between gap-3 text-xs"
          >
            <div className="flex items-center gap-2.5 max-w-2xl">
              <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-amber-300">New Live Update Available</span>
                  <span className="text-[10px] bg-amber-400/20 text-amber-200 px-1.5 py-0.2 rounded font-mono font-bold">
                    v{newVersion}
                  </span>
                  {isAndroidShell && (
                    <span className="text-[9px] bg-emerald-700/80 text-white font-bold px-1.5 py-0.2 rounded">
                      Android Shell
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-stone-300 line-clamp-1">
                  {changelog || 'A new update was deployed to the web app. Zero APK reinstall required!'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={applyUpdate}
                className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Update Now</span>
              </button>
              <button
                onClick={dismissUpdate}
                className="p-1.5 text-stone-400 hover:text-white rounded-lg hover:bg-white/10 cursor-pointer transition-colors"
                title="Dismiss banner"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
