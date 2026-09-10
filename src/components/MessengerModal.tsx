import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  MessageCircle,
  Search,
  X,
  Plus,
  Clock,
  CheckCheck,
  Check,
  Trash2,
  Stethoscope,
  Building2,
  User,
  Sparkles,
  RefreshCw,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { ChatConversation, UserProfile, UserRole } from '../types';
import { ChatService, AUTO_DISAPPEAR_DURATION_MS, formatDisappearingCountdown } from '../lib/chatService';
import { AuthService } from '../lib/storage';
import { useAndroidHardwareBackButton, triggerMobileHaptic } from '../lib/androidBridge';

interface MessengerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onOpenChatWith: (user: UserProfile) => void;
  onExploreClinicians?: () => void;
}

export const MessengerModal: React.FC<MessengerModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onOpenChatWith,
  onExploreClinicians
}) => {
  useAndroidHardwareBackButton(isOpen, onClose);

  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'doctor' | 'clinic' | 'unread'>('all');
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [publicClinicians, setPublicClinicians] = useState<UserProfile[]>([]);
  const [clinicianSearch, setClinicianSearch] = useState('');
  const [isLoadingClinicians, setIsLoadingClinicians] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Subscribe to user conversations in real-time
  useEffect(() => {
    if (!currentUser?.uid || !isOpen) return;

    const unsubscribe = ChatService.subscribeToUserConversations(currentUser.uid, (updatedList) => {
      setConversations(updatedList);
    });

    return () => {
      unsubscribe();
    };
  }, [currentUser?.uid, isOpen]);

  // Load public clinicians when "New Chat" is opened
  useEffect(() => {
    if (isNewChatOpen && publicClinicians.length === 0) {
      setIsLoadingClinicians(true);
      AuthService.getPublicClinicians()
        .then((list) => {
          // Filter out current user from selection
          setPublicClinicians((list || []).filter(c => c.uid !== currentUser.uid));
        })
        .catch((err) => {
          console.warn('[Messenger] Failed to load clinicians list:', err);
        })
        .finally(() => {
          setIsLoadingClinicians(false);
        });
    }
  }, [isNewChatOpen, currentUser?.uid, publicClinicians.length]);

  // Helper to extract the other participant's details
  const getOtherParticipant = (conv: ChatConversation): {
    uid: string;
    name: string;
    role: UserRole;
    profilePic?: string;
    email?: string;
    phone?: string;
  } => {
    const otherId = conv.participants?.find(id => id !== currentUser.uid) || 'unknown';
    const details = conv.participantDetails?.[otherId];
    if (details) {
      return {
        uid: otherId,
        name: details.name || 'Verified Professional',
        role: details.role || 'doctor',
        profilePic: details.profilePic,
        email: details.email,
        phone: details.phone
      };
    }
    return {
      uid: otherId,
      name: 'Veterinary Professional',
      role: 'doctor'
    };
  };

  // Filtered conversation list
  const filteredConversations = useMemo(() => {
    return conversations.filter(conv => {
      const other = getOtherParticipant(conv);
      const matchesSearch =
        other.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        other.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (conv.lastMessageText || '').toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      if (roleFilter === 'doctor') return other.role === 'doctor';
      if (roleFilter === 'clinic') return other.role === 'clinic';
      if (roleFilter === 'unread') {
        const unread = conv.unreadCount?.[currentUser.uid] || 0;
        return unread > 0;
      }
      return true;
    });
  }, [conversations, searchTerm, roleFilter, currentUser.uid]);

  // Clinicians available for starting a new chat
  const filteredClinicians = useMemo(() => {
    if (!clinicianSearch.trim()) return publicClinicians;
    const term = clinicianSearch.toLowerCase();
    return publicClinicians.filter(c =>
      c.name.toLowerCase().includes(term) ||
      c.role.toLowerCase().includes(term) ||
      (c.city || '').toLowerCase().includes(term) ||
      (c.specialization || '').toLowerCase().includes(term)
    );
  }, [publicClinicians, clinicianSearch]);

  const totalUnreadCount = useMemo(() => {
    return conversations.reduce((acc, conv) => {
      return acc + (conv.unreadCount?.[currentUser.uid] || 0);
    }, 0);
  }, [conversations, currentUser.uid]);

  const handleSelectConversation = (conv: ChatConversation) => {
    const other = getOtherParticipant(conv);
    const targetUser: UserProfile = {
      uid: other.uid,
      name: other.name,
      role: other.role,
      profilePic: other.profilePic,
      email: other.email || '',
      phone: other.phone || '',
      isVerified: true,
      createdAt: Date.now()
    };
    onClose();
    onOpenChatWith(targetUser);
  };

  const handleStartChatWithClinician = (clinician: UserProfile) => {
    setIsNewChatOpen(false);
    onClose();
    onOpenChatWith(clinician);
  };

  const handleDeleteConversation = async (convId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await ChatService.deleteConversation(convId, currentUser.uid);
    setConversations(prev => prev.filter(c => c.id !== convId));
    setDeleteConfirmId(null);
  };

  const formatTimestamp = (timestamp?: number) => {
    if (!timestamp) return '';
    const diffMs = Date.now() - timestamp;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHour < 24) return `${diffHour}h ago`;
    if (diffDay === 1) return 'Yesterday';
    if (diffDay < 15) return `${diffDay}d ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  const getRemainingDaysText = (timestamp?: number) => {
    if (!timestamp) return '15d lifespan';
    return formatDisappearingCountdown(timestamp + AUTO_DISAPPEAR_DURATION_MS);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[300] flex items-center justify-center p-3 sm:p-4 md:p-6">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs transition-opacity"
        />

        {/* Messenger Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-[#e3dec9] border-b-[6px] border-b-[#cdc6ad] flex flex-col max-h-[90vh] overflow-hidden z-10"
        >
          {/* Header */}
          <div className="px-5 py-4 bg-[#fbf9f3] border-b border-[#e3dec9] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#5a5a40] text-white flex items-center justify-center shadow-sm">
                <MessageCircle className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-serif font-black text-[#3c3c3b]">
                    Clinical Messenger
                  </h2>
                  {totalUnreadCount > 0 && (
                    <span className="bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-xs">
                      {totalUnreadCount} New
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsNewChatOpen(!isNewChatOpen)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer shadow-xs ${
                  isNewChatOpen
                    ? 'bg-[#5a5a40] text-white border-[#5a5a40]'
                    : 'bg-white text-[#5a5a40] border-[#e3dec9] hover:bg-[#f4f1e9]'
                }`}
                title="Start a new consultation with a doctor or clinic"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">New Chat</span>
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-xl text-[#7a766f] hover:text-[#3c3c3b] hover:bg-[#e3dec9]/40 transition-colors cursor-pointer"
                aria-label="Close Messenger"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* New Chat Slide-down Picker */}
          <AnimatePresence>
            {isNewChatOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="bg-[#f7f5ed] border-b border-[#e3dec9] p-4 overflow-hidden"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-serif font-black text-[#3c3c3b] flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#5a5a40]" />
                    Select a Verified Clinician or Hospital to Message:
                  </span>
                  <button
                    onClick={() => setIsNewChatOpen(false)}
                    className="text-[11px] text-[#7a766f] hover:text-[#3c3c3b] underline cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>

                <div className="relative mb-3">
                  <Search className="w-4 h-4 text-[#7a766f] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={clinicianSearch}
                    onChange={(e) => setClinicianSearch(e.target.value)}
                    placeholder="Search doctor or clinic by name, specialty, or city..."
                    className="w-full pl-9 pr-3 py-2 bg-white border border-[#e3dec9] rounded-xl text-xs text-[#3c3c3b] focus:outline-none focus:border-[#5a5a40]"
                  />
                </div>

                {isLoadingClinicians ? (
                  <div className="py-6 flex items-center justify-center gap-2 text-xs text-[#7a766f]">
                    <RefreshCw className="w-4 h-4 animate-spin text-[#5a5a40]" />
                    <span>Loading certified veterinary professionals...</span>
                  </div>
                ) : filteredClinicians.length === 0 ? (
                  <div className="py-4 text-center text-xs text-[#7a766f]">
                    No clinician found matching "{clinicianSearch}".
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                    {filteredClinicians.map((clinician) => (
                      <button
                        key={clinician.uid}
                        onClick={() => handleStartChatWithClinician(clinician)}
                        className="flex items-center gap-2.5 p-2.5 bg-white hover:bg-[#efebe0] border border-[#e3dec9] rounded-xl text-left transition-all cursor-pointer group shadow-xs"
                      >
                        {clinician.profilePic ? (
                          <img
                            src={clinician.profilePic}
                            alt={clinician.name}
                            className="w-8 h-8 rounded-full object-cover border border-[#e3dec9]"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-[#5a5a40] text-white flex items-center justify-center text-xs font-bold">
                            {clinician.name.charAt(0)}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold text-[#3c3c3b] truncate group-hover:text-[#5a5a40]">
                            {clinician.name}
                          </div>
                          <div className="text-[10px] text-[#7a766f] truncate">
                            {clinician.role === 'doctor' ? '🩺 Veterinarian' : clinician.role === 'clinic' ? '🏥 Hospital / Clinic' : '🥼 Vet Assistant'}
                            {clinician.city ? ` • ${clinician.city}` : ''}
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-[#7a766f] group-hover:text-[#5a5a40] group-hover:translate-x-0.5 transition-transform" />
                      </button>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Search and Filters */}
          <div className="p-3 border-b border-[#e3dec9] bg-white flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#7a766f] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search conversations by name or message..."
                className="w-full pl-9 pr-3 py-2 bg-[#fcfbf7] border border-[#e3dec9] rounded-xl text-xs text-[#3c3c3b] focus:outline-none focus:border-[#5a5a40]"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#7a766f] hover:text-[#3c3c3b]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
              {(['all', 'doctor', 'clinic', 'unread'] as const).map((filterKey) => (
                <button
                  key={filterKey}
                  onClick={() => setRoleFilter(filterKey)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap capitalize ${
                    roleFilter === filterKey
                      ? 'bg-[#5a5a40] text-white shadow-xs'
                      : 'bg-[#f4f1e9] text-[#5a5a40] hover:bg-[#e3dec9]'
                  }`}
                >
                  {filterKey === 'all'
                    ? 'All Chats'
                    : filterKey === 'doctor'
                    ? 'Doctors 🩺'
                    : filterKey === 'clinic'
                    ? 'Clinics 🏥'
                    : 'Unread 🔴'}
                </button>
              ))}
            </div>
          </div>

          {/* Conversations List Body */}
          <div className="flex-1 overflow-y-auto divide-y divide-[#f4f1e9] min-h-[300px]">
            {filteredConversations.length === 0 ? (
              <div className="py-12 px-6 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 rounded-2xl bg-[#f4f1e9] flex items-center justify-center text-[#5a5a40] mb-3">
                  <MessageCircle className="w-8 h-8 stroke-[1.5]" />
                </div>
                <h3 className="text-sm font-serif font-black text-[#3c3c3b] mb-1">
                  {searchTerm || roleFilter !== 'all'
                    ? 'No matching consultations found'
                    : 'No Active Consultations Yet'}
                </h3>
                <p className="text-xs text-[#7a766f] max-w-sm mb-4">
                  {searchTerm || roleFilter !== 'all'
                    ? 'Try clearing search filters or check all conversations.'
                    : 'Your conversations with verified veterinary physicians and animal hospitals will appear here. All messages automatically disappear after 15 days.'}
                </p>

                <div className="flex flex-wrap items-center justify-center gap-2">
                  <button
                    onClick={() => setIsNewChatOpen(true)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#5a5a40] text-white text-xs font-bold hover:bg-[#484833] transition-all cursor-pointer shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Start New Conversation</span>
                  </button>
                  {onExploreClinicians && (
                    <button
                      onClick={() => {
                        onClose();
                        onExploreClinicians();
                      }}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-[#e3dec9] text-[#5a5a40] text-xs font-bold hover:bg-[#f4f1e9] transition-all cursor-pointer shadow-xs"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Browse Doctors & Clinics</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const other = getOtherParticipant(conv);
                const unreadCount = conv.unreadCount?.[currentUser.uid] || 0;
                const isSentByMe = conv.lastSenderId === currentUser.uid;
                const remainingLifespan = getRemainingDaysText(conv.lastMessageTimestamp);
                const isDeleting = deleteConfirmId === conv.id;

                return (
                  <div
                    key={conv.id}
                    onClick={() => handleSelectConversation(conv)}
                    className={`p-3.5 sm:p-4 flex items-center gap-3.5 hover:bg-[#fcfbf7] transition-colors cursor-pointer group relative ${
                      unreadCount > 0 ? 'bg-emerald-50/30' : ''
                    }`}
                  >
                    {/* Avatar with Role Badge Indicator */}
                    <div className="relative shrink-0">
                      {other.profilePic ? (
                        <img
                          src={other.profilePic}
                          alt={other.name}
                          className="w-12 h-12 rounded-xl object-cover border border-[#e3dec9] shadow-xs"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-[#5a5a40] text-white flex items-center justify-center font-bold text-sm shadow-xs">
                          {other.name.charAt(0)}
                        </div>
                      )}
                      <span className="absolute -bottom-1 -right-1 p-0.5 rounded-full bg-white shadow-xs">
                        {other.role === 'doctor' ? (
                          <span className="text-xs" title="Doctor">🩺</span>
                        ) : other.role === 'clinic' ? (
                          <span className="text-xs" title="Clinic">🏥</span>
                        ) : (
                          <span className="text-xs" title="Client / Pet Owner">🐾</span>
                        )}
                      </span>
                    </div>

                    {/* Middle: Details & Last Message */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2 truncate">
                          <span className="font-bold text-xs sm:text-sm text-[#3c3c3b] truncate group-hover:text-[#5a5a40]">
                            {other.name}
                          </span>
                          <span className="text-[10px] font-semibold text-[#7a766f] uppercase tracking-wider bg-[#f4f1e9] px-1.5 py-0.5 rounded-sm shrink-0">
                            {other.role === 'doctor' ? 'Veterinarian' : other.role === 'clinic' ? 'Hospital' : 'Pet Owner'}
                          </span>
                        </div>
                        <span className="text-[10px] text-[#7a766f] shrink-0 font-medium ml-2">
                          {formatTimestamp(conv.lastMessageTimestamp || conv.updatedAt)}
                        </span>
                      </div>

                      {/* Snippet */}
                      <div className="flex items-center justify-between text-xs text-[#7a766f]">
                        <p className={`truncate max-w-[260px] sm:max-w-md ${unreadCount > 0 ? 'font-bold text-[#3c3c3b]' : ''}`}>
                          {isSentByMe && <span className="text-[#5a5a40] font-semibold mr-1">You:</span>}
                          {conv.lastMessageText || 'Consultation opened'}
                        </p>

                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          {/* 15-day auto-disappearing indicator */}
                          <span
                            className="hidden sm:inline-flex items-center gap-1 text-[10px] text-stone-500 bg-[#f4f1e9] px-2 py-0.5 rounded-md font-medium"
                            title="Auto-disappears after 15 days"
                          >
                            <Clock className="w-3 h-3 text-amber-700" />
                            <span>{remainingLifespan}</span>
                          </span>

                          {/* Unread badge */}
                          {unreadCount > 0 && (
                            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-black text-white px-1.5 shadow-xs animate-pulse">
                              {unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Delete action */}
                    <div className="shrink-0 flex items-center">
                      {isDeleting ? (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1 bg-red-50 border border-red-200 rounded-lg p-1"
                        >
                          <button
                            onClick={(e) => handleDeleteConversation(conv.id, e)}
                            className="text-[10px] font-bold bg-red-600 text-white px-2 py-0.5 rounded cursor-pointer hover:bg-red-700"
                          >
                            Delete
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteConfirmId(null);
                            }}
                            className="text-[10px] text-stone-600 px-1 py-0.5 rounded hover:bg-stone-200 cursor-pointer"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirmId(conv.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-[#7a766f] hover:text-red-600 hover:bg-red-50 transition-all cursor-pointer"
                          title="Clear conversation from record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer note */}
          <div className="px-5 py-3 bg-[#fbf9f3] border-t border-[#e3dec9] flex items-center justify-between text-[11px] text-[#7a766f]">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span>Real-time Live Sync active</span>
            </span>
            <span>{conversations.length} Active Consultations</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
