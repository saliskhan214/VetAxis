import { useState, useEffect, FormEvent } from 'react';
import { UserProfile, CommunityPost } from '../types';
import { CommunityService, NotificationService } from '../lib/storage';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, MessageCircle, AlertCircle, Heart, ThumbsUp, AlertTriangle, ShieldCheck, TrendingUp, Users } from 'lucide-react';

interface CommunityFeedProps {
  currentUser: UserProfile;
}

export function CommunityFeed({ currentUser }: CommunityFeedProps) {
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeFilter, setActiveFilter] = useState<string>('all');

  // Compose variables
  const [newPostText, setNewPostText] = useState<string>('');
  const [newCategory, setNewCategory] = useState<'lost' | 'adoption' | 'help' | 'general'>('general');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // Load posts
  const loadPosts = async () => {
    setLoading(true);
    try {
      const data = await CommunityService.fetchPosts();
      setPosts(data);
    } catch (err) {
      console.error('Failed to load posts', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPosts();
  }, []);

  const triggerToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleComposeSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!newPostText.trim()) {
      triggerToast('Post cannot be empty.', 'error');
      return;
    }
    if (newPostText.length > 1500) {
      triggerToast('Max 1500 characters allowed.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const created = await CommunityService.createPost(newPostText, newCategory, currentUser);
      setPosts((prev) => [created, ...prev]);
      setNewPostText('');
      setNewCategory('general');
      triggerToast('✓ Your post with category tag has been published!');
    } catch (err: any) {
      triggerToast(err.message || 'Post failed.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleReaction = async (postId: string, emoji: string) => {
    try {
      const originalPost = posts.find(p => p.id === postId);
      const updated = await CommunityService.toggleReaction(postId, emoji, currentUser.email);
      setPosts((prev) => prev.map((p) => (p.id === postId ? updated : p)));

      if (originalPost && originalPost.authorEmail.toLowerCase() !== currentUser.email.toLowerCase()) {
        const isAddingReaction = !originalPost.reactions[emoji]?.includes(currentUser.email);
        if (isAddingReaction) {
          const authorProfile = await NotificationService.findUserByEmail(originalPost.authorEmail);
          if (authorProfile) {
            await NotificationService.createNotification({
              userId: authorProfile.uid,
              senderId: currentUser.uid,
              senderName: currentUser.name,
              type: 'like',
              targetId: postId,
              targetType: 'post',
              message: `${currentUser.name} reacted with ${emoji} to your community bulletin post`
            });
          }
        }
      }
    } catch (err: any) {
      triggerToast('Failed to log reaction.', 'error');
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm('Are you sure you want to remove this post from the community feed?')) return;
    try {
      await CommunityService.deletePost(postId);
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      triggerToast('Post removed.');
    } catch (err: any) {
      triggerToast('Failed to delete post.', 'error');
    }
  };

  // Filters
  const filteredPosts = posts.filter((p) => {
    if (activeFilter === 'all') return true;
    return p.category === activeFilter;
  });

  // Calculate stats for sidebar
  const categoryCounts = { lost: 0, adoption: 0, help: 0, general: 0 };
  posts.forEach((p) => {
    if (categoryCounts[p.category] !== undefined) categoryCounts[p.category]++;
  });
  const totalPostsCount = posts.length || 1;

  // Active contributors (Unique posters)
  const recentContributors = Array.from(new Set(posts.map((p) => p.authorEmail)))
    .map((email) => {
      return posts.find((p) => p.authorEmail === email);
    })
    .filter(Boolean)
    .slice(0, 5) as CommunityPost[];

  return (
    <div className="space-y-8 max-w-7xl mx-auto w-[98%] px-1 md:px-4">
      
      {/* GLOWING HERO HEADER */}
      <div className="relative bg-gradient-to-br from-[#3e3e2b] via-[#5a5a40] to-[#737351] text-white p-8 md:p-10 rounded-3xl overflow-hidden border border-[#5a5a40] border-b-[8px] border-b-[#323223] shadow-xl animate-fadeIn">
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1.5px,transparent_1.5px)] [background-size:20px_20px] opacity-15" />
        <div className="absolute top-1/2 right-12 -translate-y-1/2 opacity-20 pointer-events-none hidden md:block">
          <MessageCircle className="w-48 h-48" />
        </div>
        <div className="relative z-10 space-y-2">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white/10 rounded-xl text-xs font-bold font-mono tracking-wider uppercase border border-white/20 backdrop-blur-md">
            🐾 Community Bulletins
          </span>
          <h2 className="text-3.5xl md:text-4xl font-serif font-black tracking-tight drop-shadow-sm">
            Clinical Community Forum
          </h2>
          <p className="text-neutral-200 text-sm md:text-base font-semibold max-w-xl">
            Post medical advisories, adoption tags, emergency health alerts, or share clinical resources with peers.
          </p>
        </div>
      </div>

      {/* TOAST SYSTEM */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className={`fixed bottom-8 right-8 p-4 rounded-2xl shadow-2xl z-[9999] text-white font-serif font-black text-sm flex items-center gap-2 border ${
              toast.type === 'error' 
                ? 'bg-[#df4747] border-[#c23838]' 
                : 'bg-[#5a5a40] border-[#4a4a34]'
            }`}
          >
            <span>{toast.msg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TWO COLUMN INTERACTIVE COMMUNITY VIEW */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: COMPOSER & POSTS LISTING (8 Columns) */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          
          {/* COMPOSE BOX */}
          <div className="bg-white border border-[#e3dec9] border-b-[5px] border-b-[#cdc6ad] p-6 rounded-3xl shadow-md text-left">
            <form onSubmit={handleComposeSubmit} className="space-y-4">
              <div className="flex gap-4 items-start">
                {currentUser.profilePic && currentUser.profilePic !== 'default' ? (
                  <img
                    src={currentUser.profilePic}
                    className="w-12 h-12 rounded-2xl object-cover shrink-0 border-2 border-[#e3dec9] shadow-sm bg-stone-100"
                    alt=""
                  />
                ) : (
                  <div className="w-12 h-12 rounded-2xl bg-[#5a5a40] text-white text-base font-black flex items-center justify-center font-serif shrink-0 border-2 border-white shadow-sm uppercase">
                    {currentUser.name[0]}
                  </div>
                )}
                <div className="flex-1">
                  <textarea
                    value={newPostText}
                    onChange={(e) => setNewPostText(e.target.value)}
                    placeholder="Alert a lost pet, prompt an adoption, or query the clinical community…"
                    rows={3}
                    maxLength={1500}
                    className="w-full border-none outline-none resize-none text-[#373735] font-semibold placeholder-[#a49f92] text-sm bg-transparent p-1 focus:ring-0"
                    disabled={submitting}
                  ></textarea>
                </div>
              </div>

              {/* Compose Actions Strip */}
              <div className="border-t border-[#f4f1e9] pt-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
                
                {/* Tag Selection Row */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-extrabold text-[#a49f92] uppercase tracking-wider">Bulletin Category:</span>
                  {[
                    { id: 'lost', label: '🔴 Lost Alert', activeClass: 'bg-red-50 border-red-500 text-red-700 font-bold' },
                    { id: 'adoption', label: '🟢 Adoption', activeClass: 'bg-emerald-50 border-emerald-500 text-emerald-700 font-bold' },
                    { id: 'help', label: '🔵 Help Call', activeClass: 'bg-blue-50 border-blue-500 text-blue-700 font-bold' },
                    { id: 'general', label: '📝 General', activeClass: 'bg-stone-100 border-[#5a5a40] text-[#5a5a40] font-bold' }
                  ].map((cat) => {
                    const isSelected = newCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setNewCategory(cat.id as any)}
                        className={`cursor-pointer px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                          isSelected
                            ? `${cat.activeClass} border-b-[3px] scale-[1.02] shadow-sm`
                            : 'bg-white border-[#e3dec9] border-b-[2px] text-[#7a766f] hover:bg-[#fcf9f2]'
                        }`}
                      >
                        {cat.label}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-4 shrink-0 w-full sm:w-auto justify-between sm:justify-end">
                  <span className="text-[10px] font-mono text-[#a49f92] font-semibold">
                    {newPostText.length} / 1500 words
                  </span>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="btn-tactile-3d-primary py-2.5 px-6 text-xs"
                  >
                    {submitting ? 'Publishing…' : 'Share Post'}
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* FILTER PANEL PILLS */}
          <div className="flex flex-wrap gap-2.5 text-left bg-white border border-[#e3dec9] p-2.5 rounded-2xl shadow-sm">
            {[
              { id: 'all', label: '🌐 All Bulletins', activeClass: 'bg-[#5a5a40] border-[#5a5a40] border-b-[3px] border-b-[#3e3e2b] text-white font-extrabold' },
              { id: 'lost', label: '🔴 Lost Pet Alerts', activeClass: 'bg-[#df4747] border-[#c23838] border-b-[3px] border-b-[#9e2a2a] text-white font-extrabold' },
              { id: 'adoption', label: '🟢 Family Adoptions', activeClass: 'bg-emerald-600 border-emerald-700 border-b-[3px] border-b-emerald-800 text-white font-extrabold' },
              { id: 'help', label: '🔵 Help Requests', activeClass: 'bg-blue-600 border-blue-700 border-b-[3px] border-b-blue-800 text-white font-extrabold' }
            ].map((f) => {
              const isActive = activeFilter === f.id;
              return (
                <button
                  key={f.id}
                  onClick={() => setActiveFilter(f.id)}
                  className={`cursor-pointer px-4.5 py-2.5 text-xs font-bold rounded-xl border transition-all ${
                    isActive
                      ? f.activeClass
                      : 'bg-[#fcf9f2] border-[#e3dec9] border-b-[2px] text-[#7a766f] hover:bg-white hover:text-black'
                  }`}
                >
                  {f.label}
                </button>
              );
            })}
          </div>

          {/* POSTS LIST */}
          <div className="space-y-6">
            {loading ? (
              <div className="space-y-5 animate-pulse">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-3xl h-48 border border-[#e3dec9] border-b-[4px]" />
                ))}
              </div>
            ) : filteredPosts.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-3xl border border-[#e3dec9] border-b-[4px] border-b-[#cdc6ad] p-16 text-center shadow-sm"
              >
                <span className="text-4xl">🌿</span>
                <h3 className="font-serif font-black text-[#373735] text-lg mt-3">Empty Bulletin Feed</h3>
                <p className="text-sm text-[#7a766f] font-semibold mt-1">
                  There are no verified bulletins configured under this category currently.
                </p>
              </motion.div>
            ) : (
              <div className="space-y-5 text-left">
                <AnimatePresence mode="popLayout">
                  {filteredPosts.map((post) => {
                    const isAuthor = post.authorEmail === currentUser.email;
                    const initials = post.authorName.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
                    
                    const loved = post.reactions?.['❤️']?.includes(currentUser.email);
                    const thanked = post.reactions?.['👍']?.includes(currentUser.email);
                    const warned = post.reactions?.['❗']?.includes(currentUser.email);

                    return (
                      <motion.div
                        key={post.id}
                        layout
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-white rounded-3xl border border-[#e3dec9] border-b-[4px] border-b-[#cdc6ad] p-6 shadow-sm space-y-4 hover:shadow-md transition-all relative overflow-hidden"
                      >
                        {/* Interactive vertical category bracket line */}
                        <div className={`absolute top-0 left-0 w-1.5 h-full ${
                          post.category === 'lost' 
                            ? 'bg-[#df4747]' 
                            : post.category === 'adoption' 
                            ? 'bg-emerald-500' 
                            : post.category === 'help' 
                            ? 'bg-blue-500' 
                            : 'bg-[#5a5a40]'
                        }`} />

                        {/* Bulletin Header Area */}
                        <div className="flex items-center justify-between pl-1">
                          <div className="flex items-center gap-3.5">
                            {post.profilePic && post.profilePic !== 'default' ? (
                              <img
                                src={post.profilePic}
                                className="w-11 h-11 rounded-xl object-cover shrink-0 border-2 border-white shadow-md bg-[#fcf9f2]"
                                alt=""
                              />
                            ) : (
                              <div className="w-11 h-11 rounded-xl bg-[#f4f1e9] text-[#5a5a40] text-sm font-black flex items-center justify-center font-serif leading-none border-2 border-[#e3dec9] shadow-sm uppercase">
                                {initials}
                              </div>
                            )}
                            <div>
                              <div className="font-extrabold text-sm text-[#373735] flex items-center gap-1.5">
                                <span>{post.authorName}</span>
                                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#f4f1e9] text-[10px] filter saturate-[0.8] border border-[#e3dec9]">
                                  {post.role === 'doctor' ? '🩺' : post.role === 'clinic' ? '🏥' : '🐾'}
                                </span>
                              </div>
                              <div className="text-[10px] text-[#a49f92] font-semibold flex items-center gap-2 uppercase tracking-wider mt-0.5">
                                <span className="text-[#5a5a40] font-bold">{post.role}</span>
                                <span>•</span>
                                <span>
                                  {new Date(post.ts).toLocaleDateString('en-PK', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    day: 'numeric',
                                    month: 'short'
                                  })}
                                </span>
                              </div>
                            </div>
                          </div>

                          {isAuthor && (
                            <button
                              onClick={() => handleDeletePost(post.id)}
                              className="bg-transparent border-none text-[10px] text-red-500 hover:text-red-700 font-extrabold uppercase tracking-widest cursor-pointer hover:underline py-1.5"
                            >
                              ✕ Remove Bulletin
                            </button>
                          )}
                        </div>

                        {/* Bulletin Core Content */}
                        <div className="space-y-3.5 text-sm leading-relaxed text-[#373735] pl-1 font-medium">
                          <div>
                            <span
                              className={`inline-flex px-3 py-1 rounded-xl text-[9px] uppercase tracking-widest font-black border ${
                                post.category === 'lost'
                                  ? 'bg-red-50 border-red-200 text-red-600'
                                  : post.category === 'adoption'
                                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                  : post.category === 'help'
                                  ? 'bg-blue-50 border-blue-200 text-[#1a5f94]'
                                  : 'bg-[#f4f1e9] border-[#e3dec9] text-[#5a5a40]'
                              }`}
                            >
                              {post.category} Panel
                            </span>
                          </div>
                          <p className="whitespace-pre-wrap font-sans leading-relaxed text-[13.5px] text-[#4a4a48]">{post.text}</p>
                        </div>

                        {/* Interactive Reaction Buttons (Tactile click states) */}
                        <div className="border-t border-[#f4f1e9] pt-3 flex items-center gap-2 pl-1 select-none">
                          <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleToggleReaction(post.id, '❤️')}
                            className={`cursor-pointer inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-b-[3px] text-xs font-bold transition-all ${
                              loved
                                ? 'bg-red-50 border-red-300 border-b-red-400 text-red-500 shadow-inner'
                                : 'bg-white border-[#e3dec9] border-b-[#cdc6ad] text-[#7a766f] hover:bg-[#fcf9f2]'
                            }`}
                          >
                            <Heart className={`w-3.5 h-3.5 ${loved ? 'fill-current' : ''}`} /> 
                            <span>Loved</span>
                            <span className="font-mono text-xs text-[#373735]">{post.reactions?.['❤️']?.length || 0}</span>
                          </motion.button>

                          <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleToggleReaction(post.id, '👍')}
                            className={`cursor-pointer inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-b-[3px] text-xs font-bold transition-all ${
                              thanked
                                ? 'bg-blue-50 border-blue-300 border-b-blue-400 text-blue-500 shadow-inner'
                                : 'bg-white border-[#e3dec9] border-b-[#cdc6ad] text-[#7a766f] hover:bg-[#fcf9f2]'
                            }`}
                          >
                            <ThumbsUp className="w-3.5 h-3.5" />
                            <span>Helpful</span>
                            <span className="font-mono text-xs text-[#373735]">{post.reactions?.['👍']?.length || 0}</span>
                          </motion.button>

                          <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleToggleReaction(post.id, '❗')}
                            className={`cursor-pointer inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-b-[3px] text-xs font-bold transition-all ${
                              warned
                                ? 'bg-amber-50 border-amber-300 border-b-amber-400 text-amber-700 shadow-inner'
                                : 'bg-white border-[#e3dec9] border-b-[#cdc6ad] text-[#7a766f] hover:bg-[#fcf9f2]'
                            }`}
                          >
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                            <span>Action Guard</span>
                            <span className="font-mono text-xs text-[#373735]">{post.reactions?.['❗']?.length || 0}</span>
                          </motion.button>
                        </div>

                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </div>

        </div>

        {/* RIGHT COLUMN: SIDEBAR METRICS & TOP PLAYERS (4 Columns) */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          
          {/* CATEGORY BREAKDOWN INFOGRAPHICS */}
          <div className="bg-white border border-[#e3dec9] border-b-[5px] border-b-[#cdc6ad] rounded-3xl p-6 shadow-md space-y-5">
            <div className="flex items-center gap-2 border-b border-[#f4f1e9] pb-3">
              <TrendingUp className="w-5 h-5 text-[#5a5a40]" />
              <h4 className="font-serif font-black text-base text-[#373735]">Bulletin Analytics</h4>
            </div>

            <div className="space-y-4 text-xs text-[#373735]">
              {[
                { label: '🔴 Lost Alert Tags', count: categoryCounts.lost, barClass: 'bg-[#df4747]' },
                { label: '🟢 Direct Adoption Alerts', count: categoryCounts.adoption, barClass: 'bg-emerald-500' },
                { label: '🔵 Critical Help Requests', count: categoryCounts.help, barClass: 'bg-blue-500' },
                { label: '📝 General Discussions', count: categoryCounts.general, barClass: 'bg-[#5a5a40]' }
              ].map((stat, idx) => {
                const percentage = Math.max(4, Math.round((stat.count / totalPostsCount) * 100));
                return (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex justify-between font-extrabold text-[#4a4a48]">
                      <span>{stat.label}</span> 
                      <span className="font-mono text-xs">{stat.count}</span>
                    </div>
                    <div className="h-3.5 bg-[#fcf9f2] border border-[#e3dec9] rounded-xl overflow-hidden p-[2px]">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${stat.count ? percentage : 0}%` }}
                        transition={{ duration: 0.8, delay: idx * 0.1 }}
                        className={`h-full rounded-lg ${stat.barClass}`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ACTIVE CONTRIBUTORS HIGHLIGHTS */}
          <div className="bg-white border border-[#e3dec9] border-b-[5px] border-b-[#cdc6ad] rounded-3xl p-6 shadow-md space-y-4">
            <div className="flex items-center gap-2 border-b border-[#f4f1e9] pb-3">
              <Users className="w-5 h-5 text-[#5a5a40]" />
              <h4 className="font-serif font-black text-base text-[#373735]">Top Contributors</h4>
            </div>

            <div className="space-y-3.5">
              {recentContributors.length === 0 ? (
                <div className="text-xs font-semibold text-[#a49f92] py-2 text-center">No recent bulletins logged.</div>
              ) : (
                recentContributors.map((post, idx) => (
                  <div key={idx} className="flex items-center gap-3 text-xs bg-[#fcf9f2] border border-[#e3dec9] p-2.5 rounded-2xl">
                    <div className="w-8 h-8 bg-[#5a5a40] text-[#fcf9f2] rounded-xl flex items-center justify-center font-black uppercase text-xs">
                      {post.authorName[0]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-extrabold text-[#373735] truncate leading-tight">{post.authorName}</div>
                      <div className="text-[10px] text-[#a49f92] font-semibold uppercase tracking-wider capitalize mt-0.5">{post.role} Account</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* VETAXIS GUARANTEE */}
          <div className="bg-[#fcf9f2] border border-[#e3dec9] rounded-2xl p-5 text-center space-y-1.5 shadow-inner">
            <ShieldCheck className="w-6 h-6 text-[#5a5a40] mx-auto filter drop-shadow-sm" />
            <h5 className="text-[11px] font-black uppercase tracking-widest text-[#5a5a40]">Verified Clinical Safeguards</h5>
            <p className="text-[10px] text-[#7a766f] font-semibold leading-relaxed">
              We monitor clinical notices and flag invalid certifications. Please request verifiable license numbers from any clinicians contacting you on this panel.
            </p>
          </div>

        </div>

      </div>

    </div>
  );
}
