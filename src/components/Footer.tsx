import React from 'react';
import { 
  ShieldCheck, 
  MapPin, 
  Mail, 
  ExternalLink, 
  Heart,
  Stethoscope,
  Briefcase,
  ShoppingBag,
  Sparkles,
  Layers,
  FileText,
  Lock,
  Info
} from 'lucide-react';

interface FooterProps {
  onNavigate: (section: string) => void;
  activeSection: string;
}

export function Footer({ onNavigate, activeSection }: FooterProps) {
  const currentYear = new Date().getFullYear();

  const handleNavClick = (section: string, e: React.MouseEvent) => {
    e.preventDefault();
    onNavigate(section);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="w-full bg-[#f8f6f0] border-t border-[#e3dec9] border-t-[3px] mt-16 text-[#4a4a38] text-xs">
      {/* Top Banner: Verification & Safe Navigation Notice */}
      <div className="border-b border-[#ece7d8] py-4 px-4 sm:px-8 bg-[#f3efe4]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div className="flex items-center gap-2 font-bold text-[#5a5a40]">
            <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>Pakistan's Verified Digital Veterinary &amp; Herd Healthcare Network</span>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-[#78716c]">
            <span>24/7 Emergency Directory</span>
          </div>
        </div>
      </div>

      {/* Main Multi-Column Site Navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          
          {/* Col 1: Platform Brand & Mission */}
          <div className="lg:col-span-2 space-y-3.5 pr-0 lg:pr-6">
            <div className="flex items-center gap-2">
              <span className="text-xl">🐾</span>
              <span className="text-lg font-serif font-black text-[#2b2b24]">
                VetAxis <span className="text-[#a0522d]">360</span>
              </span>
            </div>
            <p className="text-xs text-[#6e6e58] leading-relaxed max-w-md">
              Connecting pet owners, dairy herd breeders, and licensed Doctors of Veterinary Medicine (DVM) across Pakistan. Delivering 24/7 hospital discovery, digital herd tracking ledgers, and clinical career opportunities.
            </p>
            <div className="pt-2 flex flex-col gap-1.5 text-[11px] text-[#78716c]">
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-[#5a5a40]" />
                <a href="mailto:Vetaxis360@gmail.com" className="hover:underline font-medium text-[#5a5a40]">
                  Vetaxis360@gmail.com
                </a>
              </div>
            </div>
          </div>

          {/* Col 2: Veterinary Directory & Healthcare */}
          <div>
            <h4 className="font-serif font-bold text-sm text-[#2b2b24] mb-3 uppercase tracking-wider text-[11px]">
              Veterinary Services
            </h4>
            <ul className="space-y-2">
              <li>
                <button
                  onClick={(e) => handleNavClick('directory', e)}
                  className={`hover:text-[#2b2b24] hover:underline cursor-pointer text-left transition-colors font-bold text-amber-900 ${activeSection === 'directory' ? 'underline font-black' : ''}`}
                >
                  🔍 Search &amp; SEO Portal
                </button>
              </li>
              <li>
                <button
                  onClick={(e) => handleNavClick('clinical_tools', e)}
                  className={`hover:text-[#2b2b24] hover:underline cursor-pointer text-left transition-colors font-bold text-emerald-800 ${activeSection === 'clinical_tools' ? 'underline' : ''}`}
                >
                  🧮 Vet &amp; Pet Calculators
                </button>
              </li>
              <li>
                <button
                  onClick={(e) => handleNavClick('explore', e)}
                  className={`hover:text-[#2b2b24] hover:underline cursor-pointer text-left transition-colors ${activeSection === 'explore' ? 'font-bold text-[#5a5a40]' : ''}`}
                >
                  Find Clinics &amp; Doctors
                </button>
              </li>
              <li>
                <button
                  onClick={(e) => handleNavClick('livestock', e)}
                  className={`hover:text-[#2b2b24] hover:underline cursor-pointer text-left transition-colors ${activeSection === 'livestock' ? 'font-bold text-[#5a5a40]' : ''}`}
                >
                  Livestock &amp; Herd Ledgers
                </button>
              </li>
              <li>
                <button
                  onClick={(e) => handleNavClick('pet_ads', e)}
                  className={`hover:text-[#2b2b24] hover:underline cursor-pointer text-left transition-colors ${activeSection === 'pet_ads' ? 'font-bold text-[#5a5a40]' : ''}`}
                >
                  Lost &amp; Found Pets (SOS)
                </button>
              </li>
              <li>
                <button
                  onClick={(e) => handleNavClick('marketplace', e)}
                  className={`hover:text-[#2b2b24] hover:underline cursor-pointer text-left transition-colors ${activeSection === 'marketplace' ? 'font-bold text-[#5a5a40]' : ''}`}
                >
                  Veterinary Supplies &amp; Feed
                </button>
              </li>
            </ul>
          </div>

          {/* Col 3: Community & Education */}
          <div>
            <h4 className="font-serif font-bold text-sm text-[#2b2b24] mb-3 uppercase tracking-wider text-[11px]">
              Community &amp; Jobs
            </h4>
            <ul className="space-y-2">
              <li>
                <button
                  onClick={(e) => handleNavClick('jobs', e)}
                  className={`hover:text-[#2b2b24] hover:underline cursor-pointer text-left transition-colors ${activeSection === 'jobs' ? 'font-bold text-[#5a5a40]' : ''}`}
                >
                  DVM Careers &amp; Hospital Jobs
                </button>
              </li>
              <li>
                <button
                  onClick={(e) => handleNavClick('messenger', e)}
                  className={`hover:text-[#2b2b24] hover:underline cursor-pointer text-left transition-colors ${activeSection === 'messenger' ? 'font-bold text-[#5a5a40]' : ''}`}
                >
                  💬 Live Messenger
                </button>
              </li>
              <li>
                <button
                  onClick={(e) => handleNavClick('community', e)}
                  className={`hover:text-[#2b2b24] hover:underline cursor-pointer text-left transition-colors ${activeSection === 'community' ? 'font-bold text-[#5a5a40]' : ''}`}
                >
                  Community Case Feed
                </button>
              </li>
              <li>
                <button
                  onClick={(e) => handleNavClick('news', e)}
                  className={`hover:text-[#2b2b24] hover:underline cursor-pointer text-left transition-colors ${activeSection === 'news' ? 'font-bold text-[#5a5a40]' : ''}`}
                >
                  Clinical Guides &amp; News
                </button>
              </li>
              <li>
                <button
                  onClick={(e) => handleNavClick('subscription', e)}
                  className={`hover:text-[#2b2b24] hover:underline cursor-pointer text-left transition-colors ${activeSection === 'subscription' ? 'font-bold text-[#5a5a40]' : ''}`}
                >
                  Verified Clinic Membership
                </button>
              </li>
            </ul>
          </div>

          {/* Col 4: Transparency & Policies (Google AdSense Required) */}
          <div>
            <h4 className="font-serif font-bold text-sm text-[#2b2b24] mb-3 uppercase tracking-wider text-[11px]">
              Legal &amp; Transparency
            </h4>
            <ul className="space-y-2">
              <li>
                <button
                  onClick={(e) => handleNavClick('about', e)}
                  className={`hover:text-[#2b2b24] hover:underline cursor-pointer text-left transition-colors ${activeSection === 'about' ? 'font-bold text-[#5a5a40]' : ''}`}
                >
                  About VetAxis 360
                </button>
              </li>
              <li>
                <button
                  onClick={(e) => handleNavClick('terms', e)}
                  className={`hover:text-[#2b2b24] hover:underline cursor-pointer text-left transition-colors ${activeSection === 'terms' ? 'font-bold text-[#5a5a40]' : ''}`}
                >
                  Terms of Service
                </button>
              </li>
              <li>
                <button
                  onClick={(e) => handleNavClick('privacy', e)}
                  className={`hover:text-[#2b2b24] hover:underline cursor-pointer text-left transition-colors ${activeSection === 'privacy' ? 'font-bold text-[#5a5a40]' : ''}`}
                >
                  Privacy &amp; Cookie Policy
                </button>
              </li>
              <li>
                <button
                  onClick={(e) => handleNavClick('contact', e)}
                  className={`hover:text-[#2b2b24] hover:underline cursor-pointer text-left transition-colors ${activeSection === 'contact' ? 'font-bold text-[#5a5a40]' : ''}`}
                >
                  Contact &amp; Support
                </button>
              </li>
            </ul>
          </div>

        </div>

        {/* Top SEO Search Categories Strip (Google Ranked Clinical Clusters) */}
        <div className="mt-10 pt-6 border-t border-[#ece7d8] space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-[11px] font-black uppercase text-[#5a5a40] tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>Trending Veterinary Search Topics</span>
            </span>
            <button
              onClick={(e) => handleNavClick('directory', e)}
              className="text-[11px] font-bold text-[#5a5a40] hover:underline cursor-pointer flex items-center gap-1"
            >
              <span>Explore All 8 Query Categories (75+ topics)</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>

          <div className="flex flex-wrap gap-2 text-[11px]">
            {[
              { label: '🚨 24/7 Emergency Vet Near Me', target: 'explore' },
              { label: '🚶 Walk-In Animal Clinics (No Appt)', target: 'explore' },
              { label: '🏠 Mobile Vet Home Visits', target: 'explore' },
              { label: '🐈 Cat-Only Fear Free Certified', target: 'explore' },
              { label: '🦜 Exotic & Avian Bird Specialists', target: 'explore' },
              { label: '🐎 Equine & Horse Care', target: 'explore' },
              { label: '💉 Puppy Vaccinations & Deworming', target: 'clinical_tools' },
              { label: '🔬 Ultrasound & Digital X-Ray Hospitals', target: 'explore' },
              { label: '🩸 Canine Blood Test Normal Reference Chart', target: 'clinical_tools' },
              { label: '🐾 Parvovirus Symptoms Day-by-Day', target: 'clinical_tools' },
              { label: '🐱 Cat Chronic Kidney Disease (CKD) Stages', target: 'clinical_tools' },
              { label: '⚠️ Dog Bloat (GDV) Emergency Signs', target: 'clinical_tools' },
              { label: '✈️ IATA Flight Pet Crate Dimensions', target: 'clinical_tools' },
              { label: '💊 Veterinary Prescription Antibiotics Direct', target: 'marketplace' },
              { label: '🛡️ Best Flea & Tick Prevention Chewables', target: 'marketplace' },
              { label: '🐶 Verified Dog Shelter Puppies Adoption', target: 'pet_ads' },
              { label: '🐱 Rescue Cat Adoption Free Weekend', target: 'pet_ads' },
              { label: '💬 DVM Community & Radiograph Case Studies', target: 'community' },
              { label: '🎓 Accredited CE Webinars & VIN Forums', target: 'community' },
              { label: '📜 AAHA Canine Vaccine Schedule Guidelines', target: 'news' },
              { label: '📢 FDA Monthly Pet Food Recall Alerts', target: 'news' }
            ].map((topic, i) => (
              <button
                key={i}
                onClick={(e) => handleNavClick(topic.target, e)}
                className="px-2.5 py-1 rounded-lg bg-white border border-[#e3dec9] hover:border-[#5a5a40] text-stone-700 hover:text-black transition-colors cursor-pointer"
              >
                {topic.label}
              </button>
            ))}
          </div>
        </div>

        {/* Bottom Disclaimers & Copyright */}
        <div className="mt-12 pt-6 border-t border-[#ece7d8] flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-[#8c8c69]">
          <div>
            &copy; {currentYear} VetAxis 360 Healthcare Network. All rights reserved. Registered in Pakistan.
          </div>
          <div className="text-center sm:text-right">
            Independent technology directory. For critical medical emergencies, consult licensed veterinarians immediately.
          </div>
        </div>
      </div>
    </footer>
  );
}
