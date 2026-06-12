import { useState, ChangeEvent, FormEvent, useEffect, useRef } from 'react';
import { UserProfile } from '../types';
import { AuthService, PromotionalAdsService } from '../lib/storage';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, User, MapPin, Mail, Sparkles, AlertTriangle, Trash2, Camera, RefreshCw, Megaphone, ChevronRight } from 'lucide-react';
import { LegalModal } from './LegalAndAbout';

interface ProfileProps {
  currentUser: UserProfile;
  onUpdateUser: (updated: UserProfile) => void;
  onDeleteSuccess: () => void;
}

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

export function ProfilePage({ currentUser, onUpdateUser, onDeleteSuccess }: ProfileProps) {
  const [editing, setEditing] = useState<boolean>(false);
  const [name, setName] = useState<string>(currentUser.name);
  const [phone, setPhone] = useState<string>(currentUser.phone || '');
  const [expertise, setExpertise] = useState<string>(currentUser.expertise || '');
  const [facilities, setFacilities] = useState<string>(currentUser.facilities || '');
  const [address, setAddress] = useState<string>(currentUser.address || '');
  const [doctorCity, setDoctorCity] = useState<string>(currentUser.address || 'Islamabad');

  // Photo uploads
  const [profilePic, setProfilePic] = useState<string>(currentUser.profilePic || 'default');

  // Subscription Checkout states
  const [checkoutTier, setCheckoutTier] = useState<'Silver' | 'Gold' | 'Platinum' | null>(null);
  const [cardName, setCardName] = useState<string>('');
  const [cardNumber, setCardNumber] = useState<string>('');
  const [cardExpiry, setCardExpiry] = useState<string>('');
  const [cardCvv, setCardCvv] = useState<string>('');
  const [checkoutLoading, setCheckoutLoading] = useState<boolean>(false);

  // Cancellation confirm modal state
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState<boolean>(false);

  // Delete account variables
  const [deleteOpen, setDeleteOpen] = useState<boolean>(false);
  const [deleteCheck1, setDeleteCheck1] = useState<boolean>(false);
  const [deleteCheck2, setDeleteCheck2] = useState<boolean>(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState<string>('');

  // Status logs
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [legalModalOpen, setLegalModalOpen] = useState<boolean>(false);
  const [legalModalType, setLegalModalType] = useState<'terms' | 'about'>('terms');

  // Billboard Promotional campaign states
  const [adTitle, setAdTitle] = useState<string>('');
  const [adDescription, setAdDescription] = useState<string>('');
  const [adSponsor, setAdSponsor] = useState<string>(currentUser.name || '');
  const [adCtaText, setAdCtaText] = useState<string>('Visit Clinic');
  const [adCtaUrl, setAdCtaUrl] = useState<string>('');
  const [adIcon, setAdIcon] = useState<string>('🏥');
  const [adGradient, setAdGradient] = useState<string>('from-[#1c2e24] via-[#2d4a39] to-[#1c2e24]');
  const [adPaymentChoice, setAdPaymentChoice] = useState<'free_privilege' | 'pay_3_days' | 'pay_7_days'>('pay_3_days');
  const [adCardName, setAdCardName] = useState<string>('');
  const [adCardNumber, setAdCardNumber] = useState<string>('');
  const [adCardExpiry, setAdCardExpiry] = useState<string>('');
  const [adCardCvv, setAdCardCvv] = useState<string>('');
  const [submittingAd, setSubmittingAd] = useState<boolean>(false);
  const [locationLoading, setLocationLoading] = useState<boolean>(false);
  const [showAdCreator, setShowAdCreator] = useState<boolean>(false);
  const adCreatorRef = useRef<HTMLDivElement>(null);

  const [activeAds, setActiveAds] = useState<any[]>([]);
  const [deletingAdId, setDeletingAdId] = useState<string | null>(null);

  const loadActiveAds = async () => {
    try {
      const ads = await PromotionalAdsService.fetchActiveAds();
      setActiveAds(ads.filter((ad: any) => ad.ownerUid === currentUser.uid));
    } catch (err) {
      console.error('Failed fetching active ads', err);
    }
  };

  useEffect(() => {
    if (currentUser.uid) {
      loadActiveAds();
    }
  }, [currentUser.uid, currentUser.promoAdsUsed]);

  useEffect(() => {
    const allowed = currentUser.subscriptionTier === 'Silver' ? 3 : currentUser.subscriptionTier === 'Gold' ? 5 : currentUser.subscriptionTier === 'Platinum' ? 10 : 0;
    const remaining = Math.max(0, allowed - (currentUser.promoAdsUsed || 0));
    if (remaining > 0) {
      setAdPaymentChoice('free_privilege');
    } else {
      setAdPaymentChoice('pay_3_days');
    }
  }, [currentUser.subscriptionTier, currentUser.promoAdsUsed]);

  const handleAdSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!adTitle.trim() || !adDescription.trim() || !adSponsor.trim() || !adCtaText.trim() || !adCtaUrl.trim()) {
      setError('Please fill in all the required campaign parameters.');
      return;
    }

    const isFree = adPaymentChoice === 'free_privilege';
    const durationDays = adPaymentChoice === 'pay_7_days' ? 7 : 3;
    const pricePaid = isFree ? 0 : (adPaymentChoice === 'pay_7_days' ? 1500 : 1000);

    // Validate payment credentials if not free
    if (!isFree) {
      if (!adCardName.trim() || !adCardNumber.trim() || !adCardExpiry.trim() || !adCardCvv.trim()) {
        setError('Please enter your card payment details to complete this purchase campaign.');
        return;
      }
      const cleanNum = adCardNumber.replace(/\s+/g, '');
      if (cleanNum.length < 15 || cleanNum.length > 16) {
        setError('Invalid credit card number format for ad checkout. Must be 15 or 16 digits.');
        return;
      }
    } else {
      // Re-verify they have credits
      const allowed = currentUser.subscriptionTier === 'Silver' ? 3 : currentUser.subscriptionTier === 'Gold' ? 5 : currentUser.subscriptionTier === 'Platinum' ? 10 : 0;
      const currentUsed = currentUser.promoAdsUsed || 0;
      if (currentUsed >= allowed) {
        setError('No free ad campaign privileges remaining under your current subscription.');
        return;
      }
    }

    try {
      setSubmittingAd(true);
      setError(null);
      setSuccess(null);

      // Simulate network processing delay (ad registration & payment clearance)
      await new Promise(resolve => setTimeout(resolve, 2000));

      await PromotionalAdsService.createAd({
        sponsorName: adSponsor,
        title: adTitle,
        description: adDescription,
        ctaText: adCtaText,
        ctaUrl: adCtaUrl,
        bgGradient: adGradient,
        badge: isFree ? `${currentUser.subscriptionTier} Promo` : 'Premium Billboard Sponsor',
        icon: adIcon,
        ownerEmail: currentUser.email,
        ownerUid: currentUser.uid,
        ownerRole: currentUser.role as 'doctor' | 'clinic'
      }, durationDays, pricePaid);

      // If they used a free privilege, we MUST increment promoAdsUsed in database & local state!
      let updatedUser = currentUser;
      if (isFree) {
        const nextUsedCount = (currentUser.promoAdsUsed || 0) + 1;
        updatedUser = await AuthService.updateProfile(currentUser.uid, {
          promoAdsUsed: nextUsedCount
        });
        onUpdateUser(updatedUser);
      }

      triggerSuccess(`⚡ Congratulations! Your promotional campaign "${adTitle}" is now live on the VetAxis Billboard!`);
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
    } catch (err: any) {
      setError(err.message || 'An error occurred during campaign promotion processing.');
    } finally {
      setSubmittingAd(false);
    }
  };

  const handleDeleteAccount = async (e: FormEvent) => {
    e.preventDefault();
    if (!deleteCheck1 || !deleteCheck2) {
      setError('Please acknowledge all safety precautions checkboxes to proceed.');
      return;
    }
    if (deleteConfirmText.trim() !== 'DELETE') {
      setError('Please type the confirmation word "DELETE" exactly to authorize.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await AuthService.deleteAccount(currentUser.uid);
      onDeleteSuccess();
    } catch (err: any) {
      setError(err.message || 'An error occurred during account deletion.');
    } finally {
      setLoading(false);
    }
  };

  const triggerSuccess = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(null), 8500); // Give the user plenty of time to enjoy their confirmation message
  };

  const handleSaveCurrentLocation = async () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }

    setLocationLoading(true);
    setError(null);
    setSuccess(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          let addr = address || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
          try {
            const res = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`,
              { headers: { 'Accept-Language': 'en' } }
            );
            if (res.ok) {
              const data = await res.json();
              if (data && data.display_name) {
                addr = data.display_name;
              }
            }
          } catch (geocodingErr) {
            console.warn('Geocoding lookup failed, saving raw coordinates.', geocodingErr);
          }

          const locationObj = {
            lat: latitude,
            lng: longitude,
            address: addr
          };

          const updated = await AuthService.updateProfile(currentUser.uid, {
            location: locationObj,
            address: address ? address : addr
          });

          if (!address) {
            setAddress(addr);
          }

          onUpdateUser(updated);
          triggerSuccess('✓ Your clinic physical GPS location has been successfully captured, mapped, and saved to the server! Users can now navigate to your center!');
        } catch (err: any) {
          setError(err.message || 'Saving current GPS location failed.');
        } finally {
          setLocationLoading(false);
        }
      },
      (err) => {
        setLocationLoading(false);
        if (err.code === 1) {
          setError('We were denied access to your device GPS location. Please check your browser application settings.');
        } else if (err.code === 2) {
          setError('GPS position is currently unavailable. Please verify connection and try again.');
        } else {
          setError('GPS request timed out before acquiring precise location coordinate.');
        }
      },
      { timeout: 12000, enableHighAccuracy: true }
    );
  };

  const handleSubscribeSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!checkoutTier) return;
    if (!cardName.trim() || !cardNumber.trim() || !cardExpiry.trim() || !cardCvv.trim()) {
      setError('Please fill in all credit card payment details.');
      return;
    }
    const cleanNum = cardNumber.replace(/\s+/g, '');
    if (cleanNum.length < 15 || cleanNum.length > 16) {
      setError('Invalid card format. Standard Visa/Mastercard must be 15 or 16 digits.');
      return;
    }

    try {
      setCheckoutLoading(true);
      setError(null);
      setSuccess(null);
      
      // Simulate bank 3D secure handshaking
      await new Promise(resolve => setTimeout(resolve, 2000));

      const updated = await AuthService.updateProfile(currentUser.uid, {
        subscriptionTier: checkoutTier,
        subscriptionExpiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
        promoAdsUsed: 0,
        isVerified: true // Backwards compatibility booster
      });

      onUpdateUser(updated);
      
      // Clean up fields
      setCardName('');
      setCardNumber('');
      setCardExpiry('');
      setCardCvv('');
      setCheckoutTier(null);
      
      triggerSuccess(`🎉 Congratulations! You are now a VetAxis ${checkoutTier} elite model holder! Enjoy premium privileges, priority directory listings, and your 3D custom animated card.`);
    } catch (err: any) {
      setError(err.message || 'Direct 3DS secure Checkout failed. Please review values.');
    } finally {
      setCheckoutLoading(false);
    }
  };

  const cancelSubscription = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      const updated = await AuthService.updateProfile(currentUser.uid, {
        subscriptionTier: null as any,
        subscriptionExpiresAt: null as any,
        isVerified: false
      });
      onUpdateUser(updated);
      setCancelConfirmOpen(false);
      triggerSuccess('✓ Your premium tier subscription has been canceled. Your card has reverted to the classic layout.');
    } catch (err: any) {
      setError(err.message || 'Failed to cancel subscription.');
    } finally {
      setLoading(false);
    }
  };

  // Convert uploaded photo to Base64 (max 1MB size limit)
  const handlePhotoUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1 * 1024 * 1024) {
      setError('Profile picture must be smaller than 1 MB.');
      return;
    }

    setLoading(true);
    setError(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      if (event.target?.result) {
        const base64Str = event.target.result as string;
        try {
          const updated = await AuthService.updateProfile(currentUser.uid, { profilePic: base64Str });
          onUpdateUser(updated);
          setProfilePic(base64Str);
          triggerSuccess('✓ Profile picture updated successfully!');
        } catch (err: any) {
          setError(err.message || 'Failed to sync picture in database.');
        } finally {
          setLoading(false);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleProfileSave = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!name.trim() || !phone.trim()) {
      setError('Full Name and Phone Number are required fields.');
      return;
    }

    setLoading(true);

    try {
      const payload: Partial<UserProfile> = {
        name: name.trim(),
        phone: phone.trim()
      };

      if (currentUser.role === 'doctor' || currentUser.role === 'assistant' || currentUser.role === 'user') {
        payload.expertise = expertise.trim() || (
          currentUser.role === 'doctor' ? 'General Practitioner' :
          currentUser.role === 'assistant' ? 'Nurse' :
          'Livestock Breeder / Pet Owner'
        );
        payload.address = doctorCity;
        const matchedCity = PAKISTAN_CITIES.find(c => c.name === doctorCity) || PAKISTAN_CITIES[0];
        payload.location = {
          lat: matchedCity.lat,
          lng: matchedCity.lng,
          address: matchedCity.name
        };
      }
      if (currentUser.role === 'clinic') {
        payload.facilities = facilities.trim() || 'General OPD';
        payload.address = address.trim();
        if (!payload.address) {
          setError('Clinic physical address is required.');
          setLoading(false);
          return;
        }
      }

      const updated = await AuthService.updateProfile(currentUser.uid, payload);
      onUpdateUser(updated);
      setEditing(false);
      triggerSuccess('✓ User profile updated and saved to server database!');
    } catch (err: any) {
      setError(err.message || 'Saving profile failed.');
    } finally {
      setLoading(false);
    }
  };

  const initials = currentUser.name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className="space-y-8 max-w-7xl mx-auto w-[98%] px-1 md:px-4 text-left">
      <div>
        <h1 className="font-serif font-black text-3.5xl text-[#373735] tracking-tight">Clinical Console Setting</h1>
        <p className="text-sm text-[#7a766f] font-semibold mt-1">Manage physical locations, edit expertise catalog, and configure credential checks.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT PROFILE CARD COLUMN (3 Columns on medium+, 4 on large) */}
        <div className="col-span-12 lg:col-span-4 bg-white border border-[#e3dec9] border-b-[5px] border-b-[#cdc6ad] rounded-3xl p-6 shadow-md flex flex-col items-center text-center space-y-6">
          
          <div className="relative group">
            {profilePic && profilePic !== 'default' ? (
              <img
                src={profilePic}
                alt={currentUser.name}
                className="w-28 h-28 rounded-2xl object-cover border-4 border-white shadow-xl bg-[#fcf9f2]"
              />
            ) : (
              <div className="w-28 h-28 rounded-2xl bg-[#5a5a40] text-white text-4xl font-serif font-black flex items-center justify-center shadow-xl uppercase">
                {initials}
              </div>
            )}
            
            {/* File Pencil Overlay */}
            <label className="absolute bottom-1 right-1 bg-[#5a5a40] hover:bg-[#3e3e2b] text-white p-2.5 rounded-xl border-2 border-white cursor-pointer shadow-lg flex items-center justify-center transition-all">
              <Camera className="w-4.5 h-4.5" />
              <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
            </label>
          </div>

          <div className="space-y-1.5 wd-full">
            <h3 className="font-serif text-xl font-black text-[#373735] leading-tight flex items-center justify-center gap-1.5">
              <span>{currentUser.name}</span>
              {currentUser.subscriptionTier ? (
                <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[9px] font-black shrink-0 border border-white text-white ${
                  currentUser.subscriptionTier === 'Silver' ? 'bg-slate-500' :
                  currentUser.subscriptionTier === 'Gold' ? 'bg-amber-600' :
                  'bg-indigo-600'
                }`}>✓</span>
              ) : currentUser.isVerified ? (
                <span className="inline-flex items-center justify-center w-5 h-5 bg-[#2e7d32] text-white rounded-full text-[10px] font-black shrink-0 border border-white">✓</span>
              ) : null}
            </h3>
            
            <span className="inline-block px-3.5 py-1 rounded-xl text-[9px] uppercase font-black tracking-widest bg-[#f4f1e9] text-[#5a5a40] border border-[#e3dec9]">
              {currentUser.subscriptionTier ? `${currentUser.subscriptionTier} ` : ''} {
                currentUser.role === 'doctor' ? 'Practitioner' :
                currentUser.role === 'clinic' ? 'Hospital Centre' :
                currentUser.role === 'assistant' ? 'Assistant Nurse' :
                'General User (Farmer / Pet Owner)'
              }
            </span>

            <div className="text-xs font-mono font-bold text-[#a49f92] truncate max-w-full">{currentUser.email}</div>
          </div>

          {/* Email Verification Status */}
          <div className="border-t border-[#f4f1e9] w-full pt-6 space-y-3.5">
            <span className="text-[#a49f92] block font-black uppercase tracking-widest text-[9px]">Clinical Auth Scope</span>
            <div className="flex flex-col items-center gap-2">
              {currentUser.emailVerified ? (
                <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-[10px] font-black tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Email Certified Active</span>
                </div>
              ) : (
                <div className="space-y-4 w-full">
                  <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-[10px] font-black tracking-wider bg-red-50 text-red-700 border border-red-200 uppercase">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                    <span>Awaiting Email Verification</span>
                  </div>
                  
                  <div className="flex flex-col gap-2 w-full">
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          setError(null);
                          setSuccess(null);
                          setLoading(true);
                          await AuthService.resendVerification();
                          triggerSuccess("✓ Verification email has been resent to your inbox!");
                        } catch (err: any) {
                          setError(err.message || "Failed to resend verification email.");
                        } finally {
                          setLoading(false);
                        }
                      }}
                      disabled={loading}
                      className="btn-tactile-3d-secondary py-2 px-3 text-[10px]"
                    >
                      ✉️ Resend Verification link
                    </button>

                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          setError(null);
                          setSuccess(null);
                          setLoading(true);
                          const freshUser = await AuthService.reloadUser();
                          onUpdateUser(freshUser);
                          if (freshUser.emailVerified) {
                            triggerSuccess("🎉 Your email has been successfully verified!");
                          } else {
                            setError("Email is still unverified. Check your inbox and click the validation link first.");
                          }
                        } catch (err: any) {
                          setError(err.message || "Failed to refresh verification status.");
                        } finally {
                          setLoading(false);
                        }
                      }}
                      disabled={loading}
                      className="btn-tactile-3d-primary py-2 px-3 text-[10px] inline-flex items-center justify-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Reload Status</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>



        </div>

        {/* RIGHT COLUMN DETAILS INPUTS (8 Columns) */}
        <div className="col-span-12 lg:col-span-8 bg-white border border-[#e3dec9] border-b-[5px] border-b-[#cdc6ad] rounded-3xl p-6 md:p-8 shadow-md space-y-6">
          
          <div className="flex items-center justify-between border-b border-[#f4f1e9] pb-4.5">
            <h3 className="font-serif text-lg font-black text-[#373735] flex items-center gap-2">
              <User className="w-5 h-5 text-[#5a5a40]" />
              <span>Contact Credentials</span>
            </h3>
            
            <div className="flex items-center gap-2">
              {(currentUser.role === 'clinic' || currentUser.role === 'doctor') && !editing && (
                <button
                  type="button"
                  onClick={() => {
                    const nextVal = !showAdCreator;
                    setShowAdCreator(nextVal);
                    if (nextVal) {
                      setTimeout(() => {
                        adCreatorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }, 150);
                    }
                  }}
                  className={`btn-tactile-3d-secondary py-2 px-3.5 text-2xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer ${
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

              {editing ? (
                <div className="flex gap-2">
                  <button
                    onClick={handleProfileSave}
                    disabled={loading}
                    className="btn-tactile-3d-primary py-2 px-4 text-2xs"
                  >
                    💾 Save Changes
                  </button>
                  <button
                    onClick={() => {
                      setEditing(false);
                      setName(currentUser.name);
                      setPhone(currentUser.phone || '');
                      setExpertise(currentUser.expertise || '');
                      setFacilities(currentUser.facilities || '');
                      setAddress(currentUser.address || '');
                      setDoctorCity(currentUser.address || 'Islamabad');
                      setError(null);
                    }}
                    className="btn-tactile-3d-secondary py-2 px-4 text-2xs"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setEditing(true)}
                  className="btn-tactile-3d-secondary py-2 px-4 text-2xs"
                >
                  ✏️ Edit Profile Settings
                </button>
              )}
            </div>
          </div>

          <AnimatePresence mode="wait">
            {error && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="p-3.5 bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl font-bold"
              >
                ⚠️ {error}
              </motion.div>
            )}
            
            {success && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl font-bold"
              >
                {success}
              </motion.div>
            )}
          </AnimatePresence>

          {editing ? (
            <>
              <form onSubmit={handleProfileSave} className="space-y-5">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <span className="text-xs font-black uppercase text-[#5a5a40] tracking-wider">Full Display Name</span>
                    <input
                      type="text"
                      className="form-control text-xs"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      disabled={loading}
                    />
                  </div>

                  <div className="space-y-1">
                    <span className="text-xs font-black uppercase text-[#5a5a40] tracking-wider">WhatsApp Contact Phone</span>
                    <input
                      type="tel"
                      className="form-control text-xs"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <span className="text-xs font-black uppercase text-[#5a5a40] tracking-wider opacity-65">Email address (locked)</span>
                    <input
                      type="email"
                      className="form-control text-xs bg-[#f4f1e9]"
                      value={currentUser.email}
                      disabled
                    />
                  </div>

                  <div className="space-y-1">
                    <span className="text-xs font-black uppercase text-[#5a5a40] tracking-wider opacity-65">System Role (locked)</span>
                    <input
                      type="text"
                      className="form-control text-xs bg-[#f4f1e9] capitalize"
                      value={currentUser.role}
                      disabled
                    />
                  </div>
                </div>

                {/* CONDITIONAL: Specialty Doctor, Assistant or General User */}
                {(currentUser.role === 'doctor' || currentUser.role === 'assistant' || currentUser.role === 'user') && (
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <span className="text-xs font-black uppercase text-[#5a5a40] tracking-wider">
                        {currentUser.role === 'doctor' ? 'Board Specialization competencies' :
                         currentUser.role === 'assistant' ? 'Technical & Nursing competencies' :
                         'Animal Focus & Farm/Pet Interest'}
                      </span>
                      <input
                        type="text"
                        className="form-control text-xs"
                        placeholder={
                          currentUser.role === 'doctor' ? 'e.g. Feline Care, Small Animal Orthopedic and Surgery' :
                          currentUser.role === 'assistant' ? 'e.g. Dressing surgery support, animal vaccinations' :
                          'e.g. Dairy Buffalo breeding, pet owner focus, pedigree cats'
                        }
                        value={expertise}
                        onChange={(e) => setExpertise(e.target.value)}
                        disabled={loading}
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs font-black uppercase text-[#5a5a40] tracking-wider">
                        {currentUser.role === 'user' ? 'Location City / district' : 'Practice City / Town'}
                      </span>
                      <select
                        className="form-control text-xs bg-white cursor-pointer"
                        value={doctorCity}
                        onChange={(e) => setDoctorCity(e.target.value)}
                        disabled={loading}
                      >
                        {PAKISTAN_CITIES.map((c) => (
                          <option key={c.name} value={c.name}>
                            🇵🇰 {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {/* CONDITIONAL: Clinic Details */}
                {currentUser.role === 'clinic' && (
                  <div className="grid grid-cols-1 gap-4 bg-[#fcf9f2] p-5 rounded-2xl border border-[#e3dec9] border-b-[3px] space-y-1">
                    <span className="text-xs font-black uppercase text-[#5a5a40] tracking-wide block">Hospital Specifications</span>
                    
                    <div className="space-y-1">
                      <span className="text-xs font-bold text-[#373735]">Clinic Equipments list</span>
                      <input
                        type="text"
                        className="form-control bg-white text-xs"
                        placeholder="e.g. Digital Laboratory, Diagnostic X-Ray diagnostic, 24/7 rescue ICU ward"
                        value={facilities}
                        onChange={(e) => setFacilities(e.target.value)}
                        disabled={loading}
                      />
                    </div>

                    <div className="space-y-1">
                      <span className="text-xs font-bold text-[#373735]">Hospital Physical Address</span>
                      <input
                        type="text"
                        className="form-control bg-white text-xs"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        disabled={loading}
                      />
                    </div>

                    <div className="border-t border-[#e3dec9]/60 pt-4 mt-2 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black uppercase text-[#5a5a40] tracking-wide block">📍 GPS Location Mapping</span>
                        {currentUser.location?.lat && currentUser.location?.lng ? (
                          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase px-2 py-0.5 rounded-md border border-emerald-200">
                            Active GPS
                          </span>
                        ) : (
                          <span className="bg-amber-100 text-amber-800 text-[10px] font-black uppercase px-2 py-0.5 rounded-md border border-amber-200">
                            Mapped-less
                          </span>
                        )}
                      </div>

                      {currentUser.location?.lat && currentUser.location?.lng ? (
                        <div className="p-3 bg-white rounded-xl border border-[#e3dec9] text-[11px] space-y-1 text-[#3c3c3b]">
                          <p className="font-bold">🖥️ Coordinates Saved:</p>
                          <div className="grid grid-cols-2 gap-2 text-stone-500 font-mono text-[10px] font-bold bg-stone-50 p-1.5 rounded-lg border border-stone-100">
                            <span>Lat: {currentUser.location.lat.toFixed(6)}</span>
                            <span>Lng: {currentUser.location.lng.toFixed(6)}</span>
                          </div>
                          {currentUser.location.address && (
                            <p className="text-[10px] text-stone-600 mt-1 leading-relaxed">
                              <strong className="font-bold">Resolved Address:</strong> {currentUser.location.address}
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-[11px] text-amber-800 font-medium leading-relaxed">
                          ⚠️ No saved GPS location coordinates! Please stand physically inside your hospital center under high GPS precision, and tap "Save Current Location" below.
                        </p>
                      )}

                      <button
                        type="button"
                        disabled={locationLoading}
                        onClick={handleSaveCurrentLocation}
                        className="w-full btn-tactile-3d-secondary bg-white hover:bg-[#fcf9f2] text-[#5a5a40] border-[#e3dec9] py-2.5 transition-all text-xs font-black flex items-center justify-center gap-2 cursor-pointer"
                      >
                        {locationLoading ? (
                          <>
                            <span className="w-3.5 h-3.5 border-2 border-[#5a5a40] border-t-transparent rounded-full animate-spin"></span>
                            <span>Acquiring Coordinates & Geocoding...</span>
                          </>
                        ) : (
                          <>
                            <span>📍</span>
                            <span>Save Current Location (GPS)</span>
                          </>
                        )}
                      </button>
                      <p className="text-[9px] text-[#7a766f] font-semibold leading-normal">
                        This location will lock the exact coordinates for distance sorting. You can change this anytime as your physical hospital center moves.
                      </p>
                    </div>
                  </div>
                )}

              </form>

              {/* DANGER ZONE - ACCOUNT DELETION */}
              <div className="border-t border-red-200 pt-6 space-y-4">
                <button
                  type="button"
                  onClick={() => {
                    setDeleteOpen(!deleteOpen);
                    setDeleteCheck1(false);
                    setDeleteCheck2(false);
                    setDeleteConfirmText('');
                    setError(null);
                  }}
                  className="cursor-pointer inline-flex items-center gap-1.5 px-4 py-2 border border-red-200 border-b-[3px] text-red-600 hover:text-red-700 hover:border-red-400 text-xs font-bold bg-white rounded-xl transition-all"
                >
                  <Trash2 className="w-4.5 h-4.5 text-red-500" />
                  <span>Delete Clinical Account & Erase All Records</span>
                </button>

                <AnimatePresence>
                  {deleteOpen && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="bg-red-50 border border-red-200 border-b-[3px] rounded-3xl p-5 space-y-4 overflow-hidden"
                    >
                      <div className="flex items-center gap-2 text-red-800">
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                        <h4 className="font-serif text-sm font-black uppercase tracking-wider">Danger Zone: Irreversible Account Demolition</h4>
                      </div>

                      <div className="text-xs text-red-700/90 space-y-2.5 leading-relaxed font-semibold">
                        <p>
                          Please read this notice carefully before continuing. Deleting your account is absolute and <strong>cannot be undone</strong> under any circumstances.
                        </p>
                        <p>
                          By confirming below:
                        </p>
                        <ul className="list-disc pl-5 space-y-1">
                          <li>Your personal login profile and details will be wiped from our database.</li>
                          <li>Your clinic facility listings and professional validation will be terminated.</li>
                          <li>All your registered and active classified pet ads, veterinary materials, products, and community posts will be immediately and permanently hard-deleted from our databases.</li>
                        </ul>
                      </div>

                      <form onSubmit={handleDeleteAccount} className="space-y-4 pt-2">
                        <div className="space-y-2">
                          <label className="flex items-start gap-2.5 cursor-pointer text-xs font-bold text-stone-800 select-none">
                            <input
                              type="checkbox"
                              checked={deleteCheck1}
                              onChange={(e) => setDeleteCheck1(e.target.checked)}
                              className="mt-0.5 cursor-pointer accent-red-600 w-4 h-4"
                            />
                            <span>I understand that this action is absolute, permanent, and irreversible.</span>
                          </label>

                          <label className="flex items-start gap-2.5 cursor-pointer text-xs font-bold text-red-800 select-none">
                            <input
                              type="checkbox"
                              checked={deleteCheck2}
                              onChange={(e) => setDeleteCheck2(e.target.checked)}
                              className="mt-0.5 cursor-pointer accent-red-600 w-4 h-4"
                            />
                            <span>I consent to the immediate and complete erasure of all my posts, classified ads, and products.</span>
                          </label>
                        </div>

                        <div className="border-t border-red-200 pt-3 space-y-1">
                          <span className="text-xs font-black text-red-800 block">To authorize, type the word "DELETE" in uppercase below:</span>
                          <input
                            type="text"
                            className="form-control bg-white text-xs border-red-200 focus:border-red-500 w-full md:w-80"
                            placeholder='Type "DELETE"'
                            value={deleteConfirmText}
                            onChange={(e) => setDeleteConfirmText(e.target.value)}
                            disabled={loading}
                            required
                          />
                        </div>

                        <div className="flex gap-3 pt-1">
                          <button
                            type="submit"
                            disabled={loading || deleteConfirmText !== 'DELETE' || !deleteCheck1 || !deleteCheck2}
                            className="cursor-pointer border border-[#c23838] border-b-[3px] border-b-[#9e2a2a] bg-[#df4747] hover:bg-[#c23838] disabled:bg-stone-300 disabled:border-stone-400 text-white text-xs font-bold.5 py-2.5 px-6 rounded-2xl transition-all shadow-sm flex items-center gap-2"
                          >
                            {loading ? 'Erasing data...' : 'Permanently Delete My Account'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteOpen(false)}
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
            </>
          ) : (
            <div className="space-y-6 animate-none">
              <div className="bg-[#fcf9f2] p-5 rounded-2xl border border-[#e3dec9] space-y-4">
                <p className="text-[11px] text-[#7a766f] font-bold">
                  These gold-certified clinical credentials represent your active professional identity on the directory. To update these files or manage your account parameters, click the <strong>✏️ Edit Profile Settings</strong> button in the top header.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4.5 pt-2">
                  <div className="bg-white p-3.5 rounded-xl border border-[#e3dec9]/60">
                    <span className="text-[9px] font-black uppercase text-[#a49f92] block tracking-wider leading-none mb-1">Full Display Name</span>
                    <span className="text-xs font-extrabold text-[#373735]">{currentUser.name}</span>
                  </div>

                  <div className="bg-white p-3.5 rounded-xl border border-[#e3dec9]/60">
                    <span className="text-[9px] font-black uppercase text-[#a49f92] block tracking-wider leading-none mb-1">WhatsApp Contact Phone</span>
                    <span className="text-xs font-extrabold text-[#373735]">{currentUser.phone || 'None Listed'}</span>
                  </div>

                  <div className="bg-white p-3.5 rounded-xl border border-[#e3dec9]/60">
                    <span className="text-[9px] font-black uppercase text-[#a49f92] block tracking-wider leading-none mb-1">Email Address (Locked)</span>
                    <span className="text-xs font-mono font-bold text-[#5a5a40]">{currentUser.email}</span>
                  </div>

                  <div className="bg-white p-3.5 rounded-xl border border-[#e3dec9]/60">
                    <span className="text-[9px] font-black uppercase text-[#a49f92] block tracking-wider leading-none mb-1">System Role (Locked)</span>
                    <span className="text-xs font-extrabold text-[#3c3c3a] block capitalize">{currentUser.role}</span>
                  </div>
                </div>

                {(currentUser.role === 'doctor' || currentUser.role === 'assistant' || currentUser.role === 'user') && (
                  <div className="grid grid-cols-1 gap-4.5">
                    <div className="bg-white p-3.5 rounded-xl border border-[#e3dec9]/60">
                      <span className="text-[9px] font-black uppercase text-[#a49f92] block tracking-wider leading-none mb-1">
                        {currentUser.role === 'doctor' ? 'Board Specialization Competencies' :
                         currentUser.role === 'assistant' ? 'Nursing & Clinical Competencies' :
                         'Animal Focus & Breeder Interests'}
                      </span>
                      <span className="text-xs font-extrabold text-[#373735]">
                        {currentUser.expertise || (
                          currentUser.role === 'doctor' ? 'General Practitioner' :
                          currentUser.role === 'assistant' ? 'Nurse' :
                          'Livestock Breeder / Pet Owner'
                        )}
                      </span>
                    </div>

                    <div className="bg-white p-3.5 rounded-xl border border-[#e3dec9]/60">
                      <span className="text-[9px] font-black uppercase text-[#a49f92] block tracking-wider leading-none mb-1">
                        {currentUser.role === 'user' ? 'Location City / District' : 'Practice City / Town'}
                      </span>
                      <span className="text-xs font-extrabold text-[#373735]">{currentUser.address || 'Islamabad'}</span>
                    </div>
                  </div>
                )}

                {currentUser.role === 'clinic' && (
                  <div className="space-y-4.5">
                    <div className="bg-white p-3.5 rounded-xl border border-[#e3dec9]/60">
                      <span className="text-[9px] font-black uppercase text-[#a49f92] block tracking-wider leading-none mb-1">Hospital Specifications</span>
                      <span className="text-xs font-extrabold text-[#373735]">{currentUser.facilities || 'General OPD'}</span>
                    </div>

                    <div className="bg-white p-3.5 rounded-xl border border-[#e3dec9]/60">
                      <span className="text-[9px] font-black uppercase text-[#a49f92] block tracking-wider leading-none mb-1">Hospital Physical Address</span>
                      <span className="text-xs font-extrabold text-[#373735]">{currentUser.address || 'No Address Saved'}</span>
                    </div>

                    <div className="bg-white p-3.5 rounded-xl border border-[#e3dec9]/60">
                      <span className="text-[9px] font-black uppercase text-[#a49f92] block tracking-wider leading-none mb-1">GPS Mapping Status</span>
                      {currentUser.location?.lat && currentUser.location?.lng ? (
                        <div className="mt-1 space-y-1">
                          <span className="inline-block bg-emerald-100 text-emerald-800 text-[8px] font-black uppercase px-2 py-0.5 rounded-md border border-emerald-200">
                            Active Coordinates Saved
                          </span>
                          <p className="text-[10px] text-stone-500 font-mono font-bold mt-1">
                            Lat: {currentUser.location.lat.toFixed(6)} | Lng: {currentUser.location.lng.toFixed(6)}
                          </p>
                        </div>
                      ) : (
                        <span className="inline-block bg-amber-100 text-amber-800 text-[8px] font-black uppercase px-2 py-0.5 rounded-md border border-amber-200 mt-1">
                          No saved GPS coordinates
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* PROFESSIONAL BILLBOARD AD CAMPAIGN CREATOR */}
        <AnimatePresence>
          {(currentUser.role === 'clinic' || currentUser.role === 'doctor') && showAdCreator && (
            <motion.div
              ref={adCreatorRef}
              initial={{ opacity: 0, height: 0, y: 15 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: 15 }}
              transition={{ duration: 0.3 }}
              className="col-span-12 mt-8 bg-amber-50/15 border border-[#e3dec9] border-b-[5px] border-b-[#cdc6ad] rounded-3xl p-6 md:p-8 shadow-md overflow-hidden"
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

            <div className="grid grid-cols-12 gap-8 mt-6">
              {/* Left Column: Form Parameters (7 Columns) */}
              <form onSubmit={handleAdSubmit} className="col-span-12 lg:col-span-7 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Sponsor Card Name Input */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-[#5a5a40]">Sponsor Display name</label>
                    <input
                      type="text"
                      value={adSponsor}
                      onChange={(e) => setAdSponsor(e.target.value)}
                      placeholder="e.g. Hope Animal Hospital"
                      className="form-control text-xs"
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
                      className="form-control text-xs"
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
                    className="form-control text-xs min-[#85px] leading-relaxed resize-none h-20"
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
                      className="form-control text-xs"
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
                      className="form-control text-xs"
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
                          adIcon === em ? 'bg-amber-105 bg-amber-100 border-amber-400 ring-2 ring-amber-200' : 'bg-white border-[#e3dec9] hover:bg-stone-50'
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
                        <span className="bg-[#f4f1e9] px-2 py-0.5 rounded text-neutral-800 font-black">1,000 RS</span>
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
                        <span className="bg-[#f4f1e9] px-2 py-0.5 rounded text-neutral-800 font-black">1,500 RS</span>
                      </div>
                    </button>
                  </div>
                </div>

                {/* BILLING DISCHARGE PANEL (only shown if they pay) */}
                {adPaymentChoice !== 'free_privilege' && (
                  <div className="bg-[#f4f1e9]/65 p-5 rounded-2xl border border-[#e3dec9] space-y-4 text-left animate-fadeIn">
                    <div className="flex items-center justify-between border-b border-[#e3dec9] pb-2">
                      <span className="text-[10px] font-black uppercase text-[#5a5a40]">🔒 Secure Ad Checkout Terminal</span>
                      <span className="font-mono text-xs font-black text-amber-900">
                        Charge: {adPaymentChoice === 'pay_7_days' ? '1,500' : '1,000'} RS
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      <div className="space-y-1">
                        <span className="text-[9px] font-black text-[#5a5a40] uppercase">Billing Cardholder Name</span>
                        <input
                          type="text"
                          placeholder="Owner Name"
                          value={adCardName}
                          onChange={(e) => setAdCardName(e.target.value)}
                          className="form-control text-xs bg-white"
                          required={adPaymentChoice !== 'free_privilege'}
                        />
                      </div>

                      <div className="space-y-1">
                        <span className="text-[9px] font-black text-[#5a5a40] uppercase">Credit Card Number</span>
                        <input
                          type="text"
                          placeholder="4123 0000 8888 9912"
                          value={adCardNumber}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '').substring(0, 16);
                            const formatted = val.match(/.{1,4}/g)?.join(' ') || val;
                            setAdCardNumber(formatted);
                          }}
                          className="form-control text-xs bg-white font-mono"
                          required={adPaymentChoice !== 'free_privilege'}
                        />
                      </div>

                      <div className="space-y-1">
                        <span className="text-[9px] font-black text-[#5a5a40] uppercase">Expiration (MM/YY)</span>
                        <input
                          type="text"
                          placeholder="12/28"
                          value={adCardExpiry}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '').substring(0, 4);
                            if (val.length >= 2) {
                              setAdCardExpiry(val.substring(0, 2) + '/' + val.substring(2));
                            } else {
                              setAdCardExpiry(val);
                            }
                          }}
                          className="form-control text-xs bg-white font-mono"
                          required={adPaymentChoice !== 'free_privilege'}
                        />
                      </div>

                      <div className="space-y-1">
                        <span className="text-[9px] font-black text-[#5a5a40] uppercase">CVV Security</span>
                        <input
                          type="password"
                          placeholder="∗∗∗"
                          maxLength={3}
                          value={adCardCvv}
                          onChange={(e) => setAdCardCvv(e.target.value.replace(/\D/g, ''))}
                          className="form-control text-xs bg-white font-mono"
                          required={adPaymentChoice !== 'free_privilege'}
                        />
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
              <div className="col-span-12 lg:col-span-5 flex flex-col justify-start space-y-4">
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
                                  <div className="font-serif font-black text-stone-850 flex items-center gap-1 leading-tight">
                                    <span>{ad.icon || '🩺'}</span> <span>{ad.title}</span>
                                  </div>
                                  <div className="text-[9px] text-[#7a766f] font-semibold flex items-center gap-2">
                                    <span className="bg-[#5a5a40]/10 text-[#5a5a40] px-1.5 py-0.5 rounded text-[8px] font-black uppercase">
                                      {ad.pricePaid === 0 ? 'Free Promo' : `Rs. ${ad.pricePaid}`}
                                    </span>
                                    <span>Expires: {new Date(ad.expiresAt).toLocaleDateString()}</span>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setDeletingAdId(ad.id)}
                                  className="bg-red-50 hover:bg-red-100 text-red-600 font-extrabold text-[10px] px-2.5 py-1.5 rounded-lg border border-red-200 transition-colors cursor-pointer shrink-0 ml-2"
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

        {/* PROFESSIONAL COMPONENT FOOTER CREDENTIALS */}
        <footer className="pt-8 pb-4 border-t border-[#e3dec9] mt-12 flex flex-col sm:flex-row items-center justify-between gap-4 text-stone-500 text-xs w-full">
          <div className="flex items-center gap-2 font-serif font-black text-[#5a5a40]">
            <span>🐾 VetAxis Pakistan</span>
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
          </div>
          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={() => {
                setLegalModalType('terms');
                setLegalModalOpen(true);
              }}
              className="font-extrabold hover:text-[#5a5a40] hover:underline bg-transparent border-none cursor-pointer transition-colors"
            >
              Terms and conditions
            </button>
            <button
              type="button"
              onClick={() => {
                setLegalModalType('about');
                setLegalModalOpen(true);
              }}
              className="font-extrabold hover:text-[#5a5a40] hover:underline bg-transparent border-none cursor-pointer transition-colors"
            >
              About Us
            </button>
          </div>
          <div className="text-[10px] font-mono uppercase tracking-wider text-neutral-400">
            Last Updated: June 2026
          </div>
        </footer>

      </div>

      {/* DETAILED INTERACTIVE BILLING CHECKOUT DRAWER OVERLAY */}
      <AnimatePresence>
        {checkoutTier && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-[9999] overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl border border-[#e3dec9] border-b-[6px] border-b-[#cdc6ad] max-w-sm w-full p-6 md:p-8 shadow-2xl relative space-y-6 text-left"
            >
              <div className="flex items-center justify-between border-b border-[#f4f1e9] pb-4">
                <div>
                  <h3 className="font-serif font-black text-lg text-[#373735] flex items-center gap-1.5">
                    <span>💳 Payment Terminal</span>
                  </h3>
                  <p className="text-[9px] uppercase font-bold text-[#a49f92] tracking-wider mt-0.5">VetAxis Premium Gate sync</p>
                </div>
                <button
                  type="button"
                  onClick={() => setCheckoutTier(null)}
                  className="p-1 px-2.5 rounded-full hover:bg-stone-100 transition-all cursor-pointer border text-stone-500 font-bold"
                >
                  ✕
                </button>
              </div>

              {/* Real-time 3D style Credit Card view */}
              <div className={`p-5 rounded-2xl text-white relative overflow-hidden shadow-lg h-40 flex flex-col justify-between border ${
                checkoutTier === 'Silver' ? 'bg-gradient-to-br from-slate-400 via-slate-500 to-slate-600 border-slate-300' :
                checkoutTier === 'Gold' ? 'bg-gradient-to-br from-amber-500 via-yellow-500 to-amber-600 border-amber-400' :
                'bg-gradient-to-br from-neutral-900 via-zinc-800 to-neutral-950 border-teal-500/30'
              }`}>
                {checkoutTier === 'Platinum' && (
                  <div className="absolute inset-0 bg-gradient-to-tr from-pink-500/10 via-teal-400/10 to-indigo-500/10 animate-pulse mix-blend-color-dodge opacity-70 pointer-events-none" />
                )}
                
                <div className="flex items-start justify-between relative z-10">
                  <span className="text-[9px] font-black uppercase tracking-widest bg-white/10 px-2 py-0.5 rounded border border-white/15">
                    {checkoutTier} MEMBER CARD
                  </span>
                  <span className="text-[#f5a623] font-mono font-black text-[9px]">VETAXIS SECURE</span>
                </div>

                <div className="text-lg md:text-xl font-mono tracking-widest text-center my-1.5 relative z-10 py-1 drop-shadow-sm select-all">
                  {cardNumber || '•••• •••• •••• ••••'}
                </div>

                <div className="flex justify-between items-end relative z-10 text-[9px] uppercase font-mono">
                  <div>
                    <span className="text-white/60 block text-[8px] tracking-wider mb-px">CARDHOLDER</span>
                    <span className="font-bold truncate max-w-[150px] block">{cardName || 'YOUR FULL NAME'}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-white/60 block text-[8px] tracking-wider mb-px">EXPIRES</span>
                    <span className="font-bold">{cardExpiry || 'MM/YY'}</span>
                  </div>
                </div>
              </div>

              {/* Checkout Form */}
              <form onSubmit={handleSubscribeSubmit} className="space-y-4">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-stone-700 block">Cardholder Name *</span>
                  <input
                    type="text"
                    className="form-control bg-stone-50 text-xs border border-stone-200"
                    placeholder="e.g. Dr. Muhammad Khan"
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value.toUpperCase())}
                    disabled={checkoutLoading}
                    maxLength={26}
                    required
                  />
                </div>

                <div className="space-y-1">
                  <span className="text-xs font-bold text-stone-700 block">Credit Card Number *</span>
                  <input
                    type="text"
                    className="form-control bg-stone-50 text-xs border border-stone-200"
                    placeholder="4000 1234 5678 9010"
                    value={cardNumber}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      let formatted = '';
                      for (let i = 0; i < val.length && i < 16; i++) {
                        if (i > 0 && i % 4 === 0) formatted += ' ';
                        formatted += val[i];
                      }
                      setCardNumber(formatted);
                    }}
                    disabled={checkoutLoading}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-stone-700 block">Expiration *</span>
                    <input
                      type="text"
                      className="form-control bg-stone-50 text-xs text-center border border-stone-200"
                      placeholder="MM/YY"
                      value={cardExpiry}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '');
                        if (val.length <= 4) {
                          let formatted = val;
                          if (val.length > 2) {
                            formatted = val.slice(0, 2) + '/' + val.slice(2);
                          }
                          setCardExpiry(formatted);
                        }
                      }}
                      disabled={checkoutLoading}
                      maxLength={5}
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <span className="text-xs font-bold text-stone-700 block">CVV Code *</span>
                    <input
                      type="password"
                      className="form-control bg-stone-50 text-xs text-center border border-stone-200"
                      placeholder="•••"
                      value={cardCvv}
                      onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 3))}
                      disabled={checkoutLoading}
                      maxLength={3}
                      required
                    />
                  </div>
                </div>

                <div className="bg-[#fcf9f2] p-3 rounded-2xl border border-[#e3dec9] text-[9px] text-stone-600 font-semibold leading-relaxed flex items-center gap-1.5">
                  <span className="text-amber-600 font-black shrink-0">🔒 Secure Bridge:</span>
                  <span>SSL encrypted clinical payment pipeline. Reverts automatically on cancellation.</span>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={checkoutLoading}
                    className="flex-grow flex-1 cursor-pointer border border-[#cdc6ad] border-b-[3px] border-b-indigo-900 bg-[#5a5a40] hover:bg-[#3e3e2b] disabled:bg-stone-300 disabled:border-stone-400 text-white text-xs font-extrabold py-2.5 rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5"
                  >
                    {checkoutLoading ? (
                      <span className="flex items-center gap-1">
                        <span className="animate-spin text-xs">⏳</span> Verifying Plan 3DS Secure…
                      </span>
                    ) : (
                      <span>Pay {checkoutTier === 'Silver' ? '2000 RS' : checkoutTier === 'Gold' ? '4000 RS' : '8000 RS'}</span>
                    )}
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setCheckoutTier(null)}
                    disabled={checkoutLoading}
                    className="btn-tactile-3d-secondary py-2.5 px-4 text-xs font-bold shrink-0"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {legalModalOpen && (
          <LegalModal
            isOpen={legalModalOpen}
            type={legalModalType}
            onClose={() => setLegalModalOpen(false)}
          />
        )}
      </AnimatePresence>

    </div>
  );
}
