import React, { useRef, useState } from 'react';
import { motion, useMotionValue, useTransform, useSpring } from 'motion/react';
import { ChevronRight, Phone, MessageSquare, Award, Compass, Sparkles, Star } from 'lucide-react';
import { UserProfile } from '../types';

interface ThreeDPremiumCardProps {
  profile: UserProfile;
  onClick: () => void;
  distance: number | null;
  initials: string;
}

const formatLastSeen = (timestamp?: number): string => {
  if (!timestamp) return 'Offline';
  const diff = Date.now() - timestamp;
  if (diff < 60000) return 'Just now';
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
};

export const ThreeDPremiumCard: React.FC<ThreeDPremiumCardProps> = ({
  profile,
  onClick,
  distance,
  initials
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);

  // Motion Values for real 3D Tilt rotation
  const x = useMotionValue(0.5);
  const y = useMotionValue(0.5);

  const rotateX = useTransform(y, [0, 1], [12, -12]);
  const rotateY = useTransform(x, [0, 1], [-12, 12]);

  const springX = useSpring(rotateX, { stiffness: 220, damping: 22 });
  const springY = useSpring(rotateY, { stiffness: 220, damping: 22 });

  // Light reflection/sheen effect coordinates
  const sheenX = useTransform(x, [0, 1], ['100%', '0%']);
  const sheenY = useTransform(y, [0, 1], ['100%', '0%']);

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    x.set(mouseX / width);
    y.set(mouseY / height);
  };

  const handleMouseLeave = () => {
    x.set(0.5);
    y.set(0.5);
    setHovered(false);
  };

  const tier = profile.subscriptionTier;

  // Render Metallic backgrounds according to Tiers
  let cardClass = '';
  let badgeEl = null;
  let textClass = '';
  let subTextClass = '';
  let borderHighlight = '';
  let showGuilloche = false;
  let showHolo = false;

  if (tier === 'Silver') {
    cardClass = 'bg-gradient-to-br from-[#e2e8f0] via-[#f8fafc] to-[#cbd5e1] border-slate-300 border-b-[5px] border-b-slate-400 shadow-lg';
    textClass = 'text-slate-900';
    subTextClass = 'text-slate-600';
    borderHighlight = 'border-slate-300 shadow-slate-200';
    badgeEl = (
      <div className="absolute top-0 right-0 bg-gradient-to-l from-slate-500 to-slate-400 text-white text-[9px] font-black uppercase px-3 py-1.5 rounded-bl-2xl tracking-widest shadow-sm flex items-center gap-1">
        ✦ SILVER PARTNER
      </div>
    );
  } else if (tier === 'Gold') {
    cardClass = 'bg-gradient-to-br from-[#fcd34d] via-[#fef08a] to-[#d97706] border-amber-400 border-b-[5px] border-b-amber-600 shadow-xl shadow-amber-100/40';
    textClass = 'text-amber-950 font-semibold';
    subTextClass = 'text-amber-900';
    borderHighlight = 'border-amber-400 shadow-amber-200';
    showGuilloche = true;
    badgeEl = (
      <div className="absolute top-0 right-0 bg-gradient-to-l from-amber-600 to-yellow-500 text-white text-[9px] font-black uppercase px-3 py-1.5 rounded-bl-2xl tracking-widest shadow-sm flex items-center gap-1">
        👑 GOLD VETTED
      </div>
    );
  } else if (tier === 'Platinum') {
    cardClass = 'bg-[#1a1b1e] border border-[#3e4147] border-b-[5px] border-b-neutral-850 shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.12),_0_12px_35px_rgba(0,0,0,0.85)] text-neutral-50';
    textClass = 'text-neutral-50';
    subTextClass = 'text-neutral-400';
    borderHighlight = 'border-[#4c4f57]/80 shadow-black/50';
    showHolo = true;
    const genderLabel = profile.name.toLowerCase().includes('naseeb') || profile.name.toLowerCase().includes('ullah') ? 'MALE ♂' : 'ELITE ✦';
    badgeEl = (
      <div className="absolute top-0 right-0 w-16 h-16 overflow-hidden pointer-events-none rounded-tr-3xl">
        <div 
          style={{
            background: 'linear-gradient(135deg, #e2e8f0 0%, #ffffff 50%, #cbd5e1 100%)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.3), inset 0 0.5px 0.5px rgba(255,255,255,0.8)'
          }}
          className="absolute top-2.5 -right-6 w-24 text-neutral-800 text-[8px] font-black uppercase text-center py-0.5 tracking-widest shadow-xs rotate-45 flex items-center justify-center gap-0.5"
        >
          {genderLabel}
        </div>
      </div>
    );
  } else {
    // Normal non-subscribed card
    cardClass = 'bg-white border-[#e3dec9] border-b-[5px] border-b-[#cdc6ad] hover:border-[#5a5a40] hover:border-b-[#323223]';
    textClass = 'text-[#373735]';
    subTextClass = 'text-[#7a766f]';
    borderHighlight = 'border-[#e3dec9]';
  }

  // Handle direct contact buttons for Gold / Platinum clinical authority leads!
  const stopPropAndWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    const phoneNum = profile.phone || '03339090900';
    const textMsg = encodeURIComponent(`Hello Dr. ${profile.name}, I found your listing on VetAxis and would like to consult with you.`);
    window.open(`https://wa.me/${phoneNum}?text=${textMsg}`, '_blank');
  };

  return (
    <div className="perspective-1000 w-full h-full flex flex-col" style={{ perspective: '1100px' }}>
      <motion.div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseOver={() => setHovered(true)}
        onMouseLeave={handleMouseLeave}
        onClick={onClick}
        style={{
          rotateX: springX,
          rotateY: springY,
          transformStyle: 'preserve-3d',
        }}
        className={`relative rounded-3xl p-6 transition-shadow duration-300 w-full flex flex-col justify-between overflow-hidden cursor-pointer h-full ${cardClass}`}
      >
        {/* Dynamic Sheen/Light Reflection Layer for Metallic Tiers */}
        {tier && (
          <motion.div
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 50%, rgba(0,0,0,0.1) 100%)',
              x: sheenX,
              y: sheenY,
              pointerEvents: 'none',
            }}
            className="absolute inset-0 z-10 opacity-60 mix-blend-overlay"
          />
        )}

        {/* Holographic Iridescent Shimmer for Platinum */}
        {showHolo && (
          <div className="absolute inset-0 bg-gradient-to-tr from-pink-500/10 via-teal-400/10 to-indigo-500/10 bg-[length:400%_400%] animate-[holoShimmer_18s_ease_infinite] mix-blend-color-dodge opacity-80 pointer-events-none" />
        )}

        {/* Guilloche golden secure geometry lines for Gold */}
        {showGuilloche && (
          <div className="absolute inset-0 opacity-[0.08] pointer-events-none stroke-amber-950 mix-blend-overlay flex items-center justify-center">
            <svg viewBox="0 0 200 200" className="w-64 h-64 animate-spin" style={{ animationDuration: '60s' }}>
              <path d="M100,10 C45,10 10,45 10,100 C10,155 45,190 100,190 C155,190 190,155 190,100 C190,45 155,10 100,10" fill="none" strokeWidth="2" />
              <path d="M100,20 C55,20 20,55 20,100 C20,145 55,180 100,180 C145,180 180,145 180,100 C180,55 145,20 100,20" fill="none" strokeWidth="1" strokeDasharray="3,3" />
              <path d="M100,30 Q50,70 100,110 T100,190" fill="none" strokeWidth="0.5" />
              <path d="M100,30 Q150,70 100,110 T100,190" fill="none" strokeWidth="0.5" />
            </svg>
          </div>
        )}

        {/* Border crystalline laser shine for Platinum on hover */}
        {showHolo && hovered && (
          <div className="absolute inset-0 border-2 border-transparent bg-gradient-to-r from-purple-500 via-teal-400 to-indigo-500 opacity-20 pointer-events-none rounded-3xl" />
        )}

        {badgeEl}

        {/* Content Box */}
        {/* TRADITIONAL CARD RENDERS FOR ALL TIER (UNIFIED FOR IDENTICAL HEIGHT/SIZE) */}
        <div className="relative z-10 flex-1 flex flex-col justify-between">
          <div>
            <div className="flex items-start gap-4 mb-4">
              {/* Profile Avatar Frame with relevant styling */}
              {profile.profilePic && profile.profilePic !== 'default' ? (
                <img
                  src={profile.profilePic}
                  className={`w-16 h-16 rounded-2xl object-cover shrink-0 border-2 shadow-md bg-neutral-50 transition-transform ${borderHighlight} ${hovered ? 'scale-105' : ''}`}
                  alt=""
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className={`w-16 h-16 rounded-2xl text-xl font-black flex items-center justify-center font-serif shrink-0 border-2 transition-transform ${hovered ? 'scale-105' : ''} ${
                  tier === 'Silver' ? 'bg-slate-300 text-slate-800 border-slate-400' :
                  tier === 'Gold' ? 'bg-[#fcd34d] text-[#78350f] border-amber-600' :
                  tier === 'Platinum' ? 'bg-neutral-800 text-neutral-100 border-[#3e4147]' :
                  'bg-[#f4f1e9] text-[#5a5a40] border-[#e3dec9]'
                }`}>
                  {initials}
                </div>
              )}

              {/* Header Title Information */}
              <div className="min-w-0 flex-1">
                <h4 className={`font-serif font-black text-base leading-snug flex items-center gap-1.5 truncate pr-8 ${textClass}`}>
                  <span>{profile.name}</span>
                  {tier && (
                    <span className={`rounded-full text-[9px] font-black w-4 h-4 flex items-center justify-center shrink-0 border border-white shadow-xs ${
                      tier === 'Silver' ? 'bg-slate-500 text-white' :
                      tier === 'Gold' ? 'bg-amber-600 text-white' :
                      'bg-indigo-600 text-white'
                    }`}>
                      ✓
                    </span>
                  )}
                </h4>
                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                  <span className={`inline-block px-2.5 py-0.5 rounded-lg text-[8px] uppercase font-black tracking-widest border ${
                    tier === 'Silver' ? 'bg-slate-100 text-slate-700 border-slate-300' :
                    tier === 'Gold' ? 'bg-amber-100 text-amber-950 border-amber-300' :
                    tier === 'Platinum' ? 'bg-neutral-800 text-neutral-300 border-neutral-700' :
                    'bg-[#f4f1e9] text-[#5a5a40] border-[#e3dec9]'
                  }`}>
                    {profile.role === 'doctor' ? 'Practitioner' : profile.role === 'clinic' ? 'Hospital Centre' : 'Assistant Nurse'}
                  </span>
                  {tier && (
                    <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                      tier === 'Silver' ? 'bg-slate-500/10 text-slate-700' :
                      tier === 'Gold' ? 'bg-amber-600/10 text-amber-900 border border-amber-500/20' :
                      'bg-indigo-500/20 text-indigo-300 border border-indigo-500/10'
                    }`}>
                      👑 {tier} Member
                    </span>
                  )}
                  {profile.isOnline ? (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[6px] text-[8px] font-black uppercase tracking-wider border select-none bg-[#edf6ef] text-emerald-700 border-emerald-200">
                      <span className="relative flex h-1.5 w-1.5 shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                      </span>
                      <span>Online</span>
                    </span>
                  ) : (
                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[6px] text-[8px] font-black uppercase tracking-wider border select-none ${
                      tier === 'Platinum' ? 'bg-neutral-800 text-neutral-400 border-neutral-750' : 'bg-stone-50 text-stone-500 border-stone-200'
                    }`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-stone-300 inline-block shrink-0"></span>
                      <span>{formatLastSeen(profile.lastSeen)}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Ratings evaluations logs */}
            {profile.totalReviews && profile.totalReviews > 0 ? (
              <div className={`flex items-center gap-1.5 text-xs font-bold mb-4 px-3 py-1.5 rounded-xl w-fit border ${
                tier === 'Silver' ? 'bg-slate-100/80 border-slate-200 text-slate-800' :
                tier === 'Gold' ? 'bg-[#fef3c7] border-amber-300 text-amber-950' :
                tier === 'Platinum' ? 'bg-neutral-800 border-neutral-700 text-neutral-200' :
                'bg-[#fcf9f2] border-[#e3dec9] text-[#3c3c3b]'
              }`}>
                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                <span className="font-mono">{profile.avgRating?.toFixed(1)}</span>
                <span className={`${tier === 'Platinum' ? 'text-neutral-400' : 'text-[#a49f92]'} font-semibold`}>
                  ({profile.totalReviews} reviews)
                </span>
              </div>
            ) : (
              <div className={`text-[10px] font-black uppercase tracking-wider mb-4 px-2.5 py-1 rounded-xl w-fit border inline-flex items-center gap-1 ${
                tier === 'Silver' ? 'bg-slate-200/50 border-slate-300 text-slate-500' :
                tier === 'Gold' ? 'bg-amber-100/50 border-amber-300 text-amber-700' :
                tier === 'Platinum' ? 'bg-neutral-800 border-neutral-700 text-neutral-450' :
                'bg-stone-50 border-stone-200 text-[#a49f92]'
              }`}>
                ⭐ No client reviews
              </div>
            )}

            {/* Attributes / details segment */}
            <div className="space-y-2 text-xs font-semibold">
              {profile.expertise && (
                <div>
                  <span className="font-black uppercase text-[8px] tracking-wider block text-[#a49f92]">Specialty:</span>
                  <div className={`truncate max-w-[280px] ${tier === 'Platinum' ? 'text-neutral-200' : 'text-[#373735]'}`}>{profile.expertise}</div>
                </div>
              )}
              {profile.facilities && (
                <div>
                  <span className="font-black uppercase text-[8px] tracking-wider block text-[#a49f92]">Facilities:</span>
                  <div className={`truncate max-w-[280px] ${tier === 'Platinum' ? 'text-neutral-200' : 'text-[#373735]'}`}>{profile.facilities}</div>
                </div>
              )}
              {profile.address && (
                <div>
                  <span className="font-black uppercase text-[8px] tracking-wider block text-[#a49f92]">Address:</span>
                  <div className={`truncate max-w-[280px] ${tier === 'Platinum' ? 'text-neutral-300' : 'text-[#373735]'}`}>{profile.address}</div>
                </div>
              )}
            </div>

            {/* Proximity indicator text */}
            {distance !== null && (
              <div className={`mt-3.5 p-2 rounded-xl border text-[11px] font-bold flex items-center gap-2 ${
                tier === 'Platinum' ? 'bg-neutral-800/80 border-[#3e4147] text-neutral-200' : 'bg-emerald-50/50 border-emerald-100 text-[#1b7c31]'
              }`}>
                <span>📍</span>
                <span>This service is <span className="font-extrabold underline">{distance < 1 ? `${Math.round(distance * 1000)} m` : `${distance.toFixed(1)} km`}</span> far away from you.</span>
              </div>
            )}

            {/* Location indicator metadata */}
          </div>

          {/* Footer segment */}
          <div className={`mt-5 pt-4 border-t flex items-center justify-between ${tier === 'Platinum' ? 'border-[#3e4147]' : 'border-neutral-100'}`}>
            {distance !== null ? (
              <span className={`px-2.5 py-1 text-[9px] font-black tracking-wider rounded-lg border uppercase font-mono ${
                tier === 'Silver' ? 'bg-slate-100 border-slate-300 text-slate-700' :
                tier === 'Gold' ? 'bg-[#fef3c7] border-amber-300 text-amber-800' :
                tier === 'Platinum' ? 'bg-neutral-800 border-[#3e4147] text-neutral-300' :
                'bg-[#edf6ef] border-emerald-200 text-emerald-700'
              }`}>
                📍 {distance < 1 ? `${Math.round(distance * 1000)} m` : `${distance.toFixed(1)} km`} distance
              </span>
            ) : (
              <div />
            )}

            <span className={`text-xs font-black flex items-center gap-1 transition-transform ${hovered ? 'translate-x-1' : ''} ${
              tier === 'Gold' ? 'text-amber-950' :
              tier === 'Platinum' ? 'text-neutral-100' :
              'text-[#5a5a40]'
            }`}>
              <span>View Profile</span>
              <ChevronRight className="w-3.5 h-3.5 shrink-0" />
            </span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
