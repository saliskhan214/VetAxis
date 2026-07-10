import React from 'react';
import { Compass, Briefcase, FileQuestion, ArrowRight, HeartPulse } from 'lucide-react';

interface PageNotFoundProps {
  onBackHome: () => void;
  onNavigate: (section: string) => void;
}

export default function PageNotFound({ onBackHome, onNavigate }: PageNotFoundProps) {
  return (
    <div className="max-w-3xl mx-auto py-12 px-4 select-none animate-fadeIn">
      <div className="bg-white border border-[#e5dfd0] border-b-[8px] border-b-[#c4bca6] rounded-3xl p-8 sm:p-12 shadow-xl text-center relative overflow-hidden">
        {/* Background Accent glow */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-amber-50 rounded-full filter blur-3xl opacity-50 -mr-16 -mt-16 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-50 rounded-full filter blur-3xl opacity-50 -ml-16 -mb-16 pointer-events-none" />

        {/* 404 Graphic */}
        <div className="flex flex-col items-center justify-center space-y-4 relative z-10">
          <div className="relative">
            <span className="text-8xl sm:text-9xl font-serif font-black text-stone-200 tracking-tighter leading-none block select-none">
              404
            </span>
            <div className="absolute inset-0 flex items-center justify-center mt-4">
              <span className="text-4xl animate-bounce">🩺</span>
            </div>
          </div>

          <h2 className="text-xl sm:text-2xl font-serif font-black text-stone-900 mt-2">
            Requested Destination Not Found
          </h2>
          <p className="text-stone-500 text-sm max-w-md mx-auto leading-relaxed">
            The portal page or resource you are looking for might have been moved, renamed, or is temporarily offline. No worries, we can guide you back!
          </p>

          {/* Quick Links / Guide Board */}
          <div className="w-full max-w-lg mt-8 pt-6 border-t border-[#f0ebe0]">
            <h3 className="text-xs font-mono font-bold text-[#5a5a40] uppercase tracking-widest mb-4">
              Explore Active Portals
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={() => onNavigate('explore')}
                className="flex items-center justify-between p-4 bg-[#fdfbf7] hover:bg-[#f5f0e1] border border-[#e5dfd0] rounded-xl text-left transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-50 rounded-lg text-emerald-700">
                    <Compass className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-stone-800">Clinic Finder</h4>
                    <p className="text-[10px] text-stone-500">Find doctors near you</p>
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-stone-400 group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                onClick={() => onNavigate('jobs')}
                className="flex items-center justify-between p-4 bg-[#fdfbf7] hover:bg-[#f5f0e1] border border-[#e5dfd0] rounded-xl text-left transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-50 rounded-lg text-amber-700">
                    <Briefcase className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-stone-800">DVM Job Board</h4>
                    <p className="text-[10px] text-stone-500">Apply for veterinarian roles</p>
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-stone-400 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-6 flex flex-col sm:flex-row gap-3 w-full max-w-md justify-center">
            <button
              onClick={onBackHome}
              className="flex items-center justify-center gap-2 bg-[#128c7e] hover:bg-[#0c6b60] text-white font-bold py-3 px-6 rounded-xl transition-all shadow-md transform hover:-translate-y-0.5 cursor-pointer text-xs"
            >
              <HeartPulse className="w-4 h-4" />
              Return to Landing Feed
            </button>
            <a
              href="https://wa.me/923001216272?text=Hello%20VetAxis!%20I%20hit%20a%20404%20not%20found%20page%20on%20the%20platform."
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 bg-[#128c7e]/10 hover:bg-[#128c7e]/20 text-[#128c7e] font-bold py-3 px-6 rounded-xl transition-all border border-[#128c7e]/20 cursor-pointer text-xs"
            >
              Report Broken URL
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
