import { useState, useEffect, FormEvent } from 'react';
import { UserRole } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, CheckCircle2, ShieldCheck, HeartPulse, ShoppingBag, Landmark, X } from 'lucide-react';
import { LegalModal } from './LegalAndAbout';
import { LocationService } from '../lib/storage';

interface AuthScreenProps {
  onAuthSuccess: (user: any) => void;
  authService: {
    signUp: (email: string, password: string, name: string, phone: string, role: string, extra: any) => Promise<any>;
    signIn: (email: string, password: string) => Promise<any>;
    signInWithGoogle: (roleForSignUp?: string) => Promise<any>;
    registerGoogleUser?: (pendingInfo: any, role: string, phone: string, extra: any) => Promise<any>;
  };
  onOpenAboutUs?: () => void;
  onClose?: () => void;
  reasonMessage?: string;
  isModal?: boolean;
}

export function AuthScreen({ onAuthSuccess, authService, onOpenAboutUs, onClose, reasonMessage, isModal }: AuthScreenProps) {
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

  // Automatically scroll screen to top/start of popup when legal modal opens
  useEffect(() => {
    if (legalModalOpen) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [legalModalOpen]);

  // Listen for Escape key when inside modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };
    if (isModal) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isModal, onClose]);

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

  const handleGoogleAuth = async () => {
    setError(null);
    setLoading(true);
    try {
      const result = await authService.signInWithGoogle('doctor');
      if (result.exists) {
        onAuthSuccess(result.profile);
      } else {
        setGooglePendingInfo(result.pendingInfo);
        setSelectedRole('doctor'); // default to doctor on onboarding start
      }
    } catch (err: any) {
      setError(err.message || 'Google Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteGoogleSignup = async (e: FormEvent) => {
    e.preventDefault();
    if (!googlePendingInfo) return;
    setError(null);

    if (!phone.trim()) {
      setError('WhatsApp or Phone number is required to receive vet consultations.');
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
        const coords = LocationService.resolveCoordinates(extra.address, pendingUid);
        extra.location = {
          lat: coords.lat,
          lng: coords.lng,
          address: coords.address
        };
      }
      if (selectedRole === 'clinic') {
        extra.facilities = facilities.trim() || 'General Diagnostics & OPD';
        extra.address = address.trim();
        if (!extra.address) {
          setError('Clinic address is required.');
          setLoading(false);
          return;
        }
        const coords = LocationService.resolveCoordinates(extra.address, pendingUid);
        extra.location = {
          lat: coords.lat,
          lng: coords.lng,
          address: coords.address
        };
      }

      if (authService.registerGoogleUser) {
        const user = await authService.registerGoogleUser(
          googlePendingInfo,
          selectedRole,
          phone,
          extra
        );
        onAuthSuccess(user);
      } else {
        throw new Error('Google user registration provider is not configured properly.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to complete role registration. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const services = [
    { text: 'Consult with licensed expert Pakistani veterinarians.', icon: <HeartPulse className="w-5 h-5 text-emerald-600" /> },
    { text: 'Verify animal clinics & diagnostic facilities.', icon: <ShieldCheck className="w-5 h-5 text-emerald-600" /> },
    { text: 'Order authenticated veterinary medicine & supplies.', icon: <ShoppingBag className="w-5 h-5 text-emerald-600" /> },
    { text: 'Participate in the nationwide pet classified forum.', icon: <Sparkles className="w-5 h-5 text-emerald-600" /> },
  ];

  if (isModal) {
    return (
      <div className="w-full bg-[#fdfbf7] rounded-3xl p-6 sm:p-8 border border-[#e3dec9] border-b-[6px] border-b-[#cdc6ad] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3)] relative overflow-hidden text-left">
        {/* Subtle decorative background glow */}
        <div className="absolute -top-20 -right-20 w-44 h-44 rounded-full bg-amber-100/40 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-44 h-44 rounded-full bg-emerald-100/30 blur-2xl pointer-events-none" />

        {/* Close Button */}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-full bg-white hover:bg-[#f4efe4] text-[#7a766f] hover:text-[#3c3c3b] transition-all cursor-pointer border border-[#e3dec9] shadow-xs z-20"
            title="Close and continue as guest"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Brand Header */}
        <div className="relative z-10 flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-2xl bg-[#5a5a40] text-white flex items-center justify-center text-xl shadow-sm border border-[#3e3e2b]">
            🐾
          </div>
          <div>
            <div className="font-serif text-xl font-black text-[#373735] tracking-tight leading-none">
              Vet<span className="text-[#a0522d]">Axis</span>
            </div>
            <p className="text-[10px] text-[#7a766f] font-bold uppercase tracking-wider mt-0.5">
              Pakistan's Clinical Network
            </p>
          </div>
        </div>

        {/* Reason Message Banner */}
        {reasonMessage && (
          <div className="relative z-10 mb-5 p-3.5 rounded-2xl bg-amber-50/90 border border-amber-300 border-b-[3px] border-b-amber-400 text-amber-900 text-xs flex items-start gap-3 shadow-xs">
            <span className="text-base leading-none select-none mt-0.5">🔒</span>
            <div className="flex-1">
              <p className="font-extrabold uppercase text-[10px] tracking-wider text-amber-800">Account Required</p>
              <p className="mt-0.5 font-medium text-stone-800 leading-snug">{reasonMessage}</p>
            </div>
          </div>
        )}

        {/* Error Notification */}
        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: -6 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              className="relative z-10 p-3.5 mb-4 bg-red-50 border border-red-200 border-b-[3px] border-b-red-300 text-red-800 text-xs font-bold rounded-xl flex items-center gap-2"
            >
              <span>⚠️ {error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Dynamic Content: Registration flow or Initial Sign-In */}
        {googlePendingInfo ? (
          <form onSubmit={handleCompleteGoogleSignup} className="relative z-10 space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            <div className="mb-2">
              <h2 className="font-serif text-xl font-bold text-[#373735] tracking-tight">Complete Account Setup</h2>
              <p className="text-xs text-[#7a766f] font-medium mt-0.5">
                Designate your professional role to finalize your VetAxis profile.
              </p>
            </div>

            {/* Google Profile Header */}
            <div className="bg-white border border-[#e3dec9] p-3 rounded-2xl flex items-center gap-3">
              <img
                src={googlePendingInfo.profilePic === 'default' ? 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150' : googlePendingInfo.profilePic}
                alt="avatar"
                className="w-10 h-10 rounded-xl border border-stone-200 object-cover shadow-xs"
                referrerPolicy="no-referrer"
              />
              <div className="min-w-0 flex-1">
                <div className="text-xs font-black text-[#373735] truncate flex items-center gap-1.5">
                  {googlePendingInfo.name}
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                </div>
                <p className="text-[11px] text-[#a49f92] truncate">{googlePendingInfo.email}</p>
              </div>
            </div>

            {/* WhatsApp or Mobile */}
            <div>
              <label className="text-[10px] uppercase font-extrabold text-[#5a5a40] tracking-wider mb-1 block">
                WhatsApp or Mobile *
              </label>
              <input
                type="tel"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#e3dec9] bg-white text-sm text-[#373735] focus:outline-none focus:border-[#5a5a40] focus:ring-1 focus:ring-[#5a5a40]"
                placeholder="e.g. 03001234567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={loading}
                required
              />
              <span className="text-[10px] text-[#a49f92] block mt-1">Used for emergency consultations and appointment updates</span>
            </div>

            {/* Role designation */}
            <div>
              <label className="text-[10px] uppercase font-extrabold text-[#5a5a40] tracking-wider mb-1.5 block">
                Select Your Role *
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'doctor', icon: '🩺', title: 'Doctor', desc: 'Licensed DVM' },
                  { id: 'clinic', icon: '🏥', title: 'Clinic Facility', desc: 'Animal hospital' },
                  { id: 'user', icon: '👨‍🌾', title: 'General User', desc: 'Farmer / Pet Owner' },
                  { id: 'assistant', icon: '🧑‍⚕️', title: 'Assistant', desc: 'Clinical tech' }
                ].map((roleOpt) => {
                  const isSelected = selectedRole === roleOpt.id;
                  return (
                    <button
                      key={roleOpt.id}
                      type="button"
                      onClick={() => setSelectedRole(roleOpt.id as UserRole)}
                      className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                        isSelected
                          ? 'border-[#5a5a40] border-b-[3px] border-b-[#3e3e2b] bg-white font-bold shadow-xs'
                          : 'border-[#e3dec9] bg-stone-50/50 hover:bg-white'
                      }`}
                    >
                      <span className="text-base mb-0.5">{roleOpt.icon}</span>
                      <span className="text-xs font-bold text-[#373735]">{roleOpt.title}</span>
                      <span className="text-[9px] text-[#a49f92]">{roleOpt.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Role specifics */}
            {(selectedRole === 'doctor' || selectedRole === 'assistant') && (
              <div className="p-3 bg-white border border-[#e3dec9] rounded-xl space-y-3">
                <div>
                  <label className="text-[10px] uppercase font-extrabold text-[#5a5a40] tracking-wider mb-1 block">
                    {selectedRole === 'doctor' ? 'Specialization' : 'Technician Expertise'}
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 rounded-lg border border-[#e3dec9] bg-[#fdfbf7] text-xs text-[#373735]"
                    placeholder={selectedRole === 'doctor' ? "e.g. Small Animals, Equine, Surgery" : "e.g. Wound dressing, vaccinations"}
                    value={expertise}
                    onChange={(e) => setExpertise(e.target.value)}
                    disabled={loading}
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-extrabold text-[#5a5a40] tracking-wider mb-1 block">Practice City *</label>
                  <input
                    type="text"
                    required
                    className="w-full px-3 py-2 rounded-lg border border-[#e3dec9] bg-[#fdfbf7] text-xs text-[#373735]"
                    placeholder="e.g. Islamabad, Lahore, Karachi"
                    value={doctorCity}
                    onChange={(e) => setDoctorCity(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>
            )}

            {selectedRole === 'user' && (
              <div className="p-3 bg-white border border-[#e3dec9] rounded-xl space-y-3">
                <div>
                  <label className="text-[10px] uppercase font-extrabold text-[#5a5a40] tracking-wider mb-1 block">Primary Animal Focus</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 rounded-lg border border-[#e3dec9] bg-[#fdfbf7] text-xs text-[#373735]"
                    placeholder="e.g. Dairy Cattle, Goats, Cats, Dogs"
                    value={expertise}
                    onChange={(e) => setExpertise(e.target.value)}
                    disabled={loading}
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-extrabold text-[#5a5a40] tracking-wider mb-1 block">City / District *</label>
                  <input
                    type="text"
                    required
                    className="w-full px-3 py-2 rounded-lg border border-[#e3dec9] bg-[#fdfbf7] text-xs text-[#373735]"
                    placeholder="e.g. Multan, Rawalpindi, Peshawar"
                    value={doctorCity}
                    onChange={(e) => setDoctorCity(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>
            )}

            {selectedRole === 'clinic' && (
              <div className="p-3 bg-white border border-[#e3dec9] rounded-xl space-y-3">
                <div>
                  <label className="text-[10px] uppercase font-extrabold text-[#5a5a40] tracking-wider mb-1 block">Facilities</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 rounded-lg border border-[#e3dec9] bg-[#fdfbf7] text-xs text-[#373735]"
                    placeholder="e.g. Surgery, Ultrasound, OPD, Pharmacy"
                    value={facilities}
                    onChange={(e) => setFacilities(e.target.value)}
                    disabled={loading}
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-extrabold text-[#5a5a40] tracking-wider mb-1 block">Hospital Street Address *</label>
                  <input
                    type="text"
                    required
                    className="w-full px-3 py-2 rounded-lg border border-[#e3dec9] bg-[#fdfbf7] text-xs text-[#373735]"
                    placeholder="Street, Sector, City"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>
            )}

            {/* Terms checkbox */}
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-white border border-[#e3dec9] text-xs">
              <input
                id="signup-terms-modal"
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="w-4 h-4 text-[#5a5a40] border-[#cdc6ad] rounded cursor-pointer"
                disabled={loading}
              />
              <label htmlFor="signup-terms-modal" className="cursor-pointer text-[#5a5a40] font-medium">
                I accept the{' '}
                <button
                  type="button"
                  onClick={() => {
                    setLegalModalType('terms');
                    setLegalModalOpen(true);
                  }}
                  className="text-[#a0522d] underline font-bold bg-transparent border-none p-0 cursor-pointer"
                >
                  Terms & Conditions
                </button>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading || !acceptedTerms}
              className={`btn-tactile-3d-primary w-full py-3.5 text-sm tracking-wide flex items-center justify-center gap-2 mt-2 ${
                (!acceptedTerms && !loading) ? 'opacity-60 cursor-not-allowed border-b-[2px]' : ''
              }`}
            >
              {loading ? 'Creating VetAxis profile…' : 'Complete Registration & Enter →'}
            </button>

            <button
              type="button"
              onClick={() => setGooglePendingInfo(null)}
              className="w-full text-center text-xs font-semibold text-[#7a766f] hover:text-[#3c3c3b] py-1 cursor-pointer bg-transparent border-none"
            >
              ✕ Switch account
            </button>
          </form>
        ) : (
          /* Initial Sign-In View */
          <div className="relative z-10 space-y-5">
            <div>
              <h2 className="font-serif text-2xl font-black text-[#373735] tracking-tight">
                Sign In to Continue
              </h2>
              <p className="text-xs text-[#7a766f] font-medium leading-relaxed mt-1">
                Access verified veterinary profiles, direct consultations, classified ads, and clinical management.
              </p>
            </div>

            {/* Quick Benefits */}
            <div className="space-y-2 bg-white/80 p-3.5 rounded-2xl border border-[#e3dec9]">
              <div className="flex items-center gap-2.5 text-xs text-[#5a5a40] font-medium">
                <HeartPulse className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Chat & book appointments with verified Pakistani vets</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-[#5a5a40] font-medium">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Manage livestock herds, tags & vaccination histories</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-[#5a5a40] font-medium">
                <ShoppingBag className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Post pet classifieds & veterinary marketplace supplies</span>
              </div>
            </div>

            {/* Google Button */}
            <motion.button
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleGoogleAuth}
              disabled={loading}
              className="w-full py-3.5 px-4 border-2 border-[#e3dec9] border-b-[5px] border-b-[#cdc6ad] active:border-b-2 active:translate-y-[2px] rounded-2xl hover:bg-[#fcf9f2] bg-white transition-all font-black text-base text-[#373735] cursor-pointer flex items-center justify-center gap-3 shadow-md"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-[#5a5a40] border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                  <path fill="#EA4335" d="M12.24 10.285V14.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.866-3.577-7.866-8s3.536-8 7.866-8c2.46 0 4.105 1.025 5.047 1.926l3.256-3.133C18.441 1.952 15.608 1 12.24 1 5.48 1 0 6.37 0 13s5.48 12 12.24 12c7.054 0 11.77-4.907 11.77-11.83 0-.795-.085-1.4-.19-1.885H12.24z"/>
                </svg>
              )}
              <span>{loading ? 'Connecting to Google…' : 'Continue with Google'}</span>
            </motion.button>

            {/* Modal actions */}
            <div className="flex items-center justify-between text-xs pt-3 border-t border-[#e3dec9]/80">
              <button
                type="button"
                onClick={() => {
                  if (onClose) onClose();
                }}
                className="text-[#7a766f] hover:text-[#3c3c3b] font-semibold transition-colors cursor-pointer bg-transparent border-none p-0"
              >
                ← Continue Browsing as Guest
              </button>

              {onOpenAboutUs && (
                <button
                  type="button"
                  onClick={onOpenAboutUs}
                  className="text-[#a0522d] hover:underline font-bold transition-colors cursor-pointer bg-transparent border-none p-0"
                >
                  Learn More
                </button>
              )}
            </div>

            <p className="text-[11px] text-[#a49f92] text-center">
              By proceeding, you agree to VetAxis{' '}
              <button
                type="button"
                onClick={() => {
                  setLegalModalType('terms');
                  setLegalModalOpen(true);
                }}
                className="underline text-[#7a766f] hover:text-[#3c3c3b] font-medium bg-transparent border-none p-0 cursor-pointer"
              >
                Terms of Service
              </button>{' '}
              and{' '}
              <button
                type="button"
                onClick={() => {
                  setLegalModalType('about');
                  setLegalModalOpen(true);
                }}
                className="underline text-[#7a766f] hover:text-[#3c3c3b] font-medium bg-transparent border-none p-0 cursor-pointer"
              >
                Privacy Policy
              </button>.
            </p>
          </div>
        )}

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

  return (
    <div className="auth-page min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-[#fcf9f2] selection:bg-[#5a5a40] selection:text-white overflow-hidden relative">
      
      {/* BACKGROUND GRAPHIC ORBS */}
      <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-emerald-100/30 filter blur-3xl" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[45vw] h-[45vw] rounded-full bg-amber-100/20 filter blur-3xl" />

      {/* LEFT PORTRAIT SLATED INFOGRAPH - 5 Columns */}
      <div className="hidden lg:flex col-span-5 flex-col justify-between p-12 bg-gradient-to-br from-[#3e3e2b] via-[#5a5a40] to-[#7c7c5a] text-white relative z-10 overflow-hidden border-r-[6px] border-r-[#3c3c2b] shadow-[10px_0_30px_rgba(0,0,0,0.15)]">
        {/* Abstract pattern panel */}
        <div className="absolute inset-0 opacity-15 mix-blend-overlay bg-[radial-gradient(#ffffff_2px,transparent_2px)] [background-size:16px_16px]" />
        
        <div className="relative z-10 space-y-1">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex items-center gap-3 font-serif text-3xl font-bold tracking-tight select-none"
          >
            <span className="text-3xl filter drop-shadow-[0_4px_6px_rgba(0,0,0,0.2)]">🐾</span> Vet<span className="text-amber-400">Axis</span>
          </motion.div>
          <p className="text-neutral-300 font-medium font-sans text-sm tracking-wide">
            Pakistan's Premier Veterinary Clinical Network
          </p>
        </div>

        {/* Feature Cards Showcase */}
        <div className="relative z-10 my-auto space-y-5">
          <p className="text-xs font-bold uppercase tracking-widest text-amber-300">Features & Infrastructure</p>
          {services.map((svc, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.15, type: 'spring', stiffness: 100 }}
              className="flex items-start gap-4 p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)]"
            >
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shrink-0 shadow-md">
                {svc.icon}
              </div>
              <span className="text-sm font-semibold leading-relaxed font-sans text-neutral-100">{svc.text}</span>
            </motion.div>
          ))}
        </div>

        {/* Tactical Footer Badge */}
        <div className="relative z-10 bg-white/10 border border-white/20 p-4 rounded-2xl flex items-center gap-4 shadow-inner">
          <span className="text-3xl bg-white/20 p-2 rounded-xl filter drop-shadow-md">🇵🇰</span>
          <div>
            <p className="text-xs font-bold text-neutral-100">Nationwide Clinical Register</p>
            <p className="text-[10px] text-neutral-300 font-semibold uppercase tracking-wider">Karachi · Lahore · Islamabad · Peshawar · Quetta</p>
          </div>
        </div>
      </div>

      {/* RIGHT REGISTRATION FORM - 7 Columns */}
      <div className="col-span-1 lg:col-span-7 flex flex-col justify-center items-center p-6 md:p-12 relative z-10 overflow-y-auto w-full">
        
        {/* Brand Head for Mobile Views only */}
        <div className="lg:hidden text-center mb-8">
          <div className="font-serif text-4xl font-extrabold text-[#5a5a40]">
            🐾 Vet<span className="text-[#a0522d]">Axis</span>
          </div>
          <p className="text-xs uppercase tracking-wider font-bold text-[#7a766f] mt-1">Pakistan's Premium Clinical Platform</p>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 30, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, type: 'spring', stiffness: 120 }}
          className="w-full max-w-[540px] bg-white rounded-3xl p-8 md:p-12 border border-[#e3dec9] border-b-[6px] border-b-[#cdc6ad] shadow-[0_24px_50px_-15px_rgba(90,90,64,0.18)] relative"
        >
          {/* Optional Modal Close Button */}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="absolute top-5 right-5 p-2 rounded-full bg-[#fdfbf7] hover:bg-[#f4efe4] text-[#7a766f] hover:text-[#3c3c3b] transition-all cursor-pointer border border-[#e3dec9] shadow-xs z-20"
              title="Close and continue browsing as guest"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          {/* Prompt banner when auth was required for a specific change/action */}
          {reasonMessage && (
            <div className="mb-6 p-4 rounded-2xl bg-amber-50/90 border border-amber-300 border-b-[3px] border-b-amber-400 text-amber-900 text-xs font-bold flex items-start gap-3 shadow-xs">
              <span className="text-xl leading-none select-none">🔒</span>
              <div className="flex-1 text-left">
                <p className="font-extrabold uppercase text-[10px] tracking-wider text-amber-800">Account Required</p>
                <p className="mt-0.5 font-semibold text-stone-800 leading-snug">{reasonMessage}</p>
              </div>
            </div>
          )}

          <div className="mb-8 text-center md:text-left">
            <h1 className="font-serif text-3xl font-black text-[#373735] tracking-tight leading-none mb-2">
              {googlePendingInfo ? 'Complete Account Setup' : 'Access VetAxis'}
            </h1>
            <p className="text-sm text-[#7a766f] font-medium leading-relaxed">
              {googlePendingInfo 
                ? 'Almost there! Setup your professional role and clinical credentials to finalize.' 
                : 'Sign up or log in securely with standard Google Credentials.'}
            </p>
          </div>

          <AnimatePresence mode="wait">
            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0, y: -10 }}
                animate={{ opacity: 1, height: 'auto', y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                className="p-4 mb-6 bg-red-50 border border-red-200 border-b-[3px] border-b-red-300 text-red-800 text-xs font-bold rounded-xl flex items-center gap-2"
              >
                <span>⚠️ {error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {googlePendingInfo ? (
            /* ONBOARDING FLOW ON GOOGLE USER REGISTRATION */
            <form onSubmit={handleCompleteGoogleSignup} className="space-y-5 animate-scaleUp">
              
              <div className="bg-[#fcf9f2] border border-[#e3dec9] p-4 rounded-2xl flex items-center gap-4 transition-all hover:bg-white hover:shadow-inner mb-4">
                <img 
                  src={googlePendingInfo.profilePic === 'default' ? 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150' : googlePendingInfo.profilePic} 
                  alt="avatar" 
                  className="w-12 h-12 rounded-xl border-2 border-white object-cover shadow-md" 
                  referrerPolicy="no-referrer" 
                />
                <div>
                  <h4 className="text-sm font-black text-[#373735] leading-tight flex items-center gap-1.5">
                    {googlePendingInfo.name} 
                    <span className="inline-flex w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                  </h4>
                  <p className="text-xs font-mono text-[#a49f92] mt-0.5">{googlePendingInfo.email}</p>
                </div>
              </div>

              {/* PHONE INPUT */}
              <div className="space-y-1">
                <label className="text-xs uppercase font-extrabold text-[#5a5a40] tracking-wider mb-1 block">WhatsApp or Mobile *</label>
                <input
                  type="tel"
                  className="form-control"
                  placeholder="e.g., 03001234567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={loading}
                  required
                />
                <span className="text-[10px] text-[#a49f92] font-semibold block pt-0.5">Used exclusively for emergency clinical appointments or marketplace inquiries</span>
              </div>

              {/* ROLE PICKER GRID */}
              <div className="space-y-2">
                <label className="text-xs uppercase font-extrabold text-[#5a5a40] tracking-wider mb-1 block">Designate Your Platform Role *</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'doctor', icon: '🩺', title: 'Doctor', desc: 'Licensed practitioner portfolio' },
                    { id: 'clinic', icon: '🏥', title: 'Clinic Facility', desc: 'Hospital register & profiles' },
                    { id: 'user', icon: '👨‍🌾', title: 'General User', desc: 'Farmer, breeder, or pet owner' },
                    { id: 'assistant', icon: '🧑‍⚕️', title: 'Vet Assistant', desc: 'Clinical assistant / technician' }
                  ].map((roleOpt) => {
                    const isSelected = selectedRole === roleOpt.id;
                    return (
                      <motion.button
                        key={roleOpt.id}
                        type="button"
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => setSelectedRole(roleOpt.id as UserRole)}
                        className={`p-3 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                          isSelected
                            ? 'border-[#5a5a40] border-b-[4px] border-b-[#3e3e2b] bg-[#fcf9f2] font-bold shadow-[0_4px_12px_rgba(90,90,64,0.08)]'
                            : 'border-[#e3dec9] border-b-[2px] bg-white hover:bg-[#fcf9f2]/50'
                        }`}
                      >
                        <span className="text-xl mb-1 filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.15)]">{roleOpt.icon}</span>
                        <span className="text-2xs font-extrabold text-[#373735] mb-0.5">{roleOpt.title}</span>
                        <span className="text-[8px] text-[#a49f92] font-bold tracking-tight leading-none px-1 line-clamp-1">{roleOpt.desc}</span>
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* CONDITIONAL SUBFORMS */}
              <AnimatePresence mode="wait">
                {(selectedRole === 'doctor' || selectedRole === 'assistant') && (
                  <motion.div
                    key="pro-form"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    className="p-4 bg-[#fcf9f2] border border-[#e3dec9] border-b-[3px] rounded-2xl space-y-4"
                  >
                    <div>
                      <label className="text-xs uppercase font-extrabold text-[#5a5a40] tracking-wider mb-2.5 block">
                        {selectedRole === 'doctor' ? 'Professional Specialization' : 'Assistant / Technician Expertise'}
                      </label>
                      <input
                        type="text"
                        className="form-control bg-white"
                        placeholder={selectedRole === 'doctor' 
                          ? "e.g., Equine Practitioner, Orthopedic Surgery, Pet Vaccinator"
                          : "e.g., Dressing wound, post-op helper, vaccinator helper"
                        }
                        value={expertise}
                        onChange={(e) => setExpertise(e.target.value)}
                        disabled={loading}
                      />
                    </div>
                    <div>
                      <label className="text-xs uppercase font-extrabold text-[#5a5a40] tracking-wider mb-2.5 block">Practice City / Town *</label>
                      <input
                        type="text"
                        required
                        className="form-control bg-white font-serif text-xs"
                        placeholder="e.g. Multan, Lahore, Islamabad, Pattoki"
                        value={doctorCity}
                        onChange={(e) => setDoctorCity(e.target.value)}
                        disabled={loading}
                      />
                      <span className="text-[9px] text-[#a49f92] font-semibold mt-1 block">Your clinic-independent practice city. This can be updated in your profile any time.</span>
                    </div>
                  </motion.div>
                )}

                {selectedRole === 'user' && (
                  <motion.div
                    key="user-form"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    className="p-4 bg-[#fcf9f2] border border-[#e3dec9] border-b-[3px] rounded-2xl space-y-4"
                  >
                    <div>
                      <label className="text-xs uppercase font-extrabold text-[#5a5a40] tracking-wider mb-2.5 block">Primary Animal Focus / Interest</label>
                      <input
                        type="text"
                        className="form-control bg-white"
                        placeholder="e.g. Cows & Cattle, Goat Farm, Pet Breeder, Dog Companion"
                        value={expertise}
                        onChange={(e) => setExpertise(e.target.value)}
                        disabled={loading}
                      />
                    </div>
                    <div>
                      <label className="text-xs uppercase font-extrabold text-[#5a5a40] tracking-wider mb-2.5 block">Your Location City / District *</label>
                      <input
                        type="text"
                        required
                        className="form-control bg-white font-serif text-xs"
                        placeholder="e.g. Multan, Lahore, Islamabad"
                        value={doctorCity}
                        onChange={(e) => setDoctorCity(e.target.value)}
                        disabled={loading}
                      />
                      <span className="text-[9px] text-[#a49f92] font-semibold mt-1 block">Helps veterinarians and clinical centers find your breeder farm or pet clinic request.</span>
                    </div>
                  </motion.div>
                )}

                {selectedRole === 'clinic' && (
                  <motion.div
                    key="clinic-form"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    className="p-5 bg-[#fcf9f2] border border-[#e3dec9] border-b-[3px] rounded-2xl space-y-4"
                  >
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-extrabold text-[#5a5a40] tracking-wider block">Equipped Physical Facilities</label>
                      <input
                        type="text"
                        className="form-control bg-white"
                        placeholder="e.g. Inpatient Ward, Ultrasound, Digital X-Ray"
                        value={facilities}
                        onChange={(e) => setFacilities(e.target.value)}
                        disabled={loading}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-extrabold text-[#5a5a40] tracking-wider block">Hospital Street Address *</label>
                      <input
                        type="text"
                        className="form-control bg-white"
                        placeholder="Plot, Block, Cantonment, City"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        disabled={loading}
                        required
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Terms and conditions Check */}
              <div className="flex items-center gap-2.5 bg-[#fcf9f2] p-3 rounded-xl border border-[#e3dec9] text-left animate-fadeIn mt-4">
                <input
                  id="signup-terms-check"
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="w-4 h-4 text-[#5a5a40] focus:ring-[#5a5a40] border-[#cdc6ad] rounded cursor-pointer"
                  disabled={loading}
                />
                <label htmlFor="signup-terms-check" className="text-xs font-semibold text-[#5a5a40] cursor-pointer select-none">
                  I accept the{' '}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setLegalModalType('terms');
                      setLegalModalOpen(true);
                    }}
                    className="text-[#a0522d] hover:text-[#5a5a40] underline font-extrabold cursor-pointer inline-block bg-transparent p-0 border-none outline-none"
                    id="link-terms-and-conditions"
                  >
                    terms and conditions
                  </button>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading || !acceptedTerms}
                className={`btn-tactile-3d-primary w-full py-4 text-base tracking-wide flex items-center justify-center gap-2 mt-4 ${
                  (!acceptedTerms && !loading) ? 'opacity-60 cursor-not-allowed border-b-[2px]' : ''
                }`}
                id="btn-complete-registration"
              >
                {loading ? 'Creating VetAxis profile…' : 'Complete Registration & Enter →'}
              </button>

              <button
                type="button"
                onClick={() => setGooglePendingInfo(null)}
                className="w-full text-center text-xs font-bold text-[#7a766f] hover:text-[#5a5a40] py-2 transition-colors cursor-pointer bg-transparent border-none mt-2"
              >
                ✕ Switch accounts
              </button>
            </form>
          ) : (
            /* INITIAL MAIN LANDING VIEW */
            <div className="space-y-8 py-4 animate-scaleUp">
              <div className="p-6 bg-[#fcf9f2] border border-[#e3dec9] border-b-[4px] border-b-[#cdc6ad] rounded-2xl text-center">
                <div className="inline-flex w-14 h-14 bg-white border border-[#e3dec9] rounded-2xl items-center justify-center text-4xl mb-3 shadow-[0_4px_10px_rgba(0,0,0,0.05)]">
                  🧭
                </div>
                <h3 className="text-sm font-black text-[#373735] tracking-tight uppercase">Strategic Network Connected</h3>
                <p className="text-xs text-[#7a766f] font-semibold leading-relaxed mt-2.5 px-3">
                  Enter to browse medical rosters, access veterinary pharmacy catalogs, and query pet classifieds. Securely powered by Google Single Sign-On.
                </p>
              </div>

              <motion.button
                whileHover={{ y: -3 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleGoogleAuth}
                disabled={loading}
                className="w-full py-4.5 border border-[#e3dec9] border-b-[5px] border-b-[#cdc6ad] rounded-2xl hover:bg-[#fcf9f2]/70 bg-white transition-all font-black text-lg text-[#373735] cursor-pointer flex items-center justify-center gap-3.5 shadow-md"
              >
                {loading ? (
                  <span className="w-5 h-5 border-2 border-[#5a5a40] border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  <svg className="w-6 h-6 shrink-0 filter drop-shadow-sm" viewBox="0 0 24 24">
                    <path fill="#EA4335" d="M12.24 10.285V14.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.866-3.577-7.866-8s3.536-8 7.866-8c2.46 0 4.105 1.025 5.047 1.926l3.256-3.133C18.441 1.952 15.608 1 12.24 1 5.48 1 0 6.37 0 13s5.48 12 12.24 12c7.054 0 11.77-4.907 11.77-11.83 0-.795-.085-1.4-.19-1.885H12.24z"/>
                  </svg>
                )}
                <span>{loading ? 'Opening Portal…' : 'Continue with Google'}</span>
              </motion.button>

              {/* About Us / Platform Directory guide button */}
              <div className="border-t border-[#e3dec9] pt-6 flex flex-col items-center">
                <span className="text-[10px] uppercase font-bold text-[#a49f92] tracking-wider mb-2">Unsure what we offer?</span>
                <button
                  type="button"
                  onClick={() => {
                    if (onOpenAboutUs) onOpenAboutUs();
                  }}
                  className="w-full py-3.5 bg-[#fdfbf7] hover:bg-[#fcf9f2] text-[#a0522d] border border-[#e3dec9] border-b-[3px] border-b-[#cdc6ad] rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all shadow-xs"
                >
                  <span>ℹ️ Explore All Services & Directory</span>
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

    </div>
  );
}
