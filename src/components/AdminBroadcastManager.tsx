import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { BroadcastNotificationService } from '../lib/storage';
import {
  Send,
  Smartphone,
  Laptop,
  CheckCircle2,
  AlertTriangle,
  Radio,
  RefreshCw,
  Sparkles,
  Info,
  ShieldCheck,
  Megaphone,
  Volume2,
  ExternalLink
} from 'lucide-react';

interface AdminBroadcastManagerProps {
  currentUser: UserProfile;
}

export function AdminBroadcastManager({ currentUser }: AdminBroadcastManagerProps) {
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>('default');
  const [testStatusMsg, setTestStatusMsg] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [type, setType] = useState<'announcement' | 'alert' | 'update' | 'promo'>('announcement');
  const [priority, setPriority] = useState<'normal' | 'high' | 'urgent'>('high');
  const [actionUrl, setActionUrl] = useState<string>('');
  const [previewMode, setPreviewMode] = useState<'mobile' | 'inapp'>('mobile');

  // Confirmation Modal State
  const [confirmModalOpen, setConfirmModalOpen] = useState<boolean>(false);

  const [subscribedPush, setSubscribedPush] = useState<boolean>(false);

  // Check notification & push permission on mount
  useEffect(() => {
    if (BroadcastNotificationService.isNativeNotificationSupported()) {
      setPermissionStatus(BroadcastNotificationService.getNotificationPermission());
    }
    if (BroadcastNotificationService.isPushManagerSupported()) {
      BroadcastNotificationService.getPushSubscription().then(sub => {
        setSubscribedPush(Boolean(sub));
      });
    }
  }, []);

  const handleRequestPermission = async () => {
    const res = await BroadcastNotificationService.requestNotificationPermission(currentUser);
    setPermissionStatus(res);
    if (res === 'granted') {
      const sub = await BroadcastNotificationService.subscribeToPushNotifications(currentUser);
      setSubscribedPush(Boolean(sub));
      setTestStatusMsg('Web Push API & background notification permission granted!');
      setTimeout(() => setTestStatusMsg(null), 4000);
    } else if (res === 'denied') {
      setTestStatusMsg('Notifications were blocked. Please enable them in your browser site settings.');
      setTimeout(() => setTestStatusMsg(null), 5000);
    }
  };

  const handleTestNotification = async () => {
    if (permissionStatus !== 'granted') {
      const res = await BroadcastNotificationService.requestNotificationPermission();
      setPermissionStatus(res);
      if (res !== 'granted') {
        alert('Please allow notification permissions in your browser to test system-level notifications.');
        return;
      }
    }

    const testTitle = title.trim() ? `[Preview] ${title.trim()}` : '🔔 [Preview] Notice from VetAxis 360';
    const testBody = message.trim() || 'This is how your custom text notification will appear in the device status bar and notification tray.';

    const sent = await BroadcastNotificationService.sendNativeNotification(testTitle, {
      body: testBody,
      url: actionUrl || '/'
    });

    if (sent) {
      setTestStatusMsg('Test notification fired! Check your desktop tray or mobile notification bar.');
    } else {
      setTestStatusMsg('Could not fire notification. Check browser settings.');
    }
    setTimeout(() => setTestStatusMsg(null), 4500);
  };

  const handleSubmitBroadcast = async () => {
    if (!title.trim()) {
      alert('Please provide a notification title.');
      return;
    }
    if (!message.trim()) {
      alert('Please provide notification message text.');
      return;
    }

    setIsSubmitting(true);
    try {
      await BroadcastNotificationService.createBroadcast(
        {
          title: title.trim(),
          message: message.trim(),
          type,
          priority,
          actionUrl: actionUrl.trim() || undefined
        },
        currentUser
      );

      // Reset form
      setTitle('');
      setMessage('');
      setActionUrl('');
      setConfirmModalOpen(false);
      setTestStatusMsg('Broadcast sent to all users successfully!');
      setTimeout(() => setTestStatusMsg(null), 5000);
    } catch (err) {
      console.error('Failed to dispatch broadcast:', err);
      alert('Failed to send broadcast notification. Please check your connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Device Notification Readiness */}
      <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-amber-50 text-amber-700 rounded-xl border border-amber-200/60 shadow-xs">
            <Radio className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">Global Broadcast Notifications</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                Live Broadcast Channel
              </span>
            </div>
            <p className="text-xs sm:text-sm text-stone-500 font-medium mt-0.5">
              Blast custom text notifications to every user. Delivered in-app and directly into their browser / mobile notification bar, even if they haven't logged in for several days.
            </p>
          </div>
        </div>

        {/* Device Permission Controls */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 self-stretch md:self-auto shrink-0">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold bg-stone-50 border-stone-200">
            <Smartphone className="w-3.5 h-3.5 text-stone-500" />
            <span className="text-stone-600">Web Push API:</span>
            {subscribedPush || permissionStatus === 'granted' ? (
              <span className="text-emerald-700 flex items-center gap-1 font-black">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Active
              </span>
            ) : permissionStatus === 'denied' ? (
              <span className="text-red-700 font-black">Blocked</span>
            ) : (
              <span className="text-amber-700 font-black">Ready to Enable</span>
            )}
          </div>

          {permissionStatus !== 'granted' ? (
            <button
              onClick={handleRequestPermission}
              className="px-3.5 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-black transition-all shadow-xs cursor-pointer active:scale-95"
            >
              Enable Browser Alerts
            </button>
          ) : (
            <button
              onClick={handleTestNotification}
              className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-black transition-all shadow-xs cursor-pointer active:scale-95 flex items-center gap-1.5"
            >
              <Volume2 className="w-3.5 h-3.5" />
              Test on this Device
            </button>
          )}
        </div>
      </div>

      {testStatusMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{testStatusMsg}</span>
        </div>
      )}

      {/* Main Grid: Broadcast Composer & Live Previews */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Composer Form (7 Cols) */}
        <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-stone-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-stone-100">
            <div className="flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-stone-700" />
              <h3 className="text-sm font-black uppercase tracking-wider text-stone-800">Compose Broadcast Notification</h3>
            </div>
            <span className="text-[11px] font-bold text-stone-400">Target: Every App User</span>
          </div>

          {/* Title Input */}
          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
              Notification Title *
            </label>
            <input
              type="text"
              placeholder="e.g. Urgent Rabies Vaccination Advisory / Clinic Timings Update / New Platform Features"
              value={title}
              onChange={e => setTitle(e.target.value)}
              maxLength={120}
              className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm font-medium focus:outline-hidden focus:ring-2 focus:ring-stone-900"
            />
            <div className="flex justify-between text-[10px] text-stone-400 mt-1">
              <span>Short, catchy headline shown in mobile status bar</span>
              <span>{title.length}/120</span>
            </div>
          </div>

          {/* Type & Priority Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                Category / Intent
              </label>
              <select
                value={type}
                onChange={e => setType(e.target.value as any)}
                className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm font-bold text-stone-800 focus:outline-hidden focus:ring-2 focus:ring-stone-900"
              >
                <option value="announcement">📢 General Announcement</option>
                <option value="alert">🚨 Urgent Safety / Health Alert</option>
                <option value="update">⚡ System / Clinic Update</option>
                <option value="promo">🎁 Special Promotion / Offer</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                Priority Level
              </label>
              <select
                value={priority}
                onChange={e => setPriority(e.target.value as any)}
                className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm font-bold text-stone-800 focus:outline-hidden focus:ring-2 focus:ring-stone-900"
              >
                <option value="normal">Normal (Standard Bulletin)</option>
                <option value="high">High (Featured In-App & Push)</option>
                <option value="urgent">Urgent (Vibrate & Immediate Toast)</option>
              </select>
            </div>
          </div>

          {/* Message Textarea */}
          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
              Custom Message Body *
            </label>
            <textarea
              rows={4}
              placeholder="Write the exact custom notification text here. This will be sent to all users and shown in their device notification bar and in-app tray..."
              value={message}
              onChange={e => setMessage(e.target.value)}
              maxLength={600}
              className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm font-medium focus:outline-hidden focus:ring-2 focus:ring-stone-900 resize-none leading-relaxed"
            />
            <div className="flex justify-between text-[10px] text-stone-400 mt-1">
              <span>Detailed announcement content</span>
              <span>{message.length}/600</span>
            </div>
          </div>

          {/* Action Destination Link (Optional) */}
          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
              Target Destination (Optional Click Action)
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <select
                value={['explore', 'jobs', 'community', 'news', 'subscription'].includes(actionUrl) ? actionUrl : (actionUrl ? 'custom' : '')}
                onChange={e => {
                  if (e.target.value === 'custom') setActionUrl('https://');
                  else setActionUrl(e.target.value);
                }}
                className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-800 focus:outline-hidden"
              >
                <option value="">No Link (Stay on current view)</option>
                <option value="explore">Explore Dashboard</option>
                <option value="jobs">Job Board & Vacancies</option>
                <option value="community">Community Feed</option>
                <option value="news">Guides & News Portal</option>
                <option value="subscription">Subscription Portal</option>
                <option value="custom">Custom URL / Link</option>
              </select>
              <input
                type="text"
                placeholder="Target route or URL (e.g. jobs, explore, or https://...)"
                value={actionUrl}
                onChange={e => setActionUrl(e.target.value)}
                className="flex-1 px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-stone-900"
              />
            </div>
          </div>

          {/* Audience Guarantees Strip */}
          <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-1.5 text-stone-600 text-xs">
            <div className="flex items-center gap-2 font-bold text-stone-900">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Broadcast Delivery Guarantees:</span>
            </div>
            <ul className="list-disc pl-5 space-y-0.5 text-[11px] text-stone-500 font-medium">
              <li><strong>Every User Reached:</strong> Delivered to Doctors, Clinics, Livestock Farmers, and Pet Owners.</li>
              <li><strong>Offline/Inactive Users:</strong> Users inactive for days or weeks receive the status bar alert immediately upon opening their browser or returning to the app.</li>
              <li><strong>PWA & Mobile Native:</strong> Appears directly in Android and iOS notification trays via the Service Worker background listener.</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={handleTestNotification}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-stone-200 hover:bg-stone-50 text-stone-700 text-xs font-black transition-all cursor-pointer"
            >
              <Smartphone className="w-3.5 h-3.5 text-stone-500" />
              Test on this Device
            </button>

            <button
              type="button"
              disabled={!title.trim() || !message.trim() || isSubmitting}
              onClick={() => setConfirmModalOpen(true)}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-white rounded-xl text-xs font-black transition-all shadow-md cursor-pointer active:scale-95 ml-auto"
            >
              <Send className="w-3.5 h-3.5 text-emerald-400" />
              Send Broadcast to All Users
            </button>
          </div>
        </div>

        {/* Right Column: Realistic Live Preview (5 Cols) */}
        <div className="lg:col-span-5 bg-stone-900 text-white p-6 rounded-2xl border border-stone-800 shadow-md space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-stone-800">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-black uppercase tracking-wider text-stone-300">Live Device Preview</span>
              </div>

              <div className="flex gap-1 bg-stone-800 p-0.5 rounded-lg text-[10px] font-bold">
                <button
                  onClick={() => setPreviewMode('mobile')}
                  className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
                    previewMode === 'mobile' ? 'bg-stone-700 text-white' : 'text-stone-400 hover:text-white'
                  }`}
                >
                  OS Status Bar
                </button>
                <button
                  onClick={() => setPreviewMode('inapp')}
                  className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
                    previewMode === 'inapp' ? 'bg-stone-700 text-white' : 'text-stone-400 hover:text-white'
                  }`}
                >
                  In-App Popup
                </button>
              </div>
            </div>

            {/* Preview Simulation Display */}
            <div className="mt-4">
              {previewMode === 'mobile' ? (
                /* Mobile Status Bar Simulation */
                <div className="bg-stone-950/80 rounded-2xl p-4 border border-stone-800 shadow-inner">
                  {/* Status Bar Header */}
                  <div className="flex items-center justify-between text-[10px] text-stone-500 font-mono pb-2 mb-2 border-b border-stone-900">
                    <span>9:41 AM</span>
                    <span className="flex items-center gap-1">
                      <span>LTE</span>
                      <span>📶</span>
                      <span>🔋 98%</span>
                    </span>
                  </div>

                  {/* Notification Card */}
                  <div className="bg-stone-900/90 rounded-xl p-3 border border-stone-700 shadow-lg space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs">🐾</span>
                        <span className="text-[11px] font-black text-amber-400 tracking-tight">VetAxis 360</span>
                        <span className="text-[9px] text-stone-500">· now</span>
                      </div>
                      <span className="text-[9px] text-stone-500 uppercase font-mono">{priority}</span>
                    </div>

                    <div className="text-xs font-bold text-white leading-tight">
                      {title.trim() || 'Urgent Clinic Notice or Announcement'}
                    </div>

                    <p className="text-[11px] text-stone-300 leading-snug line-clamp-3">
                      {message.trim() || 'Your custom message text will appear right here in the device pull-down notification shade.'}
                    </p>

                    {actionUrl && (
                      <div className="pt-1 flex items-center gap-1 text-[10px] text-amber-400 font-bold">
                        <ExternalLink className="w-3 h-3" />
                        <span>Tap to view in app</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* In-App Toast & Tray Simulation */
                <div className="bg-[#fcfaf5] text-stone-900 rounded-2xl p-4 border border-[#e3dec9] shadow-inner space-y-3">
                  <div className="text-[10px] font-black uppercase text-[#5a5a40] tracking-wider">
                    In-App Notification Toast Simulation:
                  </div>

                  <div className="bg-white rounded-xl p-3 border-2 border-amber-400 shadow-md flex items-start gap-2.5">
                    <span className="text-lg mt-0.5">📢</span>
                    <div className="flex-1">
                      <span className="text-[9px] font-black uppercase tracking-wider text-amber-700 block">
                        ADMIN BROADCAST ANNOUNCEMENT
                      </span>
                      <div className="text-xs font-black text-stone-900 mt-0.5">
                        {title.trim() || 'Notification Title'}
                      </div>
                      <p className="text-[11px] text-stone-600 leading-tight mt-1">
                        {message.trim() || 'Custom message text displayed to every active and returning visitor.'}
                      </p>
                    </div>
                  </div>

                  <div className="text-[10px] text-stone-500 italic">
                    Also pinned to the top of their in-app Notification Bell drawer until dismissed.
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="p-3 bg-stone-800/60 rounded-xl border border-stone-700/60 text-stone-400 text-[11px] leading-relaxed">
            <span className="text-amber-400 font-bold">Tip:</span> Use the "Test on this Device" button to test real-world push rendering on your current screen or smartphone browser.
          </div>
        </div>
      </div>

      {/* Confirmation Modal Before Blasting to Every User */}
      {confirmModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-stone-200 overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-150 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-50 text-amber-700 rounded-xl border border-amber-200">
                <Radio className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h3 className="text-lg font-black text-stone-900">Broadcast to Every User?</h3>
                <p className="text-xs text-stone-500">This notification will immediately be pushed to all accounts.</p>
              </div>
            </div>

            <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 space-y-1.5 text-xs">
              <div className="font-bold text-stone-900">{title}</div>
              <p className="text-stone-600 line-clamp-3 leading-snug">{message}</p>
            </div>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-800 flex items-start gap-2">
              <Info className="w-4 h-4 shrink-0 text-amber-700 mt-0.5" />
              <span>
                Users currently online will receive an immediate browser banner. Users who haven't logged in for days will receive this alert the moment they reopen the app.
              </span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setConfirmModalOpen(false)}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-bold text-stone-600 hover:text-stone-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitBroadcast}
                disabled={isSubmitting}
                className="px-5 py-2 text-xs font-black text-white bg-stone-900 hover:bg-stone-800 rounded-xl shadow-xs transition-all cursor-pointer inline-flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Transmitting...
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5 text-emerald-400" />
                    Confirm & Send Broadcast
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
