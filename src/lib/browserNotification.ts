/**
 * Browser Web Notification & Cross-Tab Realtime Push Engine for VetAxis 360
 */

export interface BrowserNotificationOptions {
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: any;
  silent?: boolean;
  requireInteraction?: boolean;
  onClick?: () => void;
}

export type PermissionStatus = 'granted' | 'denied' | 'default' | 'unsupported';

class BrowserNotificationManager {
  private broadcastChannel: BroadcastChannel | null = null;
  private listeners: ((payload: any) => void)[] = [];

  constructor() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.broadcastChannel = new BroadcastChannel('vetaxis_live_broadcasts');
        this.broadcastChannel.onmessage = (event) => {
          this.handleIncomingBroadcast(event.data);
        };
      } catch (err) {
        console.warn('BroadcastChannel initialization failed:', err);
      }
    }

    // Fallback for cross-tab via localStorage storage event
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key === 'vetaxis_latest_broadcast' && e.newValue) {
          try {
            const data = JSON.parse(e.newValue);
            this.handleIncomingBroadcast(data);
          } catch {}
        }
      });
    }
  }

  /**
   * Check if running inside an iframe (like AI Studio preview or embed)
   */
  public isInIframe(): boolean {
    if (typeof window === 'undefined') return false;
    try {
      return window.self !== window.top;
    } catch (e) {
      return true;
    }
  }

  /**
   * Check if the user previously dismissed the browser alert prompt banner
   */
  public isDismissed(): boolean {
    if (typeof window === 'undefined') return false;
    try {
      return localStorage.getItem('vetaxis_browser_alerts_dismissed') === 'true';
    } catch {
      return false;
    }
  }

  /**
   * Save dismiss preference
   */
  public setDismissed(dismissed: boolean): void {
    if (typeof window === 'undefined') return;
    try {
      if (dismissed) {
        localStorage.setItem('vetaxis_browser_alerts_dismissed', 'true');
      } else {
        localStorage.removeItem('vetaxis_browser_alerts_dismissed');
      }
    } catch {}
  }

  /**
   * Check if browser Notification API is supported
   */
  public isSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window;
  }

  /**
   * Get current browser notification permission
   */
  public getPermission(): PermissionStatus {
    if (!this.isSupported()) return 'unsupported';
    return Notification.permission as PermissionStatus;
  }

  /**
   * Request permission from user with safe timeout and iframe handling
   */
  public async requestPermission(): Promise<PermissionStatus> {
    if (!this.isSupported()) return 'unsupported';

    if (this.isInIframe()) {
      // In modern browsers, Notification.requestPermission() is blocked inside cross-origin iframes
      console.warn('Notification permission request: Running inside an iframe.');
      try {
        const res = await Notification.requestPermission();
        return res as PermissionStatus;
      } catch {
        return (Notification.permission || 'default') as PermissionStatus;
      }
    }

    try {
      // Wrap in a promise with timeout in case browser hangs on prompt
      const result = await Promise.race([
        Notification.requestPermission(),
        new Promise<PermissionStatus>((_, reject) => 
          setTimeout(() => reject(new Error('Permission request timed out')), 8000)
        )
      ]);
      return result as PermissionStatus;
    } catch (err: any) {
      console.warn('Notification.requestPermission error:', err);
      return (Notification.permission || 'default') as PermissionStatus;
    }
  }

  /**
   * Fire a quick test notification
   */
  public sendTestNotification(): boolean {
    if (this.getPermission() !== 'granted') return false;
    const notif = this.showNotification('🐾 VetAxis 360 Alerts Active', {
      body: 'Desktop notifications are working! You will be notified of important pet care updates and broadcasts.',
      requireInteraction: false
    });
    return !!notif;
  }

  /**
   * Fire a native OS / Browser notification
   */
  public showNotification(title: string, options: BrowserNotificationOptions): Notification | null {
    if (!this.isSupported()) {
      return null;
    }

    if (Notification.permission !== 'granted') {
      return null;
    }

    try {
      const defaultIcon = '/logo.png';
      const notif = new Notification(title, {
        body: options.body,
        icon: options.icon || defaultIcon,
        badge: options.badge || defaultIcon,
        tag: options.tag || ('vetaxis_' + Date.now()),
        silent: options.silent || false,
        requireInteraction: options.requireInteraction ?? false,
        data: options.data
      });

      notif.onclick = () => {
        try {
          window.focus();
        } catch {}
        if (options.onClick) {
          options.onClick();
        }
        notif.close();
      };

      return notif;
    } catch (err) {
      console.warn('Error firing native browser notification:', err);
      return null;
    }
  }

  /**
   * Broadcast an alert across tabs and invoke native browser notification
   */
  public broadcastLocally(payload: any) {
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage(payload);
      } catch (err) {
        console.warn('BroadcastChannel postMessage failed:', err);
      }
    }

    // Storage event for other tabs
    try {
      localStorage.setItem('vetaxis_latest_broadcast', JSON.stringify({ ...payload, _t: Date.now() }));
    } catch {}

    // Also trigger on current tab listeners
    this.handleIncomingBroadcast(payload);
  }

  /**
   * Register a listener for incoming broadcast alerts
   */
  public onBroadcast(listener: (payload: any) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private handleIncomingBroadcast(payload: any) {
    this.listeners.forEach(fn => {
      try {
        fn(payload);
      } catch (err) {
        console.error('Error executing broadcast listener:', err);
      }
    });
  }
}

export const BrowserNotificationService = new BrowserNotificationManager();
