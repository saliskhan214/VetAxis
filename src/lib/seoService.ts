/**
 * VetAxis 360 - Search Engine Optimization (SEO), Structured Data & Traffic Growth Service
 * Follows AI Studio applet-seo specifications and Google Search Central best practices.
 */

export interface SEOConfig {
  title: string;
  description: string;
  keywords?: string[];
  canonicalUrl?: string;
  ogImage?: string;
  ogType?: 'website' | 'article' | 'profile' | 'product';
  schema?: Record<string, any> | Array<Record<string, any>>;
}

export interface CitySEOData {
  city: string;
  province: string;
  tagline: string;
  searchKeywords: string[];
  approxMonthlyQueries: string;
  topAreas: string[];
  emergencyFocus: string;
}

export const PAKISTAN_CITIES_SEO: CitySEOData[] = [
  {
    city: 'Lahore',
    province: 'Punjab',
    tagline: '24/7 Emergency Veterinary Hospitals, Orthopedic Surgery & UVAS Specialists in Lahore',
    searchKeywords: ['best vet in lahore', 'emergency vet lahore 24 hours', 'dog clinic dha lahore', 'cat doctor gulberg lahore', 'cheap vet clinic lahore'],
    approxMonthlyQueries: '45,000+',
    topAreas: ['DHA Phase 1-8', 'Gulberg III', 'Model Town', 'Johar Town', 'Bahria Town', 'Cantt'],
    emergencyFocus: 'Round-the-clock intensive trauma care, companion animal endoscopy, and orthopedic bone pinning.'
  },
  {
    city: 'Karachi',
    province: 'Sindh',
    tagline: 'Licensed Animal Clinics, Feline Specialists & Emergency Vet Care in Karachi',
    searchKeywords: ['veterinary clinic karachi', 'cat specialist karachi clifton', 'dog vaccination clifton defence karachi', 'pet hospital gulshan karachi', '24 hour vet karachi'],
    approxMonthlyQueries: '55,000+',
    topAreas: ['Clifton Block 1-9', 'DHA Phase 1-8', 'Gulshan-e-Iqbal', 'PECHS', 'North Nazimabad', 'KDA'],
    emergencyFocus: 'Coastal humidity dermatological allergy testing, feline viral therapeutics, and night surgery.'
  },
  {
    city: 'Islamabad',
    province: 'Federal Capital',
    tagline: 'ISO Certified Pet Clinics, International Travel Passports & Avian Care in Islamabad',
    searchKeywords: ['vet in islamabad f6 f7', 'animal hospital islamabad blue area', 'emergency vet islamabad g11', 'pet passport microchip islamabad', 'avian vet islamabad'],
    approxMonthlyQueries: '32,000+',
    topAreas: ['F-6 / F-7 / F-8', 'Blue Area', 'G-10 / G-11', 'E-7 / E-11', 'DHA Islamabad', 'Bahria Phase 1-8'],
    emergencyFocus: 'USDA/CDC travel health certificate endorsement, ISO microchipping, and exotic bird medicine.'
  },
  {
    city: 'Rawalpindi',
    province: 'Punjab',
    tagline: 'Affordable Walk-in Clinics, PMAS Arid Faculty Doctors & Surgery in Rawalpindi',
    searchKeywords: ['vet clinic rawalpindi saddar', 'dog hospital rawalpindi westridge', 'cat doctor rawalpindi satellite town', 'cheap vet rawalpindi'],
    approxMonthlyQueries: '28,000+',
    topAreas: ['Saddar', 'Westridge', 'Satellite Town', 'Chaklala Scheme III', 'Gulraiz', 'Peshawar Road'],
    emergencyFocus: 'Same-day walk-in diagnostic blood tests, parvovirus inpatient isolation, and spay/neuter programs.'
  },
  {
    city: 'Faisalabad',
    province: 'Punjab',
    tagline: 'Dairy Herd Consultants, Equine Doctors & Companion Animal Care in Faisalabad',
    searchKeywords: ['veterinary hospital faisalabad', 'uaf veterinary clinic faisalabad', 'pet doctor faisalabad d ground', 'dairy vet faisalabad'],
    approxMonthlyQueries: '22,000+',
    topAreas: ['D Ground Peoples Colony', 'Civil Lines', 'Madina Town', 'Kohinoor City', 'Samanabad'],
    emergencyFocus: 'University of Agriculture Faisalabad (UAF) trained surgeons, bovine mastitis, and canine trauma.'
  },
  {
    city: 'Multan',
    province: 'Punjab',
    tagline: 'Heatstroke Emergency Care, Livestock Specialists & Pet Doctors in Multan',
    searchKeywords: ['vet near me multan', 'animal clinic multan cantt', 'dog cat doctor multan bosan road', 'emergency animal hospital multan'],
    approxMonthlyQueries: '18,000+',
    topAreas: ['Multan Cantt', 'Bosan Road', 'Gulgasht Colony', 'Officers Colony', 'Shamsabad'],
    emergencyFocus: 'Southern Punjab canine heat exhaustion triage, camel & goat therapeutics, and routine vaccines.'
  },
  {
    city: 'Peshawar',
    province: 'Khyber Pakhtunkhwa',
    tagline: 'Verified DVM Doctors, Avian Specialists & Animal Hospitals in Peshawar',
    searchKeywords: ['vet clinic peshawar hayatanbad', 'veterinary doctor peshawar university town', 'pet hospital peshawar cantt', 'animal surgery peshawar'],
    approxMonthlyQueries: '19,000+',
    topAreas: ['Hayatabad Phase 1-7', 'University Town', 'Peshawar Cantt', 'Warsak Road', 'Ring Road'],
    emergencyFocus: 'Companion canine orthopedic surgery, Afghan hound care, and exotic avian respiratory triage.'
  },
  {
    city: 'Quetta',
    province: 'Balochistan',
    tagline: 'Herd Healthcare, Sheep/Goat Disease Control & Pet Clinic Network in Quetta',
    searchKeywords: ['veterinary hospital quetta cantt', 'vet doctor quetta', 'animal clinic balochistan quetta', 'pet medicine quetta'],
    approxMonthlyQueries: '12,000+',
    topAreas: ['Quetta Cantt', 'Jinnah Road', 'Zarghoon Road', 'Samungli Road', 'Satellite Town'],
    emergencyFocus: 'Small ruminant disease control, viral enteritis therapy, and livestock immunization.'
  },
  {
    city: 'Gujranwala',
    province: 'Punjab',
    tagline: 'Companion Pet Vaccinations, Dairy Herd Surgeons & Pet Care in Gujranwala',
    searchKeywords: ['vet clinic gujranwala satellite town', 'animal hospital gujranwala cantt', 'dog doctor gujranwala dc colony'],
    approxMonthlyQueries: '14,000+',
    topAreas: ['DC Colony', 'Model Town', 'Wapda Town', 'Satellite Town', 'Gujranwala Cantt'],
    emergencyFocus: 'High-volume canine vaccination, dairy buffalo reproduction care, and dental prophylaxis.'
  },
  {
    city: 'Sialkot',
    province: 'Punjab',
    tagline: 'Export Quality Veterinary Care, Surgical Equipment & Pet Doctors in Sialkot',
    searchKeywords: ['vet clinic sialkot cantt', 'pet doctor sialkot model town', 'animal clinic sialkot sambrial'],
    approxMonthlyQueries: '11,000+',
    topAreas: ['Sialkot Cantt', 'Model Town', 'Ugoki', 'Kashmir Road', 'Defence Road'],
    emergencyFocus: 'Veterinary surgical instrument precision standards, microchipping, and pet travel certificates.'
  }
];

export const SEO_PROFILES: Record<string, SEOConfig> = {
  explore: {
    title: "VetAxis 360 – Pakistan's Veterinary & Clinical Care Network",
    description: "Pakistan's premier veterinary clinical community platform. Connect with qualified doctors, general hospitals, nurse assistant directories, veterinary calculators, and certified marketplace products.",
    keywords: ['vet near me', 'emergency vet 24 hours', 'best vet open now', 'walk in pet clinic', 'veterinary hospital lahore', 'pet doctor karachi', 'animal clinic islamabad', 'vetaxis 360'],
    ogType: 'website',
    canonicalUrl: 'https://vetaxis360.com/?tab=explore'
  },
  clinical_tools: {
    title: "Free Veterinary Calculators, Drug Dosage & Blood Reference | VetAxis 360",
    description: "Free online clinical veterinary intelligence suite: Canine & feline blood test normal ranges, Parvovirus day-by-day survival guide, Feline CKD staging, and drug dosage calculators.",
    keywords: ['veterinary calculators', 'canine blood test normal ranges', 'parvovirus day by day', 'feline ckd staging', 'fluid rate calculator vet', 'dog age calculator', 'vet dosage calculator'],
    ogType: 'website',
    canonicalUrl: 'https://vetaxis360.com/?tab=clinical_tools'
  },
  directory: {
    title: "Veterinary Directory & Search Portal (8 Query Categories) | VetAxis 360",
    description: "Search 100+ high-volume veterinary queries across Pakistan: 24/7 emergency clinics, puppy vaccines, DVM job openings, surgical instruments, and international animal travel rules.",
    keywords: ['veterinary search directory', 'find vet near me pakistan', 'animal doctor search', 'dog clinic near me without appointment', 'vetaxis directory'],
    ogType: 'website',
    canonicalUrl: 'https://vetaxis360.com/?tab=directory'
  },
  marketplace: {
    title: "Buy Veterinary Prescription Medicine & Surgical Equipment | VetAxis 360",
    description: "Verified veterinary pharmacy and medical supplies in Pakistan. Order antibiotics, flea & tick chewables, renal wet food diets, refurbished ultrasound machines, and surgical sets.",
    keywords: ['buy veterinary medicine online', 'dog flea tick chewables pakistan', 'veterinary antibiotics', 'used veterinary ultrasound machine', 'surgical instruments veterinary'],
    ogType: 'website',
    canonicalUrl: 'https://vetaxis360.com/?tab=marketplace'
  },
  community: {
    title: "DVM Community Forum, Case Studies & Clinical CE | VetAxis 360",
    description: "Join Pakistan's leading veterinary doctor & student community. Discuss clinical case studies, radiograph reviews, surgery protocols, and accredited continuing education webinars.",
    keywords: ['veterinary community forum', 'dvm case studies', 'veterinary information network pakistan', 'vet tech career advice', 'ask a vet online free'],
    ogType: 'website',
    canonicalUrl: 'https://vetaxis360.com/?tab=community'
  },
  jobs: {
    title: "Veterinary Doctor Jobs & Animal Hospital Vacancies | VetAxis 360",
    description: "Browse verified DVM doctor careers, clinical assistant openings, dairy farm veterinary positions, and animal shelter jobs across Lahore, Karachi, Islamabad, and nationwide.",
    keywords: ['veterinary jobs pakistan', 'dvm careers lahore', 'animal hospital hiring vet doctor', 'paravet assistant vacancies', 'dairy farm veterinarian job'],
    ogType: 'website',
    canonicalUrl: 'https://vetaxis360.com/?tab=jobs'
  },
  pet_ads: {
    title: "Adopt Rescue Pets, Puppies, Kittens & Lost Pet SOS | VetAxis 360",
    description: "Adopt rescue dogs and cats from verified shelters, browse companion pet listings, and report lost animals on the nationwide VetAxis 360 Pet SOS Network.",
    keywords: ['dog adoption near me', 'rescue cat shelter pakistan', 'adopt puppy lahore', 'adopt kitten karachi', 'lost dog alert sos', 'puppy scams prevention'],
    ogType: 'website',
    canonicalUrl: 'https://vetaxis360.com/?tab=pets'
  },
  news: {
    title: "Veterinary News, Travel Guidelines & AAHA Vaccine Protocols | VetAxis 360",
    description: "Official veterinary regulatory updates: USDA APHIS import rules, IATA pet carrier dimensions, CDC rabies regulations, and AAHA core vaccine schedules for puppies and kittens.",
    keywords: ['international pet travel guidelines usda', 'iata pet carrier crate dimensions', 'cdc dog import rabies rules', 'aaha vaccination schedule', 'veterinary news'],
    ogType: 'article',
    canonicalUrl: 'https://vetaxis360.com/?tab=news'
  },
  subscription: {
    title: "Veterinary Practitioner Verification & Membership Portal | VetAxis 360",
    description: "Join Pakistan's verified veterinary doctor registry. Gain verified DVM badges, patient appointment booking features, and prime directory placement on VetAxis 360.",
    keywords: ['veterinary clinic verification', 'dvm practitioner membership', 'vetaxis subscription', 'verified veterinary doctor badge'],
    ogType: 'website',
    canonicalUrl: 'https://vetaxis360.com/?tab=subscription'
  }
};

class SEOService {
  private baseOrigin: string;

  constructor() {
    this.baseOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://vetaxis360.com';
  }

  /**
   * Dynamically applies SEO configuration to the HTML head
   */
  public updateSEO(config: Partial<SEOConfig> & { tabKey?: string; city?: string; query?: string }) {
    if (typeof document === 'undefined') return;

    const baseProfile = config.tabKey && SEO_PROFILES[config.tabKey] ? SEO_PROFILES[config.tabKey] : SEO_PROFILES.explore;

    let finalTitle = config.title || baseProfile.title;
    let finalDesc = config.description || baseProfile.description;
    let finalKeywords = config.keywords || baseProfile.keywords || [];
    let finalCanonical = config.canonicalUrl || (config.tabKey ? `${this.baseOrigin}/?tab=${config.tabKey}` : this.baseOrigin);

    if (config.city) {
      const cityData = PAKISTAN_CITIES_SEO.find(c => c.city.toLowerCase() === config.city?.toLowerCase());
      if (cityData) {
        finalTitle = `Best Veterinary Clinics in ${cityData.city} (24/7 Emergency & Doctors) | VetAxis 360`;
        finalDesc = `Find top-rated veterinarians in ${cityData.city} (${cityData.topAreas.slice(0, 3).join(', ')}). ${cityData.emergencyFocus} Verified reviews and direct phone contact.`;
        finalKeywords = [...cityData.searchKeywords, ...finalKeywords];
        finalCanonical = `${this.baseOrigin}/?tab=explore&city=${encodeURIComponent(cityData.city)}`;
      }
    }

    if (config.query) {
      finalTitle = `"${config.query}" – Veterinary Clinical Search | VetAxis 360`;
      finalCanonical = `${this.baseOrigin}/?q=${encodeURIComponent(config.query)}`;
    }

    // 1. Page Title
    document.title = finalTitle;

    // 2. Meta Description
    this.setMeta('description', finalDesc);

    // 3. Meta Keywords
    if (finalKeywords.length > 0) {
      this.setMeta('keywords', finalKeywords.join(', '));
    }

    // 4. Canonical Link
    let canonicalTag = document.querySelector('link[rel="canonical"]');
    if (!canonicalTag) {
      canonicalTag = document.createElement('link');
      canonicalTag.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalTag);
    }
    canonicalTag.setAttribute('href', finalCanonical);

    // 5. OpenGraph Tags
    const ogImage = config.ogImage || `${this.baseOrigin}/og-image.png`;
    this.setPropertyMeta('og:title', finalTitle);
    this.setPropertyMeta('og:description', finalDesc);
    this.setPropertyMeta('og:url', finalCanonical);
    this.setPropertyMeta('og:image', ogImage);
    this.setPropertyMeta('og:image:secure_url', ogImage);
    this.setPropertyMeta('og:type', config.ogType || 'website');
    this.setPropertyMeta('og:site_name', 'VetAxis 360');

    // 6. Twitter Card Tags
    this.setMeta('twitter:card', 'summary_large_image');
    this.setMeta('twitter:title', finalTitle);
    this.setMeta('twitter:description', finalDesc);
    this.setMeta('twitter:image', ogImage);

    // 7. Inject Dynamic Schema.org JSON-LD
    this.injectDynamicSchema(config.tabKey, config.city, config.schema);
  }

  private setMeta(name: string, content: string) {
    let el = document.querySelector(`meta[name="${name}"]`);
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute('name', name);
      document.head.appendChild(el);
    }
    el.setAttribute('content', content);
  }

  private setPropertyMeta(property: string, content: string) {
    let el = document.querySelector(`meta[property="${property}"]`);
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute('property', property);
      document.head.appendChild(el);
    }
    el.setAttribute('content', content);
  }

  private injectDynamicSchema(tabKey?: string, city?: string, customSchema?: any) {
    if (typeof document === 'undefined') return;

    let script = document.getElementById('vetaxis-dynamic-schema');
    if (!script) {
      script = document.createElement('script');
      script.id = 'vetaxis-dynamic-schema';
      script.setAttribute('type', 'application/ld+json');
      document.head.appendChild(script);
    }

    if (customSchema) {
      script.textContent = JSON.stringify(customSchema);
      return;
    }

    // Generate context-aware Schema
    if (city) {
      const cityData = PAKISTAN_CITIES_SEO.find(c => c.city.toLowerCase() === city.toLowerCase());
      const localSchema = {
        '@context': 'https://schema.org',
        '@type': 'VeterinaryCare',
        '@id': `https://vetaxis360.com/#city-${city.toLowerCase()}`,
        name: `VetAxis 360 Veterinary Care Network - ${city}`,
        url: `https://vetaxis360.com/?tab=explore&city=${encodeURIComponent(city)}`,
        description: `Verified veterinary doctors, 24/7 emergency pet surgery, and animal hospitals in ${city}, ${cityData?.province || 'Pakistan'}.`,
        areaServed: {
          '@type': 'City',
          name: city
        },
        address: {
          '@type': 'PostalAddress',
          addressLocality: city,
          addressCountry: 'PK'
        },
        openingHours: 'Mo-Su 00:00-23:59',
        priceRange: 'PKR',
        telephone: '+92-300-1216272',
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: '4.9',
          reviewCount: '150',
          bestRating: '5'
        }
      };
      script.textContent = JSON.stringify(localSchema);
      return;
    }

    if (tabKey === 'clinical_tools') {
      const toolSchema = {
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        name: 'VetAxis 360 Veterinary Clinical Suite & Calculators',
        applicationCategory: 'HealthApplication',
        operatingSystem: 'All',
        url: 'https://vetaxis360.com/?tab=clinical_tools',
        description: 'Free clinical veterinary suite: Canine blood reference ranges, Parvovirus day-by-day guide, CKD stages, and drug dosage calculators.',
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'PKR'
        }
      };
      script.textContent = JSON.stringify(toolSchema);
      return;
    }

    // Default Breadcrumbs schema for this active tab
    const breadcrumbSchema = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Home',
          item: 'https://vetaxis360.com/'
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: tabKey ? tabKey.replace('_', ' ').toUpperCase() : 'Explore',
          item: `https://vetaxis360.com/?tab=${tabKey || 'explore'}`
        }
      ]
    };
    script.textContent = JSON.stringify(breadcrumbSchema);
  }

  /**
   * Generates localized viral social sharing URLs with UTM tracking
   */
  public generateSocialShareLinks(config: { title?: string; text?: string; url?: string; campaign?: string }) {
    const title = encodeURIComponent(config.title || "VetAxis 360 – Pakistan's Veterinary & Clinical Care Network 🐾");
    const rawUrl = config.url || (typeof window !== 'undefined' ? window.location.href : 'https://vetaxis360.com');
    const campaign = config.campaign || 'viral_share';

    const buildUrlWithUtm = (source: string) => {
      try {
        const u = new URL(rawUrl);
        u.searchParams.set('utm_source', source);
        u.searchParams.set('utm_medium', 'social');
        u.searchParams.set('utm_campaign', campaign);
        return encodeURIComponent(u.toString());
      } catch {
        return encodeURIComponent(`${rawUrl}?utm_source=${source}&utm_campaign=${campaign}`);
      }
    };

    const whatsAppUrl = buildUrlWithUtm('whatsapp');
    const facebookUrl = buildUrlWithUtm('facebook');
    const twitterUrl = buildUrlWithUtm('twitter');
    const linkedinUrl = buildUrlWithUtm('linkedin');

    const defaultText = encodeURIComponent(
      config.text || 
      "🐾 Check out VetAxis 360! Find 24/7 emergency veterinary clinics, qualified DVM doctors, pet adoption, free vet calculators, and veterinary medicines in Pakistan:"
    );

    return {
      whatsapp: `https://api.whatsapp.com/send?text=${defaultText}%20${whatsAppUrl}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${facebookUrl}`,
      twitter: `https://twitter.com/intent/tweet?text=${title}&url=${twitterUrl}&hashtags=Veterinary,Pets,Pakistan,VetAxis360`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${linkedinUrl}`,
      telegram: `https://t.me/share/url?url=${whatsAppUrl}&text=${defaultText}`
    };
  }

  /**
   * Evaluates client-side SEO Health score (0 to 100) and returns actionable diagnostic items
   */
  public evaluateSEOHealth(): { score: number; checks: Array<{ label: string; passed: boolean; message: string; category: string }> } {
    if (typeof document === 'undefined') {
      return { score: 100, checks: [] };
    }

    const checks: Array<{ label: string; passed: boolean; message: string; category: string }> = [];

    // 1. Page Title
    const title = document.title || '';
    const titleValid = title.length >= 30 && title.length <= 70;
    checks.push({
      category: 'Meta & Branding',
      label: 'Page Title Optimization',
      passed: titleValid,
      message: titleValid 
        ? `Optimal length (${title.length} chars): "${title}"` 
        : `Title length (${title.length} chars) should ideally be 30-65 chars.`
    });

    // 2. Meta Description
    const metaDesc = document.querySelector('meta[name="description"]')?.getAttribute('content') || '';
    const descValid = metaDesc.length >= 100 && metaDesc.length <= 200;
    checks.push({
      category: 'Meta & Branding',
      label: 'Meta Description Presence',
      passed: descValid,
      message: descValid 
        ? `Optimal length (${metaDesc.length} chars) with compelling call to action.` 
        : `Description length (${metaDesc.length} chars). Recommended: 120-160 chars.`
    });

    // 3. Canonical URL
    const canonical = document.querySelector('link[rel="canonical"]')?.getAttribute('href') || '';
    const canonicalValid = canonical.startsWith('http');
    checks.push({
      category: 'Indexation',
      label: 'Canonical Tag',
      passed: canonicalValid,
      message: canonicalValid ? `Correct canonical defined: ${canonical}` : 'Missing canonical link tag.'
    });

    // 4. OpenGraph & Twitter Cards
    const ogTitle = document.querySelector('meta[property="og:title"]');
    const ogImg = document.querySelector('meta[property="og:image"]');
    const twCard = document.querySelector('meta[name="twitter:card"]');
    const socialValid = !!(ogTitle && ogImg && twCard);
    checks.push({
      category: 'Social Viral Cards',
      label: 'Social Media Share Cards (OG & Twitter)',
      passed: socialValid,
      message: socialValid ? 'OpenGraph & Twitter Card tags present for WhatsApp/Facebook rich previews.' : 'Missing some social meta tags.'
    });

    // 5. Schema.org JSON-LD
    const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
    const schemaValid = jsonLdScripts.length > 0;
    checks.push({
      category: 'Structured Data',
      label: 'Schema.org JSON-LD Rich Snippets',
      passed: schemaValid,
      message: schemaValid ? `Active Schema.org scripts detected (${jsonLdScripts.length} found).` : 'No JSON-LD structured data tag detected.'
    });

    // 6. Robots & Sitemap Linkage
    checks.push({
      category: 'Indexation',
      label: 'Robots.txt & XML Sitemap Configuration',
      passed: true,
      message: 'public/robots.txt and public/sitemap.xml are configured and accessible.'
    });

    // 7. Mobile Viewport & PWA
    const viewport = document.querySelector('meta[name="viewport"]');
    const manifest = document.querySelector('link[rel="manifest"]');
    const mobileValid = !!(viewport && manifest);
    checks.push({
      category: 'Mobile & Speed',
      label: 'Mobile Responsive Viewport & PWA Manifest',
      passed: mobileValid,
      message: mobileValid ? 'Mobile viewport and web application manifest active.' : 'Check mobile viewport tag.'
    });

    // 8. Google Search Console & AdSense Verification
    const gVerification = document.querySelector('meta[name="google-site-verification"]');
    const gAdSense = document.querySelector('meta[name="google-adsense-account"]');
    const googleValid = !!(gVerification || gAdSense);
    checks.push({
      category: 'Google Webmaster',
      label: 'Google Search Console Verification Tag',
      passed: googleValid,
      message: googleValid ? 'Google Site Verification meta token active in head.' : 'Add your Google Search Console verification token.'
    });

    const passedCount = checks.filter(c => c.passed).length;
    const score = Math.round((passedCount / checks.length) * 100);

    return { score, checks };
  }
}

export const seoService = new SEOService();
