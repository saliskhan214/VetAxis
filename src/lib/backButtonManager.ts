/**
 * Universal Android Hardware / Gesture Back Button Manager for VetAxis 360
 * Intercepts Android system back buttons, browser history popstate, and edge swipe gestures,
 * routing them seamlessly into in-app back actions:
 *  1. Closes open dialogs, drawers, booking sheets, and practitioner detail modals first.
 *  2. Navigates back through visited sections (e.g. Jobs -> Explore).
 *  3. Seamlessly integrates with browser history.
 */

type ModalCloseHandler = () => void;

interface ModalEntry {
  id: string;
  onClose: ModalCloseHandler;
}

class BackButtonManager {
  private modalStack: ModalEntry[] = [];
  private sectionHistory: string[] = [];
  private onNavigateCallback: ((section: string) => void) | null = null;
  private isProcessingPopState = false;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('popstate', this.handlePopState);
    }
  }

  public init(initialSection: string, onNavigate: (section: string) => void) {
    this.sectionHistory = [initialSection];
    this.onNavigateCallback = onNavigate;

    // Ensure the baseline root history state has section metadata
    try {
      const currentUrl = new URL(window.location.href);
      window.history.replaceState(
        { section: initialSection, isRoot: true, timestamp: Date.now() },
        '',
        currentUrl.toString()
      );
    } catch (e) {
      console.warn('[BackButton] Could not initialize history state:', e);
    }
  }

  /**
   * Register an open modal/dialog/drawer with the Android back button.
   * When Android back button is pressed, this modal is dismissed first.
   */
  public registerModal(id: string, onClose: ModalCloseHandler): () => void {
    // Avoid duplicate registration
    const existingIdx = this.modalStack.findIndex(m => m.id === id);
    if (existingIdx !== -1) {
      this.modalStack[existingIdx].onClose = onClose;
      return () => this.unregisterModal(id);
    }

    this.modalStack.push({ id, onClose });

    // Push a virtual modal history entry so Android system back fires popstate
    try {
      window.history.pushState(
        { isModal: true, modalId: id, timestamp: Date.now() },
        ''
      );
    } catch (e) {
      console.warn('[BackButton] Could not push modal state:', e);
    }

    return () => {
      this.unregisterModal(id);
    };
  }

  /**
   * Unregister a modal when closed via UI buttons (X button, cancel, etc.)
   */
  public unregisterModal(id: string, triggerHistoryBack: boolean = true) {
    const idx = this.modalStack.findIndex(m => m.id === id);
    if (idx !== -1) {
      this.modalStack.splice(idx, 1);
      // If closed by in-app button (not by popstate), pop the virtual history entry
      if (triggerHistoryBack && !this.isProcessingPopState && typeof window !== 'undefined') {
        try {
          if (window.history.state && window.history.state.isModal) {
            window.history.back();
          }
        } catch {}
      }
    }
  }

  /**
   * Record when user navigates forward to a new section
   */
  public pushSection(section: string) {
    if (this.sectionHistory[this.sectionHistory.length - 1] !== section) {
      this.sectionHistory.push(section);
    }
  }

  /**
   * Handles popstate event emitted when Android back button or browser back is pressed
   */
  private handlePopState = (e: PopStateEvent) => {
    this.isProcessingPopState = true;

    try {
      // 1. If any modal, bottom sheet, or drawer is open, dismiss the topmost one first
      if (this.modalStack.length > 0) {
        const topModal = this.modalStack.pop();
        if (topModal) {
          try {
            topModal.onClose();
          } catch (err) {
            console.error('[BackButton] Error in modal onClose handler:', err);
          }
          return;
        }
      }

      // 2. Otherwise, navigate back in the section history stack
      const state = e.state;
      let targetSection = state?.section;

      if (!targetSection) {
        const params = new URLSearchParams(window.location.search);
        targetSection = params.get('tab') || 'explore';
      }

      // Pop current from internal history
      if (this.sectionHistory.length > 1) {
        this.sectionHistory.pop();
      }

      const prev = targetSection || this.sectionHistory[this.sectionHistory.length - 1] || 'explore';
      
      if (this.onNavigateCallback) {
        this.onNavigateCallback(prev);
      }
    } finally {
      this.isProcessingPopState = false;
    }
  };
}

export const backButtonManager = new BackButtonManager();
