import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  ShieldCheck, 
  FileText, 
  Lock, 
  Info, 
  Mail, 
  Phone, 
  MapPin, 
  CheckCircle2, 
  ArrowLeft, 
  ExternalLink,
  HelpCircle,
  MessageSquare
} from 'lucide-react';

export const TERMS_AND_CONDITIONS_TEXT = `VetAxis 360 — Terms of Service & Clinical Platform Agreement
Last Updated: June 2026

Platform: VetAxis 360 (Digital Veterinary & Herd Intelligence Ecosystem)
Operated by: VetAxis Healthcare Network

1. Acceptance of Terms
By creating an account, browsing, or utilizing any feature of VetAxis 360, you confirm that you have read, understood, and agree to be bound by these Terms of Service. If you do not agree to these terms, you must discontinue using the platform immediately. These terms apply equally to all users, including Pet Owners, Livestock Farmers, Licensed Veterinarians (DVM), Certified Clinics, and Veterinary Nursing Assistants.

2. Nature of Platform & Medical Disclaimer
VetAxis 360 is an independent technology directory, farm ledger, and clinical management ecosystem. VetAxis 360 does not directly dispense medical prescriptions, perform surgeries, or provide direct emergency clinical diagnosis. All veterinary advice, clinical procedures, treatments, and prescriptions are provided strictly by independent, licensed veterinary professionals. In acute animal emergencies, users must physically transport animals to verified 24/7 veterinary hospitals.

3. User Eligibility & Account Integrity
To register an account or interact with commercial/medical features, users must:
- Be at least 18 years of age or possess legal parental/guardian consent.
- Provide truthful, accurate, and verifiable identity and practice credentials.
- Refrain from impersonating medical professionals, registered clinics, or government regulatory bodies.
- Maintain the strict confidentiality of login credentials and immediately report any unauthorized access.

4. Roles & Professional Credential Verification
- Licensed Veterinarians (DVM): Must possess and maintain a valid registration with their respective veterinary medical regulatory boards.
- Veterinary Clinics & Hospitals: Must hold appropriate local commercial and healthcare permissions, ensure listed operating hours and emergency amenities are accurate, and maintain clinical standard operating procedures.
- Livestock Farmers & Pet Owners: Must provide genuine health records for animals listed for adoption, sale, or community tracking.

5. Marketplace & Pet Classifieds Policies
- All listings in the Veterinary Marketplace and Pet Classifieds must comply with animal welfare standards and the Prevention of Cruelty to Animals Act.
- Endangered species, poached wildlife, prohibited narcotics, expired vaccines, and counterfeit pharmaceuticals are strictly prohibited and will result in immediate permanent account termination and referral to regulatory authorities.
- VetAxis 360 acts as a directory platform; transactions and handoffs between buyers, sellers, and adopters occur directly between the respective parties.

6. Intellectual Property & Community Conduct
All proprietary code, branding, interface designs, and algorithmic tools remain the sole property of VetAxis 360. Users agree not to post defamatory, false, abusive, or harmful material on the Community Feed. VetAxis 360 reserves the right to moderate, delete, or suspend accounts that violate safety guidelines.

7. Governing Law & Jurisdiction
These Terms and Conditions are governed by applicable laws. Any legal proceedings shall be subject to the exclusive jurisdiction of the competent courts.`;

export const PRIVACY_POLICY_TEXT = `VetAxis 360 — Privacy Policy, Cookie Disclosures & Advertising Transparency
Last Updated: June 2026

Platform: VetAxis 360 (https://vetaxis360.com)
Data Protection Officer Contact: Vetaxis360@gmail.com

1. Introduction & Overview
VetAxis 360 is dedicated to safeguarding the privacy and data security of pet owners, dairy farmers, veterinarians, and clinical partners across Pakistan. This Privacy Policy outlines what information we collect, how we process it, your privacy rights, and our strict adherence to Google Search Essentials, Google AdSense Program Policies, and international data protection standards.

2. Information We Collect
We collect information to provide, maintain, and improve our veterinary healthcare services:
- Personal Account Data: Name, email address, phone number (for WhatsApp contact if opted in), city, and user role (Pet Owner, Doctor, Clinic, Farmer).
- Animal Health & Farm Records: Pet vaccination records, livestock ear-tag ledgers, lactation statistics, and medical logs inputted by owners or verified clinicians.
- Device, Log & Geolocation Data: Browser type, operating system, IP address, approximate city/region (used solely for locating nearest clinics and emergency triage), and timestamped session diagnostics.

3. Google AdSense, Third-Party Vendors & Advertising Cookies
VetAxis 360 displays third-party advertisements served by Google AdSense to fund platform infrastructure and free community veterinary services.
- Google, as a third-party vendor, uses cookies (including the DoubleClick DART cookie) to serve ads on our site based on users' visits to VetAxis 360 and other sites on the Internet.
- Users may opt out of personalized advertising by visiting Google Ads Settings (https://www.google.com/settings/ads) or through the Network Advertising Initiative opt-out page (https://optout.networkadvertising.org).
- Third-party vendors and ad networks may also collect anonymous traffic metrics via cookies and web beacons to gauge ad effectiveness.
- We strictly enforce clear spatial separation between editorial/navigation elements and ad units to prevent accidental clicks, adhering to Google Ad Placement Policies.

4. How We Use & Protect Your Information
- Facilitating direct appointments between pet owners and licensed DVM doctors.
- Processing digital QR pet passports and farm management analytics.
- Private contact details of pet owners are never sold, rented, or broadcast to third-party telemarketers.
- All stored records utilize industry-standard TLS encryption and authenticated cloud access controls.

5. User Rights & Data Deletion
Users retain full control over their personal records. You may request data access, correction, or permanent account deletion directly through your profile settings or by emailing Vetaxis360@gmail.com.

6. Policy Revisions
Any updates to this Privacy Policy will be reflected on this page with an updated timestamp. Continued use of the platform denotes acceptance of any revised policies.`;

export const ABOUT_US_TEXT = `VetAxis 360 is Pakistan's premier fully-integrated digital veterinary healthcare and clinical intelligence ecosystem. Our platform bridges the gap between active livestock breeders, independent pet owners, licensed veterinarians, qualified nursing assistants, and comprehensive clinics.

Our Core Mission
We provide a unified directory and digital infrastructure designed to meet the unique challenges of livestock husbandry and companion pet animal care across Pakistan. From rural dairy and poultry farming communities to urban veterinary centers, VetAxis 360 acts as a vital channel connecting stakeholders to certified services.

Key Service Pillars:
- Verified Practitioner Profiles: Ensuring every doctor holds proper licenses for practice.
- Proximity-based Mapping: Instantly locating the nearest clinical facilities or home emergency veterinarians.
- Comprehensive Marketplace: Access to authenticated accessories, feed supplies, and verified vaccines.
- Integrated Job Portals: Streamlining hiring and training for veterinarians and nursing personnel.
- Farm Analytics Engine: Digital ledgers, lactation logging, and vaccination timelines for commercial herd owners.`;

interface NavigablePageProps {
  onNavigate: (section: string) => void;
}

// ─────────────────────────────────────────────────────────────────
// DEDICATED FULL-PAGE: TERMS OF SERVICE
// ─────────────────────────────────────────────────────────────────
export function TermsOfServicePage({ onNavigate }: NavigablePageProps) {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 select-text">
      {/* Breadcrumb / Back button */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <button
          onClick={() => onNavigate('explore')}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-[#e3dec9] text-[#5a5a40] hover:bg-[#fcfbf9] text-xs font-bold transition-all shadow-xs cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Explore</span>
        </button>
        <span className="text-xs font-bold text-[#8c8c69] bg-[#f5f2e9] px-3 py-1 rounded-full border border-[#e3dec9]">
          Legal Document
        </span>
      </div>

      <div className="bg-white rounded-3xl border border-[#e3dec9] border-b-[6px] border-b-[#cdc6ad] p-6 sm:p-10 shadow-sm">
        <div className="flex items-center gap-3.5 pb-6 border-b border-[#f0ecdf]">
          <div className="w-12 h-12 rounded-2xl bg-[#f5f2e9] border border-[#e3dec9] flex items-center justify-center text-[#5a5a40] shrink-0">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-serif font-black text-[#2b2b24]">
              Terms of Service &amp; Clinical Platform Agreement
            </h1>
            <p className="text-xs font-semibold text-[#8c8c69] mt-0.5">
              Official agreement governing the use of VetAxis 360 in Pakistan
            </p>
          </div>
        </div>

        <div className="mt-8 space-y-6 text-[#4a4a38] text-sm sm:text-base leading-relaxed">
          {TERMS_AND_CONDITIONS_TEXT.split('\n\n').map((paragraph, idx) => {
            const isHeading = paragraph.match(/^(\d+\.|[A-Z\s]+:)/);
            if (isHeading) {
              return (
                <h2 key={idx} className="text-base sm:text-lg font-serif font-black text-[#2b2b24] pt-4 border-t border-[#f7f5ed] first:border-t-0 first:pt-0">
                  {paragraph}
                </h2>
              );
            }
            if (paragraph.startsWith('-')) {
              return (
                <ul key={idx} className="list-disc pl-6 space-y-2 text-sm text-[#4a4a38]">
                  {paragraph.split('\n').map((bullet, bIdx) => (
                    <li key={bIdx}>{bullet.replace(/^-\s*/, '')}</li>
                  ))}
                </ul>
              );
            }
            return (
              <p key={idx} className="whitespace-pre-wrap">
                {paragraph}
              </p>
            );
          })}
        </div>

        {/* Action navigation footer */}
        <div className="mt-10 pt-6 border-t border-[#f0ecdf] flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#8c8c69]">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Enforced by VetAxis Healthcare Network</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate('privacy')}
              className="text-xs font-bold text-[#5a5a40] hover:underline cursor-pointer"
            >
              View Privacy Policy →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// DEDICATED FULL-PAGE: PRIVACY POLICY (AdSense & Cookie Compliant)
// ─────────────────────────────────────────────────────────────────
export function PrivacyPolicyPage({ onNavigate }: NavigablePageProps) {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 select-text">
      {/* Breadcrumb / Back button */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <button
          onClick={() => onNavigate('explore')}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-[#e3dec9] text-[#5a5a40] hover:bg-[#fcfbf9] text-xs font-bold transition-all shadow-xs cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Explore</span>
        </button>
        <span className="text-xs font-bold text-[#8c8c69] bg-[#f5f2e9] px-3 py-1 rounded-full border border-[#e3dec9]">
          Privacy &amp; Cookie Disclosure
        </span>
      </div>

      <div className="bg-white rounded-3xl border border-[#e3dec9] border-b-[6px] border-b-[#cdc6ad] p-6 sm:p-10 shadow-sm">
        <div className="flex items-center gap-3.5 pb-6 border-b border-[#f0ecdf]">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-serif font-black text-[#2b2b24]">
              Privacy Policy &amp; Advertising Disclosures
            </h1>
            <p className="text-xs font-semibold text-[#8c8c69] mt-0.5">
              Compliant with Google AdSense, Search Essentials &amp; International Standards
            </p>
          </div>
        </div>

        {/* Highlights banner */}
        <div className="my-6 p-4 rounded-2xl bg-[#fbfaf6] border border-[#e3dec9] flex items-start gap-3 text-xs text-[#5a5a40] leading-relaxed">
          <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <strong className="text-[#2b2b24]">User Control Guarantee:</strong> We do not sell your personal animal or clinical data. Third-party advertising partners like Google utilize standard advertising cookies to provide relevant services, which you can opt out of at any time.
          </div>
        </div>

        <div className="mt-6 space-y-6 text-[#4a4a38] text-sm sm:text-base leading-relaxed">
          {PRIVACY_POLICY_TEXT.split('\n\n').map((paragraph, idx) => {
            const isHeading = paragraph.match(/^(\d+\.|[A-Z\s]+:)/);
            if (isHeading) {
              return (
                <h2 key={idx} className="text-base sm:text-lg font-serif font-black text-[#2b2b24] pt-4 border-t border-[#f7f5ed] first:border-t-0 first:pt-0">
                  {paragraph}
                </h2>
              );
            }
            if (paragraph.startsWith('-')) {
              return (
                <ul key={idx} className="list-disc pl-6 space-y-2 text-sm text-[#4a4a38]">
                  {paragraph.split('\n').map((bullet, bIdx) => (
                    <li key={bIdx}>{bullet.replace(/^-\s*/, '')}</li>
                  ))}
                </ul>
              );
            }
            return (
              <p key={idx} className="whitespace-pre-wrap">
                {paragraph}
              </p>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-[#f0ecdf] flex flex-wrap items-center justify-between gap-4">
          <div className="text-xs text-[#8c8c69]">
            Questions? Contact Data Officer: <strong className="text-[#5a5a40]">Vetaxis360@gmail.com</strong>
          </div>
          <button
            onClick={() => onNavigate('terms')}
            className="text-xs font-bold text-[#5a5a40] hover:underline cursor-pointer"
          >
            Read Terms of Service →
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// DEDICATED FULL-PAGE: ABOUT US
// ─────────────────────────────────────────────────────────────────
export function AboutUsPage({ onNavigate }: NavigablePageProps) {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 select-text">
      {/* Breadcrumb / Back button */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <button
          onClick={() => onNavigate('explore')}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-[#e3dec9] text-[#5a5a40] hover:bg-[#fcfbf9] text-xs font-bold transition-all shadow-xs cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Explore</span>
        </button>
        <span className="text-xs font-bold text-[#5a5a40] bg-[#f5f2e9] px-3 py-1 rounded-full border border-[#e3dec9]">
          Platform Overview
        </span>
      </div>

      <div className="bg-white rounded-3xl border border-[#e3dec9] border-b-[6px] border-b-[#cdc6ad] p-6 sm:p-10 shadow-sm space-y-8">
        <div className="flex items-center gap-4 pb-6 border-b border-[#f0ecdf]">
          <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-[#5a5a40] to-[#3e3e2b] text-white flex items-center justify-center shadow-md shrink-0">
            <Info className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-serif font-black text-[#2b2b24]">
              About VetAxis <span className="text-[#8c8c69]">360</span>
            </h1>
            <p className="text-xs sm:text-sm font-semibold text-[#8c8c69] mt-0.5">
              Pakistan's Leading Digital Veterinary Care &amp; Clinical Intelligence Ecosystem
            </p>
          </div>
        </div>

        {/* Mission Statement Callout */}
        <div className="p-6 rounded-2xl bg-[#fcfbf7] border border-[#e3dec9] border-l-4 border-l-[#5a5a40]">
          <h2 className="text-sm font-bold uppercase tracking-wider text-[#5a5a40] mb-2">Our Mission</h2>
          <p className="text-[#373735] text-sm sm:text-base leading-relaxed font-medium">
            To revolutionize veterinary and agricultural animal healthcare across Pakistan through accessible digital infrastructure, connecting livestock farmers and pet families with certified Doctors of Veterinary Medicine (DVM), emergency hospital networks, and verified medical resources.
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-5 rounded-2xl bg-[#fbfaf6] border border-[#e3dec9]">
            <div className="text-2xl mb-2">🩺</div>
            <h3 className="text-base font-serif font-black text-[#2b2b24]">Doctor &amp; Clinic Finder</h3>
            <p className="text-xs text-[#5a5a40] mt-1 leading-relaxed">
              Geo-targeted directory of licensed veterinarians, surgical hospitals, and 24/7 emergency trauma centers across all major Pakistani cities.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-[#fbfaf6] border border-[#e3dec9]">
            <div className="text-2xl mb-2">🐄</div>
            <h3 className="text-base font-serif font-black text-[#2b2b24]">Livestock &amp; Dairy Ledgers</h3>
            <p className="text-xs text-[#5a5a40] mt-1 leading-relaxed">
              Cloud-backed herd tracking, digital ear-tag management, lactation schedules, and automated disease alerts for commercial and rural breeders.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-[#fbfaf6] border border-[#e3dec9]">
            <div className="text-2xl mb-2">🐾</div>
            <h3 className="text-base font-serif font-black text-[#2b2b24]">Pet Rescue &amp; SOS Network</h3>
            <p className="text-xs text-[#5a5a40] mt-1 leading-relaxed">
              Instant geo-alert broadcasting for missing animals, ethical pet adoption registries, and digital QR pet vaccination passports.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-[#fbfaf6] border border-[#e3dec9]">
            <div className="text-2xl mb-2">💼</div>
            <h3 className="text-base font-serif font-black text-[#2b2b24]">Veterinary Careers &amp; Jobs</h3>
            <p className="text-xs text-[#5a5a40] mt-1 leading-relaxed">
              Dedicated career hub linking clinical hospitals with qualified DVM graduates, house job applicants, and certified veterinary nursing assistants.
            </p>
          </div>
        </div>

        {/* Professional Standards Notice */}
        <div className="p-5 rounded-2xl bg-[#f5f2e9] border border-[#e3dec9] text-xs text-[#5a5a40] space-y-2">
          <h4 className="font-bold text-[#2b2b24] uppercase tracking-wider">Professional Standards Notice:</h4>
          <p>
            VetAxis 360 operates as an independent healthcare technology platform. We encourage all practicing veterinarians and clinical facilities to maintain up-to-date regional medical licenses and adhere to rigorous professional veterinary care standards.
          </p>
        </div>

        {/* Next navigation actions */}
        <div className="pt-6 border-t border-[#f0ecdf] flex flex-wrap items-center justify-between gap-4">
          <button
            onClick={() => onNavigate('contact')}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#5a5a40] text-white text-xs font-bold hover:bg-[#3e3e2b] transition-all shadow-xs cursor-pointer"
          >
            <Mail className="w-4 h-4" />
            <span>Contact Our Team</span>
          </button>

          <div className="flex gap-4 text-xs font-bold text-[#5a5a40]">
            <button onClick={() => onNavigate('terms')} className="hover:underline cursor-pointer">Terms of Service</button>
            <span>•</span>
            <button onClick={() => onNavigate('privacy')} className="hover:underline cursor-pointer">Privacy Policy</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// DEDICATED FULL-PAGE: CONTACT & SUPPORT
// ─────────────────────────────────────────────────────────────────
export function ContactSupportPage({ onNavigate }: NavigablePageProps) {
  const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' });
  const [submittedChannel, setSubmittedChannel] = useState<'whatsapp' | 'gmail' | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const SUPPORT_EMAIL = 'Vetaxis360@gmail.com';
  const SUPPORT_WHATSAPP = '923001216272';

  const validateForm = () => {
    if (!formData.name.trim()) {
      setFormError('Please enter your full name.');
      return false;
    }
    if (!formData.email.trim() || !formData.email.includes('@')) {
      setFormError('Please enter a valid email address so we can reply.');
      return false;
    }
    if (!formData.message.trim()) {
      setFormError('Please enter your message or inquiry.');
      return false;
    }
    setFormError(null);
    return true;
  };

  const handleSendWhatsApp = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!validateForm()) return;

    const formattedMessage = 
`*VetAxis 360 - Support & Inquiry*
━━━━━━━━━━━━━━━━━━━━
*From:* ${formData.name.trim()}
*Email:* ${formData.email.trim()}
*Topic:* ${formData.subject.trim() || 'General Support & Feedback'}

*Message:*
${formData.message.trim()}`;

    const url = `https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(formattedMessage)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    setSubmittedChannel('whatsapp');
  };

  const handleSendGmail = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!validateForm()) return;

    const subjectLine = `[VetAxis Inquiry] ${formData.subject.trim() || 'Feedback from ' + formData.name.trim()}`;
    const bodyContent = 
`Hello VetAxis Support Team,

Name: ${formData.name.trim()}
Email: ${formData.email.trim()}
Topic / Category: ${formData.subject.trim() || 'General Inquiry'}

Message:
${formData.message.trim()}

---
Sent via VetAxis 360 Web Portal`;

    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${SUPPORT_EMAIL}&su=${encodeURIComponent(subjectLine)}&body=${encodeURIComponent(bodyContent)}`;
    window.open(gmailUrl, '_blank', 'noopener,noreferrer');
    setSubmittedChannel('gmail');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 select-text">
      {/* Breadcrumb / Back button */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <button
          onClick={() => onNavigate('explore')}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-[#e3dec9] text-[#5a5a40] hover:bg-[#fcfbf9] text-xs font-bold transition-all shadow-xs cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Explore</span>
        </button>
        <span className="text-xs font-bold text-[#5a5a40] bg-[#f5f2e9] px-3 py-1 rounded-full border border-[#e3dec9]">
          Support &amp; Inquiries
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Side: Contact Information Cards */}
        <div className="space-y-4">
          <div className="bg-white rounded-3xl border border-[#e3dec9] border-b-[5px] border-b-[#cdc6ad] p-6 shadow-sm">
            <h2 className="text-lg font-serif font-black text-[#2b2b24] mb-4">Official Channels</h2>
            <div className="space-y-4 text-xs sm:text-sm text-[#5a5a40]">
              <div className="flex items-start gap-3">
                <Mail className="w-4 h-4 text-[#8c8c69] shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-[#2b2b24]">Direct Email</div>
                  <a href={`mailto:${SUPPORT_EMAIL}`} className="text-[#5a5a40] hover:underline font-mono font-medium block">
                    {SUPPORT_EMAIL}
                  </a>
                  <a 
                    href={`https://mail.google.com/mail/?view=cm&fs=1&to=${SUPPORT_EMAIL}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-[#a0522d] hover:underline font-bold inline-flex items-center gap-1 mt-0.5"
                  >
                    <span>Open in Gmail</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MessageSquare className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-[#2b2b24]">Official WhatsApp</div>
                  <a 
                    href={`https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent('Hello VetAxis Support! I would like to inquire about the platform.')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-700 font-bold hover:underline inline-flex items-center gap-1 mt-0.5"
                  >
                    <span>+92 300 1216272</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  <div className="text-[11px] text-stone-500 mt-0.5">Instant live chat &amp; support desk</div>
                </div>
              </div>

              <div className="flex items-start gap-3 pt-2 border-t border-[#f0ecdf]">
                <HelpCircle className="w-4 h-4 text-[#8c8c69] shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-[#2b2b24]">Support Hours</div>
                  <div>Mon – Sat: 9:00 AM – 7:00 PM PKT</div>
                  <div className="text-[11px] text-emerald-600 font-semibold mt-0.5">Emergency SOS Online 24/7</div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#fbfaf6] rounded-3xl border border-[#e3dec9] p-5 text-xs text-[#5a5a40] space-y-2">
            <h3 className="font-bold text-[#2b2b24]">Verified Clinic &amp; DVM Inquiries</h3>
            <p>
              Are you a licensed veterinary hospital or DVM practitioner seeking verification or clinic management access? Send a note via WhatsApp or Gmail for priority review.
            </p>
          </div>
        </div>

        {/* Right Side: Message Form */}
        <div className="md:col-span-2 bg-white rounded-3xl border border-[#e3dec9] border-b-[5px] border-b-[#cdc6ad] p-6 sm:p-8 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <h2 className="text-xl font-serif font-black text-[#2b2b24]">Send an Inquiry or Feedback</h2>
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
              Direct to VetAxis Staff
            </span>
          </div>
          <p className="text-xs text-[#8c8c69] mb-5">
            Fill in your message below, then select whether you want to dispatch it via <strong>WhatsApp</strong> or <strong>Gmail</strong>.
          </p>

          {submittedChannel ? (
            <div className="p-8 text-center rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-3">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
              <h3 className="text-base font-bold">
                {submittedChannel === 'whatsapp' 
                  ? 'WhatsApp Dispatch Opened!' 
                  : 'Gmail Compose Opened!'}
              </h3>
              <p className="text-xs max-w-md mx-auto text-emerald-800 leading-relaxed">
                {submittedChannel === 'whatsapp' ? (
                  <>Your pre-filled message has been sent to the VetAxis WhatsApp Support desk (+92 300 1216272). If WhatsApp did not open automatically, check your browser pop-up permissions or tap the WhatsApp button below.</>
                ) : (
                  <>Your inquiry was prepared and addressed directly to <strong className="font-semibold">{SUPPORT_EMAIL}</strong>. Our support and compliance staff replies within 24 business hours.</>
                )}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => {
                    setSubmittedChannel(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-emerald-700 text-white text-xs font-bold hover:bg-emerald-800 transition-all cursor-pointer"
                >
                  Edit Message / Send Another
                </button>
                <button
                  onClick={() => {
                    setSubmittedChannel(null);
                    setFormData({ name: '', email: '', subject: '', message: '' });
                  }}
                  className="px-4 py-2 rounded-xl bg-white border border-emerald-300 text-emerald-800 text-xs font-bold hover:bg-emerald-100 transition-all cursor-pointer"
                >
                  Clear Form
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {formError && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold">
                  ⚠️ {formError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#2b2b24] mb-1">Your Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => {
                      setFormData({ ...formData, name: e.target.value });
                      if (formError) setFormError(null);
                    }}
                    placeholder="e.g. Dr. Ayesha Khan"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#e3dec9] bg-[#fcfbf9] text-xs font-medium text-[#2b2b24] focus:outline-hidden focus:ring-2 focus:ring-[#5a5a40]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#2b2b24] mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => {
                      setFormData({ ...formData, email: e.target.value });
                      if (formError) setFormError(null);
                    }}
                    placeholder="you@domain.com"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#e3dec9] bg-[#fcfbf9] text-xs font-medium text-[#2b2b24] focus:outline-hidden focus:ring-2 focus:ring-[#5a5a40]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2b2b24] mb-1">Topic / Subject</label>
                <input
                  type="text"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="e.g. Clinic Verification / Technical Support / Feedback"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#e3dec9] bg-[#fcfbf9] text-xs font-medium text-[#2b2b24] focus:outline-hidden focus:ring-2 focus:ring-[#5a5a40]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2b2b24] mb-1">Your Message *</label>
                <textarea
                  required
                  rows={4}
                  value={formData.message}
                  onChange={(e) => {
                    setFormData({ ...formData, message: e.target.value });
                    if (formError) setFormError(null);
                  }}
                  placeholder="Type your inquiry, support question, or feedback here..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#e3dec9] bg-[#fcfbf9] text-xs font-medium text-[#2b2b24] focus:outline-hidden focus:ring-2 focus:ring-[#5a5a40]"
                ></textarea>
              </div>

              {/* Direct Dispatch Options */}
              <div className="pt-2 border-t border-[#f0ecdf] space-y-3">
                <div className="text-[11px] font-bold uppercase text-[#5a5a40] tracking-wider">
                  Choose How To Send:
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* WhatsApp Option */}
                  <button
                    type="button"
                    onClick={handleSendWhatsApp}
                    className="flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-[#25D366] hover:bg-[#1ebd5b] text-white text-xs font-black shadow-xs transition-all cursor-pointer border-b-[3px] border-b-[#128c7e]"
                  >
                    <MessageSquare className="w-4 h-4 shrink-0" />
                    <span>Send via WhatsApp</span>
                  </button>

                  {/* Gmail Option */}
                  <button
                    type="button"
                    onClick={handleSendGmail}
                    className="flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-[#EA4335] hover:bg-[#d93829] text-white text-xs font-black shadow-xs transition-all cursor-pointer border-b-[3px] border-b-[#b82a1d]"
                  >
                    <Mail className="w-4 h-4 shrink-0" />
                    <span>Send via Gmail</span>
                  </button>
                </div>

                <div className="text-[11px] text-[#8c8c69] flex items-center justify-between">
                  <span>Messages are delivered directly to <strong>{SUPPORT_EMAIL}</strong> &amp; <strong>WhatsApp Support</strong>.</span>
                  <span>🔒 Secure &amp; Private</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// MODAL VIEW (For inline quick popups when needed)
// ─────────────────────────────────────────────────────────────────
interface LegalModalProps {
  isOpen: boolean;
  type: 'terms' | 'about';
  onClose: () => void;
}

export function LegalModal({ isOpen, type, onClose }: LegalModalProps) {
  if (!isOpen) return null;

  const content = type === 'terms' ? TERMS_AND_CONDITIONS_TEXT : ABOUT_US_TEXT;
  const title = type === 'terms' ? 'VetAxis — Terms of Service' : 'About VetAxis 360';
  const subtitle = type === 'terms' ? 'Last Updated: June 2026' : 'Pakistan\'s Premier Veterinary Network';

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-[99999] overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="bg-white rounded-3xl border border-[#e3dec9] border-b-[8px] border-b-[#cdc6ad] max-w-2xl w-full flex flex-col max-h-[90vh] md:max-h-[85vh] shadow-2xl relative text-left overflow-hidden"
      >
        {/* Header */}
        <div className="p-4 sm:p-6 bg-[#fcf9f2] border-b border-[#e3dec9] flex items-start justify-between gap-4 shrink-0">
          <div className="min-w-0 flex-1">
            <h3 className="font-serif font-black text-base sm:text-lg md:text-xl text-[#373735] flex items-center gap-1.5 leading-tight">
              <span className="shrink-0">{type === 'terms' ? '📜' : 'ℹ️'}</span>
              <span className="break-words">{title}</span>
            </h3>
            <p className="text-[9px] sm:text-[10px] uppercase font-bold text-[#a49f92] tracking-wider mt-1">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-stone-200 border border-[#e3dec9] flex items-center justify-center transition-all cursor-pointer text-stone-600 font-bold shrink-0 mt-0.5"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-4 sm:p-6 md:p-8 overflow-y-auto space-y-4 select-text">
          {content.split('\n\n').map((paragraph, idx) => {
            const isHeading = paragraph.match(/^(\d+\.|[A-Z\s]+:)/);
            if (isHeading) {
              return (
                <h4 key={idx} className="font-serif font-black text-[#373735] text-xs sm:text-sm md:text-base pt-2 first:pt-0">
                  {paragraph}
                </h4>
              );
            }
            if (paragraph.startsWith('-')) {
              return (
                <ul key={idx} className="list-disc pl-5 space-y-2 text-xs md:text-sm font-semibold text-[#5a5a40] leading-relaxed">
                  {paragraph.split('\n').map((bullet, bIdx) => (
                    <li key={bIdx}>{bullet.replace(/^-\s*/, '')}</li>
                  ))}
                </ul>
              );
            }
            return (
              <p key={idx} className="text-xs md:text-sm font-semibold text-[#5a5a40] leading-relaxed whitespace-pre-wrap">
                {paragraph}
              </p>
            );
          })}
        </div>

        {/* Footer actions */}
        <div className="p-4 sm:p-5 bg-[#fcf9f2] border-t border-[#e3dec9] flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="bg-[#5a5a40] border-[#3e3e2b] text-white hover:bg-[#3e3e2b] text-xs font-black uppercase tracking-wider px-5 sm:px-6 py-2 sm:py-2.5 rounded-xl cursor-pointer"
          >
            Acknowledge &amp; Close
          </button>
        </div>
      </motion.div>
    </div>
  );
}
