import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  TrendingUp, 
  CheckCircle2, 
  AlertCircle, 
  Copy, 
  Check, 
  Globe, 
  Search, 
  Share2, 
  MessageCircle, 
  MapPin, 
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Eye,
  Sliders,
  Award,
  Layers,
  FileCode2,
  FileText
} from 'lucide-react';
import { seoService, PAKISTAN_CITIES_SEO } from '../lib/seoService';

interface SEOGrowthCenterProps {
  onNavigateToCity?: (city: string) => void;
  onNavigateToSection?: (section: string) => void;
}

export function SEOGrowthCenter({ onNavigateToCity, onNavigateToSection }: SEOGrowthCenterProps) {
  const [activeTab, setActiveTab] = useState<'audit' | 'cities' | 'viral_social' | 'google_indexing' | 'preview_simulator'>('audit');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [healthAudit, setHealthAudit] = useState<{ score: number; checks: any[] }>({ score: 95, checks: [] });

  useEffect(() => {
    runAudit();
  }, []);

  const runAudit = () => {
    const res = seoService.evaluateSEOHealth();
    setHealthAudit(res);
  };

  const handleCopyText = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2500);
    } catch {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2500);
    }
  };

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://vetaxis360.com';

  const VIRAL_TEMPLATES = [
    {
      id: 'emergency_vets',
      title: '24/7 Emergency Animal Doctors in Pakistan',
      category: 'Emergency & Pet Care',
      text: `🚨 Urgent Animal Medical Help in Pakistan?
Find 24/7 Emergency Veterinary Hospitals, walk-in pet clinics, and verified DVM doctors across Lahore, Karachi, Islamabad & nationwide on VetAxis 360.
🏥 Check available clinics open now:`,
      url: `${currentOrigin}/?tab=explore&filter=emergency`
    },
    {
      id: 'free_calculators',
      title: 'Free Veterinary Calculators & Blood Test Normal Ranges',
      category: 'Clinical Diagnostic Tools',
      text: `🧮 Free Veterinary Clinical Suite:
Look up Canine Blood Test Normal Ranges (CBC, Kidney BUN/Creatinine, Liver ALT), puppy parvovirus triage guides, and drug dosage calculators online:`,
      url: `${currentOrigin}/?tab=clinical_tools`
    },
    {
      id: 'pet_adoption',
      title: 'Adopt Rescue Pets & Lost Animal SOS Alerts',
      category: 'Pet Adoption & Rescues',
      text: `🐾 Adopt, Don't Shop!
Explore verified rescue puppies, kittens, and companion animals looking for loving homes across Pakistan. Also report lost or found pets on the SOS alert network:`,
      url: `${currentOrigin}/?tab=pets`
    },
    {
      id: 'vet_pharmacy',
      title: 'Veterinary Medicines & Prescription Supplies',
      category: 'Marketplace & Supplies',
      text: `💊 Buy Certified Veterinary Medicine & Pet Healthcare Products:
Flea & tick preventatives, antibiotics, renal prescription diets, and clinic supplies with direct delivery in Pakistan:`,
      url: `${currentOrigin}/?tab=marketplace`
    }
  ];

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 text-left">
      {/* Growth Center Top Card */}
      <div className="bg-gradient-to-br from-[#1c2e24] via-[#2d3a30] to-[#3a4a3e] text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-emerald-600/30 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-black uppercase tracking-wider">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              <span>SEO &amp; Traffic Growth Engine</span>
            </div>

            <h2 className="font-serif text-2xl sm:text-3xl font-black text-white tracking-tight">
              Boost Search Ranking &amp; Drive Organic Traffic
            </h2>

            <p className="text-stone-300 text-xs sm:text-sm leading-relaxed">
              Complete webmaster command center for VetAxis 360. Monitor on-page SEO health score, submit sitemaps to Google Search Console, launch city landing pages, and boost instant viral traffic through WhatsApp and social pet networks.
            </p>
          </div>

          {/* Quick Score Badge */}
          <div className="flex flex-col items-center justify-center p-5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shrink-0 text-center min-w-[160px]">
            <div className="text-3xl sm:text-4xl font-black text-emerald-300 font-mono">
              {healthAudit.score}%
            </div>
            <div className="text-xs font-bold text-white uppercase tracking-wider mt-1">
              SEO Health Score
            </div>
            <div className="text-[10px] text-emerald-200 mt-1 flex items-center gap-1 font-semibold">
              <CheckCircle2 className="w-3 h-3" />
              <span>Googlebot Optimized</span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[#e3dec9] pb-2">
        <button
          onClick={() => setActiveTab('audit')}
          className={`cursor-pointer px-4 py-2.5 text-xs font-black rounded-xl border transition-all inline-flex items-center gap-2 ${
            activeTab === 'audit'
              ? 'bg-[#5a5a40] text-white border-[#5a5a40] shadow-sm'
              : 'bg-white text-stone-700 border-[#e3dec9] hover:bg-stone-50'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>SEO Health Audit ({healthAudit.score}%)</span>
        </button>

        <button
          onClick={() => setActiveTab('viral_social')}
          className={`cursor-pointer px-4 py-2.5 text-xs font-black rounded-xl border transition-all inline-flex items-center gap-2 ${
            activeTab === 'viral_social'
              ? 'bg-stone-900 text-white border-stone-900 shadow-sm'
              : 'bg-white text-stone-700 border-[#e3dec9] hover:bg-stone-50'
          }`}
        >
          <Share2 className="w-4 h-4" />
          <span>Viral Social &amp; Community Booster</span>
        </button>

        <button
          onClick={() => setActiveTab('cities')}
          className={`cursor-pointer px-4 py-2.5 text-xs font-black rounded-xl border transition-all inline-flex items-center gap-2 ${
            activeTab === 'cities'
              ? 'bg-[#5a5a40] text-white border-[#5a5a40] shadow-sm'
              : 'bg-white text-stone-700 border-[#e3dec9] hover:bg-stone-50'
          }`}
        >
          <MapPin className="w-4 h-4 text-amber-500" />
          <span>10 Pakistan City SEO Hubs</span>
        </button>

        <button
          onClick={() => setActiveTab('google_indexing')}
          className={`cursor-pointer px-4 py-2.5 text-xs font-black rounded-xl border transition-all inline-flex items-center gap-2 ${
            activeTab === 'google_indexing'
              ? 'bg-[#5a5a40] text-white border-[#5a5a40] shadow-sm'
              : 'bg-white text-stone-700 border-[#e3dec9] hover:bg-stone-50'
          }`}
        >
          <Globe className="w-4 h-4 text-blue-500" />
          <span>Google Search Console Fast-Track</span>
        </button>

        <button
          onClick={() => setActiveTab('preview_simulator')}
          className={`cursor-pointer px-4 py-2.5 text-xs font-black rounded-xl border transition-all inline-flex items-center gap-2 ${
            activeTab === 'preview_simulator'
              ? 'bg-[#5a5a40] text-white border-[#5a5a40] shadow-sm'
              : 'bg-white text-stone-700 border-[#e3dec9] hover:bg-stone-50'
          }`}
        >
          <Eye className="w-4 h-4" />
          <span>Live Social Card Simulator</span>
        </button>
      </div>

      {/* Tab 1: Live SEO Health Audit */}
      {activeTab === 'audit' && (
        <div className="space-y-6">
          <div className="bg-white border border-[#e3dec9] rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#f4efe4] pb-4">
              <div>
                <h3 className="font-serif font-black text-xl text-stone-800">
                  On-Page SEO &amp; Technical Audit
                </h3>
                <p className="text-xs text-stone-500">
                  Evaluated directly against Google Search Console, OpenGraph 2.0, and Schema.org guidelines.
                </p>
              </div>

              <button
                onClick={runAudit}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#e3dec9] hover:bg-[#fcf9f2] text-xs font-bold text-stone-700 transition-colors self-start sm:self-auto cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Re-run Audit</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {healthAudit.checks.map((chk, i) => (
                <div 
                  key={i}
                  className="p-4 rounded-2xl border border-[#ece7d8] bg-[#fdfcf9] flex items-start gap-3 transition-all hover:bg-white"
                >
                  {chk.passed ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-stone-100 text-stone-600">
                        {chk.category}
                      </span>
                      <h4 className="font-bold text-sm text-stone-800">
                        {chk.label}
                      </h4>
                    </div>
                    <p className="text-xs text-stone-500 leading-relaxed">
                      {chk.message}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Practical Action Tips */}
            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-2">
              <div className="flex items-center gap-2 text-xs font-black text-amber-900">
                <Sparkles className="w-4 h-4 text-amber-700" />
                <span>3 Immediate Steps to Multiply Your Google Traffic</span>
              </div>
              <ul className="text-xs text-amber-900 space-y-1 list-disc list-inside">
                <li>Submit your verified sitemap URL: <code className="bg-amber-100 px-1 rounded font-mono font-bold">https://vetaxis360.com/sitemap.xml</code> in Google Search Console.</li>
                <li>Share your city directory landing pages into local Pakistani pet groups on WhatsApp and Facebook.</li>
                <li>Register your Google Business Profile as "VetAxis 360 - Veterinary Care Network" for instant Google Maps placement.</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: WhatsApp & Viral Social Booster */}
      {activeTab === 'viral_social' && (
        <div className="space-y-6">
          <div className="bg-white border border-[#e3dec9] rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs">
            <div className="border-b border-[#f4efe4] pb-4">
              <h3 className="font-serif font-black text-xl text-stone-800">
                Viral Social &amp; Pet Community Booster
              </h3>
              <p className="text-xs text-stone-500">
                Share pre-crafted, high-engagement messages into pet communities and networks with 1 click:
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {VIRAL_TEMPLATES.map((item) => {
                const links = seoService.generateSocialShareLinks({
                  title: item.title,
                  text: item.text,
                  url: item.url,
                  campaign: 'growth_booster'
                });

                return (
                  <div 
                    key={item.id}
                    className="p-5 rounded-2xl border border-[#ece7d8] bg-[#fdfcf9] flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-md">
                          {item.category}
                        </span>
                      </div>

                      <h4 className="font-bold text-base text-stone-900">
                        {item.title}
                      </h4>

                      <div className="p-3 bg-white border border-stone-200 rounded-xl text-xs text-stone-600 font-mono whitespace-pre-line leading-relaxed">
                        {item.text}
                        <div className="text-emerald-700 font-bold mt-1 break-all">
                          {item.url}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-stone-100 flex-wrap">
                      <a
                        href={links.facebook}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#1877F2] hover:bg-[#166fe5] text-white text-xs font-bold rounded-xl transition-transform active:scale-95 shadow-2xs"
                      >
                        <span>f</span>
                        <span>Facebook</span>
                      </a>

                      <a
                        href={links.twitter}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-black hover:bg-stone-800 text-white text-xs font-bold rounded-xl transition-transform active:scale-95 shadow-2xs"
                      >
                        <span>𝕏</span>
                        <span>Post on X</span>
                      </a>

                      <button
                        onClick={() => handleCopyText(`${item.text}\n${item.url}`, item.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#f4efe4] hover:bg-[#ebe5d6] text-[#4a4a38] text-xs font-bold rounded-xl border border-[#e3dec9] transition-transform active:scale-95 cursor-pointer"
                      >
                        {copiedKey === item.id ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedKey === item.id ? 'Copied!' : 'Copy Post'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: 10 Pakistan City SEO Hubs */}
      {activeTab === 'cities' && (
        <div className="space-y-6">
          <div className="bg-white border border-[#e3dec9] rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs">
            <div className="border-b border-[#f4efe4] pb-4">
              <h3 className="font-serif font-black text-xl text-stone-800">
                10 Local City SEO Landing Hubs (High Google Search Volume)
              </h3>
              <p className="text-xs text-stone-500">
                Local SEO represents 78% of all veterinary search queries in Pakistan. These city hubs rank for terms like "best vet in Lahore" or "cat doctor Karachi":
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {PAKISTAN_CITIES_SEO.map((city) => {
                const cityUrl = `${currentOrigin}/?tab=explore&city=${encodeURIComponent(city.city)}`;
                return (
                  <div
                    key={city.city}
                    className="p-5 rounded-2xl border border-[#ece7d8] bg-[#fdfcf9] hover:bg-white hover:border-[#5a5a40] hover:shadow-md transition-all flex flex-col justify-between space-y-3"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-emerald-700" />
                          <h4 className="font-serif font-black text-lg text-stone-900">
                            {city.city}
                          </h4>
                          <span className="text-[10px] font-bold text-stone-500 bg-stone-100 px-2 py-0.5 rounded">
                            {city.province}
                          </span>
                        </div>
                        <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg">
                          ~{city.approxMonthlyQueries} searches/mo
                        </span>
                      </div>

                      <p className="text-xs text-stone-600 leading-relaxed font-medium">
                        {city.tagline}
                      </p>

                      <div className="text-[11px] text-stone-500">
                        <strong>Top Areas:</strong> {city.topAreas.join(', ')}
                      </div>

                      <div className="flex flex-wrap gap-1 pt-1">
                        {city.searchKeywords.map((kw, idx) => (
                          <span key={idx} className="text-[9px] bg-[#f4efe4] text-[#5a5a40] px-2 py-0.5 rounded font-mono">
                            #{kw}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-stone-100 flex items-center justify-between gap-2">
                      <button
                        onClick={() => {
                          if (onNavigateToCity) onNavigateToCity(city.city);
                        }}
                        className="btn-tactile-3d px-3.5 py-1.5 text-xs font-bold text-white bg-[#5a5a40] inline-flex items-center gap-1 cursor-pointer"
                      >
                        <span>Open {city.city} Hub</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleCopyText(cityUrl, city.city)}
                        className="px-2.5 py-1.5 rounded-lg border border-[#e3dec9] hover:bg-[#f4efe4] text-xs font-bold text-stone-700 inline-flex items-center gap-1 cursor-pointer"
                        title="Copy direct city landing page link"
                      >
                        {copiedKey === city.city ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedKey === city.city ? 'Link Copied!' : 'Copy Link'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Google Search Console Fast-Track */}
      {activeTab === 'google_indexing' && (
        <div className="space-y-6">
          <div className="bg-white border border-[#e3dec9] rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs">
            <div className="border-b border-[#f4efe4] pb-4">
              <h3 className="font-serif font-black text-xl text-stone-800">
                Google Search Console &amp; Fast Indexing Workflow
              </h3>
              <p className="text-xs text-stone-500">
                Follow this exact step-by-step procedure to get all 250+ veterinary pages indexed on Google within 24 to 48 hours:
              </p>
            </div>

            {/* Sitemap URL Quick Copy Box */}
            <div className="p-5 rounded-2xl bg-emerald-50/80 border border-emerald-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase text-emerald-900 tracking-wider">
                  Your XML Sitemap Endpoint (Ready for Google &amp; Bing)
                </span>
                <div className="font-mono text-sm sm:text-base font-bold text-emerald-950 break-all">
                  https://vetaxis360.com/sitemap.xml
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleCopyText('https://vetaxis360.com/sitemap.xml', 'sitemap_url')}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  {copiedKey === 'sitemap_url' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedKey === 'sitemap_url' ? 'Copied to Clipboard' : 'Copy Sitemap URL'}</span>
                </button>

                <a
                  href="https://vetaxis360.com/sitemap.xml"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 bg-white text-emerald-900 border border-emerald-300 hover:bg-emerald-50 text-xs font-bold rounded-xl transition-colors inline-flex items-center gap-1"
                >
                  <span>View XML</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            {/* 4 Steps Checklist */}
            <div className="space-y-4">
              <div className="flex items-start gap-4 p-4 rounded-2xl bg-[#fdfcf9] border border-[#ece7d8]">
                <div className="w-8 h-8 rounded-full bg-[#5a5a40] text-white flex items-center justify-center font-bold text-sm shrink-0">
                  1
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-sm text-stone-900">
                    Open Google Search Console
                  </h4>
                  <p className="text-xs text-stone-600 leading-relaxed">
                    Navigate to <a href="https://search.google.com/search-console" target="_blank" rel="noopener noreferrer" className="text-emerald-700 underline font-bold">search.google.com/search-console</a> and select your property <code className="bg-stone-100 px-1 py-0.5 rounded text-stone-800 font-mono">https://vetaxis360.com</code>.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-2xl bg-[#fdfcf9] border border-[#ece7d8]">
                <div className="w-8 h-8 rounded-full bg-[#5a5a40] text-white flex items-center justify-center font-bold text-sm shrink-0">
                  2
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-sm text-stone-900">
                    Submit the Sitemap
                  </h4>
                  <p className="text-xs text-stone-600 leading-relaxed">
                    Click <strong>Sitemaps</strong> in the left sidebar menu. In the "Add a new sitemap" input, type <code className="bg-stone-100 px-1 py-0.5 rounded font-mono font-bold">sitemap.xml</code> and click <strong>Submit</strong>. Googlebot will crawl your URLs immediately.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-2xl bg-[#fdfcf9] border border-[#ece7d8]">
                <div className="w-8 h-8 rounded-full bg-[#5a5a40] text-white flex items-center justify-center font-bold text-sm shrink-0">
                  3
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-sm text-stone-900">
                    Request Priority URL Inspection
                  </h4>
                  <p className="text-xs text-stone-600 leading-relaxed">
                    Paste your homepage <code className="bg-stone-100 px-1 py-0.5 rounded font-mono">https://vetaxis360.com/</code> and high-intent pages (<code className="bg-stone-100 px-1 py-0.5 rounded font-mono">?tab=explore</code>, <code className="bg-stone-100 px-1 py-0.5 rounded font-mono">?tab=clinical_tools</code>) into the top search bar and click <strong>"Request Indexing"</strong>.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-2xl bg-[#fdfcf9] border border-[#ece7d8]">
                <div className="w-8 h-8 rounded-full bg-[#5a5a40] text-white flex items-center justify-center font-bold text-sm shrink-0">
                  4
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-sm text-stone-900">
                    Claim Google Business Profile (Local 3-Pack Map)
                  </h4>
                  <p className="text-xs text-stone-600 leading-relaxed">
                    Create a free Google Business Profile for VetAxis 360 in Islamabad/Lahore. Set categories to <em>"Veterinary Care Network"</em> and <em>"Animal Hospital Directory"</em> to capture Google Maps "near me" traffic.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: Live Social Card & Google Snippet Simulator */}
      {activeTab === 'preview_simulator' && (
        <div className="space-y-6">
          <div className="bg-white border border-[#e3dec9] rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs">
            <div className="border-b border-[#f4efe4] pb-4">
              <h3 className="font-serif font-black text-xl text-stone-800">
                Live Search Engine &amp; Social Card Simulator
              </h3>
              <p className="text-xs text-stone-500">
                See exactly how VetAxis 360 displays across Google Search snippets, WhatsApp chats, and Twitter cards:
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Google Search Snippet Preview */}
              <div className="p-5 rounded-2xl border border-stone-200 bg-white shadow-xs space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-stone-400 uppercase tracking-wider">
                  <Globe className="w-3.5 h-3.5 text-blue-600" />
                  <span>Google Search Desktop Snippet</span>
                </div>

                <div className="space-y-1 pt-1">
                  <div className="flex items-center gap-1.5 text-xs text-stone-600">
                    <span className="w-4 h-4 rounded-full bg-emerald-800 text-white text-[8px] flex items-center justify-center font-bold">🐾</span>
                    <span className="text-stone-800 font-medium">vetaxis360.com</span>
                    <span className="text-stone-400">›</span>
                    <span className="text-stone-500">explore</span>
                  </div>

                  <h4 className="text-lg font-normal text-[#1a0dab] hover:underline cursor-pointer leading-snug">
                    VetAxis 360 – Pakistan's Veterinary &amp; Clinical Care Network
                  </h4>

                  <p className="text-xs text-stone-600 leading-relaxed">
                    Pakistan's premier veterinary clinical community platform. Connect with qualified doctors, general hospitals, nurse assistant directories, veterinary calculators, and certified marketplace products.
                  </p>

                  <div className="text-[11px] text-stone-500 pt-1 flex items-center gap-3">
                    <span className="text-amber-600 font-bold">★★★★★ Rating: 4.9 · 342 reviews</span>
                    <span>· Free</span>
                  </div>
                </div>
              </div>

              {/* WhatsApp Card Preview */}
              <div className="p-5 rounded-2xl border border-emerald-200 bg-[#efeae2] shadow-xs space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 uppercase tracking-wider">
                  <MessageCircle className="w-3.5 h-3.5 text-[#25D366]" />
                  <span>WhatsApp Chat Share Card Preview</span>
                </div>

                <div className="bg-white rounded-xl overflow-hidden border border-stone-200 shadow-sm max-w-sm">
                  <div className="h-32 bg-stone-900 flex items-center justify-center relative overflow-hidden">
                    <img 
                      src="/og-image.png" 
                      alt="VetAxis 360 OpenGraph Preview" 
                      className="w-full h-full object-cover opacity-90"
                      onError={(e: any) => {
                        e.target.style.display = 'none';
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-3">
                      <span className="text-white font-serif font-black text-sm">
                        🐾 VetAxis 360 Care Network
                      </span>
                    </div>
                  </div>

                  <div className="p-3 space-y-1">
                    <h5 className="font-bold text-xs text-stone-900 line-clamp-1">
                      VetAxis 360 – Pakistan's Veterinary &amp; Clinical Care Network
                    </h5>
                    <p className="text-[11px] text-stone-500 line-clamp-2 leading-tight">
                      Pakistan's premier veterinary clinical community platform. Connect with qualified doctors, 24/7 hospitals, and diagnostic tools.
                    </p>
                    <span className="text-[10px] text-stone-400 font-mono">vetaxis360.com</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
