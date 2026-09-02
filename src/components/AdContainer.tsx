import React, { useEffect, useRef, useState } from 'react';
import { Info, ExternalLink } from 'lucide-react';

export interface AdContainerProps {
  /**
   * Optional children to be wrapped inside the compliant ad container.
   * If provided, children will be rendered in place of the default <ins> tag.
   */
  children?: React.ReactNode;
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
  adLabel?: 'Advertisement' | 'Sponsored Links' | string;
  /**
   * Optional custom title or category descriptor for the ad box (e.g. 'Partner Network').
   */
  adTitle?: string;
  /**
   * Optional layout key for custom in-feed native placements.
   */
  layoutKey?: string;
  /**
   * Explicit spacing margin override (defaults to safe separation 'my-8').
   */
  marginClass?: string;
}

/**
 * AdContainer
 * 
 * Reusable Google AdSense wrapper container built to strictly adhere to Google AdSense
 * Program Policies, Ad Placement Guidelines, and Webmaster Site Behavior Standards:
 * 1. Prominent, unambiguous 'ADVERTISEMENT' or 'SPONSORED LINKS' labeling above ad content.
 * 2. High-contrast physical borders, distinct background shading (#f7f4ec), and isolated box.
 * 3. Strict buffer separation (minimum 24-32px margin) from menus, pagination, and navigation links.
 * 4. Fixed minimum height reservations to prevent Cumulative Layout Shift (CLS).
 * 5. Explicit non-misleading context: zero false claims of downloads or live media streams.
 * 6. Accepts children or automatically renders Google AdSense ins tag.
 */
export function AdContainer({
  children,
  slot,
  format = 'auto',
  className = '',
  adLabel = 'Advertisement',
  adTitle,
  layoutKey,
  marginClass = 'my-8'
}: AdContainerProps) {
  const adRef = useRef<HTMLModElement | null>(null);
  const [isPushed, setIsPushed] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<boolean>(false);

  useEffect(() => {
    // If custom children are passed, we don't trigger default adsbygoogle push on ins
    if (children) return;

    let timer: NodeJS.Timeout;
    try {
      if (typeof window !== 'undefined') {
        const adsbygoogle = (window as any).adsbygoogle || [];
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
  }, [children, slot, format]);

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

  // Google AdSense policies explicitly mandate using ONLY 'ADVERTISEMENT' or 'SPONSORED LINKS'
  const formattedLabel = adLabel.trim().toUpperCase().includes('SPONSOR') 
    ? 'SPONSORED LINKS' 
    : 'ADVERTISEMENT';

  return (
    <aside
      id="google-adsense-placement-container"
      role="complementary"
      className={`relative w-full ${marginClass} rounded-2xl border-2 border-[#d6cfbe] bg-[#f7f4ec] p-4 sm:p-5 text-center select-none overflow-hidden transition-all shadow-sm ${className}`}
      style={{ boxSizing: 'border-box' }}
      aria-label={`${formattedLabel} - Google AdSense Placement`}
    >
      {/* ── Policy-Mandated Unambiguous Visual Header & Label ── */}
      <div className="flex items-center justify-between border-b-2 border-[#e2dcce] pb-2.5 mb-4 px-1">
        <div className="flex items-center gap-2">
          <span className="inline-block px-2.5 py-0.5 bg-[#4a4a35] text-[#fcfaf5] text-[10px] sm:text-[11px] font-black uppercase tracking-wider rounded-md shadow-xs">
            {formattedLabel}
          </span>
          {adTitle && (
            <span className="text-[11px] font-bold text-[#5a564c] hidden sm:inline-block">
              &bull; {adTitle}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-[9px] sm:text-[10px] font-bold text-[#7a766a]">
          <Info className="w-3.5 h-3.5 text-[#7a766a]" aria-hidden="true" />
          <span>Google AdSense Partner</span>
        </div>
      </div>

      {/* ── Safe Enclosed Ad Slot with Protected Padding ── */}
      <div className={`w-full flex items-center justify-center overflow-hidden ${minHeightClass}`}>
        {children ? (
          children
        ) : (
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
        )}
      </div>

      {/* ── Transparency & Ad Choices Footer ── */}
      <div className="mt-3 pt-2 border-t border-[#e2dcce] flex items-center justify-between text-[8.5px] sm:text-[9.5px] font-medium text-[#8c887b] px-1">
        <span>VetAxis 360 &bull; Third-Party Ad Placement</span>
        <span className="flex items-center gap-1">
          <span>Ad Choices &amp; Privacy Policies</span>
        </span>
      </div>
    </aside>
  );
}

export default AdContainer;
