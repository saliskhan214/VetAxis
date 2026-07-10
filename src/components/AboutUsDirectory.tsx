import { motion } from 'motion/react';
import { 
  Compass, 
  Hospital, 
  ClipboardList, 
  MessageSquare, 
  ShoppingBag, 
  Tag, 
  Briefcase, 
  CreditCard,
  X,
  ArrowRight
} from 'lucide-react';

interface AboutUsDirectoryProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (section: string) => void;
  isLoggedIn: boolean;
  onTriggerAuth?: () => void;
}

export function AboutUsDirectory({ 
  isOpen, 
  onClose, 
  onNavigate, 
  isLoggedIn, 
  onTriggerAuth 
}: AboutUsDirectoryProps) {
  if (!isOpen) return null;

  const facilities = [
    {
      id: 'explore',
      title: 'Doctors Near Me & Explore Vets',
      icon: <Compass className="w-6 h-6 text-emerald-600" />,
      tagline: 'Locate Certified Medical Professionals',
      description: 'Instantly search, find, and consult with certified veterinary doctors and clinic hospitals near your location. Filter by cities across Pakistan, view qualifications, check reviews, and connect directly via WhatsApp/Phone for physical or home-call emergencies.',
      cta: 'Explore Doctors'
    },
    {
      id: 'clinic_management',
      title: 'Clinic Management Suite',
      icon: <Hospital className="w-6 h-6 text-amber-600" />,
      tagline: 'Comprehensive EHR & Practice Software',
      description: 'A powerful cloud-based ERP designed exclusively for veterinary clinics and veterinary hospitals. Manage active consultation queues, register patient profiles with digital immunization logs, handle point-of-sale bills, and send automated client notifications.',
      cta: 'Open Clinic Desk'
    },
    {
      id: 'livestock',
      title: 'Farm & Livestock Management',
      icon: <ClipboardList className="w-6 h-6 text-teal-600" />,
      tagline: 'Record Herd Health & Pedigree Weights',
      description: 'Tailored for dairy farms, poultry operators, and livestock breeders. Keep detailed logs of individual animals, species distributions, historical health procedures, diagnostic bio-safety containment, and growth weight benchmarks with real-time analytics.',
      cta: 'Manage Livestock'
    },
    {
      id: 'community',
      title: 'Community Discussion Feed',
      icon: <MessageSquare className="w-6 h-6 text-blue-600" />,
      tagline: 'Knowledge Sharing & Emergency Support',
      description: 'Connect with a vast national network of animal breeders, pet owners, and certified practitioners. Share emergency alerts, write expert blogs on nutrition and herd safety, raise medical queries, and stay updated with live outbreaks and disease trends.',
      cta: 'Join Community'
    },
    {
      id: 'marketplace',
      title: 'Accessories & Supplies Marketplace',
      icon: <ShoppingBag className="w-6 h-6 text-indigo-600" />,
      tagline: 'Authenticated Veterinary Pharmacy & Feed',
      description: 'A dedicated marketplace to browse or list veterinary accessories, clinical instruments, organic feed packages, and critical vaccines. Built to connect sellers, pharmaceutical distributers, and clinic buyers directly and transparently.',
      cta: 'Browse Marketplace'
    },
    {
      id: 'pet_ads',
      title: 'Pet Classifieds Directory',
      icon: <Tag className="w-6 h-6 text-rose-600" />,
      tagline: 'Safe Rehoming & Livestock Commerce',
      description: 'Post and manage classified advertisements for domestic pet adoptions, companion dog/cat rehoming, and healthy livestock trading. Features instant seller information validation to ensure a secure commerce experience across Pakistan.',
      cta: 'Browse Classifieds'
    },
    {
      id: 'jobs',
      title: 'Veterinary Job Board',
      icon: <Briefcase className="w-6 h-6 text-violet-600" />,
      tagline: 'Clinical Placements & Careers',
      description: 'Bridge the professional talent gap. Veterinary clinics can post certified job placements and assistant internships. Job seekers, veterinary students, and clinical assistant technicians can upload CVs and apply to top clinics.',
      cta: 'View Careers'
    },
    {
      id: 'subscription',
      title: 'Subscription & Promotion Portal',
      icon: <CreditCard className="w-6 h-6 text-purple-600" />,
      tagline: 'Premium Vet Badges & Billboard Ads',
      description: 'Elevate your veterinary practice or clinic business. Subscribe to Premium Tiers (Silver, Gold, Platinum) to unlock verified blue checkmarks, access advanced features, and run high-visibility billboard advertisements seen by thousands of daily users.',
      cta: 'Upgrade Premium'
    }
  ];

  const handleAction = (sectionId: string) => {
    if (!isLoggedIn) {
      if (onTriggerAuth) {
        onTriggerAuth();
      }
    } else {
      onNavigate(sectionId);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-[99999] overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="bg-[#fdfbf7] rounded-3xl border border-[#e3dec9] border-b-[8px] border-b-[#cdc6ad] max-w-4xl w-full flex flex-col h-[90vh] md:h-[85vh] shadow-2xl relative text-left overflow-hidden"
      >
        {/* Header */}
        <div className="p-5 sm:p-6 bg-white border-b border-[#e3dec9] flex items-start justify-between gap-4 shrink-0">
          <div className="min-w-0 flex-1">
            <h2 className="font-serif font-black text-xl sm:text-2xl text-[#373735] flex items-center gap-2 leading-tight">
              <span>🐾</span> Platform Directory & Facilities
            </h2>
            <p className="text-[10px] sm:text-xs uppercase font-bold text-[#a49f92] tracking-wider mt-1.5">
              Explore VetAxis 360’s Core Ecosystem — Designed for Doctors, Clinics, Breeders, and Pet Owners
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full hover:bg-stone-100 border border-[#e3dec9] flex items-center justify-center transition-all cursor-pointer text-stone-600 font-bold shrink-0 mt-0.5 shadow-sm bg-white"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Grid of Facilities */}
        <div className="p-5 sm:p-6 md:p-8 overflow-y-auto flex-1 space-y-6">
          <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-4 text-emerald-800 text-xs sm:text-sm font-semibold leading-relaxed">
            🌿 <strong className="text-emerald-950 font-black">Welcome to Pakistan's Complete Animal Care Hub!</strong> VetAxis 360 acts as a comprehensive portal linking qualified veterinarians with active communities. Below is a detailed map of all the facilities we offer to enhance veterinary standards and livestock health.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {facilities.map((fac) => (
              <div 
                key={fac.id}
                className="bg-white border border-[#e3dec9] border-b-[4px] border-b-[#cdc6ad] rounded-2xl p-5 hover:bg-[#fffdfa] hover:border-[#cdc6ad] transition-all flex flex-col justify-between shadow-xs"
              >
                <div>
                  <div className="flex items-center gap-3.5 mb-3">
                    <div className="w-11 h-11 bg-[#fcf9f2] rounded-xl flex items-center justify-center border border-[#e3dec9] shrink-0 shadow-xs">
                      {fac.icon}
                    </div>
                    <div>
                      <h3 className="font-serif font-black text-[#373735] text-base leading-tight">
                        {fac.title}
                      </h3>
                      <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block mt-0.5">
                        {fac.tagline}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs sm:text-sm font-semibold text-[#5a5a40] leading-relaxed mb-4">
                    {fac.description}
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => handleAction(fac.id)}
                    className="w-full btn-tactile-3d bg-[#5a5a40] text-white hover:bg-[#3e3e2b] border-[#3e3e2b] text-xs font-black uppercase tracking-wider py-2 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>{fac.cta}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 bg-white border-t border-[#e3dec9] flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
          <p className="text-[10px] text-stone-500 font-bold uppercase tracking-wider">
            🇵🇰 Dedicated to Rural Veterinary Excellence and Companion Pet Care
          </p>
          <div className="flex items-center gap-3">
            {!isLoggedIn && (
              <span className="text-xs text-rose-600 font-extrabold bg-rose-50 border border-rose-100 px-3 py-1.5 rounded-xl">
                🔒 Sign-in required for active actions
              </span>
            )}
            <button
              type="button"
              onClick={onClose}
              className="btn-tactile-3d bg-white border-[#cdc6ad] text-[#5a5a40] hover:bg-[#fcf9f2] text-xs font-black uppercase tracking-wider px-5 py-2 cursor-pointer"
            >
              Close Directory
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
