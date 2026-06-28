import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Shield, CreditCard, Smartphone, Check, Loader2, 
  ArrowLeft, Lock, Info, Landmark, HelpCircle, PhoneCall
} from 'lucide-react';

interface CheckoutPortalProps {
  token: string;
  onCancel: () => void;
  onSuccess: () => void;
}

export function CheckoutPortal({ token, onCancel, onSuccess }: CheckoutPortalProps) {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<{
    token: string;
    userId: string;
    planId: string;
    price: number;
    status: string;
  } | null>(null);

  const [activeTab, setActiveTab] = useState<'wallet' | 'card'>('wallet');
  const [processing, setProcessing] = useState<boolean>(false);
  const [step, setStep] = useState<'input' | 'otp' | 'submitting'>('input');
  
  // Wallet state
  const [walletProvider, setWalletProvider] = useState<'easypaisa' | 'jazzcash'>('easypaisa');
  const [mobileNumber, setMobileNumber] = useState<string>('');
  const [otpCode, setOtpCode] = useState<string>('');
  const [otpTimer, setOtpTimer] = useState<number>(30);

  // Card state
  const [cardName, setCardName] = useState<string>('');
  const [cardNumber, setCardNumber] = useState<string>('');
  const [cardExpiry, setCardExpiry] = useState<string>('');
  const [cardCvv, setCardCvv] = useState<string>('');

  // Sandbox simulation logs
  const [simulationLogs, setSimulationLogs] = useState<string[]>([]);
  const [currentLogIndex, setCurrentLogIndex] = useState<number>(0);

  const logs = [
    "Establishing secure Handshake with Safepay checkout gateway...",
    "Validating client Sandbox token credentials...",
    "Waiting for customer authorization pin code...",
    "Authorizing transaction amount in PKR...",
    "Generating verified SHA256 cryptographic signature...",
    "Sending secure Webhook signal with header X-SFPY-SIGNATURE...",
    "Database records updated: is_premium set to true!",
    "Transaction confirmed. Preparing redirect..."
  ];

  // Fetch session on load
  useEffect(() => {
    fetch(`/api/payments/session/${token}`)
      .then(async (res) => {
        if (!res.ok) {
          throw new Error('Could not retrieve payment session details.');
        }
        const data = await res.json();
        setSession(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to fetch session.');
        setLoading(false);
      });
  }, [token]);

  // Handle countdown timer for OTP
  useEffect(() => {
    let timer: any;
    if (step === 'otp' && otpTimer > 0) {
      timer = setInterval(() => setOtpTimer(prev => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [step, otpTimer]);

  const handleWalletSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mobileNumber || mobileNumber.replace(/[^0-9]/g, '').length < 10) {
      alert('Please enter a valid Pakistani mobile number.');
      return;
    }
    setStep('otp');
    setOtpTimer(30);
  };

  const handleOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length !== 4) {
      alert('Please enter the 4-digit code.');
      return;
    }
    triggerPaymentSimulation();
  };

  const handleCardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardName.trim()) {
      alert('Please enter cardholder name.');
      return;
    }
    if (cardNumber.replace(/\s/g, '').length !== 16) {
      alert('Please enter a valid 16-digit card number.');
      return;
    }
    if (!/^\d{2}\/\d{2}$/.test(cardExpiry)) {
      alert('Please enter expiration in MM/YY.');
      return;
    }
    if (cardCvv.length < 3) {
      alert('Please enter CVV.');
      return;
    }
    triggerPaymentSimulation();
  };

  const triggerPaymentSimulation = () => {
    setStep('submitting');
    setProcessing(true);
    setSimulationLogs([]);
    setCurrentLogIndex(0);

    // Roll through simulation logs one by one
    let index = 0;
    const interval = setInterval(() => {
      if (index < logs.length) {
        setSimulationLogs(prev => [...prev, logs[index]]);
        index++;
        setCurrentLogIndex(index);
      } else {
        clearInterval(interval);
        executePaymentBackend();
      }
    }, 700);
  };

  const executePaymentBackend = async () => {
    try {
      const response = await fetch('/api/payments/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          paymentMethod: activeTab === 'wallet' ? walletProvider : 'card',
          mobileNumber: activeTab === 'wallet' ? mobileNumber : ''
        })
      });

      if (!response.ok) {
        throw new Error('Gateway execution failure.');
      }

      const result = await response.json();
      if (result.success) {
        onSuccess();
      } else {
        alert('Payment authorization failed on server.');
        setStep('input');
        setProcessing(false);
      }
    } catch (err: any) {
      alert('Payment server failed: ' + err.message);
      setStep('input');
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[500px] flex flex-col items-center justify-center p-8 text-center bg-white rounded-3xl border border-[#e3dec9] space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-[#5a5a40]" />
        <p className="text-xs font-mono font-bold text-[#7a766f]">Loading Safepay Secure gateway...</p>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-[500px] flex flex-col items-center justify-center p-8 text-center bg-white rounded-3xl border border-red-200 space-y-4">
        <div className="text-4xl">⚠️</div>
        <h3 className="font-serif text-lg font-black text-red-700">Invalid Secure Session</h3>
        <p className="text-xs font-semibold text-[#7a766f] max-w-sm">
          {error || 'The requested checkout transaction session could not be authenticated.'}
        </p>
        <button
          onClick={onCancel}
          className="btn-tactile-3d-secondary bg-stone-100 border-stone-300 hover:bg-stone-200 text-stone-800 text-xs px-5 py-2 font-black uppercase cursor-pointer"
        >
          Return to Billing
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-8 text-left select-none pb-12 animate-fadeIn">
      
      {/* LEFT COLUMN: PAYMENT PORTAL FORM */}
      <div className="md:col-span-8 bg-white border border-[#e3dec9] border-b-[6px] border-[#cdc6ad] rounded-3xl p-6 md:p-8 space-y-6 relative overflow-hidden">
        
        {/* SECURE HEADER BADGES */}
        <div className="flex items-center justify-between border-b border-[#f4f1e9] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-xl">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-mono tracking-widest uppercase text-emerald-700 font-bold block">Secure Sandbox Merchant Payment</span>
              <h1 className="font-serif font-black text-xl text-stone-900 flex items-center gap-1.5 leading-none">
                Safepay / Rapid Checkout
              </h1>
            </div>
          </div>
          <button
            onClick={onCancel}
            disabled={processing}
            className="p-2 text-stone-400 hover:text-stone-900 hover:bg-stone-50 rounded-xl transition-colors cursor-pointer"
            title="Cancel payment"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        </div>

        {step === 'submitting' ? (
          /* PROCESSING SIMULATION STEP */
          <div className="p-4 space-y-6">
            <div className="flex flex-col items-center justify-center space-y-3 py-6">
              <Loader2 className="w-12 h-12 animate-spin text-teal-600" />
              <h3 className="font-serif text-lg font-black text-stone-900">Processing Transaction...</h3>
              <p className="text-xs text-[#7a766f] font-semibold">Please do not refresh or close this tab</p>
            </div>

            {/* LIVE SIMULATOR AUDIT TRAIL */}
            <div className="bg-stone-900 text-teal-400 font-mono text-[11px] p-4 rounded-2xl space-y-2 border border-black shadow-inner max-h-[220px] overflow-y-auto">
              <div className="text-stone-500 border-b border-stone-800 pb-1 flex justify-between uppercase text-[10px] font-black">
                <span>SIMULATOR LOGS</span>
                <span className="animate-pulse text-red-500">● LIVE CONNECTION</span>
              </div>
              {simulationLogs.map((log, i) => (
                <div key={i} className="flex items-start gap-1.5 animate-fadeIn">
                  <span className="text-stone-600 select-none">[{new Date().toLocaleTimeString()}]</span>
                  <span className={i === simulationLogs.length - 1 ? "text-white font-bold" : "text-teal-400"}>
                    {i === simulationLogs.length - 1 ? '➜ ' : '✓ '} {log}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : step === 'otp' ? (
          /* MOBILE WALLET SMS PIN AUTHENTICATION STEP */
          <form onSubmit={handleOtpSubmit} className="space-y-6 py-4">
            <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl p-4 flex gap-3 text-xs leading-relaxed font-semibold">
              <Info className="w-5 h-5 shrink-0 text-[#d97706]" />
              <div>
                <strong className="block font-black text-amber-950">Easypaisa/JazzCash Verification Pending</strong>
                An automated mock authorization prompt was dispatched to <strong className="font-bold underline">{mobileNumber}</strong>. Enter any 4-digit PIN (e.g. 1234) below to secure authorization instantly.
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block">Enter 4-Digit Wallet Authorization PIN</label>
              <div className="flex items-center gap-4">
                <input
                  type="password"
                  required
                  maxLength={4}
                  pattern="\d{4}"
                  placeholder="••••"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ''))}
                  className="form-control text-center text-xl font-mono tracking-[1em] max-w-[150px] font-bold"
                  autoFocus
                />
                <div className="text-xs text-[#7a766f] font-mono">
                  {otpTimer > 0 ? (
                    <span>OTP Resend available in {otpTimer}s</span>
                  ) : (
                    <button 
                      type="button" 
                      onClick={() => setOtpTimer(30)}
                      className="text-teal-600 font-bold hover:underline cursor-pointer bg-transparent border-none p-0"
                    >
                      Resend SMS Push Notification
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-[#f4f1e9] flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setStep('input')}
                className="btn-tactile-3d-secondary bg-stone-100 border-stone-300 hover:bg-stone-200 text-stone-800 text-xs px-5 py-2.5 font-black uppercase cursor-pointer"
              >
                Go Back
              </button>
              <button
                type="submit"
                className="btn-tactile-3d bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700 text-xs px-6 py-2.5 font-black uppercase cursor-pointer"
              >
                Verify & Authorize PKR {session.price.toLocaleString()}
              </button>
            </div>
          </form>
        ) : (
          /* STANDARD INPUT SCREEN */
          <div className="space-y-6">
            {/* GATEWAY PAYMENT SELECTOR TABS */}
            <div className="grid grid-cols-2 gap-3.5">
              <button
                type="button"
                onClick={() => setActiveTab('wallet')}
                className={`p-4 rounded-2xl border-2 flex flex-col items-center justify-center gap-1.5 transition-all text-xs font-black uppercase cursor-pointer ${
                  activeTab === 'wallet'
                    ? 'bg-teal-50 border-teal-600 text-teal-900 shadow-sm'
                    : 'bg-white border-[#e3dec9] text-stone-500 hover:bg-stone-50'
                }`}
              >
                <Smartphone className="w-5 h-5 text-teal-600" />
                <span>Mobile Wallets</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('card')}
                className={`p-4 rounded-2xl border-2 flex flex-col items-center justify-center gap-1.5 transition-all text-xs font-black uppercase cursor-pointer ${
                  activeTab === 'card'
                    ? 'bg-teal-50 border-teal-600 text-teal-900 shadow-sm'
                    : 'bg-white border-[#e3dec9] text-stone-500 hover:bg-stone-50'
                }`}
              >
                <CreditCard className="w-5 h-5 text-teal-600" />
                <span>Credit/Debit Card</span>
              </button>
            </div>

            {activeTab === 'wallet' ? (
              /* MOBILE WALLET METHOD */
              <form onSubmit={handleWalletSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block">Choose Mobile Wallet Provider</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setWalletProvider('easypaisa')}
                      className={`p-3.5 rounded-xl border flex items-center justify-center gap-2 font-sans font-bold text-xs cursor-pointer ${
                        walletProvider === 'easypaisa'
                          ? 'bg-[#1cb864]/10 border-[#1cb864] text-[#1cb864]'
                          : 'bg-white border-[#e3dec9] text-stone-600'
                      }`}
                    >
                      <span className="text-lg">🟢</span>
                      <span>Easypaisa</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setWalletProvider('jazzcash')}
                      className={`p-3.5 rounded-xl border flex items-center justify-center gap-2 font-sans font-bold text-xs cursor-pointer ${
                        walletProvider === 'jazzcash'
                          ? 'bg-amber-500/10 border-amber-500 text-amber-700'
                          : 'bg-white border-[#e3dec9] text-stone-600'
                      }`}
                    >
                      <span className="text-lg">🟡</span>
                      <span>JazzCash</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block">Wallet Mobile Number</label>
                  <div className="relative">
                    <input
                      type="tel"
                      required
                      placeholder="03001234567"
                      value={mobileNumber}
                      onChange={(e) => setMobileNumber(e.target.value.replace(/[^0-9]/g, ''))}
                      className="form-control text-xs font-mono font-bold pl-12"
                    />
                    <PhoneCall className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 w-4.5 h-4.5" />
                  </div>
                  <span className="text-[10px] text-[#7a766f] font-semibold block mt-1">
                    Enter the registered mobile number with your {walletProvider === 'easypaisa' ? 'Easypaisa' : 'JazzCash'} account.
                  </span>
                </div>

                <div className="pt-4 border-t border-[#f4f1e9] flex gap-3 justify-end">
                  <button
                    type="submit"
                    className="btn-tactile-3d bg-teal-600 hover:bg-teal-700 text-white border-teal-700 text-xs px-6 py-2.5 font-black uppercase tracking-wider cursor-pointer"
                  >
                    Initiate Wallet Payment
                  </button>
                </div>
              </form>
            ) : (
              /* CARD PAYMENT METHOD */
              <form onSubmit={handleCardSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block">Cardholder Name</label>
                  <input
                    type="text"
                    required
                    placeholder="DR. MUHAMMAD ALI"
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value.toUpperCase())}
                    className="form-control text-xs font-bold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block">Card Number</label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      maxLength={19}
                      placeholder="4000 1234 5678 9010"
                      value={cardNumber}
                      onChange={(e) => {
                        let formatted = e.target.value.replace(/[^0-9]/g, '').replace(/(.{4})/g, '$1 ').trim();
                        setCardNumber(formatted.slice(0, 19));
                      }}
                      className="form-control text-xs font-mono font-bold pl-10"
                    />
                    <CreditCard className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 w-4.5 h-4.5" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block">Expiration Date</label>
                    <input
                      type="text"
                      required
                      maxLength={5}
                      placeholder="12/28"
                      value={cardExpiry}
                      onChange={(e) => {
                        let raw = e.target.value.replace(/[^0-9]/g, '');
                        if (raw.length >= 2) {
                          setCardExpiry(raw.slice(0, 2) + '/' + raw.slice(2, 4));
                        } else {
                          setCardExpiry(raw);
                        }
                      }}
                      className="form-control text-xs font-mono font-bold text-center"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block">CVV Code</label>
                    <input
                      type="password"
                      required
                      maxLength={4}
                      placeholder="•••"
                      value={cardCvv}
                      onChange={(e) => setCardCvv(e.target.value.replace(/[^0-9]/g, ''))}
                      className="form-control text-xs font-mono font-bold text-center"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-[#f4f1e9] flex gap-3 justify-end">
                  <button
                    type="submit"
                    className="btn-tactile-3d bg-teal-600 hover:bg-teal-700 text-white border-teal-700 text-xs px-6 py-2.5 font-black uppercase tracking-wider cursor-pointer"
                  >
                    Pay PKR {session.price.toLocaleString()} via Card
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>

      {/* RIGHT COLUMN: INVOICE SUMMARY */}
      <div className="md:col-span-4 bg-[#fcf9f2] border border-[#e3dec9] border-b-[6px] border-[#cdc6ad] rounded-3xl p-6 flex flex-col justify-between h-fit space-y-6">
        <div className="space-y-4">
          <div className="border-b border-[#e3dec9] pb-3 text-left">
            <span className="text-[10px] tracking-widest uppercase font-black text-[#5a5a40]">Invoice Summary</span>
            <h3 className="font-serif font-black text-lg text-stone-900 mt-1">Billing Details</h3>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between font-semibold text-stone-600">
              <span>Item Description:</span>
              <span className="font-bold text-stone-900">{session.planId} Upgrade</span>
            </div>
            <div className="flex justify-between font-semibold text-stone-600">
              <span>Reference Order:</span>
              <span className="font-mono text-[10px] bg-white border px-1.5 py-0.5 rounded-lg block truncate max-w-[130px]" title={token}>
                {token}
              </span>
            </div>
            <div className="flex justify-between font-semibold text-stone-600">
              <span>Payment Cycle:</span>
              <span className="font-bold text-stone-900">30-Day Lease</span>
            </div>
          </div>

          <div className="border-t border-[#e3dec9] pt-3.5 flex justify-between items-center">
            <span className="text-xs font-black uppercase text-stone-900">Total Billed:</span>
            <span className="font-serif font-black text-xl text-[#373735]">PKR {session.price.toLocaleString()}</span>
          </div>
        </div>

        <div className="space-y-3 pt-4 border-t border-[#e3dec9] text-[10px] font-semibold text-[#7a766f] leading-relaxed">
          <div className="flex items-start gap-1.5">
            <Lock className="w-3.5 h-3.5 shrink-0 text-emerald-600 mt-0.5" />
            <span>256-Bit SSL Encryption secures this portal connection dynamically.</span>
          </div>
          <div className="flex items-start gap-1.5">
            <Landmark className="w-3.5 h-3.5 shrink-0 text-stone-500 mt-0.5" />
            <span>Sandbox environment. Billed values are simulated only.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
