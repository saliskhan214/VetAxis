import { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Sparkles, 
  MapPin, 
  Star, 
  CheckCircle2, 
  Copy, 
  ExternalLink, 
  ShieldCheck, 
  Share2, 
  MessageCircle, 
  Award,
  ArrowRight,
  HelpCircle,
  FileCode2,
  TrendingUp
} from 'lucide-react';
import { UserProfile } from '../types';

interface GoogleBusinessProfileGuideProps {
  currentUser?: UserProfile | null;
  onNavigate?: (section: string) => void;
}

export function GoogleBusinessProfileGuide({ currentUser, onNavigate }: GoogleBusinessProfileGuideProps) {
  const [activeTab, setActiveTab] = useState<'strategy' | 'nap_tool' | 'reviews' | 'schema'>('strategy');
  
  // Interactive NAP Form States
  const [clinicName, setClinicName] = useState<string>(currentUser?.name || 'Companion Animal Clinic & Trauma Center');
  const [clinicAddress, setClinicAddress] = useState<string>(currentUser?.address || 'Sector CCA, Phase 5 DHA, Lahore');
  const [clinicPhone, setClinicPhone] = useState<string>(currentUser?.phone || '03001234567');
  const [clinicCity, setClinicCity] = useState<string>('Lahore');
  const [googleReviewLink, setGoogleReviewLink] = useState<string>('https://g.page/r/your-clinic-id/review');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    }
  };

  const whatsappReviewTemplate = `Assalam-o-Alaikum! Thank you for bringing your beloved pet to ${clinicName}. We hope they are recovering well! Could you take 30 seconds to share your feedback on Google? It helps other pet parents find emergency care: ${googleReviewLink} - Dr. ${clinicName}`;

  const generatedSchema = `{
  "@context": "https://schema.org",
  "@type": "VeterinaryCare",
  "name": "${clinicName}",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "${clinicAddress}",
    "addressLocality": "${clinicCity}",
    "addressCountry": "PK"
  },
  "telephone": "${clinicPhone}",
  "openingHours": "Mo-Su 00:00-23:59",
  "priceRange": "PKR",
  "hasMap": "https://vetaxis360.com/?tab=cities&city=${encodeURIComponent(clinicCity)}",
  "url": "https://vetaxis360.com"
}`;

  return (
    <div className="min-h-screen bg-[#121417] text-slate-100 py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Navigation Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-slate-400">
          <button 
            onClick={() => onNavigate?.('explore')} 
            className="hover:text-slate-200 transition-colors cursor-pointer"
          >
            Explore
          </button>
          <span aria-hidden="true">·</span>
          <button 
            onClick={() => onNavigate?.('radar')} 
            className="hover:text-slate-200 transition-colors cursor-pointer text-sky-400"
          >
            Smart Radar
          </button>
          <span aria-hidden="true">·</span>
          <span className="text-amber-400 font-medium">Local SEO &amp; Google Maps Playbook</span>
        </nav>

        {/* Hero Section */}
        <header className="space-y-3">
          <div className="inline-flex items-center gap-2 text-xs font-mono text-amber-400">
            <TrendingUp className="w-4 h-4" />
            <span>HOW TO CAPTURE "VET NEAR ME" SEARCHES ACROSS PAKISTAN</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight font-display text-wrap-balance">
            Google Business Profile &amp; Local 3-Pack Dominance Playbook
          </h1>

          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
            Over 72% of mobile pet emergency searches click the Google Maps Local 3-Pack. Follow this battle-tested playbook to rank your clinic at the top of Google Maps and connect with inbound pet parents.
          </p>
        </header>

        {/* Interactive Tab Switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-900 rounded-xl border border-slate-800 overflow-x-auto scrollbar-none">
          {[
            { id: 'strategy', label: '1. Ranking Factors', icon: Star },
            { id: 'nap_tool', label: '2. NAP Consistency Tool', icon: MapPin },
            { id: 'reviews', label: '3. 5-Star Review Accelerator', icon: MessageCircle },
            { id: 'schema', label: '4. Schema.org Generator', icon: FileCode2 }
          ].map((t) => {
            const Icon = t.icon;
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as any)}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 shadow-xs font-bold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab 1: Ranking Factors Strategy */}
        {activeTab === 'strategy' && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              <div className="p-6 rounded-2xl bg-[#181c22] border border-slate-800 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 font-bold font-mono">
                  01
                </div>
                <h3 className="text-base font-bold text-white">Relevance &amp; Primary Category</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Your primary category on Google Business Profile MUST be set to <strong className="text-amber-400">Veterinary Care</strong> or <strong className="text-amber-400">Animal Hospital</strong>. Secondary categories should include <em>Emergency Veterinarian</em>, <em>Veterinarian</em>, and <em>Pet Supply Store</em>.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-[#181c22] border border-slate-800 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold font-mono">
                  02
                </div>
                <h3 className="text-base font-bold text-white">Distance &amp; Geolocation Pin</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  When a pet owner searches "vet near me", Google uses their GPS radius. Ensure your clinic pin is placed exactly on your entrance door, not in the middle of a commercial roundabout, and list complete sector details (e.g., DHA Phase 5, F-7 Markaz, Clifton Block 4).
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-[#181c22] border border-slate-800 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold font-mono">
                  03
                </div>
                <h3 className="text-base font-bold text-white">Prominence &amp; Local Citations</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Google verifies prominence by scanning high-authority local directories like <strong className="text-white">VetAxis 360</strong>. Your clinic profile on VetAxis creates an authoritative clinical backlink and schema citation that signals legitimacy to Googlebot.
                </p>
              </div>

            </div>

            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>The 4 Essential Rules of Google Maps Ranking for Vets:</span>
              </h4>
              <ul className="text-xs text-slate-300 space-y-2 list-disc list-inside">
                <li>Never stuff spam keywords into your clinic name (e.g. "Dr. Ali Best Cheap Vet Lahore" can lead to suspension). Keep the real legal clinic name.</li>
                <li>Mark your operating hours accurately. If you have on-call night emergency doctors, enable the "24 hours" service attribute.</li>
                <li>Add high-resolution interior photos of your surgical suite, waiting room, and diagnostics lab. Profiles with 15+ photos receive 42% more direction requests.</li>
                <li>Always reply to every Google review within 48 hours—Google's algorithm directly favors responsive businesses.</li>
              </ul>
            </div>
          </motion.div>
        )}

        {/* Tab 2: NAP Consistency Tool */}
        {activeTab === 'nap_tool' && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="p-6 rounded-2xl bg-[#181c22] border border-slate-800 space-y-4">
              <div className="space-y-1">
                <h3 className="text-base sm:text-lg font-bold text-white">
                  NAP Consistency Auditor (Name, Address, Phone)
                </h3>
                <p className="text-xs text-slate-400">
                  Google expects your clinic details to match character-for-character across your Google Business Profile, VetAxis 360, and your social media pages.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="space-y-1">
                  <label className="text-xs text-slate-300 font-medium">Official Clinic Name</label>
                  <input
                    type="text"
                    value={clinicName}
                    onChange={(e) => setClinicName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-300 font-medium">City</label>
                  <input
                    type="text"
                    value={clinicCity}
                    onChange={(e) => setClinicCity(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200"
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs text-slate-300 font-medium">Street Address &amp; Sector</label>
                  <input
                    type="text"
                    value={clinicAddress}
                    onChange={(e) => setClinicAddress(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-300 font-medium">Phone Number (Emergency / Reception)</label>
                  <input
                    type="text"
                    value={clinicPhone}
                    onChange={(e) => setClinicPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200"
                  />
                </div>
              </div>

              {/* Standardized Citation Snippet */}
              <div className="pt-4 border-t border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400 font-medium">Your Standardized Citation Block:</span>
                  <button
                    onClick={() => copyToClipboard(`${clinicName} - ${clinicAddress}, ${clinicCity}, Pakistan · Phone: ${clinicPhone}`, 'citation')}
                    className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 font-medium transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Copy className="w-3 h-3" />
                    <span>{copiedKey === 'citation' ? 'Copied!' : 'Copy Citation'}</span>
                  </button>
                </div>
                <div className="p-3 bg-slate-900 rounded-lg font-mono text-xs text-slate-300 border border-slate-800 select-all">
                  {clinicName} - {clinicAddress}, {clinicCity}, Pakistan · Phone: {clinicPhone}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Tab 3: 5-Star Review Accelerator */}
        {activeTab === 'reviews' && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="p-6 rounded-2xl bg-[#181c22] border border-slate-800 space-y-4">
              <div className="space-y-1">
                <h3 className="text-base sm:text-lg font-bold text-white">
                  Automated WhatsApp Review Request Template
                </h3>
                <p className="text-xs text-slate-400">
                  Google Maps ranking relies heavily on review velocity and keyword mentions (e.g. "parvovirus", "surgery", "friendly doctor"). Send this polite message right after a patient visit.
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-300 font-medium">Your Google Review Direct Shortlink (from Google Business Profile dashboard):</label>
                <input
                  type="text"
                  value={googleReviewLink}
                  onChange={(e) => setGoogleReviewLink(e.target.value)}
                  placeholder="https://g.page/r/YOUR_ID/review"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 font-mono"
                />
              </div>

              <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>WhatsApp Ready Template:</span>
                  </span>
                  <button
                    onClick={() => copyToClipboard(whatsappReviewTemplate, 'wa_template')}
                    className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 font-medium transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Copy className="w-3 h-3" />
                    <span>{copiedKey === 'wa_template' ? 'Copied!' : 'Copy Template'}</span>
                  </button>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed font-sans bg-slate-950/60 p-3 rounded-lg border border-slate-800/80">
                  {whatsappReviewTemplate}
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Tab 4: Schema.org JSON-LD Generator */}
        {activeTab === 'schema' && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="p-6 rounded-2xl bg-[#181c22] border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white">
                    Verified Schema.org VeterinaryCare Code
                  </h3>
                  <p className="text-xs text-slate-400">
                    Embed this JSON-LD script into your website &lt;head&gt; to help Google search bots understand your hours, location, and clinical category.
                  </p>
                </div>
                <button
                  onClick={() => copyToClipboard(generatedSchema, 'schema_code')}
                  className="px-3.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-xs text-white font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedKey === 'schema_code' ? 'Copied!' : 'Copy JSON-LD'}</span>
                </button>
              </div>

              <pre className="p-4 bg-slate-950 rounded-xl border border-slate-800 font-mono text-xs text-sky-300 overflow-x-auto leading-relaxed">
                {generatedSchema}
              </pre>
            </div>
          </motion.div>
        )}

        {/* Bottom CTA to Smart Radar */}
        <div className="p-6 rounded-2xl bg-gradient-to-r from-sky-950/40 via-slate-900 to-slate-900 border border-sky-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-white">
              Want to see how your clinic appears to pet parents in your city?
            </h4>
            <p className="text-xs text-slate-400">
              Launch our Smart Vet Radar to test real-time GPS distance calculation and Google Maps routing.
            </p>
          </div>
          <button
            onClick={() => onNavigate?.('radar')}
            className="px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shrink-0"
          >
            <span>Launch Smart Radar</span>
            <ArrowRight className="w-4 h-4 text-slate-950" />
          </button>
        </div>

      </div>
    </div>
  );
}
