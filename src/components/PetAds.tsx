import { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { UserProfile, PetAd } from '../types';
import { PetAdsService } from '../lib/storage';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, Search, MapPin, Tag, Plus, MessageCircle, Trash2, Calendar, Sparkles, AlertCircle } from 'lucide-react';

interface PetAdsProps {
  currentUser: UserProfile;
}

export function PetAds({ currentUser }: PetAdsProps) {
  const [ads, setAds] = useState<PetAd[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [speciesFilter, setSpeciesFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('newest');
  const [searchTerm, setSearchTerm] = useState<string>('');

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

  useEffect(() => {
    loadAds();
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
      
      {/* CLASSFIED ADS HERO BANNER */}
      <div className="relative bg-gradient-to-br from-[#3e3e2b] via-[#5a5a40] to-[#737351] text-white p-8 md:p-10 rounded-3xl overflow-hidden border border-[#5a5a40] border-b-[8px] border-b-[#323223] shadow-xl animate-fadeIn">
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1.5px,transparent_1.5px)] [background-size:20px_20px] opacity-15" />
        <div className="absolute top-1/2 right-12 -translate-y-1/2 opacity-20 pointer-events-none hidden md:block">
          <Heart className="w-48 h-48 animate-pulse" />
        </div>
        
        <div className="relative z-10 space-y-2.5">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white/10 rounded-xl text-xs font-bold font-mono tracking-wider uppercase border border-white/20 backdrop-blur-md">
            🐾 Classified Forum
          </span>
          <h2 className="text-3.5xl md:text-4.5xl font-serif font-black tracking-tight drop-shadow-sm">
            Pet Boarding & Classifieds
          </h2>
          <p className="text-neutral-200 text-sm md:text-base font-semibold max-w-xl">
            Acquire healthy animals looking for lovely adoptive families or browse legal pet rehoming advertisements.
          </p>
        </div>
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

            return (
              <motion.div
                key={ad.id}
                layout
                whileHover={{ y: -5 }}
                className="bg-white rounded-3xl border border-[#e3dec9] border-b-[5px] border-b-[#cdc6ad] overflow-hidden flex flex-col justify-between hover:shadow-xl hover:border-b-[4px] hover:border-[#5a5a40]"
              >
                <div>
                  <div className="h-48 bg-stone-100 relative overflow-hidden flex items-center justify-center border-b border-[#e3dec9]">
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
                  </div>

                  <div className="p-5 space-y-3">
                    <div>
                      <h4 className="font-black text-base text-[#373735] leading-snug truncate">
                        {ad.petType} {ad.breed && `· ${ad.breed}`}
                      </h4>
                      <div className="text-lg font-serif font-black text-[#5a5a40] mt-1.5 gap-1 inline-flex items-center">
                        {ad.adType === 'adoption' ? (
                          <span className="text-emerald-700 italic">Free Family Adoption</span>
                        ) : (
                          `PKR ${Number(ad.price).toLocaleString()}`
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2.5">
                      {ad.age !== null && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-stone-100 border border-stone-200 text-[9px] font-black uppercase text-[#373735]">
                          <Calendar className="w-3 h-3 text-[#5a5a40]" />
                          <span>{ad.age < 12 ? `${ad.age} mos` : `${Math.floor(ad.age / 12)} yrs`}</span>
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[#fcf9f2] border border-[#e3dec9] text-[9px] font-black uppercase text-[#5a5a40]">
                        <MapPin className="w-3 h-3 text-amber-500" />
                        <span>{ad.location}</span>
                      </span>
                    </div>

                    <p className="text-xs text-[#7a766f] font-semibold leading-relaxed line-clamp-3">
                      {ad.description}
                    </p>

                    <div className="text-[10px] text-[#a49f92] font-semibold flex items-center gap-1 bg-[#fcf9f2] p-2.5 rounded-xl border border-[#e3dec9]">
                      <span className="font-extrabold uppercase text-[9px] text-[#5a5a40]">Contact:</span>
                      <strong className="text-black font-bold">{ad.ownerName}</strong>
                      <span className="inline-flex px-1.5 py-0.5 rounded-lg bg-white/80 uppercase tracking-widest text-[8px] font-black border border-stone-200">
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

    </div>
  );
}
