import { useState } from 'react';
import { UserProfile, VetNotification } from '../types';
import { Menu, X, LogOut, User, Compass, MessageSquare, ShoppingBag, Grid, Bell, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface NavbarProps {
  user: UserProfile | null;
  activeSection: string;
  onNavigate: (section: string) => void;
  onLogout: () => void;
  notifications: VetNotification[];
  onMarkAllAsRead: () => void;
  onDeleteNotification: (id: string) => void;
  onNotificationClick?: (notif: VetNotification) => void;
}

export function Navbar({ 
  user, 
  activeSection, 
  onNavigate, 
  onLogout,
  notifications,
  onMarkAllAsRead,
  onDeleteNotification,
  onNotificationClick
}: NavbarProps) {
  if (!user) return null;

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

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
    { id: 'livestock', label: 'Livestock', icon: '🐄' },
    { id: 'community', label: 'Community', icon: '💬' },
    { id: 'marketplace', label: 'Products', icon: '🛒' },
    { id: 'pet_ads', label: 'Pet Ads', icon: '🐾' },
    { id: 'jobs', label: 'Job Board', icon: '💼' },
    { id: 'subscription', label: 'Subscription Portal', icon: '💳' },
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
        </div>

        {/* Right Header Navigation - Notification & Clean Profile Button */}
        <div className="flex items-center gap-3">
          
          {/* Notification Bell Dropdown */}
          <div className="relative">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsNotifOpen(!isNotifOpen)}
              className={`relative flex items-center justify-center p-2.5 rounded-xl border border-b-[3px] transition-all duration-150 cursor-pointer shadow-xs ${
                isNotifOpen 
                  ? 'bg-[#5a5a40] text-white border-[#5a5a40] border-b-[#3e3e2b]' 
                  : 'bg-white text-[#5a5a40] border-[#e3dec9] border-b-[#cdc6ad] hover:bg-[#fcf9f2]'
              }`}
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4 sm:w-5 sm:h-5 animate-pulse" />
              {notifications.filter(n => !n.read).length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-red-600 text-[9px] font-black text-white border border-white animate-bounce shadow">
                  {notifications.filter(n => !n.read).length}
                </span>
              )}
            </motion.button>

            <AnimatePresence>
              {isNotifOpen && (
                <>
                  {/* Backdrop for closing */}
                  <div 
                    className="fixed inset-0 z-[240]" 
                    onClick={() => setIsNotifOpen(false)} 
                  />
                  
                  <motion.div
                    initial={{ opacity: 0, y: 15, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 15, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-3.5 z-[250] w-76 sm:w-96 bg-white border border-[#e3dec9] border-b-[5px] border-b-[#cdc6ad] rounded-2xl p-4 shadow-xl overflow-hidden"
                  >
                    <div className="flex items-center justify-between border-b border-[#f4f1e9] pb-3 mb-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-serif font-black text-[#3c3c3b]">🔔 Alerts</span>
                        {notifications.filter(n => !n.read).length > 0 && (
                          <span className="bg-red-50 text-red-700 text-[9px] font-black px-1.5 py-0.5 rounded-full border border-red-200">
                            {notifications.filter(n => !n.read).length} New
                          </span>
                        )}
                      </div>
                      {notifications.filter(n => !n.read).length > 0 && (
                        <button
                          onClick={() => {
                            onMarkAllAsRead();
                          }}
                          className="text-[9px] uppercase font-black text-[#5a5a40] hover:text-[#3e3e2b] underline bg-transparent border-none cursor-pointer"
                        >
                          Mark as read
                        </button>
                      )}
                    </div>

                    <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                      {notifications.length === 0 ? (
                        <div className="py-8 text-center flex flex-col items-center justify-center gap-1 text-[#7a766f]">
                          <span className="text-lg">🪶</span>
                          <p className="text-[11px] font-black">All Caught Up</p>
                          <p className="text-[10px] text-center max-w-[200px] leading-tight">No notifications here yet! Try interacting in community or applying for jobs.</p>
                        </div>
                      ) : (
                        notifications.map(n => (
                          <div 
                            key={n.id}
                            onClick={() => {
                              if (onNotificationClick) {
                                onNotificationClick(n);
                                setIsNotifOpen(false); // Auto collapse dropdown on click
                              }
                            }}
                            className={`flex items-start justify-between gap-2.5 p-2.5 rounded-xl border transition-all cursor-pointer hover:bg-stone-50/50 ${
                              n.read 
                                ? 'bg-[#fdfbf7]/40 border-[#f4f1e9]' 
                                : 'bg-amber-50/10 border-amber-200/50 shadow-2xs'
                            }`}
                          >
                            <div className="flex gap-2">
                              <span className="text-xs mt-0.5 select-none filter drop-shadow">
                                {n.type === 'like' && '❤️'}
                                {n.type === 'comment' && '💬'}
                                {n.type === 'apply' && '📄'}
                                {n.type === 'status_change' && '✨'}
                              </span>
                              <div className="flex flex-col gap-0.5">
                                <p className="text-[11px] text-[#3c3c3b] font-medium leading-tight">
                                  {n.message}
                                </p>
                                <span className="text-[8px] text-[#a49f92] font-semibold">
                                  {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {new Date(n.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                </span>
                              </div>
                            </div>

                            <button
                              onClick={(e) => {
                                e.stopPropagation(); // Avoid triggering navigation redirs when deleting
                                onDeleteNotification(n.id);
                              }}
                              className="text-[#a49f92] hover:text-red-700 p-0.5 rounded hover:bg-red-50/50 transition-colors border-none bg-transparent cursor-pointer ml-1.5"
                              title="Delete alert"
                            >
                              <Trash2 className="w-3.5 h-3.5 opacity-70 hover:opacity-100" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {/* Unified Profile & Menu Trigger Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsSidebarOpen(true)}
            className={`flex items-center justify-center p-0.5 rounded-full border border-b-[3px] transition-all duration-150 cursor-pointer shadow-xs ${
              isSidebarOpen 
                ? 'border-[#5a5a40] border-b-[#3e3e2b]' 
                : 'border-[#e3dec9] border-b-[#cdc6ad] hover:bg-[#fcf9f2]'
            }`}
            title="Open Menu & Account Options"
          >
            {user.profilePic && user.profilePic !== 'default' ? (
              <img
                src={user.profilePic}
                alt={user.name}
                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover border-2 shadow-xs ${
                  user.subscriptionTier === 'Platinum' ? 'border-indigo-500' :
                  user.subscriptionTier === 'Gold' ? 'border-amber-400' :
                  user.subscriptionTier === 'Silver' ? 'border-slate-400' :
                  user.isVerified ? 'border-amber-400' : 'border-white'
                }`}
              />
            ) : (
              <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full font-black flex items-center justify-center text-xs shadow-xs ${
                user.subscriptionTier === 'Platinum' ? 'bg-indigo-600 text-white' :
                user.subscriptionTier === 'Gold' ? 'bg-amber-500 text-[#3c3c3b]' :
                user.subscriptionTier === 'Silver' ? 'bg-slate-500 text-white' :
                user.isVerified ? 'bg-amber-500 text-[#3c3c3b]' : 'bg-[#5a5a40] text-white'
              }`}>
                {initials}
              </div>
            )}
          </motion.button>
        </div>
      </nav>

      {/* Slide-out Right Sidebar Task Bar */}
      <AnimatePresence>
        {isSidebarOpen && (
          <div className="fixed inset-0 z-[300]">
            {/* Dark overlay backdrop with blur */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/45 backdrop-blur-xs"
              onClick={() => setIsSidebarOpen(false)}
            />

            {/* Sliding sidebar container */}
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 220 }}
              className="absolute right-0 top-0 h-full w-84 max-w-[85vw] bg-white border-l border-[#e3dec9] shadow-[0_0_50px_rgba(0,0,0,0.15)] flex flex-col justify-between overflow-y-auto"
            >
              
              {/* Top region */}
              <div>
                <div className="p-5 flex items-center justify-between border-b border-[#f4f1e9]">
                  <div className="flex items-center gap-2 font-serif text-xl font-bold text-[#5a5a40]">
                    <span>🐾</span> Vet<span className="text-[#a0522d]">Axis</span>
                    {user.subscriptionTier ? (
                      <span className={`text-white rounded-md text-[8px] font-black px-1.5 py-0.5 tracking-wider uppercase ${
                        user.subscriptionTier === 'Silver' ? 'bg-slate-500' :
                        user.subscriptionTier === 'Gold' ? 'bg-amber-500' :
                        'bg-indigo-600 animate-pulse'
                      }`}>
                        ⭐ {user.subscriptionTier}
                      </span>
                    ) : user.isVerified ? (
                      <span className="bg-amber-500 text-white rounded-md text-[8px] font-black px-1.5 py-0.5 tracking-wider uppercase">
                        ⭐ GOLD
                      </span>
                    ) : null}
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
                  <p className="px-3 text-[10px] uppercase font-bold text-[#a49f92] tracking-wider mb-2">Systems Panel</p>
                  
                  {navItems
                    .filter(item => {
                      if (item.id === 'subscription') {
                        return user.role === 'clinic' || user.role === 'doctor';
                      }
                      return true;
                    })
                    .map(item => {
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
                <p className="text-[10px] uppercase font-bold text-[#a49f92] tracking-wider">Active Practitioner Credentials</p>

                {/* Profile Card Option */}
                <button
                  onClick={() => handleMobileNav('profile')}
                  className={`w-full flex items-center justify-between p-3.5 rounded-2xl border transition-all text-left cursor-pointer ${
                    activeSection === 'profile'
                      ? 'bg-[#5a5a40] text-white border-[#5a5a40] border-b-[4px] border-b-[#3e3e2b]'
                      : user.subscriptionTier === 'Platinum'
                        ? 'bg-neutral-900 border-indigo-500 border-b-[3px] border-b-indigo-700 text-white hover:bg-neutral-800'
                        : user.subscriptionTier === 'Gold'
                        ? 'bg-amber-50/50 hover:bg-amber-50/85 text-[#3c3c3b] border-amber-300 border-b-[3px] border-b-amber-500'
                        : user.subscriptionTier === 'Silver'
                        ? 'bg-slate-50 hover:bg-slate-100 text-[#3c3c3b] border-slate-350 border-b-[3px] border-b-slate-400'
                        : user.isVerified 
                        ? 'bg-amber-50/50 hover:bg-amber-50/85 text-[#3c3c3b] border-amber-300 border-b-[3px] border-b-amber-500'
                        : 'bg-white text-[#3c3c3b] border-[#e3dec9] border-b-[3px] border-b-[#cdc6ad] hover:bg-[#fcf9f2]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {user.profilePic && user.profilePic !== 'default' ? (
                      <img
                        src={user.profilePic}
                        alt={user.name}
                        className={`w-10 h-10 rounded-full object-cover border-2 shadow-sm ${
                          user.subscriptionTier === 'Platinum' ? 'border-indigo-500' :
                          user.subscriptionTier === 'Gold' ? 'border-amber-400' :
                          user.subscriptionTier === 'Silver' ? 'border-slate-400' :
                          user.isVerified ? 'border-amber-400' : 'border-white'
                        }`}
                      />
                    ) : (
                      <div className={`w-10 h-10 rounded-full font-bold flex items-center justify-center text-xs shadow-xs ${
                        user.subscriptionTier === 'Platinum' ? 'bg-indigo-600 text-white' :
                        user.subscriptionTier === 'Gold' ? 'bg-amber-500 text-white' :
                        user.subscriptionTier === 'Silver' ? 'bg-slate-500 text-white' :
                        user.isVerified ? 'bg-amber-500 text-white' : 'bg-[#5a5a40] text-white'
                      }`}>
                        {initials}
                      </div>
                    )}
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1">
                        <span className="font-bold text-sm leading-tight truncate max-w-[120px]">{user.name}</span>
                        {(user.subscriptionTier || user.isVerified) && <span className="text-amber-500 font-bold">✓</span>}
                      </div>
                      <span className={`text-[10px] font-semibold uppercase tracking-wider ${
                        activeSection === 'profile' ? 'text-[#e3dec9]' : 'text-[#7a766f]'
                      }`}>
                        {user.role} {user.subscriptionTier ? `• ${user.subscriptionTier} Master` : user.isVerified ? '• Vetted Gold' : ''}
                      </span>
                    </div>
                  </div>
                  <User className={`w-4 h-4 mr-1 ${activeSection === 'profile' ? 'text-white/80' : 'text-[#5a5a40]'}`} />
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
