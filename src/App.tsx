import { useState, useEffect } from 'react';
import { UserProfile, VetNotification } from './types';
import { getLocalSession, AuthService, NotificationService } from './lib/storage';
import { testConnection } from './lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';

// Import modular layouts
import { Navbar } from './components/Navbar';
import { AuthScreen } from './components/AuthScreen';
import { ExploreFeed } from './components/ExploreFeed';
import { CommunityFeed } from './components/CommunityFeed';
import { Marketplace } from './components/Marketplace';
import { PetAds } from './components/PetAds';
import { ProfilePage } from './components/ProfilePage';
import { JobBoard } from './components/JobBoard';

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(getLocalSession());
  const [activeSection, setActiveSection] = useState<string>('explore');
  const [notifications, setNotifications] = useState<VetNotification[]>([]);
  const [toasts, setToasts] = useState<{ id: string; message: string; type: string }[]>([]);

  // Polling loop for real-time popup notifications
  useEffect(() => {
    if (!currentUser) {
      setNotifications([]);
      return;
    }

    let isMounted = true;
    const seenIds = new Set<string>();

    const checkNotifications = async (isFirstRun: boolean) => {
      try {
        const list = await NotificationService.fetchNotifications(currentUser.uid);
        if (!isMounted) return;

        if (isFirstRun) {
          // On first boot, mark existing unread notifications as seen so we don't spam popups for old interactions
          list.forEach(n => seenIds.add(n.id));
        } else {
          // Find any unread notification that we haven't seen in this session yet
          const newUnreads = list.filter(n => !n.read && !seenIds.has(n.id));
          newUnreads.forEach(n => {
            seenIds.add(n.id);
            const toastId = 'toast_' + n.id + '_' + Date.now();
            
            // Push toast popup
            setToasts(prev => [...prev, { id: toastId, message: n.message, type: n.type }]);
            
            // Auto fade out after 5 seconds
            setTimeout(() => {
              if (isMounted) {
                setToasts(prev => prev.filter(t => t.id !== toastId));
              }
            }, 5000);
          });
        }

        // Always sync the overall notifications list to keep badging correct
        setNotifications(list);
      } catch (err) {
        console.error('Error fetching notification logs:', err);
      }
    };

    // Run immediately first time
    checkNotifications(true);

    // Polling interval every 6 seconds to capture likes, applications, and status updates instantly
    const interval = setInterval(() => {
      checkNotifications(false);
    }, 6000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [currentUser?.uid]);

  const handleMarkAllAsRead = async () => {
    if (!currentUser) return;
    try {
      await NotificationService.markAllAsRead(currentUser.uid);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (err) {
      console.error('Failed to mark notifications read:', err);
    }
  };

  const handleDeleteNotification = async (id: string) => {
    try {
      await NotificationService.deleteNotification(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  };

  // Unified Firebase test connection check on initial system boot
  useEffect(() => {
    testConnection();
  }, []);

  // Sync and validate that the stored session user profile still exists in Firestore or Fallback DB
  useEffect(() => {
    let active = true;
    const validateSession = async () => {
      if (currentUser) {
        try {
          const isValid = await AuthService.validateUserProfile(currentUser.uid);
          if (active && !isValid) {
            console.warn("Stored session user profile no longer exists in DB. Logging out.");
            handleLogout();
          }
        } catch (e) {
          console.error("Error validating stored session:", e);
        }
      }
    };
    validateSession();
    return () => {
      active = false;
    };
  }, [currentUser?.uid]);

  const handleAuthSuccess = (user: UserProfile) => {
    setCurrentUser(user);
    setActiveSection('explore');
  };

  const handleLogout = async () => {
    await AuthService.signOut();
    setCurrentUser(null);
  };

  const handleUpdateUserProfile = (updated: UserProfile) => {
    setCurrentUser(updated);
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen text-center">
        <AuthScreen onAuthSuccess={handleAuthSuccess} authService={AuthService} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#fdfbf7] text-[#3c3c3b]">
      
      {/* GLOBAL APPLICATION NAVBAR */}
      <Navbar
        user={currentUser}
        activeSection={activeSection}
        onNavigate={setActiveSection}
        onLogout={handleLogout}
        notifications={notifications}
        onMarkAllAsRead={handleMarkAllAsRead}
        onDeleteNotification={handleDeleteNotification}
      />

      {currentUser && !currentUser.emailVerified && (
        <div className="bg-amber-50/80 border-b border-amber-200 text-amber-900 text-xs py-2.5 px-4 text-center font-medium flex items-center justify-center gap-3 animate-fadeIn">
          <span>⚠️ Your email is unverified. Please verify your email to ensure secure access.</span>
          <button
            onClick={() => setActiveSection('profile')}
            className="underline font-bold hover:text-amber-700 bg-transparent border-none p-0 cursor-pointer text-xs"
          >
            Go to Profile configuration to resend link or check live status →
          </button>
        </div>
      )}

      {/* RENDERED FEED ROUTER BOX */}
      <main className="flex-1 container max-w-7xl mx-auto px-4 py-8">
        {activeSection === 'explore' && (
          <ExploreFeed
            currentUser={currentUser}
            onUpdateUser={handleUpdateUserProfile}
            activeSection={activeSection}
            onNavigate={setActiveSection}
          />
        )}

        {activeSection === 'community' && (
          <CommunityFeed currentUser={currentUser} />
        )}

        {activeSection === 'marketplace' && (
          <Marketplace currentUser={currentUser} />
        )}

        {activeSection === 'pet_ads' && (
          <PetAds currentUser={currentUser} />
        )}

        {activeSection === 'jobs' && (
          <JobBoard currentUser={currentUser} />
        )}

        {activeSection === 'profile' && (
          <ProfilePage
            currentUser={currentUser}
            onUpdateUser={handleUpdateUserProfile}
            onDeleteSuccess={handleLogout}
          />
        )}
      </main>

      {/* FOOTER METRICS RAIL - Natural Tones Theme */}
      <footer className="py-6 mt-8 border-t border-[#e6e2da] bg-[#f5f2ed] text-center text-xs text-[#7a766f] w-full">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="font-semibold text-left">
            🌱 © 2026 VetAxis PK · <span className="font-normal text-[#a8a49c]">Certified Veterinary Clinical Network of Pakistan</span>
          </div>
          <div className="flex items-center gap-3 text-[10px] font-mono font-bold tracking-wider uppercase text-[#5a5a40] bg-[#ece8df] px-3 py-1.5 rounded-full border border-[#e6e2da]">
            <span className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></span>
            Cloud Firestore Synced
          </div>
        </div>
      </footer>

      {/* Floating Popup Toast Alerts System */}
      <div className="fixed bottom-5 right-5 z-[1000] flex flex-col gap-3 max-w-sm w-[90%] pointer-events-none">
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 50, scale: 0.9 }}
              className="bg-white border border-[#e3dec9] border-b-[5px] border-b-[#cdc6ad] rounded-xl p-4 shadow-xl flex items-start gap-3 relative overflow-hidden text-[#3c3c3b] pointer-events-auto"
            >
              <div className="text-xl filter drop-shadow select-none mt-0.5">
                {toast.type === 'like' && '❤️'}
                {toast.type === 'comment' && '💬'}
                {toast.type === 'apply' && '📄'}
                {toast.type === 'status_change' && '✨'}
              </div>
              <div className="flex-1 pr-6 text-left">
                <span className="text-[9px] tracking-wider uppercase font-black text-[#5a5a40] block leading-none">ACTIVITY BULLETIN</span>
                <p className="text-[11px] text-[#3c3c3b] font-bold leading-tight mt-1.5">
                  {toast.message}
                </p>
              </div>
              <button
                onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                className="absolute top-2 right-2 p-1 rounded-full text-[#a49f92] hover:text-[#5a5a40] hover:bg-[#fcf9f2] border-none bg-transparent cursor-pointer"
                aria-label="Dismiss toast"
              >
                <X className="w-3 h-3" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

    </div>
  );
}
