import { useState } from 'react';
import { UserProfile } from '../types';
import { Menu, X, LogOut, User, Compass, MessageSquare, ShoppingBag, Grid } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface NavbarProps {
  user: UserProfile | null;
  activeSection: string;
  onNavigate: (section: string) => void;
  onLogout: () => void;
}

export function Navbar({ user, activeSection, onNavigate, onLogout }: NavbarProps) {
  if (!user) return null;

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const initials = user.name
    .trim()
    .split(/\s+/)
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const handleMobileNav = (section: string) => {
    onNavigate(section);
    setIsSidebarOpen(false);
  };

  const navItems = [
    { id: 'explore', label: 'Explore Vets', icon: '🩺' },
    { id: 'community', label: 'Community', icon: '💬' },
    { id: 'marketplace', label: 'Products', icon: '🛒' },
    { id: 'pet_ads', label: 'Pet Ads', icon: '🐾' },
  ];

  return (
    <>
      <nav className="sticky top-0 z-[200] max-w-7xl mx-auto w-[95%] mt-4 rounded-2xl border border-[#e3dec9] border-b-[4px] border-b-[#cdc6ad] bg-white/90 backdrop-blur-md px-4 md:px-8 h-18 flex items-center justify-between shadow-[0_10px_30px_-10px_rgba(90,90,64,0.15)]">
        <div className="flex items-center gap-6 md:gap-10">
          <motion.button
            whileHover={{ scale: 1.05, y: -1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onNavigate('explore')}
            className="flex items-center gap-2 font-serif text-2xl font-bold text-[#5a5a40] bg-transparent border-none cursor-pointer select-none"
          >
            <span className="text-2xl filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.15)]">🐾</span>
            <span className="tracking-tight font-display text-2xl">
              Vet<span className="text-[#a0522d] font-bold">Axis</span>
            </span>
          </motion.button>
          
          {/* Desktop Navigation Link Tabs with Real Layout Indicator */}
          <div className="hidden md:flex items-center gap-2 relative">
            {navItems.map(item => {
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`relative cursor-pointer px-4 py-2.5 rounded-xl text-sm font-bold transition-colors duration-200 select-none border-none bg-transparent ${
                    isActive ? 'text-white' : 'text-[#7a766f] hover:text-[#3c3c3b]'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeNavBackground"
                      className="absolute inset-0 bg-[#5a5a40] rounded-xl border-b-[3px] border-[#3e3e2b]"
                      style={{ originY: '0px' }}
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-1.5">
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Header Navigation */}
        <div className="flex items-center gap-3">
          {/* Desktop Profile & Logout */}
          <div className="hidden md:flex items-center gap-3">
            <motion.button
              whileHover={{ y: -2, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onNavigate('profile')}
              className={`flex items-center gap-2.5 text-sm font-bold p-1 py-1 pr-4.5 rounded-full border transition-all cursor-pointer ${
                activeSection === 'profile'
                  ? 'bg-[#5a5a40] text-white border-[#5a5a40] shadow-[0_4px_12px_rgba(90,90,64,0.2)]'
                  : 'bg-[#f4f1e9] text-[#3c3c3b] border-[#e3dec9] hover:bg-white hover:shadow-md'
              }`}
            >
              {user.profilePic && user.profilePic !== 'default' ? (
                <img
                  src={user.profilePic}
                  alt={user.name}
                  className="w-8 h-8 rounded-full object-cover border-2 border-white shadow-sm"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-[#5a5a40] text-white font-bold flex items-center justify-center text-xs shadow-sm">
                  {initials}
                </div>
              )}
              <span className="max-w-[100px] truncate">{user.name.split(' ')[0]}</span>
            </motion.button>

            <motion.button
              whileHover={{ y: -2, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onLogout}
              className="cursor-pointer text-xs font-bold text-red-700 bg-red-50/90 border border-red-200 border-b-[3px] border-b-red-300 px-4 py-2.5 rounded-xl hover:bg-red-100 hover:text-red-800 transition-all"
            >
              Sign Out
            </motion.button>
          </div>

          {/* Mobile Menu Trigger Button */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsSidebarOpen(true)}
            className="flex md:hidden items-center justify-center p-3 rounded-xl border border-[#e3dec9] border-b-[3px] border-b-[#cdc6ad] bg-white text-[#5a5a40] hover:bg-[#f4f1e9] transition-all cursor-pointer shadow-sm"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </motion.button>
        </div>
      </nav>

      {/* Slide-out Sidebar Drawer on Mobile */}
      <AnimatePresence>
        {isSidebarOpen && (
          <div className="fixed inset-0 z-[300] md:hidden">
            {/* Dark overlay backdrop with blur */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-xs"
              onClick={() => setIsSidebarOpen(false)}
            />

            {/* Sliding sidebar container */}
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="absolute right-0 top-0 h-full w-80 max-w-[85vw] bg-white border-l border-[#e3dec9] shadow-2xl flex flex-col justify-between overflow-y-auto"
            >
              
              {/* Top region */}
              <div>
                <div className="p-5 flex items-center justify-between border-b border-[#f4f1e9]">
                  <div className="flex items-center gap-2 font-serif text-xl font-bold text-[#5a5a40]">
                    <span>🐾</span> Vet<span className="text-[#a0522d]">Axis</span>
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setIsSidebarOpen(false)}
                    className="p-2 rounded-full hover:bg-[#f4f1e9] text-[#7a766f] transition-all cursor-pointer border border-[#e3dec9]"
                  >
                    <X className="w-5 h-5" />
                  </motion.button>
                </div>

                {/* Navigation list */}
                <div className="p-4 flex flex-col gap-2">
                  <p className="px-3 text-[10px] uppercase font-bold text-[#a49f92] tracking-wider mb-2">Navigation</p>
                  
                  {navItems.map(item => {
                    const isActive = activeSection === item.id;
                    return (
                      <motion.button
                        key={item.id}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleMobileNav(item.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-extrabold transition-all border border-transparent text-left cursor-pointer ${
                          isActive
                            ? 'bg-[#5a5a40] text-white border-[#5a5a40] border-b-[4px] border-b-[#3e3e2b]'
                            : 'bg-transparent text-[#5a5a40] hover:bg-[#fcf9f2] hover:border-[#e3dec9]'
                        }`}
                      >
                        <span className="text-lg">{item.icon}</span>
                        <span>{item.label}</span>
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Bottom Region (Profile & Signout) */}
              <div className="p-5 border-t border-[#f4f1e9] bg-[#fcf9f2]/90 flex flex-col gap-4">
                <p className="text-[10px] uppercase font-bold text-[#a49f92] tracking-wider">Account</p>

                {/* Profile Card Option */}
                <button
                  onClick={() => handleMobileNav('profile')}
                  className={`w-full flex items-center justify-between p-3.5 rounded-2xl border transition-all text-left cursor-pointer ${
                    activeSection === 'profile'
                      ? 'bg-[#5a5a40] text-white border-[#5a5a40] border-b-[4px] border-b-[#3e3e2b]'
                      : 'bg-white text-[#3c3c3b] border-[#e3dec9] border-b-[3px] border-b-[#cdc6ad] hover:bg-[#fcf9f2]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {user.profilePic && user.profilePic !== 'default' ? (
                      <img
                        src={user.profilePic}
                        alt={user.name}
                        className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-[#5a5a40] text-white font-bold flex items-center justify-center text-xs shadow-xs">
                        {initials}
                      </div>
                    )}
                    <div className="flex flex-col">
                      <span className="font-bold text-sm leading-tight truncate max-w-[120px]">{user.name}</span>
                      <span className={`text-[10px] font-semibold uppercase tracking-wider ${activeSection === 'profile' ? 'text-[#e3dec9]' : 'text-[#7a766f]'}`}>
                        {user.role}
                      </span>
                    </div>
                  </div>
                  <User className="w-4 h-4 opacity-75 mr-1" />
                </button>

                {/* Log Out Button */}
                <button
                  onClick={() => {
                    setIsSidebarOpen(false);
                    onLogout();
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3.5 bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-800 border border-red-200 border-b-[3px] border-b-red-300 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out Account</span>
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
