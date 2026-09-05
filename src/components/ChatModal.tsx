import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Send,
  Clock,
  ShieldCheck,
  Check,
  CheckCheck,
  X,
  User,
  Sparkles,
  Info,
  ChevronDown,
  MessageSquare,
  AlertCircle,
  Smile
} from 'lucide-react';
import { UserProfile, ChatMessage } from '../types';
import {
  ChatService,
  getConversationId,
  formatDisappearingCountdown,
  AUTO_DISAPPEAR_DURATION_MS
} from '../lib/chatService';
import { ChatEmojiPicker } from './ChatEmojiPicker';

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipient: UserProfile | null;
  currentUser: UserProfile | null;
  initialMessage?: string;
}

export const ChatModal: React.FC<ChatModalProps> = ({
  isOpen,
  onClose,
  recipient,
  currentUser,
  initialMessage = ''
}) => {
  if (!isOpen || !recipient) return null;

  // Fallback for guest or unauthenticated visitor
  const effectiveSender: UserProfile = currentUser || {
    uid: 'guest_user_' + (typeof window !== 'undefined' ? localStorage.getItem('va_guest_id') || (() => {
      const id = Math.random().toString(36).substring(2, 9);
      localStorage.setItem('va_guest_id', id);
      return id;
    })() : 'temp'),
    name: 'Pet Owner (Guest)',
    email: 'visitor@vetaxis.local',
    role: 'user',
    createdAt: Date.now()
  };

  const conversationId = getConversationId(effectiveSender.uid, recipient.uid);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState<string>(initialMessage);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState<boolean>(false);
  const [showSimulateToolbar, setShowSimulateToolbar] = useState<boolean>(false);
  const [showTimerNotice, setShowTimerNotice] = useState<boolean>(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom of conversation
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  // Subscribe to real-time conversation messages
  useEffect(() => {
    if (!isOpen || !recipient) return;

    const unsubscribe = ChatService.subscribeToConversation(conversationId, (updatedMessages) => {
      setMessages(updatedMessages);
      setTimeout(() => scrollToBottom('smooth'), 50);
    });

    // Mark conversation as read
    ChatService.markAsRead(conversationId, effectiveSender.uid);

    // Initial focus on input
    setTimeout(() => {
      inputRef.current?.focus();
      scrollToBottom('auto');
    }, 150);

    return () => {
      unsubscribe();
    };
  }, [conversationId, isOpen, recipient?.uid]);

  // Periodic ticker to refresh countdown timers every minute
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setTick(t => t + 1);
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const handleSendMessage = async (customText?: string) => {
    const textToSend = (customText || inputText).trim();
    if (!textToSend || isSending) return;

    if (!customText) {
      setInputText('');
    }

    try {
      setIsSending(true);
      await ChatService.sendMessage({
        sender: effectiveSender,
        receiver: recipient,
        text: textToSend
      });
      scrollToBottom('smooth');
    } catch (err: any) {
      console.error('[ChatModal] Send message failed:', err);
    } finally {
      setIsSending(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  // Insert emoji at cursor position or append to text
  const handleSelectEmoji = (emoji: string) => {
    if (inputRef.current) {
      const start = inputRef.current.selectionStart ?? inputText.length;
      const end = inputRef.current.selectionEnd ?? inputText.length;
      const updated = inputText.substring(0, start) + emoji + inputText.substring(end);
      setInputText(updated);
      setTimeout(() => {
        inputRef.current?.focus();
        const cursorPosition = start + emoji.length;
        inputRef.current?.setSelectionRange(cursorPosition, cursorPosition);
      }, 20);
    } else {
      setInputText(prev => prev + emoji);
    }
  };

  // Interactive reply simulator: lets users test two-way communication immediately
  const handleSimulateDoctorReply = async (replyText: string) => {
    try {
      await ChatService.simulateDoctorReply(recipient, effectiveSender, replyText);
      scrollToBottom('smooth');
    } catch (err) {
      console.error('[ChatModal] Simulated reply failed:', err);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatMessageTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatMessageDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const today = new Date();
    if (date.toDateString() === today.toDateString()) return 'Today';
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Group messages by calendar date
  const groupedMessages: { [date: string]: ChatMessage[] } = {};
  messages.forEach(msg => {
    const d = formatMessageDate(msg.createdAt);
    if (!groupedMessages[d]) groupedMessages[d] = [];
    groupedMessages[d].push(msg);
  });

  const quickPrompts = [
    '🩺 Hello Doctor, are you available for emergency consult today?',
    '⏰ What are your current clinical OPD consultation hours?',
    '🚗 Do you provide doorstep home visits or farm calls in my area?',
    '💉 I need guidance regarding vaccination schedules & pet checkup.'
  ];

  const doctorSimulatedReplies = [
    `👋 Hello! Yes, I am currently on duty. Please describe your animal's symptoms and age.`,
    `🚗 Yes, I do offer doorstep home visits. Please share your location and urgency level.`,
    `🏥 Our clinical hours are 9:00 AM to 8:00 PM Monday through Saturday. You are welcome to visit!`,
    `💊 Based on clinical protocol, please keep the animal hydrated and isolated until physical evaluation.`
  ];

  const recipientRoleLabel =
    recipient.role === 'doctor'
      ? 'Veterinary Practitioner'
      : recipient.role === 'clinic'
      ? 'Veterinary Hospital Centre'
      : 'Clinical Assistant Nurse';

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 16 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-[#e3dec9] flex flex-col h-[90vh] max-h-[780px] overflow-hidden"
      >
        {/* TOP HEADER */}
        <div className="bg-gradient-to-r from-[#5a5a40] to-[#464632] text-white px-5 py-3.5 flex items-center justify-between shadow-md shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {/* Recipient Avatar */}
            <div className="relative shrink-0">
              {recipient.profilePic ? (
                <img
                  src={recipient.profilePic}
                  alt={recipient.name}
                  className="w-11 h-11 rounded-2xl object-cover border-2 border-white/30 shadow-xs"
                />
              ) : (
                <div className="w-11 h-11 rounded-2xl bg-white/20 text-white font-serif font-black flex items-center justify-center text-lg border-2 border-white/20">
                  {recipient.name ? recipient.name.charAt(0).toUpperCase() : 'V'}
                </div>
              )}
              {recipient.isOnline ? (
                <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full"></span>
              ) : (
                <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-stone-400 border-2 border-white rounded-full"></span>
              )}
            </div>

            {/* Recipient Info */}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-serif font-black text-base text-white truncate max-w-[240px] sm:max-w-sm">
                  {recipient.name}
                </h3>
                {recipient.subscriptionTier && (
                  <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-400 text-amber-950 shrink-0">
                    👑 {recipient.subscriptionTier}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-[11px] text-stone-200 truncate">
                <span>{recipientRoleLabel}</span>
                {recipient.expertise && (
                  <>
                    <span>•</span>
                    <span className="truncate max-w-[180px]">{recipient.expertise}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right Header Actions & 15-Day Badge */}
          <div className="flex items-center gap-2">
            {/* 15-Day Auto-Disappearing Badge */}
            <div
              title="End-to-end veterinary confidentiality: messages vanish after 15 days"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-[11px] font-semibold text-emerald-100 border border-white/20 backdrop-blur-xs select-none"
            >
              <Clock className="w-3.5 h-3.5 text-amber-300" />
              <span>15-Day Disappearing Messages</span>
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition-colors cursor-pointer"
              title="Close chat box"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 15-DAY TIMER NOTICE STRIP */}
        {showTimerNotice && (
          <div className="bg-amber-50 border-b border-amber-200/80 px-4 py-2 flex items-center justify-between text-xs text-amber-900 shrink-0">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-700 shrink-0" />
              <span className="leading-tight">
                <strong>15-Day Privacy Lifecycle:</strong> Messages in this clinical consultation are automatically deleted 15 days after sending.
              </span>
            </div>
            <button
              onClick={() => setShowTimerNotice(false)}
              className="text-amber-800 hover:text-amber-950 text-xs font-bold px-1.5 py-0.5 rounded hover:bg-amber-100/60 ml-2 shrink-0 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* MESSAGES BODY */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-[#fdfbf7]">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-[#f4f1e9] text-[#5a5a40] flex items-center justify-center shadow-inner">
                <MessageSquare className="w-8 h-8 opacity-70" />
              </div>
              <div className="max-w-md">
                <h4 className="font-serif font-black text-lg text-[#3c3c3b]">
                  Start Consultation with {recipient.name}
                </h4>
                <p className="text-xs text-[#7a766f] mt-1.5 leading-relaxed">
                  Direct two-way messaging for clinical questions, appointment scheduling, and patient history. All messages automatically disappear after 15 days.
                </p>
              </div>

              {/* Quick Inquiry Starter Chips */}
              <div className="w-full max-w-lg pt-2 space-y-2 text-left">
                <div className="text-[10px] font-black uppercase tracking-wider text-[#a49f92] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>Tap a quick question to send:</span>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {quickPrompts.map((prompt, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(prompt)}
                      className="text-xs text-left p-3 rounded-2xl bg-white hover:bg-amber-50/60 border border-[#e3dec9] hover:border-amber-300 text-[#3c3c3b] transition-all cursor-pointer shadow-2xs flex items-center justify-between group"
                    >
                      <span className="pr-2">{prompt}</span>
                      <Send className="w-3.5 h-3.5 text-stone-400 group-hover:text-amber-700 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <>
              {Object.entries(groupedMessages).map(([dateStr, dateMsgs]) => (
                <div key={dateStr} className="space-y-3">
                  {/* Date divider */}
                  <div className="flex items-center justify-center my-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#a49f92] bg-[#f4f1e9] px-3 py-1 rounded-full border border-[#e3dec9]">
                      {dateStr}
                    </span>
                  </div>

                  {/* Messages */}
                  {dateMsgs.map((msg) => {
                    const isMe = msg.senderId === effectiveSender.uid;
                    const timeLeft = formatDisappearingCountdown(msg.expiresAt);

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`max-w-[85%] sm:max-w-[75%] rounded-3xl px-4 py-3 shadow-xs relative text-sm leading-relaxed ${
                            isMe
                              ? 'bg-[#5a5a40] text-white rounded-tr-xs'
                              : 'bg-white text-[#3c3c3b] border border-[#e3dec9] rounded-tl-xs'
                          }`}
                        >
                          {/* Sender name for received messages */}
                          {!isMe && (
                            <div className="text-[10px] font-black uppercase tracking-wider text-[#a0522d] mb-1 flex items-center gap-1.5">
                              <span>{msg.senderName}</span>
                              <span className="text-[8px] px-1.5 py-0.2 rounded bg-stone-100 text-stone-600 border border-stone-200">
                                {msg.senderRole}
                              </span>
                            </div>
                          )}

                          {/* Message Text */}
                          <p className="whitespace-pre-wrap break-words">{msg.text}</p>

                          {/* Message Meta: Time & 15-day Disappearing Countdown */}
                          <div
                            className={`flex items-center gap-2 mt-1.5 pt-1 text-[10px] border-t ${
                              isMe
                                ? 'text-stone-300 border-white/15 justify-end'
                                : 'text-[#a49f92] border-stone-100 justify-between'
                            }`}
                          >
                            <span className="inline-flex items-center gap-1" title={`Auto-disappears in ${timeLeft}`}>
                              <Clock className="w-3 h-3 opacity-75" />
                              <span>{timeLeft}</span>
                            </span>

                            <span className="inline-flex items-center gap-1.5">
                              <span>{formatMessageTime(msg.createdAt)}</span>
                              {isMe && (
                                <>
                                  {msg.read ? (
                                    <span
                                      className="inline-flex items-center gap-0.5 text-cyan-300 transition-colors"
                                      title={msg.readAt ? `Read confirmed at ${formatMessageTime(msg.readAt)}` : 'Read confirmed (seen by recipient)'}
                                    >
                                      <CheckCheck className="w-3.5 h-3.5 text-cyan-300 shrink-0 stroke-[2.5]" />
                                    </span>
                                  ) : msg.delivered ? (
                                    <span
                                      className="inline-flex items-center gap-0.5 text-stone-300/80 transition-colors"
                                      title="Delivered to recipient"
                                    >
                                      <CheckCheck className="w-3.5 h-3.5 text-stone-300/80 shrink-0 stroke-[2]" />
                                    </span>
                                  ) : (
                                    <span
                                      className="inline-flex items-center gap-0.5 text-stone-400 transition-colors"
                                      title="Sent to server"
                                    >
                                      <Check className="w-3.5 h-3.5 text-stone-400 shrink-0 stroke-[2]" />
                                    </span>
                                  )}
                                </>
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* TWO-USER INTERACTIVE SIMULATION TESTING BAR (Allows testing replies from doctor with one click) */}
        <div className="bg-[#f4f1e9] border-t border-[#e3dec9] px-4 py-2 shrink-0">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setShowSimulateToolbar(!showSimulateToolbar)}
              className="text-[11px] font-black text-[#5a5a40] hover:text-[#3e3e2b] flex items-center gap-1.5 cursor-pointer select-none"
            >
              <span>💬 Test Two-Way Clinical Reply</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showSimulateToolbar ? 'rotate-180' : ''}`} />
            </button>
            <span className="text-[10px] text-[#7a766f]">
              Direct communication between pet owner & doctor
            </span>
          </div>

          {showSimulateToolbar && (
            <div className="mt-2 pt-2 border-t border-[#e3dec9] space-y-1.5 animate-fadeIn">
              <div className="text-[10px] font-bold text-[#7a766f]">
                Simulate reply received from {recipient.name}:
              </div>
              <div className="flex flex-wrap gap-1.5">
                {doctorSimulatedReplies.map((reply, i) => (
                  <button
                    key={i}
                    onClick={() => handleSimulateDoctorReply(reply)}
                    className="text-[10.5px] px-2.5 py-1 rounded-xl bg-white hover:bg-emerald-50 border border-stone-300 hover:border-emerald-400 text-stone-700 transition-colors cursor-pointer text-left truncate max-w-full"
                  >
                    💬 {reply}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* BOTTOM INPUT BAR */}
        <div className="p-3 sm:p-4 bg-white border-t border-[#e3dec9] shrink-0 relative">
          {/* Lightweight Veterinary Emoji Picker Popover */}
          <ChatEmojiPicker
            isOpen={isEmojiPickerOpen}
            onClose={() => setIsEmojiPickerOpen(false)}
            onSelectEmoji={handleSelectEmoji}
          />

          <div className="flex items-center gap-2">
            {/* Emoji Trigger Button */}
            <button
              type="button"
              onClick={() => setIsEmojiPickerOpen(prev => !prev)}
              className={`p-2.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-center shrink-0 ${
                isEmojiPickerOpen
                  ? 'bg-amber-100 text-amber-900 border-amber-300 shadow-xs'
                  : 'bg-[#fdfbf7] text-stone-600 hover:text-[#5a5a40] hover:bg-[#f4f1e9] border-[#e3dec9]'
              }`}
              title="Add expression or pet emoji"
              aria-label="Toggle emoji picker"
            >
              <Smile className="w-5 h-5" />
            </button>

            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Message ${recipient.name}... (disappears in 15 days)`}
              className="flex-1 bg-[#fdfbf7] border border-[#e3dec9] focus:border-[#5a5a40] focus:bg-white rounded-2xl px-4 py-3 text-sm text-[#3c3c3b] outline-none transition-all placeholder:text-[#a49f92]"
              maxLength={5000}
            />

            <button
              onClick={() => handleSendMessage()}
              disabled={!inputText.trim() || isSending}
              className="btn-tactile-3d-primary py-3 px-5 text-sm inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shrink-0"
              title="Send Message"
            >
              <span>Send</span>
              <Send className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center justify-between text-[10px] text-[#a49f92] mt-2 px-1">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Protected consultation. Auto-disappearing after 15 days.</span>
            </span>
            <span>Press Enter to send</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
