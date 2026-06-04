import { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { UserProfile, Product } from '../types';
import { MarketplaceService } from '../lib/storage';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingBag, Search, Tag, MessageCircle, Trash2, Package, Plus, Sparkles, CheckCircle2 } from 'lucide-react';

interface MarketplaceProps {
  currentUser: UserProfile;
}

export function Marketplace({ currentUser }: MarketplaceProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('newest');

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

    if (!prodName.trim() || prodPrice <= 0 || prodQty < 1 || !prodDesc.trim() || !prodWhatsapp.trim()) {
      setFormError('Please fill in all product details and a numeric price/quantity.');
      return;
    }

    const whatsappCleared = prodWhatsapp.replace(/[\s+\-()]/g, '');
    if (!/^\d{9,16}$/.test(whatsappCleared)) {
      setFormError('Please input a valid WhatsApp number with country code (e.g. 923001234567).');
      return;
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
      
      {/* MARKETPLACE HERO BANNER */}
      <div className="relative bg-gradient-to-br from-[#3e3e2b] via-[#5a5a40] to-[#737351] text-white p-8 md:p-10 rounded-3xl overflow-hidden border border-[#5a5a40] border-b-[8px] border-b-[#323223] shadow-xl animate-fadeIn">
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1.5px,transparent_1.5px)] [background-size:20px_20px] opacity-15" />
        <div className="absolute top-1/2 right-12 -translate-y-1/2 opacity-20 pointer-events-none hidden md:block">
          <ShoppingBag className="w-48 h-48" />
        </div>
        
        <div className="relative z-10 space-y-2.5">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white/10 rounded-xl text-xs font-bold font-mono tracking-wider uppercase border border-white/20 backdrop-blur-md">
            🛒 Medical Marketplace
          </span>
          <h2 className="text-3.5xl md:text-4.5xl font-serif font-black tracking-tight drop-shadow-sm">
            Veterinary Pharmacy & Accessories
          </h2>
          <p className="text-neutral-200 text-sm md:text-base font-semibold max-w-xl">
            Acquire certified animal nutrition products, vitamins, and clinical dressings listed by official vets.
          </p>
          
          <div className="pt-2 animate-scaleUp">
            {isAuthorizedSeller ? (
              <div className="inline-flex items-center gap-2.5 px-4 py-2 bg-emerald-500/15 border border-emerald-400/30 rounded-2xl text-[11px] font-black uppercase text-emerald-300 shadow-inner">
                <CheckCircle2 className="w-4.5 h-4.5" />
                <span>Seller Mode Activated (Can Publish Below)</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-2.5 px-4 py-2 bg-white/10 rounded-2xl text-[11px] font-bold text-neutral-300">
                <span>ℹ️ Browsing Mode (Only doctors or clinics can sell products)</span>
              </div>
            )}
          </div>
        </div>
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

            return (
              <motion.div
                key={p.id}
                layout
                whileHover={{ y: -5 }}
                className="bg-white rounded-3xl border border-[#e3dec9] border-b-[5px] border-b-[#cdc6ad] overflow-hidden flex flex-col justify-between hover:shadow-xl hover:border-b-[4px] hover:border-[#5a5a40]"
              >
                <div>
                  {/* Thumbnail Banner */}
                  <div className="h-44 bg-stone-50 relative border-b border-[#e3dec9] flex items-center justify-center overflow-hidden">
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
                  </div>

                  <div className="p-5 space-y-3">
                    <div>
                      <h4 className="font-black text-base text-[#373735] leading-snug truncate">
                        {p.name}
                      </h4>
                      <div className="text-lg font-serif font-black text-[#5a5a40] mt-1.5">
                        PKR {Number(p.price).toLocaleString()}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[9px] uppercase tracking-widest font-black bg-stone-100 border border-stone-200 text-[#5a5a40] font-mono shadow-inner">
                        <Package className="w-3 h-3" />
                        <span>Stock: {p.quantity} left</span>
                      </span>
                    </div>

                    <p className="text-xs text-[#7a766f] font-semibold leading-relaxed line-clamp-3">
                      {p.description}
                    </p>

                    <div className="text-[10px] text-[#a49f92] font-semibold flex items-center gap-1 bg-[#fcf9f2] p-2.5 rounded-xl border border-[#e3dec9]">
                      <span className="font-extrabold uppercase text-[9px] text-[#5a5a40]">Seller:</span>
                      <strong className="text-black font-bold">{p.ownerName}</strong>
                      <span className="inline-flex px-1.5 py-0.5 rounded-lg bg-white/80 uppercase tracking-widest text-[8px] font-black border border-stone-200">
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
