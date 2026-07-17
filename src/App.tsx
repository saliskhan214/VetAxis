import { useState, useEffect } from 'react';
import { UserProfile, VetNotification } from './types';
import { getLocalSession, AuthService, NotificationService, injectTemporaryPlatinum, secureSetItem } from './lib/storage';
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
import { AdminPanel } from './components/AdminPanel';
import { Marketplace } from './components/Marketplace';
import { PetAds } from './components/PetAds';
import { ProfilePage } from './components/ProfilePage';
import { JobBoard } from './components/JobBoard';
import LivestockManagement from './components/LivestockManagement';
import { SubscriptionPortal } from './components/SubscriptionPortal';
import { GuestAnimalViewer } from './components/GuestAnimalViewer';
import { ClinicManagement } from './components/ClinicManagement';
import { AboutUsDirectory } from './components/AboutUsDirectory';
import PageNotFound from './components/PageNotFound';

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(getLocalSession());
  const [isAuthInitializing, setIsAuthInitializing] = useState<boolean>(isFirebaseConfigured);
  const [activeSection, setActiveSection] = useState<string>('explore');
  const [notifications, setNotifications] = useState<VetNotification[]>([]);
  const [toasts, setToasts] = useState<{ id: string; message: string; type: string; notif?: VetNotification }[]>([]);
  const [isAboutUsOpen, setIsAboutUsOpen] = useState<boolean>(false);

  const [dbQuotaExceeded, setDbQuotaExceeded] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return sessionStorage.getItem('firebase_quota_exceeded') === 'true' || 
           localStorage.getItem('firebase_quota_exceeded') === 'true';
  });

  useEffect(() => {
    const handleQuotaExceeded = () => {
      setDbQuotaExceeded(true);
    };
    window.addEventListener('firestore-quota-exceeded', handleQuotaExceeded);
    return () => {
      window.removeEventListener('firestore-quota-exceeded', handleQuotaExceeded);
    };
  }, []);

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
    const tabParam = params.get('tab');

    if (tabParam) {
      const validSections = ['explore', 'community', 'marketplace', 'pet_ads', 'jobs', 'livestock', 'profile', 'subscription', 'admin', 'news'];
      let targetSection = tabParam.toLowerCase();
      if (targetSection === 'pets') targetSection = 'pet_ads';
      if (validSections.includes(targetSection)) {
        setActiveSection(targetSection);
      } else {
        setActiveSection('not_found');
      }
    }

    if (animalId) {
      setScannedAnimalRecordId(animalId);
      if (currentUser?.uid) {
        setActiveSection('livestock');
      }
      try {
        const cleanUrl = window.location.origin + window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
      } catch (err) {
        console.warn('Could not clean address bar parameters:', err);
      }
    }
  }, [currentUser?.uid]);

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

    if (dbQuotaExceeded) {
      console.warn('[VetAxis] Background notifications polling suspended due to database quota exhaustion.');
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

    // Polling interval throttled to every 25 seconds to respect Firestore free tier limits and prevent quota exhaustion
    const interval = setInterval(() => {
      checkNotifications(false);
    }, 25000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [currentUser?.uid, dbQuotaExceeded]);

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
                secureSetItem('va_session', JSON.stringify(finalized));
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
      
      // If the node or any parent/ancestor has data-no-scroll="true", do not treat as a modal to prevent unwanted scrolling
      if (node.closest('[data-no-scroll="true"]') || node.querySelector('[data-no-scroll="true"]')) {
        return false;
      }

      const cn = node.className;
      if (typeof cn !== 'string') return false;
      
      const isFixed = node.classList.contains('fixed') && !node.classList.contains('pointer-events-none');
      const hasBackdrop = (cn.includes('bg-black/') || cn.includes('backdrop-blur') || cn.includes('bg-stone-900/')) && node.classList.contains('fixed');
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
    if (dbQuotaExceeded) return;
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
        } catch (e) {
          console.error("Error validating stored session:", e);
        }
      }
    };

    validateSession();

    return () => {
      active = false;
    };
  }, [currentUser?.uid, dbQuotaExceeded]);

  // Real-time precise monthly/trial subscription expiration checker
  useEffect(() => {
    if (!currentUser?.subscriptionTier || !currentUser?.subscriptionExpiresAt || dbQuotaExceeded) return;
    
    let active = true;
    const checkExpiry = async () => {
      if (Date.now() > currentUser.subscriptionExpiresAt) {
        const expiredTier = currentUser.subscriptionTier;
        console.warn(`[VetAxis] Active premium ${expiredTier} subscription has ended. Auto-downgrading.`);
        
        try {
          // 1. Create a beautiful persistent system notification in the DB
          const newNotif = await NotificationService.createNotification({
            userId: currentUser.uid,
            senderId: 'admin',
            senderName: 'VetAxis System',
            type: 'status_change',
            targetId: 'expiry',
            targetType: 'appointment',
            message: `⚠️ Your VetAxis Premium ${expiredTier} plan subscription has expired (validity exceeded its monthly cycle). Premium privileges have been removed. Please go to Settings > Subscription Portal to renew.`,
            read: false
          });

          // 2. Immediately push a high-contrast toast popup into the active session
          const toastId = 'toast_expiry_' + Date.now();
          setToasts(prev => [...prev, {
            id: toastId,
            message: `⚠️ Your VetAxis Premium ${expiredTier} plan subscription has expired. Premium privileges have been removed.`,
            type: 'status_change',
            notif: newNotif
          }]);
          
          // Auto-remove toast after 10 seconds
          setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== toastId));
          }, 10000);
        } catch (e) {
          console.error("Failed to create expiry notification/toast:", e);
        }

        try {
          // 3. Update the database profile to downgrade
          const updated = await AuthService.updateProfile(currentUser.uid, {
            subscriptionTier: null as any,
            subscriptionExpiresAt: null as any,
            isVerified: false
          });
          
          if (active) {
            setCurrentUser(updated);
          }
        } catch (e) {
          console.error("Failed to downgrade profile on expiry:", e);
        }
      }
    };

    // Check instantly on mount or tier update
    checkExpiry();

    // Check memory every 1000ms to catch the exact moment of expiry (e.g. for counting down trials)
    const timerId = setInterval(checkExpiry, 1000);
    
    return () => {
      active = false;
      clearInterval(timerId);
    };
  }, [currentUser?.uid, currentUser?.subscriptionTier, currentUser?.subscriptionExpiresAt, dbQuotaExceeded]);

  // Real-time online presence heartbeat
  useEffect(() => {
    if (!currentUser || dbQuotaExceeded) return;

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
  }, [currentUser?.uid, dbQuotaExceeded]);

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
          <h1 className="text-xl font-bold text-stone-800 tracking-tight text-center">VetAxis 360</h1>
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
        <AuthScreen 
          onAuthSuccess={handleAuthSuccess} 
          authService={AuthService} 
          onOpenAboutUs={() => setIsAboutUsOpen(true)}
        />

        <AnimatePresence>
          {isAboutUsOpen && (
            <AboutUsDirectory
              isOpen={isAboutUsOpen}
              onClose={() => setIsAboutUsOpen(false)}
              onNavigate={handleNavigate}
              isLoggedIn={false}
              onTriggerAuth={() => setIsAboutUsOpen(false)}
            />
          )}
        </AnimatePresence>
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
        onOpenAboutUs={() => setIsAboutUsOpen(true)}
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

      {dbQuotaExceeded && (
        <div className="bg-red-50/95 border-b border-red-200 text-red-900 text-xs py-3 px-4 text-center font-medium flex items-center justify-center gap-3 animate-fadeIn shadow-inner">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-red-600 animate-ping" />
            ⚠️ <strong>Cloud Connection Rate-Limited (Quota Exhausted):</strong> This limited sandbox database has reached its free-tier daily write limit of 20,000 units.
          </span>
          <p className="hidden md:inline text-red-700 font-normal">
            We have safely switched your session to offline-caching mode. Your changes will automatically sync once limits reset or upon refresh later.
          </p>
          <button
            onClick={() => setDbQuotaExceeded(false)}
            className="ml-2 font-bold hover:text-red-700 bg-stone-200/50 hover:bg-stone-200 px-2 py-1 rounded transition-colors text-stone-800 text-[10px] cursor-pointer"
          >
            Acknowledge
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

            {activeSection === 'admin' && currentUser && (currentUser.email === 'saliskhan214@gmail.com' || currentUser.isAdmin === true) && (
              <AdminPanel currentUser={currentUser} />
            )}

            {activeSection === 'clinic_management' && currentUser && currentUser.role === 'clinic' && (
              <ClinicManagement 
                user={currentUser} 
                highlightAppointmentId={highlightAppointmentId}
                onClearHighlightAppointment={() => setHighlightAppointmentId(null)}
              />
            )}

            {!['explore', 'community', 'marketplace', 'pet_ads', 'jobs', 'livestock', 'profile', 'subscription', 'admin', 'clinic_management'].includes(activeSection) && (
              <PageNotFound onBackHome={() => setActiveSection('explore')} onNavigate={(sect) => setActiveSection(sect)} />
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

      {/* GLOBAL FLOATING WHATSAPP BUTTON */}
      <div className="fixed bottom-6 left-6 z-[9999]">
        <a
          href="https://wa.me/923001216272?text=Hello%20VetAxis!%20I%20have%20a%20query%20about%20the%20platform."
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center gap-2 bg-[#128c7e] hover:bg-[#075e54] text-white text-xs font-bold px-4 py-3 rounded-full shadow-2xl transition-all duration-300 transform hover:scale-105 select-none border border-emerald-500/20"
          id="global-whatsapp-float"
        >
          {/* Pulsing Dot Indicator */}
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>

          {/* Official WhatsApp SVG Path */}
          <svg
            className="w-4 h-4 fill-current text-white group-hover:rotate-12 transition-transform duration-300"
            viewBox="0 0 448 512"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7 .9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z" />
          </svg>

          <span className="font-sans text-[10px] uppercase tracking-wider font-extrabold">Contact with us</span>
        </a>
      </div>

      <AnimatePresence>
        {isAboutUsOpen && (
          <AboutUsDirectory
            isOpen={isAboutUsOpen}
            onClose={() => setIsAboutUsOpen(false)}
            onNavigate={handleNavigate}
            isLoggedIn={true}
          />
        )}
      </AnimatePresence>

    </div>
  );
}
