import { useState, useEffect, FormEvent } from 'react';
import { UserProfile, UserRole } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { X, ShieldCheck, HeartPulse, Sparkles } from 'lucide-react';
import { LegalModal } from './LegalAndAbout';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (user: UserProfile) => void;
  authService: {
    signUp: (email: string, password: string, name: string, phone: string, role: string, extra: any) => Promise<any>;
    signIn: (email: string, password: string) => Promise<any>;
    signInWithGoogle: (roleForSignUp?: string) => Promise<any>;
    registerGoogleUser?: (pendingInfo: any, role: string, phone: string, extra: any) => Promise<any>;
  };
  promptAction?: string | null;
  onOpenAboutUs?: () => void;
}

export function AuthModal({
  isOpen,
  onClose,
  onAuthSuccess,
  authService,
  promptAction,
  onOpenAboutUs
}: AuthModalProps) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [googlePendingInfo, setGooglePendingInfo] = useState<any | null>(null);

  // Profile data inputs for first-time Google Sign Up
  const [phone, setPhone] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('doctor');
  const [expertise, setExpertise] = useState<string>('');
  const [facilities, setFacilities] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [doctorCity, setDoctorCity] = useState<string>('Islamabad');
  const [acceptedTerms, setAcceptedTerms] = useState<boolean>(false);
  const [legalModalOpen, setLegalModalOpen] = useState<boolean>(false);
  const [legalModalType, setLegalModalType] = useState<'terms' | 'about'>('terms');

  // Reset states when modal opens
  useEffect(() => {
    if (isOpen) {
      setError(null);
      setLoading(false);
      setGooglePendingInfo(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleGoogleAuth = async () => {
    setError(null);
    setLoading(true);
    try {
      const result = await authService.signInWithGoogle('doctor');
      if (result.exists) {
        onAuthSuccess(result.profile);
        onClose();
      } else {
        setGooglePendingInfo(result.pendingInfo);
        setSelectedRole('doctor');
      }
    } catch (err: any) {
      setError(err.message || 'Google Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteGoogleSignup = async (e: FormEvent) => {
    e.preventDefault();
    if (!googlePendingInfo) return;
    setError(null);

    if (!phone.trim()) {
      setError('WhatsApp or Phone number is required to receive vet consultations or inquiries.');
      return;
    }
    const phoneRe = /^[0-9+\-()\s]{10,15}$/;
    if (!phoneRe.test(phone.trim())) {
      setError('Please enter a valid phone number (e.g., 03001234567).');
      return;
    }

    setLoading(true);
    try {
      const extra: any = {};
      const pendingUid = googlePendingInfo?.uid || 'temp_gen_uid_' + Date.now();

      if (selectedRole === 'doctor' || selectedRole === 'assistant' || selectedRole === 'user') {
        extra.expertise = expertise.trim() || (
          selectedRole === 'doctor' ? 'General Practitioner' :
          selectedRole === 'assistant' ? 'Clinic Assistant' :
          'Livestock Breeder / Pet Owner'
        );
        extra.address = doctorCity.trim() || 'Islamabad';
        extra.location = {
          lat: 33.6844,
          lng: 73.0479,
          address: doctorCity.trim() || 'Islamabad'
        };
      } else if (selectedRole === 'clinic') {
        extra.facilities = facilities.trim() || 'Veterinary OPD, Pharmacy & Vaccination';
        extra.address = address.trim() || 'Commercial Area, Islamabad';
        extra.location = {
          lat: 33.6844,
          lng: 73.0479,
          address: address.trim() || 'Commercial Area, Islamabad'
        };
      }

      if (authService.registerGoogleUser) {
        const profile = await authService.registerGoogleUser(
          googlePendingInfo,
          selectedRole,
          phone.trim(),
          extra
        );
        onAuthSuccess(profile);
        onClose();
      } else {
        const profile: UserProfile = {
          uid: pendingUid,
          name: googlePendingInfo.name || 'Practitioner User',
          email: (googlePendingInfo.email || '').toLowerCase().trim(),
          phone: phone.trim(),
          role: selectedRole,
          expertise: extra.expertise,
          facilities: extra.facilities,
          address: extra.address,
          location: extra.location,
          profilePic: googlePendingInfo.profilePic || 'default',
          createdAt: Date.now(),
          isVerified: false,
          emailVerified: true
        };
        onAuthSuccess(profile);
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please check your network and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div 
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
      >
        {/* Animated backdrop container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="relative w-full max-w-lg bg-white rounded-3xl border border-[#e3dec9] border-b-[6px] border-b-[#cdc6ad] shadow-2xl p-6 sm:p-8 my-8 text-[#3c3c3b]"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors border-none bg-transparent cursor-pointer"
            aria-label="Close sign in dialog"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#fcf9f2] border border-[#e3dec9] text-3xl mb-3 shadow-xs">
              🐾
            </div>
            
            <h2 id="auth-modal-title" className="font-serif text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
              {googlePendingInfo ? 'Complete Your Profile' : 'Sign in to VetAxis 360'}
            </h2>

            {promptAction ? (
              <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold">
                <span>🔐</span>
                <span>Please {promptAction}</span>
              </div>
            ) : (
              <p className="text-xs sm:text-sm text-stone-600 font-medium mt-1.5">
                Join Pakistan's leading veterinary network to post, connect with doctors, and access clinical tools.
              </p>
            )}
          </div>

          {/* Error Message */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="p-3.5 mb-5 bg-red-50 border border-red-200 border-b-[3px] border-b-red-300 text-red-800 text-xs font-bold rounded-xl flex items-center gap-2"
              >
                <span>⚠️ {error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {googlePendingInfo ? (
            /* ONBOARDING FLOW ON GOOGLE REGISTRATION */
            <form onSubmit={handleCompleteGoogleSignup} className="space-y-4">
              <div className="bg-[#fcf9f2] border border-[#e3dec9] p-3.5 rounded-2xl flex items-center gap-3">
                <img
                  src={googlePendingInfo.profilePic === 'default' ? 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150' : googlePendingInfo.profilePic}
                  alt={googlePendingInfo.name}
                  className="w-10 h-10 rounded-xl border object-cover shadow-sm"
                  referrerPolicy="no-referrer"
                />
                <div className="text-left flex-1 min-w-0">
                  <h4 className="text-xs font-black text-stone-800 truncate">{googlePendingInfo.name}</h4>
                  <p className="text-[11px] font-mono text-stone-500 truncate">{googlePendingInfo.email}</p>
                </div>
              </div>

              {/* Role Selection */}
              <div>
                <label className="text-[11px] uppercase font-extrabold text-[#5a5a40] tracking-wider mb-1.5 block text-left">
                  Choose Your Account Type *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'doctor', icon: '🩺', title: 'Doctor (DVM)', desc: 'Licensed practitioner' },
                    { id: 'clinic', icon: '🏥', title: 'Clinic / Hospital', desc: 'Facility manager' },
                    { id: 'user', icon: '👨‍🌾', title: 'Pet Owner / Farmer', desc: 'Breeder or pet parent' },
                    { id: 'assistant', icon: '🧑‍⚕️', title: 'Vet Assistant', desc: 'Technician / staff' }
                  ].map((roleOpt) => {
                    const isSelected = selectedRole === roleOpt.id;
                    return (
                      <button
                        key={roleOpt.id}
                        type="button"
                        onClick={() => setSelectedRole(roleOpt.id as UserRole)}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2 ${
                          isSelected
                            ? 'border-[#5a5a40] border-b-[3px] border-b-[#3e3e2b] bg-[#fcf9f2] font-bold shadow-xs'
                            : 'border-[#e3dec9] border-b-[2px] bg-white hover:bg-[#fcf9f2]/50'
                        }`}
                      >
                        <span className="text-lg">{roleOpt.icon}</span>
                        <div className="min-w-0">
                          <p className="text-xs font-extrabold text-stone-800 leading-tight">{roleOpt.title}</p>
                          <p className="text-[9px] text-stone-500 truncate">{roleOpt.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Phone Input */}
              <div className="text-left">
                <label className="text-[11px] uppercase font-extrabold text-[#5a5a40] tracking-wider mb-1 block">
                  WhatsApp or Mobile Number *
                </label>
                <input
                  type="tel"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#cdc6ad] focus:outline-none focus:ring-2 focus:ring-[#5a5a40] text-xs font-sans"
                  placeholder="e.g. 03001234567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>

              {/* City or Clinic Address */}
              {selectedRole === 'clinic' ? (
                <div className="text-left">
                  <label className="text-[11px] uppercase font-extrabold text-[#5a5a40] tracking-wider mb-1 block">
                    Hospital Street Address *
                  </label>
                  <input
                    type="text"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#cdc6ad] focus:outline-none focus:ring-2 focus:ring-[#5a5a40] text-xs font-sans"
                    placeholder="Plot / Street / City"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    disabled={loading}
                    required
                  />
                </div>
              ) : (
                <div className="text-left">
                  <label className="text-[11px] uppercase font-extrabold text-[#5a5a40] tracking-wider mb-1 block">
                    City / District *
                  </label>
                  <input
                    type="text"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#cdc6ad] focus:outline-none focus:ring-2 focus:ring-[#5a5a40] text-xs font-sans"
                    placeholder="e.g. Islamabad, Lahore, Karachi, Peshawar"
                    value={doctorCity}
                    onChange={(e) => setDoctorCity(e.target.value)}
                    disabled={loading}
                    required
                  />
                </div>
              )}

              {/* Terms & Conditions Check */}
              <div className="flex items-center gap-2 bg-[#fcf9f2] p-2.5 rounded-xl border border-[#e3dec9] text-left">
                <input
                  id="modal-terms-check"
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="w-4 h-4 text-[#5a5a40] focus:ring-[#5a5a40] border-[#cdc6ad] rounded cursor-pointer"
                  disabled={loading}
                />
                <label htmlFor="modal-terms-check" className="text-xs font-semibold text-[#5a5a40] cursor-pointer select-none">
                  I accept the{' '}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setLegalModalType('terms');
                      setLegalModalOpen(true);
                    }}
                    className="text-[#a0522d] hover:text-[#5a5a40] underline font-extrabold cursor-pointer inline-block bg-transparent p-0 border-none outline-none"
                  >
                    terms and conditions
                  </button>
                </label>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading || !acceptedTerms}
                className={`w-full py-3.5 rounded-2xl bg-[#5a5a40] text-white font-extrabold text-sm border-none shadow-md hover:bg-[#3e3e2b] transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  (!acceptedTerms && !loading) ? 'opacity-60 cursor-not-allowed' : ''
                }`}
              >
                {loading ? 'Creating Profile…' : 'Complete Setup & Continue →'}
              </button>

              <button
                type="button"
                onClick={() => setGooglePendingInfo(null)}
                className="w-full text-center text-xs font-bold text-stone-500 hover:text-stone-800 py-1 transition-colors cursor-pointer bg-transparent border-none"
              >
                ✕ Switch accounts
              </button>
            </form>
          ) : (
            /* DEFAULT SIGN-IN STATE */
            <div className="space-y-4">
              <div className="p-4 bg-[#fcf9f2] border border-[#e3dec9] rounded-2xl text-left flex items-start gap-3">
                <div className="text-2xl mt-0.5">🌟</div>
                <div className="text-xs leading-relaxed text-stone-700">
                  <strong className="text-stone-900 block font-bold mb-0.5">Instant Single Sign-On</strong>
                  Sign in securely with your Google account. Pet owners, certified veterinarians, and farm managers all access the platform seamlessly.
                </div>
              </div>

              <motion.button
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleGoogleAuth}
                disabled={loading}
                className="w-full py-4 px-6 border border-[#e3dec9] border-b-[5px] border-b-[#cdc6ad] rounded-2xl hover:bg-[#fcf9f2]/80 bg-white transition-all font-black text-base text-stone-800 cursor-pointer flex items-center justify-center gap-3.5 shadow-md"
              >
                {loading ? (
                  <span className="w-5 h-5 border-2 border-[#5a5a40] border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                    <path fill="#EA4335" d="M12.24 10.285V14.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.866-3.577-7.866-8s3.536-8 7.866-8c2.46 0 4.105 1.025 5.047 1.926l3.256-3.133C18.441 1.952 15.608 1 12.24 1 5.48 1 0 6.37 0 13s5.48 12 12.24 12c7.054 0 11.77-4.907 11.77-11.83 0-.795-.085-1.4-.19-1.885H12.24z"/>
                  </svg>
                )}
                <span>{loading ? 'Connecting Google SSO…' : 'Continue with Google'}</span>
              </motion.button>

              <div className="pt-3 border-t border-[#f4f1e9] flex items-center justify-between text-[11px] text-stone-500 font-semibold px-2">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Verified &amp; Secure
                </span>
                <button
                  type="button"
                  onClick={onClose}
                  className="underline hover:text-stone-800 bg-transparent border-none cursor-pointer p-0 text-stone-500"
                >
                  Continue browsing as guest →
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>

      <AnimatePresence>
        {legalModalOpen && (
          <LegalModal
            isOpen={legalModalOpen}
            type={legalModalType}
            onClose={() => setLegalModalOpen(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
