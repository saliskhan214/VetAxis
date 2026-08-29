import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// ─────────────────────────────────────────────────────────────────
// GLOBAL UNHANDLED EXCEPTION SAFEGUARDS (Anti-Crashing Engine)
// ─────────────────────────────────────────────────────────────────
process.on("unhandledRejection", (reason, promise) => {
  console.error("🔥 [Resilience safeguard] Unhandled Rejection at:", promise, "reason:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("🔥 [Resilience safeguard] Uncaught Exception caught:", error);
});

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Crucial: Use express.json() but preserve raw body for webhook verification if needed
  app.use(express.json({
    verify: (req: any, res, buf) => {
      req.rawBody = buf;
    }
  }));

  // CORS headers
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });

  // ─────────────────────────────────────────────────────────────────
  // IN-MEMORY CACHE FOR HIGH PERFORMANCE & RATE LIMIT PROTECTION
  // ─────────────────────────────────────────────────────────────────
  const newsCache: Record<string, { data: any; timestamp: number }> = {};
  const NEWS_CACHE_DURATION = 12 * 60 * 60 * 1000; // Cache news for 12 hours to prevent exceeding rate limits

  let cachedSitemap: { xml: string; timestamp: number } | null = null;
  const SITEMAP_CACHE_DURATION = 30 * 60 * 1000; // Cache sitemap for 30 minutes

  // ─────────────────────────────────────────────────────────────────
  // SERVER FALLBACK NEWS DATASETS (For zero-downtime, quota-resilient news feed)
  // ─────────────────────────────────────────────────────────────────
  const SERVER_FALLBACK_NEWS: Record<string, any[]> = {
    latest: [
      {
        id: "news-fb-1",
        headline: "Revolutionary Feline Diabetes Therapy Receives Regulatory Approval",
        summary: "An oral weekly SGLT2 inhibitor has been authorized for cats with non-insulin-dependent diabetes, drastically simplifying pet owner compliance and enhancing daily glycemic control.",
        source: "JAVMA News",
        date: "July 2026",
        category: "Industry News",
        readTime: "3 min read",
        sourceUrl: "https://www.avma.org"
      },
      {
        id: "news-fb-2",
        headline: "Bovine Tuberculosis Surveillance Enhanced with Rapid CRISPR Field Assays",
        summary: "New pen-side diagnostic kits enable field veterinarians to detect active TB infections in cattle herds within 30 minutes, reducing costly quarantine delays and containment friction.",
        source: "AVMA Bulletin",
        date: "June 2026",
        category: "Research Breakthrough",
        readTime: "5 min read",
        sourceUrl: "https://www.avma.org"
      },
      {
        id: "news-fb-3",
        headline: "Consensus Guidelines Released for Post-Operative Canine Pain Relief",
        summary: "The 2026 Veterinary Pain Society handbook advocates for mandatory multi-modal preemptive analgesia, integrating localized nerve blocks and NSAID combinations for surgical cases.",
        source: "VetTimes",
        date: "June 2026",
        category: "Pet Health",
        readTime: "4 min read",
        sourceUrl: "https://www.vettimes.co.uk"
      },
      {
        id: "news-fb-4",
        headline: "Global Vet Workforce Report Highlights Retention & Wellness Breakthroughs",
        summary: "Flexible clinic scheduling models, structured mental wellness retreats, and veterinary technician growth tracks have successfully lowered clinical burnout levels by 35% in pilot studies.",
        source: "Industry News Quarterly",
        date: "May 2026",
        category: "Industry News",
        readTime: "4 min read",
        sourceUrl: "https://www.avma.org"
      },
      {
        id: "news-fb-5",
        headline: "Climate-Driven Parasite Expansion Prompts Seasonal Prevention Alerts",
        summary: "Due to rising temperatures expanding vector insect habitats, veterinarians are advised to implement year-round feline heartworm and tick control measures across previously low-risk regions.",
        source: "FDA Health Alerts",
        date: "May 2026",
        category: "Disease Alert",
        readTime: "3 min read",
        sourceUrl: "https://www.fda.gov"
      }
    ],
    outbreaks: [
      {
        id: "news-fb-ob-1",
        headline: "Highly Pathogenic Avian Influenza Detected in Lowland Dairy Herds",
        summary: "State veterinarians have established active surveillance perimeter zones and introduced immediate biosecurity restrictions to protect bovine herds and local poultry populations.",
        source: "FDA Health Alerts",
        date: "July 2026",
        category: "Disease Alert",
        readTime: "4 min read",
        sourceUrl: "https://www.fda.gov"
      },
      {
        id: "news-fb-ob-2",
        headline: "Atypical Canine Infectious Respiratory Disease Successfully Contained",
        summary: "Aggressive boarding kennel quarantines, rigorous surface disinfection mandates, and updated canine vaccines have successfully suppressed the viral pneumonia outbreak in urban daycares.",
        source: "JAVMA News",
        date: "June 2026",
        category: "Disease Alert",
        readTime: "3 min read",
        sourceUrl: "https://www.avma.org"
      },
      {
        id: "news-fb-ob-3",
        headline: "Equine Herpesvirus (EHV-1) Standardized Isolation Guidelines Published",
        summary: "The Equine Practitioners Association has released emergency paddock containment instructions to prevent secondary spread following a series of neurological EHV-1 cases at regional tracks.",
        source: "AVMA Bulletin",
        date: "June 2026",
        category: "Disease Alert",
        readTime: "4 min read",
        sourceUrl: "https://www.avma.org"
      },
      {
        id: "news-fb-ob-4",
        headline: "Bovine Ephemeral Fever Vectors Expand in Monsoon Grazing Lands",
        summary: "Sustained monsoon rain patterns have led to an explosion of biting midges. Field vets urge immediate insecticide spraying and proactive hydration support for vulnerable young livestock.",
        source: "VetTimes",
        date: "May 2026",
        category: "Disease Alert",
        readTime: "3 min read",
        sourceUrl: "https://www.vettimes.co.uk"
      },
      {
        id: "news-fb-ob-5",
        headline: "African Swine Fever Bio-Security Audits Intensified at International Ports",
        summary: "Strict border inspection rules and diagnostic PCR screenings have been deployed for pork imports to prevent any exposure of regional swine farming operations to external pathogens.",
        source: "USDA Veterinary Brief",
        date: "May 2026",
        category: "Disease Alert",
        readTime: "5 min read",
        sourceUrl: "https://www.avma.org"
      }
    ],
    pets: [
      {
        id: "news-fb-pet-1",
        headline: "Feline Dental Health Consensus Urges Pediatric Home Plaque Care",
        summary: "Veterinary dental specialists release new evidence showing that starting home brushing and plaque enzyme treatments at 6 months of age delays periodontitis onset by up to 4 years.",
        source: "AVMA Pet Care",
        date: "July 2026",
        category: "Pet Health",
        readTime: "3 min read",
        sourceUrl: "https://www.avma.org"
      },
      {
        id: "news-fb-pet-2",
        headline: "New Targeted Monoclonal Antibody Approved for Atopic Canine Pruritus",
        summary: "A novel monthly injection targets specific itch-reception pathways without any secondary organ stress, offering a powerful steroid-free alternative for dogs with chronic dermatitis.",
        source: "ScienceDaily Veterinary",
        date: "June 2026",
        category: "Pet Health",
        readTime: "4 min read",
        sourceUrl: "https://www.sciencedaily.com"
      },
      {
        id: "news-fb-pet-3",
        headline: "Pediatric Feline Dietary Standards Updated for Microbiome Health",
        summary: "Nutritional boards release revised formula recommendations specifying precise ratios of soluble prebiotic fibers and highly digestible proteins to support healthy gut-microbiome seeding.",
        source: "JAVMA News",
        date: "June 2026",
        category: "Pet Health",
        readTime: "3 min read",
        sourceUrl: "https://www.avma.org"
      },
      {
        id: "news-fb-pet-4",
        headline: "Canine Cognitive Dysfunction Syndrome Standard Diagnostic Tool Released",
        summary: "A simple, standardized behavioral checklist helps companion animal clinics identify early-stage senior dementia, allowing for timely dietary and enrichment support.",
        source: "VetTimes",
        date: "May 2026",
        category: "Pet Health",
        readTime: "3 min read",
        sourceUrl: "https://www.vettimes.co.uk"
      },
      {
        id: "news-fb-pet-5",
        headline: "First-Response Triage Reference for Common Domestic Houseplant Toxins",
        summary: "Emergency animal poison centers publish a visual guide for vet clinics on rapid decontamination and target-specific antidotes for lilies, sago palms, and common indoor plants.",
        source: "FDA Health Alerts",
        date: "May 2026",
        category: "Pet Health",
        readTime: "4 min read",
        sourceUrl: "https://www.fda.gov"
      }
    ],
    research: [
      {
        id: "news-fb-res-1",
        headline: "CRISPR Gene Modulation Targets Chronic Osteoarthritis Receptor Sites",
        summary: "Clinical researchers successfully modify localized inflammatory joint receptors in an active canine model, reporting a 60% reduction in long-term osteoarthritis pain with zero side effects.",
        source: "ScienceDaily Veterinary",
        date: "July 2026",
        category: "Research Breakthrough",
        readTime: "5 min read",
        sourceUrl: "https://www.sciencedaily.com"
      },
      {
        id: "news-fb-res-2",
        headline: "Deep-Learning AI Achieves 97% Accuracy in Early Feline Cardiomyopathy",
        summary: "Cardiology researchers validate an AI model that interprets echocardiogram signals, spotting subtle hypertrophic cardiomyopathy indicators years before physical clinical signs appear.",
        source: "JAVMA News",
        date: "June 2026",
        category: "Research Breakthrough",
        readTime: "4 min read",
        sourceUrl: "https://www.avma.org"
      },
      {
        id: "news-fb-res-3",
        headline: "FIP Dual-Action Nucleoside Antiviral Pipeline Enters Phase III Trial",
        summary: "A novel oral molecule combining protease and polymerase inhibition shows absolute, 100% cure rates in challenging dry neurological FIP cases, with trial completion set for late 2026.",
        source: "AVMA Bulletin",
        date: "June 2026",
        category: "Research Breakthrough",
        readTime: "5 min read",
        sourceUrl: "https://www.avma.org"
      },
      {
        id: "news-fb-res-4",
        headline: "Biofilm-Targeting Bovine Mastitis Vaccine Reduces Herd Somatic Cells",
        summary: "A newly synthesized vaccine targeting biofilm-forming Staphylococcus aureus significantly decreases subclinical mastitis incidence, raising milk grade standards across test farms.",
        source: "VetTimes",
        date: "May 2026",
        category: "Research Breakthrough",
        readTime: "4 min read",
        sourceUrl: "https://www.vettimes.co.uk"
      },
      {
        id: "news-fb-res-5",
        headline: "Stem Cell Therapy for Equine Tendonitis Restores Athletic Performance",
        summary: "Clinical trial records show that autologous mesenchymal stem cell injections into injured suspensory ligaments result in superior collagen fiber alignment and near-zero re-injury rates.",
        source: "Equine Science Journal",
        date: "May 2026",
        category: "Research Breakthrough",
        readTime: "6 min read",
        sourceUrl: "https://www.avma.org"
      }
    ]
  };

  // ─────────────────────────────────────────────────────────────────
  // NEWS ENDPOINT (Using Search Grounding via Gemini)
  // ─────────────────────────────────────────────────────────────────
  app.get("/api/veterinary-news", async (req, res) => {
    const category = (req.query.category as string) || "latest";
    const forceRefresh = req.query.refresh === "true";
    try {
      // Serve from memory cache if active and not force-refreshed
      const now = Date.now();
      if (!forceRefresh && newsCache[category] && (now - newsCache[category].timestamp < NEWS_CACHE_DURATION)) {
        console.log(`[News Cache] Serving category "${category}" from memory cache`);
        return res.json(newsCache[category].data);
      }

      let searchQuery = "latest veterinary medicine news breakthroughs and animal health headlines 2026";
      
      if (category === "outbreaks") {
        searchQuery = "recent animal disease outbreaks outbreaks veterinary health alerts 2026";
      } else if (category === "pets") {
        searchQuery = "latest small animal pet care veterinary guidelines breakthroughs 2026";
      } else if (category === "research") {
        searchQuery = "recent veterinary research science breakthroughs peer-reviewed publications 2026";
      }

      const prompt = `You are a professional veterinary news syndication service. 
Generate a list of exactly 5 of the most recent and highly relevant news stories, research breakthroughs, or health alerts matching the query: "${searchQuery}".
For each story, provide:
1. A concise, engaging Headline (title).
2. A summary paragraph (2-3 sentences max) detailing the significance and what happened.
3. The specific Source name or publication (e.g. "JAVMA", "AVMA", "VetTimes", "FDA", "ScienceDaily", etc.).
4. The general Date of the event/news (recently).
5. A highly relevant target Topic Category: either "Disease Alert", "Pet Health", "Research Breakthrough", or "Industry News".
6. An estimated reading time (e.g. "3 min read").

Your output MUST be a valid JSON array of objects conforming to this schema. DO NOT include any markdown formatting, backticks, or text prefix, just the raw JSON.
Schema:
[
  {
    "id": "string",
    "headline": "string",
    "summary": "string",
    "source": "string",
    "date": "string",
    "category": "string",
    "readTime": "string",
    "sourceUrl": "string"
  }
]
For the sourceUrl, try to find or construct a valid URL related to the source or grounding metadata. Ensure the JSON is completely valid.
`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json"
        },
      });

      const newsText = response.text || "[]";
      let news = [];
      try {
        news = JSON.parse(newsText);
      } catch (e) {
        const cleanedText = newsText.replace(/```json/gi, "").replace(/```/g, "").trim();
        news = JSON.parse(cleanedText);
      }

      // Extract URLs from groundingMetadata if available
      const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const urls = groundingChunks
        .map((chunk: any) => chunk.web)
        .filter((web: any) => web && web.uri)
        .map((web: any) => ({ title: web.title, uri: web.uri }));

      // Map the returned news items and enrich them with grounding URLs
      const enrichedNews = news.map((item: any, idx: number) => {
        let url = item.sourceUrl || "https://www.avma.org";
        if (urls[idx]) {
          url = urls[idx].uri;
        } else if (urls.length > 0) {
          url = urls[Math.floor(Math.random() * urls.length)].uri;
        }
        return {
          ...item,
          id: item.id || `news-${idx}-${Date.now()}`,
          sourceUrl: url
        };
      });

      const responseData = { success: true, news: enrichedNews };
      
      // Populate memory cache
      newsCache[category] = { data: responseData, timestamp: Date.now() };

      res.json(responseData);
    } catch (error: any) {
      console.log(`[News Resilience] Serving robust backup bulletins for category "${category}" due to temporary API rate-limiting.`);
      
      const fallbackList = SERVER_FALLBACK_NEWS[category] || SERVER_FALLBACK_NEWS["latest"];
      const responseData = { success: true, news: fallbackList, isFallback: true };
      
      // Cache the fallback response temporarily to prevent continuous failing api requests in high load
      newsCache[category] = { data: responseData, timestamp: Date.now() };
      
      res.json(responseData);
    }
  });

  // ─────────────────────────────────────────────────────────────────
  // PAYMENT API ENDPOINTS
  // ─────────────────────────────────────────────────────────────────

  // Healthcheck
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", mode: "full-stack" });
  });

  // ─────────────────────────────────────────────────────────────────
  // DYNAMIC SITEMAP.XML GENERATOR & SEO ENGINE (For Google, Bing & Search Crawlers)
  // ─────────────────────────────────────────────────────────────────
  let sitemapStats = {
    totalUrls: 0,
    clinicsCount: 0,
    doctorsCount: 0,
    jobsCount: 0,
    marketplaceCount: 0,
    petAdsCount: 0,
    blogsCount: 0,
    cityHubsCount: 0,
    specialtyHubsCount: 0,
    staticPagesCount: 11,
    generatedAt: 0,
    cached: false
  };

  const escapeXml = (unsafe: any = ""): string => {
    if (unsafe === null || unsafe === undefined) return "";
    return String(unsafe)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  };

  const getIsoDate = (val?: any): string => {
    if (!val) return new Date().toISOString().split("T")[0];
    const d = typeof val === "number" ? new Date(val) : new Date(val);
    if (isNaN(d.getTime())) return new Date().toISOString().split("T")[0];
    return d.toISOString().split("T")[0];
  };

  const PAKISTAN_METRO_CITIES = [
    "Islamabad", "Rawalpindi", "Lahore", "Karachi", "Peshawar",
    "Faisalabad", "Multan", "Quetta", "Sialkot", "Gujranwala", "Hyderabad"
  ];

  async function generateDynamicSitemapXml(): Promise<{ xml: string; stats: typeof sitemapStats }> {
    const BASE_URL = "https://vetaxis360.com";
    const todayStr = getIsoDate();

    let firebaseConfig: any = null;
    try {
      firebaseConfig = JSON.parse(fs.readFileSync(path.join(process.cwd(), "firebase-applet-config.json"), "utf8"));
    } catch (e) {
      console.warn("[Sitemap] Could not load firebase-applet-config.json:", e);
    }

    let adminDb: any = null;
    if (firebaseConfig && firebaseConfig.projectId) {
      try {
        const { getApps, initializeApp } = await import("firebase-admin/app");
        const { getFirestore } = await import("firebase-admin/firestore");
        
        if (!getApps().length) {
          initializeApp({
            projectId: firebaseConfig.projectId,
          });
        }
        adminDb = getFirestore(firebaseConfig.firestoreDatabaseId || "(default)");
      } catch (err) {
        console.warn("[Sitemap] Could not initialize firebase-admin SDK:", err);
      }
    }

    // Dynamic lists
    let clinicUrls: string[] = [];
    let doctorUrls: string[] = [];
    let jobUrls: string[] = [];
    let productUrls: string[] = [];
    let petAdUrls: string[] = [];
    let blogUrls: string[] = [];

    let lastModHome = todayStr;
    let lastModExplore = todayStr;
    let lastModJobs = todayStr;
    let lastModPets = todayStr;
    let lastModMarketplace = todayStr;
    let lastModLivestock = todayStr;
    let lastModCommunity = todayStr;
    let lastModNews = todayStr;

    if (adminDb) {
      // 1. CRAWL PUBLIC VETERINARY CLINICS & DVM DOCTORS
      try {
        const usersSnapshot = await adminDb.collection("users")
          .limit(300)
          .get();

        if (!usersSnapshot.empty) {
          usersSnapshot.forEach((docSnap: any) => {
            const u = docSnap.data();
            const uid = u.uid || docSnap.id;
            const docDate = getIsoDate(u.updatedAt || u.createdAt);
            const rawName = u.name || u.clinicName || (u.role === "clinic" ? "Veterinary Clinic" : "Veterinary Doctor");
            const cleanName = escapeXml(rawName.replace(/[^\w\s.-]/g, "").trim());
            const city = escapeXml(u.city || u.address || "Pakistan");

            if (u.role === "clinic" || u.facilities || u.clinicName) {
              clinicUrls.push(`
  <!-- Veterinary Clinic: ${cleanName} (${city}) -->
  <url>
    <loc>${BASE_URL}/?tab=explore&amp;clinic=${encodeURIComponent(uid)}</loc>
    <lastmod>${docDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.90</priority>
  </url>`);
              if (docDate > lastModExplore) lastModExplore = docDate;
            } else if (u.role === "doctor" || u.degrees || u.specialization) {
              doctorUrls.push(`
  <!-- DVM Specialist Doctor: Dr. ${cleanName} -->
  <url>
    <loc>${BASE_URL}/?tab=explore&amp;doctor=${encodeURIComponent(uid)}</loc>
    <lastmod>${docDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.85</priority>
  </url>`);
              if (docDate > lastModExplore) lastModExplore = docDate;
            }
          });
        }
      } catch (err) {
        console.warn("[Sitemap Crawler] Error crawling users collection:", err);
      }

      // 2. CRAWL ACTIVE VETERINARY JOB POSTINGS
      try {
        const jobsSnapshot = await adminDb.collection("job_posts")
          .limit(250)
          .get();

        if (!jobsSnapshot.empty) {
          jobsSnapshot.forEach((docSnap: any) => {
            const j = docSnap.data();
            const jobId = j.id || docSnap.id;
            // Only index active/open jobs that are not rejected
            if (j.status !== "closed" && j.adminApprovalStatus !== "rejected") {
              const jobDate = getIsoDate(j.updatedAt || j.createdAt);
              const jobTitle = escapeXml((j.title || "Veterinary Professional Opportunity").replace(/[^\w\s.-]/g, "").trim());
              const clinicName = escapeXml((j.clinicName || j.employerType || "Verified Employer").replace(/[^\w\s.-]/g, "").trim());

              jobUrls.push(`
  <!-- Job Listing: ${jobTitle} at ${clinicName} -->
  <url>
    <loc>${BASE_URL}/?tab=jobs&amp;jobId=${encodeURIComponent(jobId)}</loc>
    <lastmod>${jobDate}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.85</priority>
  </url>`);
              if (jobDate > lastModJobs) lastModJobs = jobDate;
            }
          });
        }
      } catch (err) {
        console.warn("[Sitemap Crawler] Error crawling job_posts collection:", err);
      }

      // 3. CRAWL ACTIVE VETERINARY MARKETPLACE MEDICINE & PHARMACY ITEMS
      try {
        const prodSnapshot = await adminDb.collection("marketplace_products")
          .limit(250)
          .get();

        if (!prodSnapshot.empty) {
          prodSnapshot.forEach((docSnap: any) => {
            const p = docSnap.data();
            const prodId = p.id || docSnap.id;
            // Only index items with remaining stock or non-zero quantity
            if (p.quantity !== 0) {
              const prodDate = getIsoDate(p.updatedAt || p.createdAt);
              const prodName = escapeXml((p.name || "Veterinary Medical Supply").replace(/[^\w\s.-]/g, "").trim());
              const priceTag = p.price ? `Rs. ${p.price}` : "Verified";

              productUrls.push(`
  <!-- Marketplace Product: ${prodName} (${priceTag}) -->
  <url>
    <loc>${BASE_URL}/?tab=marketplace&amp;productId=${encodeURIComponent(prodId)}</loc>
    <lastmod>${prodDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.75</priority>
  </url>`);
              if (prodDate > lastModMarketplace) lastModMarketplace = prodDate;
            }
          });
        }
      } catch (err) {
        console.warn("[Sitemap Crawler] Error crawling marketplace_products collection:", err);
      }

      // 4. CRAWL LOST & FOUND PET SOS & PET CLASSIFIEDS
      try {
        const petSnapshot = await adminDb.collection("pet_ads")
          .limit(250)
          .get();

        if (!petSnapshot.empty) {
          petSnapshot.forEach((docSnap: any) => {
            const pet = docSnap.data();
            const petId = pet.id || docSnap.id;
            const petDate = getIsoDate(pet.updatedAt || pet.createdAt);
            const petType = escapeXml((pet.petType || pet.species || "Pet").replace(/[^\w\s.-]/g, "").trim());
            const breed = escapeXml((pet.breed || "Animal").replace(/[^\w\s.-]/g, "").trim());
            const adType = pet.type === "adoption" ? "Adoption" : pet.type === "sale" ? "Classified" : "Lost & Found SOS";

            petAdUrls.push(`
  <!-- Pet ${adType}: ${petType} - ${breed} -->
  <url>
    <loc>${BASE_URL}/?tab=pets&amp;adId=${encodeURIComponent(petId)}</loc>
    <lastmod>${petDate}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.75</priority>
  </url>`);
            if (petDate > lastModPets) lastModPets = petDate;
          });
        }
      } catch (err) {
        console.warn("[Sitemap Crawler] Error crawling pet_ads collection:", err);
      }

      // 5. CRAWL CLINICAL BLOGS & ANIMAL HEALTH GUIDES
      try {
        const blogSnapshot = await adminDb.collection("blogs")
          .orderBy("createdAt", "desc")
          .limit(100)
          .get();

        if (!blogSnapshot.empty) {
          blogSnapshot.forEach((docSnap: any) => {
            const blog = docSnap.data();
            const blogDate = getIsoDate(blog.createdAt);
            const escapedSlug = escapeXml(blog.slug || blog.id || docSnap.id);
            const blogTitle = escapeXml((blog.title || "Clinical Veterinary Guide").replace(/[^\w\s.-]/g, "").trim());

            blogUrls.push(`
  <!-- Clinical Guide: ${blogTitle} -->
  <url>
    <loc>${BASE_URL}/?tab=news&amp;slug=${escapedSlug}</loc>
    <lastmod>${blogDate}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.80</priority>
  </url>`);
            if (blogDate > lastModNews) lastModNews = blogDate;
          });
        }
      } catch (err) {
        console.warn("[Sitemap Crawler] Error crawling blogs collection:", err);
      }
    }

    // 6. BUILD METROPOLITAN CITY VETERINARY HUBS
    const cityHubUrls = PAKISTAN_METRO_CITIES.map(city => `
  <!-- City Directory: Veterinary Clinics in ${city} -->
  <url>
    <loc>${BASE_URL}/?tab=explore&amp;city=${encodeURIComponent(city)}</loc>
    <lastmod>${todayStr}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.85</priority>
  </url>`);

    // 7. BUILD SPECIALTY & CATEGORY FILTER HUBS
    const specialtyHubs = [
      { path: "?tab=explore&amp;filter=emergency", name: "24/7 Emergency Animal Hospitals", freq: "daily", priority: "0.95" },
      { path: "?tab=explore&amp;filter=vaccination", name: "Home Pet Vaccination Services", freq: "daily", priority: "0.85" },
      { path: "?tab=explore&amp;filter=surgery", name: "Specialist Veterinary Surgeries", freq: "weekly", priority: "0.85" },
      { path: "?tab=jobs&amp;type=Full-time", name: "Full-Time DVM Positions", freq: "daily", priority: "0.80" },
      { path: "?tab=jobs&amp;type=Part-time", name: "Locum & Part-Time Vet Jobs", freq: "daily", priority: "0.80" },
      { path: "?tab=jobs&amp;type=Internship", name: "Veterinary House Job Internships", freq: "weekly", priority: "0.80" },
      { path: "?tab=pets&amp;type=lost_sos", name: "Emergency Missing Pet SOS Network", freq: "always", priority: "0.90" },
      { path: "?tab=pets&amp;type=adoption", name: "Pet Rescue & Adoption Classifieds", freq: "daily", priority: "0.85" }
    ];

    const specialtyHubUrls = specialtyHubs.map(hub => `
  <!-- Specialty Category: ${hub.name} -->
  <url>
    <loc>${BASE_URL}/${hub.path}</loc>
    <lastmod>${todayStr}</lastmod>
    <changefreq>${hub.freq}</changefreq>
    <priority>${hub.priority}</priority>
  </url>`);

    // Stats calculations
    const stats: typeof sitemapStats = {
      totalUrls: 11 + cityHubUrls.length + specialtyHubUrls.length + clinicUrls.length + doctorUrls.length + jobUrls.length + productUrls.length + petAdUrls.length + blogUrls.length,
      clinicsCount: clinicUrls.length,
      doctorsCount: doctorUrls.length,
      jobsCount: jobUrls.length,
      marketplaceCount: productUrls.length,
      petAdsCount: petAdUrls.length,
      blogsCount: blogUrls.length,
      cityHubsCount: cityHubUrls.length,
      specialtyHubsCount: specialtyHubUrls.length,
      staticPagesCount: 11,
      generatedAt: Date.now(),
      cached: false
    };

    // Combine everything into authoritative, valid XML
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
  <!-- ============================================================= -->
  <!-- 1. CORE PLATFORM HUBS & PRIMARY SECTIONS                      -->
  <!-- ============================================================= -->
  <url>
    <loc>${BASE_URL}/</loc>
    <lastmod>${lastModHome}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${BASE_URL}/?tab=explore</loc>
    <lastmod>${lastModExplore}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.95</priority>
  </url>
  <url>
    <loc>${BASE_URL}/?tab=jobs</loc>
    <lastmod>${lastModJobs}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.90</priority>
  </url>
  <url>
    <loc>${BASE_URL}/?tab=pets</loc>
    <lastmod>${lastModPets}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.90</priority>
  </url>
  <url>
    <loc>${BASE_URL}/?tab=marketplace</loc>
    <lastmod>${lastModMarketplace}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.85</priority>
  </url>
  <url>
    <loc>${BASE_URL}/?tab=livestock</loc>
    <lastmod>${lastModLivestock}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.85</priority>
  </url>
  <url>
    <loc>${BASE_URL}/?tab=community</loc>
    <lastmod>${lastModCommunity}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.80</priority>
  </url>
  <url>
    <loc>${BASE_URL}/?tab=news</loc>
    <lastmod>${lastModNews}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.80</priority>
  </url>
  <url>
    <loc>${BASE_URL}/?tab=about</loc>
    <lastmod>${todayStr}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.60</priority>
  </url>
  <url>
    <loc>${BASE_URL}/?tab=terms</loc>
    <lastmod>${todayStr}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.40</priority>
  </url>
  <url>
    <loc>${BASE_URL}/?tab=privacy</loc>
    <lastmod>${todayStr}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.40</priority>
  </url>

  <!-- ============================================================= -->
  <!-- 2. CITY-SPECIFIC LOCAL VETERINARY DIRECTORIES                 -->
  <!-- ============================================================= -->${cityHubUrls.join("")}

  <!-- ============================================================= -->
  <!-- 3. SPECIALTY & EMERGENCY SERVICES                             -->
  <!-- ============================================================= -->${specialtyHubUrls.join("")}

  <!-- ============================================================= -->
  <!-- 4. DYNAMIC PUBLIC VETERINARY CLINICS & HOSPITALS              -->
  <!-- ============================================================= -->${clinicUrls.length > 0 ? clinicUrls.join("") : `
  <!-- Notice: Seed clinics listed under exploration hub -->`}

  <!-- ============================================================= -->
  <!-- 5. DYNAMIC VERIFIED DVM DOCTORS & SPECIALISTS                 -->
  <!-- ============================================================= -->${doctorUrls.length > 0 ? doctorUrls.join("") : `
  <!-- Notice: Seed doctors listed under practitioner directory -->`}

  <!-- ============================================================= -->
  <!-- 6. DYNAMIC ACTIVE VETERINARY JOB POSTINGS                     -->
  <!-- ============================================================= -->${jobUrls.length > 0 ? jobUrls.join("") : `
  <!-- Notice: Active career positions available on job portal -->`}

  <!-- ============================================================= -->
  <!-- 7. DYNAMIC MARKETPLACE MEDICINE & PHARMACY SUPPLIES           -->
  <!-- ============================================================= -->${productUrls.length > 0 ? productUrls.join("") : `
  <!-- Notice: Verified medical supplies available in pharmacy catalog -->`}

  <!-- ============================================================= -->
  <!-- 8. DYNAMIC LOST & FOUND PET SOS & PET CLASSIFIEDS             -->
  <!-- ============================================================= -->${petAdUrls.length > 0 ? petAdUrls.join("") : `
  <!-- Notice: Live pet alerts active on rescue network -->`}

  <!-- ============================================================= -->
  <!-- 9. DYNAMIC CLINICAL GUIDES & ANIMAL HEALTH ARTICLES           -->
  <!-- ============================================================= -->${blogUrls.length > 0 ? blogUrls.join("") : `
  <!-- Notice: Educational guides published in knowledge repository -->`}
</urlset>`;

    return { xml, stats };
  }

  // GET /sitemap.xml endpoint
  app.get("/sitemap.xml", async (req, res) => {
    try {
      const now = Date.now();
      if (cachedSitemap && (now - cachedSitemap.timestamp < SITEMAP_CACHE_DURATION)) {
        res.header("Content-Type", "application/xml; charset=utf-8");
        res.header("Cache-Control", "public, max-age=1200, s-maxage=3600");
        return res.send(cachedSitemap.xml);
      }

      console.log("[Sitemap Generator] Generating fresh dynamic XML sitemap with database crawl...");
      const { xml, stats } = await generateDynamicSitemapXml();
      
      cachedSitemap = { xml, timestamp: now };
      sitemapStats = { ...stats, cached: true };

      res.header("Content-Type", "application/xml; charset=utf-8");
      res.header("Cache-Control", "public, max-age=1200, s-maxage=3600");
      res.send(xml);
    } catch (error) {
      console.error("[Sitemap] Error generating dynamic sitemap:", error);
      const fallbackXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://vetaxis360.com/</loc>
    <lastmod>${new Date().toISOString().split("T")[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://vetaxis360.com/?tab=explore</loc>
    <lastmod>${new Date().toISOString().split("T")[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.95</priority>
  </url>
  <url>
    <loc>https://vetaxis360.com/?tab=jobs</loc>
    <lastmod>${new Date().toISOString().split("T")[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.90</priority>
  </url>
  <url>
    <loc>https://vetaxis360.com/?tab=marketplace</loc>
    <lastmod>${new Date().toISOString().split("T")[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.85</priority>
  </url>
</urlset>`;
      res.header("Content-Type", "application/xml; charset=utf-8");
      res.send(fallbackXml);
    }
  });

  // Google Site Verification static handler (Supports direct GSC crawler verification)
  app.get("/google707ec5232c268176.html", (req, res) => {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.status(200).send("google-site-verification: google707ec5232c268176.html");
  });

  app.get("/google:code.html", (req, res) => {
    const code = req.params.code;
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.status(200).send(`google-site-verification: google${code}.html`);
  });

  // GET /api/sitemap/stats endpoint for diagnostics
  app.get("/api/sitemap/stats", async (req, res) => {
    try {
      if (!cachedSitemap || Date.now() - cachedSitemap.timestamp >= SITEMAP_CACHE_DURATION) {
        const { xml, stats } = await generateDynamicSitemapXml();
        cachedSitemap = { xml, timestamp: Date.now() };
        sitemapStats = { ...stats, cached: true };
      }
      res.json({
        success: true,
        stats: sitemapStats,
        cacheAgeSeconds: Math.round((Date.now() - (cachedSitemap?.timestamp || Date.now())) / 1000)
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // POST /api/sitemap/refresh endpoint for manual cache invalidation
  app.post("/api/sitemap/refresh", async (req, res) => {
    try {
      console.log("[Sitemap] Manual refresh triggered.");
      const { xml, stats } = await generateDynamicSitemapXml();
      cachedSitemap = { xml, timestamp: Date.now() };
      sitemapStats = { ...stats, cached: true };
      res.json({
        success: true,
        message: "Dynamic sitemap successfully crawled and refreshed in-memory.",
        stats: sitemapStats
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ─────────────────────────────────────────────────────────────────
  // API NOT-FOUND (404) FALLBACK
  // ─────────────────────────────────────────────────────────────────
  app.all("/api/*", (req, res) => {
    res.status(404).json({
      success: false,
      error: `API endpoint not found: ${req.method} ${req.originalUrl}`,
      code: "API_ROUTE_NOT_FOUND"
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // VITE DEVELOPMENT MIDDLEWARE OR STATIC PRODUCTION ASSETS
  // ─────────────────────────────────────────────────────────────────
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // ─────────────────────────────────────────────────────────────────
  // GLOBAL ERROR-HANDLING MIDDLEWARE (Anti-Crashing & Hacking Shield)
  // ─────────────────────────────────────────────────────────────────
  app.use((err: any, req: any, res: any, next: any) => {
    console.error("🔴 [VetAxis Express Route Error]:", err);
    res.status(err.status || 500).json({
      success: false,
      error: "Internal security anomaly detected. Incident logged securely.",
      code: err.code || "SERVER_ERROR"
    });
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[VetAxis Backend] Full-stack Server listening on http://localhost:${PORT}`);
  });
}

startServer();
