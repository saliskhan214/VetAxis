import { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import { UserProfile, JobPost, JobApplication, UserRole } from '../types';
import { JobBoardService, NotificationService } from '../lib/storage';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Briefcase, Search, MapPin, DollarSign, Calendar, Clock, UserCheck, 
  FileText, CheckCircle, AlertCircle, Plus, Users, Ban, Eye, Clipboard, 
  X, ChevronRight, Check, Award
} from 'lucide-react';

interface JobBoardProps {
  currentUser: UserProfile;
  highlightJobId?: string | null;
  highlightApplicationId?: string | null;
}

export function JobBoard({ currentUser, highlightJobId, highlightApplicationId }: JobBoardProps) {
  const [jobs, setJobs] = useState<JobPost[]>([]);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingApps, setLoadingApps] = useState<boolean>(false);
  const [loadingAllApps, setLoadingAllApps] = useState<boolean>(false);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [jobTypeFilter, setJobTypeFilter] = useState<string>('all');
  const [qualificationFilter, setQualificationFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'browse' | 'my_postings'>('browse');

  // New Job formulation state
  const [isPostModalOpen, setIsPostModalOpen] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitLoading, setSubmitLoading] = useState<boolean>(false);

  // Automatically scroll screen to top/start of popup when jod board popup opens
  useEffect(() => {
    if (isPostModalOpen) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [isPostModalOpen]);

  // Job post inputs
  const [title, setTitle] = useState<string>('');
  const [jobType, setJobType] = useState<JobPost['jobType']>('Full-time');
  const [location, setLocation] = useState<string>(currentUser.address || '');
  const [salaryMin, setSalaryMin] = useState<string>('');
  const [salaryMax, setSalaryMax] = useState<string>('');
  const [experience, setExperience] = useState<string>('');
  const [workingHours, setWorkingHours] = useState<string>('');
  const [genderPreference, setGenderPreference] = useState<JobPost['genderPreference']>('No Preference');
  const [deadline, setDeadline] = useState<string>('');
  const [positions, setPositions] = useState<number>(1);
  const [minQualificationGate, setMinQualificationGate] = useState<JobPost['minQualificationGate']>('none');

  // Hiring Clinic Detailed Info
  const [clinicAddress, setClinicAddress] = useState<string>(currentUser.address || '');
  const [clinicWebsite, setClinicWebsite] = useState<string>('');
  const [clinicContactPhone, setClinicContactPhone] = useState<string>(currentUser.phone || '');
  const [clinicFacilities, setClinicFacilities] = useState<string>(currentUser.facilities || '');
  
  // Custom screening questions & document demands
  const [screeningQuestions, setScreeningQuestions] = useState<string[]>(['']);
  const [requiredDocs, setRequiredDocs] = useState<string[]>(['CV']); // CV always required by default

  // Selected job for applying
  const [selectedJobToApply, setSelectedJobToApply] = useState<JobPost | null>(null);
  const [applyAnswers, setApplyAnswers] = useState<string[]>([]);
  const [cvText, setCvText] = useState<string>('');
  const [degreeText, setDegreeText] = useState<string>('');
  const [licenseNumber, setLicenseNumber] = useState<string>('');
  const [references, setReferences] = useState<string>('');
  const [applyError, setApplyError] = useState<string | null>(null);
  const [applyLoading, setApplyLoading] = useState<boolean>(false);

  // Clinic viewing applicants dashboard
  const [viewingJobApplicants, setViewingJobApplicants] = useState<JobPost | null>(null);
  const [currentJobApps, setCurrentJobApps] = useState<JobApplication[]>([]);

  // Beautiful Custom Dialog state (replaces native alert/confirm that gets blocked inside sandboxed iframes)
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    description: string;
    confirmText: string;
    cancelText?: string;
    isDestructive?: boolean;
    isAlertOnly?: boolean;
    onConfirm: () => void | Promise<void>;
  } | null>(null);
  const [confirmLoading, setConfirmLoading] = useState<boolean>(false);

  // Toast alert
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Local resolved highlight job ID
  const [localHighlightJobId, setLocalHighlightJobId] = useState<string | null>(null);

  useEffect(() => {
    if (highlightJobId) {
      setLocalHighlightJobId(highlightJobId);
    }
  }, [highlightJobId]);

  useEffect(() => {
    if (highlightApplicationId && applications.length > 0) {
      const matchApp = applications.find(a => a.id === highlightApplicationId);
      if (matchApp) {
        setLocalHighlightJobId(matchApp.jobId);
      }
    }
  }, [highlightApplicationId, applications]);

  useEffect(() => {
    if (localHighlightJobId && jobs.length > 0) {
      const targetJob = jobs.find(j => j.id === localHighlightJobId);
      if (targetJob) {
        const isMyOwn = currentUser.role === 'clinic' && 
          (targetJob.clinicId === currentUser.uid || targetJob.clinicEmail === currentUser.email);
        
        if (isMyOwn) {
          setActiveTab('my_postings');
        } else {
          setActiveTab('browse');
        }

        const scrollTimer = setTimeout(() => {
          const borderElement = document.getElementById(`job-${localHighlightJobId}`);
          if (borderElement) {
            borderElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 650);
        return () => clearTimeout(scrollTimer);
      }
    }
  }, [localHighlightJobId, jobs]);

  useEffect(() => {
    loadJobs();
    if (currentUser.role === 'clinic' && !highlightJobId && !highlightApplicationId) {
      setActiveTab('my_postings');
    }
  }, []);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const loadJobs = async () => {
    setLoading(true);
    try {
      const allJobs = await JobBoardService.fetchJobs();
      setJobs(allJobs);
    } catch (err) {
      console.error('Failed to fetch job postings:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadAllApplications = async () => {
    setLoadingAllApps(true);
    try {
      let apps: JobApplication[] = [];
      if (currentUser.role === 'clinic') {
        // Query both clinicId and clinicEmail with independent guards to prevent minor role clashes from clearing entries
        let appsById: JobApplication[] = [];
        try {
          appsById = await JobBoardService.fetchApplications({ clinicId: currentUser.uid });
        } catch (idErr) {
          console.warn('Failed to fetch applications by clinicId:', idErr);
        }

        let appsByEmail: JobApplication[] = [];
        if (currentUser.email) {
          try {
            appsByEmail = await JobBoardService.fetchApplications({ clinicEmail: currentUser.email.toLowerCase() });
          } catch (emailErr) {
            console.warn('Failed to fetch applications by email:', emailErr);
          }
        }

        const merged = [...appsById];
        appsByEmail.forEach(item => {
          if (!merged.some(m => m.id === item.id)) {
            merged.push(item);
          }
        });
        apps = merged;
      } else {
        try {
          apps = await JobBoardService.fetchApplications({ applicantId: currentUser.uid });
        } catch (appErr) {
          console.warn('Failed to fetch applications for applicant:', appErr);
        }
      }
      setApplications(apps);
    } catch (err) {
      console.error('Failed to load apps:', err);
    } finally {
      setLoadingAllApps(false);
    }
  };

  useEffect(() => {
    loadAllApplications();
  }, [jobs]);

  const handleAddQuestion = () => {
    if (screeningQuestions.length >= 3) {
      triggerToast('You can add a maximum of 3 screening questions.');
      return;
    }
    setScreeningQuestions([...screeningQuestions, '']);
  };

  const handleRemoveQuestion = (idx: number) => {
    const updated = screeningQuestions.filter((_, i) => i !== idx);
    setScreeningQuestions(updated.length === 0 ? [''] : updated);
  };

  const handleQuestionChange = (idx: number, val: string) => {
    const updated = [...screeningQuestions];
    updated[idx] = val;
    setScreeningQuestions(updated);
  };

  const handleDocToggle = (docName: string) => {
    if (docName === 'CV') return; // CV cannot be toggled off
    if (requiredDocs.includes(docName)) {
      setRequiredDocs(requiredDocs.filter(d => d !== docName));
    } else {
      setRequiredDocs([...requiredDocs, docName]);
    }
  };

  const handleJobSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!title.trim() || !location.trim() || !salaryMin || !salaryMax || !experience.trim() || !workingHours.trim() || !deadline) {
      setFormError('Please fill in all required job fields.');
      return;
    }

    const minS = parseFloat(salaryMin);
    const maxS = parseFloat(salaryMax);

    if (isNaN(minS) || minS <= 0 || isNaN(maxS) || maxS <= 0) {
      setFormError('Salary range must consist of valid positive numbers in PKR.');
      return;
    }

    if (minS > maxS) {
      setFormError('Minimum salary cannot exceed the maximum salary limit.');
      return;
    }

    setSubmitLoading(true);

    try {
      // Filter out empty screening questions
      const finalQuestions = screeningQuestions.filter(q => q.trim() !== '');

      const payload: Partial<JobPost> = {
        title,
        jobType,
        location,
        salaryMin: minS,
        salaryMax: maxS,
        experience,
        workingHours,
        genderPreference,
        deadline,
        positions: positions || 1,
        minQualificationGate,
        screeningQuestions: finalQuestions,
        requiredDocuments: requiredDocs,
        clinicAddress: clinicAddress.trim() || undefined,
        clinicWebsite: clinicWebsite.trim() || undefined,
        clinicContactPhone: clinicContactPhone.trim() || undefined,
        clinicFacilities: clinicFacilities.trim() || undefined,
      };

      const created = await JobBoardService.createJob(payload, currentUser);
      setJobs(prev => [created, ...prev]);
      setIsPostModalOpen(false);
      triggerToast('✓ Your Vet Job posting was published successfully!');

      // Reset
      setTitle('');
      setJobType('Full-time');
      setLocation(currentUser.address || '');
      setSalaryMin('');
      setSalaryMax('');
      setExperience('');
      setWorkingHours('');
      setGenderPreference('No Preference');
      setDeadline('');
      setPositions(1);
      setMinQualificationGate('none');
      setClinicAddress(currentUser.address || '');
      setClinicWebsite('');
      setClinicContactPhone(currentUser.phone || '');
      setClinicFacilities(currentUser.facilities || '');
      setScreeningQuestions(['']);
      setRequiredDocs(['CV']);

    } catch (err: any) {
      setFormError(err.message || 'Failed to submit job posting.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleCloseJobPosting = (jobId: string, currentStatus: 'open' | 'closed') => {
    const nextStatus = currentStatus === 'open' ? 'closed' : 'open';

    setConfirmDialog({
      title: `${currentStatus === 'open' ? 'Close' : 'Re-open'} Job Posting?`,
      description: `This will mark the job advertising status as ${nextStatus.toUpperCase()}. Are you sure?`,
      confirmText: `Yes, ${currentStatus === 'open' ? 'Close' : 'Re-open'}`,
      cancelText: 'Cancel',
      isDestructive: currentStatus === 'open',
      onConfirm: async () => {
        try {
          await JobBoardService.updateJob(jobId, { status: nextStatus });
          setJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: nextStatus } : j));
          triggerToast(`Job listing has been marked as ${nextStatus.toUpperCase()}.`);
        } catch (err) {
          console.error(err);
          triggerToast('Failed to change job listing status.');
        }
      }
    });
  };

  const handleDeleteJobPost = (jobId: string) => {
    setConfirmDialog({
      title: '🚨 Permanent Job Deletion',
      description: 'Are you sure you want to permanently delete this job ad? This action is irreversible. All candidates\' historic job applications will remain preserved in candidate logs but the listing is completely deleted from the feed.',
      confirmText: 'Yes, Delete Permanently',
      cancelText: 'Keep My Job Ad',
      isDestructive: true,
      onConfirm: async () => {
        try {
          await JobBoardService.deleteJob(jobId);
          if (viewingJobApplicants?.id === jobId) {
            setViewingJobApplicants(null);
          }
          setJobs(prev => prev.filter(j => j.id !== jobId));
          triggerToast('Job posting has been deleted successfully.');
        } catch (err: any) {
          console.error(err);
          triggerToast(err.message || 'Failed to delete job posting.');
        }
      }
    });
  };

  // Apply Now actions
  const initiateApply = (job: JobPost) => {
    // Check if already applied
    const alreadyApplied = applications.some(app => app.jobId === job.id && app.applicantId === currentUser.uid);
    if (alreadyApplied) {
      setConfirmDialog({
        title: 'Already Applied',
        description: 'You have already submitted an application for this job posting.',
        confirmText: 'Acknowledge',
        isAlertOnly: true,
        onConfirm: () => {}
      });
      return;
    }

    // 1. Auto-reject filter evaluation
    if (job.minQualificationGate !== 'none') {
      const candidateRole = currentUser.role; // 'doctor', 'assistant', 'user', 'clinic'
      if (job.minQualificationGate === 'doctor' && candidateRole !== 'doctor') {
        setConfirmDialog({
          title: '⚠️ Minimal Qualification Gate Restricted',
          description: `This job posting has a strict Minimum Qualification Gate set to Dr. / Veterinarian. Your registered account role is "${candidateRole.toUpperCase()}", which is not eligible to apply.`,
          confirmText: 'Acknowledge',
          isAlertOnly: true,
          onConfirm: () => {}
        });
        return;
      }
    }

    setSelectedJobToApply(job);
    setApplyAnswers(new Array(job.screeningQuestions.length).fill(''));
    setCvText('');
    setDegreeText('');
    setLicenseNumber('');
    setReferences('');
    setApplyError(null);
  };

  const handleApplySubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedJobToApply) return;

    // Check custom screening questions
    for (let i = 0; i < selectedJobToApply.screeningQuestions.length; i++) {
      if (!applyAnswers[i] || applyAnswers[i].trim() === '') {
        setApplyError(`Please answer screening question #${i + 1}.`);
        return;
      }
    }

    // Required doc validations
    if (selectedJobToApply.requiredDocuments.includes('CV') && !cvText.trim()) {
      setApplyError('Please write or link your CV credentials text.');
      return;
    }
    if (selectedJobToApply.requiredDocuments.includes('Degree Certificate') && !degreeText.trim()) {
      setApplyError('Please provide your Degree certificate or qualification details.');
      return;
    }
    if (selectedJobToApply.requiredDocuments.includes('License Number') && !licenseNumber.trim()) {
      setApplyError('Please enter your clinic veterinary registration license number.');
      return;
    }
    if (selectedJobToApply.requiredDocuments.includes('Reference Contacts') && !references.trim()) {
      setApplyError('Please write down your professional reference contact details.');
      return;
    }

    setApplyLoading(true);
    setApplyError(null);

    try {
      const payload: Partial<JobApplication> = {
        answers: applyAnswers,
        submittedDocs: {
          cvText: cvText.trim() || undefined,
          degreeLinkOrText: degreeText.trim() || undefined,
          licenseNumber: licenseNumber.trim() || undefined,
          references: references.trim() || undefined
        }
      };

      const createdApp = await JobBoardService.applyForJob(payload, currentUser, selectedJobToApply);
      
      // Trigger notification to the clinic
      try {
        await NotificationService.createNotification({
          userId: selectedJobToApply.clinicId,
          senderId: currentUser.uid,
          senderName: currentUser.name,
          type: 'apply',
          targetId: selectedJobToApply.id,
          targetType: 'job',
          message: `${currentUser.name} applied for your job ad: ${selectedJobToApply.title}`
        });
      } catch (notifErr) {
        console.error('Failed to trigger job-app notification:', notifErr);
      }

      triggerToast('✓ Your application has been submitted to the clinic!');
      
      // Update applications state instantly so the button changes to "Applied" with status in the UI
      setApplications(prev => {
        if (prev.some(a => a.id === createdApp.id)) return prev;
        return [...prev, createdApp];
      });

      setSelectedJobToApply(null);
    } catch (err: any) {
      setApplyError(err.message || 'Failed to submit application.');
    } finally {
      setApplyLoading(false);
    }
  };

  const handleViewApplicants = async (job: JobPost) => {
    setViewingJobApplicants(job);
    setLoadingApps(true);
    try {
      // Query by clinicId to avoid composite index requirements while satisfying security policies
      let apps = await JobBoardService.fetchApplications({ clinicId: currentUser.uid });
      let matched = apps.filter(app => app.jobId === job.id);

      // Secure email-based fallback if ID query yielded no elements and email is defined
      if (matched.length === 0 && currentUser.email) {
        try {
          const emailApps = await JobBoardService.fetchApplications({ clinicEmail: currentUser.email.toLowerCase() });
          const matchedByEmail = emailApps.filter(app => app.jobId === job.id);
          if (matchedByEmail.length > 0) {
            matched = matchedByEmail;
          }
        } catch (emailErr) {
          console.warn('Failed to fetch applicants by email fallback:', emailErr);
        }
      }

      setCurrentJobApps(matched);
    } catch (err) {
      console.error(err);
      triggerToast('Failed to load applications.');
    } finally {
      setLoadingApps(false);
    }
  };

  const handleUpdateApplicationStatus = async (appId: string, status: JobApplication['status']) => {
    try {
      await JobBoardService.updateApplicationStatus(appId, status);
      
      // Send live notification to candidate
      const matchingApp = currentJobApps.find(a => a.id === appId);
      if (matchingApp && viewingJobApplicants) {
        try {
          await NotificationService.createNotification({
            userId: matchingApp.applicantId,
            senderId: currentUser.uid,
            senderName: currentUser.name,
            type: 'status_change',
            targetId: matchingApp.id,
            targetType: 'application',
            message: `Your application status for "${viewingJobApplicants.title}" has been updated to "${status.toUpperCase()}"`
          });
        } catch (notifErr) {
          console.error('Failed to trigger status change notification:', notifErr);
        }
      }

      setCurrentJobApps(prev => prev.map(a => a.id === appId ? { ...a, status } : a));
      setApplications(prev => prev.map(a => a.id === appId ? { ...a, status } : a));
      triggerToast(`Application status updated to ${status.toUpperCase()}.`);
    } catch (err) {
      console.error(err);
      triggerToast('Failed to update applicant status.');
    }
  };

  // Filter lists
  const myJobPostings = currentUser.role === 'clinic' 
    ? jobs.filter(j => j.clinicId === currentUser.uid || j.clinicEmail === currentUser.email)
    : [];
  
  const filteredJobs = jobs.filter(job => {
    // Tab filtering (browse cannot include closed unless it's their own or they are looking)
    if (activeTab === 'my_postings') {
      if (currentUser.role !== 'clinic') return false;
      if (job.clinicId !== currentUser.uid && job.clinicEmail !== currentUser.email) {
        return false;
      }
    }

    // Filter out jobs that reached or passed their last date (deadline) for regular browsing
    if (activeTab !== 'my_postings') {
      const todayStr = new Date().toISOString().split('T')[0];
      if (job.deadline && job.deadline < todayStr) {
        return false;
      }
    }

    // Filter by Search term
    const matchesSearch = 
      job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.clinicName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.location.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Filter by type
    const matchesType = jobTypeFilter === 'all' || job.jobType === jobTypeFilter;

    // Filter by gate qualification
    const matchesGate = qualificationFilter === 'all' || job.minQualificationGate === qualificationFilter;

    return matchesSearch && matchesType && matchesGate;
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto min-h-[600px] animate-fadeIn" id="job_board_main">
      
      {/* Toast Alert Box */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-[400] bg-[#5a5a40] text-white font-bold text-sm px-6 py-3.5 rounded-full border border-b-[3px] border-[#3e3e2b] shadow-xl flex items-center gap-2"
          >
            <CheckCircle className="w-4 h-4 text-[#e3dec9]" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER HERO AREA */}
      <div className="relative rounded-3xl border border-[#e3dec9] border-b-[5px] border-[#cdc6ad] bg-white p-6 md:p-10 flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden shadow-sm" id="job_board_hero">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 rounded-full bg-[#fcf9f2] opacity-50 pointer-events-none" />
        
        <div className="space-y-3 relative z-10 text-center md:text-left">
          <div className="inline-flex items-center gap-1.5 bg-[#ece8df] text-[#5a5a40] text-[10px] font-black uppercase tracking-wider px-3.5 py-1.5 rounded-full border border-[#e3dec9]">
            🎯 Pakistani veterinary hiring board
          </div>
          <h1 className="text-3xl md:text-4xl font-serif text-[#3c3c3b] font-black tracking-tight leading-none leading-tight">
            VetAxis <span className="text-[#a0522d]">Careers</span> Board
          </h1>
          <p className="text-sm text-[#7a766f] max-w-xl font-medium">
            Bridging veterinary hospitals and clinical experts across Pakistan. Post available jobs, mandate background qualification screening, and manage local candidate selections.
          </p>
        </div>

        {currentUser.role === 'clinic' && (
          <motion.button
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setIsPostModalOpen(true)}
            className="w-full md:w-auto relative cursor-pointer font-bold text-white bg-[#a0522d] border-b-[4px] border-[#69351d] px-6 py-3.5 rounded-2xl flex items-center justify-center gap-2 select-none shadow-[0_4px_16px_rgba(160,82,45,0.25)] hover:bg-[#8b4513] transition-all"
            id="publish_job_btn"
          >
            <Plus className="w-5 h-5" />
            <span>Publish Job Listing</span>
          </motion.button>
        )}
      </div>

      {/* TABS SELECTOR FOR CLINICS */}
      {currentUser.role === 'clinic' && (
        <div className="flex border-b border-[#e3dec9] gap-4" id="clinic_job_tabs">
          <button
            onClick={() => setActiveTab('my_postings')}
            className={`cursor-pointer pb-3 text-sm font-black transition-all ${
              activeTab === 'my_postings'
                ? 'text-[#a0522d] border-b-2 border-[#a0522d] scale-102 font-black'
                : 'text-[#7a766f] hover:text-[#3c3c3b] font-bold'
            }`}
          >
            🏥 Our Clinic Job Postings ({myJobPostings.length})
          </button>
          <button
            onClick={() => setActiveTab('browse')}
            className={`cursor-pointer pb-3 text-sm font-black transition-all ${
              activeTab === 'browse'
                ? 'text-[#a0522d] border-b-2 border-[#a0522d] scale-102 font-black'
                : 'text-[#7a766f] hover:text-[#3c3c3b] font-bold'
            }`}
          >
            🌐 Browse All Local Jobs ({jobs.length})
          </button>
        </div>
      )}

      {/* FILTER & SEARCH SEARCH BAR */}
      <div className="bg-[#fcf9f2] border border-[#e3dec9] p-5 rounded-2xl flex flex-col md:flex-row items-center gap-4 shadow-xs" id="job_search_filters">
        {/* Search text */}
        <div className="relative w-full md:flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#a49f92] w-5 h-5" />
          <input
            type="text"
            placeholder="Search by job title, clinics, locations (e.g. Peshawar Cantonment)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-[#e3dec9] placeholder-[#a49f92] pl-11 pr-4 py-3 rounded-xl text-sm font-semibold select-all text-[#3c3c3b] focus:outline-none focus:ring-1 focus:ring-[#5a5a40]"
          />
        </div>

        {/* Job type dropdown */}
        <div className="w-full md:w-48 bg-white border border-[#e3dec9] rounded-xl px-3 py-2.5 flex items-center justify-between text-xs font-bold text-[#5a5a40] shadow-2xs select-none">
          <span className="text-[#a49f92]">Type:</span>
          <select
            value={jobTypeFilter}
            onChange={(e) => setJobTypeFilter(e.target.value)}
            className="bg-transparent border-none font-bold text-[#5a5a40] focus:outline-none select-all cursor-pointer text-xs"
          >
            <option value="all">All Styles</option>
            <option value="Full-time">Full-time</option>
            <option value="Part-time">Part-time</option>
            <option value="Freelance">Freelance</option>
            <option value="Internship">Internship</option>
          </select>
        </div>

        {/* Qualification check */}
        <div className="w-full md:w-56 bg-white border border-[#e3dec9] rounded-xl px-3 py-2.5 flex items-center justify-between text-xs font-bold text-[#5a5a40] shadow-2xs select-none">
          <span className="text-[#a49f92]">Gate Limit:</span>
          <select
            value={qualificationFilter}
            onChange={(e) => setQualificationFilter(e.target.value)}
            className="bg-transparent border-none font-bold text-[#5a5a40] focus:outline-none select-all cursor-pointer text-xs"
          >
            <option value="all">Any Role Eligible</option>
            <option value="none">Open Eligibility</option>
            <option value="doctor">Dr. / Veterinarian</option>
          </select>
        </div>
      </div>

      {/* MAIN CONTENT LISTING */}
      {loading ? (
        <div className="py-20 text-center text-[#7a766f] font-semibold flex flex-col items-center justify-center gap-3">
          <div className="w-10 h-10 border-4 border-[#e3dec9] border-t-[#a0522d] rounded-full animate-spin" />
          <span>Synchronizing careers catalog...</span>
        </div>
      ) : filteredJobs.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-[#e3dec9] bg-white rounded-3xl" id="no_jobs_view">
          <Briefcase className="w-12 h-12 text-[#a49f92] mx-auto mb-4" />
          <h3 className="text-lg font-serif font-bold text-[#3c3c3b] mb-1">No Vet Jobs Found</h3>
          <p className="text-xs text-[#7a766f] max-w-sm mx-auto">
            Try adjusting your search filters or check back later. Matches vary based on cities and clinics.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="jobs_listings_grid">
          {filteredJobs.map((job) => {
            const isMyOwn = currentUser.role === 'clinic' && (job.clinicId === currentUser.uid || job.clinicEmail === currentUser.email);
            const appliedForJob = applications.find(app => app.jobId === job.id && app.applicantId === currentUser.uid);

            return (
              <motion.div
                key={job.id}
                id={`job-${job.id}`}
                layout
                className={`relative bg-white border rounded-2xl overflow-hidden p-5 flex flex-col justify-between transition-shadow hover:shadow-md ${
                  localHighlightJobId === job.id
                    ? 'border-amber-500 ring-4 ring-amber-500/20 shadow-lg scale-[1.01] z-10'
                    : job.status === 'closed' 
                      ? 'border-[#ece8df] opacity-75 grayscale-xs' 
                      : isMyOwn 
                        ? 'border-[#a0522d]/40 shadow-xs border-b-[3px] border-b-[#a0522d]'
                        : 'border-[#e3dec9] border-b-[3px] border-b-[#cdc6ad]'
                }`}
              >
                <div>
                  {/* Top line with labels */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <span className="bg-[#fcf9f2] border border-[#e3dec9] text-[#7a766f] text-[10px] uppercase font-black px-2.5 py-1 rounded-full">
                      💼 {job.jobType}
                    </span>
                    
                    {job.status === 'closed' ? (
                      <span className="bg-red-50 text-red-700 border border-red-200 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
                        Filled / Closed
                      </span>
                    ) : (
                      <span className="bg-green-50 text-green-700 border border-green-200 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider animate-pulse">
                        Accepting Entries
                      </span>
                    )}
                  </div>

                  {/* Title & Clinic details */}
                  <div className="space-y-1 mb-4">
                    <h3 className="text-lg font-serif font-bold text-[#3c3c3b] tracking-tight hover:text-[#a0522d] transition-colors leading-tight">
                      {job.title}
                    </h3>
                    <div className="text-xs text-[#7a766f] font-semibold flex items-center gap-1">
                      <span>🏥 {job.clinicName}</span>
                      <span className="text-[#cdc6ad]">·</span>
                      <span className="flex items-center text-[#5a5a40]">
                        <MapPin className="w-3.5 h-3.5 mr-0.5 inline font-bold" /> {job.location}
                      </span>
                    </div>
                  </div>

                  {/* Critical parameters cards bento snippet */}
                  <div className="grid grid-cols-2 gap-2 bg-[#fcf9f2] border border-[#e3dec9]/80 p-3 rounded-xl mb-4 text-[11px] font-bold text-[#5a5a40]">
                    <div className="flex items-center gap-1 truncate">
                      <DollarSign className="w-3.5 h-3.5 text-[#a0522d]" />
                      <span>{job.salaryMin.toLocaleString()} - {job.salaryMax.toLocaleString()} PKR</span>
                    </div>
                    <div className="flex items-center gap-1 truncate">
                      <Clock className="w-3.5 h-3.5 text-[#a49f92]" />
                      <span>{job.workingHours}</span>
                    </div>
                    <div className="flex items-center gap-1 truncate uppercase tracking-widest text-[9px] text-[#a0522d]">
                      <Award className="w-3.5 h-3.5 text-[#a0522d]" />
                      <span>Gate:{job.minQualificationGate.toUpperCase()}</span>
                    </div>
                    <div className="flex items-center gap-1 truncate">
                      <Calendar className="w-3.5 h-3.5 text-red-500" />
                      <span className="text-red-700 font-extrabold">{job.deadline}</span>
                    </div>
                  </div>

                  {/* Qualification detail text */}
                  <div className="space-y-1 text-xs mb-4">
                    <p className="text-[#3c3c3b] font-medium leading-relaxed">
                      <strong className="text-[#5a5a40] font-black uppercase text-[10px] tracking-wider block mb-0.5">Required Skills & XP:</strong> 
                      {job.experience}
                    </p>
                    <p className="text-[#7a766f] text-[11px]">
                      <span className="font-bold">🧑‍🤝‍🧑 Gender Preference:</span> {job.genderPreference} · <span className="font-bold">📊 Number of Vacancies:</span> {job.positions}
                    </p>
                  </div>

                  {/* Hiring Party Details Box */}
                  {(job.clinicAddress || job.clinicWebsite || job.clinicContactPhone || job.clinicFacilities) && (
                    <div className="mt-4 p-3.5 bg-neutral-50 hover:bg-neutral-100/50 rounded-xl border border-neutral-200/60 text-xs text-[#5a5a40] space-y-2 transition-all">
                      <div className="text-[10px] font-black uppercase tracking-widest text-[#a0522d] flex items-center gap-1.5 border-b border-neutral-200/40 pb-1 mb-1.5 shadow-2xs">
                        🏥 Clinical Hiring Party Overview
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] leading-relaxed">
                        {job.clinicContactPhone && (
                          <div className="flex items-start gap-1 font-sans">
                            <span className="font-bold text-[#a0522d]/95 text-[10px] uppercase tracking-wide shrink-0">📞 Call/WA:</span>
                            <span className="text-[#3c3c3b] font-bold break-all select-all">{job.clinicContactPhone}</span>
                          </div>
                        )}
                        {job.clinicWebsite && (
                          <div className="flex items-start gap-1 font-sans">
                            <span className="font-bold text-[#a0522d]/95 text-[10px] uppercase tracking-wide shrink-0">🌐 Website:</span>
                            <a 
                              href={job.clinicWebsite.startsWith('http') ? job.clinicWebsite : `https://${job.clinicWebsite}`} 
                              target="_blank" 
                              rel="noreferrer"
                              className="text-[#a0522d] underline hover:text-[#8b4513] font-bold truncate transition-colors"
                            >
                              {job.clinicWebsite}
                            </a>
                          </div>
                        )}
                        {job.clinicAddress && (
                          <div className="flex items-start gap-1 font-sans sm:col-span-2">
                            <span className="font-bold text-[#a0522d]/95 text-[10px] uppercase tracking-wide shrink-0">📍 Address:</span>
                            <span className="text-[#3c3c3b] font-semibold leading-normal">{job.clinicAddress}</span>
                          </div>
                        )}
                        {job.clinicFacilities && (
                          <div className="flex items-start gap-1 font-sans sm:col-span-2">
                            <span className="font-bold text-[#a0522d]/95 text-[10px] uppercase tracking-wide shrink-0">🔬 Equipment:</span>
                            <span className="text-[#7a766f] font-semibold italic">{job.clinicFacilities}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Button footer row based on Role */}
                <div className="border-t border-[#f4f1e9] pt-4 mt-2 flex items-center justify-between gap-3 flex-wrap">
                  {isMyOwn ? (
                    <div className="flex items-center gap-2 w-full justify-between">
                      {/* Clinic specific utilities */}
                      <button
                        onClick={() => handleViewApplicants(job)}
                        className="bg-[#5a5a40] hover:bg-[#3e3e2b] text-white border-b-2 border-b-[#2a2a1d] px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <Users className="w-4 h-4" />
                        <span>Manage Applicants ({applications.filter(a => a.jobId === job.id).length})</span>
                      </button>

                      <button
                        onClick={() => handleDeleteJobPost(job.id)}
                        className="bg-red-50 border border-red-200 text-red-700 hover:bg-red-100 px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1.5 transition-all shadow-2xs"
                        title="Permanently Delete Job Advertising Post"
                      >
                        <span>🗑️ Delete Job Ad</span>
                      </button>
                    </div>
                  ) : (
                    <>
                      {/* Candidate application capabilities */}
                      <div className="text-[10px] text-[#a49f92] font-semibold leading-none">
                        Clinic posted • {new Date(job.createdAt).toLocaleDateString()}
                      </div>

                      {appliedForJob ? (
                        <span className="bg-green-50 border border-green-200 text-green-700 text-xs font-black px-4 py-2 rounded-xl flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" />
                          Applied ({appliedForJob.status})
                        </span>
                      ) : (job.status === 'closed' || applications.some(app => app.jobId === job.id && app.status === 'Hired')) ? (
                        <button disabled className="bg-red-50 text-red-700 border border-red-200 px-5 py-2.5 rounded-xl text-xs font-black cursor-not-allowed">
                          Ad closed
                        </button>
                      ) : (
                        <button
                          onClick={() => initiateApply(job)}
                          className="bg-[#a0522d] hover:bg-[#8b4513] text-white border-b-2 border-b-[#69351d] px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
                        >
                          Apply Now
                        </button>
                      )}
                    </>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────
          MODAL A: POST AD FORM FOR CLINICS 
          ───────────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {isPostModalOpen && (
          <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-xs"
              onClick={() => setIsPostModalOpen(false)}
            />

            <motion.div
              initial={{ y: 50, scale: 0.95, opacity: 0 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              exit={{ y: 50, scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-2xl bg-[#fdfbf7] border border-[#e3dec9] border-b-[5px] border-[#cdc6ad] rounded-2xl p-6 shadow-2xl overflow-y-auto max-h-[90vh]"
            >
              <button
                onClick={() => setIsPostModalOpen(false)}
                className="absolute top-4 right-4 p-2 rounded-full border border-[#e3dec9] bg-white text-[#7a766f] hover:bg-[#fcf9f2] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <h2 className="text-xl font-serif font-bold text-[#3c3c3b] mb-4 flex items-center gap-2">
                💼 Publish New Veterinarian & Helper Job
              </h2>

              <form onSubmit={handleJobSubmit} className="space-y-4">
                {formError && (
                  <div className="bg-red-50 text-red-800 text-xs py-3 px-4 rounded-xl border border-red-200 flex items-center gap-2 font-semibold">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                {/* Job Title */}
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-[#5a5a40] mb-1.5">
                    Job Title (*)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Small Animal Surgery Assistant, Junior Veterinarian"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-white border border-[#e3dec9] rounded-xl px-4 py-3 text-sm font-semibold text-[#3c3c3b] focus:outline-none focus:ring-1 focus:ring-[#5a5a40]"
                  />
                  <p className="text-[10px] text-[#a49f92] mt-1 font-medium">Be specific in job headers. Generic names reduce candidate response rate.</p>
                </div>

                {/* 2-column details layout */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Job Type */}
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-[#5a5a40] mb-1.5">
                      Job Type (*)
                    </label>
                    <select
                      value={jobType}
                      onChange={(e) => setJobType(e.target.value as any)}
                      className="w-full bg-white border border-[#e3dec9] rounded-xl px-4 py-3 text-sm font-semibold text-[#3c3c3b] focus:outline-none focus:ring-1 focus:ring-[#5a5a40]"
                    >
                      <option value="Full-time">Full-time</option>
                      <option value="Part-time">Part-time</option>
                      <option value="Freelance">Freelance</option>
                      <option value="Internship">Internship</option>
                    </select>
                  </div>

                  {/* Location */}
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-[#5a5a40] mb-1.5">
                      Location (City & Area) (*)
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. F-8 Cantonment, Islamabad"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="w-full bg-white border border-[#e3dec9] rounded-xl px-4 py-3 text-sm font-semibold text-[#3c3c3b] focus:outline-none focus:ring-1 focus:ring-[#5a5a40]"
                    />
                  </div>
                </div>

                {/* Detailed Hiring Party Information (Optional) */}
                <div className="bg-[#fcf9f2] border border-[#e3dec9]/60 p-4 rounded-xl space-y-3.5">
                  <span className="block text-[#a0522d] font-black text-xs uppercase tracking-wider">
                    🏥 Clinic / Hiring Entity Detailed info (Recommended)
                  </span>
                  <p className="text-[10px] text-[#7a766f] font-semibold leading-normal">
                    Provide supplementary details regarding your medical facility, equipment, and contact lines so professional candidates can reach you or verify your clinic profile quickly.
                  </p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Direct contact query line */}
                    <div>
                      <label className="block text-[10px] font-black uppercase text-[#5a5a40] mb-1">
                        Direct Query Contact Num / WhatsApp
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 03001234567"
                        value={clinicContactPhone}
                        onChange={(e) => setClinicContactPhone(e.target.value)}
                        className="w-full bg-white border border-[#e3dec9] rounded-xl px-3 py-2 text-xs font-semibold text-[#3c3c3b] focus:outline-none focus:ring-1 focus:ring-[#5a5a40]"
                      />
                    </div>

                    {/* Clinic website / FB page */}
                    <div>
                      <label className="block text-[10px] font-black uppercase text-[#5a5a40] mb-1">
                        Clinic Website or Social Handle URL
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. facebook.com/peshawarvethospital"
                        value={clinicWebsite}
                        onChange={(e) => setClinicWebsite(e.target.value)}
                        className="w-full bg-white border border-[#e3dec9] rounded-xl px-3 py-2 text-xs font-semibold text-[#3c3c3b] focus:outline-none focus:ring-1 focus:ring-[#5a5a40]"
                      />
                    </div>

                    {/* Detailed physical address */}
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-black uppercase text-[#5a5a40] mb-1">
                        Detailed Address & Neighboring Landmarks
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Shop # 2, Near Shell Pump, Phase 5 DHA, Karachi"
                        value={clinicAddress}
                        onChange={(e) => setClinicAddress(e.target.value)}
                        className="w-full bg-white border border-[#e3dec9] rounded-xl px-3 py-2 text-xs font-semibold text-[#3c3c3b] focus:outline-none focus:ring-1 focus:ring-[#5a5a40]"
                      />
                    </div>

                    {/* Equipment & Facilities list */}
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-black uppercase text-[#5a5a40] mb-1">
                        Clinical Equipment & Specialized Departments
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. In-house diagnostics, Gas anesthesia, ICU Incubators, Pet Grooming"
                        value={clinicFacilities}
                        onChange={(e) => setClinicFacilities(e.target.value)}
                        className="w-full bg-white border border-[#e3dec9] rounded-xl px-3 py-2 text-xs font-semibold text-[#3c3c3b] focus:outline-none focus:ring-1 focus:ring-[#5a5a40]"
                      />
                    </div>
                  </div>
                </div>

                {/* Salary inputs */}
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-[#5a5a40] mb-1.5">
                    Salary Range (monthly PKR) (*)
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="number"
                      required
                      placeholder="Min PKR"
                      value={salaryMin}
                      onChange={(e) => setSalaryMin(e.target.value)}
                      className="w-full bg-white border border-[#e3dec9] rounded-xl px-4 py-3 text-sm font-semibold text-[#3c3c3b] focus:outline-none focus:ring-1 focus:ring-[#5a5a40]"
                    />
                    <input
                      type="number"
                      required
                      placeholder="Max PKR"
                      value={salaryMax}
                      onChange={(e) => setSalaryMax(e.target.value)}
                      className="w-full bg-white border border-[#e3dec9] rounded-xl px-4 py-3 text-sm font-semibold text-[#3c3c3b] focus:outline-none focus:ring-1 focus:ring-[#5a5a40]"
                    />
                  </div>
                  <p className="text-[10px] text-[#a49f92] mt-1 font-semibold text-amber-800">
                    ⚠️ Transparent monthly PKR salary is required in Pakistani markets. Listings with "competitive" are prohibited.
                  </p>
                </div>

                {/* Experience requirement */}
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-[#5a5a40] mb-1.5">
                    Experience & Specific Skills required (*)
                  </label>
                  <textarea
                    required
                    placeholder="e.g. 2 years minimum, experienced in X-ray handling, anesthesia monitoring, canine care..."
                    value={experience}
                    rows={2}
                    onChange={(e) => setExperience(e.target.value)}
                    className="w-full bg-white border border-[#e3dec9] rounded-xl px-4 py-3 text-sm font-semibold text-[#3c3c3b] focus:outline-none focus:ring-1 focus:ring-[#5a5a40]"
                  />
                </div>

                {/* Working hours & Shifts */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-[#5a5a40] mb-1.5">
                      Working hours & Shift expectancy (*)
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 9:00 AM - 6:00 PM, alternate weekends"
                      value={workingHours}
                      onChange={(e) => setWorkingHours(e.target.value)}
                      className="w-full bg-white border border-[#e3dec9] rounded-xl px-4 py-3 text-sm font-semibold text-[#3c3c3b] focus:outline-none focus:ring-1 focus:ring-[#5a5a40]"
                    />
                  </div>

                  {/* Gender preference */}
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-[#5a5a40] mb-1.5">
                      Gender Preference
                    </label>
                    <select
                      value={genderPreference}
                      onChange={(e) => setGenderPreference(e.target.value as any)}
                      className="w-full bg-white border border-[#e3dec9] rounded-xl px-4 py-3 text-sm font-semibold text-[#3c3c3b] focus:outline-none focus:ring-1 focus:ring-[#5a5a40]"
                    >
                      <option value="No Preference">No Preference</option>
                      <option value="Male">Male Preference</option>
                      <option value="Female">Female Preference</option>
                    </select>
                  </div>
                </div>

                {/* Deadline & Positions */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-[#5a5a40] mb-1.5">
                      Application Deadline (*)
                    </label>
                    <input
                      type="date"
                      required
                      value={deadline}
                      onChange={(e) => setDeadline(e.target.value)}
                      className="w-full bg-white border border-[#e3dec9] rounded-xl px-4 py-3 text-sm font-semibold text-[#3c3c3b] focus:outline-none focus:ring-1 focus:ring-[#5a5a40]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-[#5a5a40] mb-1.5">
                      Number of positions available
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={positions}
                      onChange={(e) => setPositions(parseInt(e.target.value) || 1)}
                      className="w-full bg-white border border-[#e3dec9] rounded-xl px-4 py-3 text-sm font-semibold text-[#3c3c3b] focus:outline-none focus:ring-1 focus:ring-[#5a5a40]"
                    />
                  </div>
                </div>

                {/* Auto reject minimum qualification gate */}
                <div className="bg-[#fcf9f2] border border-[#e3dec9] p-4 rounded-xl space-y-2">
                  <span className="block text-[#a0522d] font-black text-xs uppercase tracking-wider">
                    ⚡ Auto-Reject Filter (Minimum qualification Gate)
                  </span>
                  <p className="text-[10px] text-[#7a766f] font-semibold">
                    Candidates who do not possess the minimum role qualification selected below will be auto-reject filtered on applying, avoiding clutter in your clinic dashboard.
                  </p>
                  <div className="flex gap-4 pt-1 flex-wrap">
                    {[
                      { val: 'none', label: 'Open (Any account can apply)' },
                      { val: 'doctor', label: 'Veterinarian (Doctors ONLY)' }
                    ].map(opt => (
                      <label key={opt.val} className="flex items-center gap-1.5 text-xs font-bold text-[#3c3c3b] cursor-pointer">
                        <input
                          type="radio"
                          name="gate"
                          value={opt.val}
                          checked={minQualificationGate === opt.val}
                          onChange={() => setMinQualificationGate(opt.val as any)}
                          className="accent-[#a0522d]"
                        />
                        <span>{opt.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Custom screening questions lists */}
                <div className="border-t border-[#f4f1e9] pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="block text-[#5a5a40] font-black text-xs uppercase tracking-wider">
                      📋 Custom Candidate Screening Questions (Max 3)
                    </span>
                    <button
                      type="button"
                      onClick={handleAddQuestion}
                      className="text-xs font-bold text-[#a0522d] hover:underline flex items-center bg-transparent border-none cursor-pointer"
                    >
                      + Add Question
                    </button>
                  </div>
                  
                  <div className="space-y-2">
                    {screeningQuestions.map((q, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder={`Screening question #${idx + 1} (e.g. Do you have training in surgical anesthesia?)`}
                          value={q}
                          onChange={(e) => handleQuestionChange(idx, e.target.value)}
                          className="flex-1 bg-white border border-[#e3dec9] rounded-xl px-4 py-2.5 text-xs font-semibold text-[#3c3c3b] focus:outline-none focus:ring-1 focus:ring-[#5a5a40]"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveQuestion(idx)}
                          className="bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 p-2 rounded-xl text-xs"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Required Documents check lists */}
                <div className="border-t border-[#f4f1e9] pt-4 space-y-2">
                  <span className="block text-[#5a5a40] font-black text-xs uppercase tracking-wider">
                    📎 Mandated Application Verification documents
                  </span>
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    {[
                      { name: 'CV', label: 'Curriculum Vitae (CV) Profile Text' },
                      { name: 'Degree Certificate', label: 'Academic Vet Degree Proof' },
                      { name: 'License Number', label: 'Govt. Veterinary License ID' },
                      { name: 'Reference Contacts', label: 'Previous Clinical Reference' }
                    ].map(doc => {
                      const isCV = doc.name === 'CV';
                      const isChecked = requiredDocs.includes(doc.name);
                      return (
                        <button
                          key={doc.name}
                          type="button"
                          onClick={() => handleDocToggle(doc.name)}
                          className={`flex items-center justify-between px-3.5 py-3 rounded-xl border text-left cursor-pointer transition-all ${
                            isChecked
                              ? 'bg-[#5a5a40] text-white border-[#5a5a40]'
                              : 'bg-white text-[#5a5a40] border-[#e3dec9] hover:bg-[#fcf9f2]'
                          }`}
                        >
                          <span className="text-xs font-bold leading-tight">{doc.label}</span>
                          {isChecked ? (
                            <Check className="w-4 h-4 text-[#e3dec9] shrink-0 ml-1" />
                          ) : (
                            <Plus className="w-4 h-4 text-[#a49f92] shrink-0 ml-1" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Submit button drawer */}
                <div className="border-t border-[#f4f1e9] pt-4 flex gap-3 justify-end leading-none">
                  <button
                    type="button"
                    onClick={() => setIsPostModalOpen(false)}
                    className="cursor-pointer bg-transparent border border-[#e3dec9] text-[#7a766f] hover:bg-[#fcf9f2] font-bold text-xs py-3.5 px-5 rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitLoading}
                    className="cursor-pointer bg-[#a0522d] text-white border-b-4 border-[#69351d] hover:bg-[#8b4513] font-bold text-xs py-3.5 px-6 rounded-xl transition-all flex items-center justify-center gap-1.5"
                  >
                    {submitLoading ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Publishing ad...</span>
                      </>
                    ) : (
                      <span>Publish job listing</span>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─────────────────────────────────────────────────────────────────
          MODAL B: STUDENT / DOCTOR CANDIDATE SUBMIT APPLICATION FORM
          ───────────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {selectedJobToApply && (
          <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-xs"
              onClick={() => setSelectedJobToApply(null)}
            />

            <motion.div
              initial={{ y: 50, scale: 0.95, opacity: 0 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              exit={{ y: 50, scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-xl bg-[#fdfbf7] border border-[#e3dec9] border-b-[5px] border-[#cdc6ad] rounded-2xl p-6 shadow-2xl overflow-y-auto max-h-[90vh]"
            >
              <button
                onClick={() => setSelectedJobToApply(null)}
                className="absolute top-4 right-4 p-2 rounded-full border border-[#e3dec9] bg-white text-[#7a766f] hover:bg-[#fcf9f2] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="mb-4">
                <span className="bg-[#ece8df] text-[#5a5a40] text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border border-[#e3dec9]">
                  📝 CLINICAL INTAKE APPLICATION
                </span>
                <h2 className="text-xl font-serif font-black text-[#3c3c3b] mt-1 leading-tight">
                  {selectedJobToApply.title}
                </h2>
                <p className="text-xs text-[#a0522d] font-bold">🏥 {selectedJobToApply.clinicName} · {selectedJobToApply.location}</p>
              </div>

              <form onSubmit={handleApplySubmit} className="space-y-4">
                {applyError && (
                  <div className="bg-red-50 text-red-800 text-xs py-3 px-4 rounded-xl border border-red-200 flex items-center gap-2 font-semibold">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{applyError}</span>
                  </div>
                )}

                {/* Candidate pre-loaded stats review snippet */}
                <div className="bg-[#fcf9f2] p-3 rounded-xl border border-[#e3dec9] text-[11px] font-bold text-[#5a5a40] space-y-1">
                  <div>👤 Applicant Name: {currentUser.name}</div>
                  <div>📧 Contact Email: {currentUser.email}</div>
                  <div>💼 Your Role: {currentUser.role.toUpperCase()}</div>
                </div>

                {/* Screening questions inputs */}
                {selectedJobToApply.screeningQuestions.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <h3 className="text-xs font-black uppercase tracking-wider text-[#a0522d]">
                      📋 Screening Questions asked by Hospital
                    </h3>
                    
                    {selectedJobToApply.screeningQuestions.map((q, idx) => (
                      <div key={idx} className="space-y-1">
                        <label className="block text-xs font-bold text-[#3c3c3b]">
                          {idx + 1}. {q} (*)
                        </label>
                        <input
                          type="text"
                          required
                          value={applyAnswers[idx] || ''}
                          onChange={(e) => {
                            const updated = [...applyAnswers];
                            updated[idx] = e.target.value;
                            setApplyAnswers(updated);
                          }}
                          placeholder="Your answer..."
                          className="w-full bg-white border border-[#e3dec9] rounded-xl px-3.5 py-2.5 text-xs font-semibold text-[#3c3c3b] focus:outline-none focus:ring-1 focus:ring-[#5a5a40]"
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* Credential submissions textareas */}
                <div className="space-y-3 pt-2 border-t border-[#f4f1e9]">
                  <h3 className="text-xs font-black uppercase tracking-wider text-[#5a5a40]">
                    📎 Fill in mandated credentials documents
                  </h3>

                  {selectedJobToApply.requiredDocuments.includes('CV') && (
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-[#3c3c3b]">
                        Write CV Credentials or Experience summary (*)
                      </label>
                      <textarea
                        required
                        placeholder="Detail your professional clinics timeline, surgeries assisted, general animal handling skills, and academic years..."
                        value={cvText}
                        rows={3}
                        onChange={(e) => setCvText(e.target.value)}
                        className="w-full bg-white border border-[#e3dec9] rounded-xl px-3.5 py-2.5 text-xs font-semibold text-[#3c3c3b] focus:outline-none focus:ring-1 focus:ring-[#5a5a40]"
                      />
                    </div>
                  )}

                  {selectedJobToApply.requiredDocuments.includes('Degree Certificate') && (
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-[#3c3c3b]">
                        Veterinary Academic Degree Details / Cert (*)
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. DVM Graduate from University of Agriculture Peshawar, Year 2024"
                        value={degreeText}
                        onChange={(e) => setDegreeText(e.target.value)}
                        className="w-full bg-white border border-[#e3dec9] rounded-xl px-3.5 py-2.5 text-xs font-semibold text-[#3c3c3b] focus:outline-none focus:ring-1 focus:ring-[#5a5a40]"
                      />
                    </div>
                  )}

                  {selectedJobToApply.requiredDocuments.includes('License Number') && (
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-[#3c3c3b]">
                        Registered Clinical Veterinarian License ID (*)
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. RV-9843-PK"
                        value={licenseNumber}
                        onChange={(e) => setLicenseNumber(e.target.value)}
                        className="w-full bg-white border border-[#e3dec9] rounded-xl px-3.5 py-2.5 text-xs font-semibold text-[#3c3c3b] focus:outline-none focus:ring-1 focus:ring-[#5a5a40]"
                      />
                    </div>
                  )}

                  {selectedJobToApply.requiredDocuments.includes('Reference Contacts') && (
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-[#3c3c3b]">
                        Clinical Professional Reference Contact details (*)
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Dr. Sabir Khan, sabir@hospital.com, 03001234567"
                        value={references}
                        onChange={(e) => setReferences(e.target.value)}
                        className="w-full bg-white border border-[#e3dec9] rounded-xl px-3.5 py-2.5 text-xs font-semibold text-[#3c3c3b] focus:outline-none focus:ring-1 focus:ring-[#5a5a40]"
                      />
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-[#f4f1e9] flex gap-3 justify-end items-center">
                  <button
                    type="button"
                    onClick={() => setSelectedJobToApply(null)}
                    className="cursor-pointer bg-transparent border border-[#e3dec9] text-[#7a766f] hover:bg-[#fcf9f2] font-bold text-xs py-3.5 px-5 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={applyLoading}
                    className="cursor-pointer bg-[#a0522d] text-white border-b-4 border-[#69351d] hover:bg-[#8b4513] font-bold text-xs py-3.5 px-6 rounded-xl transition-all flex items-center justify-center gap-1.5"
                  >
                    {applyLoading ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Submitting to clinic...</span>
                      </>
                    ) : (
                      <span>Submit Application</span>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─────────────────────────────────────────────────────────────────
          MODAL C: CLINIC APPLICANTS DASHBOARD MODAL/PANE 
          ───────────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {viewingJobApplicants && (
          <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-xs"
              onClick={() => setViewingJobApplicants(null)}
            />

            <motion.div
              initial={{ y: 50, scale: 0.95, opacity: 0 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              exit={{ y: 50, scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-4xl bg-[#fdfbf7] border border-[#e3dec9] border-b-[5px] border-[#cdc6ad] rounded-2xl p-6 shadow-2xl overflow-y-auto max-h-[95vh]"
            >
              <button
                onClick={() => setViewingJobApplicants(null)}
                className="absolute top-4 right-4 p-2 rounded-full border border-[#e3dec9] bg-white text-[#7a766f] hover:bg-[#fcf9f2] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="mb-6">
                <span className="bg-[#5a5a40] text-white text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border border-[#3e3e2b]">
                  👥 APPLET MANAGERS DASHBOARD
                </span>
                <h2 className="text-xl font-serif font-black text-[#3c3c3b] mt-1.5 leading-none">
                  Applicants for "{viewingJobApplicants.title}"
                </h2>
                <p className="text-xs text-[#7a766f] font-semibold mt-1">
                  Manage screening responses, credentials verification, and allocate status tags below.
                </p>
              </div>

              {loadingApps ? (
                <div className="py-12 text-center text-[#7a766f] font-bold flex flex-col items-center justify-center gap-2">
                  <div className="w-8 h-8 border-3 border-[#e3dec9] border-t-[#a0522d] rounded-full animate-spin" />
                  <span>Retrieving dashboard submissions...</span>
                </div>
              ) : currentJobApps.length === 0 ? (
                <div className="py-16 text-center border-2 border-dashed border-[#e3dec9] rounded-2xl bg-white">
                  <Users className="w-10 h-10 text-[#a49f92] mx-auto mb-3" />
                  <p className="text-xs font-bold text-[#3c3c3b]">No Active Applicants Yet</p>
                  <p className="text-[10px] text-[#7a766f] max-w-xs mx-auto">
                    This job posting is live but hasn't received matching qualifications yet. Keep checking!
                  </p>
                </div>
              ) : (
                <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
                  {currentJobApps.map(app => (
                    <div 
                      key={app.id}
                      className="bg-white border border-[#e3dec9] border-b-[3px] border-b-[#cdc6ad] rounded-xl p-5 space-y-4"
                    >
                      {/* Name, role header, status select */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#f4f1e9] pb-3">
                        <div>
                          <h4 className="text-sm font-black text-[#3c3c3b]">
                            {app.applicantName} <span className="bg-amber-50 text-amber-700 text-[9px] uppercase px-2 py-0.5 rounded border border-amber-200 ml-1.5 inline-block">{app.applicantRole}</span>
                          </h4>
                          <p className="text-xs text-[#7a766f] font-medium">✉ Contact: {app.applicantEmail} · Phone: {app.applicantPhone}</p>
                        </div>

                        {/* Status Select action tag */}
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-bold text-[#7a766f]">Status:</span>
                          <select
                            value={app.status}
                            onChange={(e) => handleUpdateApplicationStatus(app.id, e.target.value as any)}
                            className="bg-[#fcf9f2] border border-[#e3dec9] rounded-lg px-2.5 py-1.5 text-xs font-black text-[#a0522d] focus:outline-none focus:ring-1 focus:ring-[#5a5a40] cursor-pointer"
                          >
                            <option value="Pending">Pending</option>
                            <option value="Reviewed">Reviewed</option>
                            <option value="Shortlisted">Shortlisted</option>
                            <option value="Rejected">Rejected</option>
                            <option value="Hired">🏆 Hired</option>
                          </select>
                        </div>
                      </div>

                      {/* Answers to screening questions */}
                      {app.answers && app.answers.length > 0 && (
                        <div className="space-y-1.5 bg-[#fcf9f2] p-3 rounded-lg border border-[#e3dec9]">
                          <span className="block text-[10px] font-black uppercase text-[#a0522d] tracking-wider">Candidate Screening Responses:</span>
                          {viewingJobApplicants.screeningQuestions.map((q, idx) => (
                            <div key={idx} className="text-xs text-[#3c3c3b] font-medium leading-relaxed">
                              <strong className="text-[#5a5a40]">Q: {q}</strong>
                              <p className="pl-3 text-emerald-800 font-bold">➔ {app.answers[idx] || 'N/A'}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Provided documents list */}
                      <div className="space-y-3 pt-1">
                        <span className="block text-[10px] font-black uppercase text-[#5a5a40] tracking-wider">Verified Qualifications Narrative:</span>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {app.submittedDocs.cvText && (
                            <div className="border border-[#e3dec9] p-3 rounded-lg bg-[#fcf9f2]/30 space-y-1">
                              <span className="text-[10px] font-bold uppercase text-[#7a766f] block">Curriculum Vitae (CV)</span>
                              <p className="text-xs text-[#3c3c3b] font-medium whitespace-pre-wrap leading-relaxed max-h-32 overflow-y-auto">{app.submittedDocs.cvText}</p>
                            </div>
                          )}

                          <div className="space-y-2">
                            {app.submittedDocs.degreeLinkOrText && (
                              <div className="border border-[#e3dec9] p-3 rounded-lg bg-green-50/20">
                                <span className="text-[10px] font-bold uppercase text-green-700 block">Graduation Degree Evidence</span>
                                <span className="text-xs text-[#3c3c3b] font-bold leading-normal">{app.submittedDocs.degreeLinkOrText}</span>
                              </div>
                            )}

                            {app.submittedDocs.licenseNumber && (
                              <div className="border border-[#e3dec9] p-3 rounded-lg bg-blue-50/20 flex items-center justify-between">
                                <div>
                                  <span className="text-[10px] font-bold uppercase text-blue-700 block">Govt. License Number ID</span>
                                  <span className="text-xs font-mono font-bold text-[#3c3c3b]">{app.submittedDocs.licenseNumber}</span>
                                </div>
                                <span className="text-[9px] bg-blue-100 text-blue-800 font-extrabold px-1.5 py-0.5 rounded">Checked</span>
                              </div>
                            )}

                            {app.submittedDocs.references && (
                              <div className="border border-[#e3dec9] p-3 rounded-lg bg-amber-50/20">
                                <span className="text-[10px] font-bold uppercase text-amber-700 block">Professional Reference Contact</span>
                                <p className="text-xs text-[#3c3c3b] font-medium">{app.submittedDocs.references}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-4 border-t border-[#f4f1e9] flex justify-end">
                <button
                  type="button"
                  onClick={() => setViewingJobApplicants(null)}
                  className="cursor-pointer bg-[#5a5a40] hover:bg-[#3e3e2b] text-white border-b-2 border-b-[#2a2a1d] font-bold text-xs py-3 px-5 rounded-xl transition-all"
                >
                  Close Applicants Dashboard
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Beautiful, Sandbox-Safe Custom Confirm Modal */}
        {confirmDialog && (
          <div className="fixed inset-0 z-[600] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-xs"
              onClick={() => {
                if (!confirmLoading) setConfirmDialog(null);
              }}
            />

            <motion.div
              initial={{ y: 30, scale: 0.95, opacity: 0 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              exit={{ y: 30, scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md bg-[#fdfbf7] border border-[#e3dec9] border-b-[5px] border-[#cdc6ad] rounded-2xl p-6 shadow-2xl z-10"
            >
              <div className="flex items-start gap-4">
                <span className="text-2xl shrink-0" role="img" aria-hidden="true">
                  {confirmDialog.isDestructive ? '⚠️' : 'ℹ️'}
                </span>
                <div className="space-y-2 flex-grow">
                  <h3 className="text-sm font-black text-[#3c3c3b] uppercase tracking-wide leading-snug">
                    {confirmDialog.title}
                  </h3>
                  <p className="text-xs text-[#5a5a40] font-semibold leading-relaxed">
                    {confirmDialog.description}
                  </p>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-2.5">
                {!confirmDialog.isAlertOnly && (
                  <button
                    type="button"
                    disabled={confirmLoading}
                    onClick={() => setConfirmDialog(null)}
                    className="cursor-pointer bg-white border border-[#e3dec9] hover:bg-[#fcf9f2] text-[#7a766f] font-bold text-xs py-2 px-4 rounded-xl transition-all disabled:opacity-50"
                  >
                    {confirmDialog.cancelText || 'Cancel'}
                  </button>
                )}
                <button
                  type="button"
                  disabled={confirmLoading}
                  onClick={async () => {
                    setConfirmLoading(true);
                    try {
                      await confirmDialog.onConfirm();
                    } catch (err) {
                      console.error(err);
                    } finally {
                      setConfirmLoading(false);
                      setConfirmDialog(null);
                    }
                  }}
                  className={`cursor-pointer font-bold text-xs py-2.5 px-4 rounded-xl border-b-2 transition-all flex items-center gap-1.5 disabled:opacity-50 ${
                    confirmDialog.isDestructive
                      ? 'bg-red-600 hover:bg-red-700 text-white border-b-red-800'
                      : 'bg-[#a0522d] hover:bg-[#8b4513] text-white border-b-[#69351d]'
                  }`}
                >
                  {confirmLoading && (
                    <span className="inline-block animate-spin">⏱️</span>
                  )}
                  <span>{confirmDialog.confirmText}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
    </div>
  );
}
