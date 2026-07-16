import React, { useState, useEffect, FormEvent, useRef } from 'react';
import { UserProfile, Review, SORT_TYPES, UserRole, canUserReview, PromotionalAd } from '../types';
import { ExploreService, LocationService, PromotionalAdsService, NotificationService, AuthService, secureGetItem, secureSetItem } from '../lib/storage';
import { ClinicService } from '../lib/clinicService';
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from 'motion/react';
import { Star, MapPin, Search, Phone, Trophy, ChevronRight, ChevronLeft, X, Award, Compass, MessageSquare, ShoppingBag, Grid, Megaphone, RefreshCw } from 'lucide-react';
import { ThreeDPremiumCard } from './ThreeDPremiumCard';
import { InteractiveClinicMap } from './InteractiveClinicMap';


interface ExploreFeedProps {
  currentUser: UserProfile;
  onUpdateUser: (updated: UserProfile) => void;
  activeSection?: string;
  onNavigate?: (section: string) => void;
}

const BANNER_SLIDES = [
  {
    id: 'welcome',
    type: 'welcome',
    sponsorName: '',
    badge: 'Clinical Network',
    icon: '🧭',
    bgGradient: "from-[#3e3e2b] via-[#5a5a40] to-[#7c7c5a]",
    borderColors: "border-[#5a5a40] border-b-[#323223]",
    title: "Pakistan Medical Directory",
    description: "Instantly connect with highly-qualified vet doctors, dynamic clinical centers, and on-call home vaccinators near you.",
    couponCode: '',
    ctaText: '',
    ctaUrl: ''
  },
  {
    id: 'promo_hills',
    type: 'promo',
    sponsorName: "Hill's Science Diet",
    title: "Support Joint & Mobility Health",
    description: "Veterinarian recommended diet formula engineered with EPA. Protect cartilage and improve active daily movement.",
    couponCode: "HILLS15",
    ctaText: "Claim 15% Vet Voucher",
    ctaUrl: "https://www.hillspet.com",
    bgGradient: "from-[#201d14] via-[#3a3928] to-[#201d14]",
    borderColors: "border-[#3a3928] border-b-[#181710]",
    badge: "Official Sponsor",
    icon: "🐕"
  },
  {
    id: 'promo_zoetis',
    type: 'promo',
    sponsorName: "Zoetis Animal Health",
    title: "Advanced Vet Diagnostics & Vaccines",
    description: "Anti-itching Cytopoint therapies to professional canine vaccines. Helping veterinarians protect cats and dog patients.",
    couponCode: "ZOECARE",
    ctaText: "Clinical Resource Hub",
    ctaUrl: "https://www.zoetis.com",
    bgGradient: "from-[#2d3238] via-[#3d444d] to-[#2d3238]",
    borderColors: "border-[#3d444d] border-b-[#1e2226]",
    badge: "Accredited Partner",
    icon: "💉"
  },
  {
    id: 'promo_purina',
    type: 'promo',
    sponsorName: "Purina Veterinary Diets",
    title: "Specialist Digestive Probiotic Formulas",
    description: "Customized clinical probiotics & food formulas designed to soothe and resolve animal gastrointestinal discomfort.",
    couponCode: "PURINAVET",
    ctaText: "Request Clinical Pack",
    ctaUrl: "https://www.purina.com",
    bgGradient: "from-[#281a0e] via-[#432d18] to-[#281a0e]",
    borderColors: "border-[#432d18] border-b-[#1e140a]",
    badge: "Premium Sponsor",
    icon: "🐈"
  }
];

const PAKISTAN_CITIES = [
  { name: 'Islamabad', lat: 33.6844, lng: 73.0479 },
  { name: 'Lahore', lat: 31.5204, lng: 74.3587 },
  { name: 'Karachi', lat: 24.8607, lng: 67.0011 },
  { name: 'Peshawar', lat: 34.0151, lng: 71.5249 },
  { name: 'Quetta', lat: 30.1798, lng: 66.9750 },
  { name: 'Rawalpindi', lat: 33.5651, lng: 73.0169 },
  { name: 'Faisalabad', lat: 31.4504, lng: 73.1350 },
  { name: 'Multan', lat: 30.1575, lng: 71.5249 },
  { name: 'Sialkot', lat: 32.4945, lng: 74.5229 },
  { name: 'Gujranwala', lat: 32.1877, lng: 74.1945 },
  { name: 'Hyderabad', lat: 25.3960, lng: 68.3578 },
];

export function ExploreFeed({ currentUser, onUpdateUser, activeSection, onNavigate }: ExploreFeedProps) {
  const [activeTab, setActiveTab] = useState<UserRole>('doctor');
  const [exploreMenuOpen, setExploreMenuOpen] = useState<boolean>(false);
  const [professionals, setProfessionals] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortBy, setSortBy] = useState<SORT_TYPES>(SORT_TYPES.HIGHEST);
  // Nearest sorting & geographic filter popup states
  const [doctorLocationModalOpen, setDoctorLocationModalOpen] = useState<boolean>(false);
  const [popCityInput, setPopCityInput] = useState<string>('');
  const [cityFilterActive, setCityFilterActive] = useState<string>('');

  // Billboard Promotional campaign states
  const [adTitle, setAdTitle] = useState<string>('');
  const [adDescription, setAdDescription] = useState<string>('');
  const [adSponsor, setAdSponsor] = useState<string>('');
  const [adCtaText, setAdCtaText] = useState<string>('Visit Clinic');
  const [adCtaUrl, setAdCtaUrl] = useState<string>('');
  const [adIcon, setAdIcon] = useState<string>('🏥');
  const [adGradient, setAdGradient] = useState<string>('from-[#1c2e24] via-[#2d4a39] to-[#1c2e24]');
  const [adPaymentChoice, setAdPaymentChoice] = useState<'free_privilege' | 'pay_3_days' | 'pay_7_days'>('pay_3_days');
  const [adPaymentMethod, setAdPaymentMethod] = useState<'card' | 'manual'>('manual');
  const [adManualMethod, setAdManualMethod] = useState<'Easypaisa' | 'JazzCash' | 'Nayapay' | 'Bank Transfer'>('Easypaisa');
  const [adTransactionId, setAdTransactionId] = useState<string>('');
  const [adCardName, setAdCardName] = useState<string>('');
  const [adCardNumber, setAdCardNumber] = useState<string>('');
  const [adCardExpiry, setAdCardExpiry] = useState<string>('');
  const [adCardCvv, setAdCardCvv] = useState<string>('');
  const [submittingAd, setSubmittingAd] = useState<boolean>(false);
  const [showAdCreator, setShowAdCreator] = useState<boolean>(false);
  const [adError, setAdError] = useState<string | null>(null);
  const [adSuccess, setAdSuccess] = useState<string | null>(null);
  const adCreatorRef = useRef<HTMLDivElement>(null);

  const [activeAds, setActiveAds] = useState<any[]>([]);
  const [deletingAdId, setDeletingAdId] = useState<string | null>(null);

  const loadActiveAds = async () => {
    if (!currentUser?.uid) return;
    try {
      const ads = await PromotionalAdsService.fetchActiveAds(false);
      setActiveAds(ads.filter((ad: any) => ad.ownerUid === currentUser.uid));
    } catch (err) {
      console.error('Failed fetching active ads', err);
    }
  };

  useEffect(() => {
    if (currentUser?.uid) {
      loadActiveAds();
    }
  }, [currentUser?.uid, currentUser?.promoAdsUsed]);

  useEffect(() => {
    if (!currentUser) return;
    const allowed = currentUser.subscriptionTier === 'Silver' ? 3 : currentUser.subscriptionTier === 'Gold' ? 5 : currentUser.subscriptionTier === 'Platinum' ? 10 : 0;
    const remaining = Math.max(0, allowed - (currentUser.promoAdsUsed || 0));
    if (remaining > 0) {
      setAdPaymentChoice('free_privilege');
    } else {
      setAdPaymentChoice('pay_3_days');
    }
  }, [currentUser?.subscriptionTier, currentUser?.promoAdsUsed]);

  useEffect(() => {
    if (currentUser?.name && !adSponsor) {
      setAdSponsor(currentUser.name);
    }
  }, [currentUser?.name]);

  const maxAllowedPromo = currentUser?.subscriptionTier === 'Silver' ? 3 : currentUser?.subscriptionTier === 'Gold' ? 5 : currentUser?.subscriptionTier === 'Platinum' ? 10 : 0;
  const remainingPromoSlots = Math.max(0, maxAllowedPromo - (currentUser?.promoAdsUsed || 0));
  const hasRemainingPromo = currentUser?.subscriptionTier ? (remainingPromoSlots > 0) : false;

  const triggerAdSuccess = (msg: string) => {
    setAdSuccess(msg);
    setTimeout(() => setAdSuccess(null), 8500);
  };

  const handleAdSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (!adTitle.trim() || !adDescription.trim() || !adSponsor.trim() || !adCtaText.trim() || !adCtaUrl.trim()) {
      setAdError('Please fill in all the required campaign parameters.');
      return;
    }

    const isAdFree = adPaymentChoice === 'free_privilege' || hasRemainingPromo;
    const durationDays = adPaymentChoice === 'pay_7_days' ? 7 : 3;
    const pricePaid = isAdFree ? 0 : (adPaymentChoice === 'pay_7_days' ? 1500 : 1000);

    // Validate payment credentials or transaction ID if not free
    if (!isAdFree) {
      if (!adTransactionId.trim()) {
        setAdError('Please enter the Transaction ID for your manual payment to submit this ad campaign.');
        return;
      }
    } else {
      // Re-verify they have credits
      if (remainingPromoSlots <= 0) {
        setAdError('No free ad campaign privileges remaining under your current subscription.');
        return;
      }
    }

    try {
      setSubmittingAd(true);
      setAdError(null);
      setAdSuccess(null);

      // Simulate network processing delay (ad registration & payment clearance)
      await new Promise(resolve => setTimeout(resolve, 2000));

      const isApprovedImmediately = isAdFree;

      await PromotionalAdsService.createAd({
        sponsorName: adSponsor,
        title: adTitle,
        description: adDescription,
        ctaText: adCtaText,
        ctaUrl: adCtaUrl,
        bgGradient: adGradient,
        badge: isAdFree ? `${currentUser.subscriptionTier} Promo` : 'Premium Billboard Sponsor',
        icon: adIcon,
        ownerEmail: currentUser.email,
        ownerUid: currentUser.uid,
        ownerRole: currentUser.role as 'doctor' | 'clinic',
        status: isApprovedImmediately ? 'approved' : 'pending',
        approved: isApprovedImmediately,
        paymentMethod: isAdFree ? 'Free Promo Credit' : adManualMethod,
        transactionId: isAdFree ? '' : adTransactionId
      }, durationDays, pricePaid);

      // If they used a free privilege, we MUST increment promoAdsUsed in database & local state!
      let updatedUser = currentUser;
      if (isAdFree) {
        const nextUsedCount = (currentUser.promoAdsUsed || 0) + 1;
        updatedUser = await AuthService.updateProfile(currentUser.uid, {
          promoAdsUsed: nextUsedCount
        });
        onUpdateUser(updatedUser);
      }

      if (isApprovedImmediately) {
        triggerAdSuccess(`⚡ Congratulations! Your promotional campaign "${adTitle}" is now live on the VetAxis Billboard!`);
      } else {
        triggerAdSuccess(`⚡ Congratulations! Your promotional campaign "${adTitle}" and payment transaction ID "${adTransactionId}" have been successfully submitted! It will appear on the VetAxis Billboard as soon as an Admin approves it.`);
      }
      loadActiveAds();
      
      // Clean form fields
      setAdTitle('');
      setAdDescription('');
      setAdSponsor(currentUser.name || '');
      setAdCtaText('Visit Clinic');
      setAdCtaUrl('');
      setAdIcon('🏥');
      setAdGradient('from-[#1c2e24] via-[#2d4a39] to-[#1c2e24]');
      setAdCardName('');
      setAdCardNumber('');
      setAdCardExpiry('');
      setAdCardCvv('');
      setAdTransactionId('');
    } catch (err: any) {
      setAdError(err.message || 'An error occurred during campaign promotion processing.');
    } finally {
      setSubmittingAd(false);
    }
  };

  const handleSortChange = (newVal: SORT_TYPES) => {
    if (newVal === SORT_TYPES.NEAREST) {
      setPopCityInput('');
      setDoctorLocationModalOpen(true);
      return;
    }
    setSortBy(newVal);
  };

  const handleCitySearchSubmit = (cityName: string) => {
    const term = cityName.trim();
    if (!term) return;

    // Resolve coordinates
    const matched = PAKISTAN_CITIES.find(c => c.name.toLowerCase() === term.toLowerCase());
    const coords = matched ? { lat: matched.lat, lng: matched.lng } : { lat: 33.6844, lng: 73.0479 };

    const updatedUser = {
      ...currentUser,
      location: {
        lat: coords.lat,
        lng: coords.lng,
        address: term
      }
    };

    onUpdateUser(updatedUser);
    secureSetItem('va_session', JSON.stringify(updatedUser));

    setCityFilterActive(term);
    setSortBy(SORT_TYPES.NEAREST);
    setDoctorLocationModalOpen(false);
  };

  // Geolocation states
  const [locLoading, setLocLoading] = useState<boolean>(false);

  // Detail Modal states
  const [selectedProfile, setSelectedProfile] = useState<UserProfile | null>(null);
  const [modalReviews, setModalReviews] = useState<Review[]>([]);
  const [reviewRating, setReviewRating] = useState<number>(0);
  const [reviewComment, setReviewComment] = useState<string>('');
  const [reviewSort, setReviewSort] = useState<'newest' | 'highest'>('newest');
  const [submitLoading, setSubmitLoading] = useState<boolean>(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  // Clinic Booking states for pet owners
  const [isBookingModeOpen, setIsBookingModeOpen] = useState<boolean>(false);
  const [bookingSuccess, setBookingSuccess] = useState<string | null>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [bookingForm, setBookingForm] = useState({
    patientName: '',
    ownerName: currentUser.name || '',
    ownerPhone: currentUser.phone || '',
    date: new Date(Date.now() + 24 * 3600 * 1000).toISOString().split('T')[0], // tomorrow
    time: '11:00',
    type: 'consultation' as 'consultation' | 'surgery' | 'grooming' | 'vaccination' | 'follow-up' | 'emergency',
    notes: ''
  });

  const handleClinicBookingSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedProfile) return;
    if (!bookingForm.patientName || !bookingForm.ownerName || !bookingForm.ownerPhone) {
      setBookingError('Please fill Patient Name, Owner Name, and Owner Direct Phone/WhatsApp.');
      return;
    }

    try {
      const records = {
        id: 'apt_user_' + Date.now(),
        clinicId: selectedProfile.uid,
        patientName: bookingForm.patientName,
        ownerName: bookingForm.ownerName,
        ownerPhone: bookingForm.ownerPhone,
        date: bookingForm.date,
        time: bookingForm.time,
        vetId: 'vet_assigned',
        vetName: selectedProfile.name, // Clinic Name
        type: bookingForm.type,
        status: 'Scheduled' as const,
        isRecurring: false,
        recurrencePattern: 'None' as const,
        notes: bookingForm.notes || 'Online client booking via VetAxis homepage Clinic Card.',
        createdAt: Date.now(),
        userId: currentUser.uid
      };

      await ClinicService.saveAppointment(records);

      try {
        await NotificationService.createNotification({
          userId: selectedProfile.uid,
          senderId: currentUser.uid,
          senderName: bookingForm.ownerName,
          type: 'appointment_booked',
          targetId: records.id,
          targetType: 'appointment',
          message: `${bookingForm.ownerName} has booked an appointment. See more`,
          read: false
        });
      } catch (notifErr) {
        console.error('Failed to create booking notification:', notifErr);
      }

      setBookingSuccess('🎉 Appointment successfully scheduled! The dynamic clinic has been updated.');
      setBookingError(null);
      
      // Reset
      setBookingForm({
        patientName: '',
        ownerName: currentUser.name || '',
        ownerPhone: currentUser.phone || '',
        date: new Date(Date.now() + 24 * 3600 * 1000).toISOString().split('T')[0],
        time: '11:00',
        type: 'consultation',
        notes: ''
      });
      
      setTimeout(() => {
        setBookingSuccess(null);
        setIsBookingModeOpen(false);
      }, 3000);

    } catch (err: any) {
      setBookingError(err.message || 'Failed code route execution.');
    }
  };

  // Sliding banner & promotion states (10 seconds per slide)
  const [currentSlideIdx, setCurrentSlideIdx] = useState<number>(0);
  const [promoPaused, setPromoPaused] = useState<boolean>(false);
  const [dbAds, setDbAds] = useState<any[]>([]);

  const fetchCampaigns = async () => {
    try {
      const ads = await PromotionalAdsService.fetchActiveAds();
      const mapped = ads.map(ad => ({
        id: ad.id,
        type: 'promo',
        sponsorName: ad.sponsorName,
        title: ad.title,
        description: ad.description,
        couponCode: ad.couponCode || '',
        ctaText: ad.ctaText,
        ctaUrl: ad.ctaUrl,
        bgGradient: ad.bgGradient || "from-[#574c3c] via-[#433b2f] to-[#574c3c]",
        borderColors: "border-[#433b2f] border-b-[#2a241c]",
        badge: ad.badge || "Sponsored",
        icon: ad.icon || "📢",
        ownerUid: ad.ownerUid,
        expiresAt: ad.expiresAt,
        createdAt: ad.createdAt,
        pricePaid: ad.pricePaid,
        durationDays: ad.durationDays
      }));
      setDbAds(mapped);
    } catch (err) {
      console.error("Failed fetching dynamic promotion ads", err);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const activeSlides = [...BANNER_SLIDES, ...dbAds];

  // 3D Tilt orientation & Gloss Reflection for Billboard Card
  const billboardRef = useRef<HTMLDivElement>(null);
  const [bHovered, setBHovered] = useState<boolean>(false);
  const bx = useMotionValue(0.5);
  const by = useMotionValue(0.5);

  const brotateX = useTransform(by, [0, 1], [6, -6]);
  const brotateY = useTransform(bx, [0, 1], [-6, 6]);

  const bspringX = useSpring(brotateX, { stiffness: 150, damping: 22 });
  const bspringY = useSpring(brotateY, { stiffness: 150, damping: 22 });

  const bsheenX = useTransform(bx, [0, 1], ['130%', '-30%']);
  const bsheenY = useTransform(by, [0, 1], ['130%', '-30%']);

  const handleBillboardMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!billboardRef.current) return;
    const rect = billboardRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    bx.set(mouseX / width);
    by.set(mouseY / height);
    setBHovered(true);
    setPromoPaused(true);
  };

  const handleBillboardMouseLeave = () => {
    bx.set(0.5);
    by.set(0.5);
    setBHovered(false);
    setPromoPaused(false);
  };

  useEffect(() => {
    if (promoPaused) return;
    const timer = setInterval(() => {
      setCurrentSlideIdx((prev) => (prev + 1) % activeSlides.length);
    }, 10000);
    return () => clearInterval(timer);
  }, [promoPaused, activeSlides.length]);

  // Load specialists on mount or tab change
  const loadData = async () => {
    setLoading(true);
    try {
      const data = await ExploreService.fetchProfessionals(activeTab as any);
      setProfessionals(data);
    } catch (err) {
      console.error('Failed to load specialists', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const handleResetAllFilters = async () => {
    setSearchTerm('');
    setCityFilterActive('');
    setSortBy(SORT_TYPES.HIGHEST);
    if (currentUser.location) {
      setLocLoading(true);
      try {
        const freshUser = { ...currentUser, location: null };
        onUpdateUser(freshUser);
        secureSetItem('va_session', JSON.stringify(freshUser));
        
        const rawUsers = secureGetItem('va_users');
        const localUsers = JSON.parse(rawUsers || '[]');
        const idx = localUsers.findIndex((u: any) => u.uid === currentUser.uid);
        if (idx !== -1) {
          localUsers[idx].location = null;
          secureSetItem('va_users', JSON.stringify(localUsers));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLocLoading(false);
      }
    }
  };

  // Open detail panel
  const handleOpenDetails = (profile: UserProfile) => {
    setSelectedProfile(profile);
    const reviews = profile.reviews || [];
    setModalReviews(reviews);
    
    // Check if current user has already submitted a review
    const existing = reviews.find(r => r.reviewerEmail === currentUser?.email);
    if (existing) {
      setReviewRating(existing.rating);
      setReviewComment(existing.comment || '');
    } else {
      setReviewRating(0);
      setReviewComment('');
    }

    setReviewError(null);
    setIsBookingModeOpen(false);
    setBookingSuccess(null);
    setBookingError(null);
  };

  // Submit profile evaluation review
  const handleSubmitReview = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedProfile) return;
    if (!canUserReview(currentUser.role, selectedProfile.role)) {
      setReviewError('You do not have permission to rate or review this role.');
      return;
    }
    if (reviewRating === 0) {
      setReviewError('Please pick a star rating between 1 and 5.');
      return;
    }

    const wordCount = reviewComment.trim().split(/\s+/).filter(Boolean).length;
    if (wordCount > 200) {
      setReviewError(`Review must be under 200 words (currently ${wordCount} words).`);
      return;
    }

    setSubmitLoading(true);
    setReviewError(null);

    try {
      const updatedReviews = await ExploreService.addReview(
        selectedProfile.uid,
        reviewRating,
        reviewComment,
        currentUser
      );

      // Recalculate profile average inline
      const sum = updatedReviews.reduce((acc, r) => acc + r.rating, 0);
      const avg = parseFloat((sum / updatedReviews.length).toFixed(1));

      const updatedProfile = {
        ...selectedProfile,
        reviews: updatedReviews,
        avgRating: avg,
        totalReviews: updatedReviews.length
      };

      setModalReviews(updatedReviews);
      setSelectedProfile(updatedProfile);

      // Refresh list to show stats
      setProfessionals((prev) =>
        prev.map((p) => (p.uid === selectedProfile.uid ? updatedProfile : p))
      );

      // Keep the fields populated with the review they just submitted/edited
      const existing = updatedReviews.find(r => r.reviewerEmail === currentUser?.email);
      if (existing) {
        setReviewRating(existing.rating);
        setReviewComment(existing.comment || '');
      } else {
        setReviewComment('');
        setReviewRating(0);
      }
    } catch (err: any) {
      setReviewError(err.message || 'Failed to submit review.');
    } finally {
      setSubmitLoading(false);
    }
  };

  // Fall back to saved address/coords
  const resolvedUserLocForSort = currentUser.location || (currentUser.address ? { 
    lat: LocationService.resolveCoordinates(currentUser.address, currentUser.uid).lat,
    lng: LocationService.resolveCoordinates(currentUser.address, currentUser.uid).lng,
    address: currentUser.address
  } : null);

  // Sorted and filtered list
  const filteredProfessionals = ExploreService.sortUsers(
    professionals.filter((p) => {
      const search = searchTerm.toLowerCase();
      const matchesSearch = (
        p.name.toLowerCase().includes(search) ||
        (p.expertise || '').toLowerCase().includes(search) ||
        (p.facilities || '').toLowerCase().includes(search) ||
        (p.address || '').toLowerCase().includes(search)
      );
      if (!matchesSearch) return false;

      // Filter by city if selected
      if (cityFilterActive) {
        const cityLower = cityFilterActive.toLowerCase().trim();
        const matchesCity = (
          (p.address || '').toLowerCase().includes(cityLower) ||
          (p.location?.address || '').toLowerCase().includes(cityLower)
        );
        if (!matchesCity) return false;
      }

      return true;
    }),
    sortBy,
    resolvedUserLocForSort
  );

  // Review rendering sorting
  const sortedReviews = [...modalReviews].sort((a, b) => {
    return reviewSort === 'highest' ? b.rating - a.rating : b.date - a.date;
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto w-[98%] px-1 md:px-4">
      
      {/* 3D INTERACTIVE HERO & SPONSOR BILLBOARD */}
      <div 
        ref={billboardRef}
        onMouseMove={handleBillboardMouseMove}
        onMouseLeave={handleBillboardMouseLeave}
        className="relative w-full h-[360px] sm:h-[280px] md:h-[230px] lg:h-[210px] overflow-hidden rounded-3xl shrink-0 shadow-[0_15px_40px_rgba(90,90,64,0.18)] hover:shadow-[0_25px_50px_rgba(90,90,64,0.3)] transition-shadow duration-500 border border-[#cdc6ad]"
        style={{ perspective: 1200 }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlideIdx}
            initial={{ x: "100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "-100%", opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.25, 1, 0.5, 1] }}
            style={{ 
              transformStyle: "preserve-3d", 
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
              rotateX: bspringX,
              rotateY: bspringY,
            }}
            className={`absolute inset-0 text-white p-6 md:p-8 flex flex-col justify-center bg-gradient-to-br ${activeSlides[currentSlideIdx].bgGradient} ${activeSlides[currentSlideIdx].borderColors} border border-b-[8px] transition-all duration-300`}
          >
            {/* Holographic grid wallpaper */}
            <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1.2px,transparent_1.2px)] [background-size:16px_16px] opacity-15 pointer-events-none" />

            {/* Premium 3D Metallic Gloss Glow Layer */}
            <motion.div
              style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0) 50%, rgba(0,0,0,0.18) 100%)',
                x: bsheenX,
                y: bsheenY,
                pointerEvents: 'none',
              }}
              className="absolute inset-0 z-20 mix-blend-overlay pointer-events-none"
            />

            {activeSlides[currentSlideIdx].type === 'welcome' ? (
              // WELCOME BANNER SLIDE CONTENT (WITH Z-PERSPECTIVE DEPTH)
              <div className="w-full relative" style={{ transformStyle: "preserve-3d" }}>
                <div 
                  className="absolute right-6 top-1/2 -translate-y-1/2 opacity-10 pointer-events-none hidden lg:block"
                  style={{ transform: "translateZ(50px)" }}
                >
                  <Compass className="w-32 h-32 animate-spin" style={{ animationDuration: '40s' }} />
                </div>
                
                <div className="relative z-10 space-y-2 md:space-y-3 max-w-2xl text-left" style={{ transformStyle: "preserve-3d" }}>
                  <span 
                    className="inline-flex px-3 py-1 bg-white/10 rounded-xl text-[10px] font-black tracking-widest font-mono border border-white/20 uppercase"
                    style={{ transform: "translateZ(30px)" }}
                  >
                    🩺 Pakistan Medical Directory
                  </span>
                  <h2 
                    className="text-2.5xl md:text-4xl font-serif font-black tracking-tight leading-tight"
                    style={{ transform: "translateZ(45px)" }}
                  >
                    Hello, {currentUser.name.split(' ')[0]} 👋
                  </h2>
                  <p 
                    className="text-neutral-200 text-xs md:text-sm font-semibold leading-relaxed"
                    style={{ transform: "translateZ(25px)" }}
                  >
                    Instantly connect with highly-qualified vet doctors, dynamic clinical centers, and on-call home vaccinators near you.
                  </p>
                  {currentUser.location && (
                    <motion.div 
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="inline-flex items-center gap-2 px-3.5 py-1 bg-white/15 backdrop-blur-md rounded-xl text-[10px] font-bold border border-white/25 shadow-inner mt-1"
                      style={{ transform: "translateZ(20px)" }}
                    >
                      <MapPin className="w-3.5 h-3.5 text-amber-400" />
                      <span>Selected Location Base: {currentUser.location.address}</span>
                    </motion.div>
                  )}
                </div>
              </div>
            ) : (
              // SPONSORED CAMPAIGN SLIDE CONTENT (WITH Z-PERSPECTIVE DEPTH)
              <div className="w-full relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6" style={{ transformStyle: "preserve-3d" }}>
                <div className="space-y-2 md:space-y-3 max-w-2xl text-left" style={{ transformStyle: "preserve-3d" }}>
                  <span 
                    className="inline-flex px-3 py-1 bg-white/10 rounded-xl text-[10px] font-black tracking-widest font-mono border border-white/20 uppercase"
                    style={{ transform: "translateZ(30px)" }}
                  >
                    📌 {activeSlides[currentSlideIdx].badge} • Sponsored Campaign
                  </span>
                  <h2 
                    className="text-xl md:text-3xl font-serif font-black tracking-tight leading-tight flex items-center gap-2"
                    style={{ transform: "translateZ(45px)" }}
                  >
                    <span className="text-2xl md:text-3.5xl shrink-0 select-none">{activeSlides[currentSlideIdx].icon}</span>
                    <span>{activeSlides[currentSlideIdx].title}</span>
                  </h2>
                  <p 
                    className="text-neutral-200 text-xs md:text-xs font-semibold leading-relaxed line-clamp-3"
                    style={{ transform: "translateZ(20px)" }}
                  >
                    {activeSlides[currentSlideIdx].description}
                  </p>
                  <div className="flex flex-wrap items-center gap-3 pt-0.5" style={{ transform: "translateZ(15px)" }}>
                    <span className="text-[10px] uppercase font-black tracking-wider text-amber-300">
                      {activeSlides[currentSlideIdx].sponsorName}
                    </span>
                    {activeSlides[currentSlideIdx].couponCode && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigator.clipboard.writeText(activeSlides[currentSlideIdx].couponCode || '');
                          alert(`📋 Copied coupon code "${activeSlides[currentSlideIdx].couponCode}" to clipboard!`);
                        }}
                        className="inline-flex items-center gap-2 px-2.5 py-1 bg-dashed border border-white/30 hover:border-white/50 bg-white/10 rounded-xl text-[9px] font-black tracking-wider text-amber-300 shadow-inner cursor-pointer transition-all"
                        title="Click to copy coupon code"
                      >
                        <span>Code: {activeSlides[currentSlideIdx].couponCode}</span>
                        <span className="text-white/60 font-normal text-[8px] pl-1">Copy 📋</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* CTA Link out (WITH COGNITIVE HEIGHT HIGHLIGHT) */}
                <div className="shrink-0 flex flex-col gap-2 min-w-[180px] md:min-w-[200px]" style={{ transform: "translateZ(35px)" }}>
                  <a
                    href={activeSlides[currentSlideIdx].ctaUrl.startsWith('http') ? activeSlides[currentSlideIdx].ctaUrl : `https://${activeSlides[currentSlideIdx].ctaUrl}`}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="bg-white hover:bg-stone-50 hover:scale-103 text-stone-900 border-b-4 border-b-stone-300 active:border-b-2 px-4 py-2.5 rounded-2xl text-[10px] font-black tracking-wider uppercase transition-all flex items-center justify-center gap-1.5 w-full text-center cursor-pointer decoration-none shadow-md"
                  >
                    <span>{activeSlides[currentSlideIdx].ctaText}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-stone-850" />
                  </a>
                </div>
              </div>
            )}

            {/* Carousel Navigation Toolbar */}
            <div 
              className="absolute bottom-4 right-6 flex items-center gap-3 bg-black/25 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 z-20 select-none"
              style={{ transform: "translateZ(40px)" }}
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentSlideIdx((prev) => (prev - 1 + activeSlides.length) % activeSlides.length);
                }}
                className="text-white/60 hover:text-white bg-transparent border-none cursor-pointer p-0.5 flex items-center justify-center"
                title="Previous Slide"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              
              <div className="flex gap-1.5">
                {activeSlides.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentSlideIdx(idx);
                    }}
                    className={`w-1.5 h-1.5 rounded-full cursor-pointer transition-all border-none ${
                      idx === currentSlideIdx ? 'bg-amber-400 scale-120' : 'bg-white/40 hover:bg-white/60'
                    }`}
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentSlideIdx((prev) => (prev + 1) % activeSlides.length);
                }}
                className="text-white/60 hover:text-white bg-transparent border-none cursor-pointer p-0.5 flex items-center justify-center"
                title="Next Slide"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

          </motion.div>
        </AnimatePresence>
      </div>

      {/* FILTER & OPTION CONTROLS BAR */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between bg-white border border-[#e3dec9] border-b-[4px] border-b-[#cdc6ad] p-5 rounded-3xl shadow-sm text-left">
        
        {/* Directory Tabs */}
        <div className="flex flex-wrap items-center gap-3.5">
          <div className="bg-[#fcf9f2] border border-[#e3dec9] p-1.5 rounded-2xl flex gap-1 items-center relative">
            {[
              { id: 'doctor', icon: '🩺', label: 'Doctors' },
              { id: 'clinic', icon: '🏥', label: 'Clinics' }
            ].map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as UserRole)}
                  className={`relative cursor-pointer px-4.5 py-2.5 rounded-xl text-xs font-extrabold transition-all border-none bg-transparent ${
                    isActive ? 'text-white' : 'text-[#7a766f] hover:text-[#5a5a40]'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeDirectoryTab"
                      className="absolute inset-0 bg-[#5a5a40] rounded-xl border-b-[3px] border-[#3c3c2b]"
                      style={{ originY: '0px' }}
                      transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-1.5">
                    <span>{tab.icon}</span>
                    <span>{tab.label}</span>
                  </span>
                </button>
              );
            })}
          </div>
          {(currentUser?.role === 'clinic' || currentUser?.role === 'doctor') && (
            <button
              type="button"
              onClick={() => {
                setShowAdCreator(!showAdCreator);
              }}
              className={`btn-tactile-3d-secondary py-2.5 px-4 text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                showAdCreator 
                  ? 'bg-amber-100 text-amber-900 border-amber-300 border-b-[#d97706]' 
                  : 'bg-[#faf9f6] text-[#5a5a40] border-[#e3dec9] border-b-[#cdc6ad] hover:bg-[#fcf9f2]'
              }`}
              id="btn-create-ad-toggle"
            >
              <Megaphone className="w-3.5 h-3.5 animate-pulse text-amber-600" />
              <span>{showAdCreator ? 'Hide Ad Creator' : 'Create an Ad'}</span>
            </button>
          )}
        </div>

        {/* Right Searches & Sort options */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
          <div className="relative w-full sm:max-w-[240px]">
            <input
              type="text"
              placeholder="Search directory portfolio…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-control rounded-2xl pl-10 py-3 text-xs w-full font-semibold"
            />
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#a49f92] w-4.5 h-4.5" />
          </div>

          <div className="flex items-center gap-2 shrink-0 bg-[#fcf9f2] border border-[#e3dec9] p-2 rounded-2xl w-full sm:w-auto justify-between sm:justify-start">
            <span className="text-xs text-[#a49f92] font-black uppercase tracking-wider pl-1 select-none">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => handleSortChange(e.target.value as SORT_TYPES)}
              className="text-xs bg-white border border-[#e3dec9] p-2 px-3 rounded-xl cursor-pointer font-bold text-[#373735] focus:outline-none"
            >
              <option value={SORT_TYPES.HIGHEST}>⭐ Highest Rated</option>
              <option value={SORT_TYPES.RECENT}>🕒 Most Recent</option>
              <option value={SORT_TYPES.RECOMMENDED}>✨ Recommended</option>
              <option value={SORT_TYPES.NEAREST}>📍 Nearest Location</option>
            </select>
          </div>
        </div>

      </div>

      {/* PROFESSIONAL BILLBOARD AD CAMPAIGN CREATOR */}
      <AnimatePresence>
        {(currentUser?.role === 'clinic' || currentUser?.role === 'doctor') && showAdCreator && (
          <motion.div
            ref={adCreatorRef}
            initial={{ opacity: 0, height: 0, y: 15 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: 15 }}
            transition={{ duration: 0.3 }}
            className="w-full mt-6 bg-amber-50/15 border border-[#e3dec9] border-b-[5px] border-b-[#cdc6ad] rounded-3xl p-6 md:p-8 shadow-md overflow-hidden text-left"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-[#f4f1e9] pb-5 gap-3">
              <div className="space-y-1">
                <span className="inline-flex px-2 py-0.5 bg-amber-100 border border-amber-200 text-amber-900 rounded-lg text-[9px] font-black uppercase tracking-wider">
                  🏥 Professional Self-Serve Panel
                </span>
                <h3 className="font-serif text-xl font-black text-[#373735] flex items-center gap-2">
                  <Megaphone className="w-5 h-5 text-amber-600 animate-pulse" />
                  <span>Promote Your Clinic on Billboard</span>
                </h3>
                <p className="text-xs text-[#7a766f] font-semibold leading-relaxed">
                  Launch self-serve campaigns and instantly rotate onto the high-visibility billboard deck! Post for free with subscription privileges or buy individual spots.
                </p>
              </div>
            </div>

            {/* Error & Success Messages inside the ad panel */}
            {adError && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-800 font-bold">
                ⚠️ {adError}
              </div>
            )}
            {adSuccess && (
              <div className="mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 font-bold">
                {adSuccess}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 mt-6">
              {/* Left Column: Form Parameters (7 Columns) */}
              <form onSubmit={handleAdSubmit} className="col-span-1 lg:col-span-7 space-y-5 w-full">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Sponsor Card Name Input */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-[#5a5a40]">Sponsor Display name</label>
                    <input
                      type="text"
                      value={adSponsor}
                      onChange={(e) => setAdSponsor(e.target.value)}
                      placeholder="e.g. Hope Animal Hospital"
                      className="form-control text-xs bg-white"
                      maxLength={35}
                      required
                    />
                    <p className="text-[9px] text-[#a49f92] font-semibold">Your hospital or doctor brand header.</p>
                  </div>

                  {/* Campaign Short Title */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-[#5a5a40]">Campaign Short Title</label>
                    <input
                      type="text"
                      value={adTitle}
                      onChange={(e) => setAdTitle(e.target.value)}
                      placeholder="e.g. Free OPD Consult & Vaccinations!"
                      className="form-control text-xs bg-white"
                      maxLength={35}
                      required
                    />
                    <p className="text-[9px] text-[#a49f92] font-semibold">A high-catch display slogan.</p>
                  </div>
                </div>

                {/* Special Promotion Description */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-[#5a5a40]">Special Promotion Details & Offer Text</label>
                  <textarea
                    value={adDescription}
                    onChange={(e) => setAdDescription(e.target.value)}
                    placeholder="e.g. Modern diagnostic tools, dental scaling, 24/7 critical veterinary response. Claim 20% flat discount on vaccines this whole week!"
                    className="form-control text-xs min-[#85px] leading-relaxed resize-none h-20 bg-white"
                    maxLength={160}
                    required
                  />
                  <p className="text-[9px] text-[#a49f92] font-semibold">Keep it high-value, crisp, and direct to the client's needs.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Button CTA text label */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-[#5a5a40]">CTA Button Slogan</label>
                    <select
                      value={adCtaText}
                      onChange={(e) => setAdCtaText(e.target.value)}
                      className="form-control text-xs bg-white"
                      required
                    >
                      <option value="Visit Clinic">Visit Clinic</option>
                      <option value="WhatsApp Support">WhatsApp Support</option>
                      <option value="Book Free Session">Book Free Session</option>
                      <option value="Call Helpline">Call Helpline</option>
                      <option value="Claim Discount">Claim Discount</option>
                      <option value="Get Direction">Get Direction</option>
                    </select>
                  </div>

                  {/* CTA URL destination or hotline number */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-[#5a5a40]">Destination URL or Hotline</label>
                    <input
                      type="text"
                      value={adCtaUrl}
                      onChange={(e) => setAdCtaUrl(e.target.value)}
                      placeholder="e.g. tel:+923001234567 or vetaxis.pk/hopetal"
                      className="form-control text-xs bg-white"
                      maxLength={120}
                      required
                    />
                  </div>
                </div>

                {/* Icon Choice Row */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-[#5a5a40]">Select Highlight Indicator Icon</label>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {['🏥', '🩺', '🐶', '🐱', '🔬', '❤️', '🐄', '🐴', '📢'].map(em => (
                      <button
                        type="button"
                        key={em}
                        onClick={() => setAdIcon(em)}
                        className={`w-9 h-9 rounded-xl border flex items-center justify-center text-lg transition-all cursor-pointer ${
                          adIcon === em ? 'bg-amber-100 border-amber-400 ring-2 ring-amber-200' : 'bg-white border-[#e3dec9] hover:bg-stone-50'
                        }`}
                      >
                        {em}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Gradient card style selection */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-[#5a5a40]">Sponsor Card Theme presets</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { name: 'Spruce Green', grad: 'from-[#1c2e24] via-[#2d4a39] to-[#1c2e24]' },
                      { name: 'Warm Amber', grad: 'from-[#4a2e1d] via-[#633e25] to-[#4a2e1d]' },
                      { name: 'Midnight Navy', grad: 'from-[#19243a] via-[#243454] to-[#19243a]' },
                      { name: 'Royal Crimson', grad: 'from-[#3b1216] via-[#591b22] to-[#3b1216]' },
                    ].map(opt => (
                      <button
                        type="button"
                        key={opt.name}
                        onClick={() => setAdGradient(opt.grad)}
                        className={`p-3 rounded-xl border text-[10px] font-black text-white bg-gradient-to-br ${opt.grad} flex flex-col justify-end tracking-wider transition-all cursor-pointer ${
                          adGradient === opt.grad ? 'border-[#5a5a40] scale-102 ring-2 ring-[#a49f92]/40' : 'border-transparent opacity-80 hover:opacity-100 shadow-sm'
                        }`}
                      >
                        <span>{opt.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* BUDGET PLAN SELECTOR */}
                <div className="space-y-2 bg-[#fcf9f2] p-4.5 rounded-2xl border border-[#e3dec9] border-b-2">
                  <label className="text-xs font-extrabold text-[#5a5a40] uppercase tracking-wider block mb-1">Select Advertising Campaign Plan</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Option 1: Privilege-based (only visible if premium subscriber and remaining credits) */}
                    {currentUser.subscriptionTier && (
                      <button
                        type="button"
                        onClick={() => setAdPaymentChoice('free_privilege')}
                        disabled={Math.max(0, (currentUser.subscriptionTier === 'Silver' ? 3 : currentUser.subscriptionTier === 'Gold' ? 5 : 10) - (currentUser.promoAdsUsed || 0)) === 0}
                        className={`p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer bg-white ${
                          adPaymentChoice === 'free_privilege' ? 'border-[#5a5a40] ring-2 ring-[#5a5a40]/25' : 'border-[#e3dec9] hover:bg-[#faf9f6]'
                        } disabled:opacity-55 disabled:cursor-not-allowed`}
                      >
                        <div>
                          <div className="flex justify-between items-start w-full">
                            <h4 className="text-xs font-black text-emerald-800">✨ Sub Privilege Ad</h4>
                            <span className="text-[8px] bg-emerald-100 text-emerald-900 font-extrabold px-1.5 py-0.5 rounded-lg">FREE</span>
                          </div>
                          <p className="text-[10px] text-[#7a766f] font-semibold mt-1 leading-relaxed">
                            Post completely free under your {currentUser.subscriptionTier} Tier subscription! (3-day builtin timer).
                          </p>
                        </div>
                        <div className="text-[10px] font-bold text-stone-600 mt-2.5 border-t border-[#f4f1e9] pt-2 w-full flex justify-between">
                          <span>Remaining: {Math.max(0, (currentUser.subscriptionTier === 'Silver' ? 3 : currentUser.subscriptionTier === 'Gold' ? 5 : 10) - (currentUser.promoAdsUsed || 0))} Slots</span>
                          <span>0 RS</span>
                        </div>
                      </button>
                    )}

                    {/* Option 2: Individual 3 Days pay */}
                    <button
                      type="button"
                      onClick={() => setAdPaymentChoice('pay_3_days')}
                      className={`p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer bg-white ${
                        adPaymentChoice === 'pay_3_days' ? 'border-[#5a5a40] ring-2 ring-[#5a5a40]/25' : 'border-[#e3dec9] hover:bg-[#faf9f6]'
                      }`}
                    >
                      <div>
                        <h4 className="text-xs font-black text-stone-800">🚀 Starter Booster Package</h4>
                        <p className="text-[10px] text-[#7a766f] font-semibold mt-1 leading-relaxed">
                          Broadcasting active live rotation for exactly 3 days (72 hours) of peak feed traffic.
                        </p>
                      </div>
                      <div className="text-[10px] font-bold text-stone-600 mt-2.5 border-t border-[#f4f1e9] pt-2 w-full flex justify-between">
                        <span>3 Days Duration</span>
                        <span className="bg-[#f4f1e9] px-2 py-0.5 rounded text-neutral-800 font-black">
                          {hasRemainingPromo ? 'FREE (Sub Benefit)' : '1,000 RS'}
                        </span>
                      </div>
                    </button>

                    {/* Option 3: Individual 7 Days pay */}
                    <button
                      type="button"
                      onClick={() => setAdPaymentChoice('pay_7_days')}
                      className={`p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer bg-white ${
                        adPaymentChoice === 'pay_7_days' ? 'border-[#5a5a40] ring-2 ring-[#5a5a40]/25' : 'border-[#e3dec9] hover:bg-[#faf9f6]'
                      }`}
                    >
                      <div>
                        <h4 className="text-xs font-black text-stone-800">👑 Extreme Reach Outreach</h4>
                        <p className="text-[10px] text-[#7a766f] font-semibold mt-1 leading-relaxed">
                          Extended reach rotational campaign running active for 7 full calendar days!
                        </p>
                      </div>
                      <div className="text-[10px] font-bold text-stone-600 mt-2.5 border-t border-[#f4f1e9] pt-2 w-full flex justify-between">
                        <span>7 Days Duration</span>
                        <span className="bg-[#f4f1e9] px-2 py-0.5 rounded text-neutral-800 font-black">
                          {hasRemainingPromo ? 'FREE (Sub Benefit)' : '1,500 RS'}
                        </span>
                      </div>
                    </button>
                  </div>
                </div>

                {/* BILLING DISCHARGE PANEL (only shown if they pay) */}
                {adPaymentChoice !== 'free_privilege' && !hasRemainingPromo && (
                  <div className="bg-[#f4f1e9]/65 p-5 rounded-2xl border border-[#e3dec9] space-y-4 text-left animate-fadeIn">
                    <div className="flex items-center justify-between border-b border-[#e3dec9] pb-2">
                      <span className="text-[10px] font-black uppercase text-[#5a5a40]">🔒 Secure Easypaisa Checkout Terminal</span>
                      <span className="font-mono text-xs font-black text-amber-900">
                        Charge: {adPaymentChoice === 'pay_7_days' ? '1,500' : '1,000'} RS
                      </span>
                    </div>

                    <div className="space-y-3.5 animate-fadeIn">
                      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
                        <h4 className="font-bold text-xs text-amber-900 uppercase tracking-wider">Easypaisa Payment Instructions</h4>
                        <p className="text-xs text-amber-800">
                          Please transfer <strong>PKR {adPaymentChoice === 'pay_7_days' ? '1,500' : '1,000'}</strong> to the following account:
                        </p>
                        <div className="text-xs font-mono bg-white p-2.5 rounded border border-amber-200 space-y-0.5">
                          <p><strong>Easypaisa Digital Account:</strong> 92532839</p>
                          <p><strong>IBAN:</strong> PK36TMFB0000000092532839</p>
                          <p><strong>Receiver Name:</strong> Naseeb Ullah</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <span className="text-[9px] font-black text-[#5a5a40] uppercase block">Payment Method Applied</span>
                          <select
                            value={adManualMethod}
                            onChange={(e: any) => setAdManualMethod(e.target.value)}
                            className="form-control text-xs bg-white font-bold"
                          >
                            <option value="Easypaisa">Easypaisa</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <span className="text-[9px] font-black text-[#5a5a40] uppercase block">Transaction ID</span>
                          <input
                            type="text"
                            placeholder="Enter your transaction ID"
                            value={adTransactionId}
                            onChange={(e) => setAdTransactionId(e.target.value)}
                            className="form-control text-xs bg-white font-mono font-bold"
                            required={adPaymentChoice !== 'free_privilege' && !hasRemainingPromo}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Campaign Deployment Submit button */}
                <button
                  type="submit"
                  disabled={submittingAd}
                  className="cursor-pointer w-full bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 disabled:from-stone-300 disabled:to-stone-400 disabled:cursor-not-allowed text-white text-xs font-extrabold uppercase py-3.5 px-6 rounded-2xl transition-all border-b-[4px] border-b-amber-900 flex items-center justify-center gap-2 shadow-md active:translate-y-px"
                >
                  {submittingAd ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Clearing Gateway & Injecting campaign...</span>
                    </>
                  ) : (
                    <>
                      <span>Publish Ad Billboard Campaign ⚡</span>
                    </>
                  )}
                </button>
              </form>

              {/* Right Column: Live Interactive Mockup Banner Preview (5 Columns) */}
              <div className="col-span-1 lg:col-span-5 flex flex-col justify-start space-y-4 w-full">
                <div className="border border-stone-200 bg-stone-50 rounded-2xl p-4 text-center">
                  <span className="text-[10px] font-black text-stone-500 uppercase tracking-widest block">📻 Live Billboard Card Mockup Preview</span>
                  <p className="text-[9px] text-[#7a766f] font-semibold mt-0.5">As drafted by you, this displays on the top rotating index of feed listings!</p>
                </div>

                {/* Active Slide Mockup display */}
                <div className={`relative text-white p-6 md:p-8 rounded-3xl flex flex-col justify-center bg-gradient-to-br ${adGradient} border border-b-[8px] border-black/30 shadow-xl overflow-hidden min-h-[220px] transition-all`}>
                  <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent pointer-events-none" />
                  
                  <div className="space-y-3.5 relative z-10 text-left">
                    <span className="inline-flex px-3 py-1 bg-white/10 rounded-xl text-[9px] font-black tracking-widest font-mono border border-white/20 uppercase">
                      📌 {adPaymentChoice === 'free_privilege' ? `${currentUser.subscriptionTier || 'Sponsor'} Promo` : 'Sponsored Billboard'} • Campaign
                    </span>

                    <h2 className="text-xl md:text-2xl font-serif font-black tracking-tight leading-tight flex items-center gap-2">
                      <span className="text-2xl shrink-0 select-none">{adIcon}</span>
                      <span>{adTitle || 'Hospital Slogan Title'}</span>
                    </h2>

                    <p className="text-neutral-200 text-xs font-semibold leading-relaxed line-clamp-3">
                      {adDescription || 'Your comprehensive, custom promotional outreach pitch copy will appear here live... Enter description details in the left form panel.'}
                    </p>

                    <div className="flex flex-wrap items-center gap-3 pt-1">
                      <span className="text-[10px] uppercase font-black tracking-wider text-amber-300">
                        🏢 {adSponsor || 'Sponsor brand name'}
                      </span>
                    </div>
                  </div>

                  {/* CTA Link out mock up */}
                  <div className="shrink-0 flex flex-col gap-2 mt-5 relative z-10">
                    <div className="bg-white text-stone-900 border-b-4 border-b-stone-300 px-4 py-2 rounded-2xl text-[10px] font-black tracking-wider uppercase transition-all flex items-center justify-center gap-1.5 w-full text-center">
                      <span>{adCtaText}</span>
                      <ChevronRight className="w-3.5 h-3.5 text-stone-850" />
                    </div>
                  </div>
                </div>

                {/* Duration pill display info */}
                <div className="bg-white border rounded-2xl p-3 flex justify-between text-[10px] font-bold text-[#5a5a40]">
                  <span>Campaign Run Cycle:</span>
                  <span className="text-amber-700 uppercase">
                    ⏰ {adPaymentChoice === 'pay_7_days' ? '7 Days Out (Auto-Expires)' : '3 Days Out (Auto-Expires)'}
                  </span>
                </div>

                {/* Active campaigns owned by current user */}
                <div className="border border-[#e3dec9] bg-[#fdfbf7] rounded-2xl p-4.5 space-y-3 shadow-xs">
                  <h4 className="text-xs font-serif font-black text-[#373735] flex items-center gap-1.5 border-b border-[#e3dec9] pb-2 uppercase tracking-tight">
                    <span>📡</span> <span>Your Active Billboard Ads</span>
                  </h4>
                  {activeAds.length === 0 ? (
                    <div className="text-[10px] uppercase font-black text-stone-400 p-6 border border-dashed border-[#e3dec9] rounded-xl text-center bg-stone-50/50">
                      No live billboard campaigns found
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {activeAds.map(ad => {
                        const isDeletingThis = deletingAdId === ad.id;
                        return (
                          <div key={ad.id} className="p-3 bg-white border border-[#e3dec9] rounded-xl flex flex-col justify-between gap-3 text-xs font-bold text-neutral-800 shadow-sm animate-none">
                            {!isDeletingThis ? (
                              <div className="flex items-center justify-between gap-2 w-full">
                                <div className="text-left space-y-1">
                                  <div className="font-serif font-black text-stone-850 flex flex-wrap items-center gap-1.5 leading-tight">
                                    <span>{ad.icon || '🩺'}</span> <span>{ad.title}</span>
                                    {ad.status === 'pending' ? (
                                      <span className="bg-amber-100 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded text-[7px] font-black uppercase">
                                        Pending Approval
                                      </span>
                                    ) : ad.status === 'rejected' ? (
                                      <span className="bg-red-100 text-red-800 border border-red-200 px-1.5 py-0.5 rounded text-[7px] font-black uppercase">
                                        Rejected
                                      </span>
                                    ) : (
                                      <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 px-1.5 py-0.5 rounded text-[7px] font-black uppercase">
                                        Approved
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[9px] text-[#7a766f] font-semibold flex flex-wrap items-center gap-2">
                                    <span className="bg-[#5a5a40]/10 text-[#5a5a40] px-1.5 py-0.5 rounded text-[8px] font-black uppercase">
                                      {ad.pricePaid === 0 ? 'Free Promo' : `Rs. ${ad.pricePaid}`}
                                    </span>
                                    <span>Expires: {new Date(ad.expiresAt).toLocaleDateString()}</span>
                                  </div>
                                  {ad.transactionId && (
                                    <div className="text-[8.5px] font-mono text-[#7a766f]/90 bg-stone-50 border border-stone-200 p-1 rounded-md">
                                      Method: <span className="font-bold">{ad.paymentMethod}</span> | TxID: <span className="font-mono font-bold text-neutral-800">{ad.transactionId}</span>
                                    </div>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setDeletingAdId(ad.id)}
                                  className="bg-red-50 hover:bg-red-100 text-red-600 font-extrabold text-[10px] px-2.5 py-1.5 rounded-lg border border-red-200 transition-colors cursor-pointer shrink-0 ml-2 animate-none font-mono"
                                >
                                  Remove ✕
                                </button>
                              </div>
                            ) : (
                              <div className="w-full flex flex-col gap-2.5 bg-red-50/50 p-2.5 rounded-lg border border-red-200 animate-none">
                                <div className="text-left space-y-1">
                                  <p className="text-[10px] text-red-950 font-extrabold flex items-center gap-1 leading-tight">
                                    <span>⚠️</span> <span>Are you absolutely sure you want to stop and delete your advertisement "{ad.title}" immediately?</span>
                                  </p>
                                  <p className="text-[8.5px] text-red-800/85 font-black uppercase tracking-wider leading-normal">
                                    This action is final and irreversible.
                                  </p>
                                </div>
                                <div className="flex gap-2 justify-end w-full">
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      try {
                                        await PromotionalAdsService.deleteAd(ad.id);
                                        setDeletingAdId(null);
                                        loadActiveAds();
                                      } catch (err) {
                                        console.error('Failed deletion', err);
                                      }
                                    }}
                                    className="bg-red-600 hover:bg-red-700 text-white font-extrabold text-[9.5px] px-3 py-1.5 rounded-lg border border-red-700 shadow-sm cursor-pointer transition-all uppercase tracking-wide"
                                  >
                                    Yes, Delete Ad
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setDeletingAdId(null)}
                                    className="bg-white hover:bg-neutral-50 text-stone-700 font-bold text-[9.5px] px-3 py-1.5 rounded-lg border border-stone-200 shadow-sm cursor-pointer transition-all uppercase tracking-wide"
                                  >
                                    No, Cancel
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ACTIVE FILTER BADGES */}
      {(searchTerm || cityFilterActive || currentUser.location) && (
        <div className="flex flex-wrap items-center gap-2 bg-[#fdfcf7] border border-[#e3dec9] p-3.5 rounded-2xl animate-fadeIn">
          <span className="text-[10px] text-[#7a766f] font-black uppercase tracking-wider mr-1">Active Filters:</span>
          
          {searchTerm && (
            <span className="inline-flex items-center gap-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 text-[11px] font-bold px-3 py-1 rounded-xl border border-stone-300 transition-colors">
              <span>Search: "{searchTerm}"</span>
              <button 
                onClick={() => setSearchTerm('')} 
                className="hover:text-red-600 font-extrabold focus:outline-none cursor-pointer p-0 bg-transparent border-none text-[11px]"
              >
                ✕
              </button>
            </span>
          )}

          {cityFilterActive && (
            <span className="inline-flex items-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-800 text-[11px] font-bold px-3 py-1 rounded-xl border border-red-200 transition-colors">
              <span>City: {cityFilterActive}</span>
              <button 
                onClick={() => {
                  setCityFilterActive('');
                  if (sortBy === SORT_TYPES.NEAREST) {
                    setSortBy(SORT_TYPES.HIGHEST);
                  }
                }} 
                className="hover:text-red-600 font-extrabold focus:outline-none cursor-pointer p-0 bg-transparent border-none text-[11px]"
              >
                ✕
              </button>
            </span>
          )}

          {currentUser.location && (
            <span className="inline-flex items-center gap-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 text-[11px] font-bold px-3 py-1 rounded-xl border border-amber-200 transition-colors">
              <span>Location: {currentUser.location.address || 'Hospital Center'}</span>
              <button 
                onClick={() => {
                  const freshUser = { ...currentUser, location: null };
                  onUpdateUser(freshUser);
                  secureSetItem('va_session', JSON.stringify(freshUser));
                  const rawUsers = secureGetItem('va_users');
                  const localUsers = JSON.parse(rawUsers || '[]');
                  const idx = localUsers.findIndex((u: any) => u.uid === currentUser.uid);
                  if (idx !== -1) {
                    localUsers[idx].location = null;
                    secureSetItem('va_users', JSON.stringify(localUsers));
                  }
                  if (sortBy === SORT_TYPES.NEAREST) {
                    setSortBy(SORT_TYPES.HIGHEST);
                  }
                }} 
                className="hover:text-red-600 font-extrabold focus:outline-none cursor-pointer p-0 bg-transparent border-none text-[11px]"
              >
                ✕
              </button>
            </span>
          )}

          <button
            onClick={handleResetAllFilters}
            className="text-[10px] font-mono font-bold text-[#5a5a40] hover:text-red-600 hover:underline ml-auto focus:outline-none cursor-pointer bg-transparent border-none"
          >
            Clear All Filters ✕
          </button>
        </div>
      )}

      {/* SPECIALIST GRID LIST */}



      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-3xl h-64 border border-[#e3dec9] border-b-[4px] animate-pulse" />
          ))}
        </div>
      ) : filteredProfessionals.length === 0 ? (
        <div className="text-center p-16 bg-white rounded-3xl border-2 border-dashed border-[#e3dec9] shadow-sm flex flex-col items-center justify-center max-w-xl mx-auto space-y-4">
          <div className="text-5xl animate-bounce">🔍</div>
          <h3 className="font-serif text-xl font-black text-[#373735]">No Directory Profiles Found</h3>
          <p className="text-xs text-[#7a766f] font-semibold leading-relaxed max-w-md">
            No medical centers or registered vet doctors were found matching your current filter set. Reset your query parameters to see all active practitioners.
          </p>
          <div className="pt-2">
            <button
              onClick={handleResetAllFilters}
              className="btn-tactile-3d-secondary bg-[#5a5a40] text-white border-[#3c3c2b] hover:bg-[#4a4a34] px-6 py-2.5 text-xs font-black cursor-pointer transition-colors"
            >
              Reset All Filters & View All Cards 🔄
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 text-left">
          {filteredProfessionals.map((prof) => {
            const initials = prof.name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
            
            // Calculate distance strictly for clinic profiles using getDistance
            let distance: number | null = null;
            if (prof.role === 'clinic') {
              const userLat = currentUser.location?.lat;
              const userLng = currentUser.location?.lng;

              const lat = (prof as any).lat || (prof.location && prof.location.lat);
              const lng = (prof as any).lng || (prof.location && prof.location.lng);

              if (userLat && userLng && lat && lng) {
                distance = LocationService.getDistance(userLat, userLng, lat, lng);
              }
            }

            return (
              <ThreeDPremiumCard
                key={prof.uid}
                profile={prof}
                onClick={() => handleOpenDetails(prof)}
                distance={distance}
                initials={initials}
              />
            );
          })}
        </div>
      )}

      {/* MODAL DETAILED PORTFOLIO OVERLAY */}
      <AnimatePresence>
        {selectedProfile && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-[999] overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl border border-[#e3dec9] border-b-[6px] border-b-[#cdc6ad] w-full max-w-[650px] max-h-[90vh] overflow-y-auto flex flex-col relative shadow-2xl"
            >
              
              {/* Header Banner */}
              <div className="h-32 bg-gradient-to-r from-[#3e3e2b] to-[#5a5a40] relative shrink-0 overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px] opacity-10" />
                <button
                  onClick={() => setSelectedProfile(null)}
                  className="absolute right-4 top-4 bg-white/20 hover:bg-white/40 text-white font-extrabold w-8 h-8 rounded-full border border-white/20 flex items-center justify-center cursor-pointer text-xs transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* Profile details rendering container */}
              <div className="px-6 md:px-8 pb-8 relative z-10 flex-grow-1 select-none">
                
                {/* Profile Avatar Overlay */}
                <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 -mt-12 mb-6">
                  {selectedProfile.profilePic && selectedProfile.profilePic !== 'default' ? (
                    <img
                      src={selectedProfile.profilePic}
                      className="w-24 h-24 rounded-2xl object-cover border-4 border-white shadow-xl shrink-0 bg-neutral-100"
                      alt=""
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-2xl bg-[#f4f1e9] border-4 border-white shadow-xl text-[#5a5a40] text-3xl font-black font-serif flex items-center justify-center shrink-0 uppercase">
                      {selectedProfile.name.trim()[0]}
                    </div>
                  )}
                  <div className="text-center sm:text-left min-w-0">
                    <h3 className="font-serif font-black text-2.5xl text-[#373735] flex items-center justify-center sm:justify-start gap-2">
                      <span>{selectedProfile.name}</span>
                      {selectedProfile.subscriptionTier ? (
                        <span className={`text-white text-[10px] font-black px-2.5 py-1 rounded-lg border shadow-xs uppercase tracking-widest ${
                          selectedProfile.subscriptionTier === 'Silver' ? 'bg-slate-500 border-slate-400' :
                          selectedProfile.subscriptionTier === 'Gold' ? 'bg-amber-600 border-amber-500' :
                          'bg-indigo-600 border-indigo-500 animate-pulse'
                        }`}>
                          👑 {selectedProfile.subscriptionTier}
                        </span>
                      ) : selectedProfile.isVerified ? (
                        <span className="bg-[#2e7d32] text-white border border-white shadow-md rounded-full text-[10px] w-5 h-5 flex items-center justify-center">✓</span>
                      ) : null}
                    </h3>
                    <div className="flex flex-wrap gap-2 items-center justify-center sm:justify-start mt-1.5">
                      <span className="inline-block px-3 py-1 rounded-xl text-[10px] uppercase font-black tracking-widest bg-[#f4f1e9] text-[#5a5a40] border border-[#e3dec9]">
                        {selectedProfile.subscriptionTier ? `${selectedProfile.subscriptionTier} Certified` : 'Verified'} {selectedProfile.role}
                      </span>
                      {selectedProfile.isOnline ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10px] uppercase font-black tracking-widest bg-[#edf6ef] text-[#2ebd4d] border border-[#b2dfdb]/50">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                          </span>
                          <span>Online</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10px] uppercase font-black tracking-widest bg-stone-50 text-stone-500 border border-stone-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-stone-400 inline-block"></span>
                          <span>
                            Last seen {(() => {
                              const ts = selectedProfile.lastSeen;
                              if (!ts) return 'Offline';
                              const diff = Date.now() - ts;
                              if (diff < 60000) return 'Just now';
                              const mins = Math.floor(diff / 60000);
                              if (mins < 60) return `${mins}m ago`;
                              const hrs = Math.floor(mins / 60);
                              if (hrs < 24) return `${hrs}h ago`;
                              const days = Math.floor(hrs / 24);
                              return `${days}d ago`;
                            })()}
                          </span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Tactical Communications Strip */}
                <div className="flex flex-wrap gap-3 mb-6 py-4.5 border-y border-[#f4f1e9]">
                  {selectedProfile.phone && (
                    <>
                      <a
                        href={`tel:${selectedProfile.phone}`}
                        className="btn-tactile-3d-primary py-2 px-5 text-xs inline-flex items-center gap-2"
                      >
                        📞 Call Professional
                      </a>
                      <a
                        href={`https://wa.me/${selectedProfile.phone.replace(/\D/g, '')}?text=${encodeURIComponent(
                          `Hi ${selectedProfile.name}, I discovered your clinic portfolio profile on VetAxis with premium clinical registries and would like to schedule an evaluation.`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-tactile-3d-secondary py-2 px-5 text-xs inline-flex items-center gap-2 bg-[#a0522d] border-[#7d3e20]/60 border-b-[#733517] text-white hover:bg-[#b05d36]"
                      >
                        💬 WhatsApp Consult
                      </a>
                    </>
                  )}

                  {selectedProfile.location?.lat && selectedProfile.location?.lng && (
                    <a
                      href={`https://www.google.com/maps?q=${selectedProfile.location.lat},${selectedProfile.location.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-tactile-3d-secondary py-2 px-5 text-xs text-emerald-800 bg-emerald-100 hover:bg-emerald-150 border-emerald-300 inline-flex items-center gap-1.5"
                    >
                      🗺️ Show on Google Maps
                    </a>
                  )}

                  {selectedProfile.role === 'clinic' && currentUser.role === 'user' && (selectedProfile.subscriptionTier === 'Silver' || selectedProfile.subscriptionTier === 'Gold' || selectedProfile.subscriptionTier === 'Platinum') && (
                    <button
                      type="button"
                      onClick={() => setIsBookingModeOpen(!isBookingModeOpen)}
                      className={`btn-tactile-3d-secondary py-2 px-5 text-xs inline-flex items-center gap-2 border border-emerald-300 font-bold transition-all cursor-pointer rounded-xl ${
                        isBookingModeOpen 
                          ? 'bg-[#5a5a40] text-white border-b-[3px] border-b-[#3c3c2b]' 
                          : 'bg-emerald-200 text-emerald-900 font-black border-b-[3px] border-b-emerald-400 hover:bg-emerald-250 animate-pulse'
                      }`}
                    >
                      📅 {isBookingModeOpen ? 'Close Booking Panel' : 'Book Online Appointment'}
                    </button>
                  )}
                </div>

                {/* INLINE APPOINTMENT BOOKING PANEL */}
                {selectedProfile.role === 'clinic' && currentUser.role === 'user' && (selectedProfile.subscriptionTier === 'Silver' || selectedProfile.subscriptionTier === 'Gold' || selectedProfile.subscriptionTier === 'Platinum') && isBookingModeOpen && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mb-6 p-5 bg-[#edf6ef] border border-emerald-200 border-b-[4px] border-b-emerald-300 rounded-3xl text-left text-xs font-semibold space-y-4 shadow-inner"
                  >
                    <div className="flex items-center justify-between border-b border-emerald-200 pb-2">
                      <h4 className="font-serif font-black text-sm text-emerald-950 flex items-center gap-1.5 uppercase tracking-wider">
                        <span>📅 Book Online Appointment</span>
                      </h4>
                      <span className="text-[9px] text-emerald-800 font-bold bg-white px-2 py-0.5 rounded-lg border border-emerald-200">Express Clinic Portal</span>
                    </div>

                    {bookingSuccess ? (
                      <div className="p-4 bg-emerald-50 border border-emerald-400 text-emerald-800 font-bold rounded-xl text-center">
                        {bookingSuccess}
                      </div>
                    ) : (
                      <form onSubmit={handleClinicBookingSubmit} className="space-y-3">
                        {bookingError && (
                          <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 font-extrabold rounded-lg text-center">
                            ⚠️ {bookingError}
                          </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="font-bold text-[#373735]">Patient Name & Breed/Species <span className="text-red-500">*</span></label>
                            <input 
                              type="text" 
                              required
                              placeholder="e.g. Cleo (Persian Cat) or Bruno (Labrador)" 
                              value={bookingForm.patientName} 
                              onChange={(e) => setBookingForm({...bookingForm, patientName: e.target.value})} 
                              className="w-full bg-white border border-[#e3dec9] p-2 rounded-xl text-xs" 
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="font-bold text-[#373735]">Pet Owner Name <span className="text-red-500">*</span></label>
                            <input 
                              type="text" 
                              required
                              placeholder="Your Name" 
                              value={bookingForm.ownerName} 
                              onChange={(e) => setBookingForm({...bookingForm, ownerName: e.target.value})} 
                              className="w-full bg-white border border-[#e3dec9] p-2 rounded-xl text-xs" 
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="font-bold text-[#373735]">WhatsApp / Hotline Phone <span className="text-red-500">*</span></label>
                            <input 
                              type="text" 
                              required
                              placeholder="e.g. 0333-1234567" 
                              value={bookingForm.ownerPhone} 
                              onChange={(e) => setBookingForm({...bookingForm, ownerPhone: e.target.value})} 
                              className="w-full bg-white border border-[#e3dec9] p-2 rounded-xl text-xs" 
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="font-bold text-[#373735]">Booking Context / Type</label>
                            <select 
                              value={bookingForm.type} 
                              onChange={(e) => setBookingForm({...bookingForm, type: e.target.value as any})} 
                              className="w-full bg-white border border-[#e3dec9] p-2 rounded-xl text-xs"
                            >
                              <option value="consultation">📅 Clinical Consultation</option>
                              <option value="surgery">🩺 Special Surgery</option>
                              <option value="grooming">✂️ Dynamic Grooming</option>
                              <option value="vaccination">💉 Vaccination Cycle</option>
                              <option value="follow-up">🔄 Routine Follow-up</option>
                              <option value="emergency">🚨 Emergency Assistance</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="font-bold text-[#373735]">Appointment Date</label>
                            <input 
                              type="date" 
                              value={bookingForm.date} 
                              onChange={(e) => setBookingForm({...bookingForm, date: e.target.value})} 
                              className="w-full bg-white border border-[#e3dec9] p-2 rounded-xl text-xs" 
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="font-bold text-[#373735]">Appointment Time</label>
                            <input 
                              type="time" 
                              value={bookingForm.time} 
                              onChange={(e) => setBookingForm({...bookingForm, time: e.target.value})} 
                              className="w-full bg-white border border-[#e3dec9] p-2 rounded-xl text-xs" 
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="font-bold text-[#373735]">Description of Symptoms or Notes</label>
                          <textarea 
                            placeholder="Write brief clinical notes, duration, or general symptoms..." 
                            value={bookingForm.notes} 
                            onChange={(e) => setBookingForm({...bookingForm, notes: e.target.value})} 
                            className="w-full bg-white border border-[#e3dec9] p-2 rounded-xl h-18 text-xs resize-none" 
                          />
                        </div>

                        <div className="flex justify-end gap-2 pt-2 border-t border-emerald-250">
                          <button 
                            type="button" 
                            onClick={() => setIsBookingModeOpen(false)} 
                            className="bg-stone-100 hover:bg-stone-250 text-stone-700 px-3 py-1.5 rounded-xl font-bold cursor-pointer border-none"
                          >
                            Close
                          </button>
                          <button 
                            type="submit" 
                            className="bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-1.5 rounded-xl font-bold border-none cursor-pointer shadow-sm active:translate-y-[1px]"
                          >
                            File Booking Record
                          </button>
                        </div>
                      </form>
                    )}
                  </motion.div>
                )}

                {/* Information details */}
                <div className="space-y-4 mb-6 text-left">
                  <h4 className="font-serif font-black text-base text-[#373735] flex items-center gap-1.5">
                    <Trophy className="w-5 h-5 text-[#5a5a40]" />
                    <span>Credentials & Facilities</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                    {selectedProfile.email && (
                      <div className="p-3 bg-[#fcf9f2] rounded-2xl border border-[#e3dec9] border-b-[2px]">
                        <div className="font-extrabold text-[#a49f92] uppercase text-[9px] tracking-widest">Verified Email</div>
                        <div className="mt-1.5 font-bold text-[#373735] font-mono break-all">{selectedProfile.email}</div>
                      </div>
                    )}
                    {selectedProfile.phone && (
                      <div className="p-3 bg-[#fcf9f2] rounded-2xl border border-[#e3dec9] border-b-[2px]">
                        <div className="font-extrabold text-[#a49f92] uppercase text-[9px] tracking-widest">Direct Hotline</div>
                        <div className="mt-1.5 font-bold text-[#373735]">{selectedProfile.phone}</div>
                      </div>
                    )}
                    {selectedProfile.expertise && (
                      <div className="p-3 bg-[#fcf9f2] rounded-2xl border border-[#e3dec9] border-b-[2px] sm:col-span-2">
                        <div className="font-extrabold text-[#a49f92] uppercase text-[9px] tracking-widest">Area of expertise</div>
                        <div className="mt-1.5 font-bold text-[#373735]">{selectedProfile.expertise}</div>
                      </div>
                    )}
                    {selectedProfile.facilities && (
                      <div className="p-3 bg-[#fcf9f2] rounded-2xl border border-[#e3dec9] border-b-[2px] sm:col-span-2">
                        <div className="font-extrabold text-[#a49f92] uppercase text-[9px] tracking-widest">Clinic Services Catalog</div>
                        <div className="mt-1.5 font-bold text-[#373735]">{selectedProfile.facilities}</div>
                      </div>
                    )}
                    {selectedProfile.address && (
                      <div className="p-3 bg-[#fcf9f2] rounded-2xl border border-[#e3dec9] border-b-[2px] sm:col-span-2">
                        <div className="font-extrabold text-[#a49f92] uppercase text-[9px] tracking-widest">Physical Address</div>
                        <div className="mt-1.5 font-bold text-[#373735]">{selectedProfile.address}</div>
                      </div>
                    )}

                    {selectedProfile.location?.lat && selectedProfile.location?.lng && (
                      <div className="p-3 bg-[#edf6ef]/40 rounded-2xl border border-emerald-100/50 sm:col-span-2 space-y-2">
                        <div className="font-extrabold text-emerald-800 uppercase text-[9px] tracking-widest flex items-center gap-1">
                          <span>📍 Exact Google Map Pinpoint</span>
                        </div>
                        <div className="border border-emerald-200 rounded-xl overflow-hidden shadow-2xs bg-white">
                          <InteractiveClinicMap
                            lat={selectedProfile.location.lat}
                            lng={selectedProfile.location.lng}
                            interactive={false}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* KEY REVIEWS & CLIENT EVALUATIONS */}
                <div className="space-y-4 text-left border-t border-[#f4f1e9] pt-6">
                  <div className="flex items-center justify-between">
                    <h4 className="font-serif font-black text-base text-[#373735] flex items-center gap-1.5">
                      <Award className="w-5 h-5 text-[#5a5a40]" />
                      <span>Client Evaluation Records</span>
                    </h4>
                    {modalReviews.length > 0 && (
                      <select
                        value={reviewSort}
                        onChange={(e) => setReviewSort(e.target.value as any)}
                        className="text-[10px] font-black border border-[#e3dec9] rounded-xl p-1.5 bg-white cursor-pointer"
                      >
                        <option value="newest">🕒 Newest First</option>
                        <option value="highest">⭐ Rating Score</option>
                      </select>
                    )}
                  </div>

                  {/* Rating Summary card */}
                  <div className="flex items-center gap-4 bg-[#fcf9f2] p-4 rounded-2xl border border-[#e3dec9]">
                    <div className="text-4xl font-serif font-black text-[#3c3c3b]">
                      {selectedProfile.avgRating ? selectedProfile.avgRating.toFixed(1) : '—'}
                    </div>
                    <div>
                      <div className="flex gap-0.5 text-lg text-[#f5a623]">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <span key={i}>
                            {i < Math.round(selectedProfile.avgRating || 0) ? '★' : '☆'}
                          </span>
                        ))}
                      </div>
                      <div className="text-[10px] text-[#a49f92] font-extrabold uppercase tracking-widest mt-0.5">
                        Based on {modalReviews.length} authenticated clinical audits
                      </div>
                    </div>
                  </div>

                  {/* Write a review forms */}
                  {currentUser.uid !== selectedProfile.uid && canUserReview(currentUser.role, selectedProfile.role) && (() => {
                    const existingReview = modalReviews.find(r => r.reviewerEmail === currentUser.email);
                    return (
                      <form onSubmit={handleSubmitReview} className="bg-[#fcf9f2] border border-[#e3dec9] p-5 rounded-2xl space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="text-xs font-black text-[#5a5a40] uppercase tracking-wider">
                            {existingReview ? 'Update Your Evaluation' : 'Write client evaluation'}
                          </div>
                          {existingReview && (
                            <span className="text-[9px] bg-amber-100 text-amber-800 font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                              Already Rated - Edit Mode
                            </span>
                          )}
                        </div>
                        
                        {reviewError && (
                          <div className="text-xs text-red-700 font-bold bg-red-50 p-2.5 rounded-xl border border-red-200">
                            ⚠️ {reviewError}
                          </div>
                        )}

                        {/* Star selection */}
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[#7a766f]">Star Rating Assessment:</span>
                          <div className="flex gap-1 cursor-pointer">
                            {Array.from({ length: 5 }).map((_, i) => {
                              const val = i + 1;
                              const isPurpleStar = val <= reviewRating;
                              return (
                                <button
                                  type="button"
                                  key={i}
                                  onClick={() => setReviewRating(val)}
                                  className={`bg-transparent border-none p-0 cursor-pointer text-2xl transition-all scale-100 hover:scale-125 ${
                                    isPurpleStar ? 'text-[#f5a623]' : 'text-stone-300'
                                  }`}
                                >
                                  ★
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <textarea
                          value={reviewComment}
                          onChange={(e) => setReviewComment(e.target.value)}
                          placeholder="Share your treatment experience with the community (max 200 words)…"
                          rows={3}
                          className="form-control text-xs bg-white"
                          disabled={submitLoading}
                          required
                        />

                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-[#a49f92] font-semibold">
                            {reviewComment.trim().split(/\s+/).filter(Boolean).length} / 200 words max
                          </span>
                          <button
                            type="submit"
                            disabled={submitLoading}
                            className="btn-tactile-3d-primary py-2 px-5 text-2xs"
                          >
                            {submitLoading 
                              ? (existingReview ? 'Updating Audit…' : 'Filing Audit…') 
                              : (existingReview ? 'Update Audit Record' : 'Submit Audit Record')
                            }
                          </button>
                        </div>
                      </form>
                    );
                  })()}

                  {/* Review lists */}
                  <div className="space-y-3.5 max-h-60 overflow-y-auto pr-1">
                    {sortedReviews.length === 0 ? (
                      <div className="text-center p-8 text-xs text-[#a49f92] font-semibold bg-neutral-50 rounded-2xl border border-dashed border-[#e3dec9]">
                        No audits cataloged yet. Submit an evaluation to certify this practitioner.
                      </div>
                    ) : (
                      sortedReviews.map((r, idx) => (
                        <div
                          key={idx}
                          className="bg-[#fcf9f2]/65 rounded-2xl p-4 border border-[#e3dec9] text-xs text-[#373735] flex flex-col justify-between"
                        >
                          <div className="flex items-start justify-between gap-4 mb-2">
                            <div>
                              <span className="font-extrabold text-[#373735]">{r.reviewerName}</span>
                              <span className="text-[9px] uppercase font-black text-[#5a5a40] bg-[#f4f1e9] border border-[#e3dec9] px-2 py-0.5 ml-2 rounded-lg tracking-wider">
                                {r.reviewerRole}
                              </span>
                            </div>
                            <div className="text-right shrink-0">
                              <div className="text-[#f5a623] font-bold">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</div>
                              <span className="text-[9px] text-[#a49f92] font-semibold">
                                {new Date(r.date).toLocaleDateString('en-PK', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric'
                                })}
                              </span>
                            </div>
                          </div>
                          {r.comment && <p className="text-[#4a4a48] mt-1 pr-1 font-medium leading-relaxed bg-white border border-[#f4f1e9] p-2.5 rounded-xl">{r.comment}</p>}
                        </div>
                      ))
                    )}
                  </div>

                </div>

              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Search by City / Current Location custom prompt modal */}
      <AnimatePresence>
        {doctorLocationModalOpen && (
          <div className="fixed inset-0 bg-neutral-900/65 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-[#fcf9f2] w-full max-w-md rounded-3xl border border-[#e3dec9] border-b-[6px] border-b-[#cdc6ad] shadow-[0_24px_48px_rgba(30,30,20,0.22)] p-6 z-50 relative text-left overflow-hidden space-y-6"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">📍</span>
                  <h3 className="font-serif font-black text-lg text-[#373735] tracking-tight">Nearest Proximity Search</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setDoctorLocationModalOpen(false)}
                  className="w-7 h-7 flex items-center justify-center rounded-xl border border-[#e3dec9] bg-white hover:bg-neutral-50 text-neutral-500 font-black transition-all text-xs cursor-pointer focus:outline-none"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-amber-50 border border-amber-200/80 rounded-2xl text-[#6b471c] text-2xs font-semibold leading-relaxed space-y-1">
                  <p className="font-extrabold uppercase tracking-wide text-amber-800 flex items-center gap-1.5">
                    🔎 Nearest Location Search
                  </p>
                  <p>You can search clinicians and clinics within a specific city/town to find and sort the nearest ones to that area.</p>
                </div>

                <div className="space-y-2.5">
                  <label className="text-2xs uppercase font-extrabold text-[#5a5a40] tracking-wider block">Search by City / Town name</label>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleCitySearchSubmit(popCityInput);
                    }}
                    className="flex gap-2"
                  >
                    <div className="relative flex-1">
                      <input
                        type="text"
                        className="form-control bg-white text-xs py-2.5 w-full pr-8"
                        placeholder="e.g. Peshawar, Lahore, Islamabad, Karachi"
                        value={popCityInput}
                        onChange={(e) => setPopCityInput(e.target.value)}
                        required
                      />
                      {popCityInput && (
                        <button
                          type="button"
                          onClick={() => setPopCityInput('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 font-bold text-2xs cursor-pointer focus:outline-none"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                    <button
                      type="submit"
                      className="btn-tactile-3d-secondary bg-[#5a5a40] text-white border-[#444430] hover:bg-[#4d4d37] px-4 text-xs font-black cursor-pointer"
                    >
                      Search
                    </button>
                  </form>
                  <p className="text-[10px] text-stone-500 font-semibold italic">
                    Type any municipal town or city to narrow down directory listings.
                  </p>
                </div>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
