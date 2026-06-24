import { useState, useEffect, ChangeEvent, FormEvent, useRef } from 'react';
import { UserProfile, PetAd } from '../types';
import { PetAdsService, CommunityService } from '../lib/storage';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, Search, MapPin, Tag, Plus, MessageCircle, Trash2, Calendar, Sparkles, AlertCircle, ChevronLeft, ChevronRight, Megaphone, X } from 'lucide-react';

interface PetAdsProps {
  currentUser: UserProfile;
  onNavigate?: (section: string) => void;
}

export function PetAds({ currentUser, onNavigate }: PetAdsProps) {
  const [ads, setAds] = useState<PetAd[]>([]);
  const [showUpgradeModal, setShowUpgradeModal] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [speciesFilter, setSpeciesFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('newest');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [safeTradeOpen, setSafeTradeOpen] = useState<boolean>(true);
  const [legalAgreed, setLegalAgreed] = useState<boolean>(false);

  // Form states
  const [formOpen, setFormOpen] = useState<boolean>(false);
  const [adType, setAdType] = useState<'sale' | 'adoption'>('adoption');
  const [petType, setPetType] = useState<string>('');
  const [breed, setBreed] = useState<string>('');
  const [age, setAge] = useState<string>('');
  const [price, setPrice] = useState<string>('');
  const [desc, setDesc] = useState<string>('');
  const [location, setLocation] = useState<string>('');
  const [whatsapp, setWhatsapp] = useState<string>('');
  const [image, setImage] = useState<string>('');

  const [formError, setFormError] = useState<string | null>(null);
  const [submitLoading, setSubmitLoading] = useState<boolean>(false);
  const [toast, setToast] = useState<string | null>(null);
  const [boostedPosts, setBoostedPosts] = useState<any[]>([]);

  const [dismissedAlertIds, setDismissedAlertIds] = useState<string[]>(() => {
    try {
      const saved = sessionStorage.getItem('dismissed_emergency_alerts');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isCarouselDismissed, setIsCarouselDismissed] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('dismissed_emergency_carousel') === 'true';
    } catch {
      return false;
    }
  });

  const dismissAlert = (id: string, e?: any) => {
    if (e) e.stopPropagation();
    const updated = [...dismissedAlertIds, id];
    setDismissedAlertIds(updated);
    try {
      sessionStorage.setItem('dismissed_emergency_alerts', JSON.stringify(updated));
    } catch (err) {
      console.error(err);
    }
  };

  const dismissCarousel = () => {
    setIsCarouselDismissed(true);
    try {
      sessionStorage.setItem('dismissed_emergency_carousel', 'true');
    } catch (err) {
      console.error(err);
    }
  };

  const visibleBoostedPosts = boostedPosts.filter(p => !dismissedAlertIds.includes(p.id));

  const storiesContainerRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState<boolean>(false);

  const scrollStories = (direction: 'left' | 'right') => {
    if (storiesContainerRef.current) {
      const scrollAmount = 300;
      storiesContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  useEffect(() => {
    if (visibleBoostedPosts.length <= 1 || isHovered) return;

    const interval = setInterval(() => {
      if (storiesContainerRef.current) {
        const container = storiesContainerRef.current;
        const maxScrollLeft = container.scrollWidth - container.clientWidth;
        if (container.scrollLeft >= maxScrollLeft - 5) {
          container.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
          container.scrollBy({ left: 300, behavior: 'smooth' });
        }
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [visibleBoostedPosts.length, isHovered]);

  const loadAds = async () => {
    setLoading(true);
    try {
      const data = await PetAdsService.fetchAds();
      setAds(data);
    } catch (err) {
      console.error('Failed to load pet ads', err);
    } finally {
      setLoading(false);
    }
  };

  const loadBoostedEmergencyPosts = async () => {
    try {
      const posts = await CommunityService.fetchPosts();
      const boosted = posts.filter((p: any) => p.isBoosted);
      setBoostedPosts(boosted);
    } catch (err) {
      console.error('Failed to load boosted emergency posts in PetAds section', err);
    }
  };

  useEffect(() => {
    loadAds();
    loadBoostedEmergencyPosts();
    if (currentUser.phone) {
      setWhatsapp(currentUser.phone);
    }
  }, []);

  const triggerToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  // Convert uploaded image to Base64 (max 1MB constraint)
  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1 * 1024 * 1024) {
      setFormError('Image size must be smaller than 1 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setImage(event.target.result as string);
        setFormError(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAdSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!legalAgreed) {
      setFormError('⚠️ Safe Trade Consent Required: You must check the legal affirmation box to confirm that you adhere to our anti-scam guidelines and hold the platform harmless.');
      return;
    }

    if (!petType || !desc.trim() || !location.trim() || !whatsapp.trim()) {
      setFormError('Please fill in all required fields marked (*).');
      return;
    }

    const whatsappCleared = whatsapp.replace(/[\s+\-()]/g, '');
    if (!/^\d{9,16}$/.test(whatsappCleared)) {
      setFormError('Please enter a valid WhatsApp phone number with country code (e.g. 923001234567).');
      return;
    }

    const priceNum = adType === 'adoption' ? 0 : parseFloat(price);
    if (adType === 'sale' && (isNaN(priceNum) || priceNum <= 0)) {
      setFormError('For animal sales, a numeric price greater than 0 is required.');
      return;
    }

    // Subscription Limit check for posting classified ads:
    // Subscribed (clinics/doctors) can post unlimited with 90 days expiration visibility (already implemented).
    // Unsubscribed general users, clinics, and doctors are restricted to Maximum 3 pet ads weekly (rolling 7 days) with 30 Days expiration cycle.
    const isPremium = !!currentUser.subscriptionTier;
    if (!isPremium) {
      const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const myWeeklyAdsCount = ads.filter(a => a.ownerEmail === currentUser.email && a.createdAt >= oneWeekAgo).length;
      if (myWeeklyAdsCount >= 3) {
        setFormError('⚠️ Weekly Limit Reached: Unsubscribed accounts (including general users, clinics, and doctors) are allowed to post a maximum of 3 pet classified advertisements weekly. Please upgrade inside the Practitioner Billing Centre to enjoy unlimited posting with 90 days retention!');
        return;
      }
    }

    setSubmitLoading(true);

    try {
      const adPayload = {
        adType,
        petType,
        breed,
        age: age ? parseInt(age) : null,
        price: priceNum,
        description: desc,
        location,
        whatsapp: whatsappCleared,
        image
      };

      const created = await PetAdsService.createAd(adPayload, currentUser);
      setAds((prev) => [created, ...prev]);

      // Reset
      setPetType('');
      setBreed('');
      setAge('');
      setPrice('');
      setDesc('');
      setImage('');
      setLocation('');
      setFormOpen(false);
      triggerToast('✓ Your pet classified ad was published successfully!');
    } catch (err: any) {
      setFormError(err.message || 'Posting failed.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDeleteAd = async (id: string) => {
    if (!confirm('Are you sure you want to remove this classified ad?')) return;
    try {
      await PetAdsService.deleteAd(id);
      setAds((prev) => prev.filter((a) => a.id !== id));
      triggerToast('Classified ad listing removed.');
    } catch (err) {
      console.error(err);
    }
  };

  // Filter ads
  const filteredAds = ads
    .filter((a) => {
      // Species type
      if (speciesFilter !== 'all') {
        if (a.petType.toLowerCase() !== speciesFilter) return false;
      }
      // Ad adoption/sale type
      if (typeFilter !== 'all') {
        if (a.adType !== typeFilter) return false;
      }
      // Search
      const search = searchTerm.toLowerCase().trim();
      if (search) {
        return (
          a.petType.toLowerCase().includes(search) ||
          a.breed.toLowerCase().includes(search) ||
          a.description.toLowerCase().includes(search) ||
          a.location.toLowerCase().includes(search)
        );
      }
      // Pricing constraints
      const min = parseFloat(minPrice);
      const max = parseFloat(maxPrice);
      if (!isNaN(min) && a.price < min) return false;
      if (!isNaN(max) && a.price > max) return false;

      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'price-asc') return a.price - b.price;
      if (sortBy === 'price-desc') return b.price - a.price;
      if (sortBy === 'oldest') return a.createdAt - b.createdAt;
      return b.createdAt - a.createdAt; // newest
    });

  return (
    <div className="space-y-8 max-w-7xl mx-auto w-[98%] px-1 md:px-4 text-left">
      
      {/* ACTIVE EMERGENCY LOST PET RADAR ALERTS */}
      {(() => {
        // If the user dismissed the entire carousel, show a clean restore option
        if (isCarouselDismissed) {
          return (
            <div className="flex justify-end pr-2 -mb-4">
              <button
                onClick={() => {
                  setIsCarouselDismissed(false);
                  setDismissedAlertIds([]);
                  try {
                    sessionStorage.removeItem('dismissed_emergency_carousel');
                    sessionStorage.removeItem('dismissed_emergency_alerts');
                  } catch {}
                }}
                className="text-[10px] font-mono font-bold text-red-650 hover:text-red-800 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-xl border border-red-200 transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Sparkles className="w-3 h-3 animate-spin" /> Restore Dismissed Emergency Alerts
              </button>
            </div>
          );
        }

        // Standard fallback if there are literally no boosted/emergency posts
        if (boostedPosts.length === 0) {
          return (
            <div className="relative bg-gradient-to-br from-red-50/20 via-stone-50 to-stone-100 border-2 border-dashed border-red-200 rounded-3xl p-6 md:p-8 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 text-left overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(#ef4444_1.5px,transparent_1.5px)] [background-size:20px_20px] opacity-[0.03] pointer-events-none" />
              <div className="flex items-start gap-4 z-10">
                <div className="w-12 h-12 rounded-2xl bg-red-100/50 text-red-650 flex items-center justify-center shrink-0 shadow-inner">
                  <AlertCircle className="w-6 h-6 text-red-500 animate-pulse" />
                </div>
                <div className="space-y-1">
                  <span className="bg-red-100 text-red-700 font-mono text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-widest leading-none">
                    Lost Pet Radar Beacon
                  </span>
                  <h4 className="font-serif font-black text-[#2c2c1c] text-base leading-tight">
                    Active Emergency Lost Pet Radar Alerts
                  </h4>
                  <p className="text-xs text-stone-600 font-semibold leading-relaxed max-w-xl">
                    No active priority radar signals detected. High-priority community search alerts and missing pet reports will appear here automatically with instant circle boundaries.
                  </p>
                </div>
              </div>
              {onNavigate && (
                <button
                  type="button"
                  onClick={() => onNavigate('community')}
                  className="w-full md:w-auto bg-red-600 hover:bg-red-700 text-white text-[10.5px] font-black uppercase tracking-widest px-5 py-3 rounded-xl shadow-md border-b-[4px] border-b-red-800 transition-all cursor-pointer whitespace-nowrap leading-none z-10"
                >
                  📢 Broadcast Radar Signal
                </button>
              )}
            </div>
          );
        }

        // If some alerts exist but they are all dismissed one-by-one
        if (visibleBoostedPosts.length === 0) {
          return (
            <div className="relative bg-gradient-to-br from-[#fcfbf9] via-[#f7f5ef] to-stone-100 border-2 border-dashed border-stone-300 rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 text-left overflow-hidden">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-stone-100 text-stone-500 flex items-center justify-center shrink-0">
                  <Megaphone className="w-4 h-4 text-stone-400" />
                </div>
                <div>
                  <h4 className="font-serif font-black text-stone-800 text-sm">All active alerts dismissed for this session</h4>
                  <p className="text-[11px] text-stone-500 font-semibold">You've cleared all emergency posts. They will reappear in your next session.</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setDismissedAlertIds([]);
                  try {
                    sessionStorage.removeItem('dismissed_emergency_alerts');
                  } catch {}
                }}
                className="text-[10px] font-mono bg-stone-200 hover:bg-stone-300 text-stone-700 px-3 py-1.5 rounded-xl border-none font-bold cursor-pointer transition-colors animate-pulse"
              >
                Reset Alerts 🔄
              </button>
            </div>
          );
        }

        // Active Emergency Carousel/Spotlight layout
        return (
          <div 
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className="bg-gradient-to-br from-red-50 via-rose-50/50 to-amber-50/30 border-2 border-red-400 border-b-[6px] border-b-red-500 rounded-3xl p-6 shadow-md flex flex-col gap-4 text-left relative overflow-hidden"
          >
            {/* Main dismissal button for the whole carousel */}
            <button
              onClick={dismissCarousel}
              className="absolute right-4 top-4 z-20 w-8 h-8 rounded-full bg-white/85 hover:bg-red-500 text-red-700 hover:text-white border border-red-200 hover:border-transparent transition-all flex items-center justify-center cursor-pointer shadow-xs active:scale-95"
              title="Dismiss Emergency Feed"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Decorative element */}
            <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-44 h-44 bg-red-100/60 rounded-full blur-3xl opacity-60 pointer-events-none" />
            
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 pr-10">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-red-600 to-rose-500 text-white flex items-center justify-center shrink-0 shadow-lg relative">
                  <span className="absolute inset-0 rounded-2xl bg-red-600 animate-ping opacity-25"></span>
                  <span className="text-lg">🚨</span>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="bg-red-600 text-white font-mono text-[8px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest leading-none">
                      EMERGENCY STORIES
                    </span>
                    <span className="text-[10px] text-red-900/80 font-bold">
                      Active 30 Days Signal Life
                    </span>
                  </div>
                  <h3 className="font-serif font-black text-red-950 text-lg leading-tight">
                    {visibleBoostedPosts.length > 1 ? 'Recent Sliding Emergency Stories' : 'Active Emergency Spotlight'}
                  </h3>
                </div>
              </div>

              {/* Slider Controls (Optimized for touch with minimum 44px targets) */}
              {visibleBoostedPosts.length > 1 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => scrollStories('left')}
                    className="cursor-pointer w-11 h-11 sm:w-10 sm:h-10 rounded-xl bg-white hover:bg-red-100 border border-red-200 text-red-700 shadow-xs transition-colors flex items-center justify-center active:scale-95"
                    aria-label="Scroll left"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => scrollStories('right')}
                    className="cursor-pointer w-11 h-11 sm:w-10 sm:h-10 rounded-xl bg-white hover:bg-red-100 border border-red-200 text-red-700 shadow-xs transition-colors flex items-center justify-center active:scale-95"
                    aria-label="Scroll right"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>

            {/* Stories list rendering */}
            {visibleBoostedPosts.length === 1 ? (
              // Single post spotlight card (standard preview layout)
              <div className="grid grid-cols-1 gap-4 mt-2 z-10 w-full relative">
                {visibleBoostedPosts.map((post) => {
                  const daysPassed = Math.floor((Date.now() - post.ts) / (24 * 60 * 60 * 1000));
                  const daysRemaining = Math.max(1, 30 - daysPassed);
                  const hasImage = post.images && post.images.length > 0;
                  
                  return (
                    <div 
                      key={post.id}
                      className="bg-white border border-red-200 hover:border-red-350 rounded-2xl p-5 shadow-sm transition-all relative overflow-hidden flex flex-col md:flex-row gap-5 text-left"
                    >
                      {/* Individual dismiss button for single spotlight card */}
                      <button
                        onClick={(e) => dismissAlert(post.id, e)}
                        className="absolute right-3 top-3 z-30 w-7 h-7 rounded-full bg-stone-100/90 hover:bg-red-500 text-stone-600 hover:text-white border border-stone-200/50 hover:border-transparent transition-all flex items-center justify-center cursor-pointer shadow-xs active:scale-95"
                        title="Dismiss alert"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>

                      {/* Media thumbnail */}
                      {hasImage ? (
                        <div className="w-full md:w-56 shrink-0 aspect-video md:aspect-[4/3] rounded-xl overflow-hidden border border-stone-200 bg-stone-50">
                          <img 
                            src={post.images![0]} 
                            className="w-full h-full object-cover"
                            alt="Emergency cover"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      ) : (
                        <div className="w-full md:w-56 shrink-0 aspect-video md:aspect-[4/3] rounded-xl bg-red-50 border border-red-100 text-red-600 flex flex-col items-center justify-center p-4 text-center">
                          <Megaphone className="w-8 h-8 animate-bounce mb-1.5" />
                          <span className="text-[10px] uppercase font-black tracking-wider leading-none">Emergency Signal</span>
                        </div>
                      )}

                      <div className="flex-1 flex flex-col justify-between">
                        <div className="space-y-3 text-left">
                          <div className="flex items-center gap-2 flex-wrap text-stone-500 pr-8">
                            <span className="text-[9px] text-red-700 font-black uppercase bg-red-50 border border-red-100 px-2 py-0.5 rounded-full">
                              🕒 {daysRemaining} days remaining
                            </span>
                            {(post.address || post.boostDetails?.lastSeenLoc?.address) && (
                              <span className="text-[9.5px] text-stone-700 font-extrabold bg-stone-100 border border-stone-200 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-red-500" />
                                {post.address || post.boostDetails?.lastSeenLoc?.address}
                              </span>
                            )}
                          </div>
                          <div>
                            <h4 className="font-serif font-black text-[#2c2c1c] text-base leading-snug">
                              {post.title || "Emergency Help Requested"}
                            </h4>
                            <p className="text-xs text-stone-600 font-medium leading-relaxed mt-1.5 line-clamp-3">
                              {post.text || post.description}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-dashed border-red-100 mt-4">
                          <span className="text-[9px] font-black tracking-wider uppercase text-red-600">
                            🚨 Spotlight Feed Entry
                          </span>
                          {onNavigate && (
                            <button
                              onClick={() => onNavigate('community')}
                              className="cursor-pointer bg-red-600 hover:bg-red-700 text-white text-[10px] font-black uppercase tracking-wider px-4 py-2 rounded-xl border-none shadow-xs transition-colors"
                            >
                              Check Community Feed 💬
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              // sliding carousel stories view when length > 1
              <div 
                ref={storiesContainerRef}
                className="flex gap-4 overflow-x-auto pb-4 pt-1 snap-x snap-mandatory scroll-smooth select-none max-w-full touch-pan-x"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                {visibleBoostedPosts.map((post) => {
                  const daysPassed = Math.floor((Date.now() - post.ts) / (24 * 60 * 60 * 1000));
                  const daysRemaining = Math.max(1, 30 - daysPassed);
                  const hasImage = post.images && post.images.length > 0;
                  
                  return (
                    <div 
                      key={post.id}
                      onClick={() => onNavigate && onNavigate('community')}
                      className="cursor-pointer snap-start shrink-0 w-[295px] xs:w-[325px] sm:w-[355px] h-[190px] bg-white hover:bg-stone-50 rounded-2xl p-4 transition-all relative flex gap-3.5 border-2 border-red-100 hover:border-red-350 hover:shadow-md text-left group"
                    >
                      {/* Individual dismiss button for slide card */}
                      <button
                        onClick={(e) => dismissAlert(post.id, e)}
                        className="absolute right-3 top-3 z-30 w-7 h-7 rounded-full bg-stone-100/90 hover:bg-red-500 text-stone-600 hover:text-white border border-stone-200/50 hover:border-transparent transition-all flex items-center justify-center cursor-pointer shadow-xs active:scale-95"
                        title="Dismiss alert"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>

                      {/* Left content column (flexible) */}
                      <div className="flex-1 flex flex-col justify-between min-w-0 pr-6">
                        <div className="space-y-1.5">
                          {/* Card Author/Badge header */}
                          <div className="flex items-center gap-2">
                            <span className="bg-red-500 text-white font-mono text-[7px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider">
                              🚨 EMERGENCY ({daysRemaining}d left)
                            </span>
                          </div>
                          
                          {/* Title */}
                          <h4 className="font-serif font-black text-[#2c2c1c] text-xs leading-tight line-clamp-1 pr-2">
                            {post.title || "Emergency Alert"}
                          </h4>
                          
                          {/* Description text preview */}
                          <p className="text-[10px] text-stone-600 font-semibold leading-snug line-clamp-4">
                            {post.text || post.description}
                          </p>
                        </div>

                        {/* Location */}
                        <div className="flex items-center gap-1 text-[9px] text-red-700 font-extrabold truncate">
                          <MapPin className="w-3 h-3 text-red-500 shrink-0" />
                          <span className="truncate">{post.address || post.boostDetails?.lastSeenLoc?.address || post.city || 'Local Region'}</span>
                        </div>
                      </div>

                      {/* Right image/thumbnail column */}
                      <div className="w-24 h-full shrink-0 rounded-xl overflow-hidden bg-stone-50 border border-stone-100 flex items-center justify-center relative">
                        {hasImage ? (
                          <img 
                            src={post.images![0]} 
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 animate-fadeIn"
                            alt="Story thumbnail"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-tr from-red-500 to-rose-400 text-white flex flex-col items-center justify-center p-2 text-center">
                            <Megaphone className="w-5 h-5 animate-pulse" />
                            <span className="text-[7.5px] uppercase font-black tracking-wider text-white/95 mt-1">SIGNAL</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {/* 🛡️ SAFE TRADING COMPLIANCE & LEGAL PROTECTION CENTER */}
      <div className="bg-[#fcf9f2] border-2 border-amber-200 border-b-[6px] border-b-amber-300 rounded-3xl p-5 md:p-6 space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-amber-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-lg">🛡️</div>
            <div>
              <h3 className="font-serif font-black text-sm md:text-base text-stone-900">
                Safe Trading Compliance & Anti-Scam Precautions
              </h3>
              <p className="text-[10px] md:text-xs font-bold text-stone-500">
                Mandatory directives for secure transactions on local classified forums.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSafeTradeOpen(!safeTradeOpen)}
            className="px-3 py-1 bg-stone-100 hover:bg-stone-200 text-[10px] font-black uppercase text-stone-700 rounded-lg border border-stone-200 transition-all cursor-pointer"
          >
            {safeTradeOpen ? 'Hide Panel' : 'Show Guide'}
          </button>
        </div>

        {safeTradeOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Alert 1 */}
              <div className="p-3 bg-white rounded-2xl border border-amber-100 text-left space-y-1.5">
                <div className="text-xs font-black text-amber-800 flex items-center gap-1">
                  <span>❌ ZERO ADVANCE DEPOSITS</span>
                </div>
                <p className="text-[10px] font-semibold text-stone-600 leading-relaxed">
                  Never pay sellers in advance via EasyPaisa, JazzCash, or bank transfers. Scam artists frequently use fake pictures and vanish after getting a holding deposit. Only pay after a physical handover.
                </p>
              </div>

              {/* Alert 2 */}
              <div className="p-3 bg-white rounded-2xl border border-amber-100 text-left space-y-1.5">
                <div className="text-xs font-black text-[#5a5a40] flex items-center gap-1">
                  <span>🏢 CLINICAL INSPECTIONS ONLY</span>
                </div>
                <p className="text-[10px] font-semibold text-stone-600 leading-relaxed">
                  Finalize breed handovers at professional veterinary clinics. Arrange a direct medical test to identify hidden physiological abnormalities, congenital disorders, or fraudulent vaccination cards.
                </p>
              </div>

              {/* Alert 3 */}
              <div className="p-3 bg-white rounded-2xl border border-amber-100 text-left space-y-1.5">
                <div className="text-xs font-black text-blue-800 flex items-center gap-1">
                  <span>🎖️ TRUST SEAL VERIFICATION</span>
                </div>
                <p className="text-[10px] font-semibold text-stone-600 leading-relaxed">
                  Verify the listings' badges. Subscribed practitioners carry certified Bronze, Silver, Gold, or Platinum borders indicating a verified track record. Exercise extreme caution with newly registered accounts.
                </p>
              </div>
            </div>

            {/* Legal Liability Disclaimer Statement */}
            <div className="p-3.5 bg-neutral-900 text-white rounded-2xl space-y-1 font-mono text-[9px] select-none leading-relaxed border border-stone-800">
              <span className="text-amber-400 font-extrabold uppercase">⚖️ STANDALONE VENUE DISCLAIMER (LEGAL PROTECTION NOTICE):</span>
              <p className="text-neutral-300 font-semibold">
                This website constitutes an un-inspected community classified notice board. The application architecture and owners act strictly as hosting venues. The platform possesses zero control or validation regarding animal health status, seller legality, or transaction fidelity. By continuing to browse or transact, all participants irrevocably waive their right to pursue civil actions, demand financial remediation, or issue legal liability notices to the platform owners for scam events, viral transfers, or physical injury.
              </p>
            </div>
          </motion.div>
        )}
      </div>

      {/* TOAST SYSTEM */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 30 }}
            className="fixed bottom-8 right-8 p-4 bg-[#5a5a40] text-white rounded-2xl shadow-2xl border border-[#4a4a34] z-[9999] font-serif font-black text-sm"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* NEW POST ACTIONS */}
      <div className="text-left">
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => setFormOpen(!formOpen)}
          className="cursor-pointer btn-tactile-3d-primary py-3 px-6 text-xs inline-flex items-center gap-2"
        >
          {formOpen ? '✕ Close Composer' : '➕ Post an Ad Listing'}
        </motion.button>

        <AnimatePresence>
          {formOpen && (
            <motion.div 
              initial={{ opacity: 0, height: 0, y: -20 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: -20 }}
              className="mt-5 bg-white border border-[#e3dec9] border-b-[5px] border-b-[#cdc6ad] p-6 rounded-3xl shadow-md overflow-hidden space-y-5"
            >
              <div className="flex items-center gap-2 border-b border-[#f4f1e9] pb-3">
                <Tag className="w-5 h-5 text-[#5a5a40]" />
                <h3 className="font-serif font-black text-lg text-[#373735]">Publish Pet Classified Ad</h3>
              </div>

              {formError && (
                <div className="p-3.5 bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl font-bold">
                  ⚠️ {formError}
                </div>
              )}

              <form onSubmit={handleAdSubmit} className="space-y-4">
                
                {/* Ad Type Toggle selector */}
                <div className="space-y-1.5 p-3.5 bg-[#fcf9f2] border border-[#e3dec9] rounded-2xl">
                  <span className="text-xs font-black uppercase text-[#5a5a40] tracking-wider block">Select Purpose *</span>
                  <div className="flex gap-6 mt-1 flex-wrap">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-[#373735] select-none">
                      <input
                        type="radio"
                        name="adType"
                        checked={adType === 'adoption'}
                        onChange={() => setAdType('adoption')}
                        className="accent-[#5a5a40] w-4 h-4 cursor-pointer"
                      />
                      <span>Family Adoption (Free Rehoming Gift)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-[#373735] select-none">
                      <input
                        type="radio"
                        name="adType"
                        checked={adType === 'sale'}
                        onChange={() => setAdType('sale')}
                        className="accent-[#5a5a40] w-4 h-4 cursor-pointer"
                      />
                      <span>Legal Sale (Required Price Input)</span>
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <span className="text-xs font-black uppercase text-[#5a5a40] tracking-wider">Pet Species *</span>
                    <select
                      className="form-control text-xs"
                      value={petType}
                      onChange={(e) => setPetType(e.target.value)}
                      required
                    >
                      <option value="">Select Species…</option>
                      <option value="Dog">🐶 Dog</option>
                      <option value="Cat">🐱 Cat</option>
                      <option value="Bird">🐦 Bird</option>
                      <option value="Rabbit">🐰 Rabbit</option>
                      <option value="Fish">🐠 Fish</option>
                      <option value="Hamster">🐹 Hamster</option>
                      <option value="Other">Other Species</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-black uppercase text-[#5a5a40] tracking-wider">Breed Name</span>
                    <input
                      type="text"
                      className="form-control text-xs"
                      placeholder="e.g. Golden Retriever, Siamese Cat"
                      value={breed}
                      onChange={(e) => setBreed(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <span className="text-xs font-black uppercase text-[#5a5a40] tracking-wider">Age (Months)</span>
                    <input
                      type="number"
                      min={0}
                      className="form-control text-xs"
                      placeholder="e.g. 5, 24"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                    />
                  </div>
                  
                  {adType === 'sale' ? (
                    <div className="space-y-1">
                      <span className="text-xs font-black uppercase text-[#5a5a40] tracking-wider">Price (PKR) *</span>
                      <input
                        type="number"
                        min={1}
                        className="form-control text-xs bg-white"
                        placeholder="PKR Amount"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        required
                      />
                    </div>
                  ) : (
                    <div className="space-y-1 opacity-60">
                      <span className="text-xs font-black uppercase text-[#5a5a40] tracking-wider">Price (PKR)</span>
                      <input
                        type="text"
                        className="form-control text-xs bg-[#f4f1e9]"
                        value="Free Adoption"
                        disabled
                      />
                    </div>
                  )}

                  <div className="space-y-1">
                    <span className="text-xs font-black uppercase text-[#5a5a40] tracking-wider">Upload Photo (Max 1MB)</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="form-control text-[10px] py-1 bg-[#fcf9f2]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <span className="text-xs font-black uppercase text-[#5a5a40] tracking-wider">Location (City, Sector) *</span>
                    <input
                      type="text"
                      className="form-control text-xs"
                      placeholder="e.g. Gulberg, Lahore"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-black uppercase text-[#5a5a40] tracking-wider">WhatsApp Contact Number *</span>
                    <input
                      type="tel"
                      className="form-control text-xs"
                      placeholder="e.g. 923001234567"
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-xs font-black uppercase text-[#5a5a40] tracking-wider">Animal Details & Vaccination Pedigree *</span>
                  <textarea
                    rows={3}
                    className="form-control text-xs"
                    placeholder="Temperament, training history, vaccination reports, medical history..."
                    value={desc}
                    onChange={(e) => setDesc(e.target.value)}
                    required
                  />
                </div>

                {image && (
                  <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-[#e3dec9] p-1 bg-[#fcf9f2] shadow-inner">
                    <img src={image} className="w-full h-full object-cover rounded-xl" alt="preview" />
                  </div>
                )}

                {/* Mandatory Legal & Safety Precaution Agreement Box */}
                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 space-y-2 select-none">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={legalAgreed}
                      onChange={(e) => setLegalAgreed(e.target.checked)}
                      className="mt-1 w-4 h-4 text-emerald-600 border-stone-300 rounded focus:ring-emerald-500 cursor-pointer"
                    />
                    <div className="text-stone-800 text-[11px] leading-relaxed font-semibold">
                      I agree to the <span className="text-[#a0522d] font-bold">Safe Trading & Anti-Scam Precautions</span>. I certify that I own this animal legally or am fully authorized to list it. I declare that all medical records, breed specs, and vaccination details are 100% accurate. I agree that the platform owners bear absolute <strong className="text-stone-900 underline">zero liability</strong> for any physical, emotional, or financial transactions that arise, holding the webapp safe from legal notices or issues.
                    </div>
                  </label>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={submitLoading}
                    className="btn-tactile-3d-primary py-2.5 px-6 text-xs"
                  >
                    {submitLoading ? 'Publishing…' : 'Publish Ad'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFormOpen(false);
                      setFormError(null);
                    }}
                    className="btn-tactile-3d-secondary py-2.5 px-6 text-xs"
                  >
                    Cancel
                  </button>
                </div>

              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* SEARCH AND FILTERS CONSOLE WRAPPER */}
      <div className="flex flex-col gap-6 bg-white border border-[#e3dec9] border-b-[5px] border-b-[#cdc6ad] p-5 rounded-3xl shadow-md">
        
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs text-[#a49f92] font-black uppercase tracking-wider">Filter Species:</span>
          {['all', 'dog', 'cat', 'bird', 'other'].map((item) => {
            const isActive = speciesFilter === item;
            return (
              <button
                key={item}
                onClick={() => setSpeciesFilter(item)}
                className={`cursor-pointer px-4.5 py-2.5 rounded-xl text-xs font-black capitalize transition-all border ${
                  isActive
                    ? 'bg-[#5a5a40] border-[#5a5a40] border-b-[3px] border-b-[#3e3e2b] text-white shadow-sm'
                    : 'bg-[#fcf9f2] border-[#e3dec9] border-b-[2px] text-[#7a766f] hover:bg-white hover:text-black'
                }`}
              >
                {item === 'all'
                  ? '🌐 All Pets'
                  : item === 'dog'
                  ? '🐶 Dogs'
                  : item === 'cat'
                  ? '🐱 Cats'
                  : item === 'bird'
                  ? '🐦 Birds'
                  : '🐠 Others'}
              </button>
            );
          })}
        </div>

        <div className="border-t border-[#f4f1e9] pt-4.5 grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 gap-4 items-center">
          
          {/* Ad Types */}
          <div className="flex flex-col gap-1.5 col-span-1">
            <span className="text-[10px] font-black uppercase text-[#a49f92] tracking-wider">Classification:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="text-xs bg-white border border-[#e3dec9] p-3 rounded-xl cursor-pointer font-bold text-[#373735] focus:outline-none"
            >
              <option value="all">All Ad Types</option>
              <option value="adoption">Adoptions (free)</option>
              <option value="sale">For Sales (Pricing)</option>
            </select>
          </div>

          {/* Pricing Ranges */}
          <div className="flex flex-col gap-1.5 col-span-1 sm:col-span-2 md:col-span-2">
            <span className="text-[10px] font-black uppercase text-[#a49f92] tracking-wider">Budget Range (PKR):</span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                placeholder="Min PKR"
                className="form-control rounded-xl p-2.5 text-xs text-center font-bold"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
              />
              <span className="text-stone-300 font-extrabold">–</span>
              <input
                type="number"
                placeholder="Max PKR"
                className="form-control rounded-xl p-2.5 text-xs text-center font-bold"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
              />
            </div>
          </div>

          {/* Sort By */}
          <div className="flex flex-col gap-1.5 col-span-1">
            <span className="text-[10px] font-black uppercase text-[#a49f92] tracking-wider">Hierarchy Sorting:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="text-xs bg-white border border-[#e3dec9] p-3 rounded-xl cursor-pointer font-bold text-[#373735] focus:outline-none"
            >
              <option value="newest">🕒 Recency: Newest</option>
              <option value="oldest">🕒 Recency: Oldest</option>
              <option value="price-asc">PKR Budget: Low → High</option>
              <option value="price-desc">PKR Budget: High → Low</option>
            </select>
          </div>

        </div>

        {/* Global Search Strip */}
        <div className="border-t border-[#f4f1e9] pt-4.5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-xs text-[#7a766f] font-black uppercase tracking-wider">
            🐕 Registers: <strong className="text-black font-mono font-black">{filteredAds.length}</strong> matching listings in Pakistan
          </span>

          <div className="relative w-full max-w-[280px]">
            <input
              type="text"
              placeholder="Search pets, breeds, locations…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-control rounded-2xl pl-9.5 py-3 text-xs font-semibold"
            />
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#a49f92] w-4.5 h-4.5" />
          </div>
        </div>

      </div>

      {/* ACTIVE EMERGENCIES - MOVED TO TOP */}

      {/* AD CLASSIFIED GRID CARDS */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-3xl h-64 border border-[#e3dec9] animate-pulse" />
          ))}
        </div>
      ) : filteredAds.length === 0 ? (
        <div className="text-center p-16 bg-white rounded-3xl border border-[#e3dec9] border-b-[5px] border-b-[#cdc6ad] shadow-sm">
          <div className="text-5xl mb-3">🐶</div>
          <h3 className="font-serif text-lg font-black text-[#373735]">No Classified Ads Registered</h3>
          <p className="text-sm text-[#7a766f] font-semibold mt-1">There are no matching rehoming or board ad listings cataloged.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 text-left">
          {filteredAds.map((ad) => {
            const isOwner = ad.ownerEmail === currentUser.email;
            const tier = ad.ownerSubscriptionTier || (ad.isPremium ? 'Silver' : undefined);

            let cardStyle = "bg-white rounded-3xl border border-[#e3dec9] border-b-[5px] border-b-[#cdc6ad] overflow-hidden flex flex-col justify-between hover:shadow-xl hover:border-b-[4px] hover:border-[#5a5a40]";
            let headerGradient = "h-48 bg-stone-100 relative overflow-hidden flex items-center justify-center border-b border-[#e3dec9]";
            let sponsorBadge = null;

            if (tier === 'Platinum') {
              cardStyle = "bg-gradient-to-br from-neutral-900 to-zinc-950 text-white rounded-3xl border-2 border-indigo-500/50 border-b-[6px] border-b-black overflow-hidden flex flex-col justify-between shadow-lg hover:shadow-indigo-950/40";
              headerGradient = "h-48 bg-zinc-900 relative overflow-hidden flex items-center justify-center border-b border-indigo-900/50";
              sponsorBadge = (
                <span className="absolute top-3 right-3 bg-gradient-to-r from-purple-600 via-indigo-600 to-teal-500 text-white text-[8px] uppercase font-black tracking-widest rounded-xl px-2.5 py-1.5 shadow-sm border border-indigo-400/20">
                  🏆 PLATINUM AD
                </span>
              );
            } else if (tier === 'Gold') {
              cardStyle = "bg-[#fffbeb] rounded-3xl border-2 border-amber-400 border-b-[6px] border-b-amber-600 overflow-hidden flex flex-col justify-between shadow-md hover:shadow-amber-100/40";
              headerGradient = "h-48 bg-amber-50/50 relative overflow-hidden flex items-center justify-center border-b border-amber-200";
              sponsorBadge = (
                <span className="absolute top-3 right-3 bg-amber-600 text-white text-[8px] uppercase font-black tracking-widest rounded-xl px-2.5 py-1.5 shadow-sm border border-amber-400/20 animate-pulse">
                  👑 GOLD AD
                </span>
              );
            } else if (tier === 'Silver') {
              cardStyle = "bg-slate-50/60 rounded-3xl border-2 border-slate-350 border-b-[6px] border-b-slate-400 overflow-hidden flex flex-col justify-between hover:shadow-md";
              headerGradient = "h-48 bg-slate-100/50 relative overflow-hidden flex items-center justify-center border-b border-slate-200";
              sponsorBadge = (
                <span className="absolute top-3 right-3 bg-slate-500 text-white text-[8px] uppercase font-black tracking-widest rounded-xl px-2.5 py-1.5 shadow-sm">
                  ✦ SILVER AD
                </span>
              );
            }

            return (
              <motion.div
                key={ad.id}
                layout
                whileHover={{ y: -5 }}
                className={cardStyle}
              >
                <div>
                  <div className={headerGradient}>
                    {ad.image ? (
                      <img src={ad.image} className="w-full h-full object-cover" alt={ad.petType} />
                    ) : (
                      <span className="text-5xl">🐾</span>
                    )}

                    <span
                      className={`absolute top-3 left-3 text-[9px] uppercase font-black tracking-widest px-3 py-1.5 rounded-xl border border-white/20 shadow-md ${
                        ad.adType === 'adoption'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-[#a0522d] text-white'
                      }`}
                    >
                      {ad.adType === 'adoption' ? '🤍 Adoptable' : '🏷️ Sale Listing'}
                    </span>

                    {isOwner && (
                      <span className="absolute top-3 right-3 bg-[#5a5a40] text-white text-[9px] uppercase font-black tracking-widest rounded-xl px-2.5 py-1.5 shadow-sm">
                        My listing
                      </span>
                    )}

                    {sponsorBadge}
                  </div>

                  <div className="p-5 space-y-3">
                    <div>
                      <h4 className={`font-black text-base leading-snug truncate ${tier === 'Platinum' ? 'text-zinc-100' : 'text-[#373735]'}`}>
                        {ad.petType} {ad.breed && `· ${ad.breed}`}
                      </h4>
                      <div className={`text-lg font-serif font-black mt-1.5 gap-1 inline-flex items-center ${tier === 'Platinum' ? 'text-teal-400' : 'text-[#5a5a40]'}`}>
                        {ad.adType === 'adoption' ? (
                          <span className={`italic ${tier === 'Platinum' ? 'text-emerald-400' : 'text-emerald-700'}`}>Free Family Adoption</span>
                        ) : (
                          `PKR ${Number(ad.price).toLocaleString()}`
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2.5">
                      {ad.age !== null && (
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[9px] font-black uppercase text-zinc-700 border ${
                          tier === 'Platinum' ? 'bg-zinc-800 border-zinc-700 text-zinc-300' : 'bg-stone-100 border-stone-200'
                        }`}>
                          <Calendar className={`w-3 h-3 ${tier === 'Platinum' ? 'text-zinc-400' : 'text-[#5a5a40]'}`} />
                          <span>{ad.age < 12 ? `${ad.age} mos` : `${Math.floor(ad.age / 12)} yrs`}</span>
                        </span>
                      )}
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[9px] font-black uppercase border ${
                        tier === 'Platinum' ? 'bg-zinc-800 border-zinc-700 text-zinc-300' : 'bg-[#fcf9f2] border-[#e3dec9] text-[#5a5a40]'
                      }`}>
                        <MapPin className="w-3 h-3 text-amber-500" />
                        <span>{ad.location}</span>
                      </span>
                    </div>

                    <p className={`text-xs font-semibold leading-relaxed line-clamp-3 ${tier === 'Platinum' ? 'text-zinc-300' : 'text-[#7a766f]'}`}>
                      {ad.description}
                    </p>

                    <div className={`text-[10px] font-semibold flex items-center gap-1 p-2.5 rounded-xl border ${
                      tier === 'Platinum'
                        ? 'bg-zinc-900 border-zinc-800 text-zinc-400'
                        : 'bg-[#fcf9f2] border-[#e3dec9] text-[#a49f92]'
                    }`}>
                      <span className="font-extrabold uppercase text-[9px] text-[#5a5a40]">Contact:</span>
                      <strong className={`font-bold ${tier === 'Platinum' ? 'text-white' : 'text-black'}`}>{ad.ownerName}</strong>
                      <span className="inline-flex px-1.5 py-0.5 rounded-lg bg-white/15 uppercase tracking-widest text-[8px] font-black border border-stone-200/20">
                        {ad.ownerRole}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="px-5 pb-5 pt-0.5 flex gap-2">
                  <a
                    href={`https://wa.me/${ad.whatsapp}?text=${encodeURIComponent(
                      `Hi ${ad.ownerName}! I saw your classified listing for the ${ad.breed || ad.petType} on VetAxis and would like to schedule details.`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 text-center btn-tactile-3d-secondary py-2.5 text-xs inline-flex items-center justify-center gap-1.5 bg-[#a0522d] border-[#7d3e20]/60 border-b-[#733517] text-white hover:bg-[#b05d36]"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Contact Partner</span>
                  </a>

                  {isOwner && (
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleDeleteAd(ad.id)}
                      className="cursor-pointer border border-[#df4747] border-b-[3px] border-b-[#ab3232] bg-red-50 hover:bg-red-100 text-[#df4747] px-3.5 rounded-2xl flex items-center justify-center transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </motion.button>
                  )}
                </div>

              </motion.div>
            );
          })}
        </div>
      )}

      {/* Premium Upgrade Modal Popup */}
      <AnimatePresence>
        {showUpgradeModal && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white border-2 border-[#a0522d]/60 border-b-[8px] border-b-[#7d3e20]/60 max-w-md w-full rounded-3xl p-6 shadow-2xl relative overflow-hidden text-center"
            >
              <div className="absolute top-0 inset-x-0 h-2.5 bg-gradient-to-r from-amber-400 via-[#a0522d] to-amber-500" />
              
              <div className="mx-auto w-16 h-16 bg-amber-50 border border-amber-200 rounded-full flex items-center justify-center text-3xl mb-4 mt-2">
                🔒
              </div>

              <h2 className="font-serif font-black text-2xl text-stone-900 mb-2">
                Premium Upgrade Required
              </h2>
              
              <p className="text-stone-600 text-xs font-semibold leading-relaxed mb-6">
                Unsubscribed practitioners (clinics and doctors) are entitled to a maximum of <strong>15 classified pet advertisements</strong> per month. Upgrade to our Silver, Gold, or Platinum plans to enjoy unlimited high-visibility listings and auto-highlighted cards!
              </p>

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowUpgradeModal(false);
                    if (onNavigate) onNavigate('subscription');
                  }}
                  className="w-full py-3 btn-tactile-3d-primary font-bold text-xs cursor-pointer inline-flex items-center justify-center gap-1.5 bg-[#a0522d] border-[#7d3e20]/60 border-b-[#733517] text-white hover:bg-[#b05d36]"
                >
                  💳 Go to Subscription Portal
                </button>
                
                <button
                  type="button"
                  onClick={() => setShowUpgradeModal(false)}
                  className="w-full py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-xl border border-stone-200 transition-all cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
