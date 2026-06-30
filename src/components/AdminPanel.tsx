import React, { useState, useEffect } from 'react';
import { UserProfile, ManualPayment } from '../types';
import { PaymentService, AuthService, NotificationService } from '../lib/storage';
import { Loader2, CheckCircle, XCircle, Search } from 'lucide-react';

interface AdminPanelProps {
  currentUser: UserProfile;
}

export function AdminPanel({ currentUser }: AdminPanelProps) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [pendingPayments, setPendingPayments] = useState<ManualPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    confirmText?: string;
    isDestructive?: boolean;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    confirmText: 'Confirm',
    isDestructive: false
  });

  const [notification, setNotification] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'success' | 'error';
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'success'
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [payments, allUsers] = await Promise.all([
        PaymentService.getPendingPayments(),
        AuthService.getAllUsers()
      ]);
      setPendingPayments(payments);
      setUsers(allUsers);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const showConfirm = (title: string, message: string, onConfirm: () => void, confirmText = 'Confirm', isDestructive = false) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      },
      confirmText,
      isDestructive
    });
  };

  const showNotification = (title: string, message: string, type: 'success' | 'error' = 'success') => {
    setNotification({
      isOpen: true,
      title,
      message,
      type
    });
  };

  const handleApprove = async (payment: ManualPayment) => {
    showConfirm(
      'Approve Manual Payment',
      `Are you sure you want to APPROVE the manual payment for ${payment.userName || 'this user'}'s ${payment.planId} Tier subscription? This will activate their premium privileges and mark them as verified.`,
      async () => {
        try {
          await PaymentService.approveManualPayment(payment.id, payment.userId, payment.planId);
          showNotification('Payment Approved', `The subscription for ${payment.userName || 'the user'} has been successfully approved.`, 'success');
          fetchData();
        } catch (err) {
          showNotification('Error', 'Failed to approve manual payment.', 'error');
        }
      },
      'Approve',
      false
    );
  };

  const handleDisapprove = async (payment: ManualPayment) => {
    showConfirm(
      'Disapprove Manual Payment',
      `Are you sure you want to DISAPPROVE the manual payment for ${payment.userName || 'this user'}'s ${payment.planId} Tier subscription? This will reject their request.`,
      async () => {
        try {
          await PaymentService.disapproveManualPayment(payment.id, payment.userId, payment.planId);
          showNotification('Payment Disapproved', 'The manual payment has been rejected and the user has been notified.', 'success');
          fetchData();
        } catch (err) {
          showNotification('Error', 'Failed to disapprove payment.', 'error');
        }
      },
      'Disapprove',
      true
    );
  };
  
  const handleUpgrade = async (user: UserProfile, tier: 'Silver' | 'Gold' | 'Platinum') => {
    showConfirm(
      'Upgrade User Subscription',
      `Are you sure you want to upgrade ${user.name} to the ${tier} Tier? This will extend their premium benefits for 30 days.`,
      async () => {
        try {
          await AuthService.upgradeUserSubscription(user.uid, tier);

          // Create status change notification for the doctor/clinic
          try {
            await NotificationService.createNotification({
              userId: user.uid,
              senderId: 'admin',
              senderName: 'Admin Team',
              type: 'status_change',
              targetId: user.uid,
              targetType: 'appointment',
              message: `Your VetAxis subscription has been upgraded to ${tier} Tier by the admin! Your premium privileges are now fully active.`
            });
          } catch (notifErr) {
            console.error('Failed to send notification for manual upgrade:', notifErr);
          }

          showNotification('User Upgraded', `${user.name} has been successfully upgraded to ${tier} Tier!`, 'success');
          fetchData();
        } catch (err) {
          showNotification('Error', 'Failed to upgrade user subscription.', 'error');
        }
      },
      'Upgrade',
      false
    );
  };

  if (currentUser.email !== 'saliskhan214@gmail.com') return <div className="p-8 text-center text-red-600">Access Denied</div>;

  return (
    <div className="space-y-8 p-6">
      <h1 className="text-3xl font-bold">Admin Panel</h1>
      
      <section>
        <h2 className="text-xl font-bold mb-4">Pending Manual Payments</h2>
        <div className="bg-white border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-stone-50 border-b">
              <tr>
                <th className="p-3 text-left">User</th>
                <th className="p-3 text-left">Plan</th>
                <th className="p-3 text-left">Transaction ID</th>
                <th className="p-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pendingPayments.map(p => (
                <tr key={p.id} className="border-b">
                  <td className="p-3">
                    <div className="font-bold">{p.userName || 'Clinic / Doctor'}</div>
                    <div className="text-xs text-stone-500">{p.userEmail}</div>
                  </td>
                  <td className="p-3 font-semibold">{p.planId}</td>
                  <td className="p-3 font-mono">{p.transactionId}</td>
                  <td className="p-3 flex items-center gap-2">
                    <button 
                      onClick={() => handleApprove(p)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1 rounded text-xs transition-colors"
                    >
                      Approve
                    </button>
                    <button 
                      onClick={() => handleDisapprove(p)}
                      className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs transition-colors"
                    >
                      Disapprove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      
      <section>
        <h2 className="text-xl font-bold mb-4">Manage Users</h2>
        <input 
            type="text" 
            placeholder="Search by name" 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)}
            className="p-2 border rounded mb-4"
        />
        <div className="bg-white border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-stone-50 border-b">
              <tr>
                <th className="p-3 text-left">Name</th>
                <th className="p-3 text-left">Email</th>
                <th className="p-3 text-left">Current Tier</th>
                <th className="p-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users
                .filter(u => u && (u.role === 'clinic' || u.role === 'doctor') && (u.name || '').toLowerCase().includes(searchTerm.toLowerCase()))
                .map(u => (
                  <tr key={u.uid} className="border-b">
                    <td className="p-3">
                      <div className="font-bold text-stone-800">{u.name}</div>
                      <span className="text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200">
                        {u.role}
                      </span>
                    </td>
                    <td className="p-3 text-stone-600 text-sm">{u.email}</td>
                    <td className="p-3">
                      {u.subscriptionTier ? (
                        <span className={`inline-flex items-center gap-1 text-xs font-black px-2.5 py-0.5 rounded-full border shadow-sm ${
                          u.subscriptionTier === 'Platinum' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                          u.subscriptionTier === 'Gold' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          'bg-slate-50 text-slate-700 border-slate-200'
                        }`}>
                          ⭐ {u.subscriptionTier}
                        </span>
                      ) : (
                        <span className="text-xs font-semibold text-stone-400">None</span>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1.5">
                        <button 
                          onClick={() => handleUpgrade(u, 'Silver')} 
                          className={`text-xs px-2.5 py-1 rounded-md font-extrabold transition-all border ${
                            u.subscriptionTier === 'Silver' 
                              ? 'bg-slate-500 text-white border-slate-600 shadow-sm font-black' 
                              : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100 hover:border-stone-300'
                          }`}
                        >
                          Silver
                        </button>
                        <button 
                          onClick={() => handleUpgrade(u, 'Gold')} 
                          className={`text-xs px-2.5 py-1 rounded-md font-extrabold transition-all border ${
                            u.subscriptionTier === 'Gold' 
                              ? 'bg-amber-500 text-[#3c3c3b] border-amber-600 shadow-sm font-black' 
                              : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100 hover:border-stone-300'
                          }`}
                        >
                          Gold
                        </button>
                        <button 
                          onClick={() => handleUpgrade(u, 'Platinum')} 
                          className={`text-xs px-2.5 py-1 rounded-md font-extrabold transition-all border ${
                            u.subscriptionTier === 'Platinum' 
                              ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm font-black' 
                              : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100 hover:border-stone-300'
                          }`}
                        >
                          Platinum
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Confirmation Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-stone-200 overflow-hidden transform transition-all">
            <div className="p-6">
              <h3 className="text-lg font-bold text-stone-900 mb-2">{confirmModal.title}</h3>
              <p className="text-sm text-stone-600 leading-relaxed">{confirmModal.message}</p>
            </div>
            <div className="bg-stone-50 px-6 py-4 flex justify-end gap-3 border-t border-stone-100">
              <button
                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 text-sm font-semibold text-stone-600 hover:text-stone-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmModal.onConfirm}
                className={`px-4 py-2 text-sm font-bold text-white rounded-lg shadow-sm transition-all ${
                  confirmModal.isDestructive
                    ? 'bg-red-600 hover:bg-red-700 active:scale-[0.98]'
                    : 'bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98]'
                }`}
              >
                {confirmModal.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Alert/Notification Modal */}
      {notification.isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-stone-200 overflow-hidden transform transition-all">
            <div className="p-6 flex flex-col items-center text-center">
              {notification.type === 'success' ? (
                <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4 border border-emerald-100">
                  <CheckCircle className="w-6 h-6" />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mb-4 border border-red-100">
                  <XCircle className="w-6 h-6" />
                </div>
              )}
              <h3 className="text-lg font-bold text-stone-900 mb-2">{notification.title}</h3>
              <p className="text-sm text-stone-600 leading-relaxed mb-6">{notification.message}</p>
              <button
                onClick={() => setNotification(prev => ({ ...prev, isOpen: false }))}
                className="w-full py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-lg font-semibold text-sm transition-all active:scale-[0.98]"
              >
                Okay
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
