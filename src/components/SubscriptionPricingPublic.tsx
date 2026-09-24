import React from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, ShieldCheck, Sparkles, ArrowRight, HelpCircle, Building2, Stethoscope } from 'lucide-react';

interface SubscriptionPricingPublicProps {
  onSignIn: () => void;
  onNavigate: (section: string) => void;
}

export function SubscriptionPricingPublic({ onSignIn, onNavigate }: SubscriptionPricingPublicProps) {
  const PLANS = [
    {
      id: 'Silver',
      name: 'Silver Practitioner',
      price: 'PKR 2,000',
      period: 'per month',
      badge: 'Certified Practice',
      description: 'Ideal for independent veterinary surgeons, locum doctors, and expanding private clinics.',
      color: 'border-slate-300 bg-white',
      badgeColor: 'bg-slate-100 text-slate-800 border-slate-300',
      features: [
        'Full Clinic Management Facility (Verified Clinics)',
        'Silver Verified Badge on Directory & Search Listings',
        'Interactive 3D Silver Member Card on Public Profile',
        'Elevated Search Ranking in City Clinic Directory',
        'Manage up to 3 Commercial Farm Workspaces',
        '15 Monthly Emergency Radar Proximity Alerts',
        'Unlimited Pet Adoption & Product Listings',
        '3 Free Billboard Promotions in News Brief'
      ]
    },
    {
      id: 'Gold',
      name: 'Gold Vetted Authority',
      price: 'PKR 4,000',
      period: 'per month',
      badge: 'Most Popular',
      popular: true,
      description: 'Designed for high-volume 24/7 veterinary hospitals, surgical centers, and commercial farms.',
      color: 'border-amber-400 bg-gradient-to-b from-amber-50/40 via-white to-amber-50/20',
      badgeColor: 'bg-amber-600 text-white border-amber-600',
      features: [
        'Full Clinic Management Facility (Verified Clinics)',
        'Official Gold Authority Partner Directory Badge',
        'Golden Guilloche 3D Membership Card Styling',
        'High Priority Placement in "Vets Near Me" Search',
        'Manage up to 10 Commercial Farm Workspaces',
        '30 Monthly Emergency Radar Proximity Alerts',
        'Unlimited Pet Adoption & Product Listings',
        '5 Free Billboard Promotions in News Brief',
        'Priority Appointment Booking for Clients',
        'Dedicated Clinical Verification Status'
      ]
    },
    {
      id: 'Platinum',
      name: 'Platinum Elite Partner',
      price: 'PKR 8,000',
      period: 'per month',
      badge: 'Hospital Network',
      description: 'The ultimate tier for major veterinary hospital groups, universities, and commercial dairy cooperatives.',
      color: 'border-indigo-300 bg-gradient-to-b from-indigo-50/40 via-white to-purple-50/20',
      badgeColor: 'bg-indigo-900 text-white border-indigo-900',
      features: [
        'Full Clinic Management Facility & Multi-Staff Queue',
        'Topmost Search Placement across Pakistan',
        'Holographic Diamond Badge on Search & Profile',
        'Manage Unlimited Commercial Farm Workspaces',
        'Unlimited Emergency Radar Proximity Alerts',
        'Unlimited Pet Adoption & Product Listings',
        '10 Free Billboard Promotions in News Brief',
        'Featured Spotlight on Homepage & Explore Feed',
        'VIP 24/7 Priority Support & WhatsApp Concierge'
      ]
    }
  ];

  const FAQS = [
    {
      q: 'Who is eligible to subscribe to practitioner plans?',
      a: 'Practitioner subscription plans are available for licensed Doctors of Veterinary Medicine (DVM) and certified Veterinary Clinics/Hospitals operating in Pakistan.'
    },
    {
      q: 'How does payment verification work?',
      a: 'We accept Bank Wire Transfer, JazzCash, and EasyPaisa. After initiating a plan, submit your transaction ID receipt for rapid verification by our administrative team.'
    },
    {
      q: 'What is the Clinic Management facility?',
      a: 'Our digital EHR suite allows clinics to manage outpatient appointments, maintain digital patient records, monitor triage queues, and issue electronic vaccination certificates.'
    },
    {
      q: 'Can I cancel or change my plan anytime?',
      a: 'Yes, subscriptions can be upgraded, downgraded, or cancelled at any time directly from the account portal with zero hidden fees.'
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
      
      {/* ─── Header ──────────────────────────────────────────────── */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#5a5a40]/10 text-[#5a5a40] text-xs font-black uppercase tracking-wider">
          <span>⭐</span>
          <span>Veterinary Verification &amp; Practice Plans</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-serif font-black text-stone-900 tracking-tight leading-tight">
          Accelerate Your Practice with Pakistan's Leading Veterinary Network
        </h1>
        <p className="text-sm sm:text-base text-stone-600 font-medium leading-relaxed">
          Attract pet owners seeking verified DVM care, unlock complete digital hospital management tools, and rank at the top of local directory searches.
        </p>
      </div>

      {/* ─── Pricing Cards Grid ─────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
        {PLANS.map((plan) => (
          <div
            key={plan.id}
            className={`rounded-3xl border-2 p-6 sm:p-8 flex flex-col justify-between shadow-xs relative transition-all ${plan.color} ${
              plan.popular ? 'border-b-[6px] border-b-amber-600 shadow-md ring-2 ring-amber-400/30' : 'border-b-[5px] border-b-stone-300'
            }`}
          >
            {plan.popular && (
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-amber-600 text-white text-[10px] font-black uppercase tracking-widest px-4 py-1 rounded-full shadow-sm">
                Most Popular Choice
              </div>
            )}

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border ${plan.badgeColor}`}>
                  {plan.badge}
                </span>
              </div>

              <div>
                <h3 className="text-xl font-serif font-black text-stone-900">{plan.name}</h3>
                <p className="text-xs text-stone-500 mt-1 leading-relaxed">{plan.description}</p>
              </div>

              <div className="pt-2 border-t border-stone-100">
                <span className="text-3xl sm:text-4xl font-serif font-black text-stone-900">{plan.price}</span>
                <span className="text-xs text-stone-500 ml-1.5 font-medium">{plan.period}</span>
              </div>

              <div className="space-y-2.5 pt-4 border-t border-stone-100">
                <p className="text-[11px] font-bold uppercase tracking-wider text-stone-600">Included Privileges:</p>
                {plan.features.map((feature, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs text-stone-700 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-[#5a5a40] shrink-0 mt-0.5" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-8">
              <button
                type="button"
                onClick={onSignIn}
                className={`w-full py-3.5 px-4 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-sm ${
                  plan.popular
                    ? 'bg-amber-600 hover:bg-amber-700 text-white border-b-[3px] border-b-amber-800'
                    : 'bg-[#5a5a40] hover:bg-[#4a4a34] text-white border-b-[3px] border-b-[#303022]'
                }`}
              >
                Sign In to Select Plan
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ─── Frequently Asked Questions ─────────────────────────── */}
      <div className="bg-white rounded-3xl border border-[#e3dec9] border-b-[4px] border-b-[#cdc6ad] p-6 sm:p-10 shadow-xs space-y-6">
        <div className="border-b border-stone-100 pb-4">
          <div className="flex items-center gap-2 text-[#5a5a40]">
            <HelpCircle className="w-5 h-5" />
            <h2 className="text-xl font-serif font-black text-stone-900">
              Subscription &amp; Verification FAQ
            </h2>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            Common questions regarding practitioner verification, billing cycles, and platform privileges.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {FAQS.map((faq, idx) => (
            <div key={idx} className="space-y-1.5 p-4 rounded-2xl bg-stone-50/70 border border-stone-200">
              <h4 className="text-sm font-bold text-stone-900">{faq.q}</h4>
              <p className="text-xs text-stone-600 leading-relaxed font-medium">{faq.a}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Bottom Callout ─────────────────────────────────────── */}
      <div className="bg-[#fcfaf5] border border-[#e3dec9] border-b-[4px] border-b-[#cdc6ad] rounded-3xl p-6 sm:p-8 text-center max-w-xl mx-auto space-y-3">
        <h3 className="text-lg font-serif font-black text-stone-900">
          Have Questions About Clinic Onboarding?
        </h3>
        <p className="text-xs text-stone-600 max-w-md mx-auto">
          Our verification team can assist you with bulk doctor registrations, hospital multi-staff logins, and practice profile setup.
        </p>
        <button
          type="button"
          onClick={() => onNavigate('contact')}
          className="inline-flex items-center gap-2 text-xs font-bold text-[#5a5a40] hover:underline cursor-pointer pt-1"
        >
          <span>Contact Partner Support</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

    </div>
  );
}

export default SubscriptionPricingPublic;
