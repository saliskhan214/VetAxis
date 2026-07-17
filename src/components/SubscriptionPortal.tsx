import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CreditCard, Sparkles, CheckCircle2, Shield, Calendar, 
  AlertTriangle, Award, Check, Zap, ShieldAlert, ArrowRight, X, Loader2
} from 'lucide-react';
import { UserProfile } from '../types';
import { AuthService, PromotionalAdsService, PaymentService, secureSetItem } from '../lib/storage';
import { LivestockService } from '../lib/livestockService';

interface SubscriptionPortalProps {
  currentUser: UserProfile;
  onUpdateUser: (updated: UserProfile) => void;
  onNavigateToSection: (section: string) => void;
  onStartGatewayCheckout?: (token: string) => void;
}

export function SubscriptionPortal({ 
  currentUser, 
  onUpdateUser, 
  onNavigateToSection,
  onStartGatewayCheckout
}: SubscriptionPortalProps) {
  // Plan Configurations
  const PLANS = [
    {
      id: 'Silver' as const,
      name: 'Silver Practitioner',
      price: 2000,
      period: 'month',
      color: 'from-slate-400 to-slate-600',
      glow: 'shadow-slate-200',
      badgeColor: 'bg-slate-100 text-slate-700 border-slate-300',
      icon: '✦',
      benefits: [
        'Full Clinic Management Facility (Clinics only)',
        'Premium Silver badge on directory portfolio',
        'Custom interactive 3D Silver member card',
        'High directory sorted listing rank',
        'Manage up to 3 Farm Workspaces',
        '15 FREE Emergency Radar Alerts',
        'Unlimited Product & Pet Ads',
        'Post up to 3 FREE Veterinary Billboard Ads'
      ]
    },
    {
      id: 'Gold' as const,
      name: 'Gold vetted Authority',
      price: 4000,
      period: 'month',
      color: 'from-yellow-400 via-amber-500 to-amber-600',
      glow: 'shadow-amber-100/60',
      badgeColor: 'bg-amber-100 text-amber-950 border-amber-300',
      icon: '👑',
      benefits: [
        'Full Clinic Management Facility (Clinics only)',
        'Official Gold partner directory badge',
        'Durable Guilloche golden 3D member card styling',
        'Advanced directory listing sort priority',
        'Manage up to 10 Farm Workspaces',
        '30 FREE Emergency Radar Alerts',
        'Unlimited Product & Pet Ads',
        'Post up to 5 FREE Veterinary Billboard Ads',
        'Advanced customized digital clinic analytics'
      ],
      popular: true
    },
    {
      id: 'Platinum' as const,
      name: 'Platinum Elite Partner',
      price: 8000,
      period: 'month',
      color: 'from-purple-600 via-indigo-600 to-teal-500',
      glow: 'shadow-indigo-100/50',
      badgeColor: 'bg-indigo-900/10 text-indigo-700 border-indigo-200',
      icon: '💎',
      benefits: [
        'Full Clinic Management Facility (Clinics only)',
        'Ultra Elite interactive holographic 3D dark metal card',
        'Absolute topmost search directory ranking',
        'Manage Unlimited Farm Workspaces',
        'Unlimited FREE Emergency Radar Alerts',
        'Unlimited Product & Pet Ads',
        'Post up to 10 FREE Veterinary Billboard Ads',
        'Premium priority customer support & custom branding tools',
        'Holographic highlighted product listings (Marketplace & Pet Ads)'
      ]
    }
  ];

  // Subscription Details Expiry calculation
  const isPremium = !!currentUser.subscriptionTier;
  const expiryTime = currentUser.subscriptionExpiresAt || 0;

  // Premium limits calculations
  const tier = currentUser.subscriptionTier;
  const isSubscriber = !!tier;

  // Removed interactive plan boundaries and resource monitor simulator variables
  const shouldHidePricing = false;

  // Real-time ticking state for dynamic interactive countdown live updating
  const [nowState, setNowState] = useState<number>(Date.now());
  const [portalMessage, setPortalMessage] = useState<{ text: string; type: 'success' | 'error' | 'warning' } | null>(null);

  useEffect(() => {
    let active = true;
    const interval = setInterval(() => {
      if (active) {
        setNowState(Date.now());
      }
    }, 1000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const diffTime = Math.max(0, expiryTime - nowState);
  const daysRemaining = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const hoursRemaining = Math.floor((diffTime / (1000 * 60 * 60)) % 24);
  const minutesRemaining = Math.floor((diffTime / (1000 * 60)) % 60);
  const secondsRemaining = Math.floor((diffTime / 1000) % 60);
  const progressDays = diffTime / (1000 * 60 * 60 * 24);

  // Checkout Interactive states
  const [selectedTier, setSelectedTier] = useState<'Silver' | 'Gold' | 'Platinum' | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [successMode, setSuccessMode] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'EasyPaisa' | 'JazzCash' | 'Bank Transfer'>('EasyPaisa');
  const [transactionId, setTransactionId] = useState('');
  
  // Custom cancellation modal states
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);

  // Submit manual payment verification request
  const handleManualPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTier) return;
    if (!transactionId.trim()) {
      setCheckoutError('Please enter the reference Transaction ID from your payment receipt.');
      return;
    }
    setCheckoutLoading(true);
    setCheckoutError(null);

    try {
      await PaymentService.submitManualPayment({
        userId: currentUser.uid,
        userName: currentUser.name || 'Practitioner',
        userEmail: currentUser.email || '',
        planId: selectedTier,
        transactionId: transactionId.trim(),
        paymentMethod: paymentMethod
      });
      setSuccessMode(true);
      setPortalMessage({
        text: `💳 Your PKR ${PLANS.find(p => p.id === selectedTier)?.price.toLocaleString()} payment has been submitted! An admin will verify the Transaction ID (${transactionId.trim()}) and approve your subscription shortly.`,
        type: 'success'
      });
    } catch (err: any) {
      setCheckoutError(err.message || 'Payment submission failed.');
    } finally {
      setCheckoutLoading(false);
    }
  };

  // Submit direct upgrade trigger
  const handleDirectUpgrade = async () => {
    if (!selectedTier) return;
    setCheckoutLoading(true);
    setCheckoutError(null);

    try {
      const newExpiry = Date.now() + (30 * 24 * 60 * 60 * 1000);

      const updated = await AuthService.updateProfile(currentUser.uid, {
        subscriptionTier: selectedTier,
        subscriptionExpiresAt: newExpiry,
        promoAdsUsed: currentUser.promoAdsUsed || 0,
        isVerified: true
      });

      onUpdateUser(updated);
      setSuccessMode(true);
    } catch (err: any) {
      setCheckoutError(err.message || 'Subscription activation failed.');
    } finally {
      setCheckoutLoading(false);
    }
  };

  // Cancel subscription sequence
  const handleCancelSubscription = async () => {
    setCancelLoading(true);
    try {
      const updated = await AuthService.updateProfile(currentUser.uid, {
        subscriptionTier: null as any,
        subscriptionExpiresAt: null as any,
        isVerified: false
      });
      onUpdateUser(updated);
      setCancelModalOpen(false);
      setPortalMessage({
        text: 'Your subscription has been cancelled successfully. You were downgraded to standard practitioner status.',
        type: 'warning'
      });
    } catch (err: any) {
      setPortalMessage({
        text: 'Cancellation failed: ' + err.message,
        type: 'error'
      });
    } finally {
      setCancelLoading(false);
    }
  };

  const activePlanDetails = PLANS.find(p => p.id === currentUser.subscriptionTier);

  if (currentUser.role !== 'doctor' && currentUser.role !== 'clinic') {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4 text-center select-none">
        <div className="bg-[#fcf9f2] border border-[#e3dec9] border-b-[5px] border-b-[#cdc6ad] rounded-3xl p-8 md:p-12 space-y-6">
          <div className="w-16 h-16 bg-amber-50 border border-amber-200 text-amber-600 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
            <ShieldAlert className="w-8 h-8 animate-pulse text-[#d97706]" />
          </div>
          <div className="space-y-2">
            <h2 className="font-serif font-black text-2xl text-[#373735]">Practitioner Access Only</h2>
            <p className="text-sm font-semibold text-[#7a766f] leading-relaxed">
              The VetAxis Subscription Portal and Billboard promotion tools are reserved exclusively for registered doctors, clinic owners, and veterinary centers.
            </p>
          </div>
          <div className="border-t border-[#e3dec9] pt-6 flex flex-col sm:flex-row justify-center gap-3">
            <button
              onClick={() => onNavigateToSection('explore')}
              className="btn-tactile-3d bg-[#5a5a40] border-[#3e3e2b] text-white hover:bg-[#3e3e2b] text-xs font-black uppercase tracking-wider px-6 py-3 cursor-pointer"
            >
              🩺 Explore Veterinary Directory
            </button>
            <button
              onClick={() => onNavigateToSection('community')}
              className="btn-tactile-3d bg-white border-[#e3dec9] text-[#5a5a40] hover:bg-[#fcf9f2] text-xs font-black uppercase tracking-wider px-6 py-3 cursor-pointer"
            >
              💬 Visit Vet Community
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto w-[98%] px-1 md:px-4 text-left select-none pb-12">
      
      {/* SECTION TOP HEADER */}
      <div className="bg-[#fcf9f2] border border-[#e3dec9] border-b-[4px] border-b-[#cdc6ad] rounded-3xl p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#5a5a40]/15 rounded-full border border-[#5a5a40]/25 text-xs text-[#5a5a40] font-black uppercase tracking-wider">
            <Shield className="w-3.5 h-3.5 shrink-0" />
            <span>Clinical Billing Centre</span>
          </div>
          <h2 className="font-serif font-black text-2.5xl text-[#373735] leading-tight md:text-3.5xl">
            Subscription Portal
          </h2>
          <p className="text-sm font-semibold text-[#7a766f] max-w-[550px]">
            Manage premium clinical credentials, buy or upgrade directory tiers, and verify your practitioner credentials in real-time.
          </p>
        </div>

        {/* GO TO EXPLORE FOR DIRECT EFFECT TEST */}
        <button
          onClick={() => onNavigateToSection('explore')}
          className="btn-tactile-3d bg-white border-[#e3dec9] text-[#373735] hover:bg-[#fcf9f2] text-xs font-black uppercase tracking-widest px-5 py-3 md:self-center cursor-pointer shrink-0"
        >
          🩺 View Directory Rank →
        </button>
      </div>

      {/* PORTAL NOTIFICATION BANNER */}
      {portalMessage && (
        <div className={`p-4 rounded-2xl border flex items-center justify-between gap-4 shadow-sm animate-fadeIn ${
          portalMessage.type === 'success' ? 'bg-[#f0fdf4] border-[#bbf7d0] text-[#166534]' :
          portalMessage.type === 'warning' ? 'bg-[#fffbeb] border-[#fde68a] text-[#92400e]' :
          'bg-[#fef2f2] border-[#fecaca] text-[#991b1b]'
        }`}>
          <div className="flex items-center gap-3">
            <span className="text-lg">
              {portalMessage.type === 'success' ? '✅' : portalMessage.type === 'warning' ? '⚠️' : '❌'}
            </span>
            <p className="text-xs font-bold uppercase tracking-wider leading-tight">{portalMessage.text}</p>
          </div>
          <button 
            onClick={() => setPortalMessage(null)}
            className="text-xs font-black text-[#5a5a40] hover:text-black border-none bg-transparent cursor-pointer"
          >
            DISMISS
          </button>
        </div>
      )}

      {/* ACTIVE SUBSCRIPTION OVERVIEW MODULE */}
      {isPremium ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* ACTIVE STATUS CARD */}
          <div className="lg:col-span-2 bg-gradient-to-r from-neutral-900 to-stone-900 border border-neutral-800 border-b-[6px] border-b-black rounded-3xl p-6 md:p-8 text-white relative overflow-hidden flex flex-col justify-between shadow-xl min-h-[300px]">
            {/* Ambient secure guilloche bg overlay */}
            <div className="absolute inset-x-0 top-0 h-full opacity-10 pointer-events-none bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px]" />
            <div className="absolute -right-16 -bottom-16 w-64 h-64 bg-cyan-500/10 rounded-full blur-[120px]" />
            {currentUser.subscriptionTier === 'Platinum' && (
              <div className="absolute -left-16 -top-16 w-64 h-64 bg-purple-500/15 rounded-full blur-[120px] animate-pulse" />
            )}

            <div className="relative z-10">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#a49f92] block">
                  Active Clinical Subscription
                </span>
                <span className={`px-3.5 py-1.5 text-xs font-black rounded-xl border tracking-widest uppercase inline-flex items-center gap-1.5 shadow-sm ${
                  currentUser.subscriptionTier === 'Silver' ? 'bg-slate-700/80 border-slate-500 text-slate-100' :
                  currentUser.subscriptionTier === 'Gold' ? 'bg-amber-600 border-amber-500 text-white' :
                  'bg-gradient-to-r from-teal-500 via-indigo-500 to-purple-600 border-teal-400 text-white'
                }`}>
                  <Award className="w-3.5 h-3.5" />
                  <span>{currentUser.subscriptionTier} Master</span>
                </span>
              </div>

              {/* Title & Benefits breakdown */}
              <div className="mt-6 space-y-2">
                <h3 className="font-serif text-2xl font-black md:text-3.5xl tracking-tight text-white leading-tight">
                  {activePlanDetails?.name}
                </h3>
                <div className="flex items-center gap-4 text-xs font-mono text-neutral-400 font-semibold flex-wrap">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4 text-teal-400" />
                    <span>Expires in: <strong className="text-white font-black">{daysRemaining}d {hoursRemaining}h {minutesRemaining}m {secondsRemaining}s</strong></span>
                  </span>
                  <span>•</span>
                  <span>Plan cost: PKR {activePlanDetails?.price.toLocaleString()}/mo</span>
                </div>
              </div>

              {/* Perks Checklist */}
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs text-neutral-300 font-bold">
                {activePlanDetails?.benefits.map((benefit, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{benefit}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Renewal Button Strip */}
            <div className="relative z-10 mt-8 pt-6 border-t border-neutral-800 flex flex-wrap items-center justify-between gap-4">
              <div className="text-[11px] text-neutral-400 font-semibold">
                Your card on file will automatically renew the monthly cycle.
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                {(currentUser.email?.toLowerCase().trim() === 'saliskhan214@gmail.com' || currentUser.email?.toLowerCase().trim() === 'bunnykhan329@gmail.com') && (
                  <button
                    type="button"
                    onClick={() => {
                      const isBunny = currentUser.email?.toLowerCase().trim() === 'bunnykhan329@gmail.com';
                      const newExpiry = Date.now() + 5 * 60 * 1000;
                      localStorage.setItem(isBunny ? 'va_bunny_sub_expires' : 'va_salis_sub_expires', newExpiry.toString());
                      
                      // Inject local override immediately for this session
                      const updated: UserProfile = {
                        ...currentUser,
                        subscriptionTier: isBunny ? 'Silver' : 'Platinum',
                        subscriptionExpiresAt: newExpiry,
                        isVerified: true
                      };
                      onUpdateUser(updated);
                      secureSetItem('va_session', JSON.stringify(updated));
                      setPortalMessage({
                        text: `🔄 5-Minute ${isBunny ? 'Silver' : 'Platinum'} Trial has been successfully reset! Watch the countdown below.`,
                        type: 'success'
                      });
                    }}
                    className="px-4 py-2 bg-gradient-to-r from-purple-950 to-indigo-950 hover:from-purple-900 hover:to-indigo-900 border border-purple-500 text-xs font-black uppercase text-purple-200 tracking-wider rounded-xl transition-all cursor-pointer"
                  >
                    🔄 Reset 5-Min Trial
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTier(currentUser.subscriptionTier || 'Silver');
                    setTimeout(() => {
                      document.getElementById('checkout-card-form')?.scrollIntoView({ behavior: 'smooth' });
                    }, 100);
                  }}
                  className="px-4 py-2 bg-neutral-800 hover:bg-neutral-750 border border-neutral-700 text-xs font-black uppercase text-teal-300 tracking-wider rounded-xl transition-all cursor-pointer"
                >
                  💳 Renew / Extend Plan
                </button>
              </div>
            </div>

          </div>

          {/* DYNAMIC LEASE METRIC STAT BOARD */}
          <div className="bg-[#fcf9f2] border border-[#e3dec9] border-b-[5px] border-b-[#cdc6ad] rounded-3xl p-6 flex flex-col justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#a49f92] block">
              Active Security Metrics
            </span>

            {/* Expiring circular countdown representation */}
            <div className="my-6 flex flex-col items-center justify-center text-center space-y-2">
              <div className="relative w-28 h-28 flex items-center justify-center rounded-full bg-white border border-[#e3dec9] shadow-inner">
                {/* SVG Dial display */}
                <svg className="absolute inset-0 w-full h-full transform -rotate-90">
                  <circle
                    cx="56"
                    cy="56"
                    r="48"
                    fill="transparent"
                    stroke="#f3efe0"
                    strokeWidth="6"
                  />
                  <circle
                    cx="56"
                    cy="56"
                    r="48"
                    fill="transparent"
                    stroke={progressDays > 7 ? "#10b981" : "#ef4444"}
                    strokeWidth="6"
                    strokeDasharray={301.6}
                    strokeDashoffset={301.6 - (301.6 * Math.min(30, progressDays)) / 30}
                    className="transition-all duration-1000"
                  />
                </svg>
                <div className="text-center p-1 z-10">
                  {daysRemaining > 0 ? (
                    <>
                      <span className="text-2xl font-serif font-black text-black block leading-none">{daysRemaining}</span>
                      <span className="text-[8px] uppercase font-black text-[#a49f92] tracking-wider block">DAYS LEFT</span>
                    </>
                  ) : (
                    <>
                      <span className="text-sm font-mono font-black text-red-600 block leading-none">
                        {hoursRemaining}h {minutesRemaining}m
                      </span>
                      <span className="text-[9px] font-mono font-extrabold text-[#7a766f] block mt-0.5">
                        {secondsRemaining}s left
                      </span>
                    </>
                  )}
                </div>
              </div>
              <p className="text-xs font-black text-[#5a5a40]">
                {progressDays > 7 ? '🟢 Subscription Active & Safe' : '⚠️ Warning: Expiring Soon!'}
              </p>
            </div>

            <div className="bg-white p-3 rounded-2xl border border-[#e3dec9] text-[11px] space-y-1 text-[#7a766f]">
              <span className="font-extrabold text-black block mb-1">Clinic Verifications:</span>
              <div className="flex items-center justify-between">
                <span>Verification State</span>
                <span className={`font-bold uppercase ${
                  currentUser.subscriptionTier === 'Silver' ? 'text-slate-500' :
                  currentUser.subscriptionTier === 'Gold' ? 'text-amber-600' :
                  currentUser.subscriptionTier === 'Platinum' ? 'text-purple-600' :
                  'text-neutral-500'
                }`}>
                  {currentUser.subscriptionTier ? `Verified ${currentUser.subscriptionTier}` : 'Standard Profile'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Lease Cycle Type</span>
                <span>Monthly Recurring</span>
              </div>
            </div>

          </div>

        </div>
      ) : (
        /* PROMPTING UNSUBSCRIBED BANNER HERO */
        <div className="bg-white rounded-3xl border border-[#e3dec9] border-b-[5px] border-b-[#cdc6ad] p-6 md:p-10 text-center space-y-4 max-w-4xl mx-auto">
          <div className="w-16 h-16 bg-amber-500/10 text-amber-500 border border-amber-300 rounded-2xl flex items-center justify-center text-3xl mx-auto shadow-sm">
            ✨
          </div>
          <h3 className="font-serif text-xl font-black text-[#373735] md:text-2xl leading-snug">
            Upgrade Your VetAxis Account to Premium
          </h3>
          <p className="text-sm font-semibold text-[#7a766f] max-w-lg mx-auto">
            Get elite badge placement in directory search, unlock premium profile styling, and post free promotional ad banners that rank above regular listings!
          </p>
          <div className="inline-flex items-center gap-1 bg-[#fcf9f2] p-2 px-3.5 rounded-full border border-[#e3dec9] text-xs text-[#5a5a40] font-bold">
            ⚡ <strong>Free Privilege boost inside!</strong> Subscribe to any tier to verify directory profile instantly.
          </div>
        </div>
      )}



      {/* PLAN CHOICES COMPARE TIERS GRID */}
      <div className="space-y-4">
        <h3 className="font-serif font-black text-xl text-[#373735] px-1">
          Compare VetAxis Premium Plans
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {PLANS.map((plan) => {
            const isCurrent = currentUser.subscriptionTier === plan.id;
            const isSelected = selectedTier === plan.id;

            return (
              <motion.div
                key={plan.id}
                whileHover={{ y: -4 }}
                className={`relative rounded-3xl p-6.5 bg-white border flex flex-col justify-between transition-all overflow-hidden ${
                  isCurrent 
                    ? 'border-[#5a5a40] border-b-[6px] border-[#5a5a40]/90 shadow-lg' 
                    : isSelected
                    ? 'border-indigo-500 border-b-[6px] border-indigo-700 shadow-lg'
                    : 'border-[#e3dec9] border-b-[5px] border-b-[#cdc6ad]'
                }`}
              >
                {/* Popular Badge */}
                {plan.popular && (
                  <div className="absolute top-0 right-0 bg-gradient-to-l from-amber-600 to-yellow-500 text-white text-[9px] font-black uppercase px-4 py-1.5 rounded-bl-2xl tracking-widest">
                    Most Popular
                  </div>
                )}

                {isCurrent && (
                  <div className="absolute top-0 right-0 bg-[#5a5a40] text-white text-[8px] font-black uppercase px-3.5 py-1.5 rounded-bl-2xl tracking-wider select-none uppercase">
                    Your Active Plan
                  </div>
                )}

                <div className="space-y-5">
                  {/* Plan Badge / Icon */}
                  <div>
                    <span className="text-2xl mb-2 block select-none">{plan.icon}</span>
                    <h4 className="font-black text-lg text-black font-serif">
                      {plan.name}
                    </h4>
                    <div className="mt-2.5 flex items-baseline h-10">
                      {shouldHidePricing ? (
                        <div className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-black tracking-widest uppercase py-1.5 px-3 rounded-xl flex items-center gap-1 shadow-inner">
                          <span>✓ COVERED BY ACTIVE TIERS</span>
                        </div>
                      ) : (
                        <>
                          <span className="text-3xl font-serif font-black text-black">PKR {plan.price.toLocaleString()}</span>
                          <span className="text-xs text-[#7a766f] font-semibold ml-1">/ {plan.period}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Plan benefits checkmarks */}
                  <div className="space-y-3 pt-3 border-t border-[#f4f1e9]">
                    {plan.benefits.map((benefit, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs font-semibold text-[#373735]">
                        <CheckCircle2 className="w-4 h-4 text-[#5a5a40] shrink-0 mt-0.5" />
                        <span>{benefit}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Plan button CTA */}
                <div className="mt-8">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTier(plan.id);
                      setSuccessMode(false);
                      setTimeout(() => {
                        document.getElementById('checkout-card-form')?.scrollIntoView({ behavior: 'smooth' });
                      }, 100);
                    }}
                    disabled={isCurrent && daysRemaining > 7}
                    className={`w-full py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer ${
                      isCurrent
                        ? 'bg-stone-50 border border-stone-200 text-stone-400 border-b-[2px]'
                        : isSelected
                        ? 'bg-indigo-600 text-white border border-indigo-700 border-b-[4px] border-b-indigo-800'
                        : 'bg-emerald-600 border-b-[4px] border-b-emerald-800 text-white hover:bg-emerald-700 border border-emerald-600'
                    }`}
                  >
                    {isCurrent ? 'Plan Active' : isSelected ? 'Selected Tier ✓' : 'Subscribe / Upgrade'}
                  </button>
                </div>

              </motion.div>
            );
          })}
        </div>
      </div>

      {/* SECURE DIRECT ACTIVATION / MANUAL PAYMENT VERIFICATION MODULE */}
      <AnimatePresence>
        {selectedTier && (
          <motion.div
            id="checkout-card-form"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            className="pt-4 scroll-mt-6"
          >
            <div className="p-6 md:p-8 bg-white border border-[#e3dec9] border-b-[6px] border-[#cdc6ad] rounded-3xl">
              
              <div className="flex items-center justify-between border-b border-[#f4f1e9] pb-4 mb-6">
                <div className="space-y-1">
                  <div className="text-[10px] font-black uppercase tracking-wider text-[#5a5a40] flex items-center gap-1 bg-[#fcf9f2] px-2 py-0.5 rounded-lg border border-[#e3dec9] w-fit">
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Secure Manual Verification Billing</span>
                  </div>
                  <h3 className="font-serif font-black text-xl text-black">
                    Submit Payment for {selectedTier} Elite Tier
                  </h3>
                  <p className="text-xs font-semibold text-[#7a766f]">
                    Transfer the plan price and submit your transaction receipt ID below for verification.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTier(null);
                    setSuccessMode(false);
                    setTransactionId('');
                  }}
                  className="p-1 px-2.5 rounded-lg bg-stone-50 hover:bg-stone-100 text-stone-500 hover:text-black border border-stone-200 text-xs font-bold font-mono transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>

              {successMode ? (
                /* SUCCESS SCREEN ON ACTIVATION COMPLETE */
                <motion.div 
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-8 text-center bg-emerald-50 rounded-2xl border border-emerald-200 space-y-4 max-w-lg mx-auto animate-fadeIn"
                >
                  <div className="w-12 h-12 bg-emerald-600 text-white rounded-full flex items-center justify-center text-xl mx-auto shadow-md">
                    ✓
                  </div>
                  <h4 className="font-serif text-xl font-black text-[#1b7c31]">
                    Payment Verification Submitted!
                  </h4>
                  <p className="text-xs font-semibold text-emerald-800 leading-relaxed max-w-sm mx-auto">
                    Your manual payment of <strong className="font-black">PKR {PLANS.find(p => p.id === selectedTier)?.price.toLocaleString()}</strong> for the <strong className="font-black">{selectedTier}</strong> tier has been submitted with Transaction ID <code className="font-mono bg-emerald-150 px-1.5 py-0.5 rounded font-bold text-emerald-950">{transactionId}</code> via <strong className="font-black">{paymentMethod}</strong>.
                  </p>
                  <p className="text-[11px] text-[#4d7c5a] font-medium leading-relaxed max-w-xs mx-auto">
                    Our admin team will verify your payment receipt within a few hours. You will receive an instant clinical alert notification when your profile is upgraded!
                  </p>
                  <div className="pt-2 flex gap-3.5 justify-center">
                    <button
                      type="button"
                      onClick={() => onNavigateToSection('explore')}
                      className="px-4 py-2 bg-[#5a5a40] text-white text-xs font-black uppercase tracking-wider rounded-xl hover:bg-[#4a4a34] transition-all border-b-[3px] border-b-[#353525] cursor-pointer"
                    >
                      🩺 View Directory
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTier(null);
                        setSuccessMode(false);
                        setTransactionId('');
                      }}
                      className="px-4 py-2 bg-white text-[#373735] border border-[#e3dec9] text-xs font-black uppercase tracking-wider rounded-xl hover:bg-stone-50 transition-all border-b-[3px] border-b-stone-300 cursor-pointer"
                    >
                      Close Portal
                    </button>
                  </div>
                </motion.div>
              ) : (
                /* MANUAL PAYMENT FORM */
                <form onSubmit={handleManualPaymentSubmit} className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                  {/* Step 1: Payment Instructions Panel (Left) */}
                  <div className="lg:col-span-3 space-y-4">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[#a49f92] block">
                      Step 1: Send Amount via EasyPaisa or Raast
                    </label>

                    {/* Interactive Method Details Box */}
                    <div className="bg-[#fcf9f2] p-5 rounded-2xl border border-[#e3dec9] space-y-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-xs font-semibold">
                          <span className="text-[#5a5a40] font-bold">🟢 EasyPaisa Account Details</span>
                          <span className="bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg text-[10px] text-emerald-700 font-extrabold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
                            <span>Direct Transfer</span>
                          </span>
                        </div>
                        
                        <div className="p-4 bg-white border border-[#e3dec9] rounded-xl space-y-3">
                          <div className="flex items-center justify-between border-b border-stone-100 pb-2.5">
                            <div>
                              <p className="text-[10px] text-[#7a766f] font-mono font-bold leading-none">EasyPaisa Account Number</p>
                              <p className="text-base font-mono font-black text-black mt-1.5 selection:bg-stone-200">0300-1216272</p>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] text-[#7a766f] font-mono font-bold leading-none">Account Title</p>
                              <p className="text-sm font-serif font-black text-stone-800 mt-1.5">Naseeb Ullah</p>
                            </div>
                          </div>

                          <div className="pt-0.5">
                            <p className="text-[10px] text-[#7a766f] font-mono font-bold leading-none">Raast IBAN (Any Banking App)</p>
                            <p className="text-xs font-mono font-black text-emerald-950 bg-emerald-50/60 p-2.5 rounded-lg border border-emerald-150/50 mt-1.5 break-all select-all">
                              PK36TMFB0000000092532839
                            </p>
                          </div>
                        </div>

                        <p className="text-[11px] font-semibold text-[#7a766f] leading-relaxed">
                          💡 <strong>How to Pay:</strong> Send exactly <strong className="text-black font-black">PKR {PLANS.find(p => p.id === selectedTier)?.price.toLocaleString()}</strong> to the mobile number above directly from your EasyPaisa app, or transfer from any banking app using the <strong>Raast IBAN</strong> under the receiver name <strong className="text-black font-bold">Naseeb Ullah</strong>.
                        </p>
                        <p className="text-[11px] font-semibold text-[#7a766f] leading-relaxed">
                          Copy the 11-digit or 12-digit transaction ID from the success receipt/SMS and enter it in the form on the right.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Step 2: Form Input Panel (Right) */}
                  <div className="lg:col-span-2 space-y-4">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[#a49f92] block">
                      Step 2: Enter Transaction Details
                    </label>

                    <div className="bg-[#fcf9f2]/60 p-5 rounded-2xl border border-[#e3dec9] space-y-4">
                      {/* Price Tag */}
                      <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-[#e3dec9] text-xs">
                        <span className="font-semibold text-[#7a766f]">Tier Selected:</span>
                        <span className="font-bold text-black">{selectedTier} Premium</span>
                      </div>
                      <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-[#e3dec9] text-xs">
                        <span className="font-semibold text-[#7a766f]">Transfer Amount:</span>
                        <span className="font-serif font-black text-base text-black">PKR {PLANS.find(p => p.id === selectedTier)?.price.toLocaleString()}</span>
                      </div>

                      {/* Transaction ID Input */}
                      <div className="space-y-1">
                        <label className="text-xs font-extrabold text-[#373735] flex items-center justify-between">
                          <span>Transaction ID / Receipt Ref</span>
                          <span className="text-[10px] text-red-500 font-bold">*Required</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={transactionId}
                          onChange={(e) => setTransactionId(e.target.value)}
                          placeholder="e.g. 52391054921"
                          className="w-full bg-white border border-[#e3dec9] focus:border-[#5a5a40] focus:ring-1 focus:ring-[#5a5a40] p-3 text-sm font-mono font-bold rounded-xl outline-hidden"
                        />
                        <p className="text-[10px] text-[#7a766f] font-semibold leading-normal">
                          Please double check the transaction ID. Inputting false IDs may result in account termination.
                        </p>
                      </div>

                      {checkoutError && (
                        <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs font-bold leading-normal">
                          ⚠️ {checkoutError}
                        </div>
                      )}

                      {/* Submit Actions Button Strip */}
                      <div className="flex gap-3 pt-1">
                        <button
                          type="button"
                          onClick={() => setSelectedTier(null)}
                          className="flex-1 bg-white hover:bg-stone-50 border border-[#e3dec9] text-stone-600 py-3 rounded-2xl font-bold text-xs cursor-pointer transition-all"
                        >
                          Go Back
                        </button>
                        <button
                          type="submit"
                          disabled={checkoutLoading}
                          className="flex-1 bg-[#5a5a40] text-white py-3 rounded-2xl font-black text-xs border border-[#3e3e2b] border-b-[4px] border-b-[#303022] hover:bg-[#4a4a34] cursor-pointer transition-all flex items-center justify-center gap-1"
                        >
                          {checkoutLoading ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Submitting...</span>
                            </>
                          ) : (
                            <span>Submit Payment</span>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </form>
              )}

            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* DETAILED FEATURES COMPARATIVE COMPARISON MATRIX */}
      <div className="bg-white border border-[#e3dec9] border-b-[5px] border-b-[#cdc6ad] rounded-3xl overflow-hidden mt-6">
        <div className="bg-[#fcf9f2] p-5 border-b border-[#e3dec9]">
          <h3 className="font-serif text-lg font-black text-[#373735]">
            Subscription Level Matrix
          </h3>
          <p className="text-xs font-semibold text-[#7a766f]">
            Detailed permissions breakdown for clinics, practitioners and support teams.
          </p>
        </div>

        <div className="overflow-x-auto text-[11px]">
          <table className="w-full border-collapse text-left min-w-[600px]">
            <thead>
              <tr className="border-b border-[#e3dec9] bg-stone-50 text-[10px] uppercase font-black tracking-wider text-[#7a766f] select-none">
                <th className="p-4 pl-6">Clinical Privilege / Benefit</th>
                <th className="p-4 text-center">Unsubscribed</th>
                <th className="p-4 text-center">🥈 Silver</th>
                <th className="p-4 text-center">👑 Gold</th>
                <th className="p-4 text-center">🏆 Platinum</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f4f1e9] font-semibold text-[#373735]">
              <tr>
                <td className="p-4 pl-6 text-[#5a5a40] font-black">🚜 Farm Workspaces managed</td>
                <td className="p-4 text-center text-red-500">Max 1 Farm</td>
                <td className="p-4 text-center text-slate-700">Max 3 Farms</td>
                <td className="p-4 text-center text-amber-800">Max 10 Farms</td>
                <td className="p-4 text-center text-indigo-700 font-extrabold">Unlimited Farms</td>
              </tr>
              <tr>
                <td className="p-4 pl-6 text-[#5a5a40] font-black">🔔 Free Emergency Radar Alerts</td>
                <td className="p-4 text-center text-stone-500">Paid (₨ 300 / 500)</td>
                <td className="p-4 text-center text-slate-700 font-extrabold">15 Free Alerts</td>
                <td className="p-4 text-center text-amber-800 font-extrabold">30 Free Alerts</td>
                <td className="p-4 text-center text-indigo-700 font-black">Unlimited Free</td>
              </tr>
              <tr>
                <td className="p-4 pl-6 text-[#5a5a40] font-black">📦 Marketplace Product & Pet Ads</td>
                <td className="p-4 text-center text-red-500">Max 3 ads weekly</td>
                <td className="p-4 text-center text-slate-700 font-black">Unlimited Ads</td>
                <td className="p-4 text-center text-amber-800 font-black">Unlimited Ads</td>
                <td className="p-4 text-center text-indigo-700 font-black">Unlimited Ads</td>
              </tr>
              <tr>
                <td className="p-4 pl-6 text-black font-extrabold">Vet Directory sorted list rank priority</td>
                <td className="p-4 text-center text-[#7a766f]">Standard Low</td>
                <td className="p-4 text-center text-slate-700">🥈 High Rank</td>
                <td className="p-4 text-center text-amber-800">👑 Top tier Priority</td>
                <td className="p-4 text-center text-indigo-700 font-extrabold">🏆 Absolute Top (Primary)</td>
              </tr>
              <tr>
                <td className="p-4 pl-6 text-black font-extrabold">Professional Badge Verification styling</td>
                <td className="p-4 text-center">None</td>
                <td className="p-4 text-center">slate badging</td>
                <td className="p-4 text-center text-amber-600">Vetted gold badge</td>
                <td className="p-4 text-center text-indigo-600">Holographic badge</td>
              </tr>

              <tr>
                <td className="p-4 pl-6 text-black font-extrabold">Classified Pet Ads expiration cycle duration</td>
                <td className="p-4 text-center">30 Days</td>
                <td className="p-4 text-center">90 Days</td>
                <td className="p-4 text-center">90 Days</td>
                <td className="p-4 text-center">90 Days</td>
              </tr>
              <tr>
                <td className="p-4 pl-6 text-black font-extrabold">Free Active Veterinary Billboard Banner Ads</td>
                <td className="p-4 text-center text-red-500">❌ Locked</td>
                <td className="p-4 text-center text-slate-700">3 ads (3d duration each)</td>
                <td className="p-4 text-center text-amber-800">5 ads (3d duration each)</td>
                <td className="p-4 text-center text-indigo-700 font-extrabold">10 ads (3d duration each)</td>
              </tr>
              <tr>
                <td className="p-4 pl-6 text-black font-extrabold text-teal-600">Dynamic Holographic Product listing highlights</td>
                <td className="p-4 text-center">Default white</td>
                <td className="p-4 text-center">Default white</td>
                <td className="p-4 text-center">Highlighted border</td>
                <td className="p-4 text-center text-teal-600 font-extrabold">🏆 True Shimmer Holographic</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* CANCELLATION MODAL DOCK OVERLAY */}
      <AnimatePresence>
        {cancelModalOpen && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-[999] overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl border border-red-200 border-b-[6px] border-b-red-300 p-6 md:p-8 w-full max-w-[480px] text-center space-y-4"
            >
              <div className="w-12 h-12 bg-red-50 text-[#df4747] border border-red-200 rounded-2xl flex items-center justify-center text-2xl mx-auto">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <h3 className="font-serif font-black text-xl text-stone-900">
                Cancel Active Practitioner Premium Plan?
              </h3>
              <p className="text-xs font-semibold text-[#7a766f] leading-relaxed">
                Warning: Cancelling your subscription will degrade your profile status, delete active billboard ads instantly, and remove directory listing priority ranks. All active verified practitioner credentials will be lost.
              </p>
              
              <div className="pt-4 flex gap-3.5">
                <button
                  type="button"
                  onClick={() => setCancelModalOpen(false)}
                  className="flex-1 bg-stone-50 hover:bg-stone-100 text-stone-700 px-4 py-3 rounded-2xl text-xs font-black border border-stone-200 cursor-pointer"
                >
                  Keep My Perks
                </button>
                <button
                  type="button"
                  onClick={handleCancelSubscription}
                  disabled={cancelLoading}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-2xl text-xs font-black border border-red-700 border-b-[4px] border-b-red-800 cursor-pointer"
                >
                  {cancelLoading ? 'Processing Cancellation...' : 'Yes, Cancel Premium'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
