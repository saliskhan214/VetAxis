import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from 'motion/react';
import {
  Plus,
  Trash2,
  UserPlus,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Calendar,
  Search,
  FileText,
  Users,
  Check,
  X,
  Shield,
  Activity,
  TrendingUp,
  ChevronRight,
  ChevronLeft,
  Info,
  MapPin,
  Lock,
  PlusCircle,
  Stethoscope
} from 'lucide-react';

import { LivestockService, addDays, addMonths } from '../lib/livestockService';
import { NotificationService } from '../lib/storage';
import { ExploreService, PromotionalAdsService } from '../lib/storage';
import {
  UserProfile,
  LivestockFarm,
  LivestockAnimal,
  LivestockBatch,
  LivestockTask,
  FarmType,
  MixedFarmOptions,
  IndividualAnimalRecord,
  HerdLevelMasterRecord
} from '../types';

import FarmAnalyticsDashboard from './FarmAnalyticsDashboard';
import { OfflineModeIndicator } from './OfflineModeIndicator';
import { SyncStatusManager } from './SyncStatusManager';

interface LivestockManagementProps {
  currentUser: UserProfile;
  highlightFarmId?: string | null;
  scannedAnimalRecordId?: string | null;
  onClearScannedAnimal?: () => void;
}

export default function LivestockManagement({
  currentUser,
  highlightFarmId,
  scannedAnimalRecordId,
  onClearScannedAnimal
}: LivestockManagementProps) {
  // Services & list state
  const [farms, setFarms] = useState<LivestockFarm[]>([]);
  const [selectedFarm, setSelectedFarm] = useState<LivestockFarm | null>(null);
  const [animals, setAnimals] = useState<LivestockAnimal[]>([]);
  const [batches, setBatches] = useState<LivestockBatch[]>([]);
  const [tasks, setTasks] = useState<LivestockTask[]>([]);
  const [allProfessionals, setAllProfessionals] = useState<UserProfile[]>([]);

  // UI state navigation within Livestock tab
  const [activeSubTab, setActiveSubTab] = useState<'dashboard' | 'analytics' | 'animals' | 'batches' | 'tasks' | 'team'>('dashboard');
  const [isLoading, setIsLoading] = useState(true);

  // Search clinicians & assign states
  const [vetSearchQuery, setVetSearchQuery] = useState('');
  const [isAssigningVet, setIsAssigningVet] = useState(false);

  // Invitation workflow states
  const [declineReasonModal, setDeclineReasonModal] = useState<string | null>(null); // task id or invite target
  const [declineReasonText, setDeclineReasonText] = useState('');

  // Creation forms states
  const [showCreateFarmModal, setShowCreateFarmModal] = useState(false);
  const [newFarmName, setNewFarmName] = useState('');
  const [newFarmLocation, setNewFarmLocation] = useState('');
  const [newFarmType, setNewFarmType] = useState<FarmType>('Dairy Farm');
  const [newMixedOptions, setNewMixedOptions] = useState<MixedFarmOptions>({
    cattle: true,
    buffalo: false,
    goats: false,
    sheep: false,
    poultry: false
  });

  // Individual animal form states
  const [showAddAnimalForm, setShowAddAnimalForm] = useState(false);
  const [animalIdInput, setAnimalIdInput] = useState('');
  const [animalSpecies, setAnimalSpecies] = useState<'Cattle' | 'Buffalo' | 'Goat' | 'Sheep' | 'Poultry' | 'Other'>('Cattle');
  const [tagNumber, setTagNumber] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female'>('Female');
  const [dob, setDob] = useState('');
  const [breed, setBreed] = useState('');
  const [weight, setWeight] = useState('');
  const [healthStatus, setHealthStatus] = useState<'Healthy' | 'Sick' | 'Under Treatment' | 'Quarantined'>('Healthy');

  // Comprehensive Records States
  const [individualRecords, setIndividualRecords] = useState<IndividualAnimalRecord[]>([]);
  const [herdRecords, setHerdRecords] = useState<HerdLevelMasterRecord[]>([]);
  const [selectedAnimalIds, setSelectedAnimalIds] = useState<string[]>([]);

  // VetAxis QR Dynamic Pass (Digital Health Card) States
  const [showQrPassModal, setShowQrPassModal] = useState<boolean>(false);
  const [qrActiveTab, setQrActiveTab] = useState<'pass' | 'ancestry' | 'clinical' | 'feeding'>('pass');
  const [selectedQrAnimal, setSelectedQrAnimal] = useState<IndividualAnimalRecord | null>(null);
  const [scannedAndViewing, setScannedAndViewing] = useState<boolean>(false);

  const [activeIndividualRecord, setActiveIndividualRecord] = useState<Partial<IndividualAnimalRecord> | null>(null);
  const [showIndividualRecordModal, setShowIndividualRecordModal] = useState<boolean>(false);
  const [isEditingIndividual, setIsEditingIndividual] = useState<boolean>(false);
  const [indFormStep, setIndFormStep] = useState<number>(0); 

  const [activeHerdRecord, setActiveHerdRecord] = useState<Partial<HerdLevelMasterRecord> | null>(null);
  const [showHerdRecordModal, setShowHerdRecordModal] = useState<boolean>(false);
  const [isEditingHerd, setIsEditingHerd] = useState<boolean>(false);
  const [herdFormStep, setHerdFormStep] = useState<number>(0);

  const [recordDisplayTab, setRecordDisplayTab] = useState<'registry' | 'individualDetailed' | 'herdDetailed'>('registry');
  const stepContainerRef = useRef<HTMLDivElement>(null);
  const herdStepContainerRef = useRef<HTMLDivElement>(null);

  // Batch animal form states
  const [showAddBatchForm, setShowAddBatchForm] = useState(false);
  const [batchName, setBatchName] = useState('');
  const [batchSpecies, setBatchSpecies] = useState<'Cattle' | 'Buffalo' | 'Goat' | 'Sheep' | 'Poultry' | 'Other'>('Poultry');
  const [batchQuantity, setBatchQuantity] = useState('');
  const [batchArrivalDate, setBatchArrivalDate] = useState('');
  const [batchBreed, setBatchBreed] = useState('');

  // Scheduling manual tasks
  const [showAddTaskForm, setShowAddTaskForm] = useState(false);
  const [taskServiceType, setTaskServiceType] = useState('Vaccination');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [taskTargetType, setTaskTargetType] = useState<'individual' | 'batch'>('individual');
  const [taskTargetId, setTaskTargetId] = useState('');
  const [taskNotes, setTaskNotes] = useState('');

  // Task completion states
  const [taskCompletionModal, setTaskCompletionModal] = useState<LivestockTask | null>(null);
  const [completionVaccine, setCompletionVaccine] = useState('');
  const [completionNotes, setCompletionNotes] = useState('');

  // Invite team member modal
  const [showTeamInvite, setShowTeamInvite] = useState(false);
  const [teamMemberName, setTeamMemberName] = useState('');
  const [teamMemberEmail, setTeamMemberEmail] = useState('');
  const [teamMemberRole, setTeamMemberRole] = useState<'Manager' | 'Worker' | 'Veterinarian' | 'Assistant'>('Worker');

  // Sandbox-Safe Custom Confirmation Modal Dialog states
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    description: string;
    confirmText: string;
    cancelText?: string;
    isDestructive?: boolean;
    onConfirm: () => void | Promise<void>;
  } | null>(null);
  const [confirmLoading, setConfirmLoading] = useState<boolean>(false);

  // Automatically scroll screen to top/start of popup when any modal opens
  useEffect(() => {
    if (
      showCreateFarmModal || 
      declineReasonModal || 
      taskCompletionModal || 
      showIndividualRecordModal || 
      showHerdRecordModal || 
      showQrPassModal || 
      confirmDialog
    ) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [
    showCreateFarmModal, 
    declineReasonModal, 
    taskCompletionModal, 
    showIndividualRecordModal, 
    showHerdRecordModal, 
    showQrPassModal, 
    confirmDialog
  ]);

  // Manual Offline overrides & synchronize control hooks
  const [isOfflineModeActive, setIsOfflineModeActive] = useState<boolean>(!navigator.onLine);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  useEffect(() => {
    LivestockService.setOfflineOverride(isOfflineModeActive);
  }, [isOfflineModeActive]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOfflineModeActive(false);
    };
    const handleOffline = () => {
      setIsOfflineModeActive(true);
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleSyncData = async () => {
    setIsSyncing(true);
    try {
      await LivestockService.syncOfflineDataWithServer();
      await loadGlobalData();
      
      setConfirmDialog({
        title: "Synchronization Successful",
        description: "Local agricultural and livestock offline records synchronized safely with the live Cloud database backend!",
        confirmText: "Excellent",
        onConfirm: () => setConfirmDialog(null)
      });
    } catch (err) {
      console.error('Failed to sync offline storage:', err);
      setConfirmDialog({
        title: "Sync Problem",
        description: "Verify internet signal level and try again when signal is active.",
        confirmText: "Ok",
        onConfirm: () => setConfirmDialog(null)
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // Helper date function for automatic scheduling
  const addDays = (dateStr: string, daysStrNum: number) => {
    const date = new Date(dateStr);
    date.setDate(date.getDate() + daysStrNum);
    return date.toISOString().split('T')[0];
  };

  // Time-Saving Bulk Actions for Doctors/clinics
  const handleBulkDeDewormOrVaccinate = async () => {
    if (!selectedFarm || animals.length === 0) return;
    
    setConfirmDialog({
      title: "Bulk Health Booster Loop",
      description: `This will auto-schedule standard vaccination & deworming booster alerts (due in tomorrow's cycle) for all ${animals.length} animals on this farm with a single click.`,
      confirmText: "Schedule For All",
      onConfirm: async () => {
        try {
          for (const a of animals) {
            await LivestockService.createTask({
              farmId: selectedFarm.id,
              targetId: a.id,
              targetType: 'individual',
              targetName: `${a.species} Tag# ${a.tagNumber || a.animalId}`,
              serviceType: 'Booster Vaccination',
              dueDate: addDays(new Date().toISOString().split('T')[0], 1),
              status: 'Pending',
              notes: 'Automatical bulk scheduler deworming loop booster cycle.',
              createdBy: 'manual',
              autoScheduleNext: true
            });
          }
          await loadFarmDetails(selectedFarm.id);
          
          setConfirmDialog({
            title: "Bulk Cycle Scheduled",
            description: `Successfully scheduled booster vaccination alerts for all ${animals.length} animals on this farm workspace!`,
            confirmText: "Perfect",
            onConfirm: () => setConfirmDialog(null)
          });
        } catch (err) {
          console.error(err);
        }
      }
    });
  };

  const handleBulkMarkAllHealthy = async () => {
    if (!selectedFarm || animals.length === 0) return;

    setConfirmDialog({
      title: "Bulk Health Diagnostics Completed",
      description: `Are you sure you want to mark all ${animals.length} animals on this farm as "Healthy" at once? This overrides individual statuses instantly.`,
      confirmText: "Mark All Healthy",
      onConfirm: async () => {
        try {
          for (const a of animals) {
            await LivestockService.updateAnimal(a.id, { healthStatus: 'Healthy' });
          }
          await loadFarmDetails(selectedFarm.id);
          
          setConfirmDialog({
            title: "Diagnostics Logged",
            description: `Successfully declared healthy status for all ${animals.length} registered animals!`,
            confirmText: "Great",
            onConfirm: () => setConfirmDialog(null)
          });
        } catch (err) {
          console.error(err);
        }
      }
    });
  };

  // Trigger loading state
  const isClinician = currentUser.role === 'doctor' || currentUser.role === 'clinic' || currentUser.role === 'assistant';

  // Sliding banner & promotion states for Livestock Section
  const [currentSlideIdx, setCurrentSlideIdx] = useState<number>(0);
  const [promoPaused, setPromoPaused] = useState<boolean>(false);
  const [dbAds, setDbAds] = useState<any[]>([]);

  // 3D Tilt orientation & Gloss Reflection for Billboard Card inside Livestock
  const billboardRef = useRef<HTMLDivElement>(null);
  const [bHovered, setBHovered] = useState<boolean>(false);
  const bx = useMotionValue(0.5);
  const by = useMotionValue(0.5);

  const brotateX = useTransform(by, [0, 1], [6, -6]);
  const brotateY = useTransform(bx, [0, 1], [-6, 6]);

  const bspringX = useSpring(brotateX, { stiffness: 150, damping: 22 });
  const bspringY = useSpring(brotateY, { stiffness: 150, damping: 22 });

  const bsheenX = useTransform(bx, [0, 1], ['130%', '-30%']);
  const bsheenY = useTransform(by, [0, 1], ['130%', '-30%']);

  const handleBillboardMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!billboardRef.current) return;
    const rect = billboardRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    bx.set(mouseX / width);
    by.set(mouseY / height);
    setBHovered(true);
    setPromoPaused(true);
  };

  const handleBillboardMouseLeave = () => {
    bx.set(0.5);
    by.set(0.5);
    setBHovered(false);
    setPromoPaused(false);
  };

  const BANNER_SLIDES_LIVESTOCK = [
    {
      id: 'welcome_production',
      type: 'welcome',
      sponsorName: '',
      badge: 'Livestock Network',
      icon: '🐄',
      bgGradient: "from-[#3c3c2b] via-[#52523b] to-[#6d6d4f]",
      borderColors: "border-[#52523b] border-b-[#303022]",
      title: "Self-Serve Livestock Production Hub",
      description: "Direct link with qualified local veterinarians, track herd schedule rosters, and ensure automated vaccine notifications.",
      couponCode: '',
      ctaText: '',
      ctaUrl: ''
    }
  ];

  const activeSlides = [...BANNER_SLIDES_LIVESTOCK, ...dbAds];

  const fetchCampaigns = async () => {
    try {
      const ads = await PromotionalAdsService.fetchActiveAds();
      const mapped = ads.map(ad => ({
        id: ad.id,
        type: 'promo',
        sponsorName: ad.sponsorName,
        title: ad.title,
        description: ad.description,
        couponCode: ad.couponCode || '',
        ctaText: ad.ctaText,
        ctaUrl: ad.ctaUrl,
        bgGradient: ad.bgGradient || "from-[#574c3c] via-[#433b2f] to-[#574c3c]",
        borderColors: "border-[#433b2f] border-b-[#2a241c]",
        badge: ad.badge || "Sponsored",
        icon: ad.icon || "📢",
        ownerUid: ad.ownerUid,
        expiresAt: ad.expiresAt,
        createdAt: ad.createdAt,
        pricePaid: ad.pricePaid,
        durationDays: ad.durationDays
      }));
      setDbAds(mapped);
    } catch (err) {
      console.error("Failed fetching dynamic promotion ads in Livestock", err);
    }
  };

  useEffect(() => {
    if (promoPaused) return;
    const timer = setInterval(() => {
      setCurrentSlideIdx((prev) => (prev + 1) % activeSlides.length);
    }, 10000);
    return () => clearInterval(timer);
  }, [promoPaused, activeSlides.length]);

  useEffect(() => {
    loadGlobalData();
    fetchCampaigns();
  }, [currentUser]);

  // Redirect to a highlighted farm on demand
  useEffect(() => {
    if (highlightFarmId && farms.length > 0) {
      const targetFarm = farms.find(f => f.id === highlightFarmId);
      if (targetFarm) {
        setSelectedFarm(targetFarm);
      }
    }
  }, [highlightFarmId, farms]);

  // Observe scanned animal record ID redirect
  useEffect(() => {
    if (scannedAnimalRecordId) {
      const loadScannedRecord = async () => {
        try {
          setIsLoading(true);
          const record = await LivestockService.fetchIndividualRecordById(scannedAnimalRecordId);
          if (record) {
            setSelectedQrAnimal(record);
            setShowQrPassModal(true);
            setScannedAndViewing(true);
            
            // Also automatically fetch and select the farm so they can see context if they have authorization
            const targetFarm = farms.find(f => f.id === record.farmId);
            if (targetFarm) {
              setSelectedFarm(targetFarm);
              await loadFarmDetails(targetFarm.id);
            } else {
              const scannedFarm = await LivestockService.fetchFarmById(record.farmId);
              if (scannedFarm) {
                setSelectedFarm(scannedFarm);
                await loadFarmDetails(scannedFarm.id);
              }
            }
          } else {
            alert("⚠️ The scanned VetAxis Dynamic Health Card was not found or is no longer registered inside the medical ledger database.");
            if (onClearScannedAnimal) {
              onClearScannedAnimal();
            }
          }
        } catch (err) {
          console.error("Failed to load scanned VetAxis record payload:", err);
        } finally {
          setIsLoading(false);
        }
      };
      
      loadScannedRecord();
    }
  }, [scannedAnimalRecordId]);

  const handleCloseQrPass = () => {
    setShowQrPassModal(false);
    setSelectedQrAnimal(null);
    setScannedAndViewing(false);
    setQrActiveTab('pass');
    if (onClearScannedAnimal) {
      onClearScannedAnimal();
    }
  };

  // Reload details when selected farm shifts
  useEffect(() => {
    if (selectedFarm) {
      loadFarmDetails(selectedFarm.id);
    }
  }, [selectedFarm]);

  // Inner step containers scroll reset to top instead of full page scrolling
  useEffect(() => {
    if (stepContainerRef.current) {
      stepContainerRef.current.scrollTop = 0;
    }
  }, [indFormStep, showIndividualRecordModal]);

  useEffect(() => {
    if (herdStepContainerRef.current) {
      herdStepContainerRef.current.scrollTop = 0;
    }
  }, [herdFormStep, showHerdRecordModal]);

  const scrollToPopupStart = (el: HTMLElement | null) => {
    if (el) {
      setTimeout(() => {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        const scrollParent = el.closest('.overflow-y-auto');
        if (scrollParent) {
          scrollParent.scrollTop = 0;
        }
      }, 50);
    }
  };

  const loadGlobalData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch farms
      const farmList = await LivestockService.fetchFarms();
      setFarms(farmList);

      // 2. Load potential clinicians
      const docs = await ExploreService.fetchProfessionals('doctor');
      const clinics = await ExploreService.fetchProfessionals('clinic');
      const assistants = await ExploreService.fetchProfessionals('assistant');
      setAllProfessionals([...(docs || []), ...(clinics || []), ...(assistants || [])]);

      // 3. Auto select highlight farm if matching, else default first farm
      if (highlightFarmId) {
        const targetFarm = farmList.find(f => f.id === highlightFarmId);
        if (targetFarm) {
          setSelectedFarm(targetFarm);
        }
      } else if (!isClinician && farmList.length > 0) {
        // filter farms where user resides in team
        const myFarms = farmList.filter(f =>
          f.ownerUid === currentUser.uid || f.team.some(member => member.uid === currentUser.uid)
        );
        if (myFarms.length > 0) {
          setSelectedFarm(myFarms[0]);
        }
      } else if (isClinician) {
        // Clinicians might see list of linked farms on dashboard
        const clinicianFarms = farmList.filter(f => f.managerUid === currentUser.uid);
        if (clinicianFarms.length > 0 && !selectedFarm) {
          setSelectedFarm(clinicianFarms[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load livestock dashboards:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadFarmDetails = async (farmId: string) => {
    try {
      const animalList = await LivestockService.fetchAnimals(farmId);
      setAnimals(animalList);

      const batchList = await LivestockService.fetchBatches(farmId);
      setBatches(batchList);

      const taskList = await LivestockService.fetchTasks(farmId);
      setTasks(taskList);

      // Fetch comprehensive records
      const indRecList = await LivestockService.fetchIndividualRecords(farmId);
      setIndividualRecords(indRecList);

      const herdRecList = await LivestockService.fetchHerdRecords(farmId);
      setHerdRecords(herdRecList);
    } catch (err) {
      console.error('Failed to load farm contextual assets:', err);
    }
  };

  // Check roles permissions
  const getMemberRole = (farm: LivestockFarm | null): 'Owner' | 'Manager' | 'Worker' | 'Veterinarian' | 'Assistant' | null => {
    if (!farm) return null;
    if (farm.ownerUid === currentUser.uid) return 'Owner';
    const match = farm.team.find(t => t.uid === currentUser.uid);
    if (match) return match.role;
    if (isClinician && farm.managerUid === currentUser.uid && farm.managerStatus === 'linked') return 'Veterinarian';
    return null;
  };

  const userRoleInSelectedFarm = getMemberRole(selectedFarm);

  // Permissions helper
  const canModifyFarmDetails = userRoleInSelectedFarm === 'Owner' || userRoleInSelectedFarm === 'Manager';
  const canModifyAnimals = userRoleInSelectedFarm === 'Owner' || userRoleInSelectedFarm === 'Manager' || userRoleInSelectedFarm === 'Worker' || userRoleInSelectedFarm === 'Veterinarian' || userRoleInSelectedFarm === 'Assistant';
  const canPerformClinicalTasks = userRoleInSelectedFarm === 'Owner' || userRoleInSelectedFarm === 'Veterinarian' || userRoleInSelectedFarm === 'Assistant';

  // ─────────────────────────────────────────────────────────────────
  // ACTION HANDLERS
  // ─────────────────────────────────────────────────────────────────

  // Comprehensive Farm Records Handlers
  const handleOpenNewIndividualRecord = () => {
    if (!selectedFarm) return;
    setActiveIndividualRecord({
      farmId: selectedFarm.id,
      animalId: '',
      earTagNumber: '',
      name: '',
      species: 'Cattle',
      breed: '',
      sex: '',
      colorMarkings: '',
      dob: '',
      age: '',
      source: '',
      purchaseDate: '',
      purchasePrice: null,
      sireId: '',
      damId: '',
      breedOfSire: '',
      breedOfDam: '',
      generation: '',
      bodyWeight: null,
      bcs: '',
      heightAtWithers: '',
      heartGirth: '',
      hornStatus: '',
      identificationMarks: '',
      pubertyDate: '',
      estrusDates: '',
      serviceDate: '',
      aiOrNatural: '',
      bullOrBuckUsed: '',
      pregnancyDiagDate: '',
      expectedParturition: '',
      actualParturition: '',
      typeOfBirth: '',
      calvingDifficulty: '',
      placentaExpulsionTime: '',
      breedingSoundnessDate: '',
      semenEvaluation: '',
      breedingSeason: '',
      femalesServedCount: null,
      offspringId: '',
      offspringBirthDate: '',
      offspringSex: '',
      offspringBirthWeight: null,
      offspringWeaningWeight: null,
      offspringRemarks: '',
      healthRecords: [],
      vaccinationRecords: [],
      dewormingRecords: [],
      parasiteRecords: [],
      feedingGroup: '',
      dailyConcentrate: '',
      greenFodder: '',
      dryFodder: '',
      mineralMixture: '',
      waterIntake: '',
      morningMilk: null,
      eveningMilk: null,
      totalMilk: null,
      bodyWeightMeat: null,
      adg: null,
      servicesPerConception: null,
      ageAtFirstService: '',
      ageAtFirstParturition: '',
      calvingInterval: '',
      daysOpen: '',
      labRecords: [],
      surgicalRecords: [],
      mortalityDate: '',
      mortalityReason: '',
      necropsyDetails: '',
      disposalMethod: '',
      finPurchase: null,
      finFeed: null,
      finMedicine: null,
      finLabor: null,
      finMilkIncome: null,
      finSaleIncome: null,
      notes: '',
      dailyMonitoring: []
    });
    setIsEditingIndividual(false);
    setIndFormStep(0);
    setShowIndividualRecordModal(true);
    setRecordDisplayTab('individualDetailed');
  };

  const handleOpenEditIndividualRecord = (rec: IndividualAnimalRecord) => {
    setActiveIndividualRecord({ ...rec });
    setIsEditingIndividual(true);
    setIndFormStep(0);
    setShowIndividualRecordModal(true);
  };

  const handleOpenNewHerdRecord = () => {
    if (!selectedFarm) return;
    setActiveHerdRecord({
      farmId: selectedFarm.id,
      farmName: selectedFarm.name,
      farmManager: currentUser.name,
      species: 'Cattle',
      breeds: '',
      totalHerdSize: 0,
      dateUpdated: new Date().toISOString().split('T')[0],
      inventory: {
        adultMales: 0,
        adultFemales: 0,
        pregnantQty: 0,
        lactatingQty: 0,
        dryQty: 0,
        youngQty: 0,
        replacementQty: 0,
        sickQty: 0
      },
      reproductive: {
        exposed: 0,
        conceived: 0,
        conceptionRate: 0,
        abortions: 0,
        births: 0,
        singles: 0,
        twins: 0,
        triplets: 0,
        stillbirths: 0,
        mortalityAtBirth: 0
      },
      monthlyProduction: [],
      feedUsage: {
        greenFodderDaily: 0,
        dryFodderDaily: 0,
        concentrateDaily: 0,
        mineralDaily: 0,
        saltDaily: 0,
        greenFodderMonthlyCategory: 0,
        dryFodderMonthlyCategory: 0,
        concentrateMonthlyCategory: 0,
        mineralMonthlyCategory: 0,
        saltMonthlyCategory: 0
      },
      vaccinations: [],
      dewormings: [],
      diseases: [],
      mortalities: [],
      culled: [],
      gAvgBirthWeight: null,
      gAvgWeaningWeight: null,
      gAvgAdultWeight: null,
      finances: {
        expFeed: 0,
        expMedicines: 0,
        expLabor: 0,
        expUtilities: 0,
        expMiscellaneous: 0,
        incMilk: 0,
        incMeat: 0,
        incSale: 0,
        incManure: 0,
        incOther: 0
      },
      kpis: {
        mortalityPctTarget: 5,
        mortalityPctActual: 0,
        conceptionPctTarget: 80,
        conceptionPctActual: 0,
        calvingPctTarget: 85,
        calvingPctActual: 0,
        adgTarget: 0.8,
        adgActual: 0,
        milkYieldTarget: 15,
        milkYieldActual: 0,
        fcrTarget: 15,
        fcrActual: 0
      }
    });
    setIsEditingHerd(false);
    setHerdFormStep(0);
    setShowHerdRecordModal(true);
    setRecordDisplayTab('herdDetailed');
  };

  const handleOpenEditHerdRecord = (rec: HerdLevelMasterRecord) => {
    setActiveHerdRecord({ ...rec });
    setIsEditingHerd(true);
    setHerdFormStep(0);
    setShowHerdRecordModal(true);
  };

  const handleDeleteIndividualRecord = async (id: string) => {
    if (!selectedFarm) return;
    setConfirmDialog({
      title: "Remove Individual Record",
      description: "Are you sure you want to delete this comprehensive profile record irreversibly?",
      confirmText: "Delete",
      isDestructive: true,
      onConfirm: async () => {
        await LivestockService.deleteIndividualRecord(id);
        await LivestockService.deleteAnimal(id).catch(() => {});
        await loadFarmDetails(selectedFarm.id);
        setConfirmDialog(null);
      }
    });
  };

  const handleToggleAnimalSelection = (id: string) => {
    setSelectedAnimalIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAll = () => {
    if (selectedAnimalIds.length === individualRecords.length) {
      setSelectedAnimalIds([]);
    } else {
      setSelectedAnimalIds(individualRecords.map(r => r.id!).filter(Boolean));
    }
  };

  const handleBulkTagStatus = async (status: string) => {
    if (selectedAnimalIds.length === 0) return;
    try {
      setIsLoading(true);
      for (const id of selectedAnimalIds) {
        const record = individualRecords.find(r => r.id === id);
        if (record) {
          const updatedRecord = { ...record, healthStatus: status };
          await LivestockService.updateIndividualRecord(id, updatedRecord);
          try {
            await LivestockService.updateAnimal(id, { healthStatus: status as any });
          } catch (e) {
            console.log("No matching simple animal found to update status", e);
          }
        }
      }
      if (selectedFarm) {
        await loadFarmDetails(selectedFarm.id);
      }
      setSelectedAnimalIds([]);
      setConfirmDialog({
        title: "Bulk Tagging Successful",
        description: `Successfully assigned status label '${status}' to ${selectedAnimalIds.length} animals.`,
        confirmText: "Excellent",
        onConfirm: () => setConfirmDialog(null)
      });
    } catch (err) {
      console.error("Bulk tagging failed", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteHerdRecord = async (id: string) => {
    if (!selectedFarm) return;
    setConfirmDialog({
      title: "Remove Herd Level Master Record",
      description: "Are you sure you want to delete this herd master register sheet irreversibly?",
      confirmText: "Delete",
      isDestructive: true,
      onConfirm: async () => {
        await LivestockService.deleteHerdRecord(id);
        const list = await LivestockService.fetchHerdRecords(selectedFarm.id);
        setHerdRecords(list);
        setConfirmDialog(null);
      }
    });
  };

  const performSaveIndividualRecord = async () => {
    if (!selectedFarm || !activeIndividualRecord) return;
    try {
      if (isEditingIndividual && activeIndividualRecord.id) {
        await LivestockService.updateIndividualRecord(activeIndividualRecord.id, activeIndividualRecord);
        
        // Also update the corresponding simple animal record
        await LivestockService.updateAnimal(activeIndividualRecord.id, {
          animalId: activeIndividualRecord.animalId || '',
          species: (activeIndividualRecord.species as any) || 'Cattle',
          tagNumber: activeIndividualRecord.earTagNumber || undefined,
          gender: (activeIndividualRecord.sex as any) || 'Female',
          dob: activeIndividualRecord.dob || undefined,
          breed: activeIndividualRecord.breed || undefined,
          weight: activeIndividualRecord.bodyWeight || undefined,
        }).catch(async () => {
          // If not found in simple table, create it with matching ID!
          await LivestockService.createAnimal({
            id: activeIndividualRecord.id,
            farmId: selectedFarm.id,
            animalId: activeIndividualRecord.animalId || '',
            species: (activeIndividualRecord.species as any) || 'Cattle',
            tagNumber: activeIndividualRecord.earTagNumber || undefined,
            gender: (activeIndividualRecord.sex as any) || 'Female',
            dob: activeIndividualRecord.dob || undefined,
            breed: activeIndividualRecord.breed || undefined,
            weight: activeIndividualRecord.bodyWeight || undefined,
            healthStatus: 'Healthy'
          });
        });
      } else {
        const created = await LivestockService.createIndividualRecord(activeIndividualRecord);
        
        // Create simple animal with matching ID
        await LivestockService.createAnimal({
          id: created.id,
          farmId: selectedFarm.id,
          animalId: created.animalId || '',
          species: (created.species as any) || 'Cattle',
          tagNumber: created.earTagNumber || undefined,
          gender: (created.sex as any) || 'Female',
          dob: created.dob || undefined,
          breed: created.breed || undefined,
          weight: created.bodyWeight || undefined,
          healthStatus: 'Healthy'
        });
      }
      
      await loadFarmDetails(selectedFarm.id);
      setShowIndividualRecordModal(false);
      setConfirmDialog({
        title: "Record Saved Successfully",
        description: `Durable Individual Animal Record sheet has been synchronized and stored safely!`,
        confirmText: "Excellent",
        onConfirm: () => setConfirmDialog(null)
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handlePublishConfirm = (e?: React.SyntheticEvent) => {
    if (e) e.preventDefault();
    if (!selectedFarm || !activeIndividualRecord) return;
    if (!activeIndividualRecord.animalId || !activeIndividualRecord.animalId.trim()) {
      setIndFormStep(0);
      alert("Animal Tag/ID is required on Step 1 (Identity) before saving!");
      return;
    }
    setConfirmDialog({
      title: isEditingIndividual ? "Save Updates?" : "Publish Animal File?",
      description: `Are you sure you want to ${isEditingIndividual ? 'save transitions for' : 'publish a new dynamic file for'} animal tag ${activeIndividualRecord.animalId}?`,
      confirmText: isEditingIndividual ? "Yes, Save" : "Yes, Publish",
      cancelText: "Cancel",
      isDestructive: false,
      onConfirm: async () => {
        setConfirmDialog(null);
        await performSaveIndividualRecord();
      }
    });
  };

  const handleSaveIndividualRecord = (e: React.FormEvent) => {
    e.preventDefault();
    handlePublishConfirm(e);
  };

  const performSaveHerdRecord = async () => {
    if (!selectedFarm || !activeHerdRecord) return;
    try {
      if (isEditingHerd && activeHerdRecord.id) {
        await LivestockService.updateHerdRecord(activeHerdRecord.id, activeHerdRecord);
      } else {
        await LivestockService.createHerdRecord(activeHerdRecord);
      }
      const list = await LivestockService.fetchHerdRecords(selectedFarm.id);
      setHerdRecords(list);
      setShowHerdRecordModal(false);
      setConfirmDialog({
        title: "Herd Book Registered",
        description: `Durable Herd-wide historical registers saved successfully onto cloud directories.`,
        confirmText: "Perfect",
        onConfirm: () => setConfirmDialog(null)
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handlePublishHerdConfirm = (e?: React.SyntheticEvent) => {
    if (e) e.preventDefault();
    if (!selectedFarm || !activeHerdRecord) return;
    if (!activeHerdRecord.farmName || !activeHerdRecord.farmName.trim()) {
      setHerdFormStep(0);
      alert("Farm Name is required on Step 1 (Identity) before saving!");
      return;
    }
    if (!activeHerdRecord.totalHerdSize) {
      setHerdFormStep(0);
      alert("Total Herd Size is required on Step 1 (Identity) before saving!");
      return;
    }
    setConfirmDialog({
      title: isEditingHerd ? "Save Updates?" : "Publish Herd Register?",
      description: `Are you sure you want to ${isEditingHerd ? 'save changes for' : 'publish and ledger'} this herd master book?`,
      confirmText: isEditingHerd ? "Yes, Save" : "Yes, Publish",
      cancelText: "Cancel",
      isDestructive: false,
      onConfirm: async () => {
        setConfirmDialog(null);
        await performSaveHerdRecord();
      }
    });
  };

  const handleSaveHerdRecord = (e: React.FormEvent) => {
    e.preventDefault();
    handlePublishHerdConfirm(e);
  };

  const addHealthRecord = () => {
    if (!activeIndividualRecord) return;
    const records = activeIndividualRecord.healthRecords ? [...activeIndividualRecord.healthRecords] : [];
    records.push({
      id: 'hr_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      date: new Date().toISOString().split('T')[0],
      diagnosis: '',
      treatment: ''
    });
    setActiveIndividualRecord({ ...activeIndividualRecord, healthRecords: records });
  };

  const removeHealthRecord = (idx: number) => {
    if (!activeIndividualRecord || !activeIndividualRecord.healthRecords) return;
    const records = activeIndividualRecord.healthRecords.filter((_, i) => i !== idx);
    setActiveIndividualRecord({ ...activeIndividualRecord, healthRecords: records });
  };

  const addHerdDeworming = () => {
    if (!activeHerdRecord) return;
    const dewormings = activeHerdRecord.dewormings ? [...activeHerdRecord.dewormings] : [];
    dewormings.push({
      id: 'dw_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      date: new Date().toISOString().split('T')[0],
      drug: '',
      animalsCount: 0,
      nextDue: '',
      drugUsed: '',
      dateAdministered: new Date().toISOString().split('T')[0]
    } as any);
    setActiveHerdRecord({ ...activeHerdRecord, dewormings: dewormings });
  };

  const removeHerdDeworming = (idx: number) => {
    if (!activeHerdRecord || !activeHerdRecord.dewormings) return;
    const dewormings = activeHerdRecord.dewormings.filter((_, i) => i !== idx);
    setActiveHerdRecord({ ...activeHerdRecord, dewormings: dewormings });
  };

  const handleCreateFarm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFarmName.trim() || !newFarmLocation.trim()) return;

    // Subscription Limit Check
    const tier = currentUser.subscriptionTier;
    let maxFarms = 1; // Unsubscribed users can manage up to 1 farm
    if (tier === 'Silver') maxFarms = 3;
    else if (tier === 'Gold') maxFarms = 10;
    else if (tier === 'Platinum') maxFarms = Infinity;

    const myFarmsCount = farms.filter(f => f.ownerUid === currentUser.uid).length;
    if (myFarmsCount >= maxFarms) {
      alert(`⚠️ Privilege Limit Reached:\n\nYou currently have ${myFarmsCount} registered farm(s). Under your current subscription status (${tier || 'Unsubscribed'}), you are permitted to manage up to ${maxFarms} farm(s).\n\nPlease upgrade your clinical subscription inside the Subscription Portal to unlock higher limits.`);
      return;
    }

    try {
      const teamMemberMe = {
        uid: currentUser.uid,
        name: currentUser.name,
        email: currentUser.email,
        role: 'Owner' as const
      };

      const newFarmObj = await LivestockService.createFarm({
        name: newFarmName,
        location: newFarmLocation,
        farmType: newFarmType,
        mixedOptions: newFarmType === 'Mixed Farm' ? newMixedOptions : undefined,
        ownerUid: currentUser.uid,
        ownerName: currentUser.name,
        ownerEmail: currentUser.email,
        managerStatus: 'unassigned',
        team: [teamMemberMe]
      });

      setFarms(prev => [...prev, newFarmObj]);
      setSelectedFarm(newFarmObj);
      setShowCreateFarmModal(false);

      // Reset form fields
      setNewFarmName('');
      setNewFarmLocation('');
      setNewFarmType('Dairy Farm');
    } catch (err) {
      console.error('Failed to register brand new farm:', err);
    }
  };

  const handleAssignVeterinarian = async (clinician: UserProfile) => {
    if (!selectedFarm) return;
    try {
      const updates = {
        managerUid: clinician.uid,
        managerName: clinician.name,
        managerRole: clinician.role === 'clinic' ? 'clinic' as const : 'doctor' as const,
        managerStatus: 'pending' as const
      };

      await LivestockService.updateFarm(selectedFarm.id, updates);
      
      // Send persistent notification to clinician
      await NotificationService.createNotification({
        userId: clinician.uid,
        senderId: currentUser.uid,
        senderName: currentUser.name,
        type: 'farm_assign',
        targetId: selectedFarm.id,
        targetType: 'farm',
        message: `${currentUser.name} (Owner of ${selectedFarm.name}) wants you to become their Livestock Healthcare Manager.`
      });

      // Update local state
      const updatedFarm = { ...selectedFarm, ...updates };
      setSelectedFarm(updatedFarm);
      setFarms(prev => prev.map(f => f.id === selectedFarm.id ? updatedFarm : f));
      setIsAssigningVet(false);
    } catch (err) {
      console.error('Failed to dispatch assignments:', err);
    }
  };

  const handleAcceptFarmManager = async (farm: LivestockFarm) => {
    try {
      const updatedTeam = [...(farm.team || [])];
      // Add vet/clinic as Veterinarian team member if not already added
      if (!updatedTeam.some(t => t.uid === currentUser.uid)) {
        updatedTeam.push({
          uid: currentUser.uid,
          name: currentUser.name,
          email: currentUser.email,
          role: 'Veterinarian'
        });
      }

      const updates = {
        managerStatus: 'linked' as const,
        team: updatedTeam
      };

      await LivestockService.updateFarm(farm.id, updates);

      // Notify Farm Owner
      await NotificationService.createNotification({
        userId: farm.ownerUid,
        senderId: currentUser.uid,
        senderName: currentUser.name,
        type: 'farm_response',
        targetId: farm.id,
        targetType: 'farm',
        message: `Dr. ${currentUser.name} accepted your request to manage healthcare for ${farm.name}!`
      });

      // Reload global list
      await loadGlobalData();
      if (selectedFarm && selectedFarm.id === farm.id) {
        setSelectedFarm({ ...selectedFarm, ...updates });
      }
    } catch (err) {
      console.error('Failed to accept clinic management invitation:', err);
    }
  };

  const handleDeclineFarmManager = async () => {
    if (!declineReasonModal || !selectedFarm) return;
    const farm = farms.find(f => f.id === declineReasonModal);
    if (!farm) return;

    try {
      const updates = {
        managerStatus: 'declined' as const,
        managerDeclinedReason: declineReasonText || 'Declined without specific reason'
      };

      await LivestockService.updateFarm(farm.id, updates);

      // Notify Farm Owner
      await NotificationService.createNotification({
        userId: farm.ownerUid,
        senderId: currentUser.uid,
        senderName: currentUser.name,
        type: 'farm_response',
        targetId: farm.id,
        targetType: 'farm',
        message: `Dr. ${currentUser.name} declined invite to manage ${farm.name}. Reason: ${updates.managerDeclinedReason}`
      });

      // Reset Modal UI
      setDeclineReasonModal(null);
      setDeclineReasonText('');
      await loadGlobalData();
    } catch (err) {
      console.error('Failed to decline manager request:', err);
    }
  };

  const handleChooseAnotherVet = async () => {
    if (!selectedFarm) return;
    try {
      const updates = {
        managerUid: undefined,
        managerName: undefined,
        managerRole: undefined,
        managerStatus: 'unassigned' as const,
        managerDeclinedReason: undefined
      };

      await LivestockService.updateFarm(selectedFarm.id, updates);
      
      const updated = { ...selectedFarm, ...updates };
      setSelectedFarm(updated);
      setFarms(prev => prev.map(f => f.id === selectedFarm.id ? updated : f));
    } catch (err) {
      console.error('Failed to reset healthcare manager slot:', err);
    }
  };

  const handleRegisterAnimal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFarm || !animalIdInput.trim()) return;

    try {
      const newAnimal = await LivestockService.createAnimal({
        farmId: selectedFarm.id,
        animalId: animalIdInput,
        species: animalSpecies,
        tagNumber: tagNumber ? tagNumber : undefined,
        gender,
        dob: dob || undefined,
        breed: breed ? breed : undefined,
        weight: weight ? parseFloat(weight) : undefined,
        healthStatus
      });

      setAnimals(prev => [...prev, newAnimal]);
      setShowAddAnimalForm(false);
      
      // Auto reload tasks list due to automated system smart schedule generation!
      await loadFarmDetails(selectedFarm.id);

      // Reset form variables
      setAnimalIdInput('');
      setTagNumber('');
      setBreed('');
      setWeight('');
      setDob('');
    } catch (err) {
      console.error('Failed to insert animal profile:', err);
    }
  };

  const handleRegisterBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFarm || !batchName.trim() || !batchQuantity.trim()) return;

    try {
      const newBatch = await LivestockService.createBatch({
        farmId: selectedFarm.id,
        batchName,
        species: batchSpecies,
        quantity: parseInt(batchQuantity) || 10,
        arrivalDate: batchArrivalDate || undefined,
        breed: batchBreed ? batchBreed : undefined
      });

      setBatches(prev => [...prev, newBatch]);
      setShowAddBatchForm(false);

      // Auto reload tasks on completion
      await loadFarmDetails(selectedFarm.id);

      // Reset batch
      setBatchName('');
      setBatchQuantity('');
      setBatchArrivalDate('');
      setBatchBreed('');
    } catch (err) {
      console.error('Failed to register livestock batch:', err);
    }
  };

  const handleManualCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFarm || !taskDueDate || !taskTargetId) return;

    let targetNameText = 'All Farm';
    if (taskTargetType === 'individual') {
      const animal = animals.find(a => a.id === taskTargetId);
      targetNameText = animal ? `${animal.animalId}${animal.tagNumber ? ` (Tag: ${animal.tagNumber})` : ''}` : 'Target';
    } else {
      const batch = batches.find(b => b.id === taskTargetId);
      targetNameText = batch ? `${batch.batchName}` : 'Flock Target';
    }

    try {
      const newTask = await LivestockService.createTask({
        farmId: selectedFarm.id,
        targetId: taskTargetId,
        targetType: taskTargetType,
        targetName: targetNameText,
        serviceType: taskServiceType,
        dueDate: taskDueDate,
        status: 'Pending',
        notes: taskNotes ? taskNotes : undefined,
        createdBy: 'manual'
      });

      setTasks(prev => [...prev, newTask]);
      setShowAddTaskForm(false);
      setTaskNotes('');
      setTaskDueDate('');
    } catch (err) {
      console.error('Failed to schedule manual task:', err);
    }
  };

  const handleConfirmTaskCompletion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFarm || !taskCompletionModal) return;

    try {
      await LivestockService.completeTask(taskCompletionModal.id, {
        completedByUid: currentUser.uid,
        completedByName: currentUser.name,
        vaccineUsed: completionVaccine ? completionVaccine : undefined,
        notes: completionNotes ? completionNotes : undefined
      });

      // Notify Farm Owner if completed by doctor
      if (currentUser.uid !== selectedFarm.ownerUid) {
        await NotificationService.createNotification({
          userId: selectedFarm.ownerUid,
          senderId: currentUser.uid,
          senderName: currentUser.name,
          type: 'farm_reminder',
          targetId: selectedFarm.id,
          targetType: 'farm',
          message: `Task: "${taskCompletionModal.serviceType}" for ${taskCompletionModal.targetName} completed by healthcare manager ${currentUser.name}.`
        });
      }

      setTaskCompletionModal(null);
      setCompletionVaccine('');
      setCompletionNotes('');

      // Reload tasks details (might auto schedule next routine boosters!)
      await loadFarmDetails(selectedFarm.id);
    } catch (err) {
      console.error('Failed to complete service task:', err);
    }
  };

  const handleDeleteAnimal = (id: string) => {
    setConfirmDialog({
      title: "Delete Animal Record",
      description: "Are you sure you want to delete this animal record permanently? This will remove all related logs and scheduled booster events. This action is irreversible.",
      confirmText: "Delete Record",
      onConfirm: async () => {
        try {
          await LivestockService.deleteAnimal(id);
          setAnimals(prev => prev.filter(a => a.id !== id));
          if (selectedFarm) {
            await loadFarmDetails(selectedFarm.id);
          }
          setConfirmDialog(null);
        } catch (err) {
          console.error('Failed to delete animal:', err);
        }
      }
    });
  };

  const handleDeleteBatch = (id: string) => {
    setConfirmDialog({
      title: "Delete Batch / Flock",
      description: "Are you sure you want to delete this batch/flock permanently? Related logs and schedules will be deleted.",
      confirmText: "Delete Batch",
      onConfirm: async () => {
        try {
          await LivestockService.deleteBatch(id);
          setBatches(prev => prev.filter(b => b.id !== id));
          if (selectedFarm) {
            await loadFarmDetails(selectedFarm.id);
          }
          setConfirmDialog(null);
        } catch (err) {
          console.error('Failed to delete batch:', err);
        }
      }
    });
  };

  const handleCascadeDeleteFarm = (farmId: string) => {
    setConfirmDialog({
      title: "Terminate Farm Workspace Map",
      description: "WARNING: Are you sure you want to delete this agricultural workspace entirely? This permanently deletes all registered team members, animals, batches, rosters, and activity logs. This cannot be undone!",
      confirmText: "CRITICAL: WIPE FARM",
      onConfirm: async () => {
        try {
          await LivestockService.deleteFarm(farmId);
          const updatedFarms = farms.filter(f => f.id !== farmId);
          setFarms(updatedFarms);
          if (selectedFarm && selectedFarm.id === farmId) {
            setSelectedFarm(updatedFarms.length > 0 ? updatedFarms[0] : null);
          }
          setConfirmDialog(null);
        } catch (err) {
          console.error('Failed to terminate farm entity:', err);
        }
      }
    });
  };

  const handleLeaveFarmServices = () => {
    if (!selectedFarm) return;
    setConfirmDialog({
      title: "Resign Healthcare Services",
      description: `Official Resignation: Are you sure you want to resign and leave all healthcare services for "${selectedFarm.name}"? You will immediately lose administrative access and logging privileges on this farm records system.`,
      confirmText: "Resign & Disconnect",
      onConfirm: async () => {
        try {
          const updatedTeam = (selectedFarm.team || []).filter(member => member.uid !== currentUser.uid);
          const updates = {
            managerUid: undefined,
            managerName: undefined,
            managerRole: undefined,
            managerStatus: 'unassigned' as const,
            managerDeclinedReason: undefined,
            team: updatedTeam
          };

          await LivestockService.updateFarm(selectedFarm.id, updates);

          try {
            await NotificationService.createNotification({
              userId: selectedFarm.ownerUid,
              senderId: currentUser.uid,
              senderName: currentUser.name,
              type: 'status_change',
              targetId: selectedFarm.id,
              targetType: 'farm',
              message: `Dr. ${currentUser.name} has resigned as the Certified Healthcare Manager for your farm "${selectedFarm.name}".`
            });
          } catch (notifErr) {
            console.error('Resign notification failed:', notifErr);
          }

          setConfirmDialog(null);
          await loadGlobalData();
          setSelectedFarm(null);
        } catch (err) {
          console.error('Resign fail:', err);
        }
      }
    });
  };

  const handleAddTeamMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFarm || !teamMemberName.trim() || !teamMemberEmail.trim()) return;

    try {
      const mockUid = 'user_' + Date.now() + '_' + Math.floor(Math.random() * 100);
      const isClinicianInvited = teamMemberRole === 'Veterinarian' || teamMemberRole === 'Assistant';
      
      const newMember = {
        uid: mockUid,
        name: teamMemberName,
        email: teamMemberEmail.toLowerCase().trim(),
        role: teamMemberRole
      };

      const updatedTeam = [...(selectedFarm.team || []), newMember];
      await LivestockService.updateFarm(selectedFarm.id, { team: updatedTeam });

      const updatedFarm = { ...selectedFarm, team: updatedTeam };
      setSelectedFarm(updatedFarm);
      setFarms(prev => prev.map(f => f.id === selectedFarm.id ? updatedFarm : f));
      setShowTeamInvite(false);
      setTeamMemberName('');
      setTeamMemberEmail('');
    } catch (err) {
      console.error('Failed to add team member:', err);
    }
  };

  // Filter local veterinarians & clinics list
  const filteredClinicians = allProfessionals.filter(p => {
    const queryStr = vetSearchQuery.toLowerCase().trim();
    if (!queryStr) return true;
    return (
      (p.name || '').toLowerCase().includes(queryStr) ||
      (p.address || '').toLowerCase().includes(queryStr) ||
      (p.expertise || p.facilities || '').toLowerCase().includes(queryStr)
    );
  });

  // Reminders / Notification engine logic inside UI (e.g., alert triggers due within 7 days)
  const getTasksAlerts = () => {
    const today = new Date();
    const alertList: { task: LivestockTask, status: 'overdue' | 'due_soon' | 'normal', daysRemain: number }[] = [];

    // 1. Core Task Reminders
    tasks.forEach(t => {
      if (t.status === 'Completed') return;
      
      const due = new Date(t.dueDate);
      const diffTime = due.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays < 0) {
        alertList.push({ task: t, status: 'overdue', daysRemain: diffDays });
      } else if (diffDays <= 7) {
        alertList.push({ task: t, status: 'due_soon', daysRemain: diffDays });
      } else {
        alertList.push({ task: t, status: 'normal', daysRemain: diffDays });
      }
    });

    // 2. Individual Animal Record Breeding Alerts (Parturition / Calving)
    individualRecords.forEach(rec => {
      if (!rec.serviceDate) return;
      try {
        const servDate = new Date(rec.serviceDate);
        if (isNaN(servDate.getTime())) return;
        const gestationDays = (rec.species === 'Goat' || rec.species === 'Sheep') ? 150 : 283;
        const parturitionDate = new Date(servDate.getTime() + gestationDays * 24 * 60 * 60 * 1000);
        const diffTime = parturitionDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays >= -30 && diffDays <= 45) {
          alertList.push({
            task: {
              id: `part_${rec.id}`,
              farmId: rec.farmId,
              targetId: rec.id || '',
              targetType: 'individual',
              targetName: rec.name || rec.animalId || 'Animal',
              serviceType: `🍼 Parturition / Calving Watch (${rec.species})`,
              dueDate: parturitionDate.toISOString().split('T')[0],
              status: 'Pending',
              createdBy: 'system',
              createdAt: Date.now()
            },
            status: diffDays < 0 ? 'overdue' : diffDays <= 7 ? 'due_soon' : 'normal',
            daysRemain: diffDays
          });
        }
      } catch (err) {
        console.error('Error calculating parturition date:', err);
      }
    });

    // 3. Individual Animal Health Checkup Follow-ups
    individualRecords.forEach(rec => {
      if (!rec.healthRecords || rec.healthRecords.length === 0) return;
      rec.healthRecords.forEach((hr, idx) => {
        if (!hr.date) return;
        try {
          const diagDate = new Date(hr.date);
          if (isNaN(diagDate.getTime())) return;
          const followUp = new Date(diagDate.getTime() + 10 * 24 * 60 * 60 * 1000); // 10 days post-diagnosis
          const diffTime = followUp.getTime() - today.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          if (diffDays >= -7 && diffDays <= 15) {
            alertList.push({
              task: {
                id: `ind_followup_${rec.id}_${idx}`,
                farmId: rec.farmId,
                targetId: rec.id || '',
                targetType: 'individual',
                targetName: rec.name || rec.animalId || 'Animal',
                serviceType: `🩺 Medical Follow-up: ${hr.diagnosis || 'Post-Treatment check'}`,
                dueDate: followUp.toISOString().split('T')[0],
                status: 'Pending',
                createdBy: 'system',
                createdAt: Date.now()
              },
              status: diffDays < 0 ? 'overdue' : diffDays <= 7 ? 'due_soon' : 'normal',
              daysRemain: diffDays
            });
          }
        } catch (err) {
          console.error(err);
        }
      });
    });

    // 4. Herd-Wide Deworming Booster Alerts
    herdRecords.forEach(rec => {
      if (!rec.dewormings || rec.dewormings.length === 0) return;
      rec.dewormings.forEach((dw, idx) => {
        const adminDate = dw.dateAdministered || (dw as any).date;
        if (!adminDate) return;
        try {
          const lastDeworm = new Date(adminDate);
          if (isNaN(lastDeworm.getTime())) return;
          const nextDeworm = new Date(lastDeworm.getTime() + 90 * 24 * 60 * 60 * 1000); // 90 days repeat
          const diffTime = nextDeworm.getTime() - today.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          if (diffDays >= -15 && diffDays <= 30) {
            alertList.push({
              task: {
                id: `herd_dw_${rec.id}_${idx}`,
                farmId: rec.farmId,
                targetId: rec.id || '',
                targetType: 'batch',
                targetName: rec.farmName || 'Herd-Wide',
                serviceType: `🪱 Repeat Deworming: ${dw.drugUsed || dw.drug || 'Booster'}`,
                dueDate: nextDeworm.toISOString().split('T')[0],
                status: 'Pending',
                createdBy: 'system',
                createdAt: Date.now()
              },
              status: diffDays < 0 ? 'overdue' : diffDays <= 7 ? 'due_soon' : 'normal',
              daysRemain: diffDays
            });
          }
        } catch (err) {
          console.error(err);
        }
      });
    });

    return alertList;
  };

  const activeAlerts = getTasksAlerts();
  const overdueAlertsCount = activeAlerts.filter(a => a.status === 'overdue').length;
  const soonAlertsCount = activeAlerts.filter(a => a.status === 'due_soon').length;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-20">
        <Activity className="w-10 h-10 animate-spin text-[#5a5a40] mb-4" />
        <p className="text-[#a49f92] font-semibold text-sm font-mono uppercase tracking-widest">Loading Agricultural Workspaces...</p>
      </div>
    );
  }

  // If a clinician logs in and has active pending invites matching their uid, show them prominently!
  const pendingInvites = farms.filter(f => f.managerUid === currentUser.uid && f.managerStatus === 'pending');

  return (
    <div className="space-y-8 animate-fadeIn text-[#3c3c3b]">
      
      {/* Clinician Dashboard Pending Invitation Alerts */}
      {isClinician && pendingInvites.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-amber-100 rounded-xl text-amber-600">🔔</span>
            <div>
              <h3 className="font-display font-extrabold text-[#5a5a40] text-lg">Farm Management Invitations</h3>
              <p className="text-xs text-amber-800">Local farm owners want to request you as their certified Farm/Healthcare Manager.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingInvites.map(farm => (
              <div key={farm.id} className="bg-white border border-[#e3dec9] rounded-xl p-5 flex flex-col justify-between shadow-xs">
                <div>
                  <div className="flex justify-between items-start gap-2">
                    <h4 className="font-bold text-md text-gray-900">{farm.name}</h4>
                    <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-md bg-amber-500 text-white tracking-widest">
                      {farm.farmType}
                    </span>
                  </div>
                  <div className="mt-2 space-y-1 text-xs text-gray-500">
                    <p className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 inline text-gray-400" /> {farm.location}</p>
                    <p>Owner: <strong className="text-[#5a5a40]">{farm.ownerName}</strong> ({farm.ownerEmail})</p>
                  </div>
                </div>

                <div className="mt-5 flex gap-2">
                  <button
                    onClick={() => handleAcceptFarmManager(farm)}
                    className="flex-1 cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white text-xs py-2 px-3 rounded-lg font-bold border-none transition-all flex items-center justify-center gap-1 shadow-xs"
                  >
                    <Check className="w-4 h-4" /> Accept & Link
                  </button>
                  <button
                    onClick={() => {
                      setDeclineReasonModal(farm.id);
                      setDeclineReasonText('');
                    }}
                    className="cursor-pointer bg-red-50 hover:bg-red-100 text-red-600 text-xs py-2 px-3 rounded-lg font-bold border border-red-200 transition-all"
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Offline Connectivity Mode Indicator */}
      <OfflineModeIndicator 
        isOfflineModeOverride={isOfflineModeActive}
        onSyncOfflineData={handleSyncData}
        isSyncing={isSyncing}
      />

      {/* Sync Status Manager Utility */}
      <div className="mb-4">
        <SyncStatusManager 
          onSyncManual={handleSyncData}
          isSyncing={isSyncing}
        />
      </div>

      {/* Primary Headers */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-[#e3dec9] border-b-[4px] border-b-[#cdc6ad] rounded-2xl p-6 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-[#5a5a40] rounded-2xl text-white shadow-md">
            <Stethoscope className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              {/* OFFLINE CAPABILITY MODE INDICATOR */}
              {isOfflineModeActive && (
                <button 
                  type="button"
                  onClick={() => {
                    const targetState = !isOfflineModeActive;
                    setIsOfflineModeActive(targetState);
                    setConfirmDialog({
                      title: "Cloud Connection Mode Enabled",
                      description: "Connecting back to live Firestore ledger storage. Press sync to upload offline caches.",
                      confirmText: "Acknowledge",
                      onConfirm: () => setConfirmDialog(null)
                    });
                  }}
                  className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-md tracking-wider border font-mono transition-all cursor-pointer bg-amber-100 text-amber-800 border-amber-300 animate-pulse"
                >
                  ⚠️ OFFLINE LOCAL STORAGE
                </button>
              )}

              {isOfflineModeActive && (
                <button
                  type="button"
                  onClick={handleSyncData}
                  disabled={isSyncing}
                  className="cursor-pointer bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-mono text-[9px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-md border-none flex items-center gap-1 shadow-xs"
                >
                  🔄 {isSyncing ? 'Syncing...' : 'Sync Offline Cache'}
                </button>
              )}
            </div>
            <h1 className="font-serif text-3xl font-bold text-[#5a5a40] tracking-tight">Farm Management</h1>
            <p className="text-xs text-[#7a766f]">Manage herds, schedule immunizations, and link with veterinary/farm managers.</p>
          </div>
        </div>

        {/* Selected Farm Dropdown or Create Button */}
        <div className="flex items-center gap-3">
          {farms.length > 0 && !isClinician && (
            <div className="relative">
              <select
                value={selectedFarm?.id || ''}
                onChange={(e) => {
                  const f = farms.find(farm => farm.id === e.target.value);
                  if (f) setSelectedFarm(f);
                }}
                className="cursor-pointer appearance-none bg-[#fcf9f2] border border-[#e3dec9] border-b-[3px] border-b-[#cdc6ad] px-4 py-2.5 pr-10 rounded-xl text-xs font-bold text-[#5a5a40] hover:bg-[#f6f2e7] transition-all focus:outline-none"
              >
                {farms.map((f) => (
                  <option key={f.id} value={f.id}>
                    🚜 {f.name}
                  </option>
                ))}
              </select>
              <ChevronRight className="w-4 h-4 text-[#5a5a40] absolute right-3 top-3.5 rotate-90 pointer-events-none" />
            </div>
          )}

          {!isClinician && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowCreateFarmModal(true)}
              className="bg-[#5a5a40] hover:bg-[#3e3e2b] text-white text-xs font-bold py-2.5 px-4 rounded-xl border-none cursor-pointer flex items-center gap-1.5 shadow-sm border-b-[3px] border-b-[#3e3e2b]"
            >
              <Plus className="w-4 h-4" /> Register Farm
            </motion.button>
          )}
        </div>
      </div>

      {/* 3D INTERACTIVE HERO & SPONSOR BILLBOARD */}
      <div 
        ref={billboardRef}
        onMouseMove={handleBillboardMouseMove}
        onMouseLeave={handleBillboardMouseLeave}
        className="mb-8 relative w-full h-[360px] sm:h-[280px] md:h-[230px] lg:h-[210px] overflow-hidden rounded-3xl shrink-0 shadow-[0_15px_40px_rgba(90,90,64,0.18)] hover:shadow-[0_25px_50px_rgba(90,90,64,0.3)] transition-shadow duration-500 border border-[#cdc6ad]"
        style={{ perspective: 1200 }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlideIdx}
            initial={{ rotateY: 90, opacity: 0 }}
            animate={{ rotateY: 0, opacity: 1 }}
            exit={{ rotateY: -90, opacity: 0 }}
            transition={{ duration: 0.35, ease: "easeInOut" }}
            style={{ 
              transformStyle: "preserve-3d", 
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
              rotateX: bspringX,
              rotateY: bspringY,
            }}
            className={`absolute inset-0 text-white p-6 md:p-8 flex flex-col justify-center bg-gradient-to-br ${activeSlides[currentSlideIdx].bgGradient} ${activeSlides[currentSlideIdx].borderColors} border border-b-[8px] transition-all duration-300`}
          >
            {/* Holographic grid wallpaper */}
            <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1.2px,transparent_1.2px)] [background-size:16px_16px] opacity-15 pointer-events-none" />

            {/* Premium 3D Metallic Gloss Glow Layer */}
            <motion.div
              style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0) 50%, rgba(0,0,0,0.18) 100%)',
                x: bsheenX,
                y: bsheenY,
                pointerEvents: 'none',
              }}
              className="absolute inset-0 z-20 mix-blend-overlay pointer-events-none"
            />

            {activeSlides[currentSlideIdx].type === 'welcome' ? (
              // WELCOME BANNER SLIDE CONTENT (WITH Z-PERSPECTIVE DEPTH)
              <div className="w-full relative" style={{ transformStyle: "preserve-3d" }}>
                <div 
                  className="absolute right-6 top-1/2 -translate-y-1/2 opacity-10 pointer-events-none hidden lg:block"
                  style={{ transform: "translateZ(50px)" }}
                >
                  <span className="text-6xl animate-pulse inline-block">🐄</span>
                </div>
                
                <div className="relative z-10 space-y-2 md:space-y-3 max-w-2xl text-left" style={{ transformStyle: "preserve-3d" }}>
                  <span 
                    className="inline-flex px-3 py-1 bg-white/10 rounded-xl text-[10px] font-black tracking-widest font-mono border border-white/20 uppercase"
                    style={{ transform: "translateZ(30px)" }}
                  >
                    🚜 Farm & Production Network
                  </span>
                  <h2 
                    className="text-2.5xl md:text-3xl font-serif font-black tracking-tight leading-tight"
                    style={{ transform: "translateZ(45px)" }}
                  >
                    Hello, {currentUser.name.split(' ')[0]} 👋
                  </h2>
                  <p 
                    className="text-neutral-200 text-xs md:text-sm font-semibold leading-relaxed"
                    style={{ transform: "translateZ(25px)" }}
                  >
                    Manage herd identification, schedule veterinary immunizations, link with professionals and track daily farm production records.
                  </p>
                </div>
              </div>
            ) : (
              // SPONSORED CAMPAIGN SLIDE CONTENT (WITH Z-PERSPECTIVE DEPTH)
              <div className="w-full relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6" style={{ transformStyle: "preserve-3d" }}>
                <div className="space-y-2 md:space-y-3 max-w-2xl text-left" style={{ transformStyle: "preserve-3d" }}>
                  <span 
                    className="inline-flex px-3 py-1 bg-white/10 rounded-xl text-[10px] font-black tracking-widest font-mono border border-white/20 uppercase"
                    style={{ transform: "translateZ(30px)" }}
                  >
                    📌 {activeSlides[currentSlideIdx].badge} • Sponsored Campaign
                  </span>
                  <h2 
                    className="text-xl md:text-3xl font-serif font-black tracking-tight leading-tight flex items-center gap-2"
                    style={{ transform: "translateZ(45px)" }}
                  >
                    <span className="text-2xl md:text-3.5xl shrink-0 select-none">{activeSlides[currentSlideIdx].icon}</span>
                    <span>{activeSlides[currentSlideIdx].title}</span>
                  </h2>
                  <p 
                    className="text-neutral-200 text-xs md:text-xs font-semibold leading-relaxed line-clamp-3"
                    style={{ transform: "translateZ(20px)" }}
                  >
                    {activeSlides[currentSlideIdx].description}
                  </p>
                  <div className="flex flex-wrap items-center gap-3 pt-0.5" style={{ transform: "translateZ(15px)" }}>
                    <span className="text-[10px] uppercase font-black tracking-wider text-amber-300">
                      {activeSlides[currentSlideIdx].sponsorName}
                    </span>
                    {activeSlides[currentSlideIdx].couponCode && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigator.clipboard.writeText(activeSlides[currentSlideIdx].couponCode || '');
                          alert(`📋 Copied coupon code "${activeSlides[currentSlideIdx].couponCode}" to clipboard!`);
                        }}
                        className="inline-flex items-center gap-2 px-2.5 py-1 bg-dashed border border-white/30 hover:border-white/50 bg-white/10 rounded-xl text-[9px] font-black tracking-wider text-amber-300 shadow-inner cursor-pointer transition-all"
                        title="Click to copy coupon code"
                      >
                        <span>Code: {activeSlides[currentSlideIdx].couponCode}</span>
                        <span className="text-white/60 font-normal text-[8px] pl-1">Copy 📋</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* CTA Link out (WITH COGNITIVE HEIGHT HIGHLIGHT) */}
                <div className="shrink-0 flex flex-col gap-2 min-w-[180px] md:min-w-[200px]" style={{ transform: "translateZ(35px)" }}>
                  <a
                    href={activeSlides[currentSlideIdx].ctaUrl.startsWith('http') ? activeSlides[currentSlideIdx].ctaUrl : `https://${activeSlides[currentSlideIdx].ctaUrl}`}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="bg-white hover:bg-stone-50 hover:scale-103 text-stone-900 border-b-4 border-b-stone-300 active:border-b-2 px-4 py-2.5 rounded-2xl text-[10px] font-black tracking-wider uppercase transition-all flex items-center justify-center gap-1.5 w-full text-center cursor-pointer decoration-none shadow-md"
                  >
                    <span>{activeSlides[currentSlideIdx].ctaText}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-stone-850" />
                  </a>
                </div>
              </div>
            )}

            {/* Carousel Navigation Toolbar */}
            <div 
              className="absolute bottom-4 right-6 flex items-center gap-3 bg-black/25 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 z-20 select-none"
              style={{ transform: "translateZ(40px)" }}
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentSlideIdx((prev) => (prev - 1 + activeSlides.length) % activeSlides.length);
                }}
                className="text-white/60 hover:text-white bg-transparent border-none cursor-pointer p-0.5 flex items-center justify-center"
                title="Previous Slide"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              
              <div className="flex gap-1.5">
                {activeSlides.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentSlideIdx(idx);
                    }}
                    className={`w-1.5 h-1.5 rounded-full cursor-pointer transition-all border-none ${
                      idx === currentSlideIdx ? 'bg-amber-400 scale-120' : 'bg-white/40 hover:bg-white/60'
                    }`}
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentSlideIdx((prev) => (prev + 1) % activeSlides.length);
                }}
                className="text-white/60 hover:text-white bg-transparent border-none cursor-pointer p-0.5 flex items-center justify-center"
                title="Next Slide"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Livestock Overview Content */}
      {!selectedFarm ? (
        <div className="text-center bg-white border border-[#e3dec9] rounded-2xl p-16 space-y-4 shadow-sm">
          <div className="w-20 h-20 bg-[#fbf9f4] border border-[#e3dec9] rounded-full flex items-center justify-center mx-auto text-4xl shadow-inner">
            🚜
          </div>
          <div className="max-w-md mx-auto">
            <h3 className="font-serif font-bold text-xl text-[#5a5a40]">No Registered Farms</h3>
            <p className="text-xs text-[#7a766f] mt-2">
              {isClinician
                ? 'You do not have any linked livestock farms yet. Once a farm owner invites you and you accept, their records will populate here.'
                : 'A Farm Management workspace lets you track herds, assign a doctor, invite your team, and generate automatic vaccine alerts. Start by creating a farm.'}
            </p>
            {!isClinician && (
              <button
                onClick={() => setShowCreateFarmModal(true)}
                className="mt-6 cursor-pointer bg-[#5a5a40] hover:bg-[#3e3e2b] text-white text-xs py-2.5 px-5 rounded-xl font-bold border-none shadow-md"
              >
                Create Your First Farm Workspace
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Side Nav Menu Panel */}
          <div className="space-y-4">
            <div className="bg-white border border-[#e3dec9] border-b-[3px] border-b-[#cdc6ad] rounded-2xl p-4 shadow-sm">
              <div className="p-3 border-b border-[#f4f1e9]">
                <div className="flex items-center justify-between">
                  <h3 className="font-display font-black text-[#5a5a40] text-sm uppercase tracking-widest leading-6">Farm Hub Menu</h3>
                  <span className="text-[9px] font-mono px-2 py-0.5 rounded-md font-bold bg-[#faf7f0] text-[#7a766f]">
                    {userRoleInSelectedFarm || 'Guest'}
                  </span>
                </div>
                <p className="text-emerald-700 font-extrabold text-xs mt-1">{selectedFarm.name}</p>
              </div>

              <div className="mt-3 flex flex-col gap-1">
                <button
                  onClick={() => setActiveSubTab('dashboard')}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold tracking-tight text-left transition-all border-none cursor-pointer ${
                    activeSubTab === 'dashboard'
                      ? 'bg-[#5a5a40] text-white'
                      : 'bg-transparent text-[#7a766f] hover:bg-[#fbfaf6] hover:text-[#5a5a40]'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Activity className="w-4 h-4" /> Workspace Board
                  </span>
                  {(overdueAlertsCount > 0 || soonAlertsCount > 0) && (
                    <span className="bg-amber-500 text-white font-mono text-[9px] font-black px-1.5 py-0.5 rounded-full">
                      {overdueAlertsCount + soonAlertsCount}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setActiveSubTab('analytics')}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold tracking-tight text-left transition-all border-none cursor-pointer ${
                    activeSubTab === 'analytics'
                      ? 'bg-[#5a5a40] text-white'
                      : 'bg-transparent text-[#7a766f] hover:bg-[#fbfaf6] hover:text-[#5a5a40]'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" /> Farm Insights Chart 📊
                  </span>
                </button>

                <button
                  onClick={() => setActiveSubTab('animals')}
                  className={`w-full flex items-center px-3 py-2.5 rounded-xl text-xs font-bold tracking-tight text-left transition-all border-none cursor-pointer ${
                    activeSubTab === 'animals'
                      ? 'bg-[#5a5a40] text-white'
                      : 'bg-transparent text-[#7a766f] hover:bg-[#fbfaf6] hover:text-[#5a5a40]'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span>🐄</span> Herd Identification ({animals.length})
                  </span>
                </button>

                <button
                  onClick={() => setActiveSubTab('batches')}
                  className={`w-full flex items-center px-3 py-2.5 rounded-xl text-xs font-bold tracking-tight text-left transition-all border-none cursor-pointer ${
                    activeSubTab === 'batches'
                      ? 'bg-[#5a5a40] text-white'
                      : 'bg-transparent text-[#7a766f] hover:bg-[#fbfaf6] hover:text-[#5a5a40]'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span>🐔</span> Flock & Batches Entry ({batches.length})
                  </span>
                </button>

                <button
                  onClick={() => setActiveSubTab('tasks')}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold tracking-tight text-left transition-all border-none cursor-pointer ${
                    activeSubTab === 'tasks'
                      ? 'bg-[#5a5a40] text-white'
                      : 'bg-transparent text-[#7a766f] hover:bg-[#fbfaf6] hover:text-[#5a5a40]'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" /> Scheduled Services ({tasks.filter(t => t.status === 'Pending').length})
                  </span>
                </button>

                <button
                  onClick={() => setActiveSubTab('team')}
                  className={`w-full flex items-center px-3 py-2.5 rounded-xl text-xs font-bold tracking-tight text-left transition-all border-none cursor-pointer ${
                    activeSubTab === 'team'
                      ? 'bg-[#5a5a40] text-white'
                      : 'bg-transparent text-[#7a766f] hover:bg-[#fbfaf6] hover:text-[#5a5a40]'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Users className="w-4 h-4" /> Team Settings ({selectedFarm.team?.length || 1})
                  </span>
                </button>
              </div>

              {/* Cascade Delete if Owner */}
              {userRoleInSelectedFarm === 'Owner' && (
                <div className="mt-6 pt-4 border-t border-[#f4f1e9]">
                  <button
                    onClick={() => handleCascadeDeleteFarm(selectedFarm.id)}
                    className="w-full cursor-pointer bg-red-50 hover:bg-red-100 text-red-600 text-[10px] font-extrabold tracking-widest uppercase py-2.5 px-3 rounded-lg border border-red-200 transition-all flex items-center justify-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Terminate Farm
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Sub-tabs Rendering Screens Area */}
          <div className="lg:col-span-3 space-y-6">
            
            {activeSubTab === 'dashboard' && (
              <div className="space-y-6">
                
                {/* Metrics Blocks */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white border border-[#e3dec9] rounded-2xl p-5 flex items-center justify-between shadow-xs">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-[#a49f92] tracking-wider block">Total Stock Size</span>
                      <strong className="text-3xl text-[#5a5a40] font-sans block mt-1">
                        {animals.length + batches.reduce((acc, b) => acc + (b.status === 'Active' ? b.quantity : 0), 0)}
                      </strong>
                      <span className="text-[10px] text-gray-400 font-mono mt-1 block">
                        {animals.length} animals &middot; {batches.length} flocks
                      </span>
                    </div>
                    <span className="text-3xl">🐏</span>
                  </div>

                  <div className="bg-white border border-[#e3dec9] rounded-2xl p-5 flex items-center justify-between shadow-xs">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-[#a49f92] tracking-wider block">Critical Overdue Tasks</span>
                      <strong className="text-3xl text-red-600 font-sans block mt-1">
                        {overdueAlertsCount}
                      </strong>
                      <span className="text-[10px] text-gray-400 font-mono mt-1 block">Requires instant clinical action</span>
                    </div>
                    <span className="p-3 bg-red-50 text-red-500 rounded-xl">
                      <AlertTriangle className="w-6 h-6" />
                    </span>
                  </div>

                  <div className="bg-white border border-[#e3dec9] rounded-2xl p-5 flex items-center justify-between shadow-xs">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-[#a49f92] tracking-wider block">Assigned Advisor</span>
                      <strong className="text-xs text-[#5a5a40] font-bold block mt-1 font-sans truncate max-w-[150px]">
                        {selectedFarm.managerStatus === 'linked' ? selectedFarm.managerName : 'Unassigned'}
                      </strong>
                      <span className="text-[10px] text-emerald-700 font-bold mt-1 block uppercase">
                        {selectedFarm.managerStatus === 'linked' ? '● Farm Linked' : `○ STATUS: ${selectedFarm.managerStatus.toUpperCase()}`}
                      </span>
                    </div>
                    <span className="text-2xl">👩‍⚕️</span>
                  </div>
                </div>

                {/* Critical Reminders / Notifications Panel (Step 7) */}
                <div className="bg-white border border-[#e3dec9] rounded-2xl p-6 shadow-xs">
                  <div className="flex items-center justify-between border-b border-[#f4f1e9] pb-4 mb-4">
                    <h3 className="font-display font-black text-[#5a5a40] text-sm uppercase tracking-widest flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-500 animate-pulse" /> Automatic Reminders Engine
                    </h3>
                    <span className="text-[10px] font-mono font-bold bg-[#faf7f0] text-gray-500 px-2.5 py-0.5 rounded-md">
                      Smart Watchdog
                    </span>
                  </div>

                  {activeAlerts.length === 0 ? (
                    <div className="text-center py-6 text-xs text-gray-400">
                      👍 All herds immunized and dewormed cleanly. No pending health reminders.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {activeAlerts.map(({ task, status, daysRemain }) => (
                        <div
                          key={task.id}
                          className={`flex items-center justify-between p-4 rounded-xl border ${
                            status === 'overdue' 
                              ? 'bg-red-50/70 border-red-100 text-red-900' 
                              : status === 'due_soon' 
                              ? 'bg-amber-50/70 border-amber-100 text-amber-900' 
                              : 'bg-emerald-50/45 border-emerald-100/60 text-emerald-900'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-xl">
                              {status === 'overdue' ? '🚨' : status === 'due_soon' ? '⏳' : '✅'}
                            </span>
                            <div>
                              <p className="font-bold text-sm leading-tight">{task.serviceType}</p>
                              <p className="text-xs opacity-75 mt-0.5">
                                Target: {task.targetName} &middot; Due on: {task.dueDate}
                              </p>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-md ${
                              status === 'overdue' 
                                ? 'bg-red-200 text-red-800' 
                                : status === 'due_soon' 
                                ? 'bg-amber-200 text-amber-900' 
                                : 'bg-emerald-200 text-emerald-800'
                            }`}>
                              {status === 'overdue' ? 'OVERDUE' : status === 'due_soon' ? `${daysRemain} days left` : 'Upcoming'}
                            </span>
                            {canPerformClinicalTasks && (
                              <button
                                onClick={() => {
                                  setTaskCompletionModal(task);
                                  setCompletionVaccine('');
                                  setCompletionNotes('');
                                }}
                                className="block cursor-pointer underline text-[10px] font-bold text-gray-700 mt-1.5 hover:text-black bg-transparent border-none p-0"
                              >
                                Mark Completed →
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Healthcare Manager Card Section (Steps 2 & 3) */}
                <div className="bg-white border border-[#e3dec9] rounded-2xl p-6 shadow-xs space-y-4">
                  <div className="border-b border-[#f4f1e9] pb-4">
                    <h3 className="font-display font-black text-[#5a5a40] text-sm uppercase tracking-widest">
                      Associated Veterinary Manager
                    </h3>
                    <p className="text-xs text-[#7a766f]">The veterinarian becomes the official healthcare manager of this farm.</p>
                  </div>

                  {selectedFarm.managerStatus === 'unassigned' && (
                    <div className="space-y-4">
                      <div className="rounded-xl bg-orange-50 border border-orange-150 p-4 text-xs text-orange-900 flex items-start gap-3">
                        <Info className="w-5 h-5 shrink-0 text-orange-600 mt-0.5" />
                        <div>
                          <p className="font-bold">No Healthcare Manager Assigned</p>
                          <p className="opacity-80 mt-1">Assign a professional clinician or veterinary clinic to remotely audit vaccines, treatment charts, and schedule automated boosters.</p>
                        </div>
                      </div>

                      {canModifyFarmDetails && (
                        <div>
                          <button
                            onClick={() => setIsAssigningVet(true)}
                            className="bg-[#5a5a40] hover:bg-[#3e3e2b] text-white text-xs font-bold py-2.5 px-4 rounded-xl border-none cursor-pointer flex items-center gap-1.5"
                          >
                            <UserPlus className="w-4 h-4" /> Assign Veterinary Manager
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {selectedFarm.managerStatus === 'pending' && (
                    <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50/50 p-5 space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[9px] uppercase font-black bg-amber-500 text-white rounded-md px-2 py-0.5 font-mono tracking-widest">
                            Manager Pending Approval
                          </span>
                          <h4 className="font-bold text-sm text-gray-900 mt-2">Requested Manager: {selectedFarm.managerName}</h4>
                          <p className="text-xs text-gray-500">Wait for veterinarian review status. They will receive invitation alerts immediately.</p>
                        </div>
                        <span className="text-2xl animate-pulse">⏳</span>
                      </div>
                      {canModifyFarmDetails && (
                        <div className="pt-2">
                          <button
                            onClick={handleChooseAnotherVet}
                            className="cursor-pointer bg-white hover:bg-red-50 text-red-600 border border-red-200 text-[10px] font-black px-3 py-1.5 rounded-lg transition-all"
                          >
                            Cancel Request & Pick Someone Else
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {selectedFarm.managerStatus === 'declined' && (
                    <div className="rounded-xl border border-red-200 bg-red-50/40 p-5 space-y-4">
                      <div>
                        <span className="text-[9px] uppercase font-black bg-red-600 text-white rounded-md px-2 py-0.5 font-mono">
                          Request Declined
                        </span>
                        <h4 className="font-bold text-sm text-gray-900 mt-2">Declined by: {selectedFarm.managerName}</h4>
                        <div className="mt-2 text-xs border-l-2 border-red-300 pl-3 py-1 bg-red-50 text-red-800 italic">
                          "{selectedFarm.managerDeclinedReason || 'No response reason provided.'}"
                        </div>
                      </div>

                      {canModifyFarmDetails && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => setIsAssigningVet(true)}
                            className="cursor-pointer bg-[#5a5a40] text-white hover:bg-[#3e3e2b] text-[10px] font-bold py-2 px-3 rounded-lg border-none"
                          >
                            Reinvite / Choose Another Veterinarian
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {selectedFarm.managerStatus === 'linked' && (
                    <div className="bg-emerald-50/30 border border-emerald-100 rounded-xl p-5 flex flex-col md:flex-row items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-emerald-600 rounded-full flex items-center justify-center text-white text-lg font-black shadow-sm">
                          🩺
                        </div>
                        <div>
                          <strong className="text-emerald-900 block font-sans text-sm">{selectedFarm.managerName}</strong>
                          <span className="text-[10px] uppercase font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded-md mt-1 inline-block">
                            Connected Livestock Healthcare Manager
                          </span>
                        </div>
                      </div>

                      {canModifyFarmDetails && (
                        <button
                          onClick={handleChooseAnotherVet}
                          className="cursor-pointer bg-white hover:bg-neutral-50 border border-[#e3dec9] text-gray-500 font-bold text-[10px] px-3 py-2 rounded-lg transition-all"
                        >
                          Revoke Manager Access
                        </button>
                      )}

                      {isClinician && selectedFarm.managerUid === currentUser.uid && (
                        <button
                          onClick={handleLeaveFarmServices}
                          className="cursor-pointer bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 font-bold text-[10px] px-3.5 py-2.5 rounded-lg transition-all flex items-center gap-1.5"
                        >
                          🚪 Leave Farm Services
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Farm insights and herd analytics Recharts dashboard */}
            {activeSubTab === 'analytics' && (
              <div className="bg-white border border-[#e3dec9] border-b-[5px] border-b-[#cdc6ad] rounded-3xl p-6 shadow-xs space-y-6">
                <div>
                  <h3 className="font-serif font-black text-xl text-[#5a5a40] flex items-center gap-2">
                    📊 Farm Insights & Herd Analytics
                  </h3>
                  <p className="text-xs text-zinc-550 leading-relaxed mt-1">
                    Visual diagnostic monitoring parameters, herd compositions, vaccine coverage targets, and biosafety estimations computed directly from logged metrics.
                  </p>
                </div>
                <FarmAnalyticsDashboard 
                  animals={animals} 
                  batches={batches} 
                  tasks={tasks} 
                />
              </div>
            )}

            {/* Animals Individual Tab (Herds Identification) */}
            {activeSubTab === 'animals' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#f4f1e9] pb-4">
                  <div>
                    <h3 className="font-serif font-bold text-xl text-[#5a5a40]">Herd Identification & Durable Registers</h3>
                    <p className="text-xs text-[#7a766f]">Manage simple registries or launch detailed, expert-level individual & herd-wide data sheets.</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {canModifyAnimals && (
                      <>
                        <button
                          onClick={handleOpenNewIndividualRecord}
                          className="cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white text-xs py-2 px-3.5 rounded-xl font-bold flex items-center gap-1.5 shadow-xs border-none"
                        >
                          <PlusCircle className="w-4 h-4 text-emerald-100" /> New Individual Record
                        </button>
                        
                        <button
                          onClick={handleOpenNewHerdRecord}
                          className="cursor-pointer bg-amber-600 hover:bg-amber-700 text-white text-xs py-2 px-3.5 rounded-xl font-bold flex items-center gap-1.5 shadow-xs border-none"
                        >
                          <PlusCircle className="w-4 h-4 text-amber-100" /> New Herd Record
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Segment Selector tabs */}
                <div className="flex border-b border-[#f4f1e9] pb-0.5 gap-2 overflow-x-auto">
                  <button
                    onClick={() => {
                      if (recordDisplayTab !== 'individualDetailed' && recordDisplayTab !== 'registry') {
                        setRecordDisplayTab('individualDetailed');
                      }
                    }}
                    className={`pb-3 px-4 font-bold text-xs border-b-2 cursor-pointer transition-all border-none bg-transparent whitespace-nowrap ${
                      recordDisplayTab === 'individualDetailed' || recordDisplayTab === 'registry'
                        ? 'border-b-[#5a5a40] text-[#5a5a40] font-black'
                        : 'text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    📋 Animal Files & Registry ({individualRecords.length})
                  </button>
                  <button
                    onClick={() => setRecordDisplayTab('herdDetailed')}
                    className={`pb-3 px-4 font-bold text-xs border-b-2 cursor-pointer transition-all border-none bg-transparent whitespace-nowrap ${
                      recordDisplayTab === 'herdDetailed'
                        ? 'border-b-[#5a5a40] text-[#5a5a40] font-black'
                        : 'text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    📊 Herd & Flock Master Registers ({herdRecords.length})
                  </button>
                </div>

                {(recordDisplayTab === 'individualDetailed' || recordDisplayTab === 'registry') && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center pb-2 flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-[#5a5a40] tracking-wider uppercase">Unified Registry Group</span>
                        <div className="flex bg-stone-100 p-0.5 rounded-lg border border-stone-200">
                          <button
                            type="button"
                            onClick={() => setRecordDisplayTab('individualDetailed')}
                            className={`px-2.5 py-1 text-[10px] font-semibold rounded-md border-none cursor-pointer transition-all ${
                              recordDisplayTab === 'individualDetailed'
                                ? 'bg-[#5a5a40] text-white shadow-xs'
                                : 'text-stone-500 hover:text-stone-700 bg-transparent'
                            }`}
                          >
                            🎴 Detailed Cards
                          </button>
                          <button
                            type="button"
                            onClick={() => setRecordDisplayTab('registry')}
                            className={`px-2.5 py-1 text-[10px] font-semibold rounded-md border-none cursor-pointer transition-all ${
                              recordDisplayTab === 'registry'
                                ? 'bg-[#5a5a40] text-white shadow-xs'
                                : 'text-stone-500 hover:text-stone-700 bg-transparent'
                            }`}
                          >
                            ▤ Scan Table
                          </button>
                        </div>
                      </div>
                      <button
                        onClick={handleOpenNewIndividualRecord}
                        className="cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold py-1.5 px-3 rounded-lg flex items-center gap-1.5 border-none shadow-xs"
                      >
                        <Plus className="w-3.5 h-3.5" /> Start New Animal File
                      </button>
                    </div>

                    {/* Bulk Status Tagging Action Panel */}
                    {individualRecords.length > 0 && (
                      <div className="bg-[#fcfbf9] border border-[#e3dec9] rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-3xs">
                        <div className="flex items-center gap-2.5">
                          <input 
                            type="checkbox"
                            checked={selectedAnimalIds.length > 0 && selectedAnimalIds.length === individualRecords.length}
                            ref={el => {
                              if (el) {
                                el.indeterminate = selectedAnimalIds.length > 0 && selectedAnimalIds.length < individualRecords.length;
                              }
                            }}
                            onChange={handleToggleSelectAll}
                            className="w-4 h-4 rounded text-[#5a5a40] border-[#cdc6ad] focus:ring-[#5a5a40] cursor-pointer"
                          />
                          <div className="text-xs">
                            <span className="font-bold text-[#5a5a40]">{selectedAnimalIds.length}</span> / <span className="text-gray-500">{individualRecords.length} selected</span>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
                          <span className="text-[10px] uppercase font-black tracking-widest text-[#a39c83] font-mono">Assign Label:</span>
                          {['Healthy', 'Vaccinated', 'Treated', 'Quarantined', 'Sick'].map((status) => (
                            <button
                              key={status}
                              type="button"
                              disabled={selectedAnimalIds.length === 0}
                              onClick={() => handleBulkTagStatus(status)}
                              className={`cursor-pointer text-xs font-black py-1.5 px-3 rounded-xl border transition-all ${
                                selectedAnimalIds.length === 0
                                  ? 'bg-stone-50 text-stone-300 border-stone-200 cursor-not-allowed opacity-60'
                                  : status === 'Healthy'
                                  ? 'bg-emerald-50 hover:bg-emerald-105 text-emerald-800 border-emerald-200'
                                  : status === 'Vaccinated'
                                  ? 'bg-blue-50 hover:bg-blue-105 text-blue-800 border-blue-200'
                                  : status === 'Treated'
                                  ? 'bg-teal-50 hover:bg-teal-105 text-teal-850 border-teal-200'
                                  : status === 'Quarantined'
                                  ? 'bg-purple-50 hover:bg-purple-105 text-purple-800 border-purple-200'
                                  : 'bg-red-50 hover:bg-red-105 text-red-850 border-red-200'
                              }`}
                            >
                              🏷️ {status}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {individualRecords.length === 0 ? (
                      <div className="bg-[#faf9f5] border border-dashed border-[#e3dec9] rounded-2xl p-12 text-center text-xs text-gray-500 space-y-3">
                        <p className="font-semibold text-gray-700">No Animal Profiles Enrolled Yet</p>
                        <p className="text-gray-400 max-w-sm mx-auto">Create a comprehensive profile to track ancestry pedigree, morning/evening milking, vaccination cards, and clinical histories.</p>
                        <button
                          onClick={handleOpenNewIndividualRecord}
                          className="cursor-pointer bg-[#5a5a40] hover:bg-[#3e3e2b] text-white text-[11px] font-bold py-2 px-4 rounded-xl border-none"
                        >
                          Launch New Animal File
                        </button>
                      </div>
                    ) : recordDisplayTab === 'individualDetailed' ? (
                      /* Card Grid View */
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {individualRecords.map(rec => (
                          <div 
                            key={rec.id} 
                            className={`border rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:border-[#5a5a40] transition-all ${
                              selectedAnimalIds.includes(rec.id!) 
                                ? 'bg-amber-50/20 border-[#5a5a40]' 
                                : 'bg-white border-[#e3dec9]'
                            }`}
                          >
                            <div className="space-y-3">
                              <div className="flex justify-between items-start">
                                <div className="flex gap-2.5 items-start">
                                  <input 
                                    type="checkbox"
                                    checked={selectedAnimalIds.includes(rec.id!)}
                                    onChange={() => handleToggleAnimalSelection(rec.id!)}
                                    className="w-4 h-4 rounded text-[#5a5a40] border-[#cdc6ad] focus:ring-[#5a5a40] cursor-pointer mt-1"
                                  />
                                  <div>
                                    <span className="text-[10px] uppercase tracking-wide bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md font-extrabold font-mono">
                                      {rec.species} File
                                    </span>
                                    <h5 className="font-serif font-black text-lg text-gray-900 mt-1">{rec.name || 'Unnamed Animal'}</h5>
                                    <span className="text-xs text-gray-500 font-mono block">Tag: {rec.animalId || 'N/A'}</span>
                                    {rec.earTagNumber && <span className="font-mono text-[9px] text-emerald-800 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-100 italic mt-1 inline-block">Ear Tag: {rec.earTagNumber}</span>}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <span className="text-xs font-bold text-[#5a5a40]">{rec.breed || 'Breed Unspecified'}</span>
                                  <span className="text-[10px] text-gray-400 block font-mono">Age: {rec.age || 'N/A'}</span>
                                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase inline-block mt-1 ${
                                    rec.healthStatus === 'Sick' ? 'bg-red-100 text-red-800' :
                                    rec.healthStatus === 'Under Treatment' ? 'bg-amber-100 text-amber-900' :
                                    rec.healthStatus === 'Quarantined' ? 'bg-purple-100 text-purple-800' :
                                    'bg-emerald-100 text-emerald-800'
                                  }`}>
                                    {rec.healthStatus || 'Healthy'}
                                  </span>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-2 text-[11px] bg-[#fafaf7] p-3 rounded-xl border border-stone-100 font-sans">
                                <div>
                                  <span className="text-gray-400 block text-[9px] uppercase font-bold">Sire ID (Father)</span>
                                  <strong className="text-neutral-800">{rec.sireId || 'None'}</strong>
                                </div>
                                <div>
                                  <span className="text-gray-400 block text-[9px] uppercase font-bold">Dam ID (Mother)</span>
                                  <strong className="text-neutral-800">{rec.damId || 'None'}</strong>
                                </div>
                                <div className="mt-1">
                                  <span className="text-gray-400 block text-[9px] uppercase font-bold">Reproduction</span>
                                  <span className="text-neutral-800 truncate block">
                                    {rec.pregnancyDiagDate ? `Pregnant (${rec.pregnancyDiagDate})` : 'No breeding logs'}
                                  </span>
                                </div>
                                <div className="mt-1">
                                  <span className="text-gray-400 block text-[9px] uppercase font-bold">Yield Log (Daily)</span>
                                  <strong className="text-[#5a5a40]">
                                    {rec.morningMilk || rec.eveningMilk ? `${((Number(rec.morningMilk) || 0) + (Number(rec.eveningMilk) || 0))} L/day` : 'N/A'}
                                  </strong>
                                </div>
                              </div>

                              <div className="flex flex-wrap items-center gap-1.5 text-[9px] font-mono tracking-wider text-gray-500">
                                <span className="bg-neutral-100 px-2 py-0.5 rounded">Med-Logs: {rec.healthRecords?.length || 0}</span>
                                <span className="bg-neutral-100 px-2 py-0.5 rounded">Vax-Logs: {rec.vaccinationRecords?.length || 0}</span>
                                <span className="bg-neutral-100 px-2 py-0.5 rounded">Lab-Logs: {rec.labRecords?.length || 0}</span>
                              </div>
                            </div>

                            <div className="flex gap-2 pt-4 mt-4 border-t border-[#f4f1e9] justify-end">
                              <button
                                onClick={() => handleDeleteIndividualRecord(rec.id!)}
                                className="cursor-pointer bg-red-50 hover:bg-red-100 text-red-700 text-xs py-1.5 px-3 rounded-lg font-bold border border-[#ebdcdc]"
                              >
                                Delete File
                              </button>
                              <button
                                onClick={() => handleOpenEditIndividualRecord(rec)}
                                className="cursor-pointer bg-amber-500 hover:bg-amber-600 text-white text-xs py-1.5 px-4 rounded-lg font-bold border-none shadow-xs"
                              >
                                Edit / View Profile
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      /* Scan Table View */
                      <div className="bg-white border border-[#e3dec9] rounded-2xl overflow-hidden shadow-xs">
                        <div className="overflow-x-auto w-full">
                          <table className="w-full min-w-[700px] text-left text-xs border-collapse">
                            <thead>
                              <tr className="bg-[#fcfbf9] border-b border-[#e3dec9]">
                                <th className="p-4 w-10 text-center">
                                  <input 
                                    type="checkbox"
                                    checked={selectedAnimalIds.length > 0 && selectedAnimalIds.length === individualRecords.length}
                                    ref={el => {
                                      if (el) {
                                        el.indeterminate = selectedAnimalIds.length > 0 && selectedAnimalIds.length < individualRecords.length;
                                      }
                                    }}
                                    onChange={handleToggleSelectAll}
                                    className="w-4 h-4 rounded text-[#5a5a40] border-[#cdc6ad] focus:ring-[#5a5a40] cursor-pointer"
                                  />
                                </th>
                                <th className="p-4 font-bold text-[#5a5a40]">ID & Breed</th>
                                <th className="p-4 font-bold text-[#5a5a40]">Species</th>
                                <th className="p-4 font-bold text-[#5a5a40]">Gender & DOB</th>
                                <th className="p-4 font-bold text-[#5a5a40]">Weight</th>
                                <th className="p-4 font-bold text-[#5a5a40]">Status</th>
                                {canModifyAnimals && <th className="p-4 font-bold text-[#5a5a40] text-right">Actions</th>}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#f4f2ea]">
                              {individualRecords.map(a => (
                                <tr 
                                  key={a.id} 
                                  className={`hover:bg-[#fcfbf9]/50 transition-all ${
                                    selectedAnimalIds.includes(a.id!) ? 'bg-amber-50/10' : ''
                                  }`}
                                >
                                  <td className="p-4 w-10 text-center">
                                    <input 
                                      type="checkbox"
                                      checked={selectedAnimalIds.includes(a.id!)}
                                      onChange={() => handleToggleAnimalSelection(a.id!)}
                                      className="w-4 h-4 rounded text-[#5a5a40] border-[#cdc6ad] focus:ring-[#5a5a40] cursor-pointer"
                                    />
                                  </td>
                                  <td className="p-4 font-bold">
                                    <div className="font-bold text-[#5a5a40] hover:underline cursor-pointer flex items-center gap-1.5" onClick={() => handleOpenEditIndividualRecord(a)}>
                                      <span>🐄</span> {a.name || 'Unnamed Animal'}
                                    </div>
                                    <span className="font-mono text-[9px] text-[#7a766f]">ID: {a.animalId}</span>
                                    {a.earTagNumber && <span className="font-mono text-[9px] text-emerald-800 ml-2 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-100">Tag: {a.earTagNumber}</span>}
                                    {a.breed && <span className="text-[10px] text-gray-400 block mt-0.5 font-light">{a.breed}</span>}
                                  </td>
                                  <td className="p-4">
                                    <span className="font-semibold text-gray-700">{a.species}</span>
                                  </td>
                                  <td className="p-4">
                                    <div>{a.sex || 'Female'}</div>
                                    <div className="text-[10px] text-gray-400 font-mono italic">DOB: {a.dob || 'Unknown'}</div>
                                  </td>
                                  <td className="p-4 font-semibold text-gray-600">
                                    {a.bodyWeight ? `${a.bodyWeight} kg` : '-'}
                                  </td>
                                  <td className="p-4">
                                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                                      a.healthStatus === 'Sick' ? 'bg-red-100 text-red-800' :
                                      a.healthStatus === 'Under Treatment' ? 'bg-amber-100 text-amber-900' :
                                      a.healthStatus === 'Quarantined' ? 'bg-purple-100 text-purple-800' :
                                      'bg-emerald-100 text-emerald-800'
                                    }`}>
                                      {a.healthStatus || 'Healthy'}
                                    </span>
                                  </td>
                                  {canModifyAnimals && (
                                    <td className="p-4 text-right">
                                      <div className="flex gap-2 justify-end items-center">
                                        <button
                                          onClick={() => handleOpenEditIndividualRecord(a)}
                                          className="cursor-pointer text-amber-600 hover:text-amber-800 bg-transparent border-none p-1.5 font-medium text-xs hover:underline"
                                        >
                                          View/Edit
                                        </button>
                                        <button
                                          onClick={() => handleDeleteIndividualRecord(a.id!)}
                                          className="cursor-pointer text-red-600 hover:text-red-800 bg-transparent border-none p-1.5"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      </div>
                                    </td>
                                  )}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {recordDisplayTab === 'herdDetailed' && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center pb-2">
                      <h4 className="font-bold text-xs text-gray-400 tracking-wider uppercase">Comprehensive Herd Level Master Books</h4>
                      <button
                        onClick={handleOpenNewHerdRecord}
                        className="cursor-pointer bg-[#5a5a40] hover:bg-[#3e3e2b] text-white text-[11px] font-bold py-1.5 px-3 rounded-lg flex items-center gap-1.5 border-none shadow-xs"
                      >
                        <Plus className="w-3.5 h-3.5" /> Start New Herd Register
                      </button>
                    </div>

                    {herdRecords.length === 0 ? (
                      <div className="bg-neutral-50 border border-dashed border-[#e3dec9] rounded-2xl p-12 text-center text-xs text-gray-500 space-y-3">
                        <p className="font-semibold text-gray-700">No Herd Registers Enrolled</p>
                        <p className="text-gray-400 max-w-sm mx-auto">Track overall demographic inventory allocations, monthly production quotas, disease outbreak rates, feed formulations, and financial profit dashboards.</p>
                        <button
                          onClick={handleOpenNewHerdRecord}
                          className="cursor-pointer bg-[#5a5a40] hover:bg-[#3e3e2b] text-white text-[11px] font-bold py-2 px-4 rounded-xl border-none"
                        >
                          Create First Herd-Level Sheet
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {herdRecords.map(rec => (
                          <div key={rec.id} className="bg-white border border-[#e3dec9] rounded-2xl p-6 shadow-xs hover:border-[#5a5a40] transition-all grid grid-cols-1 lg:grid-cols-4 gap-6">
                            <div className="lg:col-span-1 border-r border-[#f4f1e9] pr-4 space-y-3">
                              <div>
                                <span className="text-[10px] tracking-widest bg-amber-100 text-amber-900 font-extrabold px-2.5 py-0.5 rounded-md uppercase font-mono">
                                  {rec.species} Master Book
                                </span>
                                <h5 className="font-serif font-black text-lg text-gray-900 mt-2">{rec.farmName || 'Unnamed Herd'}</h5>
                                <p className="text-[10px] text-gray-400 font-mono">Date updated: {rec.dateUpdated}</p>
                              </div>

                              <div className="text-xs space-y-1 text-gray-600 font-sans">
                                <div>Manager: <strong className="text-gray-800">{rec.farmManager || 'Unassigned'}</strong></div>
                                <div>Breeds Covered: <strong className="text-[#5a5a40]">{rec.breeds || 'Mixed'}</strong></div>
                                <div>Total Herd Size: <strong className="text-amber-800 text-sm font-sans">{rec.totalHerdSize || 0} Head</strong></div>
                              </div>

                              <div className="flex gap-2 pt-2">
                                <button
                                  onClick={() => handleDeleteHerdRecord(rec.id!)}
                                  className="cursor-pointer bg-red-50 hover:bg-red-100 text-red-600 text-[10px] p-2 rounded-lg font-bold border border-red-200"
                                >
                                  Delete
                                </button>
                                <button
                                  onClick={() => handleOpenEditHerdRecord(rec)}
                                  className="cursor-pointer flex-1 bg-[#5a5a40] hover:bg-[#3e3e2b] text-white text-[10px] py-1.5 rounded-lg font-bold border-none text-center"
                                >
                                  Edit Master
                                </button>
                              </div>
                            </div>

                            <div className="lg:col-span-3 space-y-4 font-sans">
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                <div className="bg-neutral-50 p-2.5 rounded-xl text-center">
                                  <span className="text-gray-400 block text-[9px] uppercase font-bold">Pregnant Qty</span>
                                  <strong className="text-neutral-800 text-base font-sans">{rec.inventory?.pregnantQty || 0}</strong>
                                </div>
                                <div className="bg-neutral-50 p-2.5 rounded-xl text-center">
                                  <span className="text-gray-400 block text-[9px] uppercase font-bold">Lactating Females</span>
                                  <strong className="text-neutral-800 text-base font-sans">{rec.inventory?.lactatingQty || 0}</strong>
                                </div>
                                <div className="bg-neutral-50 p-2.5 rounded-xl text-center">
                                  <span className="text-gray-400 block text-[9px] uppercase font-bold">Sick Qty</span>
                                  <strong className="text-red-700 text-base font-sans">{rec.inventory?.sickQty || 0}</strong>
                                </div>
                                <div className="bg-neutral-50 p-2.5 rounded-xl text-center">
                                  <span className="text-gray-400 block text-[9px] uppercase font-bold">Birth Qty</span>
                                  <strong className="text-emerald-700 text-base font-sans">{rec.reproductive?.births || 0}</strong>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[#fafbf9] p-4 rounded-xl border border-stone-100">
                                <div>
                                  <h6 className="text-[10px] text-gray-400 uppercase font-bold mb-2">Feeding Log Estimator (Daily)</h6>
                                  <div className="grid grid-cols-2 gap-2 text-[11px] text-gray-600">
                                    <div>Green Fodder: <strong>{rec.feedUsage?.greenFodderDaily || 0} kg</strong></div>
                                    <div>Dry Fodder: <strong>{rec.feedUsage?.dryFodderDaily || 0} kg</strong></div>
                                    <div>Concentrates: <strong>{rec.feedUsage?.concentrateDaily || 0} kg</strong></div>
                                    <div>Minerals: <strong>{rec.feedUsage?.mineralDaily || 0} g</strong></div>
                                  </div>
                                </div>
                                <div>
                                  <h6 className="text-[10px] text-gray-400 uppercase font-bold mb-2">KPI Target Compliance</h6>
                                  <div className="space-y-1.5 text-[10px]">
                                    <div className="flex justify-between">
                                      <span>Mortality Target: {rec.kpis?.mortalityPctTarget || 0}%</span>
                                      <span className="font-bold text-gray-700">Actual: {rec.kpis?.mortalityPctActual || 0}%</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>Conception Target: {rec.kpis?.conceptionPctTarget || 0}%</span>
                                      <span className="font-bold text-gray-700">Actual: {rec.kpis?.conceptionPctActual || 0}%</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>ADG Target: {rec.kpis?.adgTarget || 0} kg</span>
                                      <span className="font-bold text-gray-700">Actual: {rec.kpis?.adgActual || 0} kg</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Batches flock list */}
            {activeSubTab === 'batches' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center border-b border-[#f4f1e9] pb-4">
                  <div>
                    <h3 className="font-serif font-bold text-xl text-[#5a5a40]">Batch & Flock Registry</h3>
                    <p className="text-xs text-[#7a766f]">Manage batch/group records for commercial poultry farming, flocks, or clustered populations.</p>
                  </div>
                  {canModifyAnimals && (
                    <button
                      onClick={() => setShowAddBatchForm(!showAddBatchForm)}
                      className="cursor-pointer bg-[#5a5a40] hover:bg-[#3e3e2b] text-white text-xs py-2 px-4 rounded-xl font-bold flex items-center gap-1.5 shadow-sm border-none"
                    >
                      {showAddBatchForm ? 'Cancel Form' : <><Plus className="w-4 h-4" /> Register Flock</>}
                    </button>
                  )}
                </div>

                {/* Add Batch form */}
                <AnimatePresence>
                  {showAddBatchForm && (
                     <motion.form
                       onSubmit={handleRegisterBatch}
                       initial={{ opacity: 0, y: -10 }}
                       animate={{ opacity: 1, y: 0 }}
                       exit={{ opacity: 0, y: -10 }}
                       className="bg-[#fdfbf7] border border-[#e3dec9] rounded-2xl p-6 gap-4 grid grid-cols-1 md:grid-cols-3"
                     >
                       <div className="col-span-1 md:col-span-3 pb-2 border-b border-[#f4f1e9]">
                         <h4 className="font-bold text-sm text-[#5a5a40]">New Commercial Flock Entry</h4>
                       </div>

                       <div>
                         <label className="block text-xs font-bold text-gray-600 mb-1">Flock / Batch Name *</label>
                         <input
                           type="text"
                           placeholder="e.g. Broiler Batch #4"
                           required
                           value={batchName}
                           onChange={(e) => setBatchName(e.target.value)}
                           className="w-full bg-white border border-[#e3dec9] rounded-xl px-3 py-2 text-xs focus:outline-[#5a5a40]"
                         />
                       </div>

                       <div>
                         <label className="block text-xs font-bold text-gray-600 mb-1">Species *</label>
                         <select
                           value={batchSpecies}
                           onChange={(e: any) => setBatchSpecies(e.target.value)}
                           className="w-full bg-white border border-[#e3dec9] rounded-xl px-3 py-2 text-xs focus:outline-[#5a5a40]"
                         >
                           <option value="Poultry">Poultry</option>
                           <option value="Other">Other Category</option>
                         </select>
                       </div>

                       <div>
                         <label className="block text-xs font-bold text-gray-600 mb-1">Total Quantity *</label>
                         <input
                           type="number"
                           required
                           placeholder="e.g. 500"
                           value={batchQuantity}
                           onChange={(e) => setBatchQuantity(e.target.value)}
                           className="w-full bg-white border border-[#e3dec9] rounded-xl px-3 py-2 text-xs focus:outline-[#5a5a40]"
                         />
                       </div>

                       <div>
                         <label className="block text-xs font-bold text-gray-600 mb-1">Arrival / Setup Date *</label>
                         <input
                           type="date"
                           required
                           value={batchArrivalDate}
                           onChange={(e) => setBatchArrivalDate(e.target.value)}
                           className="w-full bg-white border border-[#e3dec9] rounded-xl px-3 py-2 text-xs focus:outline-[#5a5a40]"
                         />
                       </div>

                       <div>
                         <label className="block text-xs font-bold text-gray-600 mb-1">Breed / Hybrid Type</label>
                         <input
                           type="text"
                           placeholder="e.g. Cobb 500"
                           value={batchBreed}
                           onChange={(e) => setBatchBreed(e.target.value)}
                           className="w-full bg-white border border-[#e3dec9] rounded-xl px-3 py-2 text-xs focus:outline-[#5a5a40]"
                         />
                       </div>

                       <div className="flex items-end justify-end pt-5 col-span-1 md:col-span-3">
                         <button
                           type="submit"
                            className="cursor-pointer bg-[#5a5a40] hover:bg-[#3e3e2b] text-white text-xs font-bold py-2.5 px-6 rounded-xl border-none shadow-sm"
                          >
                            Acclimate Flock & Generate Vaccine Alerts
                          </button>
                        </div>
                      </motion.form>
                   )}
                </AnimatePresence>

                {/* Batches Table list */}
                {batches.length === 0 ? (
                  <div className="bg-white border rounded-2xl p-12 text-center text-xs text-gray-400">
                    No active commercial flocks/batches listed. Click "Register Flock" above.
                  </div>
                ) : (
                  <div className="bg-white border border-[#e3dec9] rounded-2xl overflow-hidden shadow-xs">
                    <div className="overflow-x-auto w-full">
                      <table className="w-full min-w-[700px] text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-[#fcfbf9] border-b border-[#e3dec9]">
                            <th className="p-4 font-bold text-[#5a5a40]">Batch & Variety</th>
                            <th className="p-4 font-bold text-[#5a5a40]">Quantity</th>
                            <th className="p-4 font-bold text-[#5a5a40]">Arrival Date</th>
                            <th className="p-4 font-bold text-[#5a5a40]">Category</th>
                            <th className="p-4 font-bold text-[#5a5a40]">State</th>
                            {canModifyAnimals && <th className="p-4 font-bold text-[#5a5a40] text-right">Delete</th>}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#f4f2ea]">
                          {batches.map(b => (
                            <tr key={b.id} className="hover:bg-[#fcfbf9]/50 transition-all">
                              <td className="p-4 font-bold">
                                <div>{b.batchName}</div>
                                {b.breed && <span className="text-[10px] text-gray-400 block">{b.breed}</span>}
                              </td>
                              <td className="p-4 font-extrabold text-[#5a5a40] font-sans">
                                {b.quantity} birds / head
                              </td>
                              <td className="p-4 text-gray-600 font-mono">
                                {b.arrivalDate || '-'}
                              </td>
                              <td className="p-4 font-semibold text-gray-600">
                                {b.species}
                              </td>
                              <td className="p-4">
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                                  b.status === 'Active' ? 'bg-emerald-100 text-emerald-800 animate-pulse' :
                                  'bg-gray-100 text-gray-600'
                                }`}>
                                  {b.status}
                                </span>
                              </td>
                              {canModifyAnimals && (
                                <td className="p-4 text-right">
                                  <button
                                    onClick={() => handleDeleteBatch(b.id)}
                                    className="cursor-pointer text-red-600 hover:text-red-800 bg-transparent border-none p-1"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Scheduled Tasks Tab */}
            {activeSubTab === 'tasks' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center border-b border-[#f4f1e9] pb-4">
                  <div>
                    <h3 className="font-serif font-bold text-xl text-[#5a5a40]">Schedules & Treatment Records</h3>
                    <p className="text-xs text-[#7a766f]">Plan and review preventative booster immunizations, deworming, and clinical checks.</p>
                  </div>
                  {canModifyAnimals && (
                    <button
                      onClick={() => setShowAddTaskForm(!showAddTaskForm)}
                      className="cursor-pointer bg-[#5a5a40] hover:bg-[#3e3e2b] text-white text-xs py-2 px-4 rounded-xl font-bold flex items-center gap-1.5 shadow-sm border-none"
                    >
                      {showAddTaskForm ? 'Cancel Manual Form' : <><Plus className="w-4 h-4" /> Schedule Custom Service</>}
                    </button>
                  )}
                </div>

                {/* Add Task manual Form */}
                <AnimatePresence>
                  {showAddTaskForm && (
                     <motion.form
                       onSubmit={handleManualCreateTask}
                       initial={{ opacity: 0, y: -10 }}
                       animate={{ opacity: 1, y: 0 }}
                       exit={{ opacity: 0, y: -10 }}
                       className="bg-[#fdfbf7] border border-[#e3dec9] rounded-2xl p-6 gap-4 grid grid-cols-1 md:grid-cols-3"
                     >
                       <div className="col-span-1 md:col-span-3 pb-2 border-b border-[#f4f1e9]">
                         <h4 className="font-bold text-sm text-[#5a5a40]">Schedule Manual Service Assignment</h4>
                       </div>

                       <div>
                         <label className="block text-xs font-bold text-gray-600 mb-1">Service Type *</label>
                         <select
                           value={taskServiceType}
                           onChange={(e) => setTaskServiceType(e.target.value)}
                           className="w-full bg-white border border-[#e3dec9] rounded-xl px-3 py-2 text-xs focus:outline-[#5a5a40]"
                         >
                           <option value="Vaccination">Vaccination</option>
                           <option value="Deworming">Deworming</option>
                           <option value="Booster Vaccination">Booster Vaccination</option>
                           <option value="Disease Treatment">Disease Treatment</option>
                           <option value="Pregnancy Diagnosis">Pregnancy Diagnosis</option>
                           <option value="Artificial Insemination">Artificial Insemination</option>
                           <option value="Surgery">Surgery</option>
                           <option value="General Checkup">General Checkup</option>
                         </select>
                       </div>

                       <div>
                         <label className="block text-xs font-bold text-gray-600 mb-1">Target Registry Tier *</label>
                         <select
                           value={taskTargetType}
                           onChange={(e: any) => {
                             setTaskTargetType(e.target.value);
                             setTaskTargetId('');
                           }}
                           className="w-full bg-white border border-[#e3dec9] rounded-xl px-3 py-2 text-xs focus:outline-[#5a5a40]"
                         >
                           <option value="individual">Individual Herd</option>
                           <option value="batch">Flock / Batch</option>
                         </select>
                       </div>

                       <div>
                         <label className="block text-xs font-bold text-gray-600 mb-1">Identify Target *</label>
                         <select
                           value={taskTargetId}
                           onChange={(e) => setTaskTargetId(e.target.value)}
                           required
                           className="w-full bg-white border border-[#e3dec9] rounded-xl px-3 py-2 text-xs focus:outline-[#5a5a40]"
                         >
                           <option value="">-- Choose Target --</option>
                           {taskTargetType === 'individual'
                             ? animals.map(a => <option key={a.id} value={a.id}>{a.animalId} ({a.species})</option>)
                             : batches.map(b => <option key={b.id} value={b.id}>{b.batchName} ({b.quantity} birds)</option>)
                           }
                         </select>
                       </div>

                       <div>
                         <label className="block text-xs font-bold text-gray-600 mb-1">Due Date *</label>
                         <input
                           type="date"
                           required
                           value={taskDueDate}
                           onChange={(e) => setTaskDueDate(e.target.value)}
                           className="w-full bg-white border border-[#e3dec9] rounded-xl px-3 py-2 text-xs focus:outline-[#5a5a40]"
                         />
                       </div>

                       <div className="col-span-1 md:col-span-2">
                         <label className="block text-xs font-bold text-gray-600 mb-1">Additional Clinical Notes</label>
                         <input
                           type="text"
                           placeholder="Describe custom diagnostic instruction or vaccine batch details"
                           value={taskNotes}
                           onChange={(e) => setTaskNotes(e.target.value)}
                           className="w-full bg-white border border-[#e3dec9] rounded-xl px-3 py-2 text-xs focus:outline-[#5a5a40]"
                         />
                       </div>

                       <div className="flex items-end justify-end pt-5 col-span-1 md:col-span-3">
                         <button
                           type="submit"
                           className="cursor-pointer bg-[#5a5a40] hover:bg-[#3e3e2b] text-white text-xs font-bold py-2.5 px-6 rounded-xl border-none shadow-sm"
                         >
                           Incorporate Scheduled Task
                         </button>
                       </div>
                     </motion.form>
                  )}
                </AnimatePresence>

                {/* Tasks view */}
                {tasks.length === 0 ? (
                  <div className="bg-white border rounded-2xl p-12 text-center text-xs text-gray-400">
                    No services or vaccination logs scheduled. System schedules appear when animals register.
                  </div>
                ) : (
                  <div className="bg-white border border-[#e3dec9] rounded-2xl overflow-hidden shadow-xs">
                    <div className="overflow-x-auto w-full">
                      <table className="w-full min-w-[700px] text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-[#fcfbf9] border-b border-[#e3dec9]">
                            <th className="p-4 font-bold text-[#5a5a40]">Service & Target</th>
                            <th className="p-4 font-bold text-[#5a5a40]">Due Date</th>
                            <th className="p-4 font-bold text-[#5a5a40]">Verification</th>
                            <th className="p-4 font-bold text-[#5a5a40]">Protocol History</th>
                            {canPerformClinicalTasks && <th className="p-4 font-bold text-[#5a5a40] text-center">clinical action</th>}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#f4f2ea]">
                          {tasks.sort((a,b) => a.dueDate.localeCompare(b.dueDate)).map(t => (
                            <tr key={t.id} className="hover:bg-[#fcfbf9]/50 transition-all">
                              <td className="p-4">
                                <span className="font-bold block text-sm">{t.serviceType}</span>
                                <span className="text-gray-400 text-[10px] block mt-0.5">Target: {t.targetName}</span>
                              </td>
                              <td className="p-4 font-mono font-bold text-[#5a5a40]">
                                {t.dueDate}
                              </td>
                              <td className="p-4">
                                <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase ${
                                  t.status === 'Completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900 animate-pulse'
                                }`}>
                                  {t.status}
                                </span>
                              </td>
                              <td className="p-4">
                                {t.status === 'Completed' ? (
                                  <div className="space-y-0.5 text-[10px]">
                                    <p className="text-gray-700">Verified on: <strong className="font-mono">{t.completedDate}</strong></p>
                                    {t.completedByName && <p className="text-gray-500">By: {t.completedByName}</p>}
                                    {t.vaccineUsed && <p className="text-blue-700 font-bold bg-blue-50/50 px-1 py-0.5 inline-block rounded-md">Vax: {t.vaccineUsed}</p>}
                                    {t.notes && <p className="text-gray-500 italic mt-1 font-sans">"{t.notes}"</p>}
                                  </div>
                                ) : (
                                  <span className="text-gray-400 italic">Pre-scheduled {t.createdBy}</span>
                                )}
                              </td>
                              {canPerformClinicalTasks && (
                                <td className="p-4 text-center">
                                  {t.status === 'Pending' ? (
                                    <button
                                      onClick={() => {
                                        setTaskCompletionModal(t);
                                        setCompletionVaccine('');
                                        setCompletionNotes('');
                                      }}
                                      className="cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-extrabold tracking-widest uppercase py-2 px-3 rounded-lg border-none flex items-center justify-center gap-1 mx-auto"
                                    >
                                      <Check className="w-3.5 h-3.5" /> Complete
                                    </button>
                                  ) : (
                                    <span className="text-emerald-600 font-black">✓ verified</span>
                                  )}
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Farm Team Configuration Panel */}
            {activeSubTab === 'team' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center border-b border-[#f4f1e9] pb-4">
                  <div>
                    <h3 className="font-serif font-bold text-xl text-[#5a5a40]">Farm Team & Access Rules</h3>
                    <p className="text-xs text-[#7a766f]">Provision personnel roles to separate owners, managers, workers, and clinic assistants.</p>
                  </div>
                  {userRoleInSelectedFarm === 'Owner' && (
                    <button
                      onClick={() => setShowTeamInvite(!showTeamInvite)}
                      className="cursor-pointer bg-[#5a5a40] hover:bg-[#3e3e2b] text-white text-xs py-2 px-4 rounded-xl font-bold flex items-center gap-1.5 shadow-sm border-none"
                    >
                      {showTeamInvite ? 'Cancel Invite' : <><Plus className="w-4 h-4" /> Add Team Member</>}
                    </button>
                  )}
                </div>

                {/* Add member box */}
                <AnimatePresence>
                  {showTeamInvite && (
                    <motion.form
                      onSubmit={handleAddTeamMember}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="bg-[#fdfbf7] border border-[#e3dec9] rounded-2xl p-6 gap-4 grid grid-cols-1 md:grid-cols-4"
                    >
                      <div className="col-span-1 md:col-span-4 pb-1 border-b border-[#f4f1e9]">
                        <h4 className="font-bold text-sm text-[#5a5a40]">Invite Farm Personnel</h4>
                      </div>

                      <div className="col-span-1 md:col-span-2">
                        <label className="block text-xs font-bold text-gray-600 mb-1">Full Name</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Sajid Mahmood"
                          value={teamMemberName}
                          onChange={(e) => setTeamMemberName(e.target.value)}
                          className="w-full bg-white border border-[#e3dec9] rounded-xl px-3 py-2 text-xs focus:outline-[#5a5a40]"
                        />
                      </div>

                      <div className="col-span-1 md:col-span-2">
                        <label className="block text-xs font-bold text-gray-600 mb-1">Email Address</label>
                        <input
                          type="email"
                          required
                          placeholder="e.g. sajid@farm.com"
                          value={teamMemberEmail}
                          onChange={(e) => setTeamMemberEmail(e.target.value)}
                          className="w-full bg-white border border-[#e3dec9] rounded-xl px-3 py-2 text-xs focus:outline-[#5a5a40]"
                        />
                      </div>

                      <div className="col-span-1 md:col-span-2">
                        <label className="block text-xs font-bold text-gray-600 mb-1">Operational Role Authority</label>
                        <select
                          value={teamMemberRole}
                          onChange={(e: any) => setTeamMemberRole(e.target.value)}
                          className="w-full bg-white border border-[#e3dec9] rounded-xl px-3 py-2 text-xs focus:outline-[#5a5a40]"
                        >
                          <option value="Manager">Farm Manager (Read/Write Herds)</option>
                          <option value="Worker">Farm Worker (Read-Only/Daily Checkups)</option>
                          <option value="Veterinarian">Veterinarian (Clinical Administer)</option>
                          <option value="Assistant">Vet Assistant (Clinical Verification Assistant)</option>
                        </select>
                      </div>

                      <div className="flex items-end justify-end pt-5 col-span-1 md:col-span-2">
                        <button
                          type="submit"
                          className="cursor-pointer w-full bg-[#5a5a40] hover:bg-[#3e3e2b] text-white text-xs font-bold py-2.5 px-6 rounded-xl border-none shadow-sm"
                        >
                          Add Colleague Privileges
                        </button>
                      </div>
                    </motion.form>
                  )}
                </AnimatePresence>

                {/* Team Roster Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedFarm.team?.map((member, i) => (
                    <div key={i} className="bg-white border border-[#e3dec9] rounded-2xl p-5 flex items-start gap-4 shadow-xs">
                      <div className="p-3.5 bg-[#faf7f0] rounded-2xl font-black text-xs text-[#5a5a40]">
                        👩‍🌾
                      </div>
                      <div>
                        <strong className="text-gray-900 text-sm block font-sans">{member.name}</strong>
                        <span className="text-[10px] text-gray-400 font-mono block mt-0.5">{member.email}</span>
                        
                        <div className="mt-2.5 flex items-center gap-1.5">
                          <Shield className="w-3.5 h-3.5 text-amber-500" />
                          <span className="text-[10px] uppercase font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-100">
                            {member.role}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: REGISTER FARM MODAL */}
      {showCreateFarmModal && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-xs z-[400] flex items-center justify-center p-4">
          <motion.form
            onSubmit={handleCreateFarm}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white border border-[#e3dec9] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl relative"
          >
            <button
              type="button"
              onClick={() => setShowCreateFarmModal(false)}
              className="absolute right-4 top-4 hover:bg-[#faf7f0] p-1.5 rounded-full text-gray-400 cursor-pointer border border-[#e3dec9]"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="font-serif text-xl font-bold text-[#5a5a40]">Register New Farm Dashboard</h3>
            <p className="text-xs text-[#7a766f]">Enter your agricultural property details to set up customized vaccination and herd schedules.</p>

            <div className="space-y-3 font-sans">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Farm Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Al-Rehman Dairy Farm"
                  required
                  value={newFarmName}
                  onChange={(e) => setNewFarmName(e.target.value)}
                  className="w-full bg-white border border-[#e3dec9] rounded-xl px-3 py-2 text-xs focus:outline-[#5a5a40]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Farm Location *</label>
                <input
                  type="text"
                  placeholder="e.g. Jhang Road, Faisalabad"
                  required
                  value={newFarmLocation}
                  onChange={(e) => setNewFarmLocation(e.target.value)}
                  className="w-full bg-white border border-[#e3dec9] rounded-xl px-3 py-2 text-xs focus:outline-[#5a5a40]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Farm Type Classification *</label>
                <select
                  value={newFarmType}
                  onChange={(e: any) => setNewFarmType(e.target.value)}
                  className="w-full bg-white border border-[#e3dec9] rounded-xl px-3 py-2 text-xs focus:outline-[#5a5a40]"
                >
                  <option value="Dairy Farm">Dairy Farm</option>
                  <option value="Buffalo Farm">Buffalo Farm</option>
                  <option value="Poultry Farm">Poultry Farm</option>
                  <option value="Goat Farm">Goat Farm</option>
                  <option value="Sheep Farm">Sheep Farm</option>
                  <option value="Mixed Farm">Mixed Farm (Multiple Species)</option>
                </select>
              </div>

              {newFarmType === 'Mixed Farm' && (
                <div className="p-4 bg-amber-50/50 rounded-xl space-y-2.5 border border-[#e3dec9]">
                  <p className="text-[10px] uppercase font-black tracking-wider text-gray-500 block">Mixed Farm Options</p>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={newMixedOptions.cattle}
                        onChange={(e) => setNewMixedOptions({ ...newMixedOptions, cattle: e.target.checked })}
                      /> Cattle
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={newMixedOptions.buffalo}
                        onChange={(e) => setNewMixedOptions({ ...newMixedOptions, buffalo: e.target.checked })}
                      /> Buffalo
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={newMixedOptions.goats}
                        onChange={(e) => setNewMixedOptions({ ...newMixedOptions, goats: e.target.checked })}
                      /> Goats
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={newMixedOptions.sheep}
                        onChange={(e) => setNewMixedOptions({ ...newMixedOptions, sheep: e.target.checked })}
                      /> Sheep
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={newMixedOptions.poultry}
                        onChange={(e) => setNewMixedOptions({ ...newMixedOptions, poultry: e.target.checked })}
                      /> Poultry
                    </label>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setShowCreateFarmModal(false)}
                className="flex-1 cursor-pointer bg-neutral-50 hover:bg-neutral-100 text-gray-500 font-bold py-2 rounded-xl text-xs border border-gray-200"
              >
                Close
              </button>
              <button
                type="submit"
                className="flex-1 cursor-pointer bg-[#5a5a40] hover:bg-[#3e3e2b] text-white font-bold py-2 rounded-xl text-xs border-none"
              >
                Create Workspace
              </button>
            </div>
          </motion.form>
        </div>
      )}

      {/* MODAL 2: ASSIGN VET / SEARCH CLINICIAN MODAL */}
      {isAssigningVet && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-xs z-[400] flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white border border-[#e3dec9] rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative max-h-[85vh] overflow-y-auto"
          >
            <button
              onClick={() => setIsAssigningVet(false)}
              className="absolute right-4 top-4 hover:bg-[#faf7f0] p-1.5 rounded-full text-gray-400 cursor-pointer border border-[#e3dec9]"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="font-serif text-xl font-bold text-[#5a5a40]">Assign Veterinary Manager</h3>
            <p className="text-xs text-[#7a766f]">Search clinics and registered veterinarians within range to act as healthcare administrators.</p>

            <div className="relative">
              <input
                type="text"
                placeholder="Search by clinician name, specialization, or clinic..."
                value={vetSearchQuery}
                onChange={(e) => setVetSearchQuery(e.target.value)}
                className="w-full bg-white border border-[#e3dec9] rounded-xl pl-9 pr-4 py-2.5 text-xs focus:outline-[#5a5a40]"
              />
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
            </div>

            <div className="space-y-3 font-sans max-h-[40vh] overflow-y-auto pr-1">
              {filteredClinicians.length === 0 ? (
                <div className="text-center py-8 text-xs text-gray-400">
                  No matching registered professional veterinarians found.
                </div>
              ) : (
                filteredClinicians.map(practitioner => (
                  <div key={practitioner.uid} className="bg-[#faf9f5] border border-[#e3dec9] rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:bg-[#f3eee0]/40 transition-all">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <strong className="text-sm text-gray-900 leading-tight">{practitioner.name}</strong>
                        <span className="text-[8px] bg-[#5a5a40] text-white px-1.5 py-0.5 rounded-md font-bold uppercase">
                          {practitioner.role}
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-400 font-mono flex items-center gap-1">
                        <MapPin className="w-3 h-3 block inline" /> {practitioner.address || 'Address unlisted'}
                      </p>
                      {practitioner.expertise && (
                        <p className="text-xs text-gray-600">Expertise: <strong className="text-[#5a5a40]">{practitioner.expertise}</strong></p>
                      )}
                    </div>

                    <button
                      onClick={() => handleAssignVeterinarian(practitioner)}
                      className="cursor-pointer bg-[#5a5a40] text-white hover:bg-[#3e3e2b] text-[10px] font-black px-3.5 py-2 rounded-lg border-none flex items-center gap-1 hover:scale-103 transition-all"
                    >
                      Request Link
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="pt-4">
              <button
                onClick={() => setIsAssigningVet(false)}
                className="w-full cursor-pointer bg-neutral-50 hover:bg-neutral-100 text-gray-500 font-bold py-2 rounded-xl text-xs border border-gray-200"
              >
                Cancel Selection
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* MODAL 3: DISMISS DECLINE TEXT BOX */}
      {declineReasonModal && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-xs z-[500] flex items-center justify-center p-4">
          <div className="bg-white border border-[#e3dec9] rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl relative">
            <h3 className="font-serif text-lg font-bold text-[#5a5a40]">Decline Healthcare Invitation</h3>
            <p className="text-xs text-gray-500">Please provide a constructive reason for declining the farm manager position so the owner can coordinate next steps.</p>

            <textarea
              rows={3}
              placeholder="e.g. Out of my practice distance range, or fully booked schedule."
              required
              value={declineReasonText}
              onChange={(e) => setDeclineReasonText(e.target.value)}
              className="w-full bg-white border border-[#e3dec9] rounded-xl px-3 py-2 text-xs focus:outline-[#5a5a40]"
            />

            <div className="flex gap-2">
              <button
                onClick={() => setDeclineReasonModal(null)}
                className="flex-1 cursor-pointer bg-neutral-50 hover:bg-neutral-100 text-gray-500 py-2 rounded-xl text-xs font-bold border border-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleDeclineFarmManager}
                className="flex-1 cursor-pointer bg-red-600 hover:bg-red-700 text-white py-2 rounded-xl text-xs font-bold border-none"
              >
                Decline Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: CONFIRM TASK COMPLETION (Steps 9 & 10) */}
      {taskCompletionModal && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-xs z-[450] flex items-center justify-center p-4">
          <motion.form
            onSubmit={handleConfirmTaskCompletion}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white border border-[#e3dec9] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl relative"
          >
            <button
              type="button"
              onClick={() => setTaskCompletionModal(null)}
              className="absolute right-4 top-4 hover:bg-[#faf7f0] p-1.5 rounded-full text-gray-400 cursor-pointer border border-[#e3dec9]"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="font-serif text-lg font-bold text-[#5a5a40]">Confirm Service Completion</h3>
            <p className="text-xs text-gray-500">
              Complete task: <strong className="text-gray-900">"{taskCompletionModal.serviceType}"</strong> for target herd/batch: <strong className="text-emerald-700">{taskCompletionModal.targetName}</strong>.
            </p>

            <div className="space-y-3 font-sans">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Vaccine / Treatment Brand Used (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Bio-FMD Foot & Mouth vaccine"
                  value={completionVaccine}
                  onChange={(e) => setCompletionVaccine(e.target.value)}
                  className="w-full bg-white border border-[#e3dec9] rounded-xl px-3 py-2 text-xs focus:outline-[#5a5a40]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Observation / Clinical Notes</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Normal behavior. Stood test successfully. Next booster loop is required."
                  value={completionNotes}
                  onChange={(e) => setCompletionNotes(e.target.value)}
                  className="w-full bg-white border border-[#e3dec9] rounded-xl px-3 py-2 text-xs focus:outline-[#5a5a40]"
                />
              </div>

              {taskCompletionModal.autoScheduleNext && (
                <div className="p-3 bg-emerald-50 text-emerald-900 border border-emerald-150 rounded-xl text-[11px] leading-tight flex items-start gap-2">
                  <span className="text-base">📅</span>
                  <div>
                    <strong className="block">Repeat Loop Core Configured</strong>
                    <span className="opacity-80">Saving this task as complete will automatically schedule the next Booster recurrence in exactly 6 months. No manual calculation needed.</span>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setTaskCompletionModal(null)}
                className="flex-1 cursor-pointer bg-neutral-50 hover:bg-neutral-100 text-gray-500 font-bold py-2 rounded-xl text-xs border border-gray-200"
              >
                Close
              </button>
              <button
                type="submit"
                className="flex-1 cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-xl text-xs border-none"
              >
                Confirm Completion
              </button>
            </div>
          </motion.form>
        </div>
      )}

      {/* Comprehensive Individual Animal Record Modal */}
      {showIndividualRecordModal && activeIndividualRecord && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-xs z-[420] flex items-center justify-center p-4 overflow-y-auto">
          <motion.form
            ref={scrollToPopupStart}
            onSubmit={handleSaveIndividualRecord}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white border border-[#e3dec9] rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl relative my-8"
          >
            <button
              type="button"
              onClick={() => setShowIndividualRecordModal(false)}
              className="absolute right-4 top-4 hover:bg-[#faf7f0] p-1 rounded-full text-gray-400 cursor-pointer border border-[#e3dec9]"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="border-b border-[#f4f1e9] pb-3">
              <span className="text-[10px] uppercase font-bold text-amber-800">Individual Record Form</span>
              <h3 className="font-serif text-lg font-bold text-[#5a5a40]">
                {isEditingIndividual ? `Edit: ${activeIndividualRecord.name || activeIndividualRecord.animalId}` : 'New Individual Animal File'}
              </h3>
            </div>

            <div className="flex border-b border-[#fafaf7] pb-1 gap-2 overflow-x-auto text-[#5a5a40] text-xs font-bold leading-none">
              {["1. Identity", "2. Pedigree", "3. Health & Production", "4. Medical Logs & Finances"].map((name, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setIndFormStep(idx)}
                  className={`p-1.5 rounded border-none cursor-pointer ${indFormStep === idx ? 'bg-[#5a5a40] text-white' : 'bg-transparent text-gray-400'}`}
                >
                  {name}
                </button>
              ))}
            </div>

            <div ref={stepContainerRef} className="max-h-[50vh] overflow-y-auto pr-1 space-y-3 text-xs leading-normal">
              {indFormStep === 0 && (
                <div className="space-y-3">
                  {/* Identification Attributes Box */}
                  <div className="bg-[#faf9f5] border border-[#d3ccb4] rounded-xl p-3.5 space-y-3 shadow-2xs">
                    <span className="text-[10px] uppercase font-bold text-[#5a5a40] tracking-wider block border-b border-[#e3dec9] pb-1.5 mb-1">
                      🆔 Animal Identification Group
                    </span>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-gray-600 mb-1 font-bold">Animal Tag/ID *</label>
                        <input type="text" required value={activeIndividualRecord.animalId || ''} onChange={(e) => setActiveIndividualRecord({ ...activeIndividualRecord, animalId: e.target.value })} className="w-full bg-white border border-[#e3dec9] rounded-lg p-2 text-xs focus:ring-1 focus:ring-[#5a5a40]" />
                      </div>
                      <div>
                        <label className="block text-gray-600 mb-1 font-bold">Ear Tag Number</label>
                        <input type="text" value={activeIndividualRecord.earTagNumber || ''} onChange={(e) => setActiveIndividualRecord({ ...activeIndividualRecord, earTagNumber: e.target.value })} className="w-full bg-white border border-[#e3dec9] rounded-lg p-2 text-xs focus:ring-1 focus:ring-[#5a5a40]" />
                      </div>
                      <div>
                        <label className="block text-gray-600 mb-1 font-bold">Name / Nickname</label>
                        <input type="text" value={activeIndividualRecord.name || ''} onChange={(e) => setActiveIndividualRecord({ ...activeIndividualRecord, name: e.target.value })} className="w-full bg-white border border-[#e3dec9] rounded-lg p-2 text-xs focus:ring-1 focus:ring-[#5a5a40]" />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-gray-600 mb-1">Species *</label>
                      <select value={activeIndividualRecord.species || 'Cattle'} onChange={(e) => setActiveIndividualRecord({ ...activeIndividualRecord, species: e.target.value as any })} className="w-full bg-white border border-[#e3dec9] rounded-lg p-2 text-xs">
                        <option value="Cattle">Cattle</option>
                        <option value="Buffalo">Buffalo</option>
                        <option value="Goat">Goat</option>
                        <option value="Sheep">Sheep</option>
                      </select>
                    </div>
                  <div>
                    <label className="block text-gray-600 mb-1">Breed *</label>
                    <input type="text" placeholder="e.g. Sahiwal" value={activeIndividualRecord.breed || ''} onChange={(e) => setActiveIndividualRecord({ ...activeIndividualRecord, breed: e.target.value })} className="w-full bg-white border border-[#e3dec9] rounded-lg p-2 text-xs" />
                  </div>
                  <div>
                    <label className="block text-gray-600 mb-1">Sex / Gender *</label>
                    <select value={activeIndividualRecord.sex || 'Female'} onChange={(e) => setActiveIndividualRecord({ ...activeIndividualRecord, sex: e.target.value as any })} className="w-full bg-white border border-[#e3dec9] rounded-lg p-2 text-xs">
                      <option value="Female">Female</option>
                      <option value="Male">Male</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-600 mb-1">Purchase Price (Rs)</label>
                    <input type="number" value={activeIndividualRecord.purchasePrice || ''} onChange={(e) => setActiveIndividualRecord({ ...activeIndividualRecord, purchasePrice: Number(e.target.value) || null })} className="w-full bg-white border border-[#e3dec9] rounded-lg p-2 text-xs" />
                  </div>
                </div>
              </div>
            )}

              {indFormStep === 1 && (
                <div className="grid grid-cols-2 gap-3 font-sans">
                  <div>
                    <label className="block text-gray-600 mb-1">Sire ID (Father)</label>
                    <input type="text" value={activeIndividualRecord.sireId || ''} onChange={(e) => setActiveIndividualRecord({ ...activeIndividualRecord, sireId: e.target.value })} className="w-full bg-white border border-[#e3dec9] rounded-lg p-2 text-xs" />
                  </div>
                  <div>
                    <label className="block text-gray-600 mb-1">Dam ID (Mother)</label>
                    <input type="text" value={activeIndividualRecord.damId || ''} onChange={(e) => setActiveIndividualRecord({ ...activeIndividualRecord, damId: e.target.value })} className="w-full bg-white border border-[#e3dec9] rounded-lg p-2 text-xs" />
                  </div>
                  <div>
                    <label className="block text-gray-600 mb-1">Sire Breed</label>
                    <input type="text" value={activeIndividualRecord.breedOfSire || ''} onChange={(e) => setActiveIndividualRecord({ ...activeIndividualRecord, breedOfSire: e.target.value })} className="w-full bg-white border border-[#e3dec9] rounded-lg p-2 text-xs" />
                  </div>
                  <div>
                    <label className="block text-gray-600 mb-1">Dam Breed</label>
                    <input type="text" value={activeIndividualRecord.breedOfDam || ''} onChange={(e) => setActiveIndividualRecord({ ...activeIndividualRecord, breedOfDam: e.target.value })} className="w-full bg-white border border-[#e3dec9] rounded-lg p-2 text-xs" />
                  </div>
                  <div>
                    <label className="block text-gray-600 mb-1">Weight (kg)</label>
                    <input type="number" value={activeIndividualRecord.bodyWeight || ''} onChange={(e) => setActiveIndividualRecord({ ...activeIndividualRecord, bodyWeight: Number(e.target.value) || null })} className="w-full bg-white border border-[#e3dec9] rounded-lg p-2 text-xs" />
                  </div>
                  <div>
                    <label className="block text-gray-600 mb-1">BCS Score</label>
                    <input type="text" placeholder="e.g. 3.5" value={activeIndividualRecord.bcs || ''} onChange={(e) => setActiveIndividualRecord({ ...activeIndividualRecord, bcs: e.target.value })} className="w-full bg-white border border-[#e3dec9] rounded-lg p-2 text-xs" />
                  </div>
                </div>
              )}

              {indFormStep === 2 && (
                <div className="grid grid-cols-2 gap-3 font-sans">
                  <div>
                    <label className="block text-gray-600 mb-1">Pregnancy Diagnosis Date</label>
                    <input type="date" value={activeIndividualRecord.pregnancyDiagDate || ''} onChange={(e) => setActiveIndividualRecord({ ...activeIndividualRecord, pregnancyDiagDate: e.target.value })} className="w-full bg-white border border-[#e3dec9] rounded-lg p-2 text-xs" />
                  </div>
                  <div>
                    <label className="block text-gray-600 mb-1">Service Date</label>
                    <input type="date" value={activeIndividualRecord.serviceDate || ''} onChange={(e) => setActiveIndividualRecord({ ...activeIndividualRecord, serviceDate: e.target.value })} className="w-full bg-white border border-[#e3dec9] rounded-lg p-2 text-xs" />
                  </div>
                  <div>
                    <label className="block text-gray-600 mb-1">Morning Milk (L/day)</label>
                    <input type="number" step="0.1" value={activeIndividualRecord.morningMilk || ''} onChange={(e) => setActiveIndividualRecord({ ...activeIndividualRecord, morningMilk: Number(e.target.value) || null })} className="w-full bg-white border border-[#e3dec9] rounded-lg p-2 text-xs" />
                  </div>
                  <div>
                    <label className="block text-gray-600 mb-1">Evening Milk (L/day)</label>
                    <input type="number" step="0.1" value={activeIndividualRecord.eveningMilk || ''} onChange={(e) => setActiveIndividualRecord({ ...activeIndividualRecord, eveningMilk: Number(e.target.value) || null })} className="w-full bg-white border border-[#e3dec9] rounded-lg p-2 text-xs" />
                  </div>
                  <div>
                    <label className="block text-gray-600 mb-1">Est. Daily Gain (kg)</label>
                    <input type="number" step="0.01" value={activeIndividualRecord.adg || ''} onChange={(e) => setActiveIndividualRecord({ ...activeIndividualRecord, adg: Number(e.target.value) || null })} className="w-full bg-white border border-[#e3dec9] rounded-lg p-2 text-xs" />
                  </div>
                  <div>
                    <label className="block text-gray-600 mb-1">Offspring ID Tag</label>
                    <input type="text" placeholder="e.g. CALF-102" value={activeIndividualRecord.offspringId || ''} onChange={(e) => setActiveIndividualRecord({ ...activeIndividualRecord, offspringId: e.target.value })} className="w-full bg-white border border-[#e3dec9] rounded-lg p-2 text-xs" />
                  </div>
                </div>
              )}

              {indFormStep === 3 && (
                <div className="space-y-3 font-mono">
                  <div className="bg-[#fafbf9] p-3 rounded-xl border border-stone-150 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-gray-700">Checkups & Meds</span>
                      <button type="button" onClick={addHealthRecord} className="cursor-pointer bg-[#5a5a40] text-white text-[10px] px-2 py-0.5 rounded border-none">+ Add</button>
                    </div>
                    {activeIndividualRecord.healthRecords?.map((h, i) => (
                      <div key={i} className="flex gap-2 items-center bg-white p-2 border rounded">
                        <input type="date" value={h.date} onChange={(e) => {
                          const list = [...activeIndividualRecord.healthRecords!]; list[i].date = e.target.value; setActiveIndividualRecord({ ...activeIndividualRecord, healthRecords: list });
                        }} className="border rounded p-1 text-[11px] w-28" />
                        <input type="text" placeholder="Diagnosis" value={h.diagnosis} onChange={(e) => {
                          const list = [...activeIndividualRecord.healthRecords!]; list[i].diagnosis = e.target.value; setActiveIndividualRecord({ ...activeIndividualRecord, healthRecords: list });
                        }} className="border rounded p-1 text-[11px] flex-1" />
                        <input type="text" placeholder="Treatment" value={h.treatment} onChange={(e) => {
                          const list = [...activeIndividualRecord.healthRecords!]; list[i].treatment = e.target.value; setActiveIndividualRecord({ ...activeIndividualRecord, healthRecords: list });
                        }} className="border rounded p-1 text-[11px] flex-1" />
                        <button type="button" onClick={() => removeHealthRecord(i)} className="text-red-600 border-none bg-transparent cursor-pointer">✕</button>
                      </div>
                    ))}
                  </div>

                  <div className="bg-[#fafbf9] p-3 rounded-xl border border-stone-150 space-y-2">
                    <span className="font-bold font-sans text-gray-700">Financial Allocations (PKR)</span>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-[10px] text-gray-500 block">Feed Cost</label>
                        <input type="number" value={activeIndividualRecord.finFeed || ''} onChange={(e) => setActiveIndividualRecord({ ...activeIndividualRecord, finFeed: Number(e.target.value) || null })} className="w-full bg-white border border-[#e3dec9] rounded p-1 text-xs" />
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-500 block">Meds cost</label>
                        <input type="number" value={activeIndividualRecord.finMedicine || ''} onChange={(e) => setActiveIndividualRecord({ ...activeIndividualRecord, finMedicine: Number(e.target.value) || null })} className="w-full bg-white border border-[#e3dec9] rounded p-1 text-xs" />
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-500 block">Sale Value</label>
                        <input type="number" value={activeIndividualRecord.finSaleIncome || ''} onChange={(e) => setActiveIndividualRecord({ ...activeIndividualRecord, finSaleIncome: Number(e.target.value) || null })} className="w-full bg-white border border-[#e3dec9] rounded p-1 text-xs" />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-[#f4f1e9] flex justify-between font-sans">
              <button type="button" onClick={() => setShowIndividualRecordModal(false)} className="cursor-pointer bg-neutral-100 hover:bg-neutral-200 text-gray-600 py-2 px-4 rounded-xl text-xs border-none font-semibold">Cancel</button>
              <div className="flex gap-2">
                {indFormStep > 0 && <button type="button" onClick={() => setIndFormStep(indFormStep - 1)} className="cursor-pointer bg-neutral-100 py-2 px-4 rounded-xl text-xs border-none font-semibold">Back</button>}
                {indFormStep < 3 && (
                  <button type="button" onClick={() => setIndFormStep(indFormStep + 1)} className="cursor-pointer bg-[#5a5a40] text-white py-2 px-4 rounded-xl text-xs border-none font-semibold shadow-xs hover:bg-[#3e3e2b] active:scale-95 transition-all">Next</button>
                )}
                {indFormStep >= 2 && (
                  <button
                    type="button"
                    onClick={(e) => handlePublishConfirm(e)}
                    className="cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white py-2 px-6 rounded-xl text-xs border-none font-bold shadow-xs active:scale-95 transition-all"
                  >
                    {isEditingIndividual ? 'Save Updates' : 'Publish File'}
                  </button>
                )}
              </div>
            </div>
          </motion.form>
        </div>
      )}

      {/* Comprehensive Herd-Level Record Modal */}
      {showHerdRecordModal && activeHerdRecord && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-xs z-[420] flex items-center justify-center p-4 overflow-y-auto font-sans">
          <motion.form
            ref={scrollToPopupStart}
            onSubmit={handleSaveHerdRecord}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white border border-[#e3dec9] rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl relative my-8"
          >
            <button
              type="button"
              onClick={() => setShowHerdRecordModal(false)}
              className="absolute right-4 top-4 hover:bg-[#faf7f0] p-1 rounded-full text-gray-400 cursor-pointer border border-[#e3dec9]"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="border-b border-[#f4f1e9] pb-3">
              <span className="text-[10px] uppercase font-bold text-amber-800">Herd Book Index</span>
              <h3 className="font-serif text-lg font-bold text-[#5a5a40]">
                {isEditingHerd ? `Edit Herd Book: ${activeHerdRecord.farmName}` : 'New Herd-Level Register'}
              </h3>
            </div>

            <div className="flex border-b border-[#fafaf7] pb-1 gap-2 overflow-x-auto text-xs font-bold leading-none">
              {["1. Demographics & Inventory", "2. Reproduction Metrics", "3. Health Logs & Finances"].map((name, idxAnswer) => (
                <button
                  key={idxAnswer}
                  type="button"
                  onClick={() => setHerdFormStep(idxAnswer)}
                  className={`p-1.5 rounded border-none cursor-pointer ${herdFormStep === idxAnswer ? 'bg-[#5a5a40] text-white' : 'bg-transparent text-gray-400'}`}
                >
                  {name}
                </button>
              ))}
            </div>

            <div ref={herdStepContainerRef} className="max-h-[50vh] overflow-y-auto pr-1 space-y-3 text-xs leading-normal">
              {herdFormStep === 0 && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-600 mb-1">Farm/Herd Name *</label>
                    <input type="text" required value={activeHerdRecord.farmName || ''} onChange={(e) => setActiveHerdRecord({ ...activeHerdRecord, farmName: e.target.value })} className="w-full bg-white border border-[#e3dec9] rounded-lg p-2 text-xs" />
                  </div>
                  <div>
                    <label className="block text-gray-600 mb-1 font-sans">Farm Manager</label>
                    <input type="text" value={activeHerdRecord.farmManager || ''} onChange={(e) => setActiveHerdRecord({ ...activeHerdRecord, farmManager: e.target.value })} className="w-full bg-white border border-[#e3dec9] rounded-lg p-2 text-xs" />
                  </div>
                  <div>
                    <label className="block text-gray-600 mb-1">Species *</label>
                    <select value={activeHerdRecord.species || 'Cattle'} onChange={(e) => setActiveHerdRecord({ ...activeHerdRecord, species: e.target.value as any })} className="w-full bg-white border border-[#e3dec9] rounded-lg p-2 text-xs">
                      <option value="Cattle">Cattle</option>
                      <option value="Buffalo">Buffalo</option>
                      <option value="Goat">Goat</option>
                      <option value="Sheep">Sheep</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-600 mb-1">Total Herd Head Count *</label>
                    <input type="number" required value={activeHerdRecord.totalHerdSize || ''} onChange={(e) => setActiveHerdRecord({ ...activeHerdRecord, totalHerdSize: Number(e.target.value) || 0 })} className="w-full bg-white border border-[#e3dec9] rounded-lg p-2 text-xs" />
                  </div>
                  <div>
                    <label className="block text-gray-600 mb-1">Pregnant Qty</label>
                    <input type="number" value={activeHerdRecord.inventory?.pregnantQty ?? 0} onChange={(e) => {
                      const inv = { ...(activeHerdRecord.inventory || {}) }; inv.pregnantQty = Number(e.target.value) || 0; setActiveHerdRecord({ ...activeHerdRecord, inventory: inv as any });
                    }} className="w-full bg-white border border-[#e3dec9] rounded-lg p-2 text-xs" />
                  </div>
                  <div>
                    <label className="block text-gray-600 mb-1">Lactating Qty</label>
                    <input type="number" value={activeHerdRecord.inventory?.lactatingQty ?? 0} onChange={(e) => {
                      const inv = { ...(activeHerdRecord.inventory || {}) }; inv.lactatingQty = Number(e.target.value) || 0; setActiveHerdRecord({ ...activeHerdRecord, inventory: inv as any });
                    }} className="w-full bg-white border border-[#e3dec9] rounded-lg p-2 text-xs" />
                  </div>
                </div>
              )}

              {herdFormStep === 1 && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-600 mb-1">Exposed Females</label>
                    <input type="number" value={activeHerdRecord.reproductive?.exposed ?? 0} onChange={(e) => {
                      const rep = { ...(activeHerdRecord.reproductive || {}) }; rep.exposed = Number(e.target.value) || 0; setActiveHerdRecord({ ...activeHerdRecord, reproductive: rep as any });
                    }} className="w-full bg-white border border-[#e3dec9] rounded-lg p-2 text-xs" />
                  </div>
                  <div>
                    <label className="block text-gray-600 mb-1">Conceived Females</label>
                    <input type="number" value={activeHerdRecord.reproductive?.conceived ?? 0} onChange={(e) => {
                      const rep = { ...(activeHerdRecord.reproductive || {}) }; rep.conceived = Number(e.target.value) || 0; setActiveHerdRecord({ ...activeHerdRecord, reproductive: rep as any });
                    }} className="w-full bg-white border border-[#e3dec9] rounded-lg p-2 text-xs" />
                  </div>
                  <div>
                    <label className="block text-gray-600 mb-1">Live Births (Singles)</label>
                    <input type="number" value={activeHerdRecord.reproductive?.singles ?? 0} onChange={(e) => {
                      const rep = { ...(activeHerdRecord.reproductive || {}) }; rep.singles = Number(e.target.value) || 0; rep.births = (rep.singles || 0) + (rep.twins || 0)*2; setActiveHerdRecord({ ...activeHerdRecord, reproductive: rep as any });
                    }} className="w-full bg-white border border-[#e3dec9] rounded-lg p-2 text-xs" />
                  </div>
                  <div>
                    <label className="block text-gray-600 mb-1">Twins</label>
                    <input type="number" value={activeHerdRecord.reproductive?.twins ?? 0} onChange={(e) => {
                      const rep = { ...(activeHerdRecord.reproductive || {}) }; rep.twins = Number(e.target.value) || 0; rep.births = (rep.singles || 0) + (rep.twins || 0)*2; setActiveHerdRecord({ ...activeHerdRecord, reproductive: rep as any });
                    }} className="w-full bg-white border border-[#e3dec9] rounded-lg p-2 text-xs" />
                  </div>
                </div>
              )}

              {herdFormStep === 2 && (
                <div className="space-y-3 font-mono">
                  <div className="bg-[#fafbf9] p-3 rounded-xl border border-stone-150 space-y-2">
                    <div className="flex justify-between items-center bg-transparent">
                      <span className="font-bold text-gray-700">Dewormings Registry</span>
                      <button type="button" onClick={addHerdDeworming} className="cursor-pointer bg-[#5a5a40] text-white text-[10px] px-2 py-0.5 rounded border-none">+ Add Deworming</button>
                    </div>
                    {activeHerdRecord.dewormings?.map((dw, i) => (
                      <div key={i} className="flex gap-2 items-center bg-white p-2 border rounded">
                        <input type="text" placeholder="Drug Line" value={dw.drugUsed} onChange={(e) => {
                          const list = [...activeHerdRecord.dewormings!]; list[i].drugUsed = e.target.value; setActiveHerdRecord({ ...activeHerdRecord, dewormings: list });
                        }} className="border rounded p-1 text-[11px] flex-1" />
                        <input type="date" value={dw.dateAdministered} onChange={(e) => {
                          const list = [...activeHerdRecord.dewormings!]; list[i].dateAdministered = e.target.value; setActiveHerdRecord({ ...activeHerdRecord, dewormings: list });
                        }} className="border rounded p-1 text-[11px] w-28" />
                        <button type="button" onClick={() => removeHerdDeworming(i)} className="text-red-600 border-none bg-transparent cursor-pointer">✕</button>
                      </div>
                    ))}
                  </div>

                  <div className="bg-[#fafbf9] p-3 rounded-xl border border-stone-150 space-y-2 font-sans">
                    <span className="font-bold text-gray-700 block">Expenses vs Incomes PKR/month</span>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-gray-500 block">Feed Bill</label>
                        <input type="number" value={activeHerdRecord.finances?.expFeed || 0} onChange={(e) => {
                          const f = { ...(activeHerdRecord.finances || {}) }; f.expFeed = Number(e.target.value) || 0; setActiveHerdRecord({ ...activeHerdRecord, finances: f as any });
                        }} className="w-full bg-white border border-[#e3dec9] rounded p-1 text-xs" />
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-500 block">Labor Wages</label>
                        <input type="number" value={activeHerdRecord.finances?.expLabor || 0} onChange={(e) => {
                          const f = { ...(activeHerdRecord.finances || {}) }; f.expLabor = Number(e.target.value) || 0; setActiveHerdRecord({ ...activeHerdRecord, finances: f as any });
                        }} className="w-full bg-white border border-[#e3dec9] rounded p-1 text-xs" />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-[#f4f1e9] flex justify-between font-sans">
              <button type="button" onClick={() => setShowHerdRecordModal(false)} className="cursor-pointer bg-neutral-100 text-gray-600 py-2 px-4 rounded-xl text-xs border-none font-semibold">Cancel</button>
              <div className="flex gap-2">
                {herdFormStep > 0 && <button type="button" onClick={() => setHerdFormStep(herdFormStep - 1)} className="cursor-pointer bg-neutral-100 py-2 px-4 rounded-xl text-xs border-none font-semibold">Back</button>}
                {herdFormStep < 2 && (
                  <button type="button" onClick={() => setHerdFormStep(herdFormStep + 1)} className="cursor-pointer bg-[#5a5a40] text-white py-2 px-4 rounded-xl text-xs border-none font-semibold shadow-xs hover:bg-[#3e3e2b] active:scale-95 transition-all">Next</button>
                )}
                {herdFormStep >= 1 && (
                  <button
                    type="button"
                    onClick={(e) => handlePublishHerdConfirm(e)}
                    className="cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white py-2 px-6 rounded-xl text-xs border-none font-bold shadow-xs active:scale-95 transition-all"
                  >
                    {isEditingHerd ? 'Save Updates' : 'Publish Book'}
                  </button>
                )}
              </div>
            </div>
          </motion.form>
        </div>
      )}

      {/* VetAxis QR Dynamic Pass & Digital Health Card Modal */}
      {showQrPassModal && selectedQrAnimal && (
        <div className="fixed inset-0 bg-black/55 backdrop-blur-xs z-[500] flex items-center justify-center p-4 overflow-y-auto font-sans">
          <style>{`
            @media print {
              body * {
                visibility: hidden !important;
              }
              #printable-collar-tag, #printable-collar-tag * {
                visibility: visible !important;
              }
              #printable-collar-tag {
                position: fixed !important;
                left: 50% !important;
                top: 50% !important;
                transform: translate(-50%, -50%) !important;
                width: 320px !important;
                height: auto !important;
                padding: 16px !important;
                border: 2px dashed #000000 !important;
                border-radius: 12px !important;
                background: white !important;
                box-shadow: none !important;
                margin: 0 !important;
                text-align: center !important;
              }
            }
          `}</style>

          <motion.div
            ref={scrollToPopupStart}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white border border-[#e3dec9] rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl relative my-8 text-neutral-800"
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={handleCloseQrPass}
              className="absolute right-4 top-4 hover:bg-[#faf7f0] p-1.5 rounded-full text-gray-400 cursor-pointer border border-[#e3dec9] transition-all"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header */}
            <div className="border-b border-[#f4f1e9] pb-3">
              <div className="flex gap-2 items-center">
                <span className="text-[10px] uppercase font-black text-amber-800 tracking-wider bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  🏷️ VetAxis QR Dynamic Pass
                </span>
                {scannedAndViewing && (
                  <span className="text-[9px] uppercase font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-150 animate-pulse">
                    📡 Scanned Secure Entry
                  </span>
                )}
              </div>
              <h3 className="font-serif text-lg font-bold text-[#5a5a40] mt-1 flex items-center gap-1.5">
                Digital Health Passport: <span className="text-gray-900 font-sans font-semibold">{selectedQrAnimal.name || 'Unnamed Animal'}</span>
              </h3>
            </div>

            {/* Navigation Tabs within Modal */}
            <div className="flex border-b border-[#fafaf7] pb-1 gap-1.5 overflow-x-auto text-[11px] font-bold">
              {['Digital Pass & Tag', 'Identity & Ancestry', 'Clinical & Vaccines', 'Feeding & Milking Logs'].map((tab, idx) => {
                const stepNames = ['pass', 'ancestry', 'clinical', 'feeding'] as const;
                const curTab = qrActiveTab;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setQrActiveTab(stepNames[idx]);
                    }}
                    className={`p-2 rounded-lg border-none cursor-pointer transition-all ${
                      curTab === stepNames[idx]
                        ? 'bg-[#5a5a40] text-white shadow-xs font-black'
                        : 'bg-transparent text-gray-505 hover:bg-[#fafcf5] hover:text-gray-900'
                    }`}
                  >
                    {tab}
                  </button>
                );
              })}
            </div>

            {/* Modal Body */}
            <div className="max-h-[60vh] overflow-y-auto pr-1 space-y-4 text-xs leading-relaxed">
              
              {/* Tab 1: Digital Pass & Tag Print */}
              {qrActiveTab === 'pass' && (
                <div className="space-y-4">
                  {scannedAndViewing && (
                    <div className="bg-emerald-50/50 border border-emerald-250 p-3 rounded-xl flex gap-2.5 items-start">
                      <span className="text-lg">📡</span>
                      <div>
                        <strong className="text-emerald-900 font-bold block mb-0.5">VetAxis Ledger Telemetry Online</strong>
                        <p className="text-emerald-800 text-[11px] leading-relaxed">
                          You are currently viewing a live verified report fetched directly from the secure cloud node. Independent clinics and veterinary inspectors can modify or add new clinical logs by clicking "Edit / View Profile" on this ledger entry.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                    {/* Tag Mockup Frame (For Print) */}
                    <div className="bg-[#fafbf9] border border-[#e3dec9] rounded-2xl p-4 flex flex-col items-center justify-center relative shadow-sm max-w-sm mx-auto w-full">
                      
                      {/* Printable Ear/Collar Tag Unit */}
                      <div id="printable-collar-tag" className="bg-white border-2 border-dashed border-[#5a5a40] rounded-xl p-4 w-full flex flex-col items-center text-center">
                        <div className="text-[9px] uppercase tracking-wider font-extrabold text-[#5a5a40] mb-1">
                          🏷️ VETAXIS DYNAMIC PASS
                        </div>
                        
                        {/* QR Container */}
                        <div className="bg-neutral-50 p-2.5 rounded-lg border border-neutral-150 my-2">
                          <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
                              window.location.origin + '?animalRecordId=' + selectedQrAnimal.id
                            )}`}
                            alt="VetAxis QR Code Link"
                            referrerPolicy="no-referrer"
                            className="w-36 h-36 bg-white block rounded-md"
                          />
                        </div>

                        <div className="font-serif text-sm font-black text-[#5a5a40]">
                          {selectedQrAnimal.name || 'Unnamed Animal'}
                        </div>
                        <div className="font-mono text-[9px] text-[#7a766f] mt-0.5">
                          ID: {selectedQrAnimal.animalId}
                        </div>
                        {selectedQrAnimal.earTagNumber && (
                          <div className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-150 font-mono mt-1 inline-block">
                            Tag No: {selectedQrAnimal.earTagNumber}
                          </div>
                        )}

                        <div className="text-[8px] text-gray-400 mt-3 font-medium max-w-[200px] leading-tight">
                          Inspectors & vets: Scan collar tag with any mobile camera to view secure medical files immediately.
                        </div>
                      </div>

                    </div>

                    {/* Quick Settings & Explanations */}
                    <div className="space-y-3.5">
                      <div className="bg-[#faf9f3] border border-[#f0ece0] rounded-xl p-4 space-y-2">
                        <h4 className="font-bold text-[#5a5a40] flex items-center gap-1">
                          👂 Ear Tag & Collar Utility
                        </h4>
                        <p className="text-gray-600 text-[11px] leading-relaxed">
                          Dairy managers can print this layout onto durable sticky labels and attach them directly as an ear tag cover or string collar token.
                        </p>
                        <p className="text-gray-600 text-[11px] leading-relaxed">
                          Visiting veterinarians can immediately pull up this animal's records with zero typing, ensuring accurate vaccination, medication, and pedigree diagnostics in real time.
                        </p>
                      </div>

                      <div className="flex flex-col gap-2">
                        <button
                          type="button"
                          onClick={() => window.print()}
                          className="cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs border-none shadow-sm flex items-center justify-center gap-1.5 transition-all text-center"
                        >
                          🖨️ Print Collar / Ear Tag Pass
                        </button>
                        <a
                          href={`https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(
                            window.location.origin + '?animalRecordId=' + selectedQrAnimal.id
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="cursor-pointer bg-neutral-100 hover:bg-neutral-200 text-gray-700 font-bold py-2.5 px-4 rounded-xl text-xs border border-neutral-300 shadow-2xs flex items-center justify-center gap-1.5 transition-all text-center no-underline"
                        >
                          📥 Open High-Res QR Image
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Identity & Ancestry */}
              {qrActiveTab === 'ancestry' && (
                <div className="space-y-4">
                  {/* Identity Detail Grid */}
                  <div className="bg-[#faf9f5] border border-[#e3dec9] rounded-xl p-4 space-y-3">
                    <span className="text-[10px] uppercase font-extrabold text-[#5a5a40] tracking-wider block border-b border-[#e3dec9] pb-1">
                      🪪 CORE IDENTITY ATTRIBUTES
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                      <div>
                        <strong className="text-gray-500 block text-[10px]">Animal Tag/ID</strong>
                        <span className="font-bold text-gray-800">{selectedQrAnimal.animalId || '-'}</span>
                      </div>
                      <div>
                        <strong className="text-gray-500 block text-[10px]">Ear Tag Number</strong>
                        <span className="font-mono font-bold text-[#5a5a40]">{selectedQrAnimal.earTagNumber || '-'}</span>
                      </div>
                      <div>
                        <strong className="text-gray-500 block text-[10px]">Name</strong>
                        <span className="font-bold text-gray-800">{selectedQrAnimal.name || 'Unnamed'}</span>
                      </div>
                      <div>
                        <strong className="text-gray-500 block text-[10px]">Species</strong>
                        <span className="font-bold text-gray-800">{selectedQrAnimal.species || '-'}</span>
                      </div>
                      <div>
                        <strong className="text-gray-500 block text-[10px]">Breed</strong>
                        <span className="font-bold text-gray-800">{selectedQrAnimal.breed || '-'}</span>
                      </div>
                      <div>
                        <strong className="text-gray-500 block text-[10px]">Sex / Gender</strong>
                        <span className="font-bold text-gray-800">{selectedQrAnimal.sex || 'Female'}</span>
                      </div>
                      <div>
                        <strong className="text-gray-500 block text-[10px]">Date of Birth (DOB)</strong>
                        <span className="font-bold text-gray-800">{selectedQrAnimal.dob || 'Unknown'}</span>
                      </div>
                      <div>
                        <strong className="text-gray-500 block text-[10px]">Age</strong>
                        <span className="font-bold text-gray-800">{selectedQrAnimal.age || '-'}</span>
                      </div>
                      <div>
                        <strong className="text-gray-500 block text-[10px]">Primary Coloration</strong>
                        <span className="font-bold text-gray-800">{selectedQrAnimal.colorMarkings || '-'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Pedigree & Parentage */}
                  <div className="bg-[#fbfcfa] border border-stone-200 rounded-xl p-4 space-y-3">
                    <span className="text-[10px] uppercase font-extrabold text-amber-800 tracking-wider block border-b border-stone-150 pb-1">
                      🌳 ANCESTRY PEDIGREE CHART
                    </span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Sire Profile */}
                      <div className="bg-stone-50 border border-stone-200 rounded-lg p-3">
                        <strong className="text-[#5a5a40] block text-[11px] mb-1">♂️ Sire (Father) Node</strong>
                        <div className="space-y-1 text-[11px]">
                          <div><span className="text-gray-500">Tag/ID:</span> <span className="font-mono font-bold">{selectedQrAnimal.sireId || 'Not Entered'}</span></div>
                          <div><span className="text-gray-500">Breed:</span> <span>{selectedQrAnimal.breedOfSire || '-'}</span></div>
                        </div>
                      </div>

                      {/* Dam Profile */}
                      <div className="bg-stone-50 border border-stone-200 rounded-lg p-3">
                        <strong className="text-rose-800 block text-[11px] mb-1">♀️ Dam (Mother) Node</strong>
                        <div className="space-y-1 text-[11px]">
                          <div><span className="text-gray-500">Tag/ID:</span> <span className="font-mono font-bold">{selectedQrAnimal.damId || 'Not Entered'}</span></div>
                          <div><span className="text-gray-500">Breed:</span> <span>{selectedQrAnimal.breedOfDam || '-'}</span></div>
                        </div>
                      </div>
                    </div>
                    {selectedQrAnimal.generation && (
                      <div className="text-[11px] text-gray-505 bg-neutral-100 px-2 py-1 rounded inline-block">
                        🧬 Generation Identifier: <strong className="text-gray-800 font-bold">{selectedQrAnimal.generation}</strong>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 3: Clinical & Vaccines */}
              {qrActiveTab === 'clinical' && (
                <div className="space-y-4 font-sans">
                  {/* Physical Health Status Indicator */}
                  <div className="bg-[#faf9f5] border border-[#e3dec9] rounded-xl p-4 space-y-3">
                    <span className="text-[10px] uppercase font-extrabold text-[#5a5a40] tracking-wider block border-b border-[#e3dec9] pb-1">
                      🩺 HEALTH STATUS & PHYSICAL SUMMARY
                    </span>
                    
                    <div className="flex flex-wrap items-center gap-4">
                      {/* Real time health meter */}
                      <div className="flex-1 min-w-[120px]">
                        <span className="text-gray-500 block mb-1">Health condition</span>
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                          selectedQrAnimal.healthStatus === 'Sick' ? 'bg-red-100 text-red-800 border border-red-200' :
                          selectedQrAnimal.healthStatus === 'Under Treatment' ? 'bg-amber-100 text-amber-900 border border-amber-200' :
                          selectedQrAnimal.healthStatus === 'Quarantined' ? 'bg-purple-100 text-purple-800 border border-purple-200' :
                          'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        }`}>
                          {selectedQrAnimal.healthStatus || 'Healthy'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs flex-2">
                        <div>
                          <strong className="text-gray-500 block">Body Weight</strong>
                          <span className="font-bold text-gray-800">{selectedQrAnimal.bodyWeight ? `${selectedQrAnimal.bodyWeight} kg` : '-'}</span>
                        </div>
                        <div>
                          <strong className="text-gray-500 block">BCS (1-5)</strong>
                          <span className="font-bold text-gray-800">{selectedQrAnimal.bcs || '-'}</span>
                        </div>
                        <div>
                          <strong className="text-gray-500 block">Withers Height</strong>
                          <span className="font-bold text-[#5a5a40]">{selectedQrAnimal.heightAtWithers || '-'}</span>
                        </div>
                        <div>
                          <strong className="text-gray-500 block">Horn Status</strong>
                          <span className="font-bold text-gray-800">{selectedQrAnimal.hornStatus || '-'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Vaccine logs table */}
                  <div className="bg-white border rounded-xl p-4 space-y-3">
                    <span className="text-[10px] uppercase font-extrabold text-stone-600 tracking-wider block border-b pb-1">
                      💉 COMPREHENSIVE VACCINATION LEDGER
                    </span>
                    {selectedQrAnimal.vaccinationRecords && selectedQrAnimal.vaccinationRecords.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-[11px]">
                          <thead>
                            <tr className="border-b font-bold text-gray-500">
                              <th className="pb-1.5">Vaccine Brand</th>
                              <th className="pb-1.5">Date Administered</th>
                              <th className="pb-1.5">Dosage</th>
                              <th className="pb-1.5">Administrator</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {selectedQrAnimal.vaccinationRecords.map((vax, index) => (
                              <tr key={index} className="hover:bg-neutral-50/50">
                                <td className="py-1.5 font-bold text-neutral-850">{vax.vaccineName || '-'}</td>
                                <td className="py-1.5 text-gray-600 font-mono">{vax.dateAdministered || '-'}</td>
                                <td className="py-1.5 text-gray-600">{vax.dosage || '-'}</td>
                                <td className="py-1.5 text-emerald-800 font-semibold">{vax.administeredBy || 'Resident Vet'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-gray-400 italic py-2 text-[11px] text-center bg-stone-50 rounded">
                        No official vaccination history logged in database.
                      </div>
                    )}
                  </div>

                  {/* Medical / Treatment Logs */}
                  <div className="bg-white border rounded-xl p-4 space-y-3">
                    <span className="text-[10px] uppercase font-extrabold text-stone-600 tracking-wider block border-b pb-1">
                      🩺 CLINICAL INTERVENTION LOGS (MEDICATION / SURGERY)
                    </span>
                    {selectedQrAnimal.healthRecords && selectedQrAnimal.healthRecords.length > 0 ? (
                      <div className="space-y-2">
                        {selectedQrAnimal.healthRecords.map((hr, idx) => (
                          <div key={idx} className="bg-stone-50/80 p-2.5 rounded-lg border text-[11px]">
                            <div className="flex justify-between font-bold text-[#5a5a40]">
                              <span>Diagnosis: {hr.diagnosis || 'Routine Check'}</span>
                              <span className="font-mono text-gray-400">{hr.dateDiagnosed || '-'}</span>
                            </div>
                            <div className="text-gray-600 mt-1">
                              <strong>Treatments / Meds:</strong> {hr.treatmentPlan || 'None'}
                            </div>
                            <div className="text-gray-500 text-[10px] mt-0.5">
                              <strong>Physician:</strong> {hr.treatedBy || 'Resident Clinician'} (Status: <span className="text-emerald-700 font-semibold">{hr.status || 'Cleared'}</span>)
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-gray-400 italic py-2 text-[11px] text-center bg-stone-50 rounded">
                        No medical interventions or medications logged.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 4: Feeding & Milking Logs */}
              {qrActiveTab === 'feeding' && (
                <div className="space-y-4">
                  {/* Milking Production Ledger */}
                  {selectedQrAnimal.sex === 'Female' || !selectedQrAnimal.sex ? (
                    <div className="bg-emerald-50/10 border border-emerald-150 rounded-xl p-4 space-y-3">
                      <span className="text-[10px] uppercase font-extrabold text-emerald-850 tracking-wider block border-b border-emerald-150 pb-1">
                        🥛 LACTATION & MILK PRODUCTION RECORD
                      </span>

                      <div className="grid grid-cols-3 gap-2">
                        <div className="bg-white p-3 rounded-lg border border-emerald-100 text-center">
                          <strong className="text-gray-400 text-[10px] block uppercase font-medium">☀️ Morning Yield</strong>
                          <span className="text-sm font-black text-[#5a5a40]">{selectedQrAnimal.morningMilk ? `${selectedQrAnimal.morningMilk} kg` : '0 kg'}</span>
                        </div>
                        <div className="bg-white p-3 rounded-lg border border-emerald-100 text-center">
                          <strong className="text-gray-400 text-[10px] block uppercase font-medium">🌙 Evening Yield</strong>
                          <span className="text-sm font-black text-[#5a5a40]">{selectedQrAnimal.eveningMilk ? `${selectedQrAnimal.eveningMilk} kg` : '0 kg'}</span>
                        </div>
                        <div className="bg-white p-3 rounded-lg border border-emerald-100 text-center">
                          <strong className="text-gray-400 text-[10px] block uppercase font-medium">🥛 Total Daily</strong>
                          <span className="text-sm font-black text-emerald-800">{selectedQrAnimal.totalMilk ? `${selectedQrAnimal.totalMilk} kg` : '0 kg'}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-stone-50 border rounded-xl p-3 text-stone-500 italic text-[11px]">
                      Milk logs are only applicable for female/lactating animals.
                    </div>
                  )}

                  {/* Feeding Formula Details */}
                  <div className="bg-[#faf9f5] border border-[#e3dec9] rounded-xl p-4 space-y-3">
                    <span className="text-[10px] uppercase font-extrabold text-[#5a5a40] tracking-wider block border-b border-[#e3dec9] pb-1">
                      🌾 NUTRITION & DAILY RATION INTAKE
                    </span>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                      <div>
                        <strong className="text-gray-500 block text-[10px]">Dietary Group</strong>
                        <span className="font-bold text-gray-800">{selectedQrAnimal.feedingGroup || 'High Yield Formula'}</span>
                      </div>
                      <div>
                        <strong className="text-gray-500 block text-[10px]">Concentrate Level</strong>
                        <span className="font-bold text-[#5a5a40]">{selectedQrAnimal.dailyConcentrate || '-'}</span>
                      </div>
                      <div>
                        <strong className="text-gray-500 block text-[10px]">Green Fodder Ration</strong>
                        <span className="font-bold text-gray-800">{selectedQrAnimal.greenFodder || '-'}</span>
                      </div>
                      <div>
                        <strong className="text-gray-500 block text-[10px]">Dry Fodder Ration</strong>
                        <span className="font-bold text-gray-800">{selectedQrAnimal.dryFodder || '-'}</span>
                      </div>
                      <div>
                        <strong className="text-gray-500 block text-[10px]">Mineral Supplementation</strong>
                        <span className="font-bold text-gray-800">{selectedQrAnimal.mineralMixture || '-'}</span>
                      </div>
                      <div>
                        <strong className="text-gray-500 block text-[10px]">Water Consumed</strong>
                        <span className="font-bold text-gray-800">{selectedQrAnimal.waterIntake || '-'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer Controls */}
            <div className="pt-3 border-t border-[#f4f1e9] flex justify-between font-sans">
              <button
                type="button"
                onClick={handleCloseQrPass}
                className="cursor-pointer bg-neutral-100 hover:bg-neutral-200 text-gray-700 py-2.5 px-5 rounded-xl text-xs border-none font-bold shadow-2xs active:scale-95 transition-all"
              >
                Close Pass
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowQrPassModal(false);
                  handleOpenEditIndividualRecord(selectedQrAnimal);
                }}
                className="cursor-pointer bg-[#5a5a40] hover:bg-[#3e3e2b] text-white py-2.5 px-6 rounded-xl text-xs border-none font-bold shadow-sm active:scale-95 transition-all"
              >
                Edit / View Full Clinical Profile →
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Sandbox-Safe Custom Confirmation Modal Overlay */}
      <AnimatePresence>
        {confirmDialog && (
          <div className="fixed inset-0 bg-black/55 backdrop-blur-xs z-[550] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-[#e3dec9] rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl relative"
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl mt-0.5">{confirmDialog.isDestructive ? '⚠️' : 'ℹ️'}</span>
                <div className="space-y-1">
                  <h3 className="font-serif text-base font-bold text-[#5a5a40]">
                    {confirmDialog.title}
                  </h3>
                  <p className="text-xs text-gray-500 leading-relaxed font-sans">
                    {confirmDialog.description}
                  </p>
                </div>
              </div>

              <div className="flex gap-2 pt-2 justify-end">
                {confirmDialog.confirmText !== 'Excellent' && confirmDialog.confirmText !== 'Perfect' && confirmDialog.confirmText !== 'Great' && confirmDialog.confirmText !== 'Acknowledge' && confirmDialog.confirmText !== 'Ok' && (
                  <button
                    type="button"
                    onClick={() => setConfirmDialog(null)}
                    className="cursor-pointer bg-[#faf9f5] hover:bg-[#f5f2e9] text-gray-600 py-2 px-4 rounded-xl text-xs font-bold border border-[#e3dec9] transition-all"
                  >
                    {confirmDialog.cancelText || 'Cancel'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={async () => {
                    setConfirmLoading(true);
                    try {
                      await confirmDialog.onConfirm();
                    } catch (e) {
                      console.error("Confirmation execution failed:", e);
                    } finally {
                      setConfirmLoading(false);
                    }
                  }}
                  disabled={confirmLoading}
                  className={`cursor-pointer text-white py-2 px-4 rounded-xl text-xs font-bold border-none transition-all ${
                    confirmDialog.isDestructive ? 'bg-red-600 hover:bg-red-700' : 'bg-[#5a5a40] hover:bg-[#3e3e2b]'
                  }`}
                >
                  {confirmLoading ? 'Processing...' : confirmDialog.confirmText}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
