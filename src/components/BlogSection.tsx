import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, 
  Calendar, 
  Clock, 
  Eye, 
  Plus, 
  Search, 
  ArrowLeft, 
  Share2, 
  Check, 
  Trash2, 
  Sparkles, 
  FileText, 
  AlertTriangle,
  ChevronRight,
  User,
  Heart
} from 'lucide-react';
import { BlogArticle, UserProfile } from '../types';
import { BlogService } from '../lib/blogService';

interface BlogSectionProps {
  currentUser: UserProfile | null;
}

const CATEGORIES = [
  'All',
  'Livestock Health',
  'Pet Care',
  'Clinical Practice',
  'Veterinary News'
];

const PRESET_IMAGES = [
  { label: 'Cattle & Cows', url: 'https://images.unsplash.com/photo-1570042225831-d98fa7577f1e?auto=format&fit=crop&w=800&q=80' },
  { label: 'Cats & Kittens', url: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=800&q=80' },
  { label: 'Dogs & Puppies', url: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=800&q=80' },
  { label: 'Sheep & Goats', url: 'https://images.unsplash.com/photo-1516467508483-a7212febe31a?auto=format&fit=crop&w=800&q=80' },
  { label: 'Vet Clinic Clinic', url: 'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&w=800&q=80' }
];

export function BlogSection({ currentUser }: BlogSectionProps) {
  const [articles, setArticles] = useState<BlogArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBy, setSortBy] = useState<'latest' | 'popular'>('latest');

  // Navigation states (Slug / View Article)
  const [activeArticle, setActiveArticle] = useState<BlogArticle | null>(null);

  // Editor states
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [shareCopied, setShareCopied] = useState(false);

  // Form Fields
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    summary: '',
    content: '',
    category: 'Livestock Health',
    imageUrl: PRESET_IMAGES[0].url,
    tags: ''
  });

  const isAdmin = currentUser && (currentUser.email === 'saliskhan214@gmail.com' || currentUser.isAdmin === true);

  // Load articles
  const loadArticles = async () => {
    setLoading(true);
    try {
      const data = await BlogService.fetchArticles();
      setArticles(data);
    } catch (err) {
      setError('Failed to fetch articles. Please check your network connection.');
    } finally {
      setLoading(false);
    }
  };

  // Check URL parameters for deep-linked slugs (search-engine-friendly routing)
  useEffect(() => {
    loadArticles().then(() => {
      const params = new URLSearchParams(window.location.search);
      const urlSlug = params.get('slug');
      if (urlSlug) {
        // Find article
        BlogService.fetchArticleBySlug(urlSlug).then((article) => {
          if (article) {
            setActiveArticle(article);
            // Increment view count on deep-link load
            BlogService.incrementViews(article.id, article.slug);
          }
        });
      }
    });
  }, []);

  // Update slug automatically from title
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const title = e.target.value;
    const slug = title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '') // remove special characters
      .replace(/[\s_]+/g, '-')  // replace spaces/underscores with hyphens
      .replace(/^-+|-+$/g, ''); // remove leading/trailing hyphens

    setFormData(prev => ({
      ...prev,
      title,
      slug
    }));
  };

  // Open an article
  const handleSelectArticle = (article: BlogArticle) => {
    setActiveArticle(article);
    BlogService.incrementViews(article.id, article.slug);
    
    // Update address bar query parameter (SEO-friendly)
    try {
      const newUrl = `${window.location.origin}${window.location.pathname}?tab=news&slug=${article.slug}`;
      window.history.pushState({ path: newUrl }, '', newUrl);
    } catch (e) {
      console.warn('Could not update browser history state', e);
    }
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Back to list
  const handleBackToList = () => {
    setActiveArticle(null);
    
    // Clean URL parameter
    try {
      const cleanUrl = `${window.location.origin}${window.location.pathname}?tab=news`;
      window.history.pushState({ path: cleanUrl }, '', cleanUrl);
    } catch (e) {
      console.warn('Could not update browser history state', e);
    }
    
    // Refresh to update views
    loadArticles();
  };

  // Copy article link
  const handleShare = () => {
    if (!activeArticle) return;
    const shareUrl = `${window.location.origin}${window.location.pathname}?tab=news&slug=${activeArticle.slug}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 3000);
    });
  };

  // Calculate reading time dynamically
  const calculateReadingTime = (text: string): string => {
    const wordsPerMinute = 200;
    const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
    const minutes = Math.ceil(wordCount / wordsPerMinute);
    return `${minutes || 1} min read`;
  };

  // Submit new article
  const handleSubmitArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.slug || !formData.content) {
      alert('Please fill out all mandatory fields.');
      return;
    }

    setIsSubmitting(true);
    try {
      const readTime = calculateReadingTime(formData.content);
      const tagsArray = formData.tags
        .split(',')
        .map(t => t.trim().toLowerCase())
        .filter(Boolean);

      await BlogService.publishArticle({
        title: formData.title,
        slug: formData.slug,
        summary: formData.summary || formData.content.slice(0, 160).replace(/[#*`_]/g, '') + '...',
        content: formData.content,
        imageUrl: formData.imageUrl,
        category: formData.category,
        authorName: currentUser?.name || 'VetAxis Administrator',
        authorId: currentUser?.uid || 'admin',
        tags: tagsArray,
        readTime: readTime
      });

      // Clear Form & Close
      setFormData({
        title: '',
        slug: '',
        summary: '',
        content: '',
        category: 'Livestock Health',
        imageUrl: PRESET_IMAGES[0].url,
        tags: ''
      });
      setIsEditorOpen(false);
      setSuccessToast('Educational guide published successfully! Indexing into dynamic sitemap.xml...');
      setTimeout(() => setSuccessToast(null), 5000);
      
      // Reload list
      loadArticles();
    } catch (err) {
      alert('Error publishing guide. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete article (Admin Only)
  const handleDeleteArticle = async (article: BlogArticle) => {
    if (!window.confirm(`Are you sure you want to permanently delete "${article.title}"? This cannot be undone.`)) {
      return;
    }

    try {
      const success = await BlogService.deleteArticle(article.id, article.slug);
      if (success) {
        if (activeArticle?.id === article.id) {
          handleBackToList();
        } else {
          loadArticles();
        }
        setSuccessToast('Article successfully removed.');
        setTimeout(() => setSuccessToast(null), 3000);
      } else {
        alert('Could not delete the article.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Filtering logic
  const filteredArticles = articles
    .filter((art) => {
      const matchesCategory = selectedCategory === 'All' || art.category === selectedCategory;
      const matchesSearch = 
        art.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        art.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
        art.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        art.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesSearch;
    })
    .sort((a, b) => {
      if (sortBy === 'popular') {
        return b.views - a.views;
      }
      return b.createdAt - a.createdAt;
    });

  // Recommended/similar articles
  const recommendations = articles
    .filter(a => a.id !== activeArticle?.id && (a.category === activeArticle?.category || selectedCategory === 'All'))
    .slice(0, 3);

  // Markdown renderer helper
  const renderMarkdownText = (text: string) => {
    if (!text) return null;
    
    // Split by lines to create elegant layouts
    const lines = text.split('\n');
    let inList = false;
    let listItems: string[] = [];
    const elements: React.ReactNode[] = [];

    lines.forEach((line, index) => {
      const trimmed = line.trim();

      // Handle Markdown headings
      if (trimmed.startsWith('# ')) {
        flushList();
        elements.push(
          <h1 key={`h1-${index}`} className="text-3xl md:text-4xl font-serif font-black text-[#3c3c3b] mt-8 mb-4 border-b border-[#e3dec9] pb-2 leading-tight">
            {trimmed.slice(2)}
          </h1>
        );
      } else if (trimmed.startsWith('## ')) {
        flushList();
        elements.push(
          <h2 key={`h2-${index}`} className="text-2xl font-serif font-bold text-[#5a5a40] mt-7 mb-3 leading-snug">
            {trimmed.slice(3)}
          </h2>
        );
      } else if (trimmed.startsWith('### ')) {
        flushList();
        elements.push(
          <h3 key={`h3-${index}`} className="text-lg font-bold text-[#3c3c3b] mt-6 mb-2">
            {trimmed.slice(4)}
          </h3>
        );
      } 
      // Handle list items
      else if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
        inList = true;
        listItems.push(trimmed.slice(2));
      } 
      // Handle table rows or generic lines
      else {
        flushList();
        if (trimmed === '') {
          elements.push(<div key={`space-${index}`} className="h-3" />);
        } else {
          // Check for bold matches inside prose
          let contentNode: React.ReactNode = trimmed;
          if (trimmed.includes('**')) {
            const parts = trimmed.split('**');
            contentNode = parts.map((part, i) => i % 2 === 1 ? <strong key={i} className="font-extrabold text-[#3c3c3b]">{part}</strong> : part);
          }
          elements.push(
            <p key={`p-${index}`} className="text-[#5a564e] text-base leading-relaxed mb-4 font-sans font-medium">
              {contentNode}
            </p>
          );
        }
      }
    });

    flushList();

    function flushList() {
      if (inList && listItems.length > 0) {
        elements.push(
          <ul key={`list-${elements.length}`} className="list-disc list-inside space-y-2 mb-5 pl-4 text-base text-[#5a564e] font-sans font-medium">
            {listItems.map((item, i) => {
              let itemNode: React.ReactNode = item;
              if (item.includes('**')) {
                const parts = item.split('**');
                itemNode = parts.map((part, index) => index % 2 === 1 ? <strong key={index} className="font-extrabold text-[#3c3c3b]">{part}</strong> : part);
              }
              return <li key={i} className="leading-relaxed"><span className="ml-1">{itemNode}</span></li>;
            })}
          </ul>
        );
        listItems = [];
        inList = false;
      }
    }

    return elements;
  };

  return (
    <div id="blog-section" className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 min-h-screen">
      
      {/* Toast Notification */}
      <AnimatePresence>
        {successToast && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.9 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[1000] w-[90%] max-w-md bg-stone-900 border-2 border-emerald-500 text-white px-5 py-4 rounded-2xl shadow-2xl flex items-center gap-3"
          >
            <span className="text-2xl">✨</span>
            <div className="flex flex-col text-left">
              <span className="font-serif font-black text-xs uppercase tracking-wider text-emerald-400">System Notification</span>
              <span className="text-xs font-bold text-stone-100">{successToast}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {!activeArticle ? (
          // ─── LIST VIEW ───────────────────────────────────────────────────
          <motion.div
            key="list"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25 }}
          >
            {/* Header section with publish action */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10 border-b border-[#e3dec9] pb-6">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold text-[#a0522d] uppercase tracking-wider mb-1.5">
                  <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                  <span>Educational Hub</span>
                </div>
                <h1 className="text-3xl md:text-4xl font-serif font-black text-[#5a5a40] tracking-tight">
                  Veterinary Guides & Articles
                </h1>
                <p className="text-stone-500 text-sm font-medium mt-1">
                  Peer-reviewed guides, outbreak reports, and livestock management methodologies.
                </p>
              </div>

              {/* Admin write guide trigger */}
              {isAdmin && (
                <motion.button
                  whileHover={{ scale: 1.03, y: -1 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setIsEditorOpen(true)}
                  className="flex items-center gap-2 bg-[#5a5a40] hover:bg-[#3e3e2b] text-white font-extrabold px-5 py-3 rounded-xl shadow-md border-b-[3px] border-b-[#3e3e2b] text-sm cursor-pointer w-full md:w-auto justify-center"
                >
                  <Plus className="w-4 h-4" />
                  <span>Publish New Guide</span>
                </motion.button>
              )}
            </div>

            {/* Filter controls & Search */}
            <div className="flex flex-col lg:flex-row gap-4 mb-8">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-stone-400" />
                <input
                  type="text"
                  placeholder="Search educational guides, clinical protocols or tags..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white border border-[#e3dec9] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5a5a40] focus:border-transparent text-sm font-medium text-[#3c3c3b]"
                />
              </div>

              {/* Sorby */}
              <div className="flex items-center gap-2 bg-white border border-[#e3dec9] px-3.5 py-2 rounded-xl self-start lg:self-auto">
                <span className="text-xs font-bold text-stone-400 uppercase">Sort By:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="text-xs font-black text-[#5a5a40] bg-transparent border-none outline-none cursor-pointer focus:ring-0"
                >
                  <option value="latest">Latest Publications</option>
                  <option value="popular">Most Read / Views</option>
                </select>
              </div>
            </div>

            {/* Category selection bar */}
            <div className="flex gap-2 overflow-x-auto pb-4 mb-8 scrollbar-thin">
              {CATEGORIES.map((cat) => {
                const isSelected = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-bold border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#5a5a40] text-white border-[#5a5a40] shadow-sm'
                        : 'bg-[#fdfbf7] text-[#5a5a40] border-[#e3dec9] hover:bg-[#f5f1e5]'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>

            {/* Articles Grid */}
            {loading ? (
              <div className="py-24 text-center flex flex-col items-center justify-center gap-3">
                <div className="w-10 h-10 border-4 border-[#e3dec9] border-t-[#5a5a40] rounded-full animate-spin" />
                <p className="text-xs font-black text-[#5a5a40] uppercase tracking-widest">Loading Repository...</p>
              </div>
            ) : filteredArticles.length === 0 ? (
              <div className="bg-white border-2 border-dashed border-[#e3dec9] rounded-2xl py-16 text-center max-w-lg mx-auto">
                <BookOpen className="w-12 h-12 text-[#cdc6ad] mx-auto mb-3" />
                <h3 className="font-serif font-black text-lg text-[#5a5a40]">No Guides Found</h3>
                <p className="text-stone-500 text-xs px-6 mt-1">
                  We could not find any guides matching your criteria. Try adjusting your category or searching for different topics.
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('All');
                  }}
                  className="mt-4 text-xs font-black text-[#a0522d] underline hover:text-[#5a5a40] bg-transparent border-none cursor-pointer"
                >
                  Clear all filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredArticles.map((article, index) => (
                  <motion.div
                    key={article.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => handleSelectArticle(article)}
                    className="group bg-white border border-[#e3dec9] border-b-[4px] border-b-[#cdc6ad] rounded-2xl overflow-hidden hover:shadow-[0_12px_24px_-10px_rgba(90,90,64,0.15)] hover:-translate-y-1 transition-all duration-200 cursor-pointer flex flex-col h-full"
                  >
                    {/* Cover image banner */}
                    {article.imageUrl ? (
                      <div className="h-48 w-full overflow-hidden relative bg-stone-100">
                        <img
                          src={article.imageUrl}
                          alt={article.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <span className="absolute top-3 left-3 bg-white/95 backdrop-blur-xs text-[#a0522d] font-black text-[9px] uppercase px-2.5 py-1 rounded-md border border-[#e3dec9] tracking-wider shadow-sm">
                          {article.category}
                        </span>
                      </div>
                    ) : (
                      <div className="h-48 w-full bg-[#fcf9f2] flex items-center justify-center relative border-b border-[#f4f1e9]">
                        <FileText className="w-10 h-10 text-[#cdc6ad]" />
                        <span className="absolute top-3 left-3 bg-[#5a5a40] text-white font-black text-[9px] uppercase px-2.5 py-1 rounded-md tracking-wider shadow-sm">
                          {article.category}
                        </span>
                      </div>
                    )}

                    {/* Content text */}
                    <div className="p-5 flex flex-col justify-between flex-1">
                      <div>
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-stone-400 mb-2">
                          <Calendar className="w-3 h-3" />
                          <span>{new Date(article.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                          <span>•</span>
                          <Clock className="w-3 h-3" />
                          <span>{article.readTime}</span>
                        </div>
                        
                        <h3 className="font-serif font-black text-lg text-[#3c3c3b] group-hover:text-[#5a5a40] leading-tight transition-colors line-clamp-2">
                          {article.title}
                        </h3>
                        <p className="text-stone-500 text-xs mt-2 line-clamp-3 leading-relaxed font-medium">
                          {article.summary}
                        </p>
                      </div>

                      <div className="border-t border-[#f4f1e9] pt-4 mt-4 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full bg-[#5a5a40]/10 flex items-center justify-center text-[10px]">
                            🎓
                          </div>
                          <span className="text-[10px] font-bold text-[#5a5a40]">{article.authorName}</span>
                        </div>

                        <div className="flex items-center gap-2.5">
                          <div className="flex items-center gap-1 text-[10px] font-bold text-stone-400">
                            <Eye className="w-3.5 h-3.5" />
                            <span>{article.views} reads</span>
                          </div>

                          {/* Admin Quick Delete */}
                          {isAdmin && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteArticle(article);
                              }}
                              className="text-stone-400 hover:text-red-600 transition-colors p-1"
                              title="Delete Guide"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        ) : (
          // ─── ARTICLE DETAILED VIEW ───────────────────────────────────────
          <motion.div
            key="article"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:pt-4"
          >
            {/* Back Bar - ColumnSpan 12 */}
            <div className="lg:col-span-12 flex items-center justify-between border-b border-[#e3dec9] pb-4 mb-4">
              <button
                onClick={handleBackToList}
                className="flex items-center gap-1.5 text-xs font-black text-[#5a5a40] hover:text-[#3e3e2b] transition-colors cursor-pointer bg-transparent border-none"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Knowledge Repository</span>
              </button>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleShare}
                  className="flex items-center gap-1.5 bg-[#fdfbf7] hover:bg-[#f5f1e5] text-[#5a5a40] border border-[#e3dec9] text-[11px] font-black px-3.5 py-1.5 rounded-xl transition-all cursor-pointer"
                >
                  {shareCopied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-green-600" />
                      <span className="text-green-600">Link Copied!</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Share Article</span>
                    </>
                  )}
                </button>

                {isAdmin && (
                  <button
                    onClick={() => handleDeleteArticle(activeArticle)}
                    className="flex items-center gap-1 text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 text-[11px] font-black px-3.5 py-1.5 rounded-xl transition-all cursor-pointer"
                    title="Delete Guide permanently"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                )}
              </div>
            </div>

            {/* Main Article Content - ColumnSpan 8 */}
            <article className="lg:col-span-8 bg-white border border-[#e3dec9] border-b-[5px] border-b-[#cdc6ad] rounded-2xl p-6 md:p-10 shadow-sm">
              {/* Category Pill */}
              <span className="inline-block bg-[#fcf9f2] text-[#a0522d] border border-[#e3dec9] text-[10px] font-black uppercase px-3 py-1 rounded-md tracking-wider mb-4">
                {activeArticle.category}
              </span>

              <h1 className="text-3xl md:text-4xl lg:text-5xl font-serif font-black text-[#3c3c3b] leading-tight mb-4 tracking-tight">
                {activeArticle.title}
              </h1>

              {/* Author Metrics metadata */}
              <div className="flex items-center gap-3 border-y border-[#f4f1e9] py-4 mb-6">
                <div className="w-10 h-10 rounded-full bg-[#5a5a40]/10 flex items-center justify-center text-lg shadow-inner">
                  👨‍⚕️
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-[#3c3c3b] text-xs sm:text-sm">{activeArticle.authorName}</span>
                    <span className="bg-[#5a5a40]/10 text-[#5a5a40] text-[8px] font-extrabold px-1.5 py-0.5 rounded uppercase">Verified Expert</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-[10px] sm:text-xs font-semibold text-stone-400 mt-0.5">
                    <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {new Date(activeArticle.createdAt).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                    <span>·</span>
                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {activeArticle.readTime}</span>
                    <span>·</span>
                    <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> {activeArticle.views + 1} views</span>
                  </div>
                </div>
              </div>

              {/* Article Main Image */}
              {activeArticle.imageUrl && (
                <div className="w-full h-64 md:h-96 rounded-2xl overflow-hidden mb-8 border border-[#e3dec9] shadow-inner">
                  <img
                    src={activeArticle.imageUrl}
                    alt={activeArticle.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* Dynamic Render Prose */}
              <div className="prose prose-stone max-w-none">
                {renderMarkdownText(activeArticle.content)}
              </div>

              {/* Tags footer */}
              {activeArticle.tags && activeArticle.tags.length > 0 && (
                <div className="border-t border-[#f4f1e9] pt-6 mt-10">
                  <span className="text-xs font-bold text-stone-400 uppercase block mb-2.5">Optimized Keyword Tags</span>
                  <div className="flex flex-wrap gap-2">
                    {activeArticle.tags.map(tag => (
                      <span key={tag} className="text-[10px] font-black uppercase text-[#5a5a40] bg-[#fcf9f2] border border-[#e3dec9] px-3 py-1 rounded-lg">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </article>

            {/* Sidebar Recommended/Meta Section - ColumnSpan 4 */}
            <div className="lg:col-span-4 space-y-6">
              {/* Publication Credentials Card */}
              <div className="bg-[#fcf9f2] border border-[#e3dec9] border-b-[4px] border-b-[#cdc6ad] rounded-2xl p-5">
                <h3 className="font-serif font-black text-sm text-[#5a5a40] uppercase tracking-wider mb-3">Academic Index Shield</h3>
                <p className="text-stone-500 text-xs leading-relaxed font-medium">
                  This educational guide has been indexed securely on the **VetAxis Platform**. 
                  It is formulated strictly for veterinary reference and farm operational efficiency.
                </p>
                <div className="mt-4 pt-4 border-t border-[#cdc6ad]/40 flex items-center justify-between text-[10px] font-bold text-[#5a5a40]">
                  <span>Status: PEER-REVIEWED</span>
                  <span>SSL SECURE ✓</span>
                </div>
              </div>

              {/* Recommended Reading list */}
              {recommendations.length > 0 && (
                <div className="bg-white border border-[#e3dec9] rounded-2xl p-5">
                  <h3 className="font-serif font-black text-[#3c3c3b] text-base mb-4 border-b border-[#f4f1e9] pb-2">Recommended Reading</h3>
                  <div className="space-y-4">
                    {recommendations.map(rec => (
                      <div 
                        key={rec.id}
                        onClick={() => handleSelectArticle(rec)}
                        className="group flex gap-3 items-start cursor-pointer hover:bg-[#fcf9f2]/55 p-1.5 rounded-lg transition-colors"
                      >
                        {rec.imageUrl && (
                          <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-[#e3dec9]">
                            <img src={rec.imageUrl} alt={rec.title} className="w-full h-full object-cover" />
                          </div>
                        )}
                        <div>
                          <span className="text-[9px] font-bold uppercase text-[#a0522d] block">{rec.category}</span>
                          <h4 className="font-serif font-black text-xs text-[#3c3c3b] group-hover:text-[#5a5a40] leading-snug line-clamp-2 mt-0.5">
                            {rec.title}
                          </h4>
                          <span className="text-[9px] text-stone-400 font-bold block mt-1">{rec.readTime}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── FULLSCREEN WRITER EDITOR MODAL (Admin Only) ──────────────── */}
      <AnimatePresence>
        {isEditorOpen && (
          <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-2xl border border-[#e3dec9] shadow-2xl flex flex-col"
            >
              {/* Form Modal Header */}
              <div className="sticky top-0 bg-white border-b border-[#e3dec9] px-6 py-4 flex items-center justify-between z-10">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-[#5a5a40]/10 flex items-center justify-center text-sm">
                    ✍️
                  </div>
                  <div>
                    <h2 className="text-lg font-serif font-black text-[#5a5a40]">Publish Educational Guide</h2>
                    <p className="text-[10px] font-bold text-stone-400 uppercase">Draft and broadcast articles natively to VetAxis</p>
                  </div>
                </div>

                <button
                  onClick={() => setIsEditorOpen(false)}
                  className="p-1.5 hover:bg-stone-100 rounded-full text-stone-400 hover:text-stone-700 transition-colors cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Form Body */}
              <form onSubmit={handleSubmitArticle} className="p-6 md:p-8 space-y-6 flex-1">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Title Field */}
                  <div className="md:col-span-2">
                    <label className="block text-xs font-black text-[#5a5a40] uppercase tracking-wider mb-1.5">Article Title *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g., Clinical Diagnosis of Lumpy Skin Disease in Dairy Buffaloes"
                      value={formData.title}
                      onChange={handleTitleChange}
                      className="w-full px-4 py-3 bg-white border border-[#e3dec9] rounded-xl focus:ring-2 focus:ring-[#5a5a40] outline-none text-sm font-semibold text-[#3c3c3b]"
                    />
                  </div>

                  {/* Slug Field (SEO URL-friendly) */}
                  <div>
                    <label className="block text-xs font-black text-[#5a5a40] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <span>SEO Slug *</span>
                      <span className="text-[10px] text-stone-400 font-bold uppercase">(Search Engine Friendly Link)</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g., diagnosis-lumpy-skin-disease-buffaloes"
                      value={formData.slug}
                      onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                      className="w-full px-4 py-3 bg-stone-50 border border-[#e3dec9] rounded-xl focus:ring-2 focus:ring-[#5a5a40] outline-none text-xs font-mono font-bold text-[#a0522d]"
                    />
                  </div>

                  {/* Category select */}
                  <div>
                    <label className="block text-xs font-black text-[#5a5a40] uppercase tracking-wider mb-1.5">Category Topic *</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full px-4 py-3 bg-white border border-[#e3dec9] rounded-xl focus:ring-2 focus:ring-[#5a5a40] outline-none text-sm font-bold text-[#5a5a40]"
                    >
                      {CATEGORIES.filter(c => c !== 'All').map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  {/* Summary (Meta description) */}
                  <div className="md:col-span-2">
                    <label className="block text-xs font-black text-[#5a5a40] uppercase tracking-wider mb-1.5 flex items-center justify-between">
                      <span>Article Summary *</span>
                      <span className="text-[10px] text-stone-400 font-bold">{formData.summary.length}/160 chars recommended</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="A highly condensed summary of the article that will display in search engine lists and cards..."
                      value={formData.summary}
                      onChange={(e) => setFormData(prev => ({ ...prev, summary: e.target.value }))}
                      className="w-full px-4 py-3 bg-white border border-[#e3dec9] rounded-xl focus:ring-2 focus:ring-[#5a5a40] outline-none text-sm font-medium text-stone-600"
                    />
                  </div>

                  {/* Image URL Select presets / inputs */}
                  <div className="md:col-span-2">
                    <label className="block text-xs font-black text-[#5a5a40] uppercase tracking-wider mb-2">Featured Cover Image</label>
                    <div className="flex flex-col gap-3">
                      <input
                        type="url"
                        placeholder="Paste a custom Unsplash or web image URL..."
                        value={formData.imageUrl}
                        onChange={(e) => setFormData(prev => ({ ...prev, imageUrl: e.target.value }))}
                        className="w-full px-4 py-2 bg-white border border-[#e3dec9] rounded-xl focus:ring-2 focus:ring-[#5a5a40] outline-none text-xs font-medium text-stone-600"
                      />

                      {/* Presets */}
                      <div className="flex flex-wrap gap-2">
                        {PRESET_IMAGES.map((img) => (
                          <button
                            type="button"
                            key={img.label}
                            onClick={() => setFormData(prev => ({ ...prev, imageUrl: img.url }))}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                              formData.imageUrl === img.url
                                ? 'bg-[#5a5a40] text-white border-[#5a5a40]'
                                : 'bg-[#fdfbf7] text-stone-600 border-[#e3dec9] hover:bg-[#f5f1e5]'
                            }`}
                          >
                            {img.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Tags comma list */}
                  <div className="md:col-span-2">
                    <label className="block text-xs font-black text-[#5a5a40] uppercase tracking-wider mb-1.5">Search Keywords / Tags (comma-separated)</label>
                    <input
                      type="text"
                      placeholder="e.g., dairy, vaccine, cattle, mastitis, infection"
                      value={formData.tags}
                      onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                      className="w-full px-4 py-2.5 bg-white border border-[#e3dec9] rounded-xl focus:ring-2 focus:ring-[#5a5a40] outline-none text-xs font-semibold text-[#5a5a40]"
                    />
                  </div>

                  {/* Rich Text Markdown Area */}
                  <div className="md:col-span-2">
                    <label className="block text-xs font-black text-[#5a5a40] uppercase tracking-wider mb-1.5 flex items-center justify-between">
                      <span>Article Content *</span>
                      <span className="text-[10px] text-stone-400 font-bold">Use basic Markdown: # Header, ## Subhead, * bullet point, **bold**</span>
                    </label>
                    <textarea
                      required
                      rows={12}
                      placeholder={`# Preventative Guidelines... \n\nWrite your highly educational professional guides and clinical tutorials here in clean paragraphs. Use markdown formatting to render headings and list items natively.`}
                      value={formData.content}
                      onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                      className="w-full p-4 bg-stone-50 border border-[#e3dec9] rounded-2xl font-mono text-xs leading-relaxed focus:ring-2 focus:ring-[#5a5a40] outline-none text-[#3c3c3b]"
                    />
                  </div>

                </div>

                {/* Form Buttons */}
                <div className="border-t border-[#e3dec9] pt-6 flex items-center justify-end gap-3.5">
                  <button
                    type="button"
                    onClick={() => setIsEditorOpen(false)}
                    className="px-5 py-3 border border-[#e3dec9] hover:bg-stone-100 text-[#5a5a40] font-black rounded-xl text-xs cursor-pointer"
                  >
                    Discard Draft
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex items-center gap-1.5 bg-[#5a5a40] hover:bg-[#3e3e2b] text-white font-black px-6 py-3 rounded-xl shadow border-b-[3px] border-b-[#3e3e2b] text-xs cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Publishing...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Publish & Index Online</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
