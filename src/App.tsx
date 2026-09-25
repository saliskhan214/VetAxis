import { useState, useEffect } from 'react';
import { UserProfile, VetNotification } from './types';
import { getLocalSession, AuthService, NotificationService, injectTemporaryPlatinum, secureSetItem } from './lib/storage';
import { testConnection, isFirebaseConfigured, auth, db } from './lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { ClinicService } from './lib/clinicService';
import { BrowserNotificationService } from './lib/browserNotification';

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
import { LivestockPublicPortal } from './components/LivestockPublicPortal';
import { SubscriptionPortal } from './components/SubscriptionPortal';
import { SubscriptionPricingPublic } from './components/SubscriptionPricingPublic';
import { GuestAnimalViewer } from './components/GuestAnimalViewer';
import { ClinicManagement } from './components/ClinicManagement';
import { AboutUsDirectory } from './components/AboutUsDirectory';
import { ThreeDAnimalLoader } from './components/ThreeDAnimalLoader';
import { BlogSection } from './components/BlogSection';
import { TermsOfServicePage, PrivacyPolicyPage, AboutUsPage, ContactSupportPage } from './components/LegalAndAbout';
import { VeterinaryClinicalSuite } from './components/VeterinaryClinicalSuite';
import { Messenger } from './components/Messenger';
import { Footer } from './components/Footer';
import { SearchDiscoveryHub } from './components/SearchDiscoveryHub';
import PageNotFound from './components/PageNotFound';
import { PrefetchService } from './lib/prefetchService';

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
  const [highlightClinicId, setHighlightClinicId] = useState<string | null>(null);
  const [highlightDoctorId, setHighlightDoctorId] = useState<string | null>(null);
  const [highlightProductId, setHighlightProductId] = useState<string | null>(null);
  const [highlightAdId, setHighlightAdId] = useState<string | null>(null);
  const [initialCity, setInitialCity] = useState<string | null>(null);
  const [initialFilter, setInitialFilter] = useState<string | null>(null);
  const [initialPetType, setInitialPetType] = useState<string | null>(null);
  const [scannedAnimalRecordId, setScannedAnimalRecordId] = useState<string | null>(null);
  const [temporaryBypassGuestForAuth, setTemporaryBypassGuestForAuth] = useState<boolean>(false);
  const [messengerTargetUser, setMessengerTargetUser] = useState<UserProfile | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalContext, setAuthModalContext] = useState<string | null>(null);

  const triggerAuthWall = (context?: string) => {
    setAuthModalContext(context || 'sign in to continue');
    setIsAuthModalOpen(true);
  };

  const handleStartChatWith = (targetUser: UserProfile) => {
    setMessengerTargetUser(targetUser);
    setActiveSection('messenger');
  };

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

    const queryParam = params.get('q') || params.get('search') || params.get('query');
    if (queryParam) {
      const qLower = queryParam.toLowerCase().trim();
      if (
        qLower.includes('emergency') || qLower.includes('vet near me') || qLower.includes('clinic near me') || 
        qLower.includes('walk in') || qLower.includes('cheap vet') || qLower.includes('mobile vet') || 
        qLower.includes('cat only') || qLower.includes('exotic') || qLower.includes('avian') || 
        qLower.includes('equine') || qLower.includes('reptile') || qLower.includes('ultrasound') || 
        qLower.includes('x ray') || qLower.includes('vaccin') || qLower.includes('spay') || 
        qLower.includes('dental') || qLower.includes('low cost') || qLower.includes('carecredit') ||
        qLower.includes('doctor') || qLower.includes('clinic')
      ) {
        setActiveSection('explore');
        setInitialFilter(queryParam);
      } else if (
        qLower.includes('parvo') || qLower.includes('blood test') || qLower.includes('normal range') || 
        qLower.includes('kidney') || qLower.includes('ckd') || qLower.includes('bloat') || 
        qLower.includes('gdv') || qLower.includes('distemper') || qLower.includes('fip') || 
        qLower.includes('dna') || qLower.includes('calculator') || qLower.includes('dosage')
      ) {
        setActiveSection('clinical_tools');
      } else if (
        qLower.includes('community') || qLower.includes('forum') || qLower.includes('vin') || 
        qLower.includes('vet tech') || qLower.includes('peer support') || qLower.includes('case stud') || 
        qLower.includes('radiograph') || qLower.includes('surgery protocol') || qLower.includes('ce webinar') || 
        qLower.includes('ask a vet')
      ) {
        setActiveSection('community');
      } else if (
        qLower.includes('prescription') || qLower.includes('medicine') || qLower.includes('flea') || 
        qLower.includes('heartworm') || qLower.includes('amoxicillin') || qLower.includes('glucosamine') || 
        qLower.includes('shampoo') || qLower.includes('renal diet') || qLower.includes('ultrasound machine') || 
        qLower.includes('anesthesia') || qLower.includes('autoclave') || qLower.includes('cage') || 
        qLower.includes('scaler') || qLower.includes('surgical instrument')
      ) {
        setActiveSection('marketplace');
      } else if (
        qLower.includes('adoption') || qLower.includes('adopt') || qLower.includes('shelter') || 
        qLower.includes('rescue') || qLower.includes('foster') || qLower.includes('breeder') || 
        qLower.includes('puppy scam')
      ) {
        setActiveSection('pet_ads');
      } else if (
        qLower.includes('travel') || qLower.includes('usda') || qLower.includes('iata') || 
        qLower.includes('cdc') || qLower.includes('microchip') || qLower.includes('recall') || 
        qLower.includes('aaha') || qLower.includes('avian influenza') || qLower.includes('bird flu')
      ) {
        setActiveSection('news');
      } else {
        setActiveSection('directory');
      }
    }

    if (tabParam) {
      const validSections = [
        'explore', 'community', 'marketplace', 'pet_ads', 'jobs', 
        'livestock', 'profile', 'subscription', 'admin', 'news', 
        'blogs', 'articles', 'about', 'about_us', 'terms', 
        'terms_of_service', 'privacy', 'privacy_policy', 'contact', 
        'support', 'clinic_management', 'clinical_tools', 'clinical_suite',
        'calculators', 'calculator', 'tools', 'messenger',
        'directory', 'search_hub', 'seo', 'search_portal'
      ];
      let targetSection = tabParam.toLowerCase();
      if (targetSection === 'pets') targetSection = 'pet_ads';
      if (targetSection === 'blogs' || targetSection === 'articles') targetSection = 'news';
      if (targetSection === 'about_us') targetSection = 'about';
      if (targetSection === 'terms_of_service') targetSection = 'terms';
      if (targetSection === 'privacy_policy') targetSection = 'privacy';
      if (targetSection === 'support') targetSection = 'contact';
      if (targetSection === 'clinical_suite' || targetSection === 'calculators' || targetSection === 'calculator' || targetSection === 'tools') targetSection = 'clinical_tools';
      if (targetSection === 'search_hub' || targetSection === 'seo' || targetSection === 'search_portal') targetSection = 'directory';

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

  // Dynamic SEO meta tags and Title management per active section
  useEffect(() => {
    const titles: Record<string, string> = {
      explore: "Vet Near Me (24/7 Emergency & Walk-in), Clinics & Animal Doctors | VetAxis 360",
      clinical_tools: "Pet DS, Disease Diagnostics, Blood Test Ranges & Clinical Suite | VetAxis 360",
      jobs: "DVM Veterinary Careers, Hospital Jobs & Staff Recruitment | VetAxis 360",
      pet_ads: "Dog & Cat Adoption Shelters, Rescues & Lost Pet SOS | VetAxis 360",
      livestock: "Livestock Herd Management, Farm Health Ledgers & Dairy Care | VetAxis 360",
      marketplace: "Veterinary Prescription Medicine, Surgical Equipment & Supplies | VetAxis 360",
      community: "Veterinary Community Forum, Case Studies, VIN Discussions & CE | VetAxis 360",
      news: "Animal Health Guidelines, Pet Travel (USDA / IATA / CDC) & AAHA | VetAxis 360",
      subscription: "Practitioner Billing, Verified Badges & Premium Tiers | VetAxis 360",
      profile: "My Clinical Profile & Pet Medical Passports | VetAxis 360",
      about: "About VetAxis 360 | Pakistan & Global Veterinary Platform",
      directory: "Veterinary Intelligence & Search Directory — 8 Top Query Categories | VetAxis 360",
      terms: "Terms of Service | VetAxis 360",
      privacy: "Privacy Policy & Medical Data Security | VetAxis 360",
      contact: "Contact & Support | VetAxis 360"
    };

    const descriptions: Record<string, string> = {
      explore: "Find verified 24/7 emergency vets near me open now, affordable walk-in pet clinics, mobile home visits, and species specialists across Islamabad, Lahore, Karachi, and Pakistan.",
      clinical_tools: "Clinical veterinary intelligence suite: Canine blood test normal reference ranges, Parvovirus day-by-day triage, Feline CKD IRIS staging, GDV bloat protocols, and drug calculators.",
      jobs: "Browse open veterinary jobs, hospital vacancies, and farm assistant positions across Pakistan, or recruit verified DVM professionals on VetAxis 360.",
      pet_ads: "Adopt rescue dogs and cats from verified shelters, find missing pets via instant SOS broadcasts, and review safe pet adoption guidelines.",
      livestock: "Dairy and livestock health management: maintain animal records, track vaccinations, lactation logs, and herd disease alerts.",
      marketplace: "Order veterinary prescription medicine online: antibiotics, flea & tick chewables, heartworm pills, canine joint supplements, ultrasound machines, and surgical instrument sets.",
      community: "Connect with veterinarians, veterinary technicians, and DVM students. Share clinical radiology cases, surgery tips, and access continuing education webinars.",
      news: "Official veterinary guidelines: International pet travel (USDA APHIS, IATA crate sizes, CDC rabies rules), AAHA puppy vaccine schedules, and FDA pet food recalls.",
      subscription: "Veterinary practitioner subscriptions: verify clinical credentials, publish billboard listings, and enable direct appointment booking.",
      profile: "Manage your veterinary practitioner credentials, client bookings, and pet medical health passports.",
      about: "Learn about VetAxis 360, Pakistan's premier veterinary care and clinical intelligence ecosystem.",
      directory: "Search Pakistan and global veterinary queries: 24/7 emergency clinics, walk-ins, DVM forums, Parvovirus day-by-day guides, blood normal ranges, and pet travel guidelines.",
      terms: "Terms of Service and clinical usage policies for the VetAxis 360 platform.",
      privacy: "Privacy policy and veterinary medical data protection standards on VetAxis 360.",
      contact: "Get in touch with the VetAxis 360 customer support and clinical emergency response triage team."
    };

    if (titles[activeSection]) {
      document.title = titles[activeSection];

      // Update meta description
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc && descriptions[activeSection]) {
        metaDesc.setAttribute('content', descriptions[activeSection]);
      }

      // Update og:title & twitter:title
      const ogTitle = document.querySelector('meta[property="og:title"]');
      if (ogTitle) ogTitle.setAttribute('content', titles[activeSection]);
      const twTitle = document.querySelector('meta[name="twitter:title"]');
      if (twTitle) twTitle.setAttribute('content', titles[activeSection]);

      // Update og:description & twitter:description
      if (descriptions[activeSection]) {
        const ogDesc = document.querySelector('meta[property="og:description"]');
        if (ogDesc) ogDesc.setAttribute('content', descriptions[activeSection]);
        const twDesc = document.querySelector('meta[name="twitter:description"]');
        if (twDesc) twDesc.setAttribute('content', descriptions[activeSection]);
      }

      // Update canonical URL & og:url
      try {
        const canonicalUrl = `${window.location.origin}/?tab=${activeSection}`;
        const canonical = document.querySelector('link[rel="canonical"]');
        if (canonical) canonical.setAttribute('href', canonicalUrl);
        const ogUrl = document.querySelector('meta[property="og:url"]');
        if (ogUrl) ogUrl.setAttribute('content', canonicalUrl);
      } catch (e) {
        // Ignored in non-browser context
      }
    }
  }, [activeSection]);

  // Predictive Movement & Pre-fetching Engine initialization
  useEffect(() => {
    PrefetchService.warmupIdle(currentUser?.uid);
  }, [currentUser?.uid]);

  // Predictive prefetch on active section transition
  useEffect(() => {
    if (activeSection === 'explore') {
      PrefetchService.prefetchHome();
    } else {
      PrefetchService.prefetchOnIntent(activeSection, currentUser?.uid);
    }
  }, [activeSection, currentUser?.uid]);

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
            
            // Native Browser Notification Dispatch
            if (BrowserNotificationService.isSupported() && BrowserNotificationService.getPermission() === 'granted') {
              const notifTitle = n.title || (n.type === 'admin_broadcast' ? '📢 VetAxis Platform Announcement' : (n.senderName ? `${n.senderName}` : 'VetAxis 360 Notification'));
              BrowserNotificationService.showNotification(notifTitle, {
                body: n.message,
                tag: n.id,
                requireInteraction: n.priority === 'urgent' || n.type === 'admin_broadcast',
                onClick: () => {
                  window.focus();
                  handleNotificationClick(n);
                }
              });
            }

            // Auto fade out after 5 seconds (or 8s for broadcasts)
            const fadeTimeout = n.type === 'admin_broadcast' ? 8000 : 5000;
            setTimeout(() => {
              if (isMounted) {
                setToasts(prev => prev.filter(t => t.id !== toastId));
              }
            }, fadeTimeout);
          });
        }

        // Always sync the overall notifications list to keep badging correct
        setNotifications(list);
      } catch (err) {
        console.error('Error fetching notification logs:', err);
      }
    };

    // Listen to realtime cross-tab broadcast notifications
    const unsubBroadcast = BrowserNotificationService.onBroadcast((payload) => {
      if (!isMounted) return;
      const isTargeted = payload.targetAudience === 'all' || (currentUser && currentUser.role === payload.targetAudience);
      if (!isTargeted) return;

      const toastId = 'toast_bcast_' + payload.broadcastId + '_' + Date.now();
      const syntheticNotif: VetNotification = {
        id: 'notif_' + payload.broadcastId + '_' + Date.now(),
        userId: currentUser?.uid || '',
        senderId: 'admin',
        senderName: payload.senderName || 'VetAxis Administration',
        type: 'admin_broadcast',
        targetId: payload.broadcastId,
        targetType: 'broadcast',
        title: payload.title,
        message: payload.message,
        priority: payload.priority,
        read: false,
        createdAt: payload.createdAt || Date.now()
      };

      seenIds.add(syntheticNotif.id);
      setNotifications(prev => [syntheticNotif, ...prev]);

      setToasts(prev => [...prev, {
        id: toastId,
        message: payload.message,
        type: 'admin_broadcast' as any,
        notif: syntheticNotif
      }]);

      if (payload.sendBrowser && BrowserNotificationService.isSupported() && BrowserNotificationService.getPermission() === 'granted') {
        BrowserNotificationService.showNotification(payload.title || '📢 VetAxis Platform Announcement', {
          body: payload.message,
          tag: payload.broadcastId,
          requireInteraction: payload.priority === 'urgent',
          onClick: () => {
            window.focus();
            handleNotificationClick(syntheticNotif);
          }
        });
      }

      setTimeout(() => {
        if (isMounted) {
          setToasts(prev => prev.filter(t => t.id !== toastId));
        }
      }, 8000);
    });

    // Run immediately first time
    checkNotifications(true);

    // Polling interval throttled to every 25 seconds to respect Firestore free tier limits and prevent quota exhaustion
    const interval = setInterval(() => {
      checkNotifications(false);
    }, 25000);

    return () => {
      isMounted = false;
      clearInterval(interval);
      unsubBroadcast();
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
    let normalized = section.toLowerCase();
    if (normalized === 'pets') normalized = 'pet_ads';
    if (normalized === 'blogs' || normalized === 'articles') normalized = 'news';
    if (normalized === 'about_us') normalized = 'about';
    if (normalized === 'terms_of_service') normalized = 'terms';
    if (normalized === 'privacy_policy') normalized = 'privacy';
    if (normalized === 'support') normalized = 'contact';
    if (normalized === 'clinical_suite' || normalized === 'calculators' || normalized === 'calculator' || normalized === 'tools') normalized = 'clinical_tools';

    const PRIVATE_SECTIONS = ['messenger', 'profile', 'admin', 'clinic_management'];
    if (!currentUser && PRIVATE_SECTIONS.includes(normalized)) {
      triggerAuthWall(`sign in to access ${normalized.replace('_', ' ')}`);
      return;
    }

    triggerLoading(`Opening ${normalized.replace('_', ' ').toUpperCase()}...`, 400);
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
                const data = userSnap.data() as UserProfile;
                const profile: UserProfile = { ...data, uid: data.uid || firebaseUser.uid };
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

  // Real-time precise monthly/trial subscription expiration checker
  useEffect(() => {
    if (isAuthInitializing || !currentUser?.subscriptionTier || !currentUser?.subscriptionExpiresAt || dbQuotaExceeded) return;
    
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
    setIsAuthModalOpen(false);
    setAuthModalContext(null);
    setTemporaryBypassGuestForAuth(false);
  };

  const handleLogout = async () => {
    await AuthService.signOut();
    setCurrentUser(null);
    setActiveSection('explore');
  };

  const handleUpdateUserProfile = (updated: UserProfile) => {
    setCurrentUser(updated);
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
        onGoToAuth={() => {
          setTemporaryBypassGuestForAuth(true);
          triggerAuthWall('sign in or create an account to view full clinical details');
        }}
        onClear={() => setScannedAnimalRecordId(null)}
      />
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
        onSignInClick={() => triggerAuthWall()}
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
                highlightClinicId={highlightClinicId}
                highlightDoctorId={highlightDoctorId}
                initialCity={initialCity}
                initialFilter={initialFilter}
                onStartChat={handleStartChatWith}
                onRequireAuth={triggerAuthWall}
              />
            )}

            {activeSection === 'messenger' && (
              currentUser ? (
                <Messenger
                  currentUser={currentUser}
                  initialTargetUser={messengerTargetUser}
                  onClearInitialTarget={() => setMessengerTargetUser(null)}
                  onNavigateHome={() => setActiveSection('explore')}
                />
              ) : (
                <div className="bg-white border border-[#e3dec9] border-b-[4px] border-b-[#cdc6ad] p-8 md:p-12 rounded-3xl text-center max-w-xl mx-auto my-12 space-y-4 shadow-sm">
                  <div className="text-4xl">💬</div>
                  <h2 className="text-2xl font-serif font-black text-stone-800">Veterinary Clinical Telehealth Chat</h2>
                  <p className="text-sm text-stone-600 leading-relaxed">
                    Connect directly with verified veterinarians, clinics, and specialists across Pakistan for real-time medical inquiries and case updates.
                  </p>
                  <button 
                    onClick={() => triggerAuthWall('sign in to message veterinarians')} 
                    className="btn-tactile-3d-primary py-3 px-6 text-sm font-bold inline-flex items-center gap-2 cursor-pointer"
                  >
                    <span>🔐</span>
                    <span>Sign In to Start Chat</span>
                  </button>
                </div>
              )
            )}

            {activeSection === 'community' && (
              <CommunityFeed 
                currentUser={currentUser} 
                highlightPostId={highlightPostId}
                onRequireAuth={triggerAuthWall}
              />
            )}

            {activeSection === 'marketplace' && (
              <Marketplace 
                currentUser={currentUser} 
                onNavigate={setActiveSection} 
                highlightProductId={highlightProductId}
                onRequireAuth={triggerAuthWall}
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
                onRequireAuth={triggerAuthWall}
              />
            )}

            {activeSection === 'jobs' && (
              <JobBoard 
                currentUser={currentUser} 
                highlightJobId={highlightJobId}
                highlightApplicationId={highlightApplicationId}
                onRequireAuth={triggerAuthWall}
              />
            )}

            {activeSection === 'livestock' && (
              currentUser ? (
                <LivestockManagement 
                  currentUser={currentUser} 
                  highlightFarmId={highlightFarmId}
                  scannedAnimalRecordId={scannedAnimalRecordId}
                  onClearScannedAnimal={() => setScannedAnimalRecordId(null)}
                />
              ) : (
                <LivestockPublicPortal 
                  onSignIn={() => triggerAuthWall('sign in to manage your livestock herds')} 
                  onNavigate={handleNavigate}
                />
              )
            )}

            {activeSection === 'profile' && (
              currentUser ? (
                <ProfilePage
                  currentUser={currentUser}
                  onUpdateUser={handleUpdateUserProfile}
                  onDeleteSuccess={handleLogout}
                />
              ) : (
                <div className="bg-white border border-[#e3dec9] border-b-[4px] border-b-[#cdc6ad] p-8 md:p-12 rounded-3xl text-center max-w-xl mx-auto my-12 space-y-4 shadow-sm">
                  <div className="text-4xl">👤</div>
                  <h2 className="text-2xl font-serif font-black text-stone-800">Member & Practitioner Profile</h2>
                  <p className="text-sm text-stone-600 leading-relaxed">
                    Sign in to view your pet passports, practitioner badges, appointment schedule, and security settings.
                  </p>
                  <button 
                    onClick={() => triggerAuthWall('sign in to view your profile')} 
                    className="btn-tactile-3d-primary py-3 px-6 text-sm font-bold inline-flex items-center gap-2 cursor-pointer"
                  >
                    <span>🔐</span>
                    <span>Sign In / Register</span>
                  </button>
                </div>
              )
            )}

            {activeSection === 'subscription' && (
              currentUser ? (
                <SubscriptionPortal
                  currentUser={currentUser}
                  onUpdateUser={handleUpdateUserProfile}
                  onNavigateToSection={handleNavigate}
                />
              ) : (
                <SubscriptionPricingPublic
                  onSignIn={() => triggerAuthWall('sign in to select your practitioner subscription plan')}
                  onNavigate={handleNavigate}
                />
              )
            )}

            {activeSection === 'admin' && (
              currentUser && (currentUser.email?.toLowerCase() === 'vetaxis360@gmail.com' || currentUser.email === 'saliskhan214@gmail.com' || currentUser.isAdmin === true) ? (
                <AdminPanel currentUser={currentUser} />
              ) : (
                <div className="bg-white border border-[#e3dec9] border-b-[4px] border-b-[#cdc6ad] p-8 md:p-12 rounded-3xl text-center max-w-xl mx-auto my-12 space-y-4 shadow-sm">
                  <div className="text-4xl">🛡️</div>
                  <h2 className="text-2xl font-serif font-black text-stone-800">Administration Console</h2>
                  <p className="text-sm text-stone-600 leading-relaxed">
                    Access to system auditing, practitioner approvals, and database tools requires verified administrative credentials.
                  </p>
                  <button 
                    onClick={() => triggerAuthWall('sign in with administrator credentials')} 
                    className="btn-tactile-3d-primary py-3 px-6 text-sm font-bold inline-flex items-center gap-2 cursor-pointer"
                  >
                    <span>🔐</span>
                    <span>Admin Sign In</span>
                  </button>
                </div>
              )
            )}

            {activeSection === 'clinic_management' && (
              currentUser && currentUser.role === 'clinic' ? (
                <ClinicManagement 
                  user={currentUser} 
                  highlightAppointmentId={highlightAppointmentId}
                  onClearHighlightAppointment={() => setHighlightAppointmentId(null)}
                />
              ) : (
                <div className="bg-white border border-[#e3dec9] border-b-[4px] border-b-[#cdc6ad] p-8 md:p-12 rounded-3xl text-center max-w-xl mx-auto my-12 space-y-4 shadow-sm">
                  <div className="text-4xl">🏥</div>
                  <h2 className="text-2xl font-serif font-black text-stone-800">Veterinary Clinic Portal</h2>
                  <p className="text-sm text-stone-600 leading-relaxed">
                    Hospital scheduling, client queue management, and electronic patient check-ins are exclusively available to verified clinics.
                  </p>
                  <button 
                    onClick={() => triggerAuthWall('sign in with your clinic account')} 
                    className="btn-tactile-3d-primary py-3 px-6 text-sm font-bold inline-flex items-center gap-2 cursor-pointer"
                  >
                    <span>🔐</span>
                    <span>Clinic Sign In</span>
                  </button>
                </div>
              )
            )}

            {activeSection === 'news' && (
              <BlogSection 
                currentUser={currentUser} 
                onRequireAuth={triggerAuthWall}
              />
            )}

            {(activeSection === 'clinical_tools' || activeSection === 'clinical_suite') && (
              <VeterinaryClinicalSuite 
                currentUser={currentUser}
                onNavigate={handleNavigate}
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

            {activeSection === 'contact' && (
              <ContactSupportPage onNavigate={handleNavigate} />
            )}

            {(activeSection === 'directory' || activeSection === 'search_hub' || activeSection === 'seo' || activeSection === 'search_portal') && (
              <SearchDiscoveryHub 
                onNavigate={(section, param) => {
                  if (param) {
                    if (section === 'explore') setInitialFilter(param);
                  }
                  handleNavigate(section);
                }}
              />
            )}

            {!['explore', 'messenger', 'community', 'marketplace', 'pet_ads', 'jobs', 'livestock', 'profile', 'subscription', 'admin', 'clinic_management', 'news', 'clinical_tools', 'clinical_suite', 'about', 'terms', 'privacy', 'contact', 'directory', 'search_hub', 'seo', 'search_portal'].includes(activeSection) && (
              <PageNotFound onBackHome={() => setActiveSection('explore')} onNavigate={(sect) => setActiveSection(sect)} />
            )}
          </motion.div>
        </AnimatePresence>
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
              className="bg-white border border-[#e3dec9] border-b-[5px] border-b-[#cdc6ad] rounded-xl p-4 shadow-xl flex items-start gap-3 relative overflow-hidden text-[#3c3c3b] pointer-events-auto cursor-pointer hover:bg-[#fcf9f2] transition-colors"
            >
              <div className="text-xl filter drop-shadow select-none mt-0.5">
                {toast.type === 'like' && '❤️'}
                {toast.type === 'comment' && '💬'}
                {toast.type === 'apply' && '📄'}
                {toast.type === 'status_change' && '✨'}
                {toast.type === 'admin_broadcast' && '📢'}
              </div>
              <div className="flex-1 pr-6 text-left">
                <span className={`text-[9px] tracking-wider uppercase font-black block leading-none ${
                  toast.type === 'admin_broadcast' ? 'text-amber-700' : 'text-[#5a5a40]'
                }`}>
                  {toast.type === 'admin_broadcast' ? '📢 OFFICIAL ANNOUNCEMENT' : 'ACTIVITY BULLETIN (CLICK to view)'}
                </span>
                {toast.notif?.title && (
                  <h5 className="text-xs font-black text-stone-900 mt-1 leading-tight">
                    {toast.notif.title}
                  </h5>
                )}
                <p className="text-[11px] text-[#3c3c3b] font-bold leading-tight mt-1">
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



      <AnimatePresence>
        {isAboutUsOpen && (
          <AboutUsDirectory
            isOpen={isAboutUsOpen}
            onClose={() => setIsAboutUsOpen(false)}
            onNavigate={handleNavigate}
            isLoggedIn={!!currentUser}
            onTriggerAuth={() => {
              setIsAboutUsOpen(false);
              triggerAuthWall();
            }}
          />
        )}
      </AnimatePresence>

      {/* AUTH WALL MODAL OVERLAY */}
      <AnimatePresence>
        {isAuthModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[99999] bg-stone-900/75 backdrop-blur-md flex items-center justify-center p-3 md:p-6 overflow-y-auto"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setIsAuthModalOpen(false);
              }
            }}
          >
            <div className="w-full max-w-5xl max-h-[92vh] overflow-y-auto rounded-3xl relative shadow-2xl">
              <AuthScreen
                onAuthSuccess={handleAuthSuccess}
                authService={AuthService}
                onOpenAboutUs={() => setIsAboutUsOpen(true)}
                onClose={() => setIsAuthModalOpen(false)}
                contextMessage={authModalContext}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
