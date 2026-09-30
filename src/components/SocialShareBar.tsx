import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Share2, 
  MessageCircle, 
  Copy, 
  Check, 
  X, 
  Globe,
  Sparkles,
  TrendingUp
} from 'lucide-react';
import { seoService } from '../lib/seoService';

interface SocialShareBarProps {
  title?: string;
  text?: string;
  url?: string;
  compact?: boolean;
}

export function SocialShareBar({ title, text, url, compact = false }: SocialShareBarProps) {
  const [copied, setCopied] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const links = seoService.generateSocialShareLinks({
    title,
    text,
    url,
    campaign: 'viral_share_bar'
  });

  const handleCopy = async () => {
    try {
      const shareUrl = url || window.location.href;
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleOpenWindow = (shareUrl: string) => {
    if (typeof window !== 'undefined') {
      window.open(shareUrl, '_blank', 'noopener,noreferrer,width=600,height=500');
    }
  };

  if (compact) {
    return (
      <div className="flex items-center gap-1.5 flex-wrap">
        {/* Facebook Button */}
        <button
          onClick={() => handleOpenWindow(links.facebook)}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-[#1877F2] hover:bg-[#166fe5] text-white text-xs font-bold rounded-lg transition-transform active:scale-95 shadow-2xs cursor-pointer"
          title="Share on Facebook"
        >
          <span>f</span>
          <span>Share</span>
        </button>

        {/* Twitter Button */}
        <button
          onClick={() => handleOpenWindow(links.twitter)}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-black hover:bg-stone-800 text-white text-xs font-bold rounded-lg transition-transform active:scale-95 shadow-2xs cursor-pointer"
          title="Post on X"
        >
          <span>𝕏</span>
        </button>

        {/* Copy Link Button */}
        <button
          onClick={handleCopy}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-[#f4efe4] hover:bg-[#ebe5d6] text-[#4a4a38] text-xs font-bold rounded-lg border border-[#e3dec9] transition-transform active:scale-95 cursor-pointer"
          title="Copy direct share link"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copied!' : 'Copy Link'}</span>
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-5 left-5 z-[150] select-none">
      {/* Floating Trigger Button */}
      <AnimatePresence>
        {!isOpen ? (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-full bg-gradient-to-r from-stone-800 to-stone-900 text-white font-extrabold text-xs shadow-lg hover:shadow-xl transition-all cursor-pointer border-2 border-white/80"
            title="Share VetAxis 360"
          >
            <Share2 className="w-4 h-4 animate-bounce" />
            <span className="hidden sm:inline">Share Page</span>
            <span className="sm:hidden">Share</span>
          </motion.button>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 15, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.9 }}
            className="bg-white border-2 border-[#e3dec9] rounded-2xl p-3.5 shadow-2xl max-w-xs w-72 text-stone-800 space-y-2.5 backdrop-blur-md"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#f4efe4] pb-2">
              <div className="flex items-center gap-1.5 text-xs font-black text-[#5a5a40]">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <span>Share &amp; Grow Website</span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-stone-400 hover:text-stone-600 p-0.5 rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[11px] text-stone-500 leading-tight">
              Share this page directly to pet parent &amp; vet communities to boost organic reach!
            </p>

            {/* Action Buttons */}
            <div className="space-y-1.5">
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => handleOpenWindow(links.facebook)}
                  className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl bg-[#1877F2] hover:bg-[#166fe5] text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  <span className="font-bold">f</span>
                  <span>Facebook</span>
                </button>

                <button
                  onClick={() => handleOpenWindow(links.twitter)}
                  className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl bg-black hover:bg-stone-800 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  <span>𝕏</span>
                  <span>Twitter</span>
                </button>
              </div>

              <button
                onClick={handleCopy}
                className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-[#f4efe4] hover:bg-[#ebe5d6] text-[#4a4a38] text-xs font-bold border border-[#e3dec9] transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Link Copied to Clipboard!' : 'Copy Direct Link'}</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
