import { motion } from 'motion/react';
import { 
  Calculator, 
  MapPin, 
  MessageCircle, 
  Smartphone, 
  RefreshCw, 
  WifiOff, 
  CheckCircle2 
} from 'lucide-react';
import { 
  useLiveCloudSync, 
  useOfflineSyncQueue, 
  triggerMobileHaptic, 
  detectPlatform 
} from '../lib/androidBridge';

interface AndroidMobileQuickBarProps {
  activeSection: string;
  onNavigate: (section: string) => void;
  onOpenMessenger?: () => void;
  onOpenAndroidDownload?: () => void;
  unreadMessagesCount?: number;
}

export function AndroidMobileQuickBar({
  activeSection,
  onNavigate,
  onOpenMessenger,
  onOpenAndroidDownload,
  unreadMessagesCount = 0
}: AndroidMobileQuickBarProps) {
  const { isOnline, syncState, isAndroidShell } = useLiveCloudSync();
  const { queueCount, flushQueue, isSyncingQueue } = useOfflineSyncQueue();
  const platformInfo = detectPlatform();

  // Only render on mobile devices, small screens, or when running inside the Android Shell
  const handleNavClick = (section: string) => {
    triggerMobileHaptic('light');
    onNavigate(section);
  };

  const handleMessengerClick = () => {
    triggerMobileHaptic('light');
    if (onOpenMessenger) onOpenMessenger();
  };

  const handleDownloadClick = () => {
    triggerMobileHaptic('light');
    if (onOpenAndroidDownload) onOpenAndroidDownload();
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[120] block md:hidden bg-white/95 backdrop-blur-md border-t border-[#e3dec9] shadow-[0_-4px_16px_rgba(0,0,0,0.06)] px-2 pt-1.5 pb-[max(env(safe-area-inset-bottom,0px),0.5rem)] select-none">
      <div className="flex items-center justify-around max-w-lg mx-auto">
        
        {/* 1. Clinical Calculators */}
        <button
          onClick={() => handleNavClick('calculator')}
          className={`flex flex-col items-center gap-0.5 px-2.5 py-1 rounded-xl transition-all cursor-pointer ${
            activeSection === 'calculator' 
              ? 'text-[#5a5a40] font-black' 
              : 'text-[#78716c] hover:text-[#2b2b24]'
          }`}
        >
          <div className={`p-1.5 rounded-lg ${activeSection === 'calculator' ? 'bg-[#5a5a40]/10 text-[#5a5a40]' : ''}`}>
            <Calculator className="w-5 h-5" />
          </div>
          <span className="text-[10px] tracking-tight">Rx Dosing</span>
        </button>

        {/* 2. Emergency Clinic Locator */}
        <button
          onClick={() => handleNavClick('explore')}
          className={`flex flex-col items-center gap-0.5 px-2.5 py-1 rounded-xl transition-all cursor-pointer ${
            activeSection === 'explore' 
              ? 'text-[#5a5a40] font-black' 
              : 'text-[#78716c] hover:text-[#2b2b24]'
          }`}
        >
          <div className={`p-1.5 rounded-lg ${activeSection === 'explore' ? 'bg-[#5a5a40]/10 text-[#5a5a40]' : ''}`}>
            <MapPin className="w-5 h-5" />
          </div>
          <span className="text-[10px] tracking-tight">Clinics GPS</span>
        </button>

        {/* 3. Live Sync / Field Status Button (Center Highlight) */}
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={() => {
            triggerMobileHaptic('medium');
            if (queueCount > 0 && isOnline) {
              flushQueue();
            } else if (onOpenAndroidDownload) {
              onOpenAndroidDownload();
            }
          }}
          className="relative -top-2 flex flex-col items-center justify-center w-12 h-12 rounded-full bg-[#5a5a40] text-white shadow-lg border-2 border-white cursor-pointer active:bg-[#454530]"
          title={isOnline ? "Live Firestore Cloud Sync Active" : "Offline Local Cache Active"}
        >
          {isSyncingQueue ? (
            <RefreshCw className="w-5 h-5 animate-spin text-amber-300" />
          ) : !isOnline ? (
            <WifiOff className="w-5 h-5 text-amber-300" />
          ) : (
            <RefreshCw className="w-5 h-5 text-emerald-300" />
          )}

          {/* Pending Queue Count Badge */}
          {queueCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-amber-500 text-[8px] font-black text-white border border-white">
              {queueCount}
            </span>
          )}

          {/* Live Ping Dot */}
          {isOnline && queueCount === 0 && (
            <span className="absolute top-1 right-1 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
            </span>
          )}
        </motion.button>

        {/* 4. Consultation Chat / Messenger */}
        <button
          onClick={handleMessengerClick}
          className="relative flex flex-col items-center gap-0.5 px-2.5 py-1 rounded-xl transition-all cursor-pointer text-[#78716c] hover:text-[#2b2b24]"
        >
          <div className="p-1.5 rounded-lg relative">
            <MessageCircle className="w-5 h-5" />
            {unreadMessagesCount > 0 && (
              <span className="absolute top-0 right-0 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-600 text-[8px] font-bold text-white">
                {unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}
              </span>
            )}
          </div>
          <span className="text-[10px] tracking-tight">Messenger</span>
        </button>

        {/* 5. Android Shell / Download Trigger */}
        <button
          onClick={handleDownloadClick}
          className="flex flex-col items-center gap-0.5 px-2.5 py-1 rounded-xl transition-all cursor-pointer text-[#78716c] hover:text-[#2b2b24]"
        >
          <div className="p-1.5 rounded-lg">
            <Smartphone className="w-5 h-5 text-emerald-700" />
          </div>
          <span className="text-[10px] tracking-tight font-bold text-emerald-800">
            {platformInfo.isAndroidShell ? 'App Shell' : 'Get APK'}
          </span>
        </button>

      </div>
    </div>
  );
}
