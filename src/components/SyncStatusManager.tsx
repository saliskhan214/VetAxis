import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Database, Clock, RefreshCw, CheckCircle2 } from 'lucide-react';

interface SyncStatusManagerProps {
  onSyncManual?: () => Promise<void>;
  isSyncing?: boolean;
}

export function SyncStatusManager({ onSyncManual, isSyncing = false }: SyncStatusManagerProps) {
  const [lastSyncStr, setLastSyncStr] = useState<string | null>(null);
  const [timeAgo, setTimeAgo] = useState<string>('Never synced');

  // Load the timestamp from local storage
  const loadTimestamp = () => {
    const ts = localStorage.getItem('vetaxis_last_sync_timestamp');
    if (ts) {
      setLastSyncStr(ts);
      calculateTimeAgo(ts);
    } else {
      setLastSyncStr(null);
      setTimeAgo('Never synced');
    }
  };

  const calculateTimeAgo = (isoString: string) => {
    try {
      const past = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - past.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffSecs = Math.floor(diffMs / 1000);

      if (diffSecs < 10) {
        setTimeAgo('Just now');
      } else if (diffSecs < 60) {
        setTimeAgo(`${diffSecs} seconds ago`);
      } else if (diffMins === 1) {
        setTimeAgo('1 minute ago');
      } else if (diffMins < 60) {
        setTimeAgo(`${diffMins} minutes ago`);
      } else {
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours === 1) {
          setTimeAgo('1 hour ago');
        } else if (diffHours < 24) {
          setTimeAgo(`${diffHours} hours ago`);
        } else {
          setTimeAgo(past.toLocaleDateString(undefined, { 
            month: 'short', 
            day: 'numeric', 
            hour: '2-digit', 
            minute: '2-digit' 
          }));
        }
      }
    } catch (e) {
      setTimeAgo('Unknown');
    }
  };

  useEffect(() => {
    loadTimestamp();

    // Listen to changes in localStorage or custom sync events
    const handleSyncFinished = () => {
      loadTimestamp();
    };

    window.addEventListener('storage', loadTimestamp);
    window.addEventListener('vetaxis-sync-complete', handleSyncFinished);

    const interval = setInterval(() => {
      const ts = localStorage.getItem('vetaxis_last_sync_timestamp');
      if (ts) calculateTimeAgo(ts);
    }, 15000); // update every 15 seconds

    return () => {
      window.removeEventListener('storage', loadTimestamp);
      window.removeEventListener('vetaxis-sync-complete', handleSyncFinished);
      clearInterval(interval);
    };
  }, []);

  // Update immediately when isSyncing turns false
  useEffect(() => {
    if (!isSyncing) {
      loadTimestamp();
    }
  }, [isSyncing]);

  const formattedDate = lastSyncStr 
    ? new Date(lastSyncStr).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short'
      })
    : 'No sync history';

  return (
    <div id="sync-status-manager" className="bg-[#faf9f5] border border-[#e3dec9] rounded-2xl p-4 shadow-3xs">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex gap-3 items-center">
          <div className="p-2.5 bg-emerald-50 text-emerald-800 rounded-xl flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] uppercase font-black tracking-widest text-[#5a5a40] font-mono">
                🗳️ Firestore Ledger Sync Status
              </span>
              <span className="px-2 py-0.5 text-[9px] font-black bg-emerald-100 text-emerald-900 rounded-full font-sans uppercase">
                Offline-Ready
              </span>
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-700">
              <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <span>Last Synchronized:</span>
              <strong className="text-gray-950 font-sans font-semibold">
                {timeAgo}
              </strong>
              <span className="text-gray-400 text-[10px] hidden md:inline">({formattedDate})</span>
            </div>
          </div>
        </div>

        {onSyncManual && (
          <button
            onClick={onSyncManual}
            disabled={isSyncing}
            className="w-full sm:w-auto shrink-0 cursor-pointer bg-white hover:bg-[#faf9f0] text-gray-700 hover:text-gray-900 border border-[#cdc6ad] hover:border-[#a39c83] active:bg-[#edece5] select-none text-xs font-bold py-2 px-3.5 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-3xs disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-gray-500 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Synchronizing...' : 'Sync Firestore'}
          </button>
        )}
      </div>
    </div>
  );
}
