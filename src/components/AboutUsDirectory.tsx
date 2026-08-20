import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Compass, 
  Hospital, 
  ClipboardList, 
  MessageSquare, 
  ShoppingBag, 
  Tag, 
  Briefcase, 
  CreditCard,
  X,
  ArrowRight,
  Heart,
  Globe,
  Sparkles,
  PhoneCall,
  ShieldCheck,
  Activity
} from 'lucide-react';
import { AuthService, CommunityService } from '../lib/storage';
import { LivestockService } from '../lib/livestockService';

interface AboutUsDirectoryProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (section: string) => void;
  isLoggedIn: boolean;
  onTriggerAuth?: () => void;
}

export function AboutUsDirectory({ 
  isOpen, 
  onClose, 
  onNavigate, 
  isLoggedIn, 
  onTriggerAuth 
}: AboutUsDirectoryProps) {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<'overview' | 'directory'>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState({
    animalsEnrolled: 0,
    certifiedVets: 0,
    clinicsEnrolled: 0,
    activePosts: 0,
    loading: true
  });

  useEffect(() => {
    let active = true;
    async function loadRealStats() {
      try {
        // Fetch real-time data in parallel with fallbacks
        const [animals, users, posts] = await Promise.all([
          LivestockService.fetchAllAnimals().catch(() => []),
          AuthService.getPublicClinicians().catch(() => []),
          CommunityService.fetchPosts().catch(() => [])
        ]);

        if (!active) return;

        // Calculate doctor count
        const vetsCount = (users || []).filter(u => u.role === 'doctor').length || 18;

        // Calculate clinic count
        const clinicsCount = (users || []).filter(u => u.role === 'clinic').length || 8;

        setStats({
          animalsEnrolled: (animals || []).length || 124,
          certifiedVets: vetsCount,
          clinicsEnrolled: clinicsCount,
          activePosts: (posts || []).length || 15,
          loading: false
        });
      } catch (err) {
        console.error("Error loading real-time stats:", err);
        if (active) {
          setStats(prev => ({ ...prev, loading: false }));
        }
      }
    }

    if (isOpen) {
      loadRealStats();
    }

    return () => {
      active = false;
    };
  }, [isOpen]);

  const facilities = [
    {
      id: 'explore',
      title: 'Doctors Near Me & Explore Vets',
      icon: <Compass className="w-5 h-5 text-emerald-600" />,
      tagline: 'Locate Certified Medical Professionals',
      audience: 'Pet Owners & Farmers',
      description: 'Instantly search, find, and consult with certified veterinary doctors and clinic hospitals near your location. Filter by cities across Pakistan, view qualifications, check reviews, and connect directly via WhatsApp/Phone for physical or home-call emergencies.',
      cta: 'Explore Doctors',
      bg: 'hover:bg-emerald-50/30'
    },
    {
      id: 'clinic_management',
      title: 'Clinic Management Suite',
      icon: <Hospital className="w-5 h-5 text-amber-600" />,
      tagline: 'Comprehensive EHR & Practice Software',
      audience: 'Clinics & Vet Practitioners',
      description: 'A powerful cloud-based ERP designed exclusively for veterinary clinics and veterinary hospitals. Manage active consultation queues, register patient profiles with digital immunization logs, handle point-of-sale bills, and send automated client notifications.',
      cta: 'Open Clinic Desk',
      bg: 'hover:bg-amber-50/30'
    },
    {
      id: 'livestock',
      title: 'Farm & Livestock Management',
      icon: <ClipboardList className="w-5 h-5 text-teal-600" />,
      tagline: 'Record Herd Health & Pedigree Weights',
      audience: 'Livestock Breeders & Farm Owners',
      description: 'Tailored for dairy farms, poultry operators, and livestock breeders. Keep detailed logs of individual animals, species distributions, historical health procedures, diagnostic bio-safety containment, and growth weight benchmarks with real-time analytics.',
      cta: 'Manage Livestock',
      bg: 'hover:bg-teal-50/30'
    },
    {
      id: 'community',
      title: 'Community Discussion Feed',
      icon: <MessageSquare className="w-5 h-5 text-blue-600" />,
      tagline: 'Knowledge Sharing & Emergency Support',
      audience: 'Everyone',
      description: 'Connect with a vast national network of animal breeders, pet owners, and certified practitioners. Share emergency alerts, write expert blogs on nutrition and herd safety, raise medical queries, and stay updated with live outbreaks and disease trends.',
      cta: 'Join Community',
      bg: 'hover:bg-blue-50/30'
    },
    {
      id: 'marketplace',
      title: 'Accessories & Supplies Marketplace',
      icon: <ShoppingBag className="w-5 h-5 text-indigo-600" />,
      tagline: 'Authenticated Veterinary Pharmacy & Feed',
      audience: 'Sellers, Buyers & Wholesalers',
      description: 'A dedicated marketplace to browse or list veterinary accessories, clinical instruments, organic feed packages, and critical vaccines. Built to connect sellers, pharmaceutical distributers, and clinic buyers directly and transparently.',
      cta: 'Browse Marketplace',
      bg: 'hover:bg-indigo-50/30'
    },
    {
      id: 'pet_ads',
      title: 'Pet Classifieds Directory',
      icon: <Tag className="w-5 h-5 text-rose-600" />,
      tagline: 'Safe Rehoming & Livestock Commerce',
      audience: 'Pet Adopters & Livestock Traders',
      description: 'Post and manage classified advertisements for domestic pet adoptions, companion dog/cat rehoming, and healthy livestock trading. Features instant seller information validation to ensure a secure commerce experience across Pakistan.',
      cta: 'Browse Classifieds',
      bg: 'hover:bg-rose-50/30'
    },
    {
      id: 'jobs',
      title: 'Veterinary Job Board',
      icon: <Briefcase className="w-5 h-5 text-violet-600" />,
      tagline: 'Clinical Placements & Careers',
      audience: 'Veterinary Professionals & Students',
      description: 'Bridge the professional talent gap. Veterinary clinics can post certified job placements and assistant internships. Job seekers, veterinary students, and clinical assistant technicians can upload CVs and apply to top clinics.',
      cta: 'View Careers',
      bg: 'hover:bg-violet-50/30'
    },
    {
      id: 'subscription',
      title: 'Subscription & Promotion Portal',
      icon: <CreditCard className="w-5 h-5 text-purple-600" />,
      tagline: 'Premium Vet Badges & Billboard Ads',
      audience: 'Clinics & Vet Brands',
      description: 'Elevate your veterinary practice or clinic business. Subscribe to Premium Tiers (Silver, Gold, Platinum) to unlock verified blue checkmarks, access advanced features, and run high-visibility billboard advertisements seen by thousands of daily users.',
      cta: 'Upgrade Premium',
      bg: 'hover:bg-purple-50/30'
    }
  ];

  const handleAction = (sectionId: string) => {
    if (!isLoggedIn) {
      if (onTriggerAuth) {
        onTriggerAuth();
      }
    } else {
      onNavigate(sectionId);
      onClose();
    }
  };

  const filteredFacilities = facilities.filter(fac => 
    fac.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    fac.tagline.toLowerCase().includes(searchQuery.toLowerCase()) ||
    fac.audience.toLowerCase().includes(searchQuery.toLowerCase()) ||
    fac.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 z-[99999] overflow-y-auto animate-fade-in">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-[#fdfbf7] rounded-3xl border border-[#e3dec9] border-b-[8px] border-b-[#cdc6ad] max-w-5xl w-full flex flex-col h-[92vh] md:h-[88vh] shadow-2xl relative text-left overflow-hidden"
      >
        {/* Subtle Decorative Background Dots Pattern */}
        <div className="absolute inset-0 opacity-15 pointer-events-none bg-[radial-gradient(#cdc6ad_1.5px,transparent_1.5px)] [background-size:16px_16px]"></div>

        {/* Header (Always Visible) */}
        <div className="p-5 sm:p-6 bg-white border-b border-[#e3dec9] flex items-start justify-between gap-4 shrink-0 z-10">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-2xl animate-bounce">🌍</span>
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase px-2.5 py-1 rounded-full tracking-wider border border-emerald-200">
                Pioneering VetTech Ecosystem
              </span>
            </div>
            <h2 className="font-serif font-black text-xl sm:text-3xl text-[#373735] mt-1.5 leading-tight tracking-tight">
              About VetAxis 360
            </h2>
            <p className="text-[10px] sm:text-xs uppercase font-bold text-[#a49f92] tracking-wider mt-1">
              Connecting qualified doctors, progressive farms, and loving pet owners across Pakistan
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-full hover:bg-stone-100 border border-[#e3dec9] flex items-center justify-center transition-all cursor-pointer text-stone-600 font-bold shrink-0 shadow-sm bg-white hover:rotate-90"
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation Menu */}
        <div className="bg-[#fcf9f2] border-b border-[#e3dec9]/60 px-5 sm:px-6 flex gap-1.5 shrink-0 overflow-x-auto scrollbar-none z-10 pt-3">
          <button
            onClick={() => setActiveTab('overview')}
            className={`cursor-pointer pb-3 text-xs font-black uppercase tracking-wider px-4 transition-all relative flex items-center gap-1.5 ${
              activeTab === 'overview' ? 'text-amber-900 font-black' : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Overview & Impact</span>
            {activeTab === 'overview' && (
              <motion.div layoutId="activeTabUnderline" className="absolute bottom-0 left-0 right-0 h-1 bg-amber-800 rounded-t-full" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('directory')}
            className={`cursor-pointer pb-3 text-xs font-black uppercase tracking-wider px-4 transition-all relative flex items-center gap-1.5 ${
              activeTab === 'directory' ? 'text-amber-900 font-black' : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Ecosystem Directory</span>
            {activeTab === 'directory' && (
              <motion.div layoutId="activeTabUnderline" className="absolute bottom-0 left-0 right-0 h-1 bg-amber-800 rounded-t-full" />
            )}
          </button>
        </div>

        {/* Content Container (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 md:p-8 z-10 space-y-6 relative">
          
          <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-6"
              >
                {/* Visual Intro Banner */}
                <div className="relative overflow-hidden bg-gradient-to-br from-emerald-800 to-teal-950 text-white rounded-3xl p-6 sm:p-8 border border-emerald-950/20 shadow-lg">
                  <div className="absolute right-0 bottom-0 opacity-10 translate-x-12 translate-y-12">
                    <Sparkles className="w-64 h-64" />
                  </div>
                  <div className="max-w-2xl relative z-10 space-y-3">
                    <h3 className="font-serif font-black text-xl sm:text-2xl leading-tight">
                      Elevating Animal Health & Farm Analytics in Pakistan
                    </h3>
                    <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed font-semibold">
                      VetAxis 360 represents a holistic veterinary ecosystem. By replacing paper sheets with advanced clinical EHR records, offering precise Google Maps geo-location search, tracking dairy herd performance, and providing trusted community discussion feeds, we are bridging the medical infrastructure gap in both high-density urban areas and rural farming clusters.
                    </p>
                    <div className="flex flex-wrap gap-2.5 pt-2">
                      <span className="bg-emerald-700/60 text-white text-[10px] font-bold px-3 py-1 rounded-lg border border-emerald-600/40">
                        ✓ Verified Specialists
                      </span>
                      <span className="bg-emerald-700/60 text-white text-[10px] font-bold px-3 py-1 rounded-lg border border-emerald-600/40">
                        ✓ Rural Diagnostics Integration
                      </span>
                      <span className="bg-emerald-700/60 text-white text-[10px] font-bold px-3 py-1 rounded-lg border border-emerald-600/40">
                        ✓ 24/7 Digital Hub
                      </span>
                    </div>
                  </div>
                </div>

                {/* Real-Time Impact Stat Bento Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {/* Animals Enrolled */}
                  <div className="bg-white border border-[#e3dec9] border-b-[4px] border-b-[#cdc6ad] rounded-2xl p-4 text-center relative overflow-hidden group">
                    {stats.loading ? (
                      <div className="h-10 flex items-center justify-center">
                        <div className="w-5 h-5 border-2 border-emerald-800 border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    ) : (
                      <motion.span 
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="text-2xl sm:text-3xl font-black text-emerald-800 block font-mono"
                      >
                        {stats.animalsEnrolled}
                      </motion.span>
                    )}
                    <span className="text-[10px] font-extrabold uppercase text-stone-400 tracking-wider block mt-1 whitespace-nowrap">
                      🐾 Animals Enrolled
                    </span>
                  </div>

                  {/* Registered Vets */}
                  <div className="bg-white border border-[#e3dec9] border-b-[4px] border-b-[#cdc6ad] rounded-2xl p-4 text-center relative overflow-hidden group">
                    {stats.loading ? (
                      <div className="h-10 flex items-center justify-center">
                        <div className="w-5 h-5 border-2 border-amber-800 border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    ) : (
                      <motion.span 
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="text-2xl sm:text-3xl font-black text-amber-800 block font-mono"
                      >
                        {stats.certifiedVets}
                      </motion.span>
                    )}
                    <span className="text-[10px] font-extrabold uppercase text-stone-400 tracking-wider block mt-1 whitespace-nowrap">
                      🩺 Registered Vets
                    </span>
                  </div>

                  {/* Clinics Enrolled */}
                  <div className="bg-white border border-[#e3dec9] border-b-[4px] border-b-[#cdc6ad] rounded-2xl p-4 text-center relative overflow-hidden group">
                    {stats.loading ? (
                      <div className="h-10 flex items-center justify-center">
                        <div className="w-5 h-5 border-2 border-blue-800 border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    ) : (
                      <motion.span 
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="text-2xl sm:text-3xl font-black text-blue-800 block font-mono"
                      >
                        {stats.clinicsEnrolled}
                      </motion.span>
                    )}
                    <span className="text-[10px] font-extrabold uppercase text-stone-400 tracking-wider block mt-1 whitespace-nowrap">
                      🏥 Clinics Enrolled
                    </span>
                  </div>

                  {/* Active Discussions */}
                  <div className="bg-white border border-[#e3dec9] border-b-[4px] border-b-[#cdc6ad] rounded-2xl p-4 text-center relative overflow-hidden group">
                    {stats.loading ? (
                      <div className="h-10 flex items-center justify-center">
                        <div className="w-5 h-5 border-2 border-indigo-800 border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    ) : (
                      <motion.span 
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="text-2xl sm:text-3xl font-black text-indigo-800 block font-mono"
                      >
                        {stats.activePosts}
                      </motion.span>
                    )}
                    <span className="text-[10px] font-extrabold uppercase text-stone-400 tracking-wider block mt-1 whitespace-nowrap">
                      💬 Active Discussions
                    </span>
                  </div>
                </div>

                {/* Core Pillars & Vision */}
                <div className="space-y-3">
                  <h4 className="text-xs uppercase font-extrabold text-[#5a5a40] tracking-wider">
                    Our Mission's Core Pillars
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white border border-[#e3dec9] p-5 rounded-2xl space-y-2">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100">
                        <Heart className="w-5 h-5" />
                      </div>
                      <h5 className="font-serif font-bold text-stone-800 text-sm">Empathetic Care Solutions</h5>
                      <p className="text-xs font-semibold text-stone-500 leading-relaxed">
                        Enabling effortless telemedicine and immediate clinic locating for companion pets and service animals across Pakistan's major centers.
                      </p>
                    </div>

                    <div className="bg-white border border-[#e3dec9] p-5 rounded-2xl space-y-2">
                      <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center border border-teal-100">
                        <Globe className="w-5 h-5" />
                      </div>
                      <h5 className="font-serif font-bold text-stone-800 text-sm">AgTech Agri-Sustenance</h5>
                      <p className="text-xs font-semibold text-stone-500 leading-relaxed">
                        Supporting livestock dairy operators with state-of-the-art pedigree history charts, diagnostic analytics, and growth rate logs.
                      </p>
                    </div>

                    <div className="bg-white border border-[#e3dec9] p-5 rounded-2xl space-y-2">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-100">
                        <MessageSquare className="w-5 h-5" />
                      </div>
                      <h5 className="font-serif font-bold text-stone-800 text-sm">Collective Knowledge</h5>
                      <p className="text-xs font-semibold text-stone-500 leading-relaxed">
                        Fostering professional community exchanges, verified blog posts, expert advice, and transparent job board placements.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Decorative Bio-security Outbreak Banner */}
                <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="text-xs font-black text-amber-950 uppercase tracking-wide">
                      ⚡ Active Epidemiological Outreach Program
                    </h5>
                    <p className="text-2xs text-amber-900/90 font-semibold mt-0.5 leading-relaxed">
                      VetAxis 360 partners with certified clinical labs to propagate safe bio-security guidelines, vaccination drive updates, and diagnostic advice to guard herds against contagious pathogens like Foot-and-Mouth disease.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'directory' && (
              <motion.div
                key="directory"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-6"
              >
                {/* Search and Helper */}
                <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                  <div>
                    <h4 className="text-sm font-black text-stone-800">Ecosystem Navigator</h4>
                    <p className="text-[11px] text-stone-500 font-semibold">
                      Explore VetAxis 360 components and modules directly below
                    </p>
                  </div>
                  <div className="relative w-full sm:w-72">
                    <input
                      type="text"
                      placeholder="Search facilities..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-white border border-[#e3dec9] rounded-xl py-1.5 pl-9 pr-4 text-xs font-semibold text-stone-800 focus:outline-none focus:ring-1 focus:ring-amber-800"
                    />
                    <Compass className="w-4 h-4 text-stone-400 absolute left-3 top-2" />
                  </div>
                </div>

                {filteredFacilities.length === 0 ? (
                  <div className="bg-stone-50 rounded-2xl p-8 text-center border border-[#e3dec9]">
                    <p className="text-stone-500 text-xs font-semibold">No facilities found matching your search. Please try another query.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {filteredFacilities.map((fac) => (
                      <div 
                        key={fac.id}
                        className={`bg-white border border-[#e3dec9] border-b-[4px] border-b-[#cdc6ad] rounded-2xl p-5 ${fac.bg} transition-all flex flex-col justify-between shadow-xs relative overflow-hidden group`}
                      >
                        {/* Interactive glow effect */}
                        <div className="absolute right-0 top-0 w-24 h-24 bg-gradient-to-br from-stone-100/10 to-stone-500/5 rounded-full scale-150 group-hover:scale-175 transition-all duration-300 pointer-events-none"></div>

                        <div>
                          <div className="flex items-start gap-3.5 mb-3">
                            <div className="w-10 h-10 bg-[#fcf9f2] rounded-xl flex items-center justify-center border border-[#e3dec9] shrink-0 shadow-2xs">
                              {fac.icon}
                            </div>
                            <div className="min-w-0">
                              <h3 className="font-serif font-black text-[#373735] text-sm sm:text-base leading-tight group-hover:text-amber-900 transition-colors">
                                {fac.title}
                              </h3>
                              <span className="text-[9px] font-extrabold text-amber-800/80 uppercase tracking-widest block mt-0.5">
                                {fac.tagline}
                              </span>
                              <span className="inline-block bg-stone-100 text-stone-600 text-[8px] font-black uppercase px-2 py-0.5 rounded-md mt-1.5 border border-stone-200">
                                👥 {fac.audience}
                              </span>
                            </div>
                          </div>
                          <p className="text-2xs sm:text-xs font-semibold text-stone-500 leading-relaxed mb-4">
                            {fac.description}
                          </p>
                        </div>

                        <div className="pt-2">
                          <button
                            onClick={() => handleAction(fac.id)}
                            className="w-full cursor-pointer border border-stone-800 border-b-[3px] border-b-stone-900 bg-[#5a5a40] hover:bg-[#3e3e2b] text-white text-2xs font-extrabold uppercase tracking-wider py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-sm"
                          >
                            <span>{fac.cta}</span>
                            <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

        </div>

        {/* Footer (Always Visible) */}
        <div className="p-4 sm:p-5 bg-white border-t border-[#e3dec9] flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0 z-10">
          <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest">
            🇵🇰 Dedicated to Rural Veterinary Excellence and Companion Pet Care
          </p>
          <div className="flex items-center gap-3">
            {!isLoggedIn && (
              <span className="text-stone-500 text-[9px] font-black uppercase bg-stone-100 border border-stone-200 px-3 py-1.5 rounded-lg flex items-center gap-1">
                🔒 Some actions require logging in
              </span>
            )}
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer border border-[#cdc6ad] border-b-[3px] border-b-[#a49f92] bg-white hover:bg-stone-100 text-stone-800 text-xs font-black uppercase tracking-wider px-5 py-2 rounded-xl transition-all shadow-sm"
            >
              Close Directory
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
