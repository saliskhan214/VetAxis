import { useState, ChangeEvent, FormEvent, useEffect, useRef } from 'react';
import { UserProfile } from '../types';
import { AuthService, PromotionalAdsService, LocationService } from '../lib/storage';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, User, MapPin, Mail, Sparkles, AlertTriangle, Trash2, Camera, RefreshCw, Megaphone, ChevronRight } from 'lucide-react';
import { LegalModal } from './LegalAndAbout';
import { InteractiveClinicMap } from './InteractiveClinicMap';



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
  const [latitudeStr, setLatitudeStr] = useState<string>(currentUser.location?.lat ? String(currentUser.location.lat) : '');
  const [longitudeStr, setLongitudeStr] = useState<string>(currentUser.location?.lng ? String(currentUser.location.lng) : '');

  const [mapPickerOpen, setMapPickerOpen] = useState<boolean>(false);
  const [tempLat, setTempLat] = useState<number | null>(currentUser.location?.lat || null);
  const [tempLng, setTempLng] = useState<number | null>(currentUser.location?.lng || null);
  const [tempAddress, setTempAddress] = useState<string>(currentUser.location?.address || '');

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
  const [adPaymentMethod, setAdPaymentMethod] = useState<'card' | 'manual'>('manual');
  const [adManualMethod, setAdManualMethod] = useState<'Easypaisa' | 'JazzCash' | 'Nayapay' | 'Bank Transfer'>('Easypaisa');
  const [adTransactionId, setAdTransactionId] = useState<string>('');
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
      const ads = await PromotionalAdsService.fetchActiveAds(false);
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

  const maxAllowedPromo = currentUser.subscriptionTier === 'Silver' ? 3 : currentUser.subscriptionTier === 'Gold' ? 5 : currentUser.subscriptionTier === 'Platinum' ? 10 : 0;
  const remainingPromoSlots = Math.max(0, maxAllowedPromo - (currentUser.promoAdsUsed || 0));
  const hasRemainingPromo = currentUser.subscriptionTier ? (remainingPromoSlots > 0) : false;

  const handleAdSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!adTitle.trim() || !adDescription.trim() || !adSponsor.trim() || !adCtaText.trim() || !adCtaUrl.trim()) {
      setError('Please fill in all the required campaign parameters.');
      return;
    }

    const isAdFree = adPaymentChoice === 'free_privilege' || hasRemainingPromo;
    const durationDays = adPaymentChoice === 'pay_7_days' ? 7 : 3;
    const pricePaid = isAdFree ? 0 : (adPaymentChoice === 'pay_7_days' ? 1500 : 1000);

    // Validate payment credentials or transaction ID if not free
    if (!isAdFree) {
      if (adPaymentMethod === 'card') {
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
        if (!adTransactionId.trim()) {
          setError('Please enter the Transaction ID for your manual payment to submit this ad campaign.');
          return;
        }
      }
    } else {
      // Re-verify they have credits
      if (remainingPromoSlots <= 0) {
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

      const isApprovedImmediately = isAdFree || adPaymentMethod === 'card';

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
        paymentMethod: isAdFree ? 'Free Promo Credit' : (adPaymentMethod === 'card' ? 'Card' : adManualMethod),
        transactionId: isAdFree ? '' : (adPaymentMethod === 'card' ? 'CardPayment' : adTransactionId)
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
        triggerSuccess(`⚡ Congratulations! Your promotional campaign "${adTitle}" is now live on the VetAxis Billboard!`);
      } else {
        triggerSuccess(`⚡ Congratulations! Your promotional campaign "${adTitle}" and payment transaction ID "${adTransactionId}" have been successfully submitted! It will appear on the VetAxis Billboard as soon as an Admin approves it.`);
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

  const handleGetGpsLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser. Please enter coordinates manually.");
      return;
    }

    setLocationLoading(true);
    setError(null);
    setSuccess(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const latVal = latitude;
          const lngVal = longitude;
          
          setLatitudeStr(String(latVal));
          setLongitudeStr(String(lngVal));

          const updatedLocation = {
            lat: latVal,
            lng: lngVal,
            address: address.trim() || currentUser.address || 'Clinic GPS Coordinate Location'
          };

          const updatedUser = await AuthService.updateProfile(currentUser.uid, {
            location: updatedLocation
          });
          onUpdateUser(updatedUser);

          triggerSuccess(`📍 Location saved successfully with maximum accuracy! Precise GPS coordinates: Lat ${latVal.toFixed(6)}, Lng ${lngVal.toFixed(6)}.`);
        } catch (err: any) {
          setError(err.message || 'Failed to save acquired GPS coordinates.');
        } finally {
          setLocationLoading(false);
        }
      },
      (geoError) => {
        let msg = "Failed to acquire location. Please ensure you allow location permission when prompted.";
        if (geoError.code === geoError.PERMISSION_DENIED) {
          msg = "Location permission was denied. Because this app runs inside an iframe preview, browsers often block location access. Please click the 'Open in new tab' button at the top-right of the screen to give direct permission, or type the coordinates manually below!";
        } else if (geoError.code === geoError.POSITION_UNAVAILABLE) {
          msg = "Position unavailable. Please try again or enter coordinates manually below.";
        } else if (geoError.code === geoError.TIMEOUT) {
          msg = "Location request timed out. Please try again or enter coordinates manually.";
        }
        setError(msg);
        setLocationLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
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
        payload.address = doctorCity.trim() || 'Islamabad';
        
        // Prefer keeping existing saved precise location coordinates unless the user explicitly altered the practice city name.
        if (currentUser.address !== payload.address || !currentUser.location?.lat) {
          const coords = LocationService.resolveCoordinates(payload.address, currentUser.uid);
          payload.location = {
            lat: coords.lat,
            lng: coords.lng,
            address: coords.address
          };
        }
      }
      if (currentUser.role === 'clinic') {
        payload.facilities = facilities.trim() || 'General OPD';
        payload.address = address.trim();
        if (!payload.address) {
          setError('Clinic physical address is required.');
          setLoading(false);
          return;
        }

        const selectedLat = parseFloat(latitudeStr);
        const selectedLng = parseFloat(longitudeStr);

        if (!isNaN(selectedLat) && !isNaN(selectedLng)) {
          payload.location = {
            lat: selectedLat,
            lng: selectedLng,
            address: payload.address
          };
        } else {
          payload.location = null;
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
        <div className="col-span-1 lg:col-span-4 bg-white border border-[#e3dec9] border-b-[5px] border-b-[#cdc6ad] rounded-3xl p-6 shadow-md flex flex-col items-center text-center space-y-6 w-full">
          
          <div className="relative group">
            {profilePic && profilePic !== 'default' ? (
              <img
                src={profilePic}
                alt={currentUser.name}
                referrerPolicy="no-referrer"
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
        <div className="col-span-1 lg:col-span-8 bg-white border border-[#e3dec9] border-b-[5px] border-b-[#cdc6ad] rounded-3xl p-6 md:p-8 shadow-md space-y-6 w-full">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#f4f1e9] pb-4.5">
            <h3 className="font-serif text-lg font-black text-[#373735] flex items-center gap-2">
              <User className="w-5 h-5 text-[#5a5a40] shrink-0" />
              <span>Contact Credentials</span>
            </h3>
            
            <div className="flex flex-wrap items-center gap-2 justify-start sm:justify-end">
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
                      setLatitudeStr(currentUser.location?.lat ? String(currentUser.location.lat) : '');
                      setLongitudeStr(currentUser.location?.lng ? String(currentUser.location.lng) : '');
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
                        {currentUser.role === 'user' ? 'Location City / district *' : 'Practice City / Town *'}
                      </span>
                      <input
                        type="text"
                        required
                        className="form-control text-xs bg-white font-serif"
                        placeholder="e.g. Islamabad, Lahore, Multan"
                        value={doctorCity}
                        onChange={(e) => setDoctorCity(e.target.value)}
                        disabled={loading}
                      />
                    </div>
                  </div>
                )}

                {/* CONDITIONAL: Clinic Details */}
                {currentUser.role === 'clinic' && (
                  <div className="grid grid-cols-1 gap-4 bg-[#fcf9f2] p-5 rounded-2xl border border-[#e3dec9] border-b-[3px] space-y-3">
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

                    <div className="pt-3 border-t border-[#e3dec9]/40 space-y-3">
                      <span className="text-xs font-bold text-[#373735] block">📍 Precise Google Maps Pinpoint Location</span>
                      
                      {latitudeStr && longitudeStr ? (
                        <div className="bg-emerald-50 border border-emerald-200/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
                          <div className="space-y-1">
                            <span className="text-[9px] font-black uppercase text-emerald-800 tracking-wider block">Currently Pinpointed Location</span>
                            <span className="text-xs font-mono font-bold text-emerald-900 block bg-white px-2.5 py-1.5 rounded-lg border border-emerald-100 shadow-2xs">
                              Lat: {parseFloat(latitudeStr).toFixed(6)}, Lng: {parseFloat(longitudeStr).toFixed(6)}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setTempLat(parseFloat(latitudeStr) || 33.6844);
                              setTempLng(parseFloat(longitudeStr) || 73.0479);
                              setMapPickerOpen(true);
                            }}
                            className="cursor-pointer border border-emerald-300 border-b-[3px] border-b-emerald-800 bg-emerald-100 hover:bg-emerald-150 text-emerald-950 text-2xs font-extrabold py-2 px-4 rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 shrink-0"
                          >
                            🗺️ Change Location Pin
                          </button>
                        </div>
                      ) : (
                        <div className="bg-stone-50 border border-[#e3dec9] rounded-2xl p-5 text-center space-y-3 shadow-inner">
                          <p className="text-2xs text-[#7a766f] font-semibold leading-relaxed max-w-md mx-auto">
                            No map location is currently saved. Add your clinic's precise location pinpoint on Google Maps so pet owners and veterinary doctors can navigate directly to your facility!
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setTempLat(33.6844); // default Islamabad
                              setTempLng(73.0479);
                              setMapPickerOpen(true);
                            }}
                            className="cursor-pointer border border-[#cdc6ad] border-b-[3px] border-b-amber-900 bg-amber-150 hover:bg-amber-200 text-amber-950 font-black px-5 py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 mx-auto transition-all shadow-sm"
                          >
                            📍 Add Exact Map Pinpoint Location
                          </button>
                        </div>
                      )}
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

                    {currentUser.location?.lat && currentUser.location?.lng && (
                      <div className="space-y-3">
                        <div className="bg-emerald-50/50 p-3.5 rounded-xl border border-emerald-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="space-y-0.5 text-left">
                            <span className="text-[9px] font-black uppercase text-emerald-800 block tracking-wider leading-none mb-1">📍 Saved GPS Location</span>
                            <span className="text-xs font-mono font-bold text-emerald-900 block">
                              Lat: {currentUser.location.lat.toFixed(6)}, Lng: {currentUser.location.lng.toFixed(6)}
                            </span>
                          </div>
                          <a
                            href={`https://www.google.com/maps?q=${currentUser.location.lat},${currentUser.location.lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="cursor-pointer border border-emerald-300 border-b-[3px] border-b-emerald-800 bg-emerald-100 hover:bg-emerald-200 text-emerald-950 text-2xs font-extrabold py-2 px-3 rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 w-full sm:w-auto text-center shrink-0"
                          >
                            🗺️ Show on Google Maps
                          </a>
                        </div>

                        {/* Live Google Map preview */}
                        <div className="border border-[#e3dec9] rounded-2xl overflow-hidden shadow-sm bg-white">
                          <InteractiveClinicMap
                            lat={currentUser.location.lat}
                            lng={currentUser.location.lng}
                            interactive={false}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* PROFESSIONAL COMPONENT FOOTER CREDENTIALS */}
        <footer className="pt-8 pb-4 border-t border-[#e3dec9] mt-12 flex flex-col md:flex-row items-center justify-between gap-6 text-stone-500 text-xs w-full px-4 sm:px-6">
          <div className="flex items-center gap-2 font-serif font-black text-[#5a5a40] select-none shrink-0">
            <span>🐾 VetAxis 360 Pakistan</span>
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shrink-0"></span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            <button
              type="button"
              onClick={() => {
                setLegalModalType('terms');
                setLegalModalOpen(true);
              }}
              className="font-extrabold hover:text-[#5a5a40] hover:underline bg-transparent border-none cursor-pointer transition-colors whitespace-nowrap"
            >
              Terms and conditions
            </button>
            <button
              type="button"
              onClick={() => {
                setLegalModalType('about');
                setLegalModalOpen(true);
              }}
              className="font-extrabold hover:text-[#5a5a40] hover:underline bg-transparent border-none cursor-pointer transition-colors whitespace-nowrap"
            >
              About Us
            </button>
          </div>
          <div className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 whitespace-nowrap shrink-0">
            Last Updated: June 2026
          </div>
        </footer>

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

      {/* Google Maps Pinpoint Selection Modal */}
      <AnimatePresence>
        {mapPickerOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#fcfaf2] rounded-3xl border border-[#e3dec9] border-b-[5px] border-b-[#cdc6ad] w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] text-left"
            >
              {/* Header */}
              <div className="p-5 border-b border-[#e3dec9]/60 flex items-center justify-between bg-stone-50">
                <div>
                  <h3 className="font-serif font-black text-lg text-[#373735] flex items-center gap-2">
                    <span>🗺️ Pinpoint Clinic on Google Maps</span>
                  </h3>
                  <p className="text-[11px] text-[#7a766f] font-semibold mt-0.5">
                    Search your clinical area or tap/click directly on the map to add your marker.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setMapPickerOpen(false)}
                  className="p-1 px-2.5 rounded-full hover:bg-stone-100 transition-all cursor-pointer border text-stone-500 font-bold bg-white"
                >
                  ✕
                </button>
              </div>

              {/* Map Canvas & Controls */}
              <div className="p-5 flex-1 overflow-y-auto space-y-4">
                <div className="bg-amber-50 p-3 rounded-2xl border border-amber-200/50 text-[11px] font-semibold text-stone-700 leading-relaxed flex items-center gap-2">
                  <span className="text-amber-800 text-sm animate-bounce shrink-0">📍</span>
                  <span>
                    <strong>Instruction:</strong> Tap or click anywhere on the Google Map grid below to place your precise pinpoint marker. You can also search your neighborhood first.
                  </span>
                </div>

                <div className="h-[320px] rounded-2xl overflow-hidden border border-[#e3dec9]">
                  <InteractiveClinicMap
                    lat={tempLat || undefined}
                    lng={tempLng || undefined}
                    cityName={address || 'Islamabad'}
                    interactive={true}
                    onLocationSelect={(latVal, lngVal, resolvedAddr) => {
                      setTempLat(latVal);
                      setTempLng(lngVal);
                      if (resolvedAddr) {
                        setTempAddress(resolvedAddr);
                      }
                    }}
                  />
                </div>

                {/* Selected coordinates preview */}
                <div className="bg-white p-3.5 rounded-2xl border border-[#e3dec9] grid grid-cols-1 sm:grid-cols-2 gap-3.5 shadow-inner">
                  <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase text-[#a49f92] block tracking-wider">Tapped Coordinates</span>
                    <span className="text-xs font-mono font-bold text-stone-700 block">
                      {tempLat && tempLng ? (
                        <>Lat: {tempLat.toFixed(6)}, Lng: {tempLng.toFixed(6)}</>
                      ) : (
                        <em className="text-stone-400">No pinpoint placed yet</em>
                      )}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase text-[#a49f92] block tracking-wider">Resolved Address Info</span>
                    <span className="text-xs font-bold text-[#5a5a40] block truncate">
                      {tempAddress || address || 'No address details yet'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="p-5 border-t border-[#e3dec9]/60 bg-stone-50 flex gap-3">
                <button
                  type="button"
                  disabled={!tempLat || !tempLng}
                  onClick={() => {
                    if (tempLat && tempLng) {
                      setLatitudeStr(String(tempLat));
                      setLongitudeStr(String(tempLng));
                      if (tempAddress) {
                        setAddress(tempAddress);
                      }
                      setMapPickerOpen(false);
                    }
                  }}
                  className="flex-grow flex-1 cursor-pointer border border-[#cdc6ad] border-b-[3px] border-b-emerald-900 bg-emerald-700 hover:bg-emerald-800 disabled:bg-stone-200 disabled:border-stone-300 disabled:text-stone-400 text-white text-xs font-extrabold py-2.5 rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5"
                >
                  <span>Confirm & Use This Location</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMapPickerOpen(false)}
                  className="btn-tactile-3d-secondary py-2.5 px-5 text-xs font-bold shrink-0 bg-white"
                >
                  Cancel
                </button>
              </div>
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
