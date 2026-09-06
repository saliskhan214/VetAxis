import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { UserProfile, VetNotification } from './types';
import { getLocalSession, AuthService, NotificationService, BroadcastNotificationService, injectTemporaryPlatinum, secureSetItem } from './lib/storage';
import { testConnection, isFirebaseConfigured, auth, db } from './lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { ClinicService } from './lib/clinicService';
import { useSWR } from './lib/useSWR';
import { initIdlePrefetch } from './lib/prefetch';

export { useSWR };
export type { SWROptions, SWRResponse } from './lib/useSWR';

// Immediate core components for instant 0ms first-paint
import { Navbar } from './components/Navbar';
import { AuthScreen } from './components/AuthScreen';
import { ExploreFeed } from './components/ExploreFeed';
import { Footer } from './components/Footer';
import { ThreeDAnimalLoader } from './components/ThreeDAnimalLoader';
import { ChatService } from './lib/chatService';

// Lazy-loaded route components for high-speed code-splitting & zero initial lag
const CommunityFeed = lazy(() => import('./components/CommunityFeed').then(m => ({ default: m.CommunityFeed })));
const AdminPanel = lazy(() => import('./components/AdminPanel').then(m => ({ default: m.AdminPanel })));
const Marketplace = lazy(() => import('./components/Marketplace').then(m => ({ default: m.Marketplace })));
const PetAds = lazy(() => import('./components/PetAds').then(m => ({ default: m.PetAds })));
const ProfilePage = lazy(() => import('./components/ProfilePage').then(m => ({ default: m.ProfilePage })));
const JobBoard = lazy(() => import('./components/JobBoard').then(m => ({ default: m.JobBoard })));
const LivestockManagement = lazy(() => import('./components/LivestockManagement'));
const SubscriptionPortal = lazy(() => import('./components/SubscriptionPortal').then(m => ({ default: m.SubscriptionPortal })));
const GuestAnimalViewer = lazy(() => import('./components/GuestAnimalViewer').then(m => ({ default: m.GuestAnimalViewer })));
const ClinicManagement = lazy(() => import('./components/ClinicManagement').then(m => ({ default: m.ClinicManagement })));
const AboutUsDirectory = lazy(() => import('./components/AboutUsDirectory').then(m => ({ default: m.AboutUsDirectory })));
const BlogSection = lazy(() => import('./components/BlogSection').then(m => ({ default: m.BlogSection })));
const VeterinaryClinicalSuite = lazy(() => import('./components/VeterinaryClinicalSuite').then(m => ({ default: m.VeterinaryClinicalSuite })));
const PageNotFound = lazy(() => import('./components/PageNotFound'));
const MessengerModal = lazy(() => import('./components/MessengerModal').then(m => ({ default: m.MessengerModal })));
const ChatModal = lazy(() => import('./components/ChatModal').then(m => ({ default: m.ChatModal })));

const TermsOfServicePage = lazy(() => import('./components/LegalAndAbout').then(m => ({ default: m.TermsOfServicePage })));
const PrivacyPolicyPage = lazy(() => import('./components/LegalAndAbout').then(m => ({ default: m.PrivacyPolicyPage })));
const AboutUsPage = lazy(() => import('./components/LegalAndAbout').then(m => ({ default: m.AboutUsPage })));
const ContactSupportPage = lazy(() => import('./components/LegalAndAbout').then(m => ({ default: m.ContactSupportPage })));
const CareersSafetyProtocolPage = lazy(() => import('./components/LegalAndAbout').then(m => ({ default: m.CareersSafetyProtocolPage })));

function SectionLoadingFallback() {
  return (
    <div className="w-full py-24 flex flex-col items-center justify-center space-y-3 select-none">
      <div className="w-10 h-10 rounded-2xl bg-[#2d4a39]/10 border border-[#2d4a39]/20 flex items-center justify-center text-lg animate-pulse">
        🩺
      </div>
      <p className="text-[11px] font-bold text-[#7a766f] tracking-wider uppercase">
        Loading facility...
      </p>
    </div>
  );
}

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(getLocalSession());
  const [isAuthInitializing, setIsAuthInitializing] = useState<boolean>(() => !getLocalSession() && isFirebaseConfigured);
  const [activeSection, setActiveSection] = useState<string>('explore');
  const [notifications, setNotifications] = useState<VetNotification[]>([]);
  const [toasts, setToasts] = useState<{ id: string; message: string; type: string; notif?: VetNotification }[]>([]);
  const [isAboutUsOpen, setIsAboutUsOpen] = useState<boolean>(false);
  const [isMessengerOpen, setIsMessengerOpen] = useState<boolean>(false);
  const [globalChatRecipient, setGlobalChatRecipient] = useState<UserProfile | null>(null);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState<number>(0);

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
  const [highlightClinicId, setHighlightClinicId] = useState<string | null>(null);
  const [highlightDoctorId, setHighlightDoctorId] = useState<string | null>(null);
  const [highlightProductId, setHighlightProductId] = useState<string | null>(null);
  const [highlightAdId, setHighlightAdId] = useState<string | null>(null);
  const [initialCity, setInitialCity] = useState<string | null>(null);
  const [initialFilter, setInitialFilter] = useState<string | null>(null);
  const [initialPetType, setInitialPetType] = useState<string | null>(null);
  const [initialClinicalTool, setInitialClinicalTool] = useState<string | undefined>(undefined);
  const [scannedAnimalRecordId, setScannedAnimalRecordId] = useState<string | null>(null);
  const [temporaryBypassGuestForAuth, setTemporaryBypassGuestForAuth] = useState<boolean>(false);

  // Unified dynamic QR code & SEO deep-linking scanner inside app boot
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const animalId = params.get('animalRecordId');
    const tabParam = params.get('tab');
    const clinicParam = params.get('clinic');
    const doctorParam = params.get('doctor');
    const jobParam = params.get('jobId') || params.get('job');
    const productParam = params.get('productId') || params.get('product') || params.get('item');
    const adParam = params.get('adId') || params.get('ad');
    const cityParam = params.get('city');
    const filterParam = params.get('filter');
    const petTypeParam = params.get('type');
    const toolParam = params.get('tool');

    if (clinicParam) {
      setHighlightClinicId(clinicParam);
      setActiveSection('explore');
    } else if (doctorParam) {
      setHighlightDoctorId(doctorParam);
      setActiveSection('explore');
    } else if (jobParam) {
      setHighlightJobId(jobParam);
      setActiveSection('jobs');
    } else if (productParam) {
      setHighlightProductId(productParam);
      setActiveSection('marketplace');
    } else if (adParam) {
      setHighlightAdId(adParam);
      setActiveSection('pet_ads');
    }

    if (toolParam) {
      setInitialClinicalTool(toolParam);
      setActiveSection('clinical_tools');
    }

    if (cityParam) {
      setInitialCity(cityParam);
      setActiveSection('explore');
    }
    if (filterParam) {
      setInitialFilter(filterParam);
      setActiveSection('explore');
    }
    if (petTypeParam) {
      setInitialPetType(petTypeParam);
    }

    if (tabParam) {
      const validSections = [
        'explore', 'community', 'marketplace', 'pet_ads', 'jobs', 
        'livestock', 'profile', 'subscription', 'admin', 'news', 
        'blogs', 'articles', 'about', 'about_us', 'terms', 
        'terms_of_service', 'privacy', 'privacy_policy', 'contact', 
        'support', 'clinic_management', 'clinical_tools', 'clinical_suite',
        'calculators', 'tools'
      ];
      let targetSection = tabParam.toLowerCase();
      if (targetSection === 'pets') targetSection = 'pet_ads';
      if (targetSection === 'blogs' || targetSection === 'articles') targetSection = 'news';
      if (targetSection === 'about_us') targetSection = 'about';
      if (targetSection === 'terms_of_service') targetSection = 'terms';
      if (targetSection === 'privacy_policy') targetSection = 'privacy';
      if (targetSection === 'support') targetSection = 'contact';
      if (targetSection === 'calculators' || targetSection === 'tools' || targetSection === 'clinical_suite') targetSection = 'clinical_tools';

      if (validSections.includes(targetSection) || validSections.includes(tabParam.toLowerCase())) {
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

  // Predictive background idle prefetch for top application sections
  useEffect(() => {
    initIdlePrefetch(currentUser);
  }, [currentUser]);

  // Dynamic SEO meta tags and Title management per active section
  useEffect(() => {
    const titles: Record<string, string> = {
      clinical_tools: "Veterinary Drug Dosage & Fluid Rate Calculators | VetAxis 360",
      clinical_suite: "Veterinary Clinical Calculation Suite & Multi-Species Solvers | VetAxis 360",
      explore: "Find Verified Veterinary Clinics, DVM Doctors & Emergency Animal Hospitals | VetAxis 360",
      jobs: "DVM Veterinary Careers, Hospital Jobs & Staff Recruitment | VetAxis 360",
      pet_ads: "Lost & Found Pets SOS Network, Pet Adoption & Classifieds | VetAxis 360",
      livestock: "Livestock Herd Management, Farm Health Ledgers & Dairy Care | VetAxis 360",
      marketplace: "Veterinary Medicine, Surgical Supplies & Pharmacy Marketplace | VetAxis 360",
      community: "Veterinary Clinical Discussions, Case Studies & DVM Insights | VetAxis 360",
      news: "Veterinary Clinical Guides & Animal Health Articles | VetAxis 360",
      subscription: "Practitioner Billing, Verified Badges & Premium Tiers | VetAxis 360",
      profile: "My Clinical Profile & Pet Medical Passports | VetAxis 360",
      about: "About VetAxis 360 | Pakistan & Global Veterinary Platform",
      terms: "Terms of Service | VetAxis 360",
      privacy: "Privacy Policy & Medical Data Security | VetAxis 360",
      contact: "Contact & Support | VetAxis 360"
    };

    const descriptions: Record<string, string> = {
      clinical_tools: "Calculate veterinary drug doses (mg/kg), AAHA IV fluid therapy drip rates, pet daily calorie portions, toxic emergency alerts, and cattle calving timelines.",
      clinical_suite: "Evidence-based veterinary calculations, Plumb's pharmacology, AAHA hydration resuscitation, and dairy farm economics optimizer.",
      explore: "Find certified veterinary clinics, 24/7 emergency pet doctors, and DVM specialists across Islamabad, Lahore, Karachi, Rawalpindi, and Peshawar.",
      jobs: "Browse latest veterinary surgeon, dairy farm consultant, and pet hospital job vacancies across Pakistan.",
      pet_ads: "Report lost dogs & cats, adopt rescue animals, and broadcast missing pet emergency alerts nationwide.",
      livestock: "Manage dairy cattle and buffalo herds, milk yield records, vaccination schedules, and disease alerts.",
      marketplace: "Buy and sell authentic veterinary pharmaceutical drugs, surgical instruments, diagnostic equipment, and animal feeds."
    };

    if (titles[activeSection]) {
      document.title = titles[activeSection];
    }
    if (descriptions[activeSection]) {
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) {
        metaDesc.setAttribute('content', descriptions[activeSection]);
      }
    }
  }, [activeSection]);

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

  const seenNotificationIdsRef = useRef<Set<string>>(new Set());
  const isFirstNotificationRunRef = useRef<boolean>(true);
  const lastReminderCheckRef = useRef<number>(0);

  // Lightweight SWR Data-Fetching Hook: Automatically revalidates notifications from Firestore on focus / tab return
  const {
    mutate: mutateNotifications,
  } = useSWR<VetNotification[]>(
    currentUser?.uid && !dbQuotaExceeded ? `user_notifications_${currentUser.uid}` : null,
    async () => {
      if (!currentUser?.uid) return [];

      // ─── Automated 6-hour Appointment reminders (Throttled to once every 120 seconds for performance) ──────────────────
      const nowMs = Date.now();
      if (isFirstNotificationRunRef.current || nowMs - lastReminderCheckRef.current > 120 * 1000) {
        lastReminderCheckRef.current = nowMs;
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
      return list;
    },
    {
      revalidateOnFocus: true, // Automatically revalidates when user returns from another tab
      revalidateOnReconnect: true,
      focusThrottleInterval: 3000,
      refreshInterval: 25000,
      onSuccess: (list) => {
        if (!list) return;
        if (isFirstNotificationRunRef.current) {
          // On first boot, mark existing unread notifications as seen so we don't spam popups for old interactions
          isFirstNotificationRunRef.current = false;
          list.forEach(n => seenNotificationIdsRef.current.add(n.id));
        } else {
          // Find any unread notification that we haven't seen in this session yet
          const newUnreads = list.filter(n => !n.read && !seenNotificationIdsRef.current.has(n.id));
          newUnreads.forEach(n => {
            seenNotificationIdsRef.current.add(n.id);
            const toastId = 'toast_' + n.id + '_' + Date.now();
            
            // Push toast popup with full notification ref for click handling
            setToasts(prev => [...prev, { id: toastId, message: n.message, type: n.type, notif: n }]);
            
            // Auto fade out after 5 seconds
            setTimeout(() => {
              setToasts(prev => prev.filter(t => t.id !== toastId));
            }, 5000);
          });
        }

        // Always sync the overall notifications list to keep badging correct
        setNotifications(list);
      }
    }
  );

  // Lightweight SWR Data-Fetching Hook: Automatically revalidates user profile from Firestore on tab focus
  const {
    mutate: mutateUserProfile,
  } = useSWR<UserProfile | null>(
    currentUser?.uid && !dbQuotaExceeded ? `user_profile_${currentUser.uid}` : null,
    async () => {
      if (!currentUser?.uid) return null;
      if (isFirebaseConfigured && db) {
        try {
          const userRef = doc(db, 'users', currentUser.uid);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            const profile = userSnap.data() as UserProfile;
            return injectTemporaryPlatinum(profile);
          }
        } catch (e) {
          console.warn('[VetAxis SWR] Error revalidating user profile on focus:', e);
        }
      }
      return currentUser;
    },
    {
      revalidateOnFocus: true, // When user returns from another browser tab, fetch latest Firestore profile state
      revalidateOnReconnect: true,
      focusThrottleInterval: 4000,
      onSuccess: (freshProfile) => {
        if (freshProfile && currentUser) {
          if (
            freshProfile.role !== currentUser.role ||
            freshProfile.isVerified !== currentUser.isVerified ||
            freshProfile.subscriptionTier !== currentUser.subscriptionTier ||
            freshProfile.name !== currentUser.name ||
            freshProfile.emailVerified !== currentUser.emailVerified ||
            freshProfile.profilePic !== currentUser.profilePic
          ) {
            console.log('[VetAxis SWR] User profile revalidated from Firestore on focus:', freshProfile.email);
            setCurrentUser(freshProfile);
            secureSetItem('va_session', JSON.stringify(freshProfile));
          }
        }
      }
    }
  );

  // Real-time unread messages tracking & synchronization
  useEffect(() => {
    if (!currentUser?.uid) {
      setUnreadMessagesCount(0);
      return;
    }

    const refreshUnread = () => {
      const count = ChatService.getUnreadMessagesCount(currentUser.uid);
      setUnreadMessagesCount(count);
    };

    refreshUnread();

    const handleNewChatMessage = () => {
      refreshUnread();
      mutateNotifications();
    };

    window.addEventListener('vetaxis_chat_new_message', handleNewChatMessage);
    window.addEventListener('vetaxis_notification_received', handleNewChatMessage);
    window.addEventListener('storage', refreshUnread);

    const unsubscribe = ChatService.subscribeToUserConversations(currentUser.uid, () => {
      refreshUnread();
    });

    return () => {
      window.removeEventListener('vetaxis_chat_new_message', handleNewChatMessage);
      window.removeEventListener('vetaxis_notification_received', handleNewChatMessage);
      window.removeEventListener('storage', refreshUnread);
      unsubscribe();
    };
  }, [currentUser?.uid, mutateNotifications]);

  const handleMarkAllAsRead = async () => {
    if (!currentUser) return;
    try {
      await NotificationService.markAllAsRead(currentUser.uid);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      mutateNotifications(prev => (prev || []).map(n => ({ ...n, read: true })), false);
    } catch (err) {
      console.error('Failed to mark notifications read:', err);
    }
  };

  const handleDeleteNotification = async (id: string) => {
    try {
      await NotificationService.deleteNotification(id, currentUser?.uid);
      setNotifications(prev => prev.filter(n => n.id !== id));
      mutateNotifications(prev => (prev || []).filter(n => n.id !== id), false);
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
      if (currentUser?.uid) {
        await NotificationService.markAllAsRead(currentUser.uid);
      }
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
    } else if (notif.targetType === 'broadcast' || notif.type === 'broadcast') {
      if (notif.targetId && notif.targetId !== notif.id && !notif.targetId.startsWith('bcast_')) {
        if (notif.targetId.startsWith('http://') || notif.targetId.startsWith('https://')) {
          try {
            window.open(notif.targetId, '_blank', 'noopener,noreferrer');
          } catch (e) {
            console.warn('Could not open external url:', e);
          }
        } else {
          handleNavigate(notif.targetId);
        }
      }
    } else if (notif.targetType === 'chat' || notif.type === 'chat_message') {
      const targetSenderId = notif.senderId;
      if (targetSenderId) {
        AuthService.fetchUserProfile(targetSenderId)
          .then((userObj) => {
            if (userObj) {
              setGlobalChatRecipient(userObj);
            } else {
              setGlobalChatRecipient({
                uid: targetSenderId,
                name: notif.senderName || 'Veterinarian',
                role: 'doctor',
                isVerified: true
              });
            }
          })
          .catch(() => {
            setGlobalChatRecipient({
              uid: targetSenderId,
              name: notif.senderName || 'Veterinarian',
              role: 'doctor',
              isVerified: true
            });
          });
      }
    }
  };

  const handleNavigate = (section: string) => {
    let normalized = section.toLowerCase();
    if (normalized === 'pets') normalized = 'pet_ads';
    if (normalized === 'blogs' || normalized === 'articles') normalized = 'news';
    if (normalized === 'about_us') normalized = 'about';
    if (normalized === 'terms_of_service') normalized = 'terms';
    if (normalized === 'privacy_policy') normalized = 'privacy';
    if (normalized === 'support') normalized = 'contact';

    setActiveSection(normalized);
    // Clear highlight tags during manual user shifts
    setHighlightPostId(null);
    setHighlightJobId(null);
    setHighlightApplicationId(null);
    setHighlightFarmId(null);
    setHighlightAppointmentId(null);

    // Sync URL without full page reload for Google Search and external deep-linking
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', normalized);
      window.history.pushState({}, '', url.toString());
    } catch (e) {
      console.warn('Could not update browser history:', e);
    }
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

  // Automated Broadcast Notification Delivery: Checks and delivers global admin alerts to all users (including users returning after days)
  useEffect(() => {
    const handleCheckBroadcasts = async () => {
      try {
        await BroadcastNotificationService.checkAndDispatchUnseenBroadcasts((bcast) => {
          const toastId = 'bcast_toast_' + bcast.id + '_' + Date.now();
          setToasts(prev => [
            ...prev,
            {
              id: toastId,
              message: `${bcast.title}: ${bcast.message}`,
              type: 'broadcast',
              notif: {
                id: 'bcast_notif_' + bcast.id,
                userId: currentUser?.uid || 'guest',
                senderId: bcast.authorId,
                senderName: bcast.authorName,
                type: 'broadcast',
                targetId: bcast.actionUrl || bcast.id,
                targetType: 'broadcast',
                message: `${bcast.title}: ${bcast.message}`,
                read: false,
                createdAt: bcast.createdAt
              }
            }
          ]);

          // Auto dismiss toast after 8 seconds
          setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== toastId));
          }, 8000);

          if (currentUser?.uid) {
            mutateNotifications();
          }
        });
      } catch (err) {
        console.warn('Error checking unseen broadcast notifications:', err);
      }
    };

    // Initial check on startup and when user profile is ready
    handleCheckBroadcasts();

    // Auto-register Web Push API subscription if notification permission is already granted
    if (BroadcastNotificationService.isPushManagerSupported() && BroadcastNotificationService.getNotificationPermission() === 'granted') {
      BroadcastNotificationService.subscribeToPushNotifications(currentUser).catch(err => {
        console.warn('[Web Push] Auto-subscription update error:', err);
      });
    }

    // Listen for Service Worker push messages delivered to the active window
    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'PUSH_NOTIFICATION_RECEIVED') {
        console.log('[Web Push] Received real-time push message in client:', event.data.payload);
        handleCheckBroadcasts();
        if (currentUser?.uid) {
          mutateNotifications();
        }
      }
    };

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
    }

    // Listen for live broadcast notifications fired across browser tabs/windows
    const handleDataUpdate = (e: any) => {
      if (e.detail?.entity === 'broadcasts' || e.detail?.entity === 'notifications') {
        handleCheckBroadcasts();
        if (currentUser?.uid) {
          mutateNotifications();
        }
      }
    };

    window.addEventListener('vetaxis_data_update', handleDataUpdate);
    return () => {
      window.removeEventListener('vetaxis_data_update', handleDataUpdate);
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
      }
    };
  }, [currentUser, mutateNotifications]);

  // Lightweight auto-scroller when any popup modal/dialog opens
  useEffect(() => {
    let lastActionTime = 0;
    
    const handlePopupOpened = (element: HTMLElement) => {
      const now = Date.now();
      if (now - lastActionTime < 300) return;
      lastActionTime = now;

      // Scroll the main screen viewport to top
      window.scrollTo({ top: 0, behavior: 'smooth' });
      element.scrollTo?.({ top: 0, behavior: 'smooth' });
      const dialogArea = element.querySelector?.('[role="dialog"]');
      if (dialogArea) {
        dialogArea.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
      }
    };

    const isModalElement = (node: Node): node is HTMLElement => {
      if (!(node instanceof HTMLElement)) return false;
      if (node.closest?.('[data-no-scroll="true"]')) return false;
      const cn = node.className;
      if (typeof cn !== 'string') return false;
      return (node.classList.contains('fixed') && !node.classList.contains('pointer-events-none')) ||
             node.getAttribute('role') === 'dialog';
    };

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          for (const node of Array.from(mutation.addedNodes)) {
            if (isModalElement(node)) {
              handlePopupOpened(node);
              return;
            }
          }
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: false
    });

    return () => observer.disconnect();
  }, []);



  // Sync and validate that the stored session user profile still exists in Firestore or Fallback DB
  // Also runs a real-time periodic clock to guarantee user downgrades when subscription duration runs out
  useEffect(() => {
    if (isAuthInitializing || dbQuotaExceeded) return;
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
  }, [currentUser?.uid, dbQuotaExceeded, isAuthInitializing]);

  // Real-time monthly/trial subscription expiration checker (checked once per minute to preserve CPU)
  useEffect(() => {
    if (isAuthInitializing || !currentUser?.subscriptionTier || !currentUser?.subscriptionExpiresAt || dbQuotaExceeded) return;
    
    let active = true;
    const checkExpiry = async () => {
      if (Date.now() > currentUser.subscriptionExpiresAt) {
        const expiredTier = currentUser.subscriptionTier;
        console.warn(`[VetAxis] Active premium ${expiredTier} subscription has ended. Auto-downgrading.`);
        
        try {
          // 1. Create a persistent system notification in the DB
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

    // Check every 60 seconds to eliminate unnecessary CPU cycles
    const timerId = setInterval(checkExpiry, 60000);
    
    return () => {
      active = false;
      clearInterval(timerId);
    };
  }, [currentUser?.uid, currentUser?.subscriptionTier, currentUser?.subscriptionExpiresAt, dbQuotaExceeded, isAuthInitializing]);

  // Real-time online presence heartbeat
  useEffect(() => {
    if (isAuthInitializing || !currentUser || dbQuotaExceeded) return;

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
  }, [currentUser?.uid, dbQuotaExceeded, isAuthInitializing]);

  const handleAuthSuccess = (user: UserProfile) => {
    setCurrentUser(user);
    mutateUserProfile(user, false);
    setActiveSection('explore');
  };

  const handleLogout = async () => {
    await AuthService.signOut();
    setCurrentUser(null);
    setNotifications([]);
    mutateUserProfile(null, false);
    mutateNotifications([], false);
  };

  const handleUpdateUserProfile = (updated: UserProfile) => {
    setCurrentUser(updated);
    mutateUserProfile(updated, false);
  };

  if (isAuthInitializing) {
    return (
      <div className="min-h-screen bg-[#fdfbf7] flex flex-col items-center justify-center p-6 select-none relative overflow-hidden">
        {/* Subtle Background 3D Glow */}
        <div className="absolute w-96 h-96 rounded-full bg-[#f4efe4] blur-3xl opacity-60 pointer-events-none" />
        
        <div className="relative z-10">
          <ThreeDAnimalLoader
            message="Connecting to VetAxis 360"
            subMessage="Securing connection to clinical & farm database..."
          />
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
        onOpenMessenger={() => setIsMessengerOpen(true)}
        unreadMessagesCount={unreadMessagesCount}
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
        <Suspense fallback={<SectionLoadingFallback />}>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
            >
              {activeSection === 'explore' && (
                <ExploreFeed
                  currentUser={currentUser}
                  onUpdateUser={handleUpdateUserProfile}
                  activeSection={activeSection}
                  onNavigate={handleNavigate}
                  highlightClinicId={highlightClinicId}
                  highlightDoctorId={highlightDoctorId}
                  initialCity={initialCity}
                  initialFilter={initialFilter}
                  onOpenChat={(prof) => setGlobalChatRecipient(prof)}
                />
              )}

              {activeSection === 'community' && (
                <CommunityFeed 
                  currentUser={currentUser} 
                  highlightPostId={highlightPostId}
                />
              )}

              {activeSection === 'marketplace' && (
                <Marketplace 
                  currentUser={currentUser} 
                  onNavigate={setActiveSection} 
                  highlightProductId={highlightProductId}
                />
              )}

              {activeSection === 'pet_ads' && (
                <PetAds 
                  currentUser={currentUser} 
                  onNavigate={(section, highlightId) => {
                    if (highlightId) {
                      setHighlightPostId(highlightId);
                    }
                    setActiveSection(section);
                  }}
                  highlightAdId={highlightAdId}
                  initialType={initialPetType}
                />
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

              {activeSection === 'admin' && currentUser && (currentUser.email?.toLowerCase() === 'vetaxis360@gmail.com' || currentUser.email === 'saliskhan214@gmail.com' || currentUser.isAdmin === true) && (
                <AdminPanel currentUser={currentUser} />
              )}

              {activeSection === 'clinic_management' && currentUser && currentUser.role === 'clinic' && (
                <ClinicManagement 
                  user={currentUser} 
                  highlightAppointmentId={highlightAppointmentId}
                  onClearHighlightAppointment={() => setHighlightAppointmentId(null)}
                />
              )}

              {activeSection === 'news' && (
                <BlogSection currentUser={currentUser} />
              )}

              {(activeSection === 'clinical_tools' || activeSection === 'clinical_suite') && (
                <VeterinaryClinicalSuite 
                  currentUser={currentUser}
                  onNavigate={handleNavigate}
                  initialTool={initialClinicalTool}
                />
              )}

              {activeSection === 'about' && (
                <AboutUsPage onNavigate={handleNavigate} />
              )}

              {activeSection === 'terms' && (
                <TermsOfServicePage onNavigate={handleNavigate} />
              )}

              {activeSection === 'privacy' && (
                <PrivacyPolicyPage onNavigate={handleNavigate} />
              )}

              {activeSection === 'careers_safety' && (
                <CareersSafetyProtocolPage onNavigate={handleNavigate} />
              )}

              {activeSection === 'contact' && (
                <ContactSupportPage onNavigate={handleNavigate} />
              )}

              {!['explore', 'community', 'marketplace', 'pet_ads', 'jobs', 'livestock', 'profile', 'subscription', 'admin', 'clinic_management', 'news', 'clinical_tools', 'clinical_suite', 'about', 'terms', 'privacy', 'contact', 'careers_safety'].includes(activeSection) && (
                <PageNotFound onBackHome={() => setActiveSection('explore')} onNavigate={(sect) => setActiveSection(sect)} />
              )}
            </motion.div>
          </AnimatePresence>
        </Suspense>
      </main>

      {/* COMPLIANT GLOBAL FOOTER NAVIGATION */}
      <Footer onNavigate={handleNavigate} activeSection={activeSection} />

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
              className={`rounded-xl p-4 shadow-xl flex items-start gap-3 relative overflow-hidden text-[#3c3c3b] pointer-events-auto cursor-pointer transition-colors ${
                toast.type === 'broadcast'
                  ? 'bg-amber-50/95 border-2 border-amber-400 border-b-[5px] border-b-amber-500 hover:bg-amber-100/90'
                  : 'bg-white border border-[#e3dec9] border-b-[5px] border-b-[#cdc6ad] hover:bg-[#fcf9f2]'
              }`}
            >
              <div className="text-xl filter drop-shadow select-none mt-0.5">
                {toast.type === 'like' && '❤️'}
                {toast.type === 'comment' && '💬'}
                {toast.type === 'apply' && '📄'}
                {toast.type === 'status_change' && '✨'}
                {toast.type === 'broadcast' && '📢'}
                {(toast.type === 'chat_message' || toast.type === 'chat') && '🩺'}
              </div>
              <div className="flex-1 pr-6 text-left">
                <span className={`text-[9px] tracking-wider uppercase font-black block leading-none ${
                  toast.type === 'broadcast' 
                    ? 'text-amber-800' 
                    : (toast.type === 'chat_message' || toast.type === 'chat')
                    ? 'text-emerald-800'
                    : 'text-[#5a5a40]'
                }`}>
                  {toast.type === 'broadcast' 
                    ? '🚨 ADMIN BROADCAST ANNOUNCEMENT (CLICK TO VIEW)' 
                    : (toast.type === 'chat_message' || toast.type === 'chat')
                    ? '💬 CLINICAL CONSULTATION MESSAGE (CLICK TO REPLY)'
                    : 'ACTIVITY BULLETIN (CLICK TO VIEW)'}
                </span>
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

      {/* ADVANCED 3D ANIMAL SYSTEM LOADING PORTAL */}
      <AnimatePresence>
        {isLoadingSystem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-stone-900/70 backdrop-blur-md z-[99999] flex flex-col items-center justify-center p-6"
          >
            <div className="bg-[#fdfbf7] p-8 rounded-3xl border border-[#e3dec9] border-b-[6px] border-[#cdc6ad] shadow-2xl max-w-sm w-full mx-4">
              <ThreeDAnimalLoader
                message={loadingMessage || 'Processing Ledger Request...'}
                subMessage="Synchronizing secure veterinary data"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Suspense fallback={null}>
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

        {/* GLOBAL CLINICAL MESSENGER MODAL (15-Day Auto Disappearing Conversations) */}
        <AnimatePresence>
          {isMessengerOpen && currentUser && (
            <MessengerModal
              isOpen={isMessengerOpen}
              onClose={() => setIsMessengerOpen(false)}
              currentUser={currentUser}
              onOpenChatWith={(targetUser) => {
                setGlobalChatRecipient(targetUser);
              }}
              onExploreClinicians={() => handleNavigate('explore')}
            />
          )}
        </AnimatePresence>

        {/* GLOBAL DIRECT CONSULTATION CHAT MODAL */}
        <AnimatePresence>
          {globalChatRecipient && currentUser && (
            <ChatModal
              isOpen={!!globalChatRecipient}
              onClose={() => setGlobalChatRecipient(null)}
              recipient={globalChatRecipient}
              currentUser={currentUser}
            />
          )}
        </AnimatePresence>
      </Suspense>

    </div>
  );
}
