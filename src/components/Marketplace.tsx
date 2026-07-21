import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { UserProfile, Product } from '../types';
import { MarketplaceService } from '../lib/storage';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingBag, Search, Tag, MessageCircle, Trash2, Package, Plus, Sparkles, CheckCircle2 } from 'lucide-react';

interface MarketplaceProps {
  currentUser: UserProfile;
  onNavigate?: (section: string) => void;
}

export function Marketplace({ currentUser, onNavigate }: MarketplaceProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [showUpgradeModal, setShowUpgradeModal] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('newest');
  const [safeTradeOpen, setSafeTradeOpen] = useState<boolean>(true);
  const [legalAgreed, setLegalAgreed] = useState<boolean>(false);

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

    if (!legalAgreed) {
      setFormError('⚠️ Safe Trade Consent Required: You must check the legal affirmation box to confirm that you adhere to our anti-scam guidelines and hold the platform harmless.');
      return;
    }

    if (!prodName.trim() || prodPrice <= 0 || prodQty < 1 || !prodDesc.trim() || !prodWhatsapp.trim()) {
      setFormError('Please fill in all product details and a numeric price/quantity.');
      return;
    }

    const whatsappCleared = prodWhatsapp.replace(/[\s+\-()]/g, '');
    if (!/^\d{9,16}$/.test(whatsappCleared)) {
      setFormError('Please input a valid WhatsApp number with country code (e.g. 923001234567).');
      return;
    }

    // Subscription Limit check for posting product ads (Unlimited for premium, max 15 per month for clinics/doctors)
    const isPremium = !!currentUser.subscriptionTier;
    if (!isPremium) {
      const isClinicOrDoctor = currentUser.role === 'clinic' || currentUser.role === 'doctor';
      
      if (isClinicOrDoctor) {
        // Clinics & doctors get 15 postings per month (last 30 days)
        const oneMonthAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
        const myRecentProducts = products.filter(p => p.ownerEmail === currentUser.email && p.createdAt >= oneMonthAgo).length;
        if (myRecentProducts >= 15) {
          setShowUpgradeModal(true);
          setFormError('⚠️ Placement Limit Exceeded: Unsubscribed clinics/doctors are restricted to 15 marketplace postings per month. Upgrade to Silver, Gold, or Platinum to get unlimited listings!');
          return;
        }
      } else {
        // Other roles are restricted to 3 active listings
        const myProductsCount = products.filter(p => p.ownerEmail === currentUser.email).length;
        if (myProductsCount >= 3) {
          setFormError('⚠️ Placement Limit: Unsubscribed accounts are restricted to 3 active product postings. Please upgrade to Silver, Gold, or Platinum to unlock unlimited marketplace listings!');
          return;
        }
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
                Direct regulations for buying and listing products in the veterinary marketplace.
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
                  <span>❌ NO ADVANCE PAYMENTS</span>
                </div>
                <p className="text-[10px] font-semibold text-stone-600 leading-relaxed">
                  Never transfer money or deposit partial payments in advance via EasyPaisa or digital banking before receiving your items. Fraudulent listings request holding deposits and deactivate their numbers.
                </p>
              </div>

              {/* Alert 2 */}
              <div className="p-3 bg-white rounded-2xl border border-amber-100 text-left space-y-1.5">
                <div className="text-xs font-black text-[#5a5a40] flex items-center gap-1">
                  <span>🔬 VERIFY MEDICINE INTEGRITY</span>
                </div>
                <p className="text-[10px] font-semibold text-stone-600 leading-relaxed">
                  Ensure any clinical dressings, feed items, dewormers, or vaccines have readable manufacturer details, active batch codes, un-expired dates, and authentic seal markings. Test or inspect them thoroughly before usage.
                </p>
              </div>

              {/* Alert 3 */}
              <div className="p-3 bg-white rounded-2xl border border-amber-100 text-left space-y-1.5">
                <div className="text-xs font-black text-blue-800 flex items-center gap-1">
                  <span>🎖️ TRUST SEAL CLARITY</span>
                </div>
                <p className="text-[10px] font-semibold text-stone-600 leading-relaxed">
                  Look for professional practitioners' level borders (Silver, Gold, Platinum). Subscribed clinics offer superior legal security. Report any fishy item details or suspicious conduct immediately to us.
                </p>
              </div>
            </div>

            {/* Legal Liability Disclaimer Statement */}
            <div className="p-3.5 bg-neutral-900 text-white rounded-2xl space-y-1 font-mono text-[9px] select-none leading-relaxed border border-stone-800">
              <span className="text-amber-400 font-extrabold uppercase">⚖️ CORE VENUE LIABILITY EXCLUSION (LEGAL IMMUNITY NOTICE):</span>
              <p className="text-neutral-300 font-semibold">
                This marketplace functions strictly as a neutral self-service advertisement directory. The platform and its development administrators do not own, store, test, verify, or deliver any physical products listed. By purchasing, browsing, or publishing, you explicitly acknowledge and agree that you waive all legal claims and hold the webapp platform completely harmless from any financial damages, counterfeit items, or adverse clinical reactions resulting from listed products.
              </p>
            </div>
          </motion.div>
        )}
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
                        I agree to the <span className="text-[#a0522d] font-bold">Safe Trading & Anti-Scam Precautions</span>. I certify that all products are legally sourced, authentic, non-expired, and safe for veterinary application. I represent that all descriptions are 100% accurate. I agree that the platform owners bear absolute <strong className="text-stone-900 underline">zero liability</strong> for any trade activities, financial transactions, or product usage complications, keeping the webapp safe from legal issues.
                      </div>
                    </label>
                  </div>

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
                Unsubscribed practitioners (clinics and doctors) are entitled to a maximum of <strong>15 product postings</strong> per month. Upgrade to our Silver, Gold, or Platinum plans to enjoy unlimited high-visibility listings and auto-highlighted cards!
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
