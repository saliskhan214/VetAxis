import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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
  ChevronRight,
  Info,
  MapPin,
  Lock,
  PlusCircle,
  Stethoscope
} from 'lucide-react';

import { LivestockService, addDays, addMonths } from '../lib/livestockService';
import { NotificationService } from '../lib/storage';
import { ExploreService } from '../lib/storage';
import {
  UserProfile,
  LivestockFarm,
  LivestockAnimal,
  LivestockBatch,
  LivestockTask,
  FarmType,
  MixedFarmOptions
} from '../types';

interface LivestockManagementProps {
  currentUser: UserProfile;
}

export default function LivestockManagement({ currentUser }: LivestockManagementProps) {
  // Services & list state
  const [farms, setFarms] = useState<LivestockFarm[]>([]);
  const [selectedFarm, setSelectedFarm] = useState<LivestockFarm | null>(null);
  const [animals, setAnimals] = useState<LivestockAnimal[]>([]);
  const [batches, setBatches] = useState<LivestockBatch[]>([]);
  const [tasks, setTasks] = useState<LivestockTask[]>([]);
  const [allProfessionals, setAllProfessionals] = useState<UserProfile[]>([]);

  // UI state navigation within Livestock tab
  const [activeSubTab, setActiveSubTab] = useState<'dashboard' | 'animals' | 'batches' | 'tasks' | 'team'>('dashboard');
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

  // Trigger loading state
  const isClinician = currentUser.role === 'doctor' || currentUser.role === 'clinic' || currentUser.role === 'assistant';

  useEffect(() => {
    loadGlobalData();
  }, [currentUser]);

  // Reload details when selected farm shifts
  useEffect(() => {
    if (selectedFarm) {
      loadFarmDetails(selectedFarm.id);
    }
  }, [selectedFarm]);

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

      // 3. Auto select first farm if user is not clinician and farms exist
      if (!isClinician && farmList.length > 0) {
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
  const canModifyAnimals = userRoleInSelectedFarm === 'Owner' || userRoleInSelectedFarm === 'Manager' || userRoleInSelectedFarm === 'Worker';
  const canPerformClinicalTasks = userRoleInSelectedFarm === 'Owner' || userRoleInSelectedFarm === 'Veterinarian' || userRoleInSelectedFarm === 'Assistant';

  // ─────────────────────────────────────────────────────────────────
  // ACTION HANDLERS
  // ─────────────────────────────────────────────────────────────────

  const handleCreateFarm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFarmName.trim() || !newFarmLocation.trim()) return;

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

  const handleDeleteAnimal = async (id: string) => {
    if (!window.confirm('Delete this livestock record permanently? All related logs will be deleted.')) return;
    try {
      await LivestockService.deleteAnimal(id);
      setAnimals(prev => prev.filter(a => a.id !== id));
      // Reload tasks
      await loadFarmDetails(selectedFarm!.id);
    } catch (err) {
      console.error('Failed to delete animal:', err);
    }
  };

  const handleDeleteBatch = async (id: string) => {
    if (!window.confirm('Delete this batch/flock permanently? Related logs will be deleted.')) return;
    try {
      await LivestockService.deleteBatch(id);
      setBatches(prev => prev.filter(b => b.id !== id));
      // Reload tasks
      await loadFarmDetails(selectedFarm!.id);
    } catch (err) {
      console.error('Failed to delete batch:', err);
    }
  };

  const handleCascadeDeleteFarm = async (farmId: string) => {
    if (!window.confirm('WARNING: Are you sure you want to delete this farm entirely? This will permanently wipe out all team, animals, batches, schedules, and historical records. This action cannot be undone!')) return;
    try {
      await LivestockService.deleteFarm(farmId);
      const updatedFarms = farms.filter(f => f.id !== farmId);
      setFarms(updatedFarms);
      if (selectedFarm && selectedFarm.id === farmId) {
        setSelectedFarm(updatedFarms.length > 0 ? updatedFarms[0] : null);
      }
    } catch (err) {
      console.error('Failed to terminate farm entity:', err);
    }
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
              <h3 className="font-display font-extrabold text-[#5a5a40] text-lg">Livestock Management Invitations</h3>
              <p className="text-xs text-amber-800">Local farm owners want to request you as their certified Healthcare Manager.</p>
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

      {/* Primary Headers */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-[#e3dec9] border-b-[4px] border-b-[#cdc6ad] rounded-2xl p-6 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-[#5a5a40] rounded-2xl text-white shadow-md">
            <Stethoscope className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md tracking-wider border border-emerald-100 font-mono">
                System Active
              </span>
            </div>
            <h1 className="font-serif text-3xl font-bold text-[#5a5a40] tracking-tight">Livestock Healthcare</h1>
            <p className="text-xs text-[#7a766f]">Manage herds, schedule immunizations, and link with veterinary managers.</p>
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

      {/* Livestock Overview Content */}
      {!selectedFarm ? (
        <div className="text-center bg-white border border-[#e3dec9] rounded-2xl p-16 space-y-4 shadow-sm">
          <div className="w-20 h-20 bg-[#fbf9f4] border border-[#e3dec9] rounded-full flex items-center justify-center mx-auto text-4xl shadow-inner">
            🚜
          </div>
          <div className="max-w-md mx-auto">
            <h3 className="font-serif font-bold text-xl text-[#5a5a40]">No Registered Livestock Farms</h3>
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
                      <span className="text-[10px] uppercase font-bold text-[#a49f92] tracking-wider block">Total Livestock</span>
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
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Animals Individual Tab (Herds Identification) */}
            {activeSubTab === 'animals' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center border-b border-[#f4f1e9] pb-4">
                  <div>
                    <h3 className="font-serif font-bold text-xl text-[#5a5a40]">Herd Identification</h3>
                    <p className="text-xs text-[#7a766f]">Register and track individual cattle, buffaloes, goats, or sheep on small-medium farms.</p>
                  </div>
                  {canModifyAnimals && (
                    <button
                      onClick={() => setShowAddAnimalForm(!showAddAnimalForm)}
                      className="cursor-pointer bg-[#5a5a40] hover:bg-[#3e3e2b] text-white text-xs py-2 px-4 rounded-xl font-bold flex items-center gap-1.5 shadow-sm border-none"
                    >
                      {showAddAnimalForm ? 'Cancel Form' : <><Plus className="w-4 h-4" /> Add Animal</>}
                    </button>
                  )}
                </div>

                {/* Add Animal Sliding Container */}
                <AnimatePresence>
                  {showAddAnimalForm && (
                     <motion.form
                       onSubmit={handleRegisterAnimal}
                       initial={{ opacity: 0, y: -10 }}
                       animate={{ opacity: 1, y: 0 }}
                       exit={{ opacity: 0, y: -10 }}
                       className="bg-[#fdfbf7] border border-[#e3dec9] rounded-2xl p-6 gap-4 grid grid-cols-1 md:grid-cols-3"
                     >
                       <div className="col-span-1 md:col-span-3 pb-2 border-b border-[#f4f1e9]">
                         <h4 className="font-bold text-sm text-[#5a5a40]">New Herd Registry Form</h4>
                         <p className="text-[10px] text-gray-400 font-mono mt-0.5">Automated schedules will be generated upon entry</p>
                       </div>

                       <div>
                         <label className="block text-xs font-bold text-gray-600 mb-1">Animal Tag / ID *</label>
                         <input
                           type="text"
                           placeholder="e.g. COW-042"
                           required
                           value={animalIdInput}
                           onChange={(e) => setAnimalIdInput(e.target.value)}
                           className="w-full bg-white border border-[#e3dec9] rounded-xl px-3 py-2 text-xs focus:outline-[#5a5a40]"
                         />
                       </div>

                       <div>
                         <label className="block text-xs font-bold text-gray-600 mb-1">Species *</label>
                         <select
                           value={animalSpecies}
                           onChange={(e: any) => setAnimalSpecies(e.target.value)}
                           className="w-full bg-white border border-[#e3dec9] rounded-xl px-3 py-2 text-xs focus:outline-[#5a5a40]"
                         >
                           <option value="Cattle">Cattle</option>
                           <option value="Buffalo">Buffalo</option>
                           <option value="Goat">Goat</option>
                           <option value="Sheep">Sheep</option>
                           <option value="Poultry">Poultry</option>
                           <option value="Other">Other</option>
                         </select>
                       </div>

                       <div>
                         <label className="block text-xs font-bold text-gray-600 mb-1">Identifier / Tag ID</label>
                         <input
                           type="text"
                           placeholder="e.g. PK-84221"
                           value={tagNumber}
                           onChange={(e) => setTagNumber(e.target.value)}
                           className="w-full bg-white border border-[#e3dec9] rounded-xl px-3 py-2 text-xs focus:outline-[#5a5a40]"
                         />
                       </div>

                       <div>
                         <label className="block text-xs font-bold text-gray-600 mb-1">Gender *</label>
                         <div className="grid grid-cols-2 gap-2">
                           <button
                             type="button"
                             onClick={() => setGender('Female')}
                             className={`cursor-pointer border py-2 rounded-xl text-xs font-bold ${gender === 'Female' ? 'bg-[#5a5a40] text-white border-[#5a5a40]' : 'bg-white text-gray-600 border-gray-200'}`}
                           >
                             Female
                           </button>
                           <button
                             type="button"
                             onClick={() => setGender('Male')}
                             className={`cursor-pointer border py-2 rounded-xl text-xs font-bold ${gender === 'Male' ? 'bg-[#5a5a40] text-white border-[#5a5a40]' : 'bg-white text-gray-600 border-gray-200'}`}
                           >
                             Male
                           </button>
                         </div>
                       </div>

                       <div>
                         <label className="block text-xs font-bold text-gray-600 mb-1">Date of Birth *</label>
                         <input
                           type="date"
                           required
                           value={dob}
                           onChange={(e) => setDob(e.target.value)}
                           className="w-full bg-white border border-[#e3dec9] rounded-xl px-3 py-2 text-xs focus:outline-[#5a5a40]"
                         />
                       </div>

                       <div>
                         <label className="block text-xs font-bold text-gray-600 mb-1">Breed / Variety</label>
                         <input
                           type="text"
                           placeholder="e.g. Sahiwal Cow"
                           value={breed}
                           onChange={(e) => setBreed(e.target.value)}
                           className="w-full bg-white border border-[#e3dec9] rounded-xl px-3 py-2 text-xs focus:outline-[#5a5a40]"
                         />
                       </div>

                       <div>
                         <label className="block text-xs font-bold text-gray-600 mb-1">Weight (kg)</label>
                         <input
                           type="number"
                           step="0.1"
                           placeholder="e.g. 320"
                           value={weight}
                           onChange={(e) => setWeight(e.target.value)}
                           className="w-full bg-white border border-[#e3dec9] rounded-xl px-3 py-2 text-xs focus:outline-[#5a5a40]"
                         />
                       </div>

                       <div>
                         <label className="block text-xs font-bold text-gray-600 mb-1">Health Status *</label>
                         <select
                           value={healthStatus}
                           onChange={(e: any) => setHealthStatus(e.target.value)}
                           className="w-full bg-white border border-[#e3dec9] rounded-xl px-3 py-2 text-xs focus:outline-[#5a5a40]"
                         >
                           <option value="Healthy">Healthy</option>
                           <option value="Sick">Sick</option>
                           <option value="Under Treatment">Under Treatment</option>
                           <option value="Quarantined">Quarantined</option>
                         </select>
                       </div>

                       <div className="flex items-end justify-end pt-5 col-span-1 md:col-span-3">
                         <button
                           type="submit"
                           className="cursor-pointer bg-[#5a5a40] hover:bg-[#3e3e2b] text-white text-xs font-bold py-2.5 px-6 rounded-xl border-none shadow-sm"
                         >
                           Save Record & Auto-Schedule Care
                         </button>
                       </div>
                     </motion.form>
                  )}
                </AnimatePresence>

                {/* Animals List */}
                {animals.length === 0 ? (
                  <div className="bg-white border rounded-2xl p-12 text-center text-xs text-gray-400">
                    No animals listed in herd registry. Click "Add Animal" above.
                  </div>
                ) : (
                  <div className="bg-white border border-[#e3dec9] rounded-2xl overflow-hidden shadow-xs">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-[#fcfbf9] border-b border-[#e3dec9]">
                          <th className="p-4 font-bold text-[#5a5a40]">ID & Breed</th>
                          <th className="p-4 font-bold text-[#5a5a40]">Species</th>
                          <th className="p-4 font-bold text-[#5a5a40]">Gender & DOB</th>
                          <th className="p-4 font-bold text-[#5a5a40]">Weight</th>
                          <th className="p-4 font-bold text-[#5a5a40]">Status</th>
                          {canModifyAnimals && <th className="p-4 font-bold text-[#5a5a40] text-right">Delete</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#f4f2ea]">
                        {animals.map(a => (
                          <tr key={a.id} className="hover:bg-[#fcfbf9]/50 transition-all">
                            <td className="p-4 font-bold">
                              <div>{a.animalId}</div>
                              {a.tagNumber && <span className="font-mono text-[9px] text-[#7a766f]">Tag: {a.tagNumber}</span>}
                              {a.breed && <span className="text-[10px] text-gray-400 block">{a.breed}</span>}
                            </td>
                            <td className="p-4">
                              <span className="font-semibold text-gray-700">{a.species}</span>
                            </td>
                            <td className="p-4">
                              <div>{a.gender}</div>
                              <div className="text-[10px] text-gray-400 font-mono italic">DOB: {a.dob || 'Unknown'}</div>
                            </td>
                            <td className="p-4 font-semibold text-gray-600">
                              {a.weight ? `${a.weight} kg` : '-'}
                            </td>
                            <td className="p-4">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                                a.healthStatus === 'Healthy' ? 'bg-emerald-100 text-emerald-800' :
                                a.healthStatus === 'Sick' ? 'bg-red-100 text-red-800' :
                                a.healthStatus === 'Under Treatment' ? 'bg-amber-100 text-amber-900' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {a.healthStatus}
                              </span>
                            </td>
                            {canModifyAnimals && (
                              <td className="p-4 text-right">
                                <button
                                  onClick={() => handleDeleteAnimal(a.id)}
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
                    <table className="w-full text-left text-xs border-collapse">
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
                    <table className="w-full text-left text-xs border-collapse">
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

    </div>
  );
}
