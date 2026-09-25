import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  MessageSquare,
  Send,
  Search,
  Check,
  CheckCheck,
  Clock,
  ShieldAlert,
  User,
  ArrowLeft,
  Sparkles,
  Phone,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { UserProfile, ChatMessage, Conversation, ConversationParticipant, UserRole } from '../types';
import { MessengerService, FIFTEEN_DAYS_MS } from '../lib/messengerService';
import { AuthService } from '../lib/storage';

interface MessengerProps {
  currentUser: UserProfile;
  initialTargetUser?: UserProfile | null;
  onClearInitialTarget?: () => void;
  onNavigateHome?: () => void;
}

export const Messenger: React.FC<MessengerProps> = ({
  currentUser,
  initialTargetUser,
  onClearInitialTarget,
  onNavigateHome
}) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [newChatModalOpen, setNewChatModalOpen] = useState(false);
  const [directoryProfessionals, setDirectoryProfessionals] = useState<UserProfile[]>([]);
  const [loadingDirectory, setLoadingDirectory] = useState(false);
  const [showMobileList, setShowMobileList] = useState(true);

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Scroll internal messages container ONLY — NEVER scroll the window or entire page
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth', force = false) => {
    const container = messagesContainerRef.current;
    if (!container) return;

    // Check if user is near bottom or if explicitly forced (e.g. user sent a message)
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 120;

    if (force || isNearBottom) {
      container.scrollTo({
        top: container.scrollHeight,
        behavior
      });
    }
  };

  // 1. Subscribe to all user's conversations
  useEffect(() => {
    if (!currentUser.uid) return;
    setLoadingConversations(true);

    const unsubscribe = MessengerService.subscribeToConversations(
      currentUser.uid,
      (convs) => {
        setConversations(convs);
        setLoadingConversations(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser.uid]);

  // 2. Handle initial target user passed from Doctor/Clinic card ("Send Message" button)
  useEffect(() => {
    if (!initialTargetUser || !currentUser.uid) return;

    let mounted = true;
    (async () => {
      try {
        const conv = await MessengerService.getOrCreateConversation(currentUser, initialTargetUser);
        if (mounted) {
          setActiveConvId(conv.id);
          setShowMobileList(false);
          if (onClearInitialTarget) onClearInitialTarget();
        }
      } catch (err) {
        console.error('Failed to initiate conversation:', err);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [initialTargetUser, currentUser.uid, onClearInitialTarget]);

  // 3. Subscribe to messages of active conversation
  useEffect(() => {
    if (!activeConvId || !currentUser.uid) {
      setMessages([]);
      return;
    }

    let isInitialConvLoad = true;

    // Subscribe live and mark messages as delivered / seen
    const unsubscribe = MessengerService.subscribeToMessages(
      activeConvId,
      currentUser.uid,
      true, // Active viewing conversation
      (msgs) => {
        setMessages(msgs);
        if (isInitialConvLoad) {
          isInitialConvLoad = false;
          // Initial conversation switch: position internal chat container at bottom
          setTimeout(() => scrollToBottom('auto', true), 40);
        } else {
          // Incoming message: scroll internal container only if user was already near bottom
          scrollToBottom('smooth', false);
        }
      }
    );

    // Also explicitly trigger mark as seen
    MessengerService.markMessagesAsSeen(activeConvId, currentUser.uid);

    return () => unsubscribe();
  }, [activeConvId, currentUser.uid]);

  // Active conversation object & other participant details
  const activeConversation = conversations.find((c) => c.id === activeConvId);

  const otherParticipant: ConversationParticipant | null = activeConversation
    ? ((Object.values(activeConversation.participants || {}) as ConversationParticipant[]).find(
        (p) => p.uid !== currentUser.uid
      ) || null)
    : null;

  // Filter conversations by search
  const filteredConversations = conversations.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const other = (Object.values(c.participants || {}) as ConversationParticipant[]).find((p) => p.uid !== currentUser.uid);
    const nameMatch = other?.name?.toLowerCase().includes(q);
    const msgMatch = c.lastMessage?.toLowerCase().includes(q);
    return nameMatch || msgMatch;
  });

  // Handle Send Message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || !activeConvId || !otherParticipant || isSending) return;

    const textToSend = inputText.trim();
    setInputText('');
    setIsSending(true);

    try {
      await MessengerService.sendMessage(activeConvId, currentUser, otherParticipant, textToSend);
      // Smoothly scroll only the internal chat container, never the browser window
      setTimeout(() => scrollToBottom('smooth', true), 30);
    } catch (err) {
      console.error('Error sending message:', err);
      // Restore input text on error
      setInputText(textToSend);
    } finally {
      setIsSending(false);
      if (inputRef.current) {
        inputRef.current.focus({ preventScroll: true });
      }
    }
  };

  // Handle Key Down in textarea (Enter to send, Shift+Enter for new line)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Open New Chat Modal with Directory
  const handleOpenNewChat = async () => {
    setNewChatModalOpen(true);
    setLoadingDirectory(true);
    try {
      const docs = await AuthService.getPublicClinicians();
      // Filter out self
      const others = docs.filter((p) => p.uid !== currentUser.uid);
      setDirectoryProfessionals(others);
    } catch (err) {
      console.error('Failed to load professionals for messenger:', err);
    } finally {
      setLoadingDirectory(false);
    }
  };

  // Start chat with selected professional from directory
  const handleSelectDirectoryProfessional = async (prof: UserProfile) => {
    setNewChatModalOpen(false);
    try {
      const conv = await MessengerService.getOrCreateConversation(currentUser, prof);
      setActiveConvId(conv.id);
      setShowMobileList(false);
    } catch (err) {
      console.error('Error starting conversation:', err);
    }
  };

  // Format message timestamp
  const formatMsgTime = (timestamp: number) => {
    const d = new Date(timestamp);
    const now = new Date();
    const isToday =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear();

    if (isToday) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  // Quick prompt bubbles
  const quickPrompts = [
    'Hello Doctor, I would like to consult regarding my pet.',
    'Are you available for a clinic visit appointment?',
    'What are your emergency visit and consultation hours?',
    'Do you provide doorstep or home visit examinations?'
  ];

  return (
    <div data-no-scroll="true" className="w-full max-w-7xl mx-auto px-2 sm:px-4 py-4 md:py-6 text-left select-none">
      {/* 15-Day Auto-Expiration & Privacy Header Notice */}
      <div className="mb-4 bg-amber-50/90 border border-amber-200/90 rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-950 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center shrink-0 text-amber-800">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold flex items-center gap-2">
              <span>VetAxis Live Messenger</span>
              <span className="bg-amber-200/80 text-amber-900 text-[10px] font-black uppercase px-2 py-0.5 rounded-md">
                15-Day Auto-Clean
              </span>
            </div>
            <p className="text-[11px] text-amber-900/80 font-medium">
              Conversations are retained for exactly 15 days and automatically auto-deleted for clinical privacy and data hygiene.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
          <button
            onClick={handleOpenNewChat}
            className="btn-tactile-3d-secondary py-1.5 px-3.5 text-xs bg-[#5a5a40] text-white border-[#3c3c2b] hover:bg-[#484833] inline-flex items-center gap-1.5 cursor-pointer font-bold"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>New Chat</span>
          </button>
        </div>
      </div>

      {/* Main Messenger Container */}
      <div className="bg-white rounded-3xl border border-[#e3dec9] border-b-[5px] border-b-[#cdc6ad] shadow-xl overflow-hidden flex flex-col md:flex-row h-[78vh] min-h-[580px]">
        {/* LEFT COLUMN: Conversation List */}
        <div
          className={`w-full md:w-80 lg:w-96 border-r border-[#e3dec9] flex flex-col bg-[#fdfcf9] shrink-0 ${
            !showMobileList ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Header & Search */}
          <div className="p-3.5 sm:p-4 border-b border-[#e3dec9] bg-white space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-[#5a5a40]" />
                <h2 className="font-serif font-black text-lg text-[#373735] tracking-tight">Conversations</h2>
              </div>
              <span className="text-[11px] font-bold text-[#7a766f] bg-[#f4f1e9] px-2 py-0.5 rounded-lg border border-[#e3dec9]">
                {conversations.length}
              </span>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#fcf9f2] border border-[#e3dec9] rounded-xl pl-9 pr-3 py-2 text-xs text-[#373735] placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-[#5a5a40]"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 text-xs font-bold"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Conversations Scroll Area */}
          <div className="flex-1 overflow-y-auto divide-y divide-[#f4f1e9]">
            {loadingConversations ? (
              <div className="p-8 text-center space-y-3">
                <div className="w-8 h-8 border-2 border-[#5a5a40] border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs font-semibold text-stone-400">Loading conversations…</p>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center space-y-3">
                <div className="text-3xl">💬</div>
                <h4 className="font-serif font-black text-sm text-[#373735]">No conversations yet</h4>
                <p className="text-xs text-stone-500 font-medium leading-relaxed max-w-[220px] mx-auto">
                  Click on <span className="font-bold text-[#5a5a40]">Send Message</span> on any doctor or clinic card to begin live consultation.
                </p>
                <button
                  onClick={handleOpenNewChat}
                  className="btn-tactile-3d-secondary py-1.5 px-4 text-xs font-bold bg-[#5a5a40] text-white border-[#3c3c2b] hover:bg-[#484833] inline-flex items-center gap-1.5 cursor-pointer mt-2"
                >
                  Start New Chat
                </button>
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const other = (Object.values(conv.participants || {}) as ConversationParticipant[]).find(
                  (p) => p.uid !== currentUser.uid
                );
                const unread = conv.unreadCounts?.[currentUser.uid] || 0;
                const isSelected = conv.id === activeConvId;

                const initials = other?.name
                  ? other.name
                      .trim()
                      .split(/\s+/)
                      .map((w) => w[0])
                      .slice(0, 2)
                      .join('')
                      .toUpperCase()
                  : 'VA';

                return (
                  <button
                    key={conv.id}
                    onClick={() => {
                      setActiveConvId(conv.id);
                      setShowMobileList(false);
                    }}
                    className={`w-full p-3.5 text-left flex items-start gap-3 transition-colors cursor-pointer border-none ${
                      isSelected
                        ? 'bg-[#f4f1e9] border-l-4 border-l-[#5a5a40]'
                        : 'hover:bg-neutral-50/80 bg-transparent'
                    }`}
                  >
                    {/* Avatar */}
                    <div className="relative shrink-0">
                      {other?.profilePic && other.profilePic !== 'default' ? (
                        <img
                          src={other.profilePic}
                          alt={other.name}
                          className="w-11 h-11 rounded-2xl object-cover border border-[#e3dec9] bg-stone-100"
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-2xl bg-[#5a5a40] text-white font-serif font-black flex items-center justify-center text-sm shadow-xs">
                          {initials}
                        </div>
                      )}
                      {other?.isOnline && (
                        <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white" />
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="font-bold text-xs text-[#373735] truncate">
                          {other?.name || 'Veterinary Provider'}
                        </span>
                        {conv.lastMessageTime && (
                          <span className="text-[10px] text-stone-400 font-medium shrink-0">
                            {formatMsgTime(conv.lastMessageTime)}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[11px] text-stone-600 truncate font-normal">
                          {conv.lastMessage || 'Conversation started'}
                        </p>
                        {unread > 0 && (
                          <span className="bg-[#5a5a40] text-white text-[10px] font-black rounded-full min-w-5 h-5 px-1.5 flex items-center justify-center shrink-0 shadow-xs">
                            {unread}
                          </span>
                        )}
                      </div>

                      {other?.role && (
                        <span className="inline-block mt-1 text-[9px] uppercase font-black tracking-wider text-[#5a5a40] bg-[#f4f1e9] px-1.5 py-0.5 rounded border border-[#e3dec9]/60">
                          {other.role}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Active Chat Window */}
        <div
          className={`flex-1 flex flex-col bg-[#faf8f5] h-full ${
            showMobileList ? 'hidden md:flex' : 'flex'
          }`}
        >
          {activeConversation && otherParticipant ? (
            <>
              {/* Chat Header */}
              <div className="p-3 sm:p-4 bg-white border-b border-[#e3dec9] flex items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Back button on mobile */}
                  <button
                    onClick={() => setShowMobileList(true)}
                    className="md:hidden w-8 h-8 rounded-xl bg-neutral-100 hover:bg-neutral-200 border border-stone-200 flex items-center justify-center text-stone-700 cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>

                  {/* Other user avatar */}
                  <div className="relative shrink-0">
                    {otherParticipant.profilePic && otherParticipant.profilePic !== 'default' ? (
                      <img
                        src={otherParticipant.profilePic}
                        alt={otherParticipant.name}
                        className="w-10 h-10 rounded-2xl object-cover border border-[#e3dec9] bg-stone-100"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-2xl bg-[#5a5a40] text-white font-serif font-black flex items-center justify-center text-sm shadow-xs">
                        {otherParticipant.name
                          .trim()
                          .split(/\s+/)
                          .map((w) => w[0])
                          .slice(0, 2)
                          .join('')
                          .toUpperCase()}
                      </div>
                    )}
                    {otherParticipant.isOnline && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white" />
                    )}
                  </div>

                  {/* Other user details */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-serif font-black text-sm text-[#373735] truncate">
                        {otherParticipant.name}
                      </h3>
                      {otherParticipant.role && (
                        <span className="text-[9px] uppercase font-black tracking-wider px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {otherParticipant.role}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-stone-500 font-semibold block">
                      {otherParticipant.isOnline ? (
                        <span className="text-emerald-700 font-bold">● Active Now</span>
                      ) : (
                        'Offline (Live sync active)'
                      )}
                    </span>
                  </div>
                </div>

                {/* 15 Days Retention Tag */}
                <div className="flex items-center gap-1.5 text-[10px] text-stone-500 font-semibold bg-[#f4f1e9] border border-[#e3dec9] px-2.5 py-1 rounded-xl shrink-0">
                  <Clock className="w-3 h-3 text-[#5a5a40]" />
                  <span className="hidden sm:inline">15-day rolling storage</span>
                  <span className="sm:hidden">15-day auto</span>
                </div>
              </div>

              {/* Messages Body */}
              <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
                {/* Notice banner in chat */}
                <div className="text-center my-2">
                  <span className="inline-flex items-center gap-1.5 bg-[#f4f1e9] border border-[#e3dec9] text-stone-600 text-[10px] font-semibold px-3 py-1 rounded-full shadow-2xs">
                    🔒 Messages in this chat expire and auto-delete after 15 days
                  </span>
                </div>

                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-stone-400 space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-[#f4f1e9] border border-[#e3dec9] flex items-center justify-center text-stone-500 text-xl">
                      💬
                    </div>
                    <div>
                      <h4 className="font-serif font-black text-sm text-[#373735]">
                        Begin Clinical Conversation
                      </h4>
                      <p className="text-xs text-stone-500 mt-1 max-w-sm">
                        Send a message to consult with {otherParticipant.name}. Real-time indicators will display delivery and read status.
                      </p>
                    </div>

                    {/* Quick prompts */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-3 max-w-md w-full">
                      {quickPrompts.map((prompt, idx) => (
                        <button
                          key={idx}
                          onClick={() => setInputText(prompt)}
                          className="text-left text-[11px] font-medium text-stone-700 bg-white hover:bg-neutral-50 border border-[#e3dec9] p-2 rounded-xl transition-all shadow-2xs hover:border-[#5a5a40]"
                        >
                          "{prompt}"
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMe = msg.senderId === currentUser.uid;

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-4 py-2.5 shadow-xs relative text-xs leading-relaxed ${
                            isMe
                              ? 'bg-[#5a5a40] text-white rounded-br-xs'
                              : 'bg-white text-[#373735] border border-[#e3dec9] rounded-bl-xs'
                          }`}
                        >
                          {/* Message Content */}
                          <p className="whitespace-pre-wrap break-words">{msg.text}</p>

                          {/* Timestamp & Tick Indicator Footer */}
                          <div
                            className={`flex items-center justify-end gap-1.5 mt-1 text-[9.5px] ${
                              isMe ? 'text-amber-100/80' : 'text-stone-400'
                            }`}
                          >
                            <span>{formatMsgTime(msg.timestamp)}</span>

                            {/* Precise Tick Requirements */}
                            {isMe && (
                              <span className="inline-flex items-center ml-0.5" title={`Status: ${msg.status}`}>
                                {msg.status === 'sent' && (
                                  /* Single Tick: Sent */
                                  <Check className="w-3.5 h-3.5 text-stone-300" strokeWidth={2.5} />
                                )}
                                {msg.status === 'delivered' && (
                                  /* Double Tick (neutral): Delivered */
                                  <CheckCheck className="w-3.5 h-3.5 text-stone-300" strokeWidth={2.5} />
                                )}
                                {msg.status === 'seen' && (
                                  /* Double Blue Tick: Seen / Read */
                                  <CheckCheck className="w-3.5 h-3.5 text-[#38bdf8] drop-shadow-xs" strokeWidth={2.5} />
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Chat Input Bar */}
              <div className="p-3 sm:p-4 bg-white border-t border-[#e3dec9]">
                <form onSubmit={handleSendMessage} className="flex items-end gap-2">
                  <div className="flex-1 bg-[#fcf9f2] border border-[#e3dec9] rounded-2xl p-2 focus-within:ring-2 focus-within:ring-[#5a5a40] focus-within:border-transparent transition-all">
                    <textarea
                      ref={inputRef}
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={`Message ${otherParticipant.name} (Enter to send, Shift+Enter for newline)...`}
                      rows={2}
                      className="w-full bg-transparent border-none focus:outline-none resize-none text-xs text-[#373735] placeholder:text-stone-400 max-h-24"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={!inputText.trim() || isSending}
                    className={`btn-tactile-3d-primary py-3 px-4.5 rounded-2xl inline-flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      !inputText.trim() || isSending
                        ? 'opacity-50 cursor-not-allowed'
                        : 'hover:brightness-105 active:translate-y-[1px]'
                    }`}
                  >
                    <Send className="w-4 h-4 text-white" />
                  </button>
                </form>
                <div className="flex items-center justify-between text-[10px] text-stone-400 mt-1 px-1">
                  <span>Enter to send • Shift+Enter for new line</span>
                  <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Live Messenger
                  </span>
                </div>
              </div>
            </>
          ) : (
            /* Empty State when no conversation is selected */
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-[#f4f1e9] border border-[#e3dec9] flex items-center justify-center text-3xl shadow-sm">
                💬
              </div>
              <div className="space-y-1 max-w-sm">
                <h3 className="font-serif font-black text-lg text-[#373735]">
                  Select a Conversation
                </h3>
                <p className="text-xs text-stone-500 leading-relaxed font-medium">
                  Choose a doctor or clinic consultation from the sidebar, or click below to search all vetted specialists.
                </p>
              </div>

              <button
                onClick={handleOpenNewChat}
                className="btn-tactile-3d-secondary py-2 px-5 text-xs font-bold bg-[#5a5a40] text-white border-[#3c3c2b] hover:bg-[#484833] inline-flex items-center gap-2 cursor-pointer shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Start New Consultation</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* NEW CHAT MODAL: Directory of Doctors & Clinics */}
      <AnimatePresence>
        {newChatModalOpen && (
          <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-[#fcf9f2] w-full max-w-md rounded-3xl border border-[#e3dec9] border-b-[6px] border-b-[#cdc6ad] shadow-2xl p-5 sm:p-6 z-50 text-left max-h-[85vh] flex flex-col"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#e3dec9]">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🩺</span>
                  <h3 className="font-serif font-black text-lg text-[#373735]">
                    Start New Consultation
                  </h3>
                </div>
                <button
                  onClick={() => setNewChatModalOpen(false)}
                  className="w-7 h-7 flex items-center justify-center rounded-xl border border-[#e3dec9] bg-white hover:bg-neutral-100 text-stone-500 font-black transition-all text-xs cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="py-2">
                <p className="text-xs text-stone-500 font-medium">
                  Select a certified veterinary practitioner or clinic to start instant real-time messaging:
                </p>
              </div>

              {/* Directory List */}
              <div className="flex-1 overflow-y-auto divide-y divide-[#e3dec9]/60 my-2 pr-1 space-y-1">
                {loadingDirectory ? (
                  <div className="p-8 text-center space-y-2">
                    <div className="w-6 h-6 border-2 border-[#5a5a40] border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-xs font-semibold text-stone-400">Loading directory…</p>
                  </div>
                ) : directoryProfessionals.length === 0 ? (
                  <div className="p-6 text-center text-xs text-stone-500 font-medium">
                    No other practitioners registered yet.
                  </div>
                ) : (
                  directoryProfessionals.map((prof) => {
                    const initials = prof.name
                      .trim()
                      .split(/\s+/)
                      .map((w) => w[0])
                      .slice(0, 2)
                      .join('')
                      .toUpperCase();

                    return (
                      <button
                        key={prof.uid}
                        onClick={() => handleSelectDirectoryProfessional(prof)}
                        className="w-full p-2.5 rounded-2xl hover:bg-white text-left flex items-center gap-3 transition-colors cursor-pointer border border-transparent hover:border-[#e3dec9]"
                      >
                        {prof.profilePic && prof.profilePic !== 'default' ? (
                          <img
                            src={prof.profilePic}
                            alt={prof.name}
                            className="w-10 h-10 rounded-xl object-cover border border-[#e3dec9]"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-[#5a5a40] text-white font-serif font-black flex items-center justify-center text-xs">
                            {initials}
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-[#373735] truncate">
                              {prof.name}
                            </span>
                            <span className="text-[9px] uppercase font-black text-[#5a5a40] bg-[#f4f1e9] border border-[#e3dec9] px-1.5 py-0.5 rounded">
                              {prof.role}
                            </span>
                          </div>
                          {prof.expertise && (
                            <p className="text-[11px] text-stone-500 truncate">{prof.expertise}</p>
                          )}
                          {prof.facilities && (
                            <p className="text-[11px] text-stone-500 truncate">{prof.facilities}</p>
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              <div className="pt-3 border-t border-[#e3dec9] flex justify-end">
                <button
                  type="button"
                  onClick={() => setNewChatModalOpen(false)}
                  className="bg-neutral-100 hover:bg-neutral-200 text-stone-700 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer border-none"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
