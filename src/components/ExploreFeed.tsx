import React, { useState, useEffect, FormEvent, useRef } from 'react';
import { UserProfile, Review, SORT_TYPES, UserRole, canUserReview, PromotionalAd } from '../types';
import { ExploreService, LocationService, PromotionalAdsService } from '../lib/storage';
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from 'motion/react';
import { Star, MapPin, Search, Phone, Trophy, ChevronRight, ChevronLeft, X, Award, Compass, MessageSquare, ShoppingBag, Grid } from 'lucide-react';
import { ThreeDPremiumCard } from './ThreeDPremiumCard';

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
  const [gpsPopupVisible, setGpsPopupVisible] = useState<boolean>(false);
  const [gpsPopupMessage, setGpsPopupMessage] = useState<string>('');

  // Nearest sorting & geographic filter popup states
  const [doctorLocationModalOpen, setDoctorLocationModalOpen] = useState<boolean>(false);
  const [popCityInput, setPopCityInput] = useState<string>('');
  const [cityFilterActive, setCityFilterActive] = useState<string>('');

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
    localStorage.setItem('va_session', JSON.stringify(updatedUser));

    setCityFilterActive(term);
    setSortBy(SORT_TYPES.NEAREST);
    setDoctorLocationModalOpen(false);
  };

  const handleUseCurrentGPS = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setLocLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const updatedUser = {
          ...currentUser,
          location: {
            lat: latitude,
            lng: longitude,
            address: 'My GPS Location'
          }
        };
        onUpdateUser(updatedUser);
        localStorage.setItem('va_session', JSON.stringify(updatedUser));

        setCityFilterActive('');
        setSortBy(SORT_TYPES.NEAREST);
        setLocLoading(false);
        setDoctorLocationModalOpen(false);
      },
      (err) => {
        setLocLoading(false);
        alert('Access denied/unavailable for GPS coordinate tracking on this device. Please use the fallback City search search fields instead.');
      }
    );
  };
  
  // Geolocation states
  const [locLoading, setLocLoading] = useState<boolean>(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // Detail Modal states
  const [selectedProfile, setSelectedProfile] = useState<UserProfile | null>(null);
  const [modalReviews, setModalReviews] = useState<Review[]>([]);
  const [reviewRating, setReviewRating] = useState<number>(0);
  const [reviewComment, setReviewComment] = useState<string>('');
  const [reviewSort, setReviewSort] = useState<'newest' | 'highest'>('newest');
  const [submitLoading, setSubmitLoading] = useState<boolean>(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

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

  // Handle GPS location activation
  const handleLocateMe = async () => {
    if (currentUser.location) {
      // Toggle off locations
      setLocLoading(true);
      try {
        await ExploreService.sortUsers([], SORT_TYPES.HIGHEST, null); // resets
        const freshUser = { ...currentUser, location: null };
        onUpdateUser(freshUser);
        localStorage.setItem('va_session', JSON.stringify(freshUser));
        
        // Remove from users list too
        const localUsers = JSON.parse(localStorage.getItem('va_users') || '[]');
        const idx = localUsers.findIndex((u: any) => u.uid === currentUser.uid);
        if (idx !== -1) {
          localUsers[idx].location = null;
          localStorage.setItem('va_users', JSON.stringify(localUsers));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLocLoading(false);
      }
      return;
    }

    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser.');
      return;
    }

    setLocLoading(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          // Reverse geocode via OpenStreetMap public Nominatim
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`,
            { headers: { 'Accept-Language': 'en' } }
          );
          let addr = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
          if (res.ok) {
            const data = await res.json();
            const a = data.address || {};
            const parts = [
              a.neighbourhood || a.suburb || a.village || a.town || a.city,
              a.state_district || a.county || a.state,
              a.country
            ].filter(Boolean);
            if (parts.length > 0) addr = parts.join(', ');
          }

          const locationObj = { lat: latitude, lng: longitude, address: addr };
          const freshUser = { ...currentUser, location: locationObj };
          
          // Save locally first
          onUpdateUser(freshUser);
          localStorage.setItem('va_session', JSON.stringify(freshUser));
          setSortBy(SORT_TYPES.NEAREST);
          
          // Update in user collections too
          const localUsers = JSON.parse(localStorage.getItem('va_users') || '[]');
          const idx = localUsers.findIndex((u: any) => u.uid === currentUser.uid);
          if (idx !== -1) {
            localUsers[idx].location = locationObj;
            localStorage.setItem('va_users', JSON.stringify(localUsers));
          }

        } catch (err) {
          console.error(err);
          setGpsError('Failed to geocode location address.');
        } finally {
          setLocLoading(false);
        }
      },
      (err) => {
        setLocLoading(false);
        if (err.code === 1) setGpsError('Location access was denied. Enable permission in settings.');
        else if (err.code === 2) setGpsError('Position unavailable. Check your network.');
        else setGpsError('GPS Request Timed out.');
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Open detail panel
  const handleOpenDetails = (profile: UserProfile) => {
    setSelectedProfile(profile);
    const reviews = profile.reviews || [];
    setModalReviews(reviews);
    setReviewRating(0);
    setReviewComment('');
    setReviewError(null);
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

      setReviewComment('');
      setReviewRating(0);
    } catch (err: any) {
      setReviewError(err.message || 'Failed to submit review.');
    } finally {
      setSubmitLoading(false);
    }
  };

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
    currentUser.location || null
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
            initial={{ rotateY: 90, opacity: 0 }}
            animate={{ rotateY: 0, opacity: 1 }}
            exit={{ rotateY: -90, opacity: 0 }}
            transition={{ duration: 0.35, ease: "easeInOut" }}
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
                      <span>Active GPS Base: {currentUser.location.address}</span>
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
        
        {/* Left tabs & GPS */}
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

          {activeTab === 'clinic' && (
            <>
              <motion.button
                id="va-gps-btn"
                whileTap={{ scale: 0.95 }}
                onClick={handleLocateMe}
                disabled={locLoading}
                className={`btn-tactile-3d-secondary py-2.5 px-4.5 text-xs inline-flex items-center gap-2 ${
                  currentUser.location ? 'bg-[#5a5a40] text-white border-[#4a4a34]' : ''
                }`}
              >
                {locLoading ? (
                  <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span className="w-2.5 h-2.5 bg-current rounded-full" />
                )}
                <span>{currentUser.location ? '📍 Distance Sort Active' : 'Enable My GPS'}</span>
              </motion.button>

              {gpsError && (
                <span className="text-[10px] text-red-600 bg-red-150 py-1.5 px-3 rounded-xl border border-red-200 font-bold">
                  ⚠️ {gpsError}
                </span>
              )}
            </>
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



      {/* SPECIALIST GRID LIST */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-3xl h-64 border border-[#e3dec9] border-b-[4px] animate-pulse" />
          ))}
        </div>
      ) : filteredProfessionals.length === 0 ? (
        <div className="text-center p-16 bg-white rounded-3xl border border-[#e3dec9] border-b-[5px] border-b-[#cdc6ad] shadow-sm">
          <div className="text-5xl mb-3">🔍</div>
          <h3 className="font-serif text-lg font-black text-[#373735]">No Verified Profiles Configured</h3>
          <p className="text-sm text-[#7a766f] font-semibold mt-1">Try adjusting your search filters or clear location queries.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 text-left">
          {filteredProfessionals.map((prof) => {
            const initials = prof.name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
            
            // Calculate distance if GPS latlng is present
            let distance: number | null = null;
            if (currentUser.location && prof.location?.lat && prof.location?.lng) {
              distance = LocationService.haversine(
                currentUser.location.lat,
                currentUser.location.lng,
                prof.location.lat,
                prof.location.lng
              );
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

                  {selectedProfile.location && selectedProfile.role !== 'doctor' && (
                    <a
                      href={`https://www.google.com/maps?q=${selectedProfile.location.lat},${selectedProfile.location.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-tactile-3d-secondary py-2 px-5 text-xs text-emerald-800 bg-emerald-100 hover:bg-emerald-150 border-emerald-300"
                    >
                      🗺️ Show on Map
                    </a>
                  )}
                </div>

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
                  {currentUser.uid !== selectedProfile.uid && canUserReview(currentUser.role, selectedProfile.role) && (
                    <form onSubmit={handleSubmitReview} className="bg-[#fcf9f2] border border-[#e3dec9] p-5 rounded-2xl space-y-4">
                      <div className="text-xs font-black text-[#5a5a40] uppercase tracking-wider">Write client evaluation</div>
                      
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
                          {submitLoading ? 'Filing Audit…' : 'Submit Audit Record'}
                        </button>
                      </div>
                    </form>
                  )}

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

      {/* Floating GPS activation warning toast */}
      <AnimatePresence>
        {gpsPopupVisible && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', duration: 0.5 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4 pointer-events-auto"
          >
            <div className="bg-[#fcf9f2] border-2 border-amber-900 rounded-2xl p-4.5 shadow-[0_12px_36px_rgba(0,0,0,0.15)] border-b-[5px] border-b-amber-950 flex items-start gap-3.5">
              <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center text-lg border border-amber-300 shrink-0 select-none">
                📍
              </div>
              <div className="space-y-1">
                <h4 className="text-[11px] font-black text-amber-950 uppercase tracking-wider">GPS Coordinates Required</h4>
                <p className="text-[11px] text-amber-900 leading-normal font-semibold">
                  Please turn on your location first. Taking you to the GPS connection setup button.
                </p>
                <div className="pt-1 flex items-center gap-1.5">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                  </span>
                  <span className="text-[9px] text-amber-800 font-bold uppercase font-mono tracking-widest animate-pulse">Context shifting...</span>
                </div>
              </div>
            </div>
          </motion.div>
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
