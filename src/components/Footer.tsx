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
            <span>PVMC Regulatory Adherence</span>
            <span>•</span>
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
                <MapPin className="w-3.5 h-3.5 text-[#5a5a40]" />
                <span>Headquarters: Islamabad, Capital Territory, Pakistan</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-[#5a5a40]" />
                <a href="mailto:saliskhan214@gmail.com" className="hover:underline font-medium text-[#5a5a40]">
                  saliskhan214@gmail.com
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
