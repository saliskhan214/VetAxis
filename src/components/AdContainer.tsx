import React, { useEffect, useRef, useState } from 'react';
import { Info, ShieldAlert } from 'lucide-react';

export interface AdContainerProps {
  /**
   * Optional specific Ad Slot ID from Google AdSense.
   * If omitted, defaults to auto-responsive ad unit.
   */
  slot?: string;
  /**
   * Ad layout format: 'auto' | 'horizontal' | 'rectangle' | 'in-feed' | 'in-article' | 'compact'
   * Defaults to 'auto'.
   */
  format?: 'auto' | 'horizontal' | 'rectangle' | 'in-feed' | 'in-article' | 'compact';
  /**
   * Custom CSS classes for the outer wrapper container.
   */
  className?: string;
  /**
   * Policy-compliant label. Google AdSense policies mandate labels such as 'Advertisement' or 'Sponsored Links'.
   * Defaults to 'Advertisement'.
   */
  adLabel?: string;
  /**
   * Optional layout key for custom in-feed native placements.
   */
  layoutKey?: string;
  /**
   * Explicit spacing margin override if needed (defaults to safe separation 'my-6').
   */
  marginClass?: string;
}

/**
 * AdContainer
 * 
 * Reusable Google AdSense container built to strictly comply with Google AdSense
 * Ad Placement Policies, Webmaster Quality Guidelines, and Better Ads Standards:
 * 1. Prominent, unambiguous 'Advertisement' & 'Sponsored Links' labeling.
 * 2. Distinct physical borders, background contrast, and rounded enclosure preventing blend with editorial content.
 * 3. Strict buffer separation from interactive buttons, menus, and navigation links.
 * 4. Fixed minimum height reservations to minimize Cumulative Layout Shift (CLS).
 */
export function AdContainer({
  slot,
  format = 'auto',
  className = '',
  adLabel = 'Advertisement',
  layoutKey,
  marginClass = 'my-6'
}: AdContainerProps) {
  const adRef = useRef<HTMLModElement | null>(null);
  const [isPushed, setIsPushed] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<boolean>(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    try {
      if (typeof window !== 'undefined') {
        const adsbygoogle = (window as any).adsbygoogle || [];
        // Short debounce tick to ensure layout paint before push
        timer = setTimeout(() => {
          try {
            adsbygoogle.push({});
            setIsPushed(true);
          } catch (err) {
            console.debug('AdSense unit initialized or already pushed:', err);
          }
        }, 150);
      }
    } catch (e) {
      setLoadError(true);
      console.debug('AdSense container push exception caught:', e);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [slot, format]);

  // Format-specific dimensions & minimum height reserving for CLS prevention
  let minHeightClass = 'min-h-[100px]';
  let adFormatAttr = 'auto';

  if (format === 'horizontal') {
    minHeightClass = 'min-h-[90px] max-h-[140px]';
    adFormatAttr = 'horizontal';
  } else if (format === 'rectangle') {
    minHeightClass = 'min-h-[250px]';
    adFormatAttr = 'rectangle';
  } else if (format === 'in-feed') {
    minHeightClass = 'min-h-[120px]';
    adFormatAttr = 'fluid';
  } else if (format === 'in-article') {
    minHeightClass = 'min-h-[150px]';
    adFormatAttr = 'fluid';
  } else if (format === 'compact') {
    minHeightClass = 'min-h-[70px]';
    adFormatAttr = 'auto';
  }

  // Ensure label strictly conforms to Google AdSense acceptable labels
  const formattedLabel = adLabel.trim().toUpperCase().includes('SPONSOR') 
    ? 'SPONSORED LINKS' 
    : 'ADVERTISEMENT';

  return (
    <div
      id="google-adsense-placement-container"
      className={`relative w-full ${marginClass} rounded-2xl border-2 border-[#e3dec9] border-b-[4px] border-b-[#cdc6ad] bg-[#fcfaf5] p-3.5 sm:p-4 text-center select-none overflow-hidden transition-all shadow-xs ${className}`}
      style={{ boxSizing: 'border-box' }}
      aria-label="Third-party advertisement placement"
    >
      {/* ── Policy-Mandated Visual Header (Distinct from site content & navigation) ── */}
      <div className="flex items-center justify-between border-b border-[#ece6d5] pb-2 mb-3 px-1">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-600 inline-block shadow-xs" aria-hidden="true"></span>
          <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-[#6c685d]">
            {formattedLabel}
          </span>
        </div>
        <div className="flex items-center gap-1 text-[8.5px] sm:text-[9px] font-bold text-[#8c887b]">
          <Info className="w-3 h-3 opacity-80 text-[#8c887b]" aria-hidden="true" />
          <span>Google AdSense Partner</span>
        </div>
      </div>

      {/* ── Safe Enclosed Ad Slot with Protected Padding ── */}
      <div className={`w-full flex items-center justify-center overflow-hidden ${minHeightClass}`}>
        <ins
          ref={adRef}
          className="adsbygoogle"
          style={{ display: 'block', width: '100%', minHeight: '60px' }}
          data-ad-client="ca-pub-7801443420941774"
          {...(slot ? { 'data-ad-slot': slot } : {})}
          data-ad-format={adFormatAttr}
          data-full-width-responsive="true"
          {...(layoutKey ? { 'data-ad-layout-key': layoutKey } : {})}
        />
      </div>

      {/* ── Footer Transparency Disclaimer ── */}
      <div className="mt-2.5 pt-1.5 border-t border-[#ece6d5]/70 flex items-center justify-between text-[8px] sm:text-[8.5px] text-[#9c9789] tracking-tight px-1">
        <span>VetAxis 360 &bull; Verified Ad Unit</span>
        <span>Ad choices &bull; Privacy compliant</span>
      </div>
    </div>
  );
}

export default AdContainer;
