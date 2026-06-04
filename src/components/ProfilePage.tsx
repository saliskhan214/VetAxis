import { useState, ChangeEvent, FormEvent } from 'react';
import { UserProfile } from '../types';
import { AuthService } from '../lib/storage';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, User, MapPin, Mail, Sparkles, Key, AlertTriangle, Trash2, Camera, RefreshCw } from 'lucide-react';

interface ProfileProps {
  currentUser: UserProfile;
  onUpdateUser: (updated: UserProfile) => void;
  onDeleteSuccess: () => void;
}

export function ProfilePage({ currentUser, onUpdateUser, onDeleteSuccess }: ProfileProps) {
  const [editing, setEditing] = useState<boolean>(false);
  const [name, setName] = useState<string>(currentUser.name);
  const [phone, setPhone] = useState<string>(currentUser.phone || '');
  const [expertise, setExpertise] = useState<string>(currentUser.expertise || '');
  const [facilities, setFacilities] = useState<string>(currentUser.facilities || '');
  const [address, setAddress] = useState<string>(currentUser.address || '');

  // Photo uploads
  const [profilePic, setProfilePic] = useState<string>(currentUser.profilePic || 'default');

  // Password update variables
  const [pwOpen, setPwOpen] = useState<boolean>(false);
  const [newPw, setNewPw] = useState<string>('');
  const [confPw, setConfPw] = useState<string>('');

  // Delete account variables
  const [deleteOpen, setDeleteOpen] = useState<boolean>(false);
  const [deleteCheck1, setDeleteCheck1] = useState<boolean>(false);
  const [deleteCheck2, setDeleteCheck2] = useState<boolean>(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState<string>('');

  // Status logs
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleDeleteAccount = async (e: FormEvent) => {
    e.preventDefault();
    if (!deleteCheck1 || !deleteCheck2) {
      setError('Please acknowledge all safety precautions checkboxes to proceed.');
      return;
    }
    if (deleteConfirmText.trim() !== 'DELETE') {
      setError('Please type the confirmation word "DELETE" exactly to authorize.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await AuthService.deleteAccount(currentUser.uid);
      onDeleteSuccess();
    } catch (err: any) {
      setError(err.message || 'An error occurred during account deletion.');
    } finally {
      setLoading(false);
    }
  };

  const triggerSuccess = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(null), 4000);
  };

  // Convert uploaded photo to Base64 (max 1MB size limit)
  const handlePhotoUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1 * 1024 * 1024) {
      setError('Profile picture must be smaller than 1 MB.');
      return;
    }

    setLoading(true);
    setError(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      if (event.target?.result) {
        const base64Str = event.target.result as string;
        try {
          const updated = await AuthService.updateProfile(currentUser.uid, { profilePic: base64Str });
          onUpdateUser(updated);
          setProfilePic(base64Str);
          triggerSuccess('✓ Profile picture updated successfully!');
        } catch (err: any) {
          setError(err.message || 'Failed to sync picture in database.');
        } finally {
          setLoading(false);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleProfileSave = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!name.trim() || !phone.trim()) {
      setError('Full Name and Phone Number are required fields.');
      return;
    }

    setLoading(true);

    try {
      const payload: Partial<UserProfile> = {
        name: name.trim(),
        phone: phone.trim()
      };

      if (currentUser.role === 'doctor' || currentUser.role === 'assistant') {
        payload.expertise = expertise.trim() || 'General Practitioner';
      }
      if (currentUser.role === 'clinic') {
        payload.facilities = facilities.trim() || 'General OPD';
        payload.address = address.trim();
        if (!payload.address) {
          setError('Clinic physical address is required.');
          setLoading(false);
          return;
        }
      }

      const updated = await AuthService.updateProfile(currentUser.uid, payload);
      onUpdateUser(updated);
      setEditing(false);
      triggerSuccess('✓ User profile updated and saved to server database!');
    } catch (err: any) {
      setError(err.message || 'Saving profile failed.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSave = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!newPw || !confPw) {
      setError('Please fill in both security password fields.');
      return;
    }

    if (newPw.length < 6) {
      setError('Password must compile to at least 6 characters.');
      return;
    }

    if (newPw !== confPw) {
      setError('New passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      await AuthService.changePassword(newPw);
      setNewPw('');
      setConfPw('');
      setPwOpen(false);
      triggerSuccess('✓ Password compiled and updated successfully!');
    } catch (err: any) {
      setError(err.message || 'Failed to update credentials password.');
    } finally {
      setLoading(false);
    }
  };

  const initials = currentUser.name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className="space-y-8 max-w-7xl mx-auto w-[98%] px-1 md:px-4 text-left">
      <div>
        <h1 className="font-serif font-black text-3.5xl text-[#373735] tracking-tight">Clinical Console Setting</h1>
        <p className="text-sm text-[#7a766f] font-semibold mt-1">Manage physical locations, edit expertise catalog, and configure credential checks.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT PROFILE CARD COLUMN (3 Columns on medium+, 4 on large) */}
        <div className="col-span-12 lg:col-span-4 bg-white border border-[#e3dec9] border-b-[5px] border-b-[#cdc6ad] rounded-3xl p-6 shadow-md flex flex-col items-center text-center space-y-6">
          
          <div className="relative group">
            {profilePic && profilePic !== 'default' ? (
              <img
                src={profilePic}
                alt={currentUser.name}
                className="w-28 h-28 rounded-2xl object-cover border-4 border-white shadow-xl bg-[#fcf9f2]"
              />
            ) : (
              <div className="w-28 h-28 rounded-2xl bg-[#5a5a40] text-white text-4xl font-serif font-black flex items-center justify-center shadow-xl uppercase">
                {initials}
              </div>
            )}
            
            {/* File Pencil Overlay */}
            <label className="absolute bottom-1 right-1 bg-[#5a5a40] hover:bg-[#3e3e2b] text-white p-2.5 rounded-xl border-2 border-white cursor-pointer shadow-lg flex items-center justify-center transition-all">
              <Camera className="w-4.5 h-4.5" />
              <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
            </label>
          </div>

          <div className="space-y-1.5 wd-full">
            <h3 className="font-serif text-xl font-black text-[#373735] leading-tight flex items-center justify-center gap-1.5">
              <span>{currentUser.name}</span>
              {currentUser.isVerified && (
                <span className="inline-flex items-center justify-center w-5 h-5 bg-[#2e7d32] text-white rounded-full text-[10px] font-black shrink-0 border border-white">✓</span>
              )}
            </h3>
            
            <span className="inline-block px-3.5 py-1 rounded-xl text-[9px] uppercase font-black tracking-widest bg-[#f4f1e9] text-[#5a5a40] border border-[#e3dec9]">
              Verified {currentUser.role}
            </span>

            <div className="text-xs font-mono font-bold text-[#a49f92] truncate max-w-full">{currentUser.email}</div>
          </div>

          {/* Email Verification Status */}
          <div className="border-t border-[#f4f1e9] w-full pt-6 space-y-3.5">
            <span className="text-[#a49f92] block font-black uppercase tracking-widest text-[9px]">Clinical Auth Scope</span>
            <div className="flex flex-col items-center gap-2">
              {currentUser.emailVerified ? (
                <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-[10px] font-black tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Email Certified Active</span>
                </div>
              ) : (
                <div className="space-y-4 w-full">
                  <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-[10px] font-black tracking-wider bg-red-50 text-red-700 border border-red-200 uppercase">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                    <span>Awaiting Email Verification</span>
                  </div>
                  
                  <div className="flex flex-col gap-2 w-full">
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          setError(null);
                          setSuccess(null);
                          setLoading(true);
                          await AuthService.resendVerification();
                          triggerSuccess("✓ Verification email has been resent to your inbox!");
                        } catch (err: any) {
                          setError(err.message || "Failed to resend verification email.");
                        } finally {
                          setLoading(false);
                        }
                      }}
                      disabled={loading}
                      className="btn-tactile-3d-secondary py-2 px-3 text-[10px]"
                    >
                      ✉️ Resend Verification link
                    </button>

                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          setError(null);
                          setSuccess(null);
                          setLoading(true);
                          const freshUser = await AuthService.reloadUser();
                          onUpdateUser(freshUser);
                          if (freshUser.emailVerified) {
                            triggerSuccess("🎉 Your email has been successfully verified!");
                          } else {
                            setError("Email is still unverified. Check your inbox and click the validation link first.");
                          }
                        } catch (err: any) {
                          setError(err.message || "Failed to refresh verification status.");
                        } finally {
                          setLoading(false);
                        }
                      }}
                      disabled={loading}
                      className="btn-tactile-3d-primary py-2 px-3 text-[10px] inline-flex items-center justify-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Reload Status</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-[#f4f1e9] w-full pt-5">
            <span className="text-[#a49f92] block font-black uppercase tracking-widest text-[9px] mb-2">Live Verification Audits</span>
            <div className="inline-flex items-center gap-1.5 font-bold text-xs bg-[#fcf9f2] border border-[#e3dec9] p-2.5 rounded-xl">
              {currentUser.isVerified ? (
                <span className="text-[#2e7d32] flex items-center gap-1">🛡️ Practitioner Active</span>
              ) : (
                <span className="text-[#a49f92]">Classic User Role Profile</span>
              )}
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN DETAILS INPUTS (8 Columns) */}
        <div className="col-span-12 lg:col-span-8 bg-white border border-[#e3dec9] border-b-[5px] border-b-[#cdc6ad] rounded-3xl p-6 md:p-8 shadow-md space-y-6">
          
          <div className="flex items-center justify-between border-b border-[#f4f1e9] pb-4.5">
            <h3 className="font-serif text-lg font-black text-[#373735] flex items-center gap-2">
              <User className="w-5 h-5 text-[#5a5a40]" />
              <span>Contact Credentials</span>
            </h3>
            
            <div>
              {editing ? (
                <div className="flex gap-2">
                  <button
                    onClick={handleProfileSave}
                    disabled={loading}
                    className="btn-tactile-3d-primary py-2 px-4 text-2xs"
                  >
                    💾 Save Changes
                  </button>
                  <button
                    onClick={() => {
                      setEditing(false);
                      setName(currentUser.name);
                      setPhone(currentUser.phone || '');
                      setExpertise(currentUser.expertise || '');
                      setFacilities(currentUser.facilities || '');
                      setAddress(currentUser.address || '');
                      setError(null);
                    }}
                    className="btn-tactile-3d-secondary py-2 px-4 text-2xs"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setEditing(true)}
                  className="btn-tactile-3d-secondary py-2 px-4 text-2xs"
                >
                  ✏️ Edit Profile Settings
                </button>
              )}
            </div>
          </div>

          <AnimatePresence mode="wait">
            {error && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="p-3.5 bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl font-bold"
              >
                ⚠️ {error}
              </motion.div>
            )}
            
            {success && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl font-bold"
              >
                {success}
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleProfileSave} className="space-y-5">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <span className="text-xs font-black uppercase text-[#5a5a40] tracking-wider">Full Display Name</span>
                <input
                  type="text"
                  className="form-control text-xs"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={!editing || loading}
                />
              </div>

              <div className="space-y-1">
                <span className="text-xs font-black uppercase text-[#5a5a40] tracking-wider">WhatsApp Contact Phone</span>
                <input
                  type="tel"
                  className="form-control text-xs"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={!editing || loading}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <span className="text-xs font-black uppercase text-[#5a5a40] tracking-wider opacity-65">Email address (locked)</span>
                <input
                  type="email"
                  className="form-control text-xs bg-[#f4f1e9]"
                  value={currentUser.email}
                  disabled
                />
              </div>

              <div className="space-y-1">
                <span className="text-xs font-black uppercase text-[#5a5a40] tracking-wider opacity-65">System Role (locked)</span>
                <input
                  type="text"
                  className="form-control text-xs bg-[#f4f1e9] capitalize"
                  value={currentUser.role}
                  disabled
                />
              </div>
            </div>

            {/* CONDITIONAL: Specialty Doctor/Assistant */}
            {(currentUser.role === 'doctor' || currentUser.role === 'assistant') && (
              <div className="space-y-1">
                <span className="text-xs font-black uppercase text-[#5a5a40] tracking-wider">Board Specialization competencies</span>
                <input
                  type="text"
                  className="form-control text-xs"
                  placeholder="e.g. Feline Care, Small Animal Orthopedic and Surgery"
                  value={expertise}
                  onChange={(e) => setExpertise(e.target.value)}
                  disabled={!editing || loading}
                />
              </div>
            )}

            {/* CONDITIONAL: Clinic Details */}
            {currentUser.role === 'clinic' && (
              <div className="grid grid-cols-1 gap-4 bg-[#fcf9f2] p-5 rounded-2xl border border-[#e3dec9] border-b-[3px] space-y-1">
                <span className="text-xs font-black uppercase text-[#5a5a40] tracking-wide block">Hospital Specifications</span>
                
                <div className="space-y-1">
                  <span className="text-xs font-bold text-[#373735]">Clinic Equipments list</span>
                  <input
                    type="text"
                    className="form-control bg-white text-xs"
                    placeholder="e.g. Digital Laboratory, Diagnostic X-Ray diagnostic, 24/7 rescue ICU ward"
                    value={facilities}
                    onChange={(e) => setFacilities(e.target.value)}
                    disabled={!editing || loading}
                  />
                </div>

                <div className="space-y-1">
                  <span className="text-xs font-bold text-[#373735]">Hospital Physical Address</span>
                  <input
                    type="text"
                    className="form-control bg-white text-xs"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    disabled={!editing || loading}
                  />
                </div>
              </div>
            )}

          </form>

          {/* SECURE PASSWORD MANAGEMENT WIDGET */}
          <div className="border-t border-[#f4f1e9] pt-6 space-y-4">
            <button
              type="button"
              onClick={() => {
                setPwOpen(!pwOpen);
                setNewPw('');
                setConfPw('');
                setError(null);
              }}
              className="cursor-pointer inline-flex items-center gap-1.5 px-4 py-2 border border-[#e3dec9] border-b-[3px] text-[#373735] text-xs font-bold bg-[#fcf9f2] hover:bg-white rounded-xl transition-all"
            >
              <Key className="w-4.5 h-4.5 text-[#5a5a40]" />
              <span>Change Security Password</span>
            </button>

            <AnimatePresence>
              {pwOpen && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-[#fcf9f2] border border-[#e3dec9] border-b-[3px] rounded-3xl p-5 space-y-4 overflow-hidden"
                >
                  <h4 className="font-serif text-xs font-black text-[#5a5a40] uppercase tracking-wider">Configure New Security Password</h4>
                  
                  <form onSubmit={handlePasswordSave} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <span className="text-xs font-bold text-[#373735]">New password *</span>
                        <input
                          type="password"
                          className="form-control bg-white text-xs"
                          placeholder="Min. 6 alphanumeric chars"
                          value={newPw}
                          onChange={(e) => setNewPw(e.target.value)}
                          disabled={loading}
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="text-xs font-bold text-[#373735]">Retype new password *</span>
                        <input
                          type="password"
                          className="form-control bg-white text-xs"
                          placeholder="Repeat password"
                          value={confPw}
                          onChange={(e) => setConfPw(e.target.value)}
                          disabled={loading}
                          required
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="btn-tactile-3d-primary py-2.5 px-6 text-xs"
                    >
                      {loading ? 'Changing password…' : 'Update Credentials Password'}
                    </button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* DANGER ZONE - ACCOUNT DELETION */}
          <div className="border-t border-red-200 pt-6 space-y-4">
            <button
              type="button"
              onClick={() => {
                setDeleteOpen(!deleteOpen);
                setDeleteCheck1(false);
                setDeleteCheck2(false);
                setDeleteConfirmText('');
                setError(null);
              }}
              className="cursor-pointer inline-flex items-center gap-1.5 px-4 py-2 border border-red-200 border-b-[3px] text-red-600 hover:text-red-700 hover:border-red-400 text-xs font-bold bg-white rounded-xl transition-all"
            >
              <Trash2 className="w-4.5 h-4.5 text-red-500" />
              <span>Delete Clinical Account & Erase All Records</span>
            </button>

            <AnimatePresence>
              {deleteOpen && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-red-50 border border-red-200 border-b-[3px] rounded-3xl p-5 space-y-4 overflow-hidden"
                >
                  <div className="flex items-center gap-2 text-red-800">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                    <h4 className="font-serif text-sm font-black uppercase tracking-wider">Danger Zone: Irreversible Account Demolition</h4>
                  </div>

                  <div className="text-xs text-red-700/90 space-y-2.5 leading-relaxed font-semibold">
                    <p>
                      Please read this notice carefully before continuing. Deleting your account is absolute and <strong>cannot be undone</strong> under any circumstances.
                    </p>
                    <p>
                      By confirming below:
                    </p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Your personal login profile and details will be wiped from our database.</li>
                      <li>Your clinic facility listings and professional validation will be terminated.</li>
                      <li>All your registered and active classified pet ads, veterinary materials, products, and community posts will be immediately and permanently hard-deleted from our databases.</li>
                    </ul>
                  </div>

                  <form onSubmit={handleDeleteAccount} className="space-y-4 pt-2">
                    <div className="space-y-2">
                      <label className="flex items-start gap-2.5 cursor-pointer text-xs font-bold text-stone-800 select-none">
                        <input
                          type="checkbox"
                          checked={deleteCheck1}
                          onChange={(e) => setDeleteCheck1(e.target.checked)}
                          className="mt-0.5 cursor-pointer accent-red-600 w-4 h-4"
                        />
                        <span>I understand that this action is absolute, permanent, and irreversible.</span>
                      </label>

                      <label className="flex items-start gap-2.5 cursor-pointer text-xs font-bold text-red-800 select-none">
                        <input
                          type="checkbox"
                          checked={deleteCheck2}
                          onChange={(e) => setDeleteCheck2(e.target.checked)}
                          className="mt-0.5 cursor-pointer accent-red-600 w-4 h-4"
                        />
                        <span>I consent to the immediate and complete erasure of all my posts, classified ads, and products.</span>
                      </label>
                    </div>

                    <div className="border-t border-red-200 pt-3 space-y-1">
                      <span className="text-xs font-black text-red-800 block">To authorize, type the word "DELETE" in uppercase below:</span>
                      <input
                        type="text"
                        className="form-control bg-white text-xs border-red-200 focus:border-red-500 w-full md:w-80"
                        placeholder='Type "DELETE"'
                        value={deleteConfirmText}
                        onChange={(e) => setDeleteConfirmText(e.target.value)}
                        disabled={loading}
                        required
                      />
                    </div>

                    <div className="flex gap-3 pt-1">
                      <button
                        type="submit"
                        disabled={loading || deleteConfirmText !== 'DELETE' || !deleteCheck1 || !deleteCheck2}
                        className="cursor-pointer border border-[#c23838] border-b-[3px] border-b-[#9e2a2a] bg-[#df4747] hover:bg-[#c23838] disabled:bg-stone-300 disabled:border-stone-400 text-white text-xs font-bold.5 py-2.5 px-6 rounded-2xl transition-all shadow-sm flex items-center gap-2"
                      >
                        {loading ? 'Erasing data...' : 'Permanently Delete My Account'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteOpen(false)}
                        className="btn-tactile-3d-secondary py-2.5 px-6 text-xs"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>

      </div>

    </div>
  );
}
