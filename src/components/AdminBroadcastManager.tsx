import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  Send, 
  Sparkles, 
  AlertTriangle, 
  Info, 
  CheckCircle2, 
  Smartphone, 
  Monitor, 
  Users, 
  RotateCcw, 
  Trash2, 
  Volume2, 
  VolumeX, 
  Check, 
  Clock, 
  Radio,
  FileText
} from 'lucide-react';
import { UserProfile, AdminBroadcast, UserRole } from '../types';
import { BroadcastService, BroadcastSendOptions } from '../lib/broadcastService';
import { BrowserNotificationService, PermissionStatus } from '../lib/browserNotification';

interface AdminBroadcastManagerProps {
  currentUser: UserProfile;
  users: UserProfile[];
  onShowNotification: (title: string, message: string, type: 'success' | 'error' | 'info') => void;
}

const TEMPLATES = [
  {
    label: '🚨 Urgent Disease Outbreak',
    category: 'emergency' as const,
    priority: 'urgent' as const,
    title: 'Urgent Animal Health Advisory: Viral Outbreak Reported',
    message: 'VetAxis biosecurity alert: Please implement quarantine protocols and report any high-fever symptoms immediately through the Clinical Portal.'
  },
  {
    label: '⚙️ Scheduled Maintenance',
    category: 'maintenance' as const,
    priority: 'normal' as const,
    title: 'Scheduled System Maintenance Notice',
    message: 'VetAxis 360 will undergo routine infrastructure optimizations on Sunday from 02:00 to 04:00 AM UTC. Services will briefly be intermittent.'
  },
  {
    label: '📢 Platform Feature Update',
    category: 'update' as const,
    priority: 'normal' as const,
    title: 'New Clinical Suite & Telemedicine Features Live',
    message: 'We have deployed upgraded SOAP medical records, real-time messaging, and offline analytics. Explore the new suite today!'
  },
  {
    label: '🩺 Seasonal Vaccination Drive',
    category: 'advisory' as const,
    priority: 'normal' as const,
    title: 'Seasonal Vaccination & Deworming Campaign',
    message: 'Ensure your livestock herds and pets are protected against seasonal pathogens. Schedule clinic appointments or field visits today.'
  }
];

export function AdminBroadcastManager({ currentUser, users, onShowNotification }: AdminBroadcastManagerProps) {
  // Form State
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState<'announcement' | 'emergency' | 'maintenance' | 'update' | 'advisory'>('announcement');
  const [targetAudience, setTargetAudience] = useState<'all' | UserRole>('all');
  const [priority, setPriority] = useState<'normal' | 'urgent'>('normal');
  const [sendInApp, setSendInApp] = useState(true);
  const [sendBrowser, setSendBrowser] = useState(true);

  // Status & History
  const [sending, setSending] = useState(false);
  const [broadcastHistory, setBroadcastHistory] = useState<AdminBroadcast[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [browserPermission, setBrowserPermission] = useState<PermissionStatus>('default');
  const [requestingPerm, setRequestingPerm] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);

  // Calculate recipients
  const eligibleRecipients = targetAudience === 'all' 
    ? users 
    : users.filter(u => u.role === targetAudience);

  const recipientCount = eligibleRecipients.length > 0 ? eligibleRecipients.length : Math.max(1, users.length);

  useEffect(() => {
    loadHistory();
    checkPermission();
  }, []);

  const checkPermission = () => {
    if (BrowserNotificationService.isSupported()) {
      setBrowserPermission(BrowserNotificationService.getPermission());
    } else {
      setBrowserPermission('unsupported');
    }
  };

  const loadHistory = async () => {
    try {
      setLoadingHistory(true);
      const list = await BroadcastService.fetchBroadcastHistory();
      setBroadcastHistory(list);
    } catch (err) {
      console.error('Failed to load broadcast history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleRequestPermission = async () => {
    setRequestingPerm(true);
    try {
      const result = await BrowserNotificationService.requestPermission();
      setBrowserPermission(result);
      if (result === 'granted') {
        onShowNotification('Browser Notifications Enabled', 'Your browser will now receive native desktop & mobile system notifications.', 'success');
        BrowserNotificationService.showNotification('VetAxis 360 Alerts Active', {
          body: 'Browser push notifications are successfully configured!',
          icon: '/logo.png'
        });
      } else if (result === 'denied') {
        onShowNotification('Notifications Blocked', 'You denied browser notification permission. You can enable them in your browser site settings.', 'info');
      }
    } catch (err) {
      console.error('Error requesting permission:', err);
    } finally {
      setRequestingPerm(false);
    }
  };

  const handleTestBrowserNotification = async () => {
    if (!BrowserNotificationService.isSupported()) {
      onShowNotification('Not Supported', 'Your browser does not support the Web Notification API.', 'error');
      return;
    }

    if (browserPermission !== 'granted') {
      const perm = await BrowserNotificationService.requestPermission();
      setBrowserPermission(perm);
      if (perm !== 'granted') {
        onShowNotification('Permission Required', 'Please enable browser notification permission to test desktop alerts.', 'info');
        return;
      }
    }

    const testTitle = title.trim() || 'VetAxis 360 Admin Test Notification';
    const testMsg = message.trim() || 'This is how your broadcast notification will appear on user desktops and mobile browsers.';

    BrowserNotificationService.showNotification(testTitle, {
      body: testMsg,
      icon: '/logo.png',
      requireInteraction: priority === 'urgent',
      onClick: () => {
        window.focus();
      }
    });

    onShowNotification('Test Alert Dispatched', 'A native browser system notification has been fired.', 'success');
  };

  const applyTemplate = (t: typeof TEMPLATES[0]) => {
    setTitle(t.title);
    setMessage(t.message);
    setCategory(t.category);
    setPriority(t.priority);
  };

  const handleSendBroadcast = async () => {
    if (!title.trim()) {
      onShowNotification('Missing Title', 'Please enter a notification title.', 'error');
      return;
    }
    if (!message.trim()) {
      onShowNotification('Missing Message', 'Please enter notification text to broadcast.', 'error');
      return;
    }

    setConfirmModalOpen(false);
    setSending(true);

    try {
      const payload: BroadcastSendOptions = {
        title: title.trim(),
        message: message.trim(),
        category,
        targetAudience,
        priority,
        sendInApp,
        sendBrowser
      };

      const result = await BroadcastService.sendBroadcast(currentUser, payload);

      if (result.success) {
        onShowNotification(
          'Broadcast Sent Successfully!', 
          `Notification dispatched to ${result.recipientCount} user${result.recipientCount === 1 ? '' : 's'} across the app and browser.`, 
          'success'
        );
        
        // Reset form
        setTitle('');
        setMessage('');
        loadHistory();
      }
    } catch (err: any) {
      console.error('Error dispatching broadcast:', err);
      onShowNotification('Broadcast Failed', err?.message || 'Could not send notification. Please try again.', 'error');
    } finally {
      setSending(false);
    }
  };

  const handleDeleteHistory = async (id: string) => {
    try {
      await BroadcastService.deleteBroadcast(id);
      setBroadcastHistory(prev => prev.filter(b => b.id !== id));
      onShowNotification('Record Deleted', 'Broadcast announcement removed from history.', 'info');
    } catch (err) {
      console.error('Error deleting broadcast history:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Status & Browser Integration */}
      <div className="bg-gradient-to-r from-stone-900 via-stone-800 to-amber-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-stone-800 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                Live Notification Dispatcher
              </span>
              <span className="text-xs text-stone-400 font-medium">
                Admin Control Room
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Broadcast System & Browser Push
            </h2>
            <p className="text-sm text-stone-300 leading-relaxed">
              Dispatch instant notifications to all platform users. Notifications are displayed in the application (bell alerts and animated popups) as well as directly on users' operating system browsers via the Web Notification API.
            </p>
          </div>

          {/* Browser Permission Control Badge */}
          <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-4 sm:p-5 flex flex-col justify-between gap-3 shrink-0 lg:w-72">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-300">Browser Alerts Status</span>
              {browserPermission === 'granted' ? (
                <span className="flex items-center gap-1 text-[11px] font-black text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  <Check className="w-3 h-3" /> Ready
                </span>
              ) : browserPermission === 'denied' ? (
                <span className="flex items-center gap-1 text-[11px] font-black text-rose-400 bg-rose-950/60 px-2 py-0.5 rounded-full border border-rose-500/30">
                  Blocked
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[11px] font-black text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-500/30">
                  Not Enabled
                </span>
              )}
            </div>

            <p className="text-[11px] text-stone-300 leading-snug">
              {browserPermission === 'granted'
                ? 'Your browser is permitted to fire native desktop & OS notifications.'
                : 'Enable browser permission so you can receive and test native desktop popups.'}
            </p>

            {browserPermission !== 'granted' && (
              <button
                type="button"
                onClick={handleRequestPermission}
                disabled={requestingPerm}
                className="w-full py-2 px-3 bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
              >
                <Bell className="w-3.5 h-3.5" />
                {requestingPerm ? 'Requesting...' : 'Enable Browser Alerts'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Grid: Composer & Real-time Previews */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Notification Composer (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-7 shadow-xs">
            <div className="flex items-center justify-between border-b border-stone-100 pb-4 mb-5">
              <div>
                <h3 className="text-lg font-black text-stone-900">Compose Broadcast</h3>
                <p className="text-xs text-stone-500">Draft message to dispatch across all channels</p>
              </div>
              <span className="text-xs font-bold text-amber-800 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                Audience: {recipientCount} User{recipientCount === 1 ? '' : 's'}
              </span>
            </div>

            {/* Quick Templates */}
            <div className="mb-5">
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-stone-500 mb-2">
                Quick Preset Templates
              </label>
              <div className="flex flex-wrap gap-2">
                {TEMPLATES.map((tmpl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => applyTemplate(tmpl)}
                    className="text-xs font-bold px-3 py-1.5 rounded-xl border border-stone-200 bg-stone-50 hover:bg-amber-50 hover:border-amber-300 text-stone-700 hover:text-amber-900 transition-all cursor-pointer"
                  >
                    {tmpl.label}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); setConfirmModalOpen(true); }} className="space-y-4">
              {/* Target Audience & Category Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1.5">
                    Target Audience
                  </label>
                  <select
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value as any)}
                    className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-xs font-bold text-stone-800 focus:ring-2 focus:ring-amber-500 focus:bg-white outline-none transition-all"
                  >
                    <option value="all">🌍 All Users ({users.length})</option>
                    <option value="doctor">🩺 Veterinarians Only ({users.filter(u => u.role === 'doctor').length})</option>
                    <option value="clinic">🏥 Clinics & Hospitals ({users.filter(u => u.role === 'clinic').length})</option>
                    <option value="assistant">💉 Assistant Clinicians ({users.filter(u => u.role === 'assistant').length})</option>
                    <option value="user">🌾 Farmers & Pet Owners ({users.filter(u => u.role === 'user').length})</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1.5">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-xs font-bold text-stone-800 focus:ring-2 focus:ring-amber-500 focus:bg-white outline-none transition-all"
                  >
                    <option value="announcement">📢 Platform Announcement</option>
                    <option value="emergency">🚨 Urgent Health Outbreak</option>
                    <option value="maintenance">⚙️ System Maintenance</option>
                    <option value="update">💡 Feature & App Update</option>
                    <option value="advisory">🩺 Clinical Advisory</option>
                  </select>
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">
                  Notification Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Critical Vaccination Advisory / System Notice"
                  maxLength={120}
                  required
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-sm font-bold text-stone-900 focus:ring-2 focus:ring-amber-500 focus:bg-white outline-none transition-all"
                />
                <div className="flex justify-end mt-1">
                  <span className="text-[10px] text-stone-400">{title.length}/120 characters</span>
                </div>
              </div>

              {/* Notification Message */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">
                  Notification Message Text <span className="text-rose-500">*</span>
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  placeholder="Type the exact message text that will be shown in the app toast, notification center, and desktop browser popups..."
                  maxLength={800}
                  required
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-stone-800 focus:ring-2 focus:ring-amber-500 focus:bg-white outline-none transition-all resize-none"
                />
                <div className="flex justify-between items-center mt-1">
                  <span className="text-[10px] text-stone-400">Clear, concise messages work best for desktop popups</span>
                  <span className="text-[10px] text-stone-400">{message.length}/800</span>
                </div>
              </div>

              {/* Priority & Delivery Channels */}
              <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold text-stone-800">Notification Priority</span>
                    <p className="text-[11px] text-stone-500">Urgent notifications stay on desktop until dismissed</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPriority('normal')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                        priority === 'normal'
                          ? 'bg-stone-800 text-white shadow-xs'
                          : 'bg-white text-stone-600 border border-stone-200'
                      }`}
                    >
                      Normal
                    </button>
                    <button
                      type="button"
                      onClick={() => setPriority('urgent')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all flex items-center gap-1 ${
                        priority === 'urgent'
                          ? 'bg-rose-600 text-white shadow-xs'
                          : 'bg-white text-stone-600 border border-stone-200'
                      }`}
                    >
                      <AlertTriangle className="w-3 h-3" />
                      High Priority (Urgent)
                    </button>
                  </div>
                </div>

                <div className="border-t border-stone-200/80 pt-3 flex flex-wrap items-center gap-4 text-xs font-semibold text-stone-700">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={sendInApp}
                      onChange={(e) => setSendInApp(e.target.checked)}
                      className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                    />
                    <Smartphone className="w-4 h-4 text-emerald-600" />
                    <span>Display In-App (Notifications & Toasts)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={sendBrowser}
                      onChange={(e) => setSendBrowser(e.target.checked)}
                      className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                    />
                    <Monitor className="w-4 h-4 text-indigo-600" />
                    <span>Display on Browser (Native System Push)</span>
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleTestBrowserNotification}
                  className="w-full sm:w-auto px-5 py-3 rounded-xl border border-stone-300 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Monitor className="w-4 h-4 text-stone-600" />
                  Test on My Browser
                </button>

                <button
                  type="submit"
                  disabled={sending || (!title.trim() && !message.trim())}
                  className="w-full sm:flex-1 py-3 px-6 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-black tracking-wide shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  {sending ? 'Broadcasting to Users...' : `Send Broadcast to ${recipientCount} Users`}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column: Live Dual Preview (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-xs space-y-5">
            <div>
              <h3 className="text-base font-black text-stone-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                Live Notification Preview
              </h3>
              <p className="text-xs text-stone-500">How your announcement appears across both targets</p>
            </div>

            {/* In-App Toast & Bell Dropdown Preview */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-extrabold text-stone-600">
                <span className="flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
                  1. In-App Notification & Toast
                </span>
                <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-bold">App View</span>
              </div>

              {/* Toast Mockup */}
              <div className="p-3.5 rounded-2xl bg-stone-900 text-white shadow-lg border border-stone-800 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs">📢</span>
                    <span className="text-xs font-black text-amber-400">
                      {title.trim() || 'Notification Title'}
                    </span>
                  </div>
                  <span className="text-[9px] text-stone-400">Just now</span>
                </div>
                <p className="text-[11px] text-stone-200 leading-snug">
                  {message.trim() || 'Your broadcast notification text will be displayed here for users navigating the platform.'}
                </p>
                <div className="flex items-center justify-between pt-1 border-t border-stone-800 text-[10px] text-stone-400">
                  <span>From: {currentUser.name || 'Administration'}</span>
                  <span className="text-amber-400 font-bold uppercase tracking-wider text-[9px]">{category}</span>
                </div>
              </div>
            </div>

            {/* Native Browser Notification Mockup */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between text-xs font-extrabold text-stone-600">
                <span className="flex items-center gap-1.5">
                  <Monitor className="w-3.5 h-3.5 text-indigo-600" />
                  2. Browser Native OS Notification
                </span>
                <span className="text-[10px] text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full font-bold">Desktop / Mobile OS</span>
              </div>

              {/* OS Notification Box */}
              <div className="p-4 rounded-2xl bg-white border border-stone-300 shadow-md space-y-2">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 font-black text-base shadow-sm">
                    VA
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black text-stone-900 truncate">
                        {title.trim() || 'VetAxis 360 Notification'}
                      </h4>
                      <span className="text-[9px] text-stone-400">Now</span>
                    </div>
                    <p className="text-[11px] text-stone-600 line-clamp-3 mt-0.5 leading-snug">
                      {message.trim() || 'Notification text sent by the administrator appears on the browser screen.'}
                    </p>
                    <div className="text-[9px] text-stone-400 mt-1 flex items-center gap-1">
                      <span>vetaxis.com</span>
                      <span>•</span>
                      <span className="font-semibold text-stone-500">Web Push</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Help Info */}
            <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-3.5 text-[11px] text-amber-900 leading-relaxed flex items-start gap-2.5">
              <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-extrabold">Instant Real-Time Delivery:</span> Every targeted user receives an in-app persistent notification with an unread badge, and if permitted, their browser will alert them even when the app tab is in the background.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Broadcast History Section */}
      <div className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-7 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-stone-100 pb-4">
          <div>
            <h3 className="text-base font-black text-stone-900">Broadcast History</h3>
            <p className="text-xs text-stone-500">Previously dispatched platform announcements</p>
          </div>
          <button
            type="button"
            onClick={loadHistory}
            className="text-xs font-bold text-stone-600 hover:text-stone-900 flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 hover:bg-stone-200 rounded-xl transition-all cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>

        {loadingHistory ? (
          <div className="py-12 text-center text-xs text-stone-400">
            Loading broadcast records...
          </div>
        ) : broadcastHistory.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-stone-100 text-stone-400 flex items-center justify-center mx-auto">
              <FileText className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-stone-700">No broadcasts sent yet</p>
            <p className="text-xs text-stone-400 max-w-sm mx-auto">
              When an administrator sends an announcement to users, historical logs and delivery metrics will appear here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-stone-100">
            {broadcastHistory.map((item) => (
              <div key={item.id} className="py-4 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="space-y-1.5 max-w-2xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-black text-stone-900">{item.title}</span>
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 border border-stone-200">
                      {item.category}
                    </span>
                    {item.priority === 'urgent' && (
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200">
                        Urgent
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-stone-600 leading-relaxed">
                    {item.message}
                  </p>
                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-stone-400 pt-1">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(item.createdAt).toLocaleDateString()} at {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      Delivered to {item.recipientCount} {item.targetAudience === 'all' ? 'Users (All)' : `${item.targetAudience}s`}
                    </span>
                    <span>•</span>
                    <span>By: {item.adminName}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={() => {
                      setTitle(item.title);
                      setMessage(item.message);
                      setCategory(item.category);
                      setTargetAudience(item.targetAudience);
                      setPriority(item.priority);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-xl transition-all cursor-pointer"
                  >
                    Reuse Text
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteHistory(item.id)}
                    className="text-xs font-bold text-stone-400 hover:text-rose-600 p-1.5 rounded-xl hover:bg-rose-50 transition-all cursor-pointer"
                    title="Delete log"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {confirmModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-stone-200">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <Send className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-black text-stone-900">Confirm Broadcast Dispatch</h3>
              <p className="text-xs text-stone-500">
                You are about to broadcast this notification to <strong className="text-stone-800">{recipientCount} platform users</strong>.
              </p>
            </div>

            <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200 space-y-1 text-xs">
              <div className="font-bold text-stone-900">{title}</div>
              <div className="text-stone-600 text-[11px] line-clamp-3">{message}</div>
              <div className="text-[10px] text-stone-400 pt-1 flex gap-2">
                <span>Audience: {targetAudience.toUpperCase()}</span>
                <span>•</span>
                <span>Category: {category.toUpperCase()}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModalOpen(false)}
                className="flex-1 py-2.5 px-4 rounded-xl border border-stone-200 font-bold text-xs text-stone-700 hover:bg-stone-100 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSendBroadcast}
                className="flex-1 py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 font-black text-xs text-white shadow-md transition-all cursor-pointer"
              >
                Confirm & Dispatch
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
