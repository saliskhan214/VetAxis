import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface ThreeDAnimalLoaderProps {
  message?: string;
  subMessage?: string;
  isFullScreen?: boolean;
}

export const ThreeDAnimalLoader: React.FC<ThreeDAnimalLoaderProps> = ({
  message = 'Loading Veterinary Records...',
  subMessage = 'Syncing real-time clinical network...',
  isFullScreen = false
}) => {
  const [activeAnimalIndex, setActiveAnimalIndex] = useState(0);
  const [blink, setBlink] = useState(false);

  // Cycle through adorable realistic 3D animal companion modes
  const animals = [
    { name: 'Loyal Companion Dog', emoji: '🐕', color: '#c48b52', accent: '#7c4d1e', shadow: 'rgba(196,139,82,0.3)' },
    { name: 'Graceful Clinic Cat', emoji: '🐈', color: '#8a9ba8', accent: '#4a5b68', shadow: 'rgba(138,155,168,0.3)' },
    { name: 'Champion Livestock Stallion', emoji: '🐎', color: '#8b4513', accent: '#4a2508', shadow: 'rgba(139,69,19,0.3)' }
  ];

  useEffect(() => {
    const cycleInterval = setInterval(() => {
      setActiveAnimalIndex(prev => (prev + 1) % animals.length);
    }, 3800);

    const blinkInterval = setInterval(() => {
      setBlink(true);
      setTimeout(() => setBlink(false), 220);
    }, 2800);

    return () => {
      clearInterval(cycleInterval);
      clearInterval(blinkInterval);
    };
  }, []);

  const currentAnimal = animals[activeAnimalIndex];

  return (
    <div className={`flex flex-col items-center justify-center select-none ${isFullScreen ? 'min-h-screen w-full bg-[#fdfbf7] p-6' : 'p-4'}`}>
      
      {/* Outer 3D Stage Container */}
      <div className="relative flex flex-col items-center justify-center" style={{ perspective: '1000px' }}>
        
        {/* Floating Holographic Ambient Ring 1 */}
        <motion.div
          animate={{
            rotateX: [65, 75, 65],
            rotateZ: [0, 360],
            scale: [1, 1.08, 1],
          }}
          transition={{
            rotateZ: { repeat: Infinity, duration: 8, ease: "linear" },
            rotateX: { repeat: Infinity, duration: 4, ease: "easeInOut" },
            scale: { repeat: Infinity, duration: 3, ease: "easeInOut" }
          }}
          className="absolute w-44 h-44 rounded-full border-[3px] border-dashed border-[#a0522d]/30 pointer-events-none"
          style={{ transformStyle: 'preserve-3d' }}
        />

        {/* Floating Holographic Ring 2 with Glowing Beads */}
        <motion.div
          animate={{
            rotateX: [60, 50, 60],
            rotateY: [15, -15, 15],
            rotateZ: [360, 0],
          }}
          transition={{
            rotateZ: { repeat: Infinity, duration: 10, ease: "linear" },
            rotateX: { repeat: Infinity, duration: 5, ease: "easeInOut" },
            rotateY: { repeat: Infinity, duration: 4, ease: "easeInOut" }
          }}
          className="absolute w-52 h-52 rounded-full border border-[#5a5a40]/30 pointer-events-none"
          style={{ transformStyle: 'preserve-3d' }}
        />

        {/* 3D Realistic Animal Sphere / Model Container */}
        <motion.div
          animate={{
            y: [-8, 8, -8],
            rotateY: [-6, 6, -6],
            rotateX: [3, -3, 3]
          }}
          transition={{
            y: { repeat: Infinity, duration: 2.4, ease: "easeInOut" },
            rotateY: { repeat: Infinity, duration: 3.2, ease: "easeInOut" },
            rotateX: { repeat: Infinity, duration: 2.8, ease: "easeInOut" }
          }}
          className="relative z-10 w-32 h-32 rounded-3xl flex items-center justify-center shadow-[0_20px_45px_-10px_rgba(90,90,64,0.3)]"
          style={{
            transformStyle: 'preserve-3d',
            background: 'linear-gradient(145deg, #ffffff, #f4efe4)',
            border: '2px solid rgba(227, 222, 201, 0.9)',
            boxShadow: '0 25px 50px -12px rgba(160, 82, 45, 0.25), inset 0 2px 4px rgba(255, 255, 255, 0.9), inset 0 -4px 8px rgba(90, 90, 64, 0.1)'
          }}
        >
          {/* Specular 3D Light Sheen */}
          <div className="absolute top-1.5 left-2 w-14 h-7 bg-white/70 rounded-full blur-[1px] -rotate-12 pointer-events-none" />

          {/* Dynamic 3D Animal Avatar */}
          <div className="relative flex flex-col items-center justify-center">
            
            {/* Animated Mascot Animal Face & Details */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeAnimalIndex}
                initial={{ scale: 0.7, opacity: 0, rotateY: -60 }}
                animate={{ scale: 1, opacity: 1, rotateY: 0 }}
                exit={{ scale: 0.7, opacity: 0, rotateY: 60 }}
                transition={{ duration: 0.45, ease: "easeOut" }}
                className="relative flex flex-col items-center justify-center"
              >
                {/* 3D Realistic Animal SVG Render */}
                <div className="relative w-20 h-20 flex items-center justify-center">
                  
                  {activeAnimalIndex === 0 && (
                    // 3D Realistic Dog with breathing ears and blinking eyes
                    <svg viewBox="0 0 100 100" className="w-20 h-20 filter drop-shadow-md">
                      {/* Left Ear */}
                      <motion.ellipse
                        cx="26"
                        cy="32"
                        rx="10"
                        ry="18"
                        fill="#b27938"
                        transform="rotate(-15 26 32)"
                        animate={{ rotate: [-15, -22, -15] }}
                        transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
                      />
                      {/* Right Ear */}
                      <motion.ellipse
                        cx="74"
                        cy="32"
                        rx="10"
                        ry="18"
                        fill="#b27938"
                        transform="rotate(15 74 32)"
                        animate={{ rotate: [15, 22, 15] }}
                        transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
                      />
                      {/* Head Base */}
                      <circle cx="50" cy="50" r="32" fill="#d49b55" />
                      <path d="M30 45 Q50 65 70 45 Q50 78 30 45" fill="#f5dfbb" />
                      
                      {/* Realistic Snout */}
                      <ellipse cx="50" cy="58" rx="14" ry="11" fill="#f5dfbb" />
                      <path d="M44 54 C46 51, 54 51, 56 54 C58 57, 52 61, 50 61 C48 61, 42 57, 44 54 Z" fill="#2d2218" />
                      
                      {/* Dog Tongue Panting */}
                      <motion.path
                        d="M48 62 C48 68, 52 68, 52 62 Z"
                        fill="#e57373"
                        animate={{ scaleY: [1, 1.4, 1] }}
                        transition={{ repeat: Infinity, duration: 0.8, ease: "easeInOut" }}
                      />

                      {/* Eyes with Blink */}
                      {!blink ? (
                        <>
                          <circle cx="39" cy="44" r="4.5" fill="#2d2218" />
                          <circle cx="40.5" cy="42.5" r="1.5" fill="#ffffff" />
                          <circle cx="61" cy="44" r="4.5" fill="#2d2218" />
                          <circle cx="62.5" cy="42.5" r="1.5" fill="#ffffff" />
                        </>
                      ) : (
                        <>
                          <path d="M35 44 Q39 40 43 44" stroke="#2d2218" strokeWidth="2" strokeLinecap="round" fill="none" />
                          <path d="M57 44 Q61 40 65 44" stroke="#2d2218" strokeWidth="2" strokeLinecap="round" fill="none" />
                        </>
                      )}

                      {/* Medical Cross Collar Charm */}
                      <circle cx="50" cy="80" r="6" fill="#a0522d" />
                      <path d="M50 76 V84 M46 80 H54" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  )}

                  {activeAnimalIndex === 1 && (
                    // 3D Realistic Cat with perked ears and curious gaze
                    <svg viewBox="0 0 100 100" className="w-20 h-20 filter drop-shadow-md">
                      {/* Cat Ears with Pink Inner */}
                      <polygon points="20,42 35,15 48,34" fill="#7a8b99" />
                      <polygon points="24,39 35,21 44,34" fill="#f8bbd0" />
                      <polygon points="80,42 65,15 52,34" fill="#7a8b99" />
                      <polygon points="76,39 65,21 56,34" fill="#f8bbd0" />

                      {/* Cat Head */}
                      <circle cx="50" cy="50" r="30" fill="#90a4ae" />
                      <path d="M32 50 Q50 68 68 50 Q50 76 32 50" fill="#cfd8dc" />

                      {/* Nose & Whiskers */}
                      <polygon points="47,56 53,56 50,60" fill="#f48fb1" />
                      <line x1="24" y1="56" x2="42" y2="58" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" />
                      <line x1="24" y1="62" x2="42" y2="61" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" />
                      <line x1="76" y1="56" x2="58" y2="58" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" />
                      <line x1="76" y1="62" x2="58" y2="61" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" />

                      {/* Emerald Cat Eyes */}
                      {!blink ? (
                        <>
                          <ellipse cx="38" cy="46" rx="5" ry="6.5" fill="#4caf50" />
                          <ellipse cx="38" cy="46" rx="1.8" ry="5.5" fill="#1b5e20" />
                          <circle cx="39.5" cy="43.5" r="1.3" fill="#ffffff" />
                          
                          <ellipse cx="62" cy="46" rx="5" ry="6.5" fill="#4caf50" />
                          <ellipse cx="62" cy="46" rx="1.8" ry="5.5" fill="#1b5e20" />
                          <circle cx="63.5" cy="43.5" r="1.3" fill="#ffffff" />
                        </>
                      ) : (
                        <>
                          <path d="M33 46 Q38 43 43 46" stroke="#263238" strokeWidth="2" strokeLinecap="round" fill="none" />
                          <path d="M57 46 Q62 43 67 46" stroke="#263238" strokeWidth="2" strokeLinecap="round" fill="none" />
                        </>
                      )}

                      {/* Bell Collar */}
                      <circle cx="50" cy="78" r="5" fill="#ffd54f" />
                      <circle cx="50" cy="79" r="1" fill="#795548" />
                    </svg>
                  )}

                  {activeAnimalIndex === 2 && (
                    // 3D Realistic Horse / Livestock Stallion
                    <svg viewBox="0 0 100 100" className="w-20 h-20 filter drop-shadow-md">
                      {/* Mane */}
                      <path d="M30 20 Q45 28 35 55 Q25 40 30 20" fill="#3e2723" />
                      
                      {/* Ears */}
                      <polygon points="38,28 44,12 50,26" fill="#6d4c41" />
                      <polygon points="46,28 52,14 58,26" fill="#5d4037" />

                      {/* Horse Head Contour */}
                      <path d="M42 26 L62 28 L72 58 L58 74 L42 66 L38 38 Z" fill="#8d6e63" />
                      <ellipse cx="60" cy="68" rx="8" ry="6" fill="#4e342e" />
                      <circle cx="62" cy="67" r="1.8" fill="#212121" />

                      {/* Horse White Blaze */}
                      <path d="M48 30 L55 31 L58 55 L54 66 L50 62 L52 46 Z" fill="#efebe9" />

                      {/* Eye */}
                      {!blink ? (
                        <>
                          <circle cx="48" cy="40" r="3.5" fill="#212121" />
                          <circle cx="49" cy="39" r="1" fill="#ffffff" />
                        </>
                      ) : (
                        <path d="M45 40 L51 40" stroke="#212121" strokeWidth="2" strokeLinecap="round" />
                      )}

                      {/* Bridle Strap */}
                      <line x1="42" y1="36" x2="60" y2="68" stroke="#ffb300" strokeWidth="1.5" />
                    </svg>
                  )}
                </div>

                {/* 3D Orbiting Floating Paw Icon */}
                <motion.div
                  animate={{
                    x: [18, -18, 18],
                    y: [-12, 12, -12],
                    rotate: [0, 360],
                    scale: [0.9, 1.1, 0.9]
                  }}
                  transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                  className="absolute -top-1 -right-2 text-xs bg-white/90 rounded-full p-1 shadow-sm border border-[#e3dec9]"
                >
                  🐾
                </motion.div>
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Dynamic 3D Ground Contact Shadow */}
        <motion.div
          animate={{
            scale: [0.75, 1.15, 0.75],
            opacity: [0.35, 0.15, 0.35]
          }}
          transition={{ repeat: Infinity, duration: 2.4, ease: "easeInOut" }}
          className="w-24 h-4 rounded-[100%] bg-[#5a5a40]/30 blur-[4px] mt-4"
        />
      </div>

      {/* Dynamic Text Status Indicator */}
      <div className="text-center space-y-2 mt-6 max-w-xs">
        <div className="inline-flex items-center gap-1.5 bg-[#f5ede2] text-[#a0522d] text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full border border-[#e3dec9] shadow-2xs">
          <span className="w-2 h-2 rounded-full bg-[#a0522d] animate-ping" />
          <span>{currentAnimal.name}</span>
        </div>

        <h3 className="font-serif text-lg font-bold text-[#3c3c3b] tracking-tight">
          {message}
        </h3>
        
        <p className="text-xs text-[#7a766f] font-medium leading-relaxed">
          {subMessage}
        </p>

        {/* Progress Bar Shimmer */}
        <div className="w-full bg-[#e3dec9]/50 h-1.5 rounded-full overflow-hidden mt-3 relative">
          <motion.div
            animate={{ x: ['-100%', '100%'] }}
            transition={{ repeat: Infinity, duration: 1.4, ease: "easeInOut" }}
            className="w-1/2 h-full bg-gradient-to-r from-transparent via-[#a0522d] to-transparent rounded-full"
          />
        </div>
      </div>
    </div>
  );
};
