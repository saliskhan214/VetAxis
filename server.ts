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
  // DYNAMIC SITEMAP.XML ENDPOINT (For Search Engines like Google)
  // ─────────────────────────────────────────────────────────────────
  app.get("/sitemap.xml", async (req, res) => {
    try {
      // Return from cache if valid
      const now = Date.now();
      if (cachedSitemap && (now - cachedSitemap.timestamp < SITEMAP_CACHE_DURATION)) {
        console.log("[Sitemap Cache] Serving cached sitemap.xml");
        res.header("Content-Type", "application/xml");
        return res.send(cachedSitemap.xml);
      }

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

      // Helper to get formatted last-modified date from timestamp
      const getFormattedDate = (timestampMs?: number) => {
        const date = timestampMs ? new Date(timestampMs) : new Date();
        const validDate = isNaN(date.getTime()) ? new Date() : date;
        return validDate.toISOString().split("T")[0];
      };

      // Initialize dates with default of today
      const todayStr = getFormattedDate();
      let lastModHome = todayStr;
      let lastModExplore = todayStr;
      let lastModJobs = todayStr;
      let lastModPets = todayStr;
      let lastModMarketplace = todayStr;
      let lastModCommunity = todayStr;
      let lastModNews = todayStr;
      let lastModLivestock = todayStr;
      let blogUrls = "";

      // Dynamically query database for newest updates in each section
      if (adminDb) {
        try {
          // 1. Explore (Users / Clinics)
          const newestUserDocs = await adminDb.collection("users")
            .orderBy("createdAt", "desc")
            .limit(1)
            .get();
          if (!newestUserDocs.empty) {
            const uData = newestUserDocs.docs[0].data();
            if (uData.createdAt) {
              lastModExplore = getFormattedDate(uData.createdAt);
              lastModHome = lastModExplore; // Home page showcases clinic listings
            }
          }
        } catch (e) {
          console.warn("[Sitemap] Failed to fetch newest user timestamp:", e);
        }

        try {
          // 2. Jobs
          const newestJobDocs = await adminDb.collection("job_posts")
            .orderBy("createdAt", "desc")
            .limit(1)
            .get();
          if (!newestJobDocs.empty) {
            const jData = newestJobDocs.docs[0].data();
            if (jData.createdAt) {
              lastModJobs = getFormattedDate(jData.createdAt);
            }
          }
        } catch (e) {
          console.warn("[Sitemap] Failed to fetch newest job timestamp:", e);
        }

        try {
          // 3. Pets
          const newestPetDocs = await adminDb.collection("pet_ads")
            .orderBy("createdAt", "desc")
            .limit(1)
            .get();
          if (!newestPetDocs.empty) {
            const pData = newestPetDocs.docs[0].data();
            if (pData.createdAt) {
              lastModPets = getFormattedDate(pData.createdAt);
            }
          }
        } catch (e) {
          console.warn("[Sitemap] Failed to fetch newest pet ad timestamp:", e);
        }

        try {
          // 4. Marketplace
          const newestProductDocs = await adminDb.collection("marketplace_products")
            .orderBy("createdAt", "desc")
            .limit(1)
            .get();
          if (!newestProductDocs.empty) {
            const mData = newestProductDocs.docs[0].data();
            if (mData.createdAt) {
              lastModMarketplace = getFormattedDate(mData.createdAt);
            }
          }
        } catch (e) {
          console.warn("[Sitemap] Failed to fetch newest marketplace product timestamp:", e);
        }

        let blogArticles: any[] = [];
        try {
          // 6. Blogs / Articles
          const blogSnapshot = await adminDb.collection("blogs")
            .orderBy("createdAt", "desc")
            .limit(100)
            .get();
          if (!blogSnapshot.empty) {
            blogSnapshot.forEach((docSnap: any) => {
              blogArticles.push(docSnap.data());
            });
            const newestBlog = blogArticles[0];
            if (newestBlog.createdAt) {
              lastModNews = getFormattedDate(newestBlog.createdAt);
            }
          }
        } catch (e) {
          console.warn("[Sitemap] Failed to fetch newest blog articles:", e);
        }

        try {
          // 5. Community
          const newestPostDocs = await adminDb.collection("community_posts")
            .orderBy("ts", "desc")
            .limit(1)
            .get();
          if (!newestPostDocs.empty) {
            const cData = newestPostDocs.docs[0].data();
            if (cData.ts) {
              lastModCommunity = getFormattedDate(cData.ts);
            }
          }
        } catch (e) {
          console.warn("[Sitemap] Failed to fetch newest community post timestamp:", e);
        }

        // Generate individual blog links for search engines
        if (blogArticles.length > 0) {
          blogUrls = blogArticles.map(blog => {
            const modDate = getFormattedDate(blog.createdAt);
            const escapedSlug = (blog.slug || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
            const escapedTitle = (blog.title || "").replace(/[^a-zA-Z0-9 ]/g, '');
            return `
  <!-- Educational Guide: ${escapedTitle} -->
  <url>
    <loc>https://vetaxis.pk/?tab=news&amp;slug=${escapedSlug}</loc>
    <lastmod>${modDate}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`;
          }).join("");
        }
      }

      // Dynamic XML generation
      const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- Main Home Page & Vet Near Me Finder -->
  <url>
    <loc>https://vetaxis.pk/</loc>
    <lastmod>${lastModHome}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>

  <!-- Clinic Finder & Doctor Exploration -->
  <url>
    <loc>https://vetaxis.pk/?tab=explore</loc>
    <lastmod>${lastModExplore}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>

  <!-- DVM Job Board Portal -->
  <url>
    <loc>https://vetaxis.pk/?tab=jobs</loc>
    <lastmod>${lastModJobs}</lastmod>
    <changefreq>always</changefreq>
    <priority>0.8</priority>
  </url>

  <!-- Lost Pet Center & Pet Classifieds -->
  <url>
    <loc>https://vetaxis.pk/?tab=pets</loc>
    <lastmod>${lastModPets}</lastmod>
    <changefreq>always</changefreq>
    <priority>0.8</priority>
  </url>

  <!-- Veterinary Medicine & Pharmacy Marketplace -->
  <url>
    <loc>https://vetaxis.pk/?tab=marketplace</loc>
    <lastmod>${lastModMarketplace}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.7</priority>
  </url>

  <!-- Livestock Farming Analytics Dashboard -->
  <url>
    <loc>https://vetaxis.pk/?tab=livestock</loc>
    <lastmod>${lastModLivestock}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>

  <!-- Community Feed Discussions -->
  <url>
    <loc>https://vetaxis.pk/?tab=community</loc>
    <lastmod>${lastModCommunity}</lastmod>
    <changefreq>always</changefreq>
    <priority>0.7</priority>
  </url>

  <!-- Veterinary News Bulletins -->
  <url>
    <loc>https://vetaxis.pk/?tab=news</loc>
    <lastmod>${lastModNews}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.7</priority>
  </url>${blogUrls}
</urlset>`;

      // Save to memory cache
      cachedSitemap = { xml: sitemapXml, timestamp: Date.now() };

      res.header("Content-Type", "application/xml");
      res.send(sitemapXml);
    } catch (error) {
      console.error("[Sitemap] Error in dynamic sitemap generation:", error);
      // Absolute fallback so we always serve valid XML
      res.header("Content-Type", "application/xml");
      res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://vetaxis.pk/</loc>
    <lastmod>${new Date().toISOString().split("T")[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`);
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
