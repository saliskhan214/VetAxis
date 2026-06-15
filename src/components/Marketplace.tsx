import React, { useState, useEffect, ChangeEvent, FormEvent, useRef } from 'react';
import { UserProfile, Product } from '../types';
import { MarketplaceService, PromotionalAdsService } from '../lib/storage';
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from 'motion/react';
import { ShoppingBag, Search, Tag, MessageCircle, Trash2, Package, Plus, Sparkles, CheckCircle2, ChevronRight, ChevronLeft } from 'lucide-react';

interface MarketplaceProps {
  currentUser: UserProfile;
}

export function Marketplace({ currentUser }: MarketplaceProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('newest');

  // Sliding banner & promotion states for Marketplace Section
  const [currentSlideIdx, setCurrentSlideIdx] = useState<number>(0);
  const [promoPaused, setPromoPaused] = useState<boolean>(false);
  const [dbAds, setDbAds] = useState<any[]>([]);

  // 3D Tilt orientation & Gloss Reflection for Billboard Card inside Marketplace
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

  const BANNER_SLIDES_MARKETPLACE = [
    {
      id: 'welcome_marketplace',
      type: 'welcome',
      sponsorName: '',
      badge: 'Veterinary Directory',
      icon: '🛡️',
      bgGradient: "from-[#3c3c2b] via-[#52523b] to-[#6d6d4f]",
      borderColors: "border-[#52523b] border-b-[#303022]",
      title: "Self-Serve Medical Marketplace & Pharmacy",
      description: "Direct connection with official clinicians to order diagnostic kits, vitamins, and clinical dressings securely.",
      couponCode: '',
      ctaText: '',
      ctaUrl: ''
    }
  ];

  const activeSlides = [...BANNER_SLIDES_MARKETPLACE, ...dbAds];

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
      console.error("Failed fetching dynamic promotion ads in Marketplace", err);
    }
  };

  useEffect(() => {
    if (promoPaused) return;
    const timer = setInterval(() => {
      setCurrentSlideIdx((prev) => (prev + 1) % activeSlides.length);
    }, 10000);
    return () => clearInterval(timer);
  }, [promoPaused, activeSlides.length]);

  // Form compose state (only allowed for doctor, clinic)
  const isAuthorizedSeller = currentUser.role === 'doctor' || currentUser.role === 'clinic';
  const [formOpen, setFormOpen] = useState<boolean>(false);
  const [prodName, setProdName] = useState<string>('');
  const [prodPrice, setProdPrice] = useState<number>(0);
  const [prodQty, setProdQty] = useState<number>(1);
  const [prodDesc, setProdDesc] = useState<string>('');
  const [prodWhatsapp, setProdWhatsapp] = useState<string>('');
  const [prodImage, setProdImage] = useState<string>('');

  const [formError, setFormError] = useState<string | null>(null);
  const [submitLoading, setSubmitLoading] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const data = await MarketplaceService.fetchProducts();
      setProducts(data);
    } catch (err) {
      console.error('Failed to load marketplace products', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
    fetchCampaigns();
    // Pre-fill phone if available for convenience
    if (currentUser.phone) {
      setProdWhatsapp(currentUser.phone);
    }
  }, []);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
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
        setProdImage(event.target.result as string);
        setFormError(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleProductSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!prodName.trim() || prodPrice <= 0 || prodQty < 1 || !prodDesc.trim() || !prodWhatsapp.trim()) {
      setFormError('Please fill in all product details and a numeric price/quantity.');
      return;
    }

    const whatsappCleared = prodWhatsapp.replace(/[\s+\-()]/g, '');
    if (!/^\d{9,16}$/.test(whatsappCleared)) {
      setFormError('Please input a valid WhatsApp number with country code (e.g. 923001234567).');
      return;
    }

    // Subscription Limit check for posting product ads (Unlimited for premium, max 3 for unsubscribed)
    const isPremium = !!currentUser.subscriptionTier;
    if (!isPremium) {
      const myProductsCount = products.filter(p => p.ownerEmail === currentUser.email).length;
      if (myProductsCount >= 3) {
        setFormError('⚠️ Placement Limit: Unsubscribed accounts are restricted to 3 active product postings. Please upgrade to Silver, Gold, or Platinum to unlock unlimited marketplace listings!');
        return;
      }
    }

    setSubmitLoading(true);

    try {
      const productPayload = {
        name: prodName,
        price: prodPrice,
        quantity: prodQty,
        description: prodDesc,
        whatsapp: whatsappCleared,
        image: prodImage
      };

      const created = await MarketplaceService.createProduct(productPayload, currentUser);
      setProducts((prev) => [created, ...prev]);

      // Reset form fields
      setProdName('');
      setProdPrice(0);
      setProdQty(1);
      setProdDesc('');
      setProdImage('');
      setFormOpen(false);
      triggerToast('✓ Your product listing was created successfully!');
    } catch (err: any) {
      setFormError(err.message || 'Listing failed. Please check fields.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Are you sure you want to remove this product listing?')) return;
    try {
      await MarketplaceService.deleteProduct(id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
      triggerToast('Listing removed successfully.');
    } catch (err) {
      console.error(err);
    }
  };

  // Filters
  const filteredProducts = products
    .filter((p) => {
      const search = searchTerm.toLowerCase().trim();
      if (!search) return true;
      return (
        p.name.toLowerCase().includes(search) ||
        p.description.toLowerCase().includes(search) ||
        p.ownerName.toLowerCase().includes(search)
      );
    })
    .sort((a, b) => {
      if (sortBy === 'price-asc') return a.price - b.price;
      if (sortBy === 'price-desc') return b.price - a.price;
      if (sortBy === 'oldest') return a.createdAt - b.createdAt;
      return b.createdAt - a.createdAt; // newest
    });

  return (
    <div className="space-y-8 max-w-7xl mx-auto w-[98%] px-1 md:px-4 text-left">
      
      {/* 3D INTERACTIVE HERO & SPONSOR BILLBOARD */}
      <div 
        ref={billboardRef}
        onMouseMove={handleBillboardMouseMove}
        onMouseLeave={handleBillboardMouseLeave}
        className="mb-8 relative w-full h-[360px] sm:h-[280px] md:h-[230px] lg:h-[210px] overflow-hidden rounded-3xl shrink-0 shadow-[0_15px_40px_rgba(90,90,64,0.18)] hover:shadow-[0_25px_50px_rgba(90,90,64,0.3)] transition-shadow duration-500 border border-[#cdc6ad]"
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
                  <ShoppingBag className="w-32 h-32 animate-pulse" />
                </div>
                
                <div className="relative z-10 space-y-2 md:space-y-3 max-w-2xl text-left" style={{ transformStyle: "preserve-3d" }}>
                  <span 
                    className="inline-flex px-3 py-1 bg-white/10 rounded-xl text-[10px] font-black tracking-widest font-mono border border-white/20 uppercase"
                    style={{ transform: "translateZ(30px)" }}
                  >
                    🛒 Medical Marketplace
                  </span>
                  <h2 
                    className="text-2.5xl md:text-3xl font-serif font-black tracking-tight leading-tight"
                    style={{ transform: "translateZ(45px)" }}
                  >
                    Veterinary Pharmacy & Accessories
                  </h2>
                  <p 
                    className="text-neutral-200 text-xs md:text-sm font-semibold leading-relaxed"
                    style={{ transform: "translateZ(25px)" }}
                  >
                    Acquire certified animal nutrition products, vitamins, and clinical dressings listed by official vets.
                  </p>
                  
                  <div className="pt-1.5" style={{ transform: "translateZ(20px)" }}>
                    {isAuthorizedSeller ? (
                      <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/20 border border-emerald-400/30 rounded-xl text-[9px] font-black uppercase text-emerald-300">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Seller Mode Active (Publish Below)</span>
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-xl text-[9px] font-bold text-neutral-300">
                        <span>ℹ️ Browsing (Only clinic/doctor can publish products)</span>
                      </div>
                    )}
                  </div>
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
                    className="text-xl md:text-3.5xl font-serif font-black tracking-tight leading-tight flex items-center gap-2"
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
                    <ChevronRight className="w-3.5 h-3.5" />
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
                className="text-white/60 hover:text-white bg-transparent border-none cursor-pointer p-0.5 flex items-center justify-center animate-none"
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
                className="text-white/60 hover:text-white bg-transparent border-none cursor-pointer p-0.5 flex items-center justify-center animate-none"
                title="Next Slide"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* TOAST SYSTEM */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 30 }}
            className="fixed bottom-8 right-8 p-4 bg-[#5a5a40] text-white rounded-2xl shadow-2xl border border-[#4a4a34] z-[9999] font-serif font-black text-sm"
          >
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* COLLAPSIBLE COMPOSE FORM (Sellers only) */}
      {isAuthorizedSeller && (
        <div className="text-left">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => setFormOpen(!formOpen)}
            className="cursor-pointer btn-tactile-3d-primary py-3 px-6 text-xs inline-flex items-center gap-2"
          >
            {formOpen ? '✕ Close Composer' : '➕ List a New Product'}
          </motion.button>

          <AnimatePresence>
            {formOpen && (
              <motion.div 
                initial={{ opacity: 0, height: 0, y: -20 }}
                animate={{ opacity: 1, height: 'auto', y: 0 }}
                exit={{ opacity: 0, height: 0, y: -20 }}
                className="mt-5 bg-white border border-[#e3dec9] border-b-[5px] border-b-[#cdc6ad] p-6 rounded-3xl shadow-md overflow-hidden"
              >
                <div className="flex items-center gap-2 border-b border-[#f4f1e9] pb-3 mb-5">
                  <Tag className="w-5 h-5 text-[#5a5a40]" />
                  <h3 className="font-serif font-black text-lg text-[#373735]">Catalog New Product Listing</h3>
                </div>

                {formError && (
                  <div className="p-3.5 mb-5 bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl font-bold">
                    ⚠️ {formError}
                  </div>
                )}

                <form onSubmit={handleProductSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <span className="text-xs font-black uppercase text-[#5a5a40] tracking-wider">Product Name *</span>
                      <input
                        type="text"
                        className="form-control text-xs"
                        placeholder="e.g. Anti-flea shampoo, Multivitamins, Dewormer"
                        value={prodName}
                        onChange={(e) => setProdName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs font-black uppercase text-[#5a5a40] tracking-wider">WhatsApp Reference Phone *</span>
                      <input
                        type="tel"
                        className="form-control text-xs"
                        placeholder="e.g. 923001234567"
                        value={prodWhatsapp}
                        onChange={(e) => setProdWhatsapp(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <span className="text-xs font-black uppercase text-[#5a5a40] tracking-wider">Price (PKR) *</span>
                      <input
                        type="number"
                        min={1}
                        className="form-control text-xs"
                        placeholder="PKR Amount"
                        value={prodPrice || ''}
                        onChange={(e) => setProdPrice(parseFloat(e.target.value) || 0)}
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs font-black uppercase text-[#5a5a40] tracking-wider">Available Quantity *</span>
                      <input
                        type="number"
                        min={1}
                        className="form-control text-xs"
                        placeholder="Stock Count"
                        value={prodQty}
                        onChange={(e) => setProdQty(parseInt(e.target.value) || 1)}
                        required
                      />
                    </div>
                    <div className="col-span-2 md:col-span-1 space-y-1">
                      <span className="text-xs font-black uppercase text-[#5a5a40] tracking-wider">Product Image (Max 1MB)</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="form-control text-[10px] py-1 bg-[#fcf9f2]"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-xs font-black uppercase text-[#5a5a40] tracking-wider">Medicines Instruction / Description *</span>
                    <textarea
                      rows={3}
                      placeholder="Provide details about dosage, safety warnings, expiration dates, benefits..."
                      className="form-control text-xs"
                      value={prodDesc}
                      onChange={(e) => setProdDesc(e.target.value)}
                      required
                    />
                  </div>

                  {prodImage && (
                    <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-[#e3dec9] p-1 bg-[#fcf9f2] shadow-inner">
                      <img src={prodImage} className="w-full h-full object-cover rounded-xl" alt="preview" />
                    </div>
                  )}

                  <div className="flex gap-3 pt-2">
                    <button
                      type="submit"
                      disabled={submitLoading}
                      className="btn-tactile-3d-primary py-2.5 px-6 text-xs"
                    >
                      {submitLoading ? 'Publishing…' : 'Publish Product'}
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
      )}

      {/* FILTER & OPTION CONTROLS BAR */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white border border-[#e3dec9] border-b-[4px] border-b-[#cdc6ad] p-4.5 rounded-2xl shadow-sm">
        <span className="text-xs text-[#7a766f] font-black uppercase tracking-wider">
          📦 Catalog: <strong className="text-black font-mono font-black">{filteredProducts.length}</strong> authenticated entries available
        </span>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="text-xs bg-white border border-[#e3dec9] p-2.5 px-3 rounded-xl cursor-pointer font-bold text-[#373735] focus:outline-none"
          >
            <option value="newest">🕒 Recency: Newest</option>
            <option value="oldest">🕒 Recency: Oldest</option>
            <option value="price-asc">PKR Price: Low → High</option>
            <option value="price-desc">PKR Price: High → Low</option>
          </select>

          <div className="relative w-full max-w-[220px]">
            <input
              type="text"
              placeholder="Search pharmacy products…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-control rounded-xl pl-9 py-2.5 text-xs w-full font-semibold"
            />
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#a49f92] w-4 h-4" />
          </div>
        </div>
      </div>

      {/* PRODUCT LAYOUT GRID */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-3xl h-64 border border-[#e3dec9] animate-pulse" />
          ))}
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center p-16 bg-white rounded-3xl border border-[#e3dec9] border-b-[5px] border-b-[#cdc6ad] shadow-sm">
          <div className="text-5xl mb-3">💊</div>
          <h3 className="font-serif text-lg font-black text-[#373735]">Empty Pharmacy Directory</h3>
          <p className="text-sm text-[#7a766f] font-semibold mt-1">There are no veterinary products cataloged currently model match.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredProducts.map((p) => {
            const isOwner = p.ownerEmail === currentUser.email;
            const tier = p.ownerSubscriptionTier || (p.isPremium ? 'Silver' : undefined);

            let cardStyle = "bg-white rounded-3xl border border-[#e3dec9] border-b-[5px] border-b-[#cdc6ad] overflow-hidden flex flex-col justify-between hover:shadow-xl hover:border-b-[4px] hover:border-[#5a5a40]";
            let headerGradient = "h-44 bg-stone-50 relative border-b border-[#e3dec9] flex items-center justify-center overflow-hidden";
            let ribbonBadge = null;

            if (tier === 'Platinum') {
              cardStyle = "bg-gradient-to-br from-neutral-900 to-zinc-950 text-white rounded-3xl border-2 border-indigo-500/50 border-b-[6px] border-b-black overflow-hidden flex flex-col justify-between shadow-lg hover:shadow-indigo-950/40";
              headerGradient = "h-44 bg-zinc-900 relative border-b border-indigo-900/50 flex items-center justify-center overflow-hidden";
              ribbonBadge = (
                <span className="absolute top-3 right-3 bg-gradient-to-r from-purple-600 via-indigo-600 to-teal-500 text-white text-[8px] uppercase font-black tracking-widest rounded-xl px-2.5 py-1.5 shadow-sm border border-indigo-300/35">
                  🏆 PLATINUM SELLER
                </span>
              );
            } else if (tier === 'Gold') {
              cardStyle = "bg-[#fffbeb] rounded-3xl border-2 border-amber-400 border-b-[6px] border-b-amber-600 overflow-hidden flex flex-col justify-between shadow-md hover:shadow-amber-100/40";
              headerGradient = "h-44 bg-amber-50/50 relative border-b border-amber-200 flex items-center justify-center overflow-hidden";
              ribbonBadge = (
                <span className="absolute top-3 right-3 bg-amber-600 text-white text-[8px] uppercase font-black tracking-widest rounded-xl px-2.5 py-1.5 shadow-sm border border-amber-300/40 animate-pulse">
                  👑 GOLD SELLER
                </span>
              );
            } else if (tier === 'Silver') {
              cardStyle = "bg-slate-50/60 rounded-3xl border-2 border-slate-300 border-b-[6px] border-b-slate-400 overflow-hidden flex flex-col justify-between hover:shadow-md";
              headerGradient = "h-44 bg-slate-100/50 relative border-b border-slate-200 flex items-center justify-center overflow-hidden";
              ribbonBadge = (
                <span className="absolute top-3 right-3 bg-slate-500 text-white text-[8px] uppercase font-black tracking-widest rounded-xl px-2.5 py-1.5 shadow-sm">
                  ✦ SILVER SELLER
                </span>
              );
            }

            return (
              <motion.div
                key={p.id}
                layout
                whileHover={{ y: -5 }}
                className={cardStyle}
              >
                <div>
                  {/* Thumbnail Banner */}
                  <div className={headerGradient}>
                    {p.image ? (
                      <img src={p.image} className="w-full h-full object-cover" alt={p.name} />
                    ) : (
                      <div className="text-center space-y-1 text-stone-300">
                        <ShoppingBag className="w-12 h-12 mx-auto" />
                        <span className="text-[10px] uppercase font-black tracking-widest block">No Med Rendering</span>
                      </div>
                    )}

                    {isOwner && (
                      <span className="absolute top-3 left-3 bg-[#5a5a40] text-white text-[9px] uppercase font-black tracking-widest rounded-lg px-2.5 py-1.5 shadow-sm">
                        ⭐ My product
                      </span>
                    )}

                    {ribbonBadge}
                  </div>

                  <div className="p-5 space-y-3">
                    <div>
                      <h4 className={`font-black text-base leading-snug truncate ${tier === 'Platinum' ? 'text-zinc-100' : 'text-[#373735]'}`}>
                        {p.name}
                      </h4>
                      <div className={`text-lg font-serif font-black mt-1.5 ${tier === 'Platinum' ? 'text-teal-400' : 'text-[#5a5a40]'}`}>
                        PKR {Number(p.price).toLocaleString()}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[9px] uppercase tracking-widest font-black border font-mono shadow-inner ${
                        tier === 'Platinum' ? 'bg-zinc-800 border-zinc-700 text-zinc-300' : 'bg-stone-100 border-stone-200 text-[#5a5a40]'
                      }`}>
                        <Package className="w-3 h-3" />
                        <span>Stock: {p.quantity} left</span>
                      </span>
                    </div>

                    <p className={`text-xs font-semibold leading-relaxed line-clamp-3 ${tier === 'Platinum' ? 'text-zinc-300' : 'text-[#7a766f]'}`}>
                      {p.description}
                    </p>

                    <div className={`text-[10px] font-semibold flex items-center gap-1 p-2.5 rounded-xl border ${
                      tier === 'Platinum'
                        ? 'bg-zinc-900 border-zinc-800 text-zinc-400'
                        : 'bg-[#fcf9f2] border-[#e3dec9] text-[#a49f92]'
                    }`}>
                      <span className="font-extrabold uppercase text-[9px] text-[#5a5a40]">Seller:</span>
                      <strong className={`font-bold ${tier === 'Platinum' ? 'text-white' : 'text-black'}`}>{p.ownerName}</strong>
                      <span className="inline-flex px-1.5 py-0.5 rounded-lg bg-white/10 uppercase tracking-widest text-[8px] font-black border border-stone-200/20">
                        {p.ownerRole}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="px-5 pb-5 pt-0.5 flex gap-2 w-full">
                  <a
                    href={`https://wa.me/${p.whatsapp}?text=${encodeURIComponent(
                      `Hi ${p.ownerName}! I saw your veterinary accessory listing on VetAxis: "${p.name}" (PKR ${Number(p.price).toLocaleString()}) and would like to verify ordering conditions.`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 text-center btn-tactile-3d-secondary py-2.5 text-xs inline-flex items-center justify-center gap-1.5 bg-[#a0522d] border-[#7d3e20]/60 border-b-[#733517] text-white hover:bg-[#b05d36]"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>WhatsApp Order</span>
                  </a>

                  {isOwner && (
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleDeleteProduct(p.id)}
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

    </div>
  );
}
