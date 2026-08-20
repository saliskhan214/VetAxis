import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  addDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  increment,
  getDoc
} from 'firebase/firestore';
import { db, isFirebaseConfigured, handleFirestoreError, OperationType } from './firebase';
import { BlogArticle } from '../types';

const LOCAL_BLOGS_KEY = 'va_blogs';

const DEFAULT_BLOGS: BlogArticle[] = [
  {
    id: 'seed-1',
    title: 'Preventative Healthcare Guidelines for Dairy Cattle in Summer',
    slug: 'preventative-healthcare-dairy-cattle-summer',
    category: 'Livestock Health',
    summary: 'Discover critical management guidelines to protect your dairy herd from summer heat stress, maximize milk yield, and avoid common seasonal infections.',
    imageUrl: 'https://images.unsplash.com/photo-1570042225831-d98fa7577f1e?auto=format&fit=crop&w=800&q=80',
    content: `# Preventative Healthcare Guidelines for Dairy Cattle in Summer

Heat stress is one of the most critical challenges facing dairy farming in warm regions. When temperatures rise above 25°C, especially combined with high humidity, dairy cows begin to suffer from heat-related complications. This leads to reduced feed intake, decreased milk yields, lower conception rates, and increased susceptibility to infectious diseases.

Here is an advanced preventative healthcare protocol to maintain herd health and production standards during peak summer months.

## 1. Recognizing Early Signs of Heat Stress
Veterinary practitioners and farm managers must monitor the herd closely for early behavioral and physiological changes:
* **Mild Stress**: Respiration rate of 60–80 breaths per minute. Cows spend more time standing up.
* **Moderate Stress**: Respiration rate of 80–100 breaths per minute. Drooling, head extended, and noticeably reduced feed intake.
* **Severe Stress**: Respiration rate exceeding 100 breaths per minute. Open-mouth breathing, tongue protruding, and severe lethargy.

## 2. Dynamic Cooling Systems & Infrastructure
Providing basic shade is no longer sufficient for high-yielding dairy cattle.
* **Active Cooling**: Combine overhead sprinklers with high-velocity ventilation fans. Sprinklers should soak the cow's skin, and fans must run continuously to promote evaporative cooling.
* **Feed Line Sprinklers**: Program sprinklers over the feed line to activate for 3 minutes out of every 15 minutes when temperatures exceed 26°C.
* **Holding Area Coolers**: The holding pen before milking is a major hotspot. Ensure high-density ventilation and cooling in this area to prevent acute heat stroke.

## 3. Nutritional Modifications & Electrolyte Balance
Cows consume less dry matter during hot weather, making nutritional density critical:
* **Increase Energy Density**: Augment the ration with highly digestible bypass fats and high-quality forage to maintain energy intake without increasing gut fermentation heat.
* **Electrolyte Supplementation**: Heat stress triggers metabolic alkalosis due to panting. Supplement the diet with additional potassium (1.5% of DM), sodium (0.45% of DM), and magnesium (0.35% of DM) to replenish lost electrolytes.
* **Cold Water Access**: Ensure continuous access to clean, cold drinking water. A high-producing dairy cow requires up to 150 liters of water daily during summer. Waterers should be shaded and cleaned daily.

## 4. Seasonal Disease Prophylaxis
Summer brings high insect vector activity and unique environmental challenges:
* **Mastitis Defense**: Warm, humid conditions accelerate bacterial growth in bedding. Practice strict post-milking teat disinfection and use organic bedding materials (like kiln-dried sand) that do not support bacterial multiplication.
* **Ectoparasite Control**: Implement a systematic pour-on or spraying program to suppress flies, ticks, and midges, reducing transmission of Bovine Anaplasmosis and Lumpy Skin Disease.
* **Strict Vaccination Timing**: Ensure all vaccine boosters for Hemorrhagic Septicemia and Foot-and-Mouth Disease (FMD) are fully completed at least 3 weeks prior to the onset of peak summer humidity.`,
    authorName: 'Dr. Salis Khan, DVM',
    authorId: 'system-admin',
    createdAt: Date.now() - 3 * 24 * 60 * 60 * 1000,
    readTime: '4 min read',
    tags: ['dairy', 'cattle', 'heat stress', 'preventative'],
    views: 142
  },
  {
    id: 'seed-2',
    title: 'Demystifying Feline Infectious Peritonitis (FIP) Treatments in 2026',
    slug: 'feline-infectious-peritonitis-treatments-2026',
    category: 'Pet Care',
    summary: 'An updated guide on diagnostic criteria, dual-action antiviral therapies, and clinical workflows for managing FIP in small animal veterinary practices.',
    imageUrl: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=800&q=80',
    content: `# Demystifying Feline Infectious Peritonitis (FIP) Treatments in 2026

For decades, a diagnosis of Feline Infectious Peritonitis (FIP) was considered an absolute death sentence for cats. However, the veterinary landscape has undergone a monumental shift. Thanks to breakthrough clinical trials in molecular antivirals and dual-action monoclonal antibodies, FIP is now classified as a highly treatable and curable condition.

This clinical overview outlines the modern diagnostic criteria and treatment protocols for active small animal practices.

## 1. Pathophysiology and Dynamic Diagnosis
FIP is caused by a mutation of Feline Coronavirus (FCoV). While FCoV is extremely common and causes mild enteritis, the mutated virus gains the ability to replicate inside macrophages, triggering systemic vasculitis.

Modern diagnosis is categorised into two clinical presentations:
1. **Effusive (Wet) FIP**: Characterized by abdominal or pleural effusion. The fluid is typically straw-colored, highly viscous, has high protein (>35 g/L), and low albumin-to-globulin ratio (A:G < 0.4).
2. **Non-Effusive (Dry) FIP**: Presenting with granulomatous lesions in organs, ocular changes (uveitis, hypopyon), and neurological signs (ataxia, seizures).

## 2. Primary Antiviral Regimens
The cornerstone of FIP treatment remains nucleoside analogues that inhibit viral RNA replication:

### GS-441524 Protocol
* **Wet/Dry FIP**: 10–15 mg/kg administered orally or subcutaneously once daily for 84 consecutive days.
* **Neurological/Ocular FIP**: Require a higher dose of 15–20 mg/kg to successfully cross the blood-brain and blood-ocular barriers.
* **Compliance**: Regular monitoring of serum proteins, CBC, and liver enzymes is mandatory at weeks 4, 8, and 12 of therapy.

### Remdesivir Alternative
Remdesivir is metabolized into GS-441524 in vivo and is highly effective as an initial intravenous stabilizer for acute, critical cases before transitioning to oral GS-441524.

## 3. Immunomodulators & Monoclonal Antibodies
For stubborn or relapsed cases, the combination of antiviral agents with recombinant feline interferon omega (FeIFN) or novel monoclonal antibodies targeting pro-inflammatory cytokines has shown remarkable efficacy in suppressing active vasculitis and preventing immune-mediated organ destruction.

## 4. Post-Treatment Observation Phase
Following completion of the 84-day antiviral course, the cat enters an 84-day observation phase:
* **Monitoring**: Complete blood counts (CBC), chemistry profiles, and weight should be checked monthly.
* **Key Indicators**: A stable or increasing body weight, normal temperature, and an A:G ratio of >0.7 are positive indicators of a complete cure.
* **Avoiding Stressors**: Elective procedures (such as spaying/neutering or non-essential dental work) should be deferred until the observation phase is fully completed.`,
    authorName: 'Dr. Sarah Collins, DACVIM',
    authorId: 'system-admin',
    createdAt: Date.now() - 5 * 24 * 60 * 60 * 1000,
    readTime: '5 min read',
    tags: ['cats', 'fip', 'antivirals', 'pet care'],
    views: 289
  },
  {
    id: 'seed-3',
    title: 'Essential Vaccination Schedules for Rural Farm Livestock',
    slug: 'essential-vaccination-schedules-rural-livestock',
    category: 'Clinical Practice',
    summary: 'A comprehensive handbook for field veterinarians on protecting sheep, goats, and buffaloes against Hemorrhagic Septicemia, Blackleg, and Foot-and-Mouth Disease.',
    imageUrl: 'https://images.unsplash.com/photo-1516467508483-a7212febe31a?auto=format&fit=crop&w=800&q=80',
    content: `# Essential Vaccination Schedules for Rural Farm Livestock

Preventative herd medicine is the absolute bedrock of sustainable livestock farming. In rural regions, infectious disease outbreaks can decimate entire farming communities within days. Implementing a strict, seasonally aligned vaccination calendar is the single most cost-effective veterinary intervention available.

This handbook details the core immunisation schedules for high-risk pathogens in sheep, goats, cattle, and buffaloes.

## 1. Core Pathogens & Seasonal Distribution

### Foot-and-Mouth Disease (FMD)
* **Pathogen**: Aphthovirus (extremely contagious).
* **High-Risk Period**: Spring and post-monsoon humidity.
* **Primary Prevention**: Annual or biannual trivalent vaccine containing current local strains.

### Hemorrhagic Septicemia (HS)
* **Pathogen**: *Pasteurella multocida* serotype B:2.
* **High-Risk Period**: Monsoon season. Highly correlated with environmental stress and sudden temperature drops.
* **Primary Prevention**: Oil-adjuvant vaccine administered 1 month prior to monsoon rains.

### Enterotoxemia (Pulpy Kidney)
* **Pathogen**: *Clostridium perfringens* type D.
* **High-Risk Period**: Sudden diet changes, lush green pastures in spring.
* **Primary Prevention**: Routine vaccination of dams and offspring with multi-valent clostridial toxoids.

## 2. Sheep & Goat Vaccination Calendar
Small ruminants require precise dosing and careful handling to prevent vaccine reactions:

| Vaccine Name | Target Age | Administration Route | Boosters / Frequency |
| :--- | :--- | :--- | :--- |
| **Enterotoxemia (ET)** | 4–6 weeks | Subcutaneous (3 mL) | Booster in 4 weeks, then annually |
| **Peste des Petits Ruminants (PPR)** | 3 months | Subcutaneous (1 mL) | Single dose provides 3 years immunity |
| **Sheep Pox** | 4 months | Subcutaneous (0.5 mL) | Annual booster in spring |
| **Foot & Mouth Disease** | 3 months | Intramuscular (2 mL) | Biannually (every 6 months) |

## 3. Large Ruminant (Cattle & Buffalo) Vaccination Protocol
Buffaloes are particularly sensitive to Hemorrhagic Septicemia and require robust protective titers:

1. **Hemorrhagic Septicemia (HS)**:
   * **Initial Dose**: 6 months of age.
   * **Route**: Deep Intramuscular (2 mL).
   * **Timing**: Administer in May/June before monsoon onset. Annual revaccination is critical.
2. **Black Quarter / Blackleg (BQ)**:
   * **Initial Dose**: 6 months of age.
   * **Route**: Subcutaneous (2 mL).
   * **Timing**: Annual dose in spring. Typically combined with HS vaccines in dual-adjuvant formulas.
3. **Brucellosis (Strain 19)**:
   * **Target**: Female calves only, between 3 to 8 months of age.
   * **Route**: Subcutaneous (5 mL).
   * **Crucial Caution**: Live vaccine. Handle with absolute care; potential zoonotic risk to veterinary personnel. Do not vaccinate adult cows.

## 4. Best Practices for Vaccine Cold Chain Maintenance
Vaccines are highly heat-sensitive biologics. Failure to maintain the cold chain renders immunizations completely useless:
* **Storage Temperature**: Maintain strictly between 2°C and 8°C. Do not freeze oil-adjuvant vaccines as it permanently breaks the emulsion.
* **Field Transportation**: Use high-quality insulated vaccine carriers packed with frozen gel packs. Keep the container out of direct sunlight during field vaccination drives.
* **Sanitation**: Never reuse needles across different animal groups. This prevents mechanical transmission of blood-borne pathogens like Anaplasmosis.`,
    authorName: 'Dr. Salis Khan, DVM',
    authorId: 'system-admin',
    createdAt: Date.now() - 7 * 24 * 60 * 60 * 1000,
    readTime: '6 min read',
    tags: ['vaccination', 'livestock', 'buffalo', 'prevention'],
    views: 195
  }
];

export const BlogService = {
  /**
   * Fetch all blog articles (either from Firestore or fallback to localStorage)
   */
  async fetchArticles(): Promise<BlogArticle[]> {
    if (isFirebaseConfigured) {
      try {
        const blogsCol = collection(db, 'blogs');
        const q = query(blogsCol, orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        
        const articles: BlogArticle[] = [];
        querySnapshot.forEach((docSnap) => {
          articles.push({
            id: docSnap.id,
            ...docSnap.data()
          } as BlogArticle);
        });

        if (articles.length > 0) {
          // Sync with local storage for backup
          localStorage.setItem(LOCAL_BLOGS_KEY, JSON.stringify(articles));
          return articles;
        }
      } catch (err) {
        console.warn('[BlogService] Firestore fetch failed, falling back to local cache or defaults:', err);
      }
    }

    // Local Storage / Cache fallback
    try {
      const cached = localStorage.getItem(LOCAL_BLOGS_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('[BlogService] Error reading local blog cache:', e);
    }

    // If no cache or empty, initialize with default seed articles and cache them
    try {
      localStorage.setItem(LOCAL_BLOGS_KEY, JSON.stringify(DEFAULT_BLOGS));
    } catch {}
    return DEFAULT_BLOGS;
  },

  /**
   * Fetch a single blog article by slug
   */
  async fetchArticleBySlug(slug: string): Promise<BlogArticle | null> {
    if (isFirebaseConfigured) {
      try {
        const blogsCol = collection(db, 'blogs');
        const q = query(blogsCol, where('slug', '==', slug), limit(1));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          const docSnap = querySnapshot.docs[0];
          return {
            id: docSnap.id,
            ...docSnap.data()
          } as BlogArticle;
        }
      } catch (err) {
        console.warn(`[BlogService] Firestore fetch for slug ${slug} failed:`, err);
      }
    }

    // Fallback search in local cache
    const articles = await this.fetchArticles();
    return articles.find(a => a.slug === slug) || null;
  },

  /**
   * Publish a new blog article
   */
  async publishArticle(articleData: Omit<BlogArticle, 'id' | 'views' | 'createdAt'>): Promise<BlogArticle> {
    const newArticle: BlogArticle = {
      ...articleData,
      id: isFirebaseConfigured ? '' : 'local-' + Math.random().toString(36).substr(2, 9),
      createdAt: Date.now(),
      views: 0
    };

    if (isFirebaseConfigured) {
      try {
        const blogsCol = collection(db, 'blogs');
        const docRef = await addDoc(blogsCol, {
          title: newArticle.title,
          slug: newArticle.slug,
          summary: newArticle.summary,
          content: newArticle.content,
          imageUrl: newArticle.imageUrl || '',
          category: newArticle.category,
          authorName: newArticle.authorName,
          authorId: newArticle.authorId,
          createdAt: newArticle.createdAt,
          readTime: newArticle.readTime,
          tags: newArticle.tags || [],
          views: 0
        });
        newArticle.id = docRef.id;

        // Fetch all again and sync local cache
        await this.fetchArticles();
        return newArticle;
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, 'blogs');
      }
    }

    // Fallback to local storage if Firebase offline or quota-exceeded
    const articles = await this.fetchArticles();
    articles.unshift(newArticle);
    localStorage.setItem(LOCAL_BLOGS_KEY, JSON.stringify(articles));
    return newArticle;
  },

  /**
   * Increment view count for a specific article
   */
  async incrementViews(id: string, slug: string): Promise<void> {
    if (isFirebaseConfigured && id && !id.startsWith('local-')) {
      try {
        const docRef = doc(db, 'blogs', id);
        await updateDoc(docRef, {
          views: increment(1)
        });
        return;
      } catch (err) {
        console.warn(`[BlogService] Failed to increment views in Firestore for ${id}:`, err);
      }
    }

    // Local state fallback
    try {
      const articles = await this.fetchArticles();
      const updated = articles.map(a => {
        if (a.slug === slug || (id && a.id === id)) {
          return { ...a, views: a.views + 1 };
        }
        return a;
      });
      localStorage.setItem(LOCAL_BLOGS_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('[BlogService] Error updating local view count:', e);
    }
  },

  /**
   * Delete a blog article
   */
  async deleteArticle(id: string, slug: string): Promise<boolean> {
    if (isFirebaseConfigured && id && !id.startsWith('local-')) {
      try {
        const docRef = doc(db, 'blogs', id);
        await setDoc(docRef, {}); // clear or delete
        // actually delete
        // Note: let's import deleteDoc from firebase/firestore and call it
        const { deleteDoc: fbDeleteDoc } = await import('firebase/firestore');
        await fbDeleteDoc(docRef);
        
        // sync
        await this.fetchArticles();
        return true;
      } catch (err) {
        console.warn(`[BlogService] Failed to delete in Firestore:`, err);
      }
    }

    // Local storage delete
    try {
      const articles = await this.fetchArticles();
      const filtered = articles.filter(a => a.id !== id && a.slug !== slug);
      localStorage.setItem(LOCAL_BLOGS_KEY, JSON.stringify(filtered));
      return true;
    } catch (e) {
      console.warn('[BlogService] Error deleting local article:', e);
      return false;
    }
  }
};
