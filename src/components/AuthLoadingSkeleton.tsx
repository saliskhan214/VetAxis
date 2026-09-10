import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { HeartPulse, ArrowRight, Sparkles } from 'lucide-react';

interface AuthLoadingSkeletonProps {
  message?: string;
  subMessage?: string;
  isLoginTransition?: boolean;
  onBypass?: () => void;
}

export const AuthLoadingSkeleton: React.FC<AuthLoadingSkeletonProps> = ({
  message = 'Validating veterinary session...',
  subMessage = 'Securing connection to clinical & farm database...',
  isLoginTransition = false,
  onBypass,
}) => {
  const [showBypass, setShowBypass] = useState<boolean>(false);

  useEffect(() => {
    // Show manual skip button if loading takes more than 1.5 seconds
    const timer = setTimeout(() => {
      setShowBypass(true);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div 
      className="min-h-screen bg-[#fdfbf7] flex flex-col items-center justify-start select-none relative overflow-hidden font-sans"
      id="auth-loading-skeleton"
    >
      {/* Subtle Background 3D Ambient Glow */}
      <div className="absolute top-[-15%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-emerald-100/25 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-15%] right-[-10%] w-[45vw] h-[45vw] rounded-full bg-amber-100/20 blur-3xl pointer-events-none" />

      {/* SKELETON NAVBAR */}
      <div className="w-full bg-white/90 backdrop-blur-md border-b border-[#e3dec9] px-6 py-4 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#5a5a40]/15 flex items-center justify-center text-xl animate-pulse">
              🐾
            </div>
            <div className="space-y-1">
              <div className="h-4 w-28 bg-[#e3dec9]/80 rounded-md animate-pulse" />
              <div className="h-2.5 w-36 bg-[#e3dec9]/40 rounded-md animate-pulse" />
            </div>
          </div>

          <div className="hidden md:flex items-center gap-4">
            <div className="h-8 w-24 bg-[#e3dec9]/50 rounded-xl animate-pulse" />
            <div className="h-8 w-24 bg-[#e3dec9]/50 rounded-xl animate-pulse" />
            <div className="h-8 w-28 bg-[#e3dec9]/50 rounded-xl animate-pulse" />
          </div>

          <div className="flex items-center gap-3">
            {onBypass && showBypass && (
              <button
                onClick={onBypass}
                className="px-3.5 py-1.5 bg-[#2d4a39] hover:bg-[#1f3327] text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1 shadow-sm cursor-pointer animate-fade-in"
              >
                <span>Enter App</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
            <div className="w-10 h-10 rounded-full bg-[#e3dec9]/80 animate-pulse border-2 border-white shadow-xs" />
          </div>
        </div>
      </div>

      {/* FLOATING STATUS PILL */}
      <motion.div
        initial={{ opacity: 0, y: -10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="mt-6 z-20 px-5 py-3.5 rounded-2xl bg-white/95 border border-[#e3dec9] border-b-[3px] border-b-[#cdc6ad] shadow-lg flex flex-col sm:flex-row items-center gap-3.5 max-w-md mx-4"
        id="auth-status-indicator"
      >
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
            <HeartPulse className="w-4 h-4 text-emerald-600 animate-pulse" />
          </div>
          <div className="flex-1 text-left min-w-0">
            <p className="text-xs font-black text-[#373735] truncate flex items-center gap-1.5">
              {message}
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
            </p>
            <p className="text-[10px] text-[#7a766f] font-semibold truncate mt-0.5">
              {subMessage}
            </p>
          </div>
          <div className="w-4 h-4 border-2 border-[#5a5a40] border-t-transparent rounded-full animate-spin shrink-0" />
        </div>

        {onBypass && showBypass && (
          <button
            onClick={onBypass}
            className="w-full sm:w-auto px-3 py-1.5 bg-[#fdfbf7] hover:bg-[#f5eed9] text-[#2d4a39] border border-[#e3dec9] rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer shrink-0"
          >
            <span>Skip Loading</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        )}
      </motion.div>

      {/* MAIN SKELETON FEED CONTENT */}
      <div className="w-full max-w-7xl mx-auto px-4 pt-6 pb-12 space-y-6">
        {/* HERO BANNER SKELETON */}
        <div className="w-full bg-gradient-to-r from-white via-[#fcfaf4] to-white rounded-3xl p-6 md:p-8 border border-[#e3dec9] border-b-[4px] border-b-[#cdc6ad] shadow-sm relative overflow-hidden">
          {/* Shimmer Effect */}
          <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/50 to-transparent pointer-events-none" />
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-3 max-w-xl">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                <div className="h-3 w-32 bg-[#e3dec9] rounded-md animate-pulse" />
              </div>
              <div className="h-7 w-3/4 bg-[#e3dec9]/90 rounded-lg animate-pulse" />
              <div className="h-4 w-full bg-[#e3dec9]/60 rounded-md animate-pulse" />
              <div className="h-4 w-2/3 bg-[#e3dec9]/40 rounded-md animate-pulse" />
            </div>

            <div className="flex flex-wrap gap-2.5">
              <div className="h-10 w-32 bg-[#5a5a40]/20 rounded-xl animate-pulse" />
              <div className="h-10 w-28 bg-[#e3dec9]/60 rounded-xl animate-pulse" />
            </div>
          </div>
        </div>

        {/* PILL CATEGORIES SKELETON */}
        <div className="flex items-center gap-2.5 overflow-x-auto pb-2 scrollbar-none">
          {[80, 110, 95, 120, 90, 100].map((width, i) => (
            <div
              key={i}
              style={{ width: `${width}px` }}
              className="h-9 shrink-0 bg-white border border-[#e3dec9] border-b-[2px] rounded-xl animate-pulse"
            />
          ))}
        </div>

        {/* CLINICAL CARDS SKELETON GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((cardIdx) => (
            <div
              key={cardIdx}
              className="bg-white rounded-3xl p-5 border border-[#e3dec9] border-b-[4px] border-b-[#cdc6ad] shadow-xs space-y-4 relative overflow-hidden"
            >
              {/* Header profile info shimmer */}
              <div className="flex items-start gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-[#f4efe4] border border-[#e3dec9] animate-pulse shrink-0 flex items-center justify-center text-xl">
                  {cardIdx % 2 === 0 ? '🩺' : '🏥'}
                </div>
                <div className="space-y-2 flex-1">
                  <div className="h-4 w-3/4 bg-[#e3dec9]/80 rounded-md animate-pulse" />
                  <div className="h-3 w-1/2 bg-[#e3dec9]/50 rounded-md animate-pulse" />
                </div>
                <div className="h-5 w-14 bg-emerald-100/60 rounded-full animate-pulse" />
              </div>

              {/* Body snippet shimmer */}
              <div className="space-y-2 py-2 border-y border-[#f2eee3]">
                <div className="h-3 w-full bg-[#e3dec9]/50 rounded animate-pulse" />
                <div className="h-3 w-4/5 bg-[#e3dec9]/40 rounded animate-pulse" />
              </div>

              {/* Action buttons shimmer */}
              <div className="flex items-center justify-between pt-1">
                <div className="h-3.5 w-24 bg-[#e3dec9]/60 rounded animate-pulse" />
                <div className="h-8 w-28 bg-[#5a5a40]/15 rounded-xl animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {isLoginTransition && (
        <div className="fixed bottom-6 right-6 z-40 bg-white/95 border border-[#e3dec9] px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-bold text-[#5a5a40]">
          <Sparkles className="w-4 h-4 text-amber-500 animate-spin" />
          <span>Transitioning into clinical workspace…</span>
        </div>
      )}
    </div>
  );
};
