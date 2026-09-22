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

// Clean start: No dummy articles. Articles are written and published dynamically by Doctors and Clinics.
const DEFAULT_BLOGS: BlogArticle[] = [];

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
          const data = docSnap.data();
          if (docSnap.id && !docSnap.id.startsWith('seed-')) {
            articles.push({
              id: docSnap.id,
              ...data
            } as BlogArticle);
          }
        });

        // Filter out dummy/seed articles and sync with local storage
        localStorage.setItem(LOCAL_BLOGS_KEY, JSON.stringify(articles));
        return articles;
      } catch (err) {
        console.warn('[BlogService] Firestore fetch failed, falling back to local cache:', err);
      }
    }

    // Local Storage / Cache fallback
    try {
      const cached = localStorage.getItem(LOCAL_BLOGS_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          // Filter out any legacy dummy seeds
          const cleanArticles = parsed.filter(a => a && a.id && !a.id.startsWith('seed-'));
          localStorage.setItem(LOCAL_BLOGS_KEY, JSON.stringify(cleanArticles));
          return cleanArticles;
        }
      }
    } catch (e) {
      console.warn('[BlogService] Error reading local blog cache:', e);
    }

    return [];
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
