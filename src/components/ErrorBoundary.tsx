import { Component, ReactNode, ErrorInfo } from "react";
import { AlertOctagon, RotateCcw, Trash2, Home } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State;
  public props: Props;

  constructor(props: Props) {
    super(props);
    this.props = props;
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("🔴 [VetAxis System Crash Caught]:", error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetCache = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
      alert("App cache cleared successfully! Reloading to restore pristine state...");
      window.location.href = window.location.origin;
    } catch (e) {
      console.error("Failed to clear local cache:", e);
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#faf8f5] flex items-center justify-center p-4 font-sans select-none">
          <div className="max-w-2xl w-full bg-white border border-[#e5dfd0] border-b-[8px] border-b-[#c4bca6] rounded-2xl p-6 sm:p-10 shadow-2xl relative overflow-hidden animate-fadeIn">
            {/* Top decorative alert banner */}
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-red-500 via-amber-500 to-red-500" />

            <div className="flex flex-col items-center text-center space-y-6">
              {/* Alert Icon */}
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center border border-red-200 shadow-inner">
                <AlertOctagon className="w-9 h-9 text-red-600 animate-pulse" />
              </div>

              {/* Title */}
              <div className="space-y-2">
                <h1 className="text-2xl sm:text-3xl font-serif font-black text-stone-900 tracking-tight">
                  Oops! System Integrity Safeguard Triggered
                </h1>
                <p className="text-stone-600 text-sm max-w-md mx-auto">
                  VetAxis caught a visual or database rendering exception. The main core remains intact, and your active session has been safely isolated.
                </p>
              </div>

              {/* Recovery Actions Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg pt-2">
                <button
                  onClick={this.handleReload}
                  className="flex items-center justify-center gap-2 bg-[#128c7e] hover:bg-[#0c6b60] text-white font-bold py-3 px-5 rounded-xl transition-all shadow-md transform hover:-translate-y-0.5 cursor-pointer text-sm"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reload VetAxis
                </button>
                <button
                  onClick={this.handleResetCache}
                  className="flex items-center justify-center gap-2 bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-300 font-bold py-3 px-5 rounded-xl transition-all transform hover:-translate-y-0.5 cursor-pointer text-sm"
                >
                  <Trash2 className="w-4 h-4 text-red-600" />
                  Clear Storage & Reset
                </button>
              </div>

              {/* Diagnostics Section */}
              <div className="w-full text-left bg-stone-50 border border-stone-200 rounded-xl p-4 mt-4">
                <details className="group">
                  <summary className="text-xs font-mono font-bold text-stone-600 cursor-pointer list-none flex items-center justify-between">
                    <span>🔬 TECHNICAL DIAGNOSTIC REPORT</span>
                    <span className="text-[10px] bg-stone-200 text-stone-800 px-1.5 py-0.5 rounded uppercase">
                      Expand Code
                    </span>
                  </summary>
                  <div className="mt-3 text-xs font-mono text-red-800 bg-red-50 border border-red-100 p-3 rounded-lg overflow-x-auto max-h-48 whitespace-pre-wrap leading-relaxed select-text">
                    <p className="font-bold border-b border-red-200 pb-1.5 mb-1.5">
                      Error: {this.state.error?.message || "Unknown rendering failure"}
                    </p>
                    <p className="text-[10px] text-stone-500">
                      {this.state.error?.stack || "No callstack available."}
                    </p>
                  </div>
                </details>
              </div>

              {/* Home redirect */}
              <a
                href="/"
                className="inline-flex items-center gap-1.5 text-[#128c7e] hover:text-[#0c6b60] font-bold text-xs uppercase tracking-wider"
              >
                <Home className="w-3.5 h-3.5" />
                Return to Landing Feed
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
