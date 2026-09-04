import React, { useState, useEffect, useMemo } from 'react';
import { UserProfile, UserRole, ManualPayment, LivestockFarm, JobPost } from '../types';
import { PaymentService, AuthService, NotificationService, PromotionalAdsService, AdminService, JobBoardService } from '../lib/storage';
import {
  Loader2,
  CheckCircle,
  XCircle,
  Search,
  Users,
  ShieldCheck,
  ShieldAlert,
  ArrowRightLeft,
  Building2,
  Stethoscope,
  Sparkles,
  RefreshCw,
  Filter,
  Check,
  Award,
  AlertTriangle,
  UserCheck,
  UserX,
  Briefcase,
  Layers,
  ChevronRight,
  Info,
  Clock,
  MapPin,
  DollarSign,
  FileText,
  Radio
} from 'lucide-react';
import { AdminBroadcastManager } from './AdminBroadcastManager';

interface AdminPanelProps {
  currentUser: UserProfile;
}

type AdminTab = 'users' | 'farms' | 'payments' | 'ads' | 'jobs' | 'broadcasts';

export function AdminPanel({ currentUser }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>('users');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [farms, setFarms] = useState<LivestockFarm[]>([]);
  const [pendingPayments, setPendingPayments] = useState<ManualPayment[]>([]);
  const [promotionalAds, setPromotionalAds] = useState<any[]>([]);
  const [jobs, setJobs] = useState<JobPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Search & Filters for Users
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');
  const [tierFilter, setTierFilter] = useState<'all' | 'subscribed' | 'general'>('all');

  // Search for Farms
  const [farmSearchTerm, setFarmSearchTerm] = useState('');

  // Search & Filters for Jobs
  const [jobSearchTerm, setJobSearchTerm] = useState('');
  const [jobStatusFilter, setJobStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [rejectJobModal, setRejectJobModal] = useState<{
    isOpen: boolean;
    job: JobPost | null;
    reason: string;
    isSubmitting: boolean;
  }>({
    isOpen: false,
    job: null,
    reason: '',
    isSubmitting: false
  });

  const [nowState, setNowState] = useState<number>(Date.now());

  // Role Modification Modal State
  const [roleModalUser, setRoleModalUser] = useState<UserProfile | null>(null);
  const [targetRole, setTargetRole] = useState<UserRole>('doctor');
  const [revokeSubs, setRevokeSubs] = useState<boolean>(true);
  const [revokeVerif, setRevokeVerif] = useState<boolean>(true);
  const [deactivateAds, setDeactivateAds] = useState<boolean>(true);
  const [roleChangeReason, setRoleChangeReason] = useState<string>('');
  const [isProcessingRole, setIsProcessingRole] = useState<boolean>(false);

  // Farm Reassign Owner Modal State
  const [reassignFarm, setReassignFarm] = useState<LivestockFarm | null>(null);
  const [selectedNewOwner, setSelectedNewOwner] = useState<UserProfile | null>(null);
  const [ownerSearchQuery, setOwnerSearchQuery] = useState<string>('');
  const [reassignOwnerReason, setReassignOwnerReason] = useState<string>('');
  const [isProcessingFarmOwner, setIsProcessingFarmOwner] = useState<boolean>(false);

  // Farm Reassign Manager (Vet) Modal State
  const [managerFarm, setManagerFarm] = useState<LivestockFarm | null>(null);
  const [selectedNewManager, setSelectedNewManager] = useState<UserProfile | null>(null);
  const [managerSearchQuery, setManagerSearchQuery] = useState<string>('');
  const [reassignManagerReason, setReassignManagerReason] = useState<string>('');
  const [isProcessingFarmManager, setIsProcessingFarmManager] = useState<boolean>(false);

  // Clinic Profile Handover Modal State
  const [clinicMigrateSource, setClinicMigrateSource] = useState<UserProfile | null>(null);
  const [clinicMigrateTarget, setClinicMigrateTarget] = useState<UserProfile | null>(null);
  const [clinicMigrateQuery, setClinicMigrateQuery] = useState<string>('');
  const [isProcessingClinicMigrate, setIsProcessingClinicMigrate] = useState<boolean>(false);

  // General Confirmation Modal
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

  // Alert/Notification Modal
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
    const timer = setInterval(() => {
      setNowState(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [payments, allUsers, ads, allFarms, allJobs] = await Promise.all([
        PaymentService.getPendingPayments().catch(() => []),
        AdminService.getAllUsers().catch(() => []),
        PromotionalAdsService.fetchActiveAds(false).catch(() => []),
        AdminService.getAllFarms().catch(() => []),
        JobBoardService.fetchJobs().catch(() => [])
      ]);
      setPendingPayments(payments);
      setUsers(allUsers);
      setPromotionalAds(ads);
      setFarms(allFarms);
      setJobs(allJobs);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleManualRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const formatCountdown = (expiryTime: number, now: number) => {
    const diffTime = expiryTime - now;
    if (diffTime <= 0) return 'Expired';

    const days = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffTime / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diffTime / (1000 * 60)) % 60);
    const seconds = Math.floor((diffTime / 1000) % 60);

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0 || days > 0) parts.push(`${hours}h`);
    if (minutes > 0 || hours > 0 || days > 0) parts.push(`${minutes}m`);
    parts.push(`${seconds}s`);

    return parts.join(' ');
  };

  const showConfirm = (
    title: string,
    message: string,
    onConfirm: () => void,
    confirmText = 'Confirm',
    isDestructive = false
  ) => {
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

  // Open Role Modification Modal
  const handleOpenRoleModal = (user: UserProfile) => {
    setRoleModalUser(user);
    setTargetRole(user.role || 'user');
    // Pre-check revocation if user is currently a doctor/clinic
    const isClinician = user.role === 'doctor' || user.role === 'clinic';
    setRevokeSubs(isClinician);
    setRevokeVerif(isClinician);
    setDeactivateAds(isClinician);
    setRoleChangeReason('');
  };

  // Execute Role Modification
  const handleConfirmRoleChange = async () => {
    if (!roleModalUser) return;
    setIsProcessingRole(true);

    try {
      const success = await AdminService.modifyUserRole(roleModalUser.uid, targetRole, {
        revokeSubscriptions: revokeSubs,
        revokeVerification: revokeVerif,
        deactivateBillboardAds: deactivateAds,
        reason: roleChangeReason,
        adminName: currentUser.name || 'System Admin'
      });

      if (success) {
        showNotification(
          'Role Reassigned Successfully',
          `User ${roleModalUser.name} has been updated to role "${targetRole.toUpperCase()}". ${revokeSubs ? 'Active subscriptions and directory privileges have been revoked.' : ''}`,
          'success'
        );
        setRoleModalUser(null);
        fetchData();
      } else {
        showNotification('Update Failed', 'Could not update user role. Please try again.', 'error');
      }
    } catch (err) {
      console.error('Error changing user role:', err);
      showNotification('Error', 'An unexpected error occurred while modifying role.', 'error');
    } finally {
      setIsProcessingRole(false);
    }
  };

  // Direct Verification Badge Toggle
  const handleToggleVerification = async (user: UserProfile) => {
    const nextState = !user.isVerified;
    showConfirm(
      nextState ? 'Verify Practitioner' : 'Revoke Verification',
      nextState
        ? `Are you sure you want to GRANT official Medical Board verification checkmark to ${user.name}? This will mark their profile as trusted in public directories.`
        : `Are you sure you want to REVOKE the verification checkmark from ${user.name}?`,
      async () => {
        try {
          await AdminService.toggleUserVerification(user.uid, nextState, currentUser.name);
          showNotification(
            nextState ? 'Verification Granted' : 'Verification Revoked',
            `${user.name}'s verification status has been updated.`,
            'success'
          );
          fetchData();
        } catch (err) {
          showNotification('Error', 'Failed to update verification status.', 'error');
        }
      },
      nextState ? 'Grant Verification' : 'Revoke',
      !nextState
    );
  };

  // Reassign Farm Owner
  const handleConfirmFarmOwnerReassign = async () => {
    if (!reassignFarm || !selectedNewOwner) return;
    setIsProcessingFarmOwner(true);

    try {
      const success = await AdminService.reassignFarmOwner(reassignFarm.id, selectedNewOwner, {
        reason: reassignOwnerReason,
        adminName: currentUser.name
      });

      if (success) {
        showNotification(
          'Farm Ownership Reassigned',
          `Farm "${reassignFarm.name}" (ID: ${reassignFarm.id}) ownership has been successfully transferred to ${selectedNewOwner.name} (${selectedNewOwner.email}).`,
          'success'
        );
        setReassignFarm(null);
        setSelectedNewOwner(null);
        setOwnerSearchQuery('');
        fetchData();
      } else {
        showNotification('Transfer Failed', 'Failed to reassign farm ownership.', 'error');
      }
    } catch (err) {
      showNotification('Error', 'Unexpected error reassigning farm ownership.', 'error');
    } finally {
      setIsProcessingFarmOwner(false);
    }
  };

  // Reassign Farm Manager / Vet
  const handleConfirmFarmManagerReassign = async () => {
    if (!managerFarm) return;
    setIsProcessingFarmManager(true);

    try {
      const success = await AdminService.reassignFarmManager(managerFarm.id, selectedNewManager, {
        reason: reassignManagerReason,
        adminName: currentUser.name
      });

      if (success) {
        showNotification(
          'Veterinary Manager Updated',
          selectedNewManager
            ? `Dr. / Clinic ${selectedNewManager.name} has been appointed as the official Veterinary Manager for farm "${managerFarm.name}".`
            : `Veterinary manager has been unlinked from farm "${managerFarm.name}".`,
          'success'
        );
        setManagerFarm(null);
        setSelectedNewManager(null);
        setManagerSearchQuery('');
        fetchData();
      } else {
        showNotification('Update Failed', 'Failed to update farm manager.', 'error');
      }
    } catch (err) {
      showNotification('Error', 'Unexpected error updating farm manager.', 'error');
    } finally {
      setIsProcessingFarmManager(false);
    }
  };

  // Clinic Profile Handover
  const handleConfirmClinicMigrate = async () => {
    if (!clinicMigrateSource || !clinicMigrateTarget) return;
    setIsProcessingClinicMigrate(true);

    try {
      const res = await AdminService.transferClinicData(clinicMigrateSource.uid, clinicMigrateTarget, {
        adminName: currentUser.name
      });

      showNotification(
        'Clinic Handover Complete',
        `Successfully transferred ${res.jobsMigrated} job postings and ${res.applicationsMigrated} applicant files from ${clinicMigrateSource.name} to ${clinicMigrateTarget.name}.`,
        'success'
      );
      setClinicMigrateSource(null);
      setClinicMigrateTarget(null);
      setClinicMigrateQuery('');
      fetchData();
    } catch (err) {
      showNotification('Migration Error', 'Failed to complete clinic data handover.', 'error');
    } finally {
      setIsProcessingClinicMigrate(false);
    }
  };

  // Subscription Upgrades / Downgrades
  const handleUpgrade = async (user: UserProfile, tier: 'Silver' | 'Gold' | 'Platinum' | 'General') => {
    const isGeneral = tier === 'General';
    showConfirm(
      isGeneral ? 'Downgrade User Subscription' : 'Upgrade User Subscription',
      isGeneral
        ? `Are you sure you want to downgrade ${user.name} to General / Not Subscribed status? This will immediately remove their premium privileges.`
        : `Are you sure you want to upgrade ${user.name} to the ${tier} Tier? This will extend their premium benefits for 30 days.`,
      async () => {
        try {
          await AuthService.upgradeUserSubscription(user.uid, tier);
          try {
            await NotificationService.createNotification({
              userId: user.uid,
              senderId: 'admin',
              senderName: 'Admin Team',
              type: 'status_change',
              targetId: user.uid,
              targetType: 'appointment',
              message: isGeneral
                ? `Your VetAxis subscription has been set to General (Not Subscribed) by the admin.`
                : `Your VetAxis subscription has been upgraded to ${tier} Tier by the admin! Your premium privileges are now fully active.`
            });
          } catch (notifErr) {
            console.error('Failed to send notification for manual upgrade:', notifErr);
          }

          showNotification(
            isGeneral ? 'User Downgraded' : 'User Upgraded',
            isGeneral ? `${user.name} has been set to General status.` : `${user.name} has been successfully upgraded to ${tier} Tier!`,
            'success'
          );
          fetchData();
        } catch (err) {
          showNotification('Error', 'Failed to update user subscription.', 'error');
        }
      },
      isGeneral ? 'Downgrade' : 'Upgrade',
      isGeneral
    );
  };

  // Manual Payments Approve/Disapprove
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

  // Promotional Ads Approve/Reject
  const handleApproveAd = async (ad: any) => {
    showConfirm(
      'Approve Promotional Ad',
      `Are you sure you want to APPROVE the promotional ad "${ad.title}" sponsored by ${ad.sponsorName}? This will make it live instantly on the billboard rotating feeds.`,
      async () => {
        try {
          await PromotionalAdsService.approveAd(ad.id, ad.ownerUid, ad.title);
          showNotification('Ad Approved', `The promotional ad "${ad.title}" has been successfully approved and is now live!`, 'success');
          fetchData();
        } catch (err) {
          showNotification('Error', 'Failed to approve promotional ad.', 'error');
        }
      },
      'Approve',
      false
    );
  };

  const handleRejectAd = async (ad: any) => {
    showConfirm(
      'Reject Promotional Ad',
      `Are you sure you want to DISAPPROVE the promotional ad "${ad.title}" sponsored by ${ad.sponsorName}? This will mark it as rejected.`,
      async () => {
        try {
          await PromotionalAdsService.rejectAd(ad.id, ad.ownerUid, ad.title);
          showNotification('Ad Disapproved', `The promotional ad "${ad.title}" has been rejected.`, 'success');
          fetchData();
        } catch (err) {
          showNotification('Error', 'Failed to reject promotional ad.', 'error');
        }
      },
      'Disapprove',
      true
    );
  };

  // Job Approvals & Actions
  const handleApproveJob = async (job: JobPost) => {
    showConfirm(
      'Approve Job Listing',
      `Are you sure you want to APPROVE the job posting "${job.title}" posted by ${job.clinicName}? It will become immediately visible to all candidates across Pakistan.`,
      async () => {
        try {
          await JobBoardService.approveJob(job.id, currentUser, job.title, job.clinicId);
          showNotification('Job Approved', `"${job.title}" is now active and live on the Careers Board.`, 'success');
          fetchData();
        } catch (err) {
          showNotification('Error', 'Failed to approve job posting.', 'error');
        }
      },
      'Approve & Publish',
      false
    );
  };

  const handleOpenRejectJobModal = (job: JobPost) => {
    setRejectJobModal({
      isOpen: true,
      job,
      reason: 'Job details do not meet our verification standards or incomplete requirements provided.',
      isSubmitting: false
    });
  };

  const handleConfirmRejectJob = async () => {
    if (!rejectJobModal.job) return;
    setRejectJobModal(prev => ({ ...prev, isSubmitting: true }));
    try {
      await JobBoardService.rejectJob(
        rejectJobModal.job.id,
        rejectJobModal.reason,
        currentUser,
        rejectJobModal.job.title,
        rejectJobModal.job.clinicId
      );
      showNotification('Job Rejected', `"${rejectJobModal.job.title}" has been rejected and the employer has been notified.`, 'success');
      setRejectJobModal({ isOpen: false, job: null, reason: '', isSubmitting: false });
      fetchData();
    } catch (err) {
      showNotification('Error', 'Failed to reject job posting.', 'error');
      setRejectJobModal(prev => ({ ...prev, isSubmitting: false }));
    }
  };

  const handleDeleteJobPostAdmin = async (job: JobPost) => {
    showConfirm(
      'Delete Job Listing Permanently',
      `Are you sure you want to PERMANENTLY DELETE the job ad "${job.title}"? This cannot be undone.`,
      async () => {
        try {
          await JobBoardService.deleteJob(job.id);
          showNotification('Job Deleted', `"${job.title}" has been deleted from the database.`, 'success');
          fetchData();
        } catch (err) {
          showNotification('Error', 'Failed to delete job posting.', 'error');
        }
      },
      'Delete Permanently',
      true
    );
  };

  // Filtered Jobs list
  const filteredJobs = useMemo(() => {
    return jobs.filter(j => {
      if (!j) return false;
      const queryStr = jobSearchTerm.toLowerCase().trim();
      const matchesSearch =
        !queryStr ||
        (j.title || '').toLowerCase().includes(queryStr) ||
        (j.clinicName || '').toLowerCase().includes(queryStr) ||
        (j.clinicEmail || '').toLowerCase().includes(queryStr) ||
        (j.location || '').toLowerCase().includes(queryStr);

      const status = j.approvalStatus || (j.status === 'open' ? 'approved' : 'pending');
      const matchesStatus =
        jobStatusFilter === 'all' ||
        (jobStatusFilter === 'pending' && (j.approvalStatus === 'pending' || (!j.approvalStatus && j.status === 'open' && j.posterRole === 'user'))) ||
        (jobStatusFilter === 'approved' && (j.approvalStatus === 'approved' || (!j.approvalStatus && j.status === 'open' && j.posterRole !== 'user'))) ||
        (jobStatusFilter === 'rejected' && j.approvalStatus === 'rejected');

      return matchesSearch && matchesStatus;
    });
  }, [jobs, jobSearchTerm, jobStatusFilter]);

  // Filtered Users list
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      if (!u) return false;
      // Search term
      const queryStr = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !queryStr ||
        (u.name || '').toLowerCase().includes(queryStr) ||
        (u.email || '').toLowerCase().includes(queryStr) ||
        (u.phone || '').toLowerCase().includes(queryStr) ||
        (u.uid || '').toLowerCase().includes(queryStr);

      // Role filter
      const matchesRole = roleFilter === 'all' || u.role === roleFilter;

      // Tier filter
      const matchesTier =
        tierFilter === 'all' ||
        (tierFilter === 'subscribed' && (u.subscriptionTier === 'Silver' || u.subscriptionTier === 'Gold' || u.subscriptionTier === 'Platinum')) ||
        (tierFilter === 'general' && !u.subscriptionTier);

      return matchesSearch && matchesRole && matchesTier;
    });
  }, [users, searchTerm, roleFilter, tierFilter]);

  // Filtered Farms list
  const filteredFarms = useMemo(() => {
    return farms.filter(f => {
      if (!f) return false;
      const queryStr = farmSearchTerm.toLowerCase().trim();
      return (
        !queryStr ||
        (f.name || '').toLowerCase().includes(queryStr) ||
        (f.location || '').toLowerCase().includes(queryStr) ||
        (f.farmType || '').toLowerCase().includes(queryStr) ||
        (f.ownerName || '').toLowerCase().includes(queryStr) ||
        (f.ownerEmail || '').toLowerCase().includes(queryStr) ||
        (f.managerName || '').toLowerCase().includes(queryStr) ||
        (f.id || '').toLowerCase().includes(queryStr)
      );
    });
  }, [farms, farmSearchTerm]);

  // Overview Counts
  const stats = useMemo(() => {
    const pendingJobs = jobs.filter(j => j.approvalStatus === 'pending' || (!j.approvalStatus && j.status === 'open' && j.posterRole === 'user')).length;
    return {
      totalUsers: users.length,
      doctors: users.filter(u => u.role === 'doctor').length,
      clinics: users.filter(u => u.role === 'clinic').length,
      assistants: users.filter(u => u.role === 'assistant').length,
      farmers: users.filter(u => u.role === 'user').length,
      subscribed: users.filter(u => u.subscriptionTier && u.subscriptionTier !== 'General' as any).length,
      verified: users.filter(u => u.isVerified).length,
      farmsCount: farms.length,
      pendingPaymentsCount: pendingPayments.length,
      pendingAdsCount: promotionalAds.filter(a => a.status === 'pending' || !a.status).length,
      jobsCount: jobs.length,
      pendingJobsCount: pendingJobs
    };
  }, [users, farms, pendingPayments, promotionalAds, jobs]);

  const isSystemAdmin = currentUser.email?.toLowerCase() === 'vetaxis360@gmail.com' || currentUser.email === 'saliskhan214@gmail.com' || currentUser.isAdmin;

  if (!isSystemAdmin) {
    return (
      <div className="p-12 text-center max-w-md mx-auto my-12 bg-white rounded-2xl border border-red-100 shadow-sm">
        <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-stone-900">Access Restricted</h2>
        <p className="text-sm text-stone-600 mt-2">
          This administration dashboard requires verified system administrator privileges.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-8 max-w-7xl mx-auto">
      {/* Header & Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-stone-200 shadow-xs">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-stone-900 text-white rounded-xl shadow-xs">
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">Admin Control Panel</h1>
              <p className="text-xs sm:text-sm text-stone-500 font-medium mt-0.5">
                Manage roles, resolve unauthorized registrations, reassign farm/clinic ownership, verify jobs, and approve payments.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleManualRefresh}
            disabled={refreshing || loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-xs active:scale-95"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh Data
          </button>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs">
          <div className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">Total Accounts</div>
          <div className="text-2xl font-black text-stone-900 mt-1">{stats.totalUsers}</div>
          <div className="text-[10px] text-stone-500 mt-0.5">{stats.verified} verified</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs">
          <div className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">Doctors</div>
          <div className="text-2xl font-black text-blue-900 mt-1">{stats.doctors}</div>
          <div className="text-[10px] text-blue-500 mt-0.5">Veterinarians</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs">
          <div className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">Clinics</div>
          <div className="text-2xl font-black text-indigo-900 mt-1">{stats.clinics}</div>
          <div className="text-[10px] text-indigo-500 mt-0.5">Hospital centres</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs">
          <div className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Farms / Owners</div>
          <div className="text-2xl font-black text-emerald-900 mt-1">{stats.farmsCount}</div>
          <div className="text-[10px] text-emerald-500 mt-0.5">{stats.farmers} farmer accounts</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs">
          <div className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">Jobs Queue</div>
          <div className="text-2xl font-black text-amber-900 mt-1">{stats.jobsCount}</div>
          <div className="text-[10px] text-amber-600 font-bold mt-0.5">{stats.pendingJobsCount} pending review</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs">
          <div className="text-[11px] font-bold text-purple-600 uppercase tracking-wider">Action Queue</div>
          <div className="text-2xl font-black text-purple-900 mt-1">{stats.pendingPaymentsCount + stats.pendingAdsCount + stats.pendingJobsCount}</div>
          <div className="text-[10px] text-purple-500 mt-0.5">Payments, Ads & Jobs</div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-stone-200 gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-black whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'users'
              ? 'bg-stone-900 text-white shadow-xs'
              : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
          }`}
        >
          <Users className="w-4 h-4" />
          User Roles & Accounts ({filteredUsers.length})
        </button>
        <button
          onClick={() => setActiveTab('farms')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-black whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'farms'
              ? 'bg-stone-900 text-white shadow-xs'
              : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
          }`}
        >
          <Building2 className="w-4 h-4" />
          Farms & Ownership ({farms.length})
        </button>
        <button
          onClick={() => setActiveTab('jobs')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-black whitespace-nowrap transition-all cursor-pointer relative ${
            activeTab === 'jobs'
              ? 'bg-stone-900 text-white shadow-xs'
              : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
          }`}
        >
          <Briefcase className="w-4 h-4" />
          Job & Farm Vacancies ({jobs.length})
          {stats.pendingJobsCount > 0 && (
            <span className="ml-1 px-1.5 py-0.2 bg-amber-500 text-white text-[10px] font-black rounded-full animate-pulse">
              {stats.pendingJobsCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('payments')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-black whitespace-nowrap transition-all cursor-pointer relative ${
            activeTab === 'payments'
              ? 'bg-stone-900 text-white shadow-xs'
              : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
          }`}
        >
          <Award className="w-4 h-4" />
          Pending Payments
          {stats.pendingPaymentsCount > 0 && (
            <span className="ml-1 px-1.5 py-0.2 bg-amber-500 text-white text-[10px] font-black rounded-full">
              {stats.pendingPaymentsCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('ads')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-black whitespace-nowrap transition-all cursor-pointer relative ${
            activeTab === 'ads'
              ? 'bg-stone-900 text-white shadow-xs'
              : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          Billboard Ads
          {stats.pendingAdsCount > 0 && (
            <span className="ml-1 px-1.5 py-0.2 bg-purple-500 text-white text-[10px] font-black rounded-full">
              {stats.pendingAdsCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('broadcasts')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-black whitespace-nowrap transition-all cursor-pointer relative ${
            activeTab === 'broadcasts'
              ? 'bg-stone-900 text-white shadow-xs'
              : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
          }`}
        >
          <Radio className="w-4 h-4 text-amber-500" />
          Broadcast Notifications
        </button>
      </div>

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* TAB 1: USERS & ROLE MANAGEMENT */}
      {/* ───────────────────────────────────────────────────────────────── */}
      {activeTab === 'users' && (
        <section className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
            {/* Search */}
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search name, email, phone, UID..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-stone-900"
              />
            </div>

            {/* Role Filter Buttons */}
            <div className="flex items-center gap-1.5 flex-wrap w-full md:w-auto">
              <span className="text-xs text-stone-400 font-bold uppercase mr-1">Role:</span>
              {(['all', 'doctor', 'clinic', 'assistant', 'user'] as const).map(r => (
                <button
                  key={r}
                  onClick={() => setRoleFilter(r)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer ${
                    roleFilter === r
                      ? 'bg-stone-900 text-white'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  {r === 'user' ? 'Farmer / User' : r}
                </button>
              ))}

              <div className="h-4 w-px bg-stone-200 mx-1 hidden sm:block" />

              <span className="text-xs text-stone-400 font-bold uppercase mr-1">Plan:</span>
              {(['all', 'subscribed', 'general'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTierFilter(t)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer ${
                    tierFilter === t
                      ? 'bg-indigo-600 text-white'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[950px] text-left">
                <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-bold text-xs uppercase tracking-wider">
                  <tr>
                    <th className="p-3.5">Account & Identity</th>
                    <th className="p-3.5">Assigned Role</th>
                    <th className="p-3.5">Verification</th>
                    <th className="p-3.5">Subscription Tier</th>
                    <th className="p-3.5">Time Remaining</th>
                    <th className="p-3.5 text-right">Role Reassignment & Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-sm">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="p-12 text-center text-stone-400">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-stone-500" />
                        Loading user accounts database...
                      </td>
                    </tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-12 text-center text-stone-400 font-bold">
                        No user accounts matched your search or filters.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map(u => (
                      <tr key={u.uid} className="hover:bg-stone-50/70 transition-colors">
                        {/* Account & Identity */}
                        <td className="p-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-stone-100 border border-stone-200 flex items-center justify-center font-bold text-stone-700 text-xs shrink-0">
                              {u.profilePic && u.profilePic !== 'default' && u.profilePic.startsWith('data:image') ? (
                                <img src={u.profilePic} alt={u.name} className="w-full h-full object-cover rounded-xl" />
                              ) : (
                                u.name ? u.name.charAt(0).toUpperCase() : 'U'
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-stone-900 flex items-center gap-1.5">
                                <span className="truncate">{u.name || 'Unnamed User'}</span>
                                {u.isVerified && (
                                  <CheckCircle className="w-3.5 h-3.5 text-blue-600 shrink-0" title="Verified Practitioner" />
                                )}
                              </div>
                              <div className="text-xs text-stone-500 font-mono truncate">{u.email}</div>
                              {u.phone && <div className="text-[10px] text-stone-400">{u.phone}</div>}
                            </div>
                          </div>
                        </td>

                        {/* Assigned Role */}
                        <td className="p-3.5">
                          <span
                            className={`inline-flex items-center gap-1 text-[11px] font-black uppercase px-2.5 py-1 rounded-full border ${
                              u.role === 'doctor'
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : u.role === 'clinic'
                                ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                : u.role === 'assistant'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}
                          >
                            {u.role === 'doctor' && '🩺 Doctor'}
                            {u.role === 'clinic' && '🏥 Clinic'}
                            {u.role === 'assistant' && '💉 Assistant'}
                            {u.role === 'user' && '🌾 Farmer / User'}
                          </span>
                        </td>

                        {/* Verification Checkmark */}
                        <td className="p-3.5">
                          <button
                            onClick={() => handleToggleVerification(u)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                              u.isVerified
                                ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-red-50 hover:text-red-700 hover:border-red-200'
                                : 'bg-stone-50 text-stone-500 border-stone-200 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200'
                            }`}
                            title={u.isVerified ? 'Click to Revoke Verification' : 'Click to Grant Verification'}
                          >
                            {u.isVerified ? (
                              <>
                                <CheckCircle className="w-3.5 h-3.5 text-blue-600" />
                                <span>Verified</span>
                              </>
                            ) : (
                              <>
                                <XCircle className="w-3.5 h-3.5 text-stone-400" />
                                <span>Unverified</span>
                              </>
                            )}
                          </button>
                        </td>

                        {/* Subscription Tier */}
                        <td className="p-3.5">
                          {u.subscriptionTier ? (
                            <span
                              className={`inline-flex items-center gap-1 text-xs font-black px-2.5 py-0.5 rounded-full border ${
                                u.subscriptionTier === 'Platinum'
                                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                  : u.subscriptionTier === 'Gold'
                                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                                  : 'bg-slate-50 text-slate-700 border-slate-200'
                              }`}
                            >
                              ⭐ {u.subscriptionTier}
                            </span>
                          ) : (
                            <span className="text-xs font-bold text-stone-400 bg-stone-50 px-2 py-0.5 rounded-md border border-stone-200">
                              General
                            </span>
                          )}
                        </td>

                        {/* Time Remaining */}
                        <td className="p-3.5 text-xs font-mono font-bold text-stone-700">
                          {u.subscriptionExpiresAt ? (
                            <span
                              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border ${
                                u.subscriptionExpiresAt - nowState < 24 * 60 * 60 * 1000
                                  ? 'bg-red-50 text-red-600 border-red-200 animate-pulse'
                                  : u.subscriptionExpiresAt - nowState < 7 * 24 * 60 * 60 * 1000
                                  ? 'bg-amber-50 text-amber-600 border-amber-200'
                                  : 'bg-emerald-50 text-emerald-600 border-emerald-200'
                              }`}
                            >
                              ⏱️ {formatCountdown(u.subscriptionExpiresAt, nowState)}
                            </span>
                          ) : (
                            <span className="text-stone-300">—</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="p-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5 flex-wrap">
                            <button
                              onClick={() => handleOpenRoleModal(u)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer transition-all active:scale-95"
                            >
                              <ArrowRightLeft className="w-3.5 h-3.5" />
                              Modify Role / Demote
                            </button>

                            {/* If clinic or doctor, quick tier buttons */}
                            {(u.role === 'clinic' || u.role === 'doctor') && (
                              <div className="flex items-center gap-1 bg-stone-100 p-0.5 rounded-lg border border-stone-200">
                                <button
                                  onClick={() => handleUpgrade(u, 'General')}
                                  className={`text-[10px] px-1.5 py-1 rounded font-bold transition-all ${
                                    !u.subscriptionTier ? 'bg-stone-600 text-white' : 'text-stone-600 hover:bg-stone-200'
                                  }`}
                                  title="Set General"
                                >
                                  Gen
                                </button>
                                <button
                                  onClick={() => handleUpgrade(u, 'Silver')}
                                  className={`text-[10px] px-1.5 py-1 rounded font-bold transition-all ${
                                    u.subscriptionTier === 'Silver' ? 'bg-slate-600 text-white' : 'text-stone-600 hover:bg-stone-200'
                                  }`}
                                  title="Upgrade Silver"
                                >
                                  Silv
                                </button>
                                <button
                                  onClick={() => handleUpgrade(u, 'Gold')}
                                  className={`text-[10px] px-1.5 py-1 rounded font-bold transition-all ${
                                    u.subscriptionTier === 'Gold' ? 'bg-amber-600 text-white' : 'text-stone-600 hover:bg-stone-200'
                                  }`}
                                  title="Upgrade Gold"
                                >
                                  Gold
                                </button>
                                <button
                                  onClick={() => handleUpgrade(u, 'Platinum')}
                                  className={`text-[10px] px-1.5 py-1 rounded font-bold transition-all ${
                                    u.subscriptionTier === 'Platinum' ? 'bg-indigo-600 text-white' : 'text-stone-600 hover:bg-stone-200'
                                  }`}
                                  title="Upgrade Platinum"
                                >
                                  Plat
                                </button>
                              </div>
                            )}

                            {/* If user is clinic, allow clinic data migration */}
                            {u.role === 'clinic' && (
                              <button
                                onClick={() => {
                                  setClinicMigrateSource(u);
                                  setClinicMigrateTarget(null);
                                  setClinicMigrateQuery('');
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-bold border border-blue-200 cursor-pointer"
                                title="Migrate Job Posts and clinic data to genuine practitioner"
                              >
                                <Briefcase className="w-3.5 h-3.5" />
                                Handover Data
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* TAB 2: FARMS & OWNERSHIP REASSIGNMENT */}
      {/* ───────────────────────────────────────────────────────────────── */}
      {activeTab === 'farms' && (
        <section className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search farm name, location, owner, manager..."
                value={farmSearchTerm}
                onChange={e => setFarmSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-stone-900"
              />
            </div>
            <div className="text-xs text-stone-500 font-bold">
              Showing {filteredFarms.length} of {farms.length} registered farms
            </div>
          </div>

          <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[950px] text-left">
                <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-bold text-xs uppercase tracking-wider">
                  <tr>
                    <th className="p-3.5">Farm Identity</th>
                    <th className="p-3.5">Location & Type</th>
                    <th className="p-3.5">Current Owner</th>
                    <th className="p-3.5">Assigned Vet Manager</th>
                    <th className="p-3.5 text-right">Ownership & Manager Controls</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-sm">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="p-12 text-center text-stone-400">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-stone-500" />
                        Loading farms database...
                      </td>
                    </tr>
                  ) : filteredFarms.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-12 text-center text-stone-400 font-bold">
                        No livestock farms found.
                      </td>
                    </tr>
                  ) : (
                    filteredFarms.map(f => (
                      <tr key={f.id} className="hover:bg-stone-50/70 transition-colors">
                        <td className="p-3.5">
                          <div className="font-bold text-stone-900 text-sm">{f.name}</div>
                          <div className="text-[11px] font-mono text-stone-400 mt-0.5">ID: {f.id}</div>
                        </td>
                        <td className="p-3.5">
                          <span className="inline-block bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-md text-xs font-bold">
                            {f.farmType}
                          </span>
                          <div className="text-xs text-stone-500 mt-1">{f.location}</div>
                        </td>
                        <td className="p-3.5">
                          <div className="font-bold text-stone-900 text-xs">{f.ownerName || 'Unknown Owner'}</div>
                          <div className="text-xs text-stone-500 font-mono">{f.ownerEmail}</div>
                          <div className="text-[10px] text-stone-400 font-mono">UID: {f.ownerUid || f.ownerId}</div>
                        </td>
                        <td className="p-3.5">
                          {f.managerUid ? (
                            <div>
                              <div className="font-bold text-blue-900 text-xs flex items-center gap-1">
                                <Stethoscope className="w-3.5 h-3.5 text-blue-600" />
                                {f.managerName || 'Assigned Doctor'}
                              </div>
                              <span
                                className={`inline-block text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md mt-1 ${
                                  f.managerStatus === 'linked'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : f.managerStatus === 'pending'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-red-100 text-red-800'
                                }`}
                              >
                                {f.managerStatus}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-stone-400 font-bold bg-stone-50 px-2 py-1 rounded-md border border-stone-200">
                              Unassigned
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                setReassignFarm(f);
                                setSelectedNewOwner(null);
                                setOwnerSearchQuery('');
                                setReassignOwnerReason('');
                              }}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer transition-all active:scale-95"
                            >
                              Transfer Owner
                            </button>
                            <button
                              onClick={() => {
                                setManagerFarm(f);
                                setSelectedNewManager(null);
                                setManagerSearchQuery('');
                                setReassignManagerReason('');
                              }}
                              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer transition-all active:scale-95"
                            >
                              Appoint / Change Vet
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* TAB 3: PENDING PAYMENTS */}
      {/* ───────────────────────────────────────────────────────────────── */}
      {activeTab === 'payments' && (
        <section className="space-y-4">
          <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="p-4 border-b border-stone-200 bg-stone-50/50 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-stone-900">Pending Manual Payment Approvals</h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Verify transaction receipts from Bank, JazzCash, or EasyPaisa before activating subscription tiers.
                </p>
              </div>
              <span className="text-xs font-bold bg-stone-200 text-stone-700 px-2.5 py-1 rounded-full">
                {pendingPayments.length} Pending
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left">
                <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-bold text-xs uppercase tracking-wider">
                  <tr>
                    <th className="p-3.5">User</th>
                    <th className="p-3.5">Requested Tier</th>
                    <th className="p-3.5">Payment Method</th>
                    <th className="p-3.5">Transaction ID</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-sm">
                  {pendingPayments.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-12 text-center text-stone-400 font-bold">
                        No manual subscription payments currently awaiting review.
                      </td>
                    </tr>
                  ) : (
                    pendingPayments.map(p => (
                      <tr key={p.id} className="hover:bg-stone-50/70">
                        <td className="p-3.5">
                          <div className="font-bold text-stone-900">{p.userName || 'Clinic / Doctor'}</div>
                          <div className="text-xs text-stone-500 font-mono">{p.userEmail}</div>
                        </td>
                        <td className="p-3.5">
                          <span className="font-black text-xs px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                            ⭐ {p.planId} Tier
                          </span>
                        </td>
                        <td className="p-3.5">
                          <span className="bg-[#fcf9f2] text-amber-800 border border-amber-200 px-2.5 py-1 rounded text-xs font-bold font-mono">
                            {p.paymentMethod || 'Card / Manual'}
                          </span>
                        </td>
                        <td className="p-3.5 font-mono text-xs font-bold text-stone-800">{p.transactionId}</td>
                        <td className="p-3.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleApprove(p)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors shadow-xs"
                            >
                              Approve & Activate
                            </button>
                            <button
                              onClick={() => handleDisapprove(p)}
                              className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors shadow-xs"
                            >
                              Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* TAB 4: BILLBOARD ADS */}
      {/* ───────────────────────────────────────────────────────────────── */}
      {activeTab === 'ads' && (
        <section className="space-y-4">
          <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="p-4 border-b border-stone-200 bg-stone-50/50 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-stone-900">Promotional Billboard Campaigns</h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Review campaigns submitted by doctors and clinics before publishing to the live rotating feed.
                </p>
              </div>
              <span className="text-xs font-bold bg-purple-100 text-purple-700 px-2.5 py-1 rounded-full border border-purple-200">
                {promotionalAds.length} Total Campaigns
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left">
                <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-bold text-xs uppercase tracking-wider">
                  <tr>
                    <th className="p-3.5">Sponsor & Campaign</th>
                    <th className="p-3.5">Plan & Duration</th>
                    <th className="p-3.5">Payment Applied</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right">Moderation Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-sm">
                  {promotionalAds.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-12 text-center text-stone-400 font-bold">
                        No promotional billboard ads registered in the database.
                      </td>
                    </tr>
                  ) : (
                    promotionalAds.map(ad => (
                      <tr key={ad.id} className="hover:bg-stone-50/70">
                        <td className="p-3.5">
                          <div className="flex items-start gap-2.5">
                            <span className="text-2xl select-none p-1 bg-stone-100 rounded-lg">{ad.icon || '🏥'}</span>
                            <div className="text-left">
                              <div className="font-serif font-black text-stone-900 text-sm leading-tight">{ad.title}</div>
                              <div className="text-xs text-stone-500 mt-0.5">
                                By: <span className="font-bold">{ad.sponsorName}</span> ({ad.ownerEmail})
                              </div>
                              <div className="text-[10px] text-stone-600 max-w-sm mt-1 bg-stone-50 p-2 rounded-lg border border-stone-200 font-semibold">
                                {ad.description}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="p-3.5">
                          <div className="text-xs font-black text-stone-850">{ad.durationDays} Days Duration</div>
                          <div className="text-[10px] text-stone-500 mt-0.5 font-bold">Rs. {ad.pricePaid} Paid</div>
                        </td>
                        <td className="p-3.5">
                          <span className="bg-[#fcf9f2] text-amber-800 border border-amber-200 px-2 py-0.5 rounded text-xs font-bold font-mono">
                            {ad.paymentMethod || 'Subscription Free Quota'}
                          </span>
                        </td>
                        <td className="p-3.5">
                          {ad.status === 'pending' || !ad.status ? (
                            <span className="bg-amber-100 text-amber-800 border border-amber-200 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase">
                              Pending Approval
                            </span>
                          ) : ad.status === 'rejected' ? (
                            <span className="bg-red-100 text-red-800 border border-red-200 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase">
                              Rejected
                            </span>
                          ) : (
                            <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase">
                              Live & Active
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 text-right">
                          {ad.status === 'pending' || !ad.status ? (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleApproveAd(ad)}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-xs cursor-pointer transition-colors"
                              >
                                Approve Live
                              </button>
                              <button
                                onClick={() => handleRejectAd(ad)}
                                className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-xs cursor-pointer transition-colors"
                              >
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span className="text-[10px] text-stone-400 font-extrabold uppercase bg-stone-100 border border-stone-200 px-2 py-0.5 rounded-md">
                              Processed
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* TAB 5: JOB & FARM VACANCY ADS APPROVALS */}
      {/* ───────────────────────────────────────────────────────────────── */}
      {activeTab === 'jobs' && (
        <section className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
          <div className="p-6 border-b border-stone-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-black text-stone-900 flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-amber-600" />
                  Job Vacancies & Farm Helper Postings Verification
                </h2>
                <p className="text-xs text-stone-500 mt-1">
                  Review and verify job openings posted by dairy farms, livestock stations, veterinary clinics, and individual pet owners across Pakistan before they become public.
                </p>
              </div>

              {/* Status Filter Chips */}
              <div className="flex items-center gap-1.5 bg-stone-100 p-1 rounded-xl flex-wrap">
                {(['all', 'pending', 'approved', 'rejected'] as const).map(filter => (
                  <button
                    key={filter}
                    onClick={() => setJobStatusFilter(filter)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black capitalize transition-all cursor-pointer ${
                      jobStatusFilter === filter
                        ? 'bg-white text-stone-900 shadow-xs'
                        : 'text-stone-500 hover:text-stone-900'
                    }`}
                  >
                    {filter === 'all' && `All (${jobs.length})`}
                    {filter === 'pending' && `Pending (${stats.pendingJobsCount})`}
                    {filter === 'approved' && `Approved (${jobs.filter(j => j.approvalStatus === 'approved' || (!j.approvalStatus && j.status === 'open' && j.posterRole !== 'user')).length})`}
                    {filter === 'rejected' && `Rejected (${jobs.filter(j => j.approvalStatus === 'rejected').length})`}
                  </button>
                ))}
              </div>
            </div>

            {/* Search */}
            <div className="mt-4">
              <div className="relative">
                <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search job title, hiring farm/clinic name, email, or city..."
                  value={jobSearchTerm}
                  onChange={(e) => setJobSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm font-medium text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-900"
                />
              </div>
            </div>
          </div>

          {/* Job listings container */}
          <div className="p-6">
            {filteredJobs.length === 0 ? (
              <div className="text-center py-12 bg-stone-50 rounded-2xl border border-dashed border-stone-200">
                <Briefcase className="w-10 h-10 text-stone-300 mx-auto mb-2" />
                <div className="text-sm font-bold text-stone-700">No Job Postings Found</div>
                <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
                  {jobSearchTerm || jobStatusFilter !== 'all'
                    ? 'No listings match your search keywords or filter criteria.'
                    : 'No job or helper advertisements have been published yet.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {filteredJobs.map((job) => {
                  const isPending = job.approvalStatus === 'pending' || (!job.approvalStatus && job.status === 'open' && job.posterRole === 'user');
                  const isRejected = job.approvalStatus === 'rejected';
                  const isApproved = job.approvalStatus === 'approved' || (!job.approvalStatus && job.status === 'open' && job.posterRole !== 'user');

                  return (
                    <div
                      key={job.id}
                      className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                        isPending
                          ? 'bg-amber-50/40 border-amber-300 ring-2 ring-amber-400/20'
                          : isRejected
                          ? 'bg-red-50/20 border-red-200'
                          : 'bg-white border-stone-200 hover:border-stone-300'
                      }`}
                    >
                      <div>
                        {/* Header Badge & Title */}
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              {/* Employer Type Badge */}
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-stone-100 text-stone-700 border border-stone-200">
                                {job.employerType === 'farm' ? '🌾 Dairy/Livestock Farm' :
                                 job.employerType === 'individual' ? '🐾 Individual Owner' :
                                 job.employerType === 'shelter' ? '🏠 Pet Shelter' :
                                 '🏥 Clinic / Hospital'}
                              </span>

                              {/* Approval Status Badge */}
                              {isPending && (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-amber-500 text-white animate-pulse">
                                  ⏳ Pending Verification
                                </span>
                              )}
                              {isApproved && (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-emerald-600 text-white">
                                  ✓ Live & Approved
                                </span>
                              )}
                              {isRejected && (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-red-600 text-white">
                                  ✕ Rejected
                                </span>
                              )}

                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-stone-100 text-stone-600">
                                {job.jobType}
                              </span>
                            </div>

                            <h3 className="text-base font-black text-stone-900 leading-snug">
                              {job.title}
                            </h3>
                          </div>

                          <div className="text-right shrink-0">
                            <div className="text-xs font-black text-stone-900">
                              Rs. {job.salaryMin?.toLocaleString()} - {job.salaryMax?.toLocaleString()}
                            </div>
                            <div className="text-[10px] text-stone-400 font-medium">per month</div>
                          </div>
                        </div>

                        {/* Employer & Location Details */}
                        <div className="p-3 bg-stone-50 rounded-xl border border-stone-150 space-y-1.5 mb-3 text-xs">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="font-bold text-stone-800 flex items-center gap-1.5">
                              <span>🏛️ Employer:</span>
                              <span className="text-stone-900 font-black">{job.clinicName}</span>
                              {job.posterRole && (
                                <span className="text-[10px] px-1.5 py-0.2 bg-stone-200 text-stone-700 rounded font-semibold uppercase">
                                  {job.posterRole}
                                </span>
                              )}
                            </div>
                            <div className="text-stone-500 font-mono text-[11px] select-all">
                              {job.clinicEmail}
                            </div>
                          </div>

                          <div className="flex items-center gap-4 text-stone-600 text-[11px] flex-wrap">
                            <div className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-stone-400 shrink-0" />
                              <span>{job.location}</span>
                            </div>
                            {job.clinicContactPhone && (
                              <div className="flex items-center gap-1 font-semibold text-stone-800">
                                <span>📞</span>
                                <span>{job.clinicContactPhone}</span>
                              </div>
                            )}
                            {job.clinicAddress && (
                              <div className="text-stone-500 truncate max-w-xs">
                                📍 {job.clinicAddress}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Experience, Working Hours & Requirements */}
                        <div className="space-y-2 mb-3 text-xs text-stone-700">
                          <div>
                            <span className="font-bold text-stone-900">Experience & Skills: </span>
                            <span className="text-stone-600">{job.experience}</span>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] pt-1">
                            <div className="p-2 bg-stone-50 rounded-lg border border-stone-100">
                              <div className="text-stone-400 font-bold text-[9px] uppercase">Hours / Shift</div>
                              <div className="font-bold text-stone-800 truncate">{job.workingHours || 'Standard'}</div>
                            </div>
                            <div className="p-2 bg-stone-50 rounded-lg border border-stone-100">
                              <div className="text-stone-400 font-bold text-[9px] uppercase">Positions</div>
                              <div className="font-bold text-stone-800">{job.positions || 1} available</div>
                            </div>
                            <div className="p-2 bg-stone-50 rounded-lg border border-stone-100">
                              <div className="text-stone-400 font-bold text-[9px] uppercase">Deadline</div>
                              <div className="font-bold text-stone-800">{job.deadline || 'Open'}</div>
                            </div>
                          </div>

                          {/* Screening questions & documents */}
                          {job.screeningQuestions && job.screeningQuestions.length > 0 && (
                            <div className="pt-1">
                              <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block mb-1">
                                Screening Questions ({job.screeningQuestions.length}):
                              </span>
                              <ul className="list-disc list-inside space-y-0.5 text-[11px] text-stone-600">
                                {job.screeningQuestions.map((q, idx) => (
                                  <li key={idx} className="truncate">{q}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {isRejected && job.rejectedReason && (
                            <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800">
                              <span className="font-black">Rejection Reason: </span>
                              <span>{job.rejectedReason}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Action Bar */}
                      <div className="pt-3 border-t border-stone-150 flex items-center justify-between gap-2 flex-wrap">
                        <div className="text-[10px] text-stone-400">
                          Posted on {new Date(job.createdAt).toLocaleDateString()}
                        </div>

                        <div className="flex items-center gap-2">
                          {isPending && (
                            <>
                              <button
                                onClick={() => handleApproveJob(job)}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-black shadow-xs cursor-pointer transition-all flex items-center gap-1"
                              >
                                <Check className="w-3.5 h-3.5" />
                                Approve Live
                              </button>
                              <button
                                onClick={() => handleOpenRejectJobModal(job)}
                                className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-xl text-xs font-black shadow-xs cursor-pointer transition-all flex items-center gap-1"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                Reject
                              </button>
                            </>
                          )}

                          {isApproved && (
                            <button
                              onClick={() => handleOpenRejectJobModal(job)}
                              className="bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-300 px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all"
                            >
                              Revoke Approval
                            </button>
                          )}

                          {isRejected && (
                            <button
                              onClick={() => handleApproveJob(job)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-black shadow-xs cursor-pointer transition-all flex items-center gap-1"
                            >
                              <Check className="w-3.5 h-3.5" />
                              Re-Approve Live
                            </button>
                          )}

                          <button
                            onClick={() => handleDeleteJobPostAdmin(job)}
                            className="text-stone-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                            title="Delete Permanently"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* TAB 6: BROADCAST NOTIFICATIONS */}
      {/* ───────────────────────────────────────────────────────────────── */}
      {activeTab === 'broadcasts' && (
        <AdminBroadcastManager currentUser={currentUser} />
      )}

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* MODAL 1: ROLE MODIFICATION & DEMOTION DIALOG */}
      {/* ───────────────────────────────────────────────────────────────── */}
      {roleModalUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-stone-200 overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 border-b border-stone-100">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-amber-50 text-amber-700 rounded-xl border border-amber-200">
                    <ArrowRightLeft className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-stone-900">Modify Account Role & Privileges</h3>
                    <p className="text-xs text-stone-500">Reassign account type or demote unauthorized doctor/clinic profiles.</p>
                  </div>
                </div>
                <button
                  onClick={() => setRoleModalUser(null)}
                  className="text-stone-400 hover:text-stone-600 p-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Current User Snapshot */}
              <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 flex items-center justify-between">
                <div>
                  <div className="font-bold text-stone-900 text-sm">{roleModalUser.name}</div>
                  <div className="text-xs text-stone-500 font-mono">{roleModalUser.email}</div>
                  <div className="text-[10px] text-stone-400 mt-0.5">UID: {roleModalUser.uid}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-stone-400 uppercase font-bold">Current Role</div>
                  <span className="inline-block text-xs font-black uppercase px-2.5 py-0.5 rounded-full bg-stone-200 text-stone-800 mt-0.5">
                    {roleModalUser.role}
                  </span>
                </div>
              </div>

              {/* Target Role Selector */}
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
                  Select New Account Role *
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setTargetRole('doctor');
                    }}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      targetRole === 'doctor'
                        ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-500/20'
                        : 'border-stone-200 hover:border-stone-300 bg-white'
                    }`}
                  >
                    <div className="font-bold text-stone-900 text-xs flex items-center gap-1.5">
                      <span>🩺</span> Doctor
                    </div>
                    <div className="text-[10px] text-stone-500 mt-0.5">Veterinary practitioner</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setTargetRole('clinic');
                    }}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      targetRole === 'clinic'
                        ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-500/20'
                        : 'border-stone-200 hover:border-stone-300 bg-white'
                    }`}
                  >
                    <div className="font-bold text-stone-900 text-xs flex items-center gap-1.5">
                      <span>🏥</span> Clinic / Hospital
                    </div>
                    <div className="text-[10px] text-stone-500 mt-0.5">Facility & Job Poster</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setTargetRole('assistant');
                      setRevokeSubs(true);
                      setRevokeVerif(true);
                    }}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      targetRole === 'assistant'
                        ? 'border-amber-600 bg-amber-50/50 ring-2 ring-amber-500/20'
                        : 'border-stone-200 hover:border-stone-300 bg-white'
                    }`}
                  >
                    <div className="font-bold text-stone-900 text-xs flex items-center gap-1.5">
                      <span>💉</span> Assistant / Paravet
                    </div>
                    <div className="text-[10px] text-stone-500 mt-0.5">Clinical staff & assistant</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setTargetRole('user');
                      setRevokeSubs(true);
                      setRevokeVerif(true);
                    }}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      targetRole === 'user'
                        ? 'border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-500/20'
                        : 'border-stone-200 hover:border-stone-300 bg-white'
                    }`}
                  >
                    <div className="font-bold text-stone-900 text-xs flex items-center gap-1.5">
                      <span>🌾</span> Farmer / Pet Owner
                    </div>
                    <div className="text-[10px] text-stone-500 mt-0.5">Livestock & Pet Client</div>
                  </button>
                </div>
              </div>

              {/* Automatic Safety Options */}
              <div className="space-y-2 pt-2 border-t border-stone-100">
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Automatic Safety & Cleanup Safeguards
                </label>

                <label className="flex items-start gap-2.5 p-2.5 bg-stone-50 rounded-xl border border-stone-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={revokeSubs}
                    onChange={e => setRevokeSubs(e.target.checked)}
                    className="mt-0.5 rounded text-stone-900 focus:ring-stone-900"
                  />
                  <div className="text-xs">
                    <div className="font-bold text-stone-900">Revoke Subscription Tier & Active Badges</div>
                    <div className="text-stone-500 text-[11px]">Resets plan to General to prevent unauthorized doctor privileges.</div>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 p-2.5 bg-stone-50 rounded-xl border border-stone-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={revokeVerif}
                    onChange={e => setRevokeVerif(e.target.checked)}
                    className="mt-0.5 rounded text-stone-900 focus:ring-stone-900"
                  />
                  <div className="text-xs">
                    <div className="font-bold text-stone-900">Revoke Verified Practitioner Checkmark</div>
                    <div className="text-stone-500 text-[11px]">Removes the blue checkmark from search feeds and directory.</div>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 p-2.5 bg-stone-50 rounded-xl border border-stone-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={deactivateAds}
                    onChange={e => setDeactivateAds(e.target.checked)}
                    className="mt-0.5 rounded text-stone-900 focus:ring-stone-900"
                  />
                  <div className="text-xs">
                    <div className="font-bold text-stone-900">Deactivate Live Billboard Campaigns</div>
                    <div className="text-stone-500 text-[11px]">Cancels any active ad campaigns owned by this account.</div>
                  </div>
                </label>
              </div>

              {/* Admin Note / Reason */}
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Reason for Role Reassignment (Sent to User in In-App Notification)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Account was registered as clinic on behalf of doctor, converted to assistant role"
                  value={roleChangeReason}
                  onChange={e => setRoleChangeReason(e.target.value)}
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-stone-900"
                />
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-800 leading-relaxed font-medium">
                  <strong>Zero-Conflict Guarantee:</strong> Role updates take effect instantly across Firestore and local caches without crashing active sessions or causing permission deadlocks.
                </p>
              </div>
            </div>

            <div className="bg-stone-50 px-6 py-4 flex justify-end gap-2.5 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setRoleModalUser(null)}
                disabled={isProcessingRole}
                className="px-4 py-2 text-xs sm:text-sm font-semibold text-stone-600 hover:text-stone-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRoleChange}
                disabled={isProcessingRole}
                className="px-5 py-2 text-xs sm:text-sm font-black text-white bg-stone-900 hover:bg-stone-800 rounded-xl shadow-xs transition-all cursor-pointer inline-flex items-center gap-2"
              >
                {isProcessingRole ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Updating Role...
                  </>
                ) : (
                  <>Apply Role Reassignment</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* MODAL 2: REASSIGN FARM OWNER DIALOG */}
      {/* ───────────────────────────────────────────────────────────────── */}
      {reassignFarm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-stone-200 overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 border-b border-stone-100">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-200">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-stone-900">Transfer Farm Ownership</h3>
                    <p className="text-xs text-stone-500">Reassign primary ownership (ownerUid) for farm #{reassignFarm.id}</p>
                  </div>
                </div>
                <button
                  onClick={() => setReassignFarm(null)}
                  className="text-stone-400 hover:text-stone-600 p-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200">
                <div className="text-xs font-bold text-stone-400 uppercase">Target Farm</div>
                <div className="font-black text-stone-900 text-sm mt-0.5">{reassignFarm.name} ({reassignFarm.farmType})</div>
                <div className="text-xs text-stone-500 mt-1">Current Owner: <span className="font-bold text-stone-700">{reassignFarm.ownerName}</span> ({reassignFarm.ownerEmail})</div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
                  Select Genuine Practitioner or Farmer *
                </label>
                <div className="relative mb-2">
                  <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search candidate by name, email, or role..."
                    value={ownerSearchQuery}
                    onChange={e => setOwnerSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm"
                  />
                </div>

                <div className="border border-stone-200 rounded-xl max-h-48 overflow-y-auto divide-y divide-stone-100">
                  {users
                    .filter(u => {
                      if (!u) return false;
                      const q = ownerSearchQuery.toLowerCase().trim();
                      return !q || (u.name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q);
                    })
                    .slice(0, 8)
                    .map(cand => (
                      <div
                        key={cand.uid}
                        onClick={() => setSelectedNewOwner(cand)}
                        className={`p-2.5 flex items-center justify-between cursor-pointer transition-colors ${
                          selectedNewOwner?.uid === cand.uid ? 'bg-emerald-50 border-l-4 border-emerald-600' : 'hover:bg-stone-50'
                        }`}
                      >
                        <div>
                          <div className="font-bold text-stone-900 text-xs">{cand.name}</div>
                          <div className="text-[11px] text-stone-500 font-mono">{cand.email}</div>
                        </div>
                        <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-stone-100 text-stone-700">
                          {cand.role}
                        </span>
                      </div>
                    ))}
                </div>
              </div>

              {selectedNewOwner && (
                <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs text-emerald-900">
                  Selected New Owner: <strong>{selectedNewOwner.name}</strong> ({selectedNewOwner.email})
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Reason / Admin Note
                </label>
                <input
                  type="text"
                  placeholder="e.g. Correcting original registration on behalf of doctor"
                  value={reassignOwnerReason}
                  onChange={e => setReassignOwnerReason(e.target.value)}
                  className="w-full p-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="bg-stone-50 px-6 py-4 flex justify-end gap-2.5 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setReassignFarm(null)}
                disabled={isProcessingFarmOwner}
                className="px-4 py-2 text-xs sm:text-sm font-semibold text-stone-600 hover:text-stone-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmFarmOwnerReassign}
                disabled={isProcessingFarmOwner || !selectedNewOwner}
                className="px-5 py-2 text-xs sm:text-sm font-black text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl shadow-xs transition-all cursor-pointer inline-flex items-center gap-2"
              >
                {isProcessingFarmOwner ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Transferring...
                  </>
                ) : (
                  <>Confirm Owner Transfer</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* MODAL 3: REASSIGN FARM MANAGER (VET) DIALOG */}
      {/* ───────────────────────────────────────────────────────────────── */}
      {managerFarm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-stone-200 overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 border-b border-stone-100">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-blue-50 text-blue-700 rounded-xl border border-blue-200">
                    <Stethoscope className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-stone-900">Appoint / Reassign Veterinary Manager</h3>
                    <p className="text-xs text-stone-500">Assign a verified Doctor or Clinic to farm #{managerFarm.id}</p>
                  </div>
                </div>
                <button
                  onClick={() => setManagerFarm(null)}
                  className="text-stone-400 hover:text-stone-600 p-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200">
                <div className="text-xs font-bold text-stone-400 uppercase">Target Farm</div>
                <div className="font-black text-stone-900 text-sm mt-0.5">{managerFarm.name}</div>
                <div className="text-xs text-stone-500 mt-1">
                  Current Manager: <span className="font-bold text-stone-700">{managerFarm.managerName || 'None'}</span> ({managerFarm.managerStatus})
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                    Select Practitioner or Clear Assignment
                  </label>
                  <button
                    type="button"
                    onClick={() => setSelectedNewManager(null)}
                    className="text-xs text-red-600 font-bold hover:underline cursor-pointer"
                  >
                    Unassign Manager
                  </button>
                </div>

                <div className="relative mb-2">
                  <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search doctor or clinic by name..."
                    value={managerSearchQuery}
                    onChange={e => setManagerSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm"
                  />
                </div>

                <div className="border border-stone-200 rounded-xl max-h-48 overflow-y-auto divide-y divide-stone-100">
                  {users
                    .filter(u => {
                      if (!u) return false;
                      const isVet = u.role === 'doctor' || u.role === 'clinic' || u.role === 'assistant';
                      const q = managerSearchQuery.toLowerCase().trim();
                      return isVet && (!q || (u.name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q));
                    })
                    .map(cand => (
                      <div
                        key={cand.uid}
                        onClick={() => setSelectedNewManager(cand)}
                        className={`p-2.5 flex items-center justify-between cursor-pointer transition-colors ${
                          selectedNewManager?.uid === cand.uid ? 'bg-blue-50 border-l-4 border-blue-600' : 'hover:bg-stone-50'
                        }`}
                      >
                        <div>
                          <div className="font-bold text-stone-900 text-xs">{cand.name}</div>
                          <div className="text-[11px] text-stone-500 font-mono">{cand.email}</div>
                        </div>
                        <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-stone-100 text-stone-700">
                          {cand.role}
                        </span>
                      </div>
                    ))}
                </div>
              </div>

              {selectedNewManager ? (
                <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-900">
                  Selected Manager: <strong>{selectedNewManager.name}</strong> ({selectedNewManager.role})
                </div>
              ) : (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
                  Manager status will be reset to <strong>Unassigned</strong>.
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Reason / Admin Note
                </label>
                <input
                  type="text"
                  placeholder="e.g. Official appointment by administration"
                  value={reassignManagerReason}
                  onChange={e => setReassignManagerReason(e.target.value)}
                  className="w-full p-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="bg-stone-50 px-6 py-4 flex justify-end gap-2.5 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setManagerFarm(null)}
                disabled={isProcessingFarmManager}
                className="px-4 py-2 text-xs sm:text-sm font-semibold text-stone-600 hover:text-stone-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmFarmManagerReassign}
                disabled={isProcessingFarmManager}
                className="px-5 py-2 text-xs sm:text-sm font-black text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-all cursor-pointer inline-flex items-center gap-2"
              >
                {isProcessingFarmManager ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>Save Manager Assignment</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* MODAL 4: CLINIC PROFILE & JOB DATA HANDOVER */}
      {/* ───────────────────────────────────────────────────────────────── */}
      {clinicMigrateSource && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-stone-200 overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 border-b border-stone-100">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-indigo-50 text-indigo-700 rounded-xl border border-indigo-200">
                    <Briefcase className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-stone-900">Clinic Profile & Job Data Handover</h3>
                    <p className="text-xs text-stone-500">Migrate job postings and candidate files to genuine practitioner</p>
                  </div>
                </div>
                <button
                  onClick={() => setClinicMigrateSource(null)}
                  className="text-stone-400 hover:text-stone-600 p-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200">
                <div className="text-xs font-bold text-stone-400 uppercase">Source Clinic (Created on behalf)</div>
                <div className="font-black text-stone-900 text-sm mt-0.5">{clinicMigrateSource.name}</div>
                <div className="text-xs text-stone-500">{clinicMigrateSource.email} (UID: {clinicMigrateSource.uid})</div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
                  Select Target Verified Doctor / Clinic *
                </label>
                <div className="relative mb-2">
                  <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search genuine doctor by name or email..."
                    value={clinicMigrateQuery}
                    onChange={e => setClinicMigrateQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm"
                  />
                </div>

                <div className="border border-stone-200 rounded-xl max-h-48 overflow-y-auto divide-y divide-stone-100">
                  {users
                    .filter(u => {
                      if (!u || u.uid === clinicMigrateSource.uid) return false;
                      const isDoctorOrClinic = u.role === 'doctor' || u.role === 'clinic';
                      const q = clinicMigrateQuery.toLowerCase().trim();
                      return isDoctorOrClinic && (!q || (u.name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q));
                    })
                    .map(cand => (
                      <div
                        key={cand.uid}
                        onClick={() => setClinicMigrateTarget(cand)}
                        className={`p-2.5 flex items-center justify-between cursor-pointer transition-colors ${
                          clinicMigrateTarget?.uid === cand.uid ? 'bg-indigo-50 border-l-4 border-indigo-600' : 'hover:bg-stone-50'
                        }`}
                      >
                        <div>
                          <div className="font-bold text-stone-900 text-xs">{cand.name}</div>
                          <div className="text-[11px] text-stone-500 font-mono">{cand.email}</div>
                        </div>
                        <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-stone-100 text-stone-700">
                          {cand.role}
                        </span>
                      </div>
                    ))}
                </div>
              </div>

              {clinicMigrateTarget && (
                <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl text-xs text-indigo-900">
                  Target Genuine Practitioner: <strong>{clinicMigrateTarget.name}</strong> ({clinicMigrateTarget.email})
                </div>
              )}
            </div>

            <div className="bg-stone-50 px-6 py-4 flex justify-end gap-2.5 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setClinicMigrateSource(null)}
                disabled={isProcessingClinicMigrate}
                className="px-4 py-2 text-xs sm:text-sm font-semibold text-stone-600 hover:text-stone-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmClinicMigrate}
                disabled={isProcessingClinicMigrate || !clinicMigrateTarget}
                className="px-5 py-2 text-xs sm:text-sm font-black text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl shadow-xs transition-all cursor-pointer inline-flex items-center gap-2"
              >
                {isProcessingClinicMigrate ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Migrating Data...
                  </>
                ) : (
                  <>Transfer All Clinic Data</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Job Rejection Modal */}
      {rejectJobModal.isOpen && rejectJobModal.job && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-stone-200 overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 border-b border-stone-100">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-red-50 text-red-700 rounded-xl border border-red-200">
                    <XCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-stone-900">Disapprove Job Posting</h3>
                    <p className="text-xs text-stone-500">Provide rejection reason for "{rejectJobModal.job.title}".</p>
                  </div>
                </div>
                <button
                  onClick={() => setRejectJobModal({ isOpen: false, job: null, reason: '', isSubmitting: false })}
                  className="text-stone-400 hover:text-stone-600 p-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs">
                <div className="font-bold text-stone-900">{rejectJobModal.job.title}</div>
                <div className="text-stone-600 text-[11px] mt-0.5">
                  Employer: {rejectJobModal.job.clinicName} ({rejectJobModal.job.clinicEmail})
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                  Rejection Reason (Will be sent to employer) *
                </label>
                <textarea
                  rows={3}
                  value={rejectJobModal.reason}
                  onChange={(e) => setRejectJobModal(prev => ({ ...prev, reason: e.target.value }))}
                  placeholder="Explain why this listing was not approved..."
                  className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm font-medium text-stone-800 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                />
              </div>
            </div>

            <div className="bg-stone-50 px-6 py-4 flex justify-end gap-2.5 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setRejectJobModal({ isOpen: false, job: null, reason: '', isSubmitting: false })}
                disabled={rejectJobModal.isSubmitting}
                className="px-4 py-2 text-xs sm:text-sm font-semibold text-stone-600 hover:text-stone-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRejectJob}
                disabled={rejectJobModal.isSubmitting || !rejectJobModal.reason.trim()}
                className="px-5 py-2 text-xs sm:text-sm font-black text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-xl shadow-xs transition-all cursor-pointer inline-flex items-center gap-2"
              >
                {rejectJobModal.isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Rejecting...
                  </>
                ) : (
                  <>Disapprove & Notify</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full border border-stone-200 overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6">
              <h3 className="text-lg font-black text-stone-900 mb-2">{confirmModal.title}</h3>
              <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">{confirmModal.message}</p>
            </div>
            <div className="bg-stone-50 px-6 py-4 flex justify-end gap-2.5 border-t border-stone-100">
              <button
                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 text-xs sm:text-sm font-semibold text-stone-600 hover:text-stone-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmModal.onConfirm}
                className={`px-4 py-2 text-xs sm:text-sm font-bold text-white rounded-xl shadow-xs transition-all cursor-pointer ${
                  confirmModal.isDestructive
                    ? 'bg-red-600 hover:bg-red-700 active:scale-95'
                    : 'bg-stone-900 hover:bg-stone-800 active:scale-95'
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full border border-stone-200 overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 flex flex-col items-center text-center">
              {notification.type === 'success' ? (
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4 border border-emerald-100">
                  <CheckCircle className="w-6 h-6" />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mb-4 border border-red-100">
                  <XCircle className="w-6 h-6" />
                </div>
              )}
              <h3 className="text-lg font-black text-stone-900 mb-2">{notification.title}</h3>
              <p className="text-xs sm:text-sm text-stone-600 leading-relaxed mb-6">{notification.message}</p>
              <button
                onClick={() => setNotification(prev => ({ ...prev, isOpen: false }))}
                className="w-full py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl font-bold text-xs sm:text-sm transition-all active:scale-95 cursor-pointer shadow-xs"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
