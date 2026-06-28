import { useState, useEffect } from 'react';
import { UserProfile, VetNotification } from './types';
import { getLocalSession, AuthService, NotificationService, injectTemporaryPlatinum } from './lib/storage';
import { testConnection, isFirebaseConfigured, auth, db } from './lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { ClinicService } from './lib/clinicService';

// Import modular layouts
import { Navbar } from './components/Navbar';
import { AuthScreen } from './components/AuthScreen';
import { ExploreFeed } from './components/ExploreFeed';
import { CommunityFeed } from './components/CommunityFeed';
import { Marketplace } from './components/Marketplace';
import { PetAds } from './components/PetAds';
import { ProfilePage } from './components/ProfilePage';
import { JobBoard } from './components/JobBoard';
import LivestockManagement from './components/LivestockManagement';
import { SubscriptionPortal } from './components/SubscriptionPortal';
import { GuestAnimalViewer } from './components/GuestAnimalViewer';
import { ClinicManagement } from './components/ClinicManagement';

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(getLocalSession());
  const [isAuthInitializing, setIsAuthInitializing] = useState<boolean>(isFirebaseConfigured);
  const [activeSection, setActiveSection] = useState<string>('explore');
  const [notifications, setNotifications] = useState<VetNotification[]>([]);
  const [toasts, setToasts] = useState<{ id: string; message: string; type: string; notif?: VetNotification }[]>([]);

  // Highlight states for redirects
  const [highlightPostId, setHighlightPostId] = useState<string | null>(null);
  const [highlightJobId, setHighlightJobId] = useState<string | null>(null);
  const [highlightApplicationId, setHighlightApplicationId] = useState<string | null>(null);
  const [highlightFarmId, setHighlightFarmId] = useState<string | null>(null);
  const [highlightAppointmentId, setHighlightAppointmentId] = useState<string | null>(null);
  const [scannedAnimalRecordId, setScannedAnimalRecordId] = useState<string | null>(null);
  const [temporaryBypassGuestForAuth, setTemporaryBypassGuestForAuth] = useState<boolean>(false);

  // Unified dynamic QR code parameters scanner inside app boot
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const animalId = params.get('animalRecordId');

    if (animalId) {
      setScannedAnimalRecordId(animalId);
      if (currentUser) {
        setActiveSection('livestock');
      }
      try {
        const cleanUrl = window.location.origin + window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
      } catch (err) {
        console.warn('Could not clean address bar parameters:', err);
      }
    }
  }, [currentUser]);

  // Advanced Global Loading State
  const [isLoadingSystem, setIsLoadingSystem] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');

  const triggerLoading = (message: string = 'Processing...', durationMs: number = 800) => {
    setLoadingMessage(message);
    setIsLoadingSystem(true);
    setTimeout(() => {
      setIsLoadingSystem(false);
    }, durationMs);
  };

  // Polling loop for real-time popup notifications
  useEffect(() => {
    if (!currentUser) {
      setNotifications([]);
      return;
    }

    let isMounted = true;
    const seenIds = new Set<string>();
    let lastReminderCheck = 0;

    const checkNotifications = async (isFirstRun: boolean) => {
      try {
        // ─── Automated 6-hour Appointment reminders (Throttled to once every 120 seconds for performance) ──────────────────
        const nowMs = Date.now();
        if (isFirstRun || nowMs - lastReminderCheck > 120 * 1000) {
          lastReminderCheck = nowMs;
          try {
            // Fetch appointments where the user is either the pet owner or the clinic
            const myUserAppts = await ClinicService.fetchAppointmentsByUserId(currentUser.uid);
            const myClinicAppts = await ClinicService.fetchAppointments(currentUser.uid);
            
            // Combine both lists uniquely
            const combinedAppts = [...myUserAppts];
            myClinicAppts.forEach(ca => {
              if (!combinedAppts.some(a => a.id === ca.id)) {
                combinedAppts.push(ca);
              }
            });

            const now = new Date();
            for (const appt of combinedAppts) {
              if (appt.status === 'Scheduled' && !appt.sent6hReminder && appt.userId) {
                const [year, month, day] = appt.date.split('-').map(Number);
                const [hours, minutes] = appt.time.split(':').map(Number);
                if (!isNaN(year) && !isNaN(month) && !isNaN(day) && !isNaN(hours) && !isNaN(minutes)) {
                  const apptDate = new Date(year, month - 1, day, hours, minutes, 0, 0);
                  const diffMs = apptDate.getTime() - now.getTime();
                  const sixHoursMs = 6 * 1000 * 60 * 60; // 6 hours

                  // Trigger if scheduled time is within 6 hours (and is in the future)
                  if (diffMs > 0 && diffMs <= sixHoursMs) {
                    appt.sent6hReminder = true;
                    await ClinicService.saveAppointment(appt);

                    await NotificationService.createNotification({
                      userId: appt.userId,
                      senderId: appt.clinicId,
                      senderName: appt.vetName || 'Vet Clinic',
                      type: 'status_change',
                      targetId: appt.id,
                      targetType: 'appointment',
                      message: `⏰ Reminder: Your pet ${appt.patientName}'s scheduled appointment at ${appt.vetName} is in 6 hours (at ${appt.time}).`,
                      read: false
                    });
                  }
                }
              }
            }
          } catch (err) {
            console.error("6h reminder checking failed:", err);
          }
        }

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
            
            // Push toast popup with full notification ref for click handling
            setToasts(prev => [...prev, { id: toastId, message: n.message, type: n.type, notif: n }]);
            
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

  // Redirect to source when user clicks a notification
  const handleNotificationClick = async (notif: VetNotification) => {
    // Optimistically mark this specific notification as read in the UI
    setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
    try {
      // Also sync all or this status to DB/localStorage
      await NotificationService.markAllAsRead(currentUser!.uid);
    } catch (err) {
      console.warn('Failed to sync notification read status on click:', err);
    }

    // Reset other irrelevant highlights
    setHighlightPostId(null);
    setHighlightJobId(null);
    setHighlightApplicationId(null);
    setHighlightFarmId(null);
    setHighlightAppointmentId(null);

    // Set correct highlight states based on targetType and redirect
    if (notif.targetType === 'post') {
      setHighlightPostId(notif.targetId);
      setActiveSection('community');
    } else if (notif.targetType === 'job') {
      setHighlightJobId(notif.targetId);
      setActiveSection('jobs');
    } else if (notif.targetType === 'application') {
      setHighlightApplicationId(notif.targetId);
      setActiveSection('jobs');
    } else if (notif.targetType === 'farm') {
      setHighlightFarmId(notif.targetId);
      setActiveSection('livestock');
    } else if (notif.targetType === 'appointment') {
      setHighlightAppointmentId(notif.targetId);
      setActiveSection('clinic_management');
    }
  };

  const handleNavigate = (section: string) => {
    triggerLoading(`Opening ${section.replace('_', ' ').toUpperCase()}...`, 600);
    setActiveSection(section);
    // Clear highlight tags during manual user shifts
    setHighlightPostId(null);
    setHighlightJobId(null);
    setHighlightApplicationId(null);
    setHighlightFarmId(null);
    setHighlightAppointmentId(null);
  };

  // Real-time Auth connection tracker to prevent race conditions on startup
  useEffect(() => {
    if (isFirebaseConfigured && auth) {
      const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        try {
          if (firebaseUser) {
            const stored = getLocalSession();
            if (stored && stored.uid === firebaseUser.uid) {
              setCurrentUser(stored);
            } else {
              // Fetch fresh user profile from DB to prevent out-of-sync or missing records
              const userRef = doc(db, 'users', firebaseUser.uid);
              const userSnap = await getDoc(userRef);
              if (userSnap.exists()) {
                const profile = userSnap.data() as UserProfile;
                const finalized = injectTemporaryPlatinum(profile);
                setCurrentUser(finalized);
                localStorage.setItem('va_session', JSON.stringify(finalized));
              } else {
                setCurrentUser(null);
                localStorage.removeItem('va_session');
              }
            }
          } else {
            // Sign-out detected or no active Firebase Auth session found
            setCurrentUser(null);
            localStorage.removeItem('va_session');
          }
        } catch (authErr) {
          console.error('[VetAxis] Error during auth session restore:', authErr);
        } finally {
          setIsAuthInitializing(false);
        }
      });
      return () => unsubscribe();
    } else {
      setIsAuthInitializing(false);
    }
  }, []);

  // Unified Firebase test connection check on initial system boot
  useEffect(() => {
    testConnection();
  }, []);

  // Global auto-scroller when any popup modal/dialog opens
  useEffect(() => {
    let lastActionTime = 0;
    
    const handlePopupOpened = (element: HTMLElement) => {
      const now = Date.now();
      // Debounce slightly to prevent recursive triggers within 300ms
      if (now - lastActionTime < 300) return;
      lastActionTime = now;

      // Scroll the main screen viewport to top
      window.scrollTo({ top: 0, behavior: 'smooth' });

      // Scroll the popup container/overlay itself to its top
      element.scrollTo({ top: 0, behavior: 'smooth' });
      
      // Also scroll any internal scrollable panels within the modal to their top
      const scrollables = element.querySelectorAll('.overflow-y-auto');
      scrollables.forEach(el => {
        el.scrollTo({ top: 0, behavior: 'smooth' });
      });

      // If there's an active dialog card inside the overlay, scroll it elegantly into view
      const dialogArea = element.querySelector('[role="dialog"], .bg-white, .bg-neutral-900, .bg-\\[\\#fcf9f2\\]');
      if (dialogArea) {
        dialogArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    };

    const isModalElement = (node: Node): node is HTMLElement => {
      if (!(node instanceof HTMLElement)) return false;
      const cn = node.className;
      if (typeof cn !== 'string') return false;
      
      const isFixed = node.classList.contains('fixed') && !node.classList.contains('pointer-events-none');
      const hasBackdrop = cn.includes('bg-black/') || cn.includes('backdrop-blur') || cn.includes('bg-stone-900/');
      const hasDialog = node.getAttribute('role') === 'dialog' || node.querySelector('[role="dialog"]') !== null;
      
      return isFixed || hasBackdrop || hasDialog;
    };

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          for (const node of Array.from(mutation.addedNodes)) {
            if (isModalElement(node)) {
              handlePopupOpened(node);
              return;
            }
            if (node instanceof HTMLElement) {
              const innerModal = Array.from(node.querySelectorAll('*')).find(el => isModalElement(el));
              if (innerModal instanceof HTMLElement) {
                handlePopupOpened(innerModal);
                return;
              }
            }
          }
        } else if (mutation.type === 'attributes') {
          const target = mutation.target;
          if (isModalElement(target)) {
            const isHidden = target.classList.contains('hidden') || target.style.display === 'none';
            if (!isHidden) {
              handlePopupOpened(target);
              return;
            }
          }
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style']
    });

    return () => observer.disconnect();
  }, []);



  // Sync and validate that the stored session user profile still exists in Firestore or Fallback DB
  // Also runs a real-time periodic clock to guarantee user downgrades when subscription duration runs out
  useEffect(() => {
    let active = true;

    const validateSession = async () => {
      if (currentUser) {
        try {
          const isValid = await AuthService.validateUserProfile(currentUser.uid);
          if (active && !isValid) {
            console.warn("Stored session user profile no longer exists in DB. Logging out.");
            handleLogout();
            return;
          }

          // Real-time automatic monthly subscription expiration check
          if (currentUser.subscriptionTier && currentUser.subscriptionExpiresAt) {
            if (Date.now() > currentUser.subscriptionExpiresAt) {
              console.warn("User premium tier subscription has expired. Auto-downgrading privileges.");
              const updated = await AuthService.updateProfile(currentUser.uid, {
                subscriptionTier: null as any,
                subscriptionExpiresAt: null as any,
                isVerified: false
              });
              if (active) {
                setCurrentUser(updated);
                alert(`⚠️ Your VetAxis Premium ${currentUser.subscriptionTier} plan subscription has expired (validity exceeded its monthly cycle). Premium privileges have been removed. Please go to Settings > Subscription Portal to renew.`);
              }
            }
          }
        } catch (e) {
          console.error("Error validating stored session:", e);
        }
      }
    };

    validateSession();

    // Setup real-time poll clock checking every 2 seconds to instantly process expiration!
    const pollId = setInterval(() => {
      if (currentUser?.subscriptionTier && currentUser?.subscriptionExpiresAt) {
        if (Date.now() > currentUser.subscriptionExpiresAt) {
          validateSession();
        }
      }
    }, 2000);

    return () => {
      active = false;
      clearInterval(pollId);
    };
  }, [currentUser?.uid, currentUser?.subscriptionExpiresAt, currentUser?.subscriptionTier]);

  // Real-time online presence heartbeat
  useEffect(() => {
    if (!currentUser) return;

    const performHeartbeat = async () => {
      try {
        await AuthService.updateProfile(currentUser.uid, {
          isOnline: true,
          lastSeen: Date.now()
        });
      } catch (err) {
        console.warn('Presence heartbeat failed:', err);
      }
    };

    // Trigger on boot instantly
    performHeartbeat();

    // Trigger heartbeat clock cycle every 30 seconds to be extremely precise
    const interval = setInterval(performHeartbeat, 30000);
    return () => clearInterval(interval);
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

  if (isAuthInitializing) {
    return (
      <div className="min-h-screen bg-[#fdfbf7] flex flex-col items-center justify-center p-6">
        <div className="flex flex-col items-center gap-4 animate-pulse">
          <div className="h-16 w-16 bg-[#004d40] rounded-2xl flex items-center justify-center shadow-lg text-[#fdfbf7] font-black text-2xl tracking-widest">
            VA
          </div>
          <h1 className="text-xl font-bold text-stone-800 tracking-tight text-center">VetAxis</h1>
          <p className="text-stone-500 text-xs font-mono text-center">Securing connection to clinical network...</p>
        </div>
      </div>
    );
  }

  // Intercept guest visits that scanned a veterinary ear-tag/collar code
  if (!currentUser && scannedAnimalRecordId && !temporaryBypassGuestForAuth) {
    return (
      <GuestAnimalViewer 
        animalRecordId={scannedAnimalRecordId}
        onGoToAuth={() => setTemporaryBypassGuestForAuth(true)}
        onClear={() => setScannedAnimalRecordId(null)}
      />
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen text-center relative">
        {/* Floating return button to easily jump back to scanned passport */}
        {scannedAnimalRecordId && (
          <div className="absolute top-4 left-4 z-[9999]">
            <button
              onClick={() => setTemporaryBypassGuestForAuth(false)}
              className="cursor-pointer bg-[#5a5a40] text-white hover:bg-[#3e3e2b] px-4 py-2 rounded-xl text-xs font-bold border-none shadow-md flex items-center gap-1.5 transition-all font-sans"
            >
              ← Back to Scanned Digital Passport
            </button>
          </div>
        )}
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
        onNavigate={handleNavigate}
        onLogout={handleLogout}
        notifications={notifications}
        onMarkAllAsRead={handleMarkAllAsRead}
        onDeleteNotification={handleDeleteNotification}
        onNotificationClick={handleNotificationClick}
      />

      {currentUser && !currentUser.emailVerified && (
        <div className="bg-amber-50/80 border-b border-amber-200 text-amber-900 text-xs py-2.5 px-4 text-center font-medium flex items-center justify-center gap-3 animate-fadeIn">
          <span>⚠️ Your email is unverified. Please verify your email to ensure secure access.</span>
          <button
            onClick={() => handleNavigate('profile')}
            className="underline font-bold hover:text-amber-700 bg-transparent border-none p-0 cursor-pointer text-xs"
          >
            Go to Profile configuration to resend link or check live status →
          </button>
        </div>
      )}

      {/* RENDERED FEED ROUTER BOX */}
      <main className="flex-1 container max-w-7xl mx-auto px-4 py-8 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeSection}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
          >
            {activeSection === 'explore' && (
              <ExploreFeed
                currentUser={currentUser}
                onUpdateUser={handleUpdateUserProfile}
                activeSection={activeSection}
                onNavigate={handleNavigate}
              />
            )}

            {activeSection === 'community' && (
              <CommunityFeed 
                currentUser={currentUser} 
                highlightPostId={highlightPostId}
              />
            )}

            {activeSection === 'marketplace' && (
              <Marketplace currentUser={currentUser} onNavigate={setActiveSection} />
            )}

            {activeSection === 'pet_ads' && (
              <PetAds currentUser={currentUser} onNavigate={setActiveSection} />
            )}

            {activeSection === 'jobs' && (
              <JobBoard 
                currentUser={currentUser} 
                highlightJobId={highlightJobId}
                highlightApplicationId={highlightApplicationId}
              />
            )}

            {activeSection === 'livestock' && (
              <LivestockManagement 
                currentUser={currentUser} 
                highlightFarmId={highlightFarmId}
                scannedAnimalRecordId={scannedAnimalRecordId}
                onClearScannedAnimal={() => setScannedAnimalRecordId(null)}
              />
            )}

            {activeSection === 'profile' && (
              <ProfilePage
                currentUser={currentUser}
                onUpdateUser={handleUpdateUserProfile}
                onDeleteSuccess={handleLogout}
              />
            )}

            {activeSection === 'subscription' && (
              <SubscriptionPortal
                currentUser={currentUser}
                onUpdateUser={handleUpdateUserProfile}
                onNavigateToSection={handleNavigate}
              />
            )}

            {activeSection === 'clinic_management' && currentUser && currentUser.role === 'clinic' && (
              <ClinicManagement 
                user={currentUser} 
                highlightAppointmentId={highlightAppointmentId}
                onClearHighlightAppointment={() => setHighlightAppointmentId(null)}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* FOOTER METRICS RAIL - Natural Tones Theme */}
      <footer className="py-4 mt-8 bg-[#fdfbf7] w-full">
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
              onClick={() => {
                if (toast.notif) {
                  handleNotificationClick(toast.notif);
                  setToasts(prev => prev.filter(t => t.id !== toast.id));
                }
              }}
              className="bg-white border border-[#e3dec9] border-b-[5px] border-b-[#cdc6ad] rounded-xl p-4 shadow-xl flex items-start gap-3 relative overflow-hidden text-[#3c3c3b] pointer-events-auto cursor-pointer hover:bg-[#fcf9f2] transition-colors"
            >
              <div className="text-xl filter drop-shadow select-none mt-0.5">
                {toast.type === 'like' && '❤️'}
                {toast.type === 'comment' && '💬'}
                {toast.type === 'apply' && '📄'}
                {toast.type === 'status_change' && '✨'}
              </div>
              <div className="flex-1 pr-6 text-left">
                <span className="text-[9px] tracking-wider uppercase font-black text-[#5a5a40] block leading-none">ACTIVITY BULLETIN (CLICK to view)</span>
                <p className="text-[11px] text-[#3c3c3b] font-bold leading-tight mt-1.5">
                  {toast.message}
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setToasts(prev => prev.filter(t => t.id !== toast.id));
                }}
                className="absolute top-2 right-2 p-1 rounded-full text-[#a49f92] hover:text-[#5a5a40] hover:bg-[#fcf9f2] border-none bg-transparent cursor-pointer z-[10]"
                aria-label="Dismiss toast"
              >
                <X className="w-3 h-3" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* ADVANCED MODERN SYSTEM LOADING PORTAL */}
      <AnimatePresence>
        {isLoadingSystem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-stone-900/60 backdrop-blur-md z-[99999] flex flex-col items-center justify-center space-y-6"
          >
            <div className="relative flex items-center justify-center">
              {/* Outer Pulsing Radar Ring */}
              <motion.div
                animate={{ scale: [1, 1.4, 1], opacity: [0.6, 0.1, 0.6] }}
                transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                className="absolute w-24 h-24 rounded-full border-2 border-amber-500/40"
              />
              {/* Inner Rotating Gear / Ring */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                className="w-16 h-16 rounded-full border-4 border-amber-100 border-t-amber-600 border-b-amber-600"
              />
              {/* Center Icon */}
              <span className="absolute text-xl animate-pulse">🩺</span>
            </div>
            
            <div className="space-y-1.5 text-center px-4">
              <h3 className="font-serif font-black text-amber-50 text-sm uppercase tracking-widest">{loadingMessage}</h3>
              <p className="text-[10px] text-amber-200/50 font-mono tracking-wider">SECURE DIGITAL LEDGER ENGINE V2</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
