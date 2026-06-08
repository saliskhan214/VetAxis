import { useState, ChangeEvent, FormEvent } from 'react';
import { UserProfile } from '../types';
import { AuthService } from '../lib/storage';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, User, MapPin, Mail, Sparkles, Key, AlertTriangle, Trash2, Camera, RefreshCw } from 'lucide-react';

interface ProfileProps {
  currentUser: UserProfile;
  onUpdateUser: (updated: UserProfile) => void;
  onDeleteSuccess: () => void;
}

export function ProfilePage({ currentUser, onUpdateUser, onDeleteSuccess }: ProfileProps) {
  const [editing, setEditing] = useState<boolean>(false);
  const [name, setName] = useState<string>(currentUser.name);
  const [phone, setPhone] = useState<string>(currentUser.phone || '');
  const [expertise, setExpertise] = useState<string>(currentUser.expertise || '');
  const [facilities, setFacilities] = useState<string>(currentUser.facilities || '');
  const [address, setAddress] = useState<string>(currentUser.address || '');

  // Photo uploads
  const [profilePic, setProfilePic] = useState<string>(currentUser.profilePic || 'default');

  // Subscription Checkout states
  const [checkoutTier, setCheckoutTier] = useState<'Silver' | 'Gold' | 'Platinum' | null>(null);
  const [cardName, setCardName] = useState<string>('');
  const [cardNumber, setCardNumber] = useState<string>('');
  const [cardExpiry, setCardExpiry] = useState<string>('');
  const [cardCvv, setCardCvv] = useState<string>('');
  const [checkoutLoading, setCheckoutLoading] = useState<boolean>(false);

  // Password update variables
  const [pwOpen, setPwOpen] = useState<boolean>(false);
  const [newPw, setNewPw] = useState<string>('');
  const [confPw, setConfPw] = useState<string>('');

  // Delete account variables
  const [deleteOpen, setDeleteOpen] = useState<boolean>(false);
  const [deleteCheck1, setDeleteCheck1] = useState<boolean>(false);
  const [deleteCheck2, setDeleteCheck2] = useState<boolean>(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState<string>('');

  // Status logs
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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
    if (!window.confirm('Are you absolutely sure you want to cancel your Elite VetAxis membership? Your custom styled 3D metallic card will expire immediately.')) {
      return;
    }
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      const updated = await AuthService.updateProfile(currentUser.uid, {
        subscriptionTier: undefined,
        subscriptionExpiresAt: undefined,
        isVerified: false
      });
      onUpdateUser(updated);
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

      if (currentUser.role === 'doctor') {
        payload.expertise = expertise.trim() || 'General Practitioner';
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

  const handlePasswordSave = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!newPw || !confPw) {
      setError('Please fill in both security password fields.');
      return;
    }

    if (newPw.length < 6) {
      setError('Password must compile to at least 6 characters.');
      return;
    }

    if (newPw !== confPw) {
      setError('New passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      await AuthService.changePassword(newPw);
      setNewPw('');
      setConfPw('');
      setPwOpen(false);
      triggerSuccess('✓ Password compiled and updated successfully!');
    } catch (err: any) {
      setError(err.message || 'Failed to update credentials password.');
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
              {currentUser.subscriptionTier ? `${currentUser.subscriptionTier} ` : ''} {currentUser.role === 'doctor' ? 'Practitioner' : currentUser.role === 'clinic' ? 'Hospital Centre' : 'Assistant Nurse'}
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

          <div className="border-t border-[#f4f1e9] w-full pt-5 space-y-4">
            <span className="text-[#a49f92] block font-black uppercase tracking-widest text-[9px] mb-1">VetAxis Subscription Portal</span>
            
            {currentUser.subscriptionTier ? (
              <div className="space-y-4">
                {/* Active Member Status Presentation */}
                <div className={`rounded-2xl p-4.5 text-left border relative overflow-hidden shadow-xs ${
                  currentUser.subscriptionTier === 'Silver' ? 'bg-gradient-to-br from-slate-100 to-slate-200 border-slate-300 text-slate-900 border-b-[4px] border-b-slate-400' :
                  currentUser.subscriptionTier === 'Gold' ? 'bg-gradient-to-br from-amber-50 to-yellow-105 border-amber-300 text-amber-950 border-b-[4px] border-b-amber-500' :
                  'bg-gradient-to-br from-neutral-900 to-zinc-950 border-neutral-700 text-white border-b-[4px] border-b-indigo-900'
                }`}>
                  {currentUser.subscriptionTier === 'Platinum' && (
                    <div className="absolute inset-0 bg-gradient-to-tr from-pink-500/10 via-teal-400/10 to-indigo-500/10 mix-blend-color-dodge opacity-60 pointer-events-none animate-pulse" />
                  )}

                  <div className="flex items-center gap-2 font-serif font-black text-sm">
                    <span>🏆 Elite {currentUser.subscriptionTier} Status</span>
                  </div>
                  
                  <p className={`text-[10px] uppercase font-bold mt-1.5 ${currentUser.subscriptionTier === 'Platinum' ? 'text-indigo-300' : 'text-[#7a766f]'}`}>
                    Billed at {currentUser.subscriptionTier === 'Silver' ? '2000 RS' : currentUser.subscriptionTier === 'Gold' ? '4000 RS' : '8000 RS'} / month
                  </p>

                  <div className="mt-3.5 space-y-2 border-t pt-3 border-black/5 text-[10px] font-semibold">
                    <p className="font-extrabold uppercase text-[8px] tracking-wider text-neutral-400">UNLOCKED PRIVILEGES</p>
                    <div className="flex items-start gap-1.5">
                      <span className="text-emerald-500">✓</span>
                      <span>Premium 3D customized metallic profile card style</span>
                    </div>
                    {currentUser.subscriptionTier === 'Silver' && (
                      <div className="flex items-start gap-1.5">
                        <span className="text-emerald-500">✓</span>
                        <span>Metallic Silver checkseal tags</span>
                      </div>
                    )}
                    {(currentUser.subscriptionTier === 'Gold' || currentUser.subscriptionTier === 'Platinum') && (
                      <>
                        <div className="flex items-start gap-1.5">
                          <span className="text-emerald-500">✓</span>
                          <span>Clinical Authority click-to-WhatsApp direct contact leads</span>
                        </div>
                        <div className="flex items-start gap-1.5">
                          <span className="text-emerald-500">✓</span>
                          <span>Unlimited clinic job openings & staff listings</span>
                        </div>
                      </>
                    )}
                    {currentUser.subscriptionTier === 'Platinum' && (
                      <>
                        <div className="flex items-start gap-1.5">
                          <span className="text-emerald-400">✓</span>
                          <span className="text-indigo-200">Guaranteed absolute top pin placement on local directories</span>
                        </div>
                        <div className="flex items-start gap-1.5">
                          <span className="text-emerald-400">✓</span>
                          <span className="text-indigo-200">Skip-Gate authorization checks & Fast-Track DVM verification</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Subscription management */}
                <button
                  type="button"
                  onClick={cancelSubscription}
                  className="w-full bg-red-50 hover:bg-red-100 text-red-700 hover:text-red-800 text-[9px] font-black uppercase tracking-wider py-2.5 rounded-xl border border-red-200 border-b-2 border-b-red-300 transition-all hover:shadow-xs cursor-pointer text-center"
                >
                  Cancel Active Plan 🚫
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-[10px] text-[#7a766f] font-semibold leading-relaxed">
                  Join a professional VetAxis paid tier. Transform your cards into 3D interactive masterpieces and unlock massive client acquisition leads.
                </p>

                {/* Vertical Pricing Stack */}
                <div className="space-y-3">
                  {/* SILVER CARD */}
                  <div className="bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-300 rounded-2xl p-4.5 text-left border-b-[4px] border-b-slate-400 shadow-2xs">
                    <div className="flex items-baseline justify-between">
                      <span className="font-serif font-black text-xs text-slate-800">✦ SILVER Plan</span>
                      <span className="font-mono text-xs font-black text-slate-700">2,000 RS/mo</span>
                    </div>
                    <p className="text-[9px] text-slate-600 font-semibold mt-1">Brushed steel metallic cards, promotional priorities, silver badge credentials.</p>
                    <button
                      type="button"
                      onClick={() => setCheckoutTier('Silver')}
                      className="mt-3.5 w-full bg-slate-700 hover:bg-slate-800 text-white text-[9px] font-extrabold uppercase py-2 rounded-xl transition-all border-b border-slate-900 active:translate-y-px"
                    >
                      Subscribe Silver 🥈
                    </button>
                  </div>

                  {/* GOLD CARD */}
                  <div className="bg-gradient-to-br from-amber-50 to-yellow-100 border border-amber-300 rounded-2xl p-4.5 text-left border-b-[4px] border-b-amber-500 shadow-2xs">
                    <div className="flex items-baseline justify-between">
                      <span className="font-serif font-black text-xs text-amber-950">👑 GOLD Vetted</span>
                      <span className="font-mono text-xs font-black text-amber-900">4,000 RS/mo</span>
                    </div>
                    <p className="text-[9px] text-amber-800 font-semibold mt-1">Gilded guilloche security card, click-to-WhatsApp clinical leads, unlimited job posts.</p>
                    <button
                      type="button"
                      onClick={() => setCheckoutTier('Gold')}
                      className="mt-3.5 w-full bg-amber-600 hover:bg-amber-700 text-white text-[9px] font-extrabold uppercase py-2 rounded-xl transition-all border-b border-amber-800 active:translate-y-px"
                    >
                      Subscribe Gold 👑
                    </button>
                  </div>

                  {/* PLATINUM CARD */}
                  <div className="bg-gradient-to-br from-neutral-900 via-zinc-800 to-neutral-950 border border-neutral-700 rounded-2xl p-4.5 text-left border-b-[4px] border-b-neutral-950 shadow-2xs relative overflow-hidden text-white">
                    <div className="absolute inset-0 bg-gradient-to-tr from-pink-500/5 via-teal-400/5 to-indigo-500/5 mix-blend-color-dodge opacity-60 pointer-events-none" />
                    <div className="flex items-baseline justify-between relative z-10">
                      <span className="font-serif font-black text-xs text-teal-300">💎 PLATINUM Elite</span>
                      <span className="font-mono text-xs font-black text-teal-200">8,000 RS/mo</span>
                    </div>
                    <p className="text-[9px] text-neutral-300 font-semibold mt-1 relative z-10">Obsidian holo card, absolute directory pins, Skip-Gate screenings, real-time client authority.</p>
                    <button
                      type="button"
                      onClick={() => setCheckoutTier('Platinum')}
                      className="mt-3.5 w-full bg-indigo-600 hover:bg-indigo-700 text-white text-[9px] font-extrabold uppercase py-2 rounded-xl transition-all border-b border-indigo-900 relative z-10 active:translate-y-px"
                    >
                      Subscribe Platinum 💎
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* RIGHT COLUMN DETAILS INPUTS (8 Columns) */}
        <div className="col-span-12 lg:col-span-8 bg-white border border-[#e3dec9] border-b-[5px] border-b-[#cdc6ad] rounded-3xl p-6 md:p-8 shadow-md space-y-6">
          
          <div className="flex items-center justify-between border-b border-[#f4f1e9] pb-4.5">
            <h3 className="font-serif text-lg font-black text-[#373735] flex items-center gap-2">
              <User className="w-5 h-5 text-[#5a5a40]" />
              <span>Contact Credentials</span>
            </h3>
            
            <div>
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

          <form onSubmit={handleProfileSave} className="space-y-5">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <span className="text-xs font-black uppercase text-[#5a5a40] tracking-wider">Full Display Name</span>
                <input
                  type="text"
                  className="form-control text-xs"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={!editing || loading}
                />
              </div>

              <div className="space-y-1">
                <span className="text-xs font-black uppercase text-[#5a5a40] tracking-wider">WhatsApp Contact Phone</span>
                <input
                  type="tel"
                  className="form-control text-xs"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={!editing || loading}
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

            {/* CONDITIONAL: Specialty Doctor */}
            {currentUser.role === 'doctor' && (
              <div className="space-y-1">
                <span className="text-xs font-black uppercase text-[#5a5a40] tracking-wider">Board Specialization competencies</span>
                <input
                  type="text"
                  className="form-control text-xs"
                  placeholder="e.g. Feline Care, Small Animal Orthopedic and Surgery"
                  value={expertise}
                  onChange={(e) => setExpertise(e.target.value)}
                  disabled={!editing || loading}
                />
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
                    disabled={!editing || loading}
                  />
                </div>

                <div className="space-y-1">
                  <span className="text-xs font-bold text-[#373735]">Hospital Physical Address</span>
                  <input
                    type="text"
                    className="form-control bg-white text-xs"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    disabled={!editing || loading}
                  />
                </div>
              </div>
            )}

          </form>

          {/* SECURE PASSWORD MANAGEMENT WIDGET */}
          <div className="border-t border-[#f4f1e9] pt-6 space-y-4">
            <button
              type="button"
              onClick={() => {
                setPwOpen(!pwOpen);
                setNewPw('');
                setConfPw('');
                setError(null);
              }}
              className="cursor-pointer inline-flex items-center gap-1.5 px-4 py-2 border border-[#e3dec9] border-b-[3px] text-[#373735] text-xs font-bold bg-[#fcf9f2] hover:bg-white rounded-xl transition-all"
            >
              <Key className="w-4.5 h-4.5 text-[#5a5a40]" />
              <span>Change Security Password</span>
            </button>

            <AnimatePresence>
              {pwOpen && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-[#fcf9f2] border border-[#e3dec9] border-b-[3px] rounded-3xl p-5 space-y-4 overflow-hidden"
                >
                  <h4 className="font-serif text-xs font-black text-[#5a5a40] uppercase tracking-wider">Configure New Security Password</h4>
                  
                  <form onSubmit={handlePasswordSave} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <span className="text-xs font-bold text-[#373735]">New password *</span>
                        <input
                          type="password"
                          className="form-control bg-white text-xs"
                          placeholder="Min. 6 alphanumeric chars"
                          value={newPw}
                          onChange={(e) => setNewPw(e.target.value)}
                          disabled={loading}
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="text-xs font-bold text-[#373735]">Retype new password *</span>
                        <input
                          type="password"
                          className="form-control bg-white text-xs"
                          placeholder="Repeat password"
                          value={confPw}
                          onChange={(e) => setConfPw(e.target.value)}
                          disabled={loading}
                          required
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="btn-tactile-3d-primary py-2.5 px-6 text-xs"
                    >
                      {loading ? 'Changing password…' : 'Update Credentials Password'}
                    </button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

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

        </div>

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

    </div>
  );
}
