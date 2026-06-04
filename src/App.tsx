import { useState, useEffect } from 'react';
import { UserProfile } from './types';
import { getLocalSession, AuthService } from './lib/storage';
import { testConnection } from './lib/firebase';

// Import modular layouts
import { Navbar } from './components/Navbar';
import { AuthScreen } from './components/AuthScreen';
import { ExploreFeed } from './components/ExploreFeed';
import { CommunityFeed } from './components/CommunityFeed';
import { Marketplace } from './components/Marketplace';
import { PetAds } from './components/PetAds';
import { ProfilePage } from './components/ProfilePage';

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(getLocalSession());
  const [activeSection, setActiveSection] = useState<string>('explore');

  // Unified Firebase test connection check on initial system boot
  useEffect(() => {
    testConnection();
  }, []);

  // Sync and validate that the stored session user profile still exists in Firestore or Fallback DB
  useEffect(() => {
    let active = true;
    const validateSession = async () => {
      if (currentUser) {
        try {
          const isValid = await AuthService.validateUserProfile(currentUser.uid);
          if (active && !isValid) {
            console.warn("Stored session user profile no longer exists in DB. Logging out.");
            handleLogout();
          }
        } catch (e) {
          console.error("Error validating stored session:", e);
        }
      }
    };
    validateSession();
    return () => {
      active = false;
    };
  }, [currentUser?.uid]);

  const handleAuthSuccess = (user: UserProfile) => {
    setCurrentUser(user);
    setActiveSection('explore');
  };

  const handleLogout = async () => {
    await AuthService.signOut();
    setCurrentUser(null);
  };

  const handleUpdateUserProfile = (updated: UserProfile) => {
    setCurrentUser(updated);
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen text-center">
        <AuthScreen onAuthSuccess={handleAuthSuccess} authService={AuthService} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#fdfbf7] text-[#3c3c3b]">
      
      {/* GLOBAL APPLICATION NAVBAR */}
      <Navbar
        user={currentUser}
        activeSection={activeSection}
        onNavigate={setActiveSection}
        onLogout={handleLogout}
      />

      {currentUser && !currentUser.emailVerified && (
        <div className="bg-amber-50/80 border-b border-amber-200 text-amber-900 text-xs py-2.5 px-4 text-center font-medium flex items-center justify-center gap-3 animate-fadeIn">
          <span>⚠️ Your email is unverified. Please verify your email to ensure secure access.</span>
          <button
            onClick={() => setActiveSection('profile')}
            className="underline font-bold hover:text-amber-700 bg-transparent border-none p-0 cursor-pointer text-xs"
          >
            Go to Profile configuration to resend link or check live status →
          </button>
        </div>
      )}

      {/* RENDERED FEED ROUTER BOX */}
      <main className="flex-1 container max-w-7xl mx-auto px-4 py-8">
        {activeSection === 'explore' && (
          <ExploreFeed
            currentUser={currentUser}
            onUpdateUser={handleUpdateUserProfile}
            activeSection={activeSection}
            onNavigate={setActiveSection}
          />
        )}

        {activeSection === 'community' && (
          <CommunityFeed currentUser={currentUser} />
        )}

        {activeSection === 'marketplace' && (
          <Marketplace currentUser={currentUser} />
        )}

        {activeSection === 'pet_ads' && (
          <PetAds currentUser={currentUser} />
        )}

        {activeSection === 'profile' && (
          <ProfilePage
            currentUser={currentUser}
            onUpdateUser={handleUpdateUserProfile}
            onDeleteSuccess={handleLogout}
          />
        )}
      </main>

      {/* FOOTER METRICS RAIL - Natural Tones Theme */}
      <footer className="py-6 mt-8 border-t border-[#e6e2da] bg-[#f5f2ed] text-center text-xs text-[#7a766f] w-full">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="font-semibold text-left">
            🌱 © 2026 VetAxis PK · <span className="font-normal text-[#a8a49c]">Certified Veterinary Clinical Network of Pakistan</span>
          </div>
          <div className="flex items-center gap-3 text-[10px] font-mono font-bold tracking-wider uppercase text-[#5a5a40] bg-[#ece8df] px-3 py-1.5 rounded-full border border-[#e6e2da]">
            <span className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></span>
            Cloud Firestore Synced
          </div>
        </div>
      </footer>

    </div>
  );
}
