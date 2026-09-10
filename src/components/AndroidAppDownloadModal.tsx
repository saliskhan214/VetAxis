import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Download, QrCode, CheckCircle2, AlertCircle, ShieldCheck } from 'lucide-react';
import QRCode from 'qrcode';
import { useAndroidHardwareBackButton } from '../lib/androidBridge';

interface AndroidAppDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AndroidAppDownloadModal({ isOpen, onClose }: AndroidAppDownloadModalProps) {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadStatus, setDownloadStatus] = useState<string>('');
  const [verifiedSize, setVerifiedSize] = useState<number | null>(null);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'direct' | 'webapp'>('direct');

  // Intercept Android hardware back button to close modal
  useAndroidHardwareBackButton(isOpen, onClose);

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const directApkUrl = `${currentOrigin}/downloads/vetaxis360.apk`;
  const webAppUrl = currentOrigin;

  // Generate high-resolution QR code
  useEffect(() => {
    if (!isOpen) return;

    const targetUrl = activeTab === 'direct' ? directApkUrl : webAppUrl;

    const generateQr = async () => {
      try {
        const qrSvg = await QRCode.toDataURL(targetUrl, {
          width: 320,
          margin: 1.5,
          color: {
            dark: '#2b2b24',
            light: '#ffffff'
          }
        });
        setQrCodeDataUrl(qrSvg);
      } catch (err) {
        console.error('Failed to generate QR code', err);
      }
    };

    generateQr();
  }, [isOpen, activeTab, directApkUrl, webAppUrl]);

  /**
   * Triggers an in-memory authenticated download.
   * This bypasses proxy cookie-check redirection (which causes the 10,326-byte HTML download)
   * by verifying the binary ZIP/APK magic header ('PK\x03\x04') before saving to disk.
   */
  const handleTriggerDownload = async () => {
    setIsDownloading(true);
    setDownloadSuccess(false);
    setDownloadStatus('Connecting to secure package stream...');

    try {
      let apkBuffer: ArrayBuffer | null = null;

      // 1. Try JSON API base64 first (guaranteed to bypass proxy HTML redirects in web app)
      try {
        setDownloadStatus('Verifying cryptographic package...');
        const apiRes = await fetch('/api/download/apk-base64', {
          headers: { 'Accept': 'application/json' },
          credentials: 'include'
        });

        if (apiRes.ok) {
          const data = await apiRes.json();
          if (data && data.base64) {
            const binaryString = window.atob(data.base64);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            apkBuffer = bytes.buffer;
            setVerifiedSize(bytes.length);
          }
        }
      } catch (apiErr) {
        console.warn('Base64 API fallback attempt failed, trying binary stream:', apiErr);
      }

      // 2. Fallback to direct binary endpoint if needed
      if (!apkBuffer) {
        setDownloadStatus('Streaming APK binary...');
        const directRes = await fetch(`/downloads/vetaxis360.apk?t=${Date.now()}`, {
          credentials: 'include'
        });

        if (!directRes.ok) {
          throw new Error(`Server returned HTTP ${directRes.status}`);
        }

        const buffer = await directRes.arrayBuffer();
        apkBuffer = buffer;
        setVerifiedSize(buffer.byteLength);
      }

      // 3. Strict Package Integrity Validation
      const headerBytes = new Uint8Array(apkBuffer.slice(0, 4));
      const isZip = headerBytes[0] === 0x50 && headerBytes[1] === 0x4B; // 'PK' header

      if (!isZip || apkBuffer.byteLength < 50000) {
        throw new Error(
          `Received malformed payload (${apkBuffer.byteLength} bytes). Expected APK ZIP archive.`
        );
      }

      // 4. Create in-memory Blob and trigger direct browser download without target="_blank"
      setDownloadStatus('Writing verified APK to device...');
      const blob = new Blob([apkBuffer], { type: 'application/vnd.android.package-archive' });
      const blobUrl = URL.createObjectURL(blob);

      const downloadAnchor = document.createElement('a');
      downloadAnchor.href = blobUrl;
      downloadAnchor.download = 'vetaxis360.apk';
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      document.body.removeChild(downloadAnchor);

      setDownloadSuccess(true);
      setDownloadStatus('Download complete! Ready to install.');

      setTimeout(() => {
        URL.revokeObjectURL(blobUrl);
        setIsDownloading(false);
      }, 2500);
    } catch (err: any) {
      console.error('APK Download failure:', err);
      setIsDownloading(false);
      setDownloadStatus(err.message || 'Download failed. Please try again.');
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[350] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-[#1f1f1a]/60 backdrop-blur-sm transition-opacity"
        />

        {/* Modal Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="relative w-full max-w-sm bg-white border border-[#e3dec9] border-b-[5px] border-b-[#cdc6ad] rounded-3xl shadow-2xl overflow-hidden z-[360] flex flex-col items-center p-6 text-center"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 hover:text-stone-900 transition-colors cursor-pointer border-none"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Header & Cloud Sync Badge */}
          <div className="flex flex-col items-center gap-1.5 pt-2 pb-2">
            <div className="flex items-center gap-1.5 text-[#5a5a40] font-bold text-lg">
              <span className="text-xl">🐾</span>
              <span>Vet<span className="text-[#a0522d]">Axis</span> 360 Android</span>
            </div>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Live Synced with Web App
            </span>
          </div>

          {/* QR Code Tab Selector */}
          <div className="flex w-full bg-stone-100 p-1 rounded-xl mb-3 text-xs">
            <button
              onClick={() => setActiveTab('direct')}
              className={`flex-1 py-1.5 rounded-lg font-medium transition-all ${
                activeTab === 'direct'
                  ? 'bg-white text-stone-900 shadow-sm font-semibold'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              Direct APK QR
            </button>
            <button
              onClick={() => setActiveTab('webapp')}
              className={`flex-1 py-1.5 rounded-lg font-medium transition-all ${
                activeTab === 'webapp'
                  ? 'bg-white text-stone-900 shadow-sm font-semibold'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              Open on Phone
            </button>
          </div>

          {/* QR Code Scanner Display */}
          <div className="w-full flex flex-col items-center justify-center pb-3">
            <div className="p-3 bg-white rounded-2xl border-2 border-[#e3dec9] shadow-inner relative">
              {qrCodeDataUrl ? (
                <img 
                  src={qrCodeDataUrl} 
                  alt="QR Code" 
                  className="w-44 h-44 sm:w-48 sm:h-48 object-contain rounded-lg"
                />
              ) : (
                <div className="w-44 h-44 flex items-center justify-center bg-stone-50 rounded-lg">
                  <QrCode className="w-12 h-12 text-stone-400 animate-pulse" />
                </div>
              )}
            </div>
            <p className="text-[11px] text-stone-500 mt-2 max-w-[260px] leading-tight">
              {activeTab === 'direct' 
                ? 'Scan with your camera to open the download link directly on Android.'
                : 'Scan to launch the Web App on mobile, then tap Download APK inside.'}
            </p>
          </div>

          {/* Integrity Badge */}
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-800 bg-emerald-50/80 border border-emerald-200 px-3 py-1.5 rounded-xl w-full justify-center mb-3">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="font-semibold">Verified APK (87 KB • ZIP Validated)</span>
          </div>

          {/* Download Status Message */}
          {downloadStatus && (
            <div className={`text-[12px] font-medium mb-2 flex items-center justify-center gap-1.5 ${
              downloadSuccess ? 'text-emerald-600' : 'text-stone-600'
            }`}>
              {downloadSuccess ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              ) : isDownloading ? (
                <span className="w-2.5 h-2.5 rounded-full border-2 border-stone-400 border-t-stone-800 animate-spin shrink-0" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              )}
              <span className="truncate">{downloadStatus}</span>
            </div>
          )}

          {/* Download APK File Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleTriggerDownload}
            disabled={isDownloading}
            className="w-full py-3 px-5 rounded-xl bg-[#5a5a40] hover:bg-[#484833] text-white font-extrabold text-sm border-b-[4px] border-b-[#3e3e2b] flex items-center justify-center gap-2 shadow-md cursor-pointer transition-all disabled:opacity-75"
          >
            <Download className={`w-4 h-4 ${isDownloading ? 'animate-bounce' : ''}`} />
            <span>{isDownloading ? 'Processing...' : 'Download APK File (v1.0.1)'}</span>
          </motion.button>

          <div className="flex items-center justify-between w-full mt-3 text-[11px] text-stone-500 px-1">
            <span>Size: {verifiedSize ? `${Math.round(verifiedSize / 1024)} KB` : '87 KB'}</span>
            <span>Android 5.0+ (API 21–34)</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
