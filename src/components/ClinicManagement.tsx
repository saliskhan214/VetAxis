import { useState, useEffect, FormEvent } from 'react';
import { 
  Calendar as CalendarIcon, 
  FileText, 
  Pill, 
  Receipt, 
  BarChart3, 
  Plus, 
  Clock, 
  Phone, 
  Check, 
  AlertTriangle, 
  Printer, 
  User, 
  Search, 
  DollarSign, 
  Users, 
  CheckCircle2, 
  X, 
  FileSignature, 
  RefreshCw,
  Send,
  Sliders,
  Sparkles,
  Info,
  Trash2,
  Save
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  BarChart, 
  Bar, 
  Cell, 
  PieChart, 
  Pie 
} from 'recharts';
import { 
  ClinicService, 
  ClinicAppointment, 
  ClinicSoapRecord, 
  ClinicPrescription, 
  ClinicInvoice, 
  ServiceCatalogItem 
} from '../lib/clinicService';
import { UserProfile } from '../types';
import { NotificationService } from '../lib/storage';

interface ClinicManagementProps {
  user: UserProfile;
  highlightAppointmentId?: string | null;
  onClearHighlightAppointment?: () => void;
}

type TabType = 'appointments' | 'soap' | 'prescriptions';

export function ClinicManagement({ 
  user, 
  highlightAppointmentId, 
  onClearHighlightAppointment 
}: ClinicManagementProps) {
  const [activeTab, setActiveTab] = useState<TabType>('appointments');
  const [appointments, setAppointments] = useState<ClinicAppointment[]>([]);
  const [soaps, setSoaps] = useState<ClinicSoapRecord[]>([]);
  const [prescriptions, setPrescriptions] = useState<ClinicPrescription[]>([]);
  const [invoices, setInvoices] = useState<ClinicInvoice[]>([]);
  const [catalog, setCatalog] = useState<ServiceCatalogItem[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  // Filter and view states
  const [calendarView, setCalendarView] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [selectedSubTab, setSelectedSubTab] = useState<'list' | 'wait' | 'blocked' | 'completed' | 'cancelled' | 'noshow'>('list');
  const [searchQuery, setSearchQuery] = useState('');

  // Creation State modals
  const [showApptModal, setShowApptModal] = useState(false);
  const [showSoapModal, setShowSoapModal] = useState(false);
  const [showPrescModal, setShowPrescModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState<{ type: 'soap' | 'presc' | 'invoice'; id: string } | null>(null);

  // Custom polished confirmation dialog overlay state
  const [confirmState, setConfirmState] = useState<{
    title: string;
    message: string;
    onConfirm: () => void | Promise<void>;
    confirmText?: string;
    cancelText?: string;
    isDanger?: boolean;
  } | null>(null);

  // Active records for forms or detail views
  const [activeAppt, setActiveAppt] = useState<ClinicAppointment | null>(null);
  const [activeSoap, setActiveSoap] = useState<ClinicSoapRecord | null>(null);
  const [activePrescription, setActivePrescription] = useState<ClinicPrescription | null>(null);
  const [highlightedApptId, setHighlightedApptId] = useState<string | null>(null);

  // New Form states
  const [newAppt, setNewAppt] = useState<Partial<ClinicAppointment>>({
    patientName: '',
    ownerName: '',
    ownerPhone: '',
    date: new Date().toISOString().split('T')[0],
    time: '10:00',
    vetId: 'vet_default',
    vetName: 'Dr. Sarah Alizai',
    type: 'consultation',
    status: 'Scheduled',
    isRecurring: false,
    recurrencePattern: 'None',
    notes: ''
  });

  // Automatically scroll screen to top/start of popup when any modal opens
  useEffect(() => {
    if (showApptModal || showSoapModal || showPrescModal || showInvoiceModal || showPrintModal) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [showApptModal, showSoapModal, showPrescModal, showInvoiceModal, showPrintModal]);

  const [newSoap, setNewSoap] = useState<Partial<ClinicSoapRecord>>({
    patientName: '',
    species: '',
    ownerName: '',
    ownerPhone: '',
    date: new Date().toISOString().split('T')[0],
    subjective: '',
    objective: '',
    assessment: '',
    plan: '',
    vetSignature: 'Dr. Sarah Alizai (L-' + Math.floor(1000 + Math.random() * 9000) + ')'
  });

  // Vitals Auto-Fill and unified Prescription states
  const [includePrescription, setIncludePrescription] = useState(false);
  const [customObjectiveText, setCustomObjectiveText] = useState('');
  const [vitalsEnabled, setVitalsEnabled] = useState({
    temp: false,
    hr: false,
    rr: false,
    mm: false,
    crt: false,
    palpation: false,
    hydration: false,
    bcs: false
  });
  const [vitalsValues, setVitalsValues] = useState({
    temp: '38.5 °C (Normal)',
    hr: '90 bpm (Normal)',
    rr: '24/min (Normal)',
    mm: 'Pink & Moist',
    crt: '< 2s',
    palpation: 'Soft, Non-painful',
    hydration: 'Normal/Hydrated',
    bcs: '5/9 (Ideal)'
  });

  // Automatically update newSoap.objective when vitals or custom text change
  useEffect(() => {
    const parts: string[] = [];
    if (vitalsEnabled.temp) parts.push(`Temp: ${vitalsValues.temp}`);
    if (vitalsEnabled.hr) parts.push(`HR: ${vitalsValues.hr}`);
    if (vitalsEnabled.rr) parts.push(`RR: ${vitalsValues.rr}`);
    if (vitalsEnabled.mm) parts.push(`MM: ${vitalsValues.mm}`);
    if (vitalsEnabled.crt) parts.push(`CRT: ${vitalsValues.crt}`);
    if (vitalsEnabled.palpation) parts.push(`Palpation: ${vitalsValues.palpation}`);
    if (vitalsEnabled.hydration) parts.push(`Hydration: ${vitalsValues.hydration}`);
    if (vitalsEnabled.bcs) parts.push(`BCS: ${vitalsValues.bcs}`);

    const compiled = parts.join(' | ');
    const fullText = compiled + (compiled && customObjectiveText ? '\n\nAdditional Findings:\n' : '') + customObjectiveText;

    setNewSoap(prev => ({
      ...prev,
      objective: fullText
    }));
  }, [vitalsEnabled, vitalsValues, customObjectiveText]);

  // Synchronize Patient detail changes from SOAP form into Prescription form
  useEffect(() => {
    setPrescriptionForm(prev => ({
      ...prev,
      patientName: newSoap.patientName || '',
      ownerName: newSoap.ownerName || '',
      ownerPhone: newSoap.ownerPhone || '',
      vetSignature: newSoap.vetSignature || ''
    }));
  }, [newSoap.patientName, newSoap.ownerName, newSoap.ownerPhone, newSoap.vetSignature]);

  const [prescriptionForm, setPrescriptionForm] = useState<{
    patientName: string;
    species?: string;
    ownerName: string;
    ownerPhone: string;
    weightKg: number;
    drugs: Array<{ name: string; brandName?: string; isGeneric: boolean; dosage: string; instructions: string }>;
    dispensedFromStock: boolean;
    vetSignature: string;
  }>({
    patientName: '',
    species: '',
    ownerName: '',
    ownerPhone: '',
    weightKg: 5,
    drugs: [{ name: '', brandName: '', isGeneric: true, dosage: '', instructions: '' }],
    dispensedFromStock: true,
    vetSignature: ''
  });

  const [invoiceForm, setInvoiceForm] = useState<{
    patientName: string;
    ownerName: string;
    items: Array<{ catalogId: string; name: string; quantity: number; unitPrice: number; category: any }>;
    discountAmount: number;
    discountReason: string;
    paymentMethod: 'cash' | 'JazzCash' | 'Easypaisa' | 'bank transfer' | 'card';
  }>({
    patientName: '',
    ownerName: '',
    items: [{ catalogId: '', name: '', quantity: 1, unitPrice: 0, category: 'consultation' }],
    discountAmount: 0,
    discountReason: '',
    paymentMethod: 'cash'
  });

  // Load and refresh core local assets
  const loadData = async () => {
    setIsSyncing(true);
    try {
      const a = await ClinicService.fetchAppointments(user.uid);
      const s = await ClinicService.fetchSoapRecords(user.uid);
      const p = await ClinicService.fetchPrescriptions(user.uid);
      const i = await ClinicService.fetchInvoices(user.uid);
      const cat = await ClinicService.fetchServiceCatalog();

      setAppointments(a);
      setSoaps(s);
      setPrescriptions(p);
      setInvoices(i);
      setCatalog(cat);
    } catch (err) {
      console.error("Failed loading clinic metrics:", err);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user.uid]);

  useEffect(() => {
    if (highlightAppointmentId && appointments.length > 0) {
      const targetAppt = appointments.find(a => a.id === highlightAppointmentId);
      if (targetAppt) {
        setActiveTab('appointments');
        setCalendarView('daily');
        setActiveAppt(targetAppt);
        setHighlightedApptId(highlightAppointmentId);
        setSearchQuery(''); // clear query to show daily list

        if (targetAppt.isBlocked) {
          setSelectedSubTab('blocked');
        } else if (targetAppt.status === 'Checked In' || targetAppt.status === 'In Progress') {
          setSelectedSubTab('wait');
        } else if (targetAppt.status === 'Completed') {
          setSelectedSubTab('completed');
        } else if (targetAppt.status === 'Cancelled') {
          setSelectedSubTab('cancelled');
        } else if (targetAppt.status === 'No Show') {
          setSelectedSubTab('noshow');
        } else {
          setSelectedSubTab('list');
        }

        if (onClearHighlightAppointment) {
          onClearHighlightAppointment();
        }
      }
    }
  }, [highlightAppointmentId, appointments, onClearHighlightAppointment]);

  // Handler: Save Appointment
  const handleCreateAppointment = async (e: FormEvent) => {
    e.preventDefault();
    if (!newAppt.patientName || !newAppt.ownerName) return;

    const record: ClinicAppointment = {
      id: 'apt_' + Date.now(),
      clinicId: user.uid,
      patientName: newAppt.patientName,
      ownerName: newAppt.ownerName,
      ownerPhone: newAppt.ownerPhone || '',
      date: newAppt.date || new Date().toISOString().split('T')[0],
      time: newAppt.time || '10:00',
      vetId: newAppt.vetId || 'vet_default',
      vetName: newAppt.vetName || 'Dr. Sarah Alizai',
      type: newAppt.type as any || 'consultation',
      status: newAppt.status as any || 'Scheduled',
      isRecurring: !!newAppt.isRecurring,
      recurrencePattern: newAppt.recurrencePattern as any || 'None',
      notes: newAppt.notes || '',
      isBlocked: !!newAppt.isBlocked,
      blockedReason: newAppt.blockedReason || '',
      createdAt: Date.now()
    };

    await ClinicService.saveAppointment(record);
    setShowApptModal(false);
    // Reset Form
    setNewAppt({
      patientName: '',
      ownerName: '',
      ownerPhone: '',
      date: new Date().toISOString().split('T')[0],
      time: '10:00',
      vetId: 'vet_default',
      vetName: 'Dr. Sarah Alizai',
      type: 'consultation',
      status: 'Scheduled',
      isRecurring: false,
      recurrencePattern: 'None',
      isBlocked: false,
      blockedReason: '',
      notes: ''
    });
    loadData();
  };

  // Quick Walk-In Patient Queue Handler
  const handleQuickWalkIn = () => {
    setNewAppt({
      patientName: '',
      ownerName: '',
      ownerPhone: '',
      date: new Date().toISOString().split('T')[0],
      time: new Date().toTimeString().split(' ')[0].substring(0, 5),
      vetId: 'vet_default',
      vetName: 'Dr. Sarah Alizai',
      type: 'consultation',
      status: 'Checked In', // Instantly queues onto waiting panel
      isRecurring: false,
      recurrencePattern: 'None',
      isBlocked: false,
      blockedReason: '',
      notes: 'Quick Walk-In Registration form'
    });
    setShowApptModal(true);
  };

  // Block time slot handler
  const handleBlockTimeSlot = () => {
    setNewAppt({
      patientName: '⚠️ BLOCKED SLOT',
      ownerName: 'System admin',
      ownerPhone: '',
      date: new Date().toISOString().split('T')[0],
      time: '13:00',
      vetId: 'system',
      vetName: 'All Vets',
      type: 'emergency',
      status: 'Scheduled',
      isRecurring: false,
      isBlocked: true,
      blockedReason: 'Staff Lunch Break / Meeting Hour',
      notes: 'Time slot blocked'
    });
    setShowApptModal(true);
  };

  // Quick state status switch for appointment flows
  const updateApptStatus = async (id: string, newStatus: any) => {
    const target = appointments.find(a => a.id === id);
    if (!target) return;
    const updated = { ...target, status: newStatus };
    await ClinicService.saveAppointment(updated);
    
    if (target.userId) {
      try {
        await NotificationService.createNotification({
          userId: target.userId,
          senderId: user.uid,
          senderName: user.name || 'VetAxis Clinic',
          type: 'appointment_action',
          targetId: target.id,
          targetType: 'appointment',
          message: `Your appointment reservation for ${target.patientName} has been updated to "${newStatus}" by ${user.name || 'the clinic'}.`,
          read: false
        });
      } catch (notifErr) {
        console.error('Failed to notify client during status update:', notifErr);
      }
    }

    if (id === highlightedApptId) {
      setHighlightedApptId(null);
    }
    loadData();
  };

  // SOAP Action Presets Trigger
  const applySoapTemplate = (type: 'vaccine' | 'flea' | 'spay') => {
    if (type === 'vaccine') {
      setNewSoap({
        ...newSoap,
        subjective: 'Brought in for routine core annual vaccinations. Owner reports animal has been eating normally, no vomiting or diarrhea observed.',
        objective: 'Temp: 38.5 C, HR: 105 bpm, Resp: 24 bpm, Weight: 12 kg. Hydration: Excellent. Peripheral lymph nodes normal. Cardiopulmonary exam clear.',
        assessment: 'Healthy canine candidate for DHPPi-L multi-vaccine inoculation.',
        plan: 'Administered 1ml DHPPi-L vaccine subcutaneously. Advise owner to watch for minor vaccine site soreness or lethargy over next 24 hours.'
      });
    } else if (type === 'flea') {
      setNewSoap({
        ...newSoap,
        subjective: 'Owner reports intensive coat scratching, chewing base of tail, and general restlessness. Mild discomfort expressed.',
        objective: 'Temp: 38.6 C, HR: 112 bpm, Weight: 6.2 kg. Moderate flea dirt noted across dorsal lumbosacral region. Flea-bite dermatitis patch visible.',
        assessment: 'Flea infestation with localized flea allergy dermatitis (FAD).',
        plan: 'Administer topical Selamectin protective drop. Prescribe short-course Prednisolone to control coat pruritus.'
      });
    } else if (type === 'spay') {
      setNewSoap({
        ...newSoap,
        subjective: 'Scheduled routine ovariohysterectomy. Patient fasted for 12 hours prior to scheduled surgery block.',
        objective: 'Temp: 38.3 C, HR: 95 bpm, Weight: 4.8 kg. Physical exam normal. Blood chemistry panel values safely within baseline margins.',
        assessment: 'Optimal health profile. Suitable for surgical general anesthesia induction.',
        plan: 'Standard midline ovariohysterectomy performed successfully under Isoflurane anesthesia. Monitor site, provide Meloxicam analgesic drops, and schedule suture removal in 10 days.'
      });
    }
  };

  const handleCreateSoap = async (e: FormEvent) => {
    e.preventDefault();
    if (!newSoap.patientName || !newSoap.ownerName) return;

    try {
      const soapId = 'soap_' + Date.now();
      const record: ClinicSoapRecord = {
        id: soapId,
        clinicId: user.uid,
        patientName: newSoap.patientName || '',
        species: newSoap.species || '',
        ownerName: newSoap.ownerName || '',
        ownerPhone: newSoap.ownerPhone || '',
        date: newSoap.date || new Date().toISOString().split('T')[0],
        subjective: newSoap.subjective || '',
        objective: newSoap.objective || '',
        assessment: newSoap.assessment || '',
        plan: newSoap.plan || '',
        vetSignature: newSoap.vetSignature || 'Licensed Practitioner',
        createdAt: Date.now(),
        lastUpdated: Date.now(),
        isLocked: true, // Button says "Lock Soap Card" so publish it locked!
        authorUid: user.uid,
        userId: user.uid
      };

      await ClinicService.saveSoapRecord(record);

      // If Prescription section is enabled, write linked prescription
      if (includePrescription) {
        const isControlled = prescriptionForm.drugs.some(pd => {
          const nameLower = pd.name.toLowerCase();
          return nameLower.includes('ketamine') || nameLower.includes('xylazine');
        });

        const presc: ClinicPrescription = {
          id: 'prc_' + Date.now(),
          clinicId: user.uid,
          soapId: soapId,
          patientName: record.patientName,
          species: record.species,
          ownerName: record.ownerName,
          ownerPhone: record.ownerPhone,
          date: record.date,
          weightKg: Number(prescriptionForm.weightKg || 5),
          dispensedFromStock: false,
          isControlled,
          controlledLogRef: isControlled ? 'CR-LOG-' + Math.floor(100000 + Math.random() * 900000) : undefined,
          vetSignature: record.vetSignature,
          drugs: prescriptionForm.drugs,
          createdAt: Date.now(),
          authorUid: user.uid,
          userId: user.uid
        };
        await ClinicService.savePrescription(presc);
      }

      setShowSoapModal(false);
      // Reset SOAP Form
      setNewSoap({
        patientName: '',
        species: '',
        ownerName: '',
        ownerPhone: '',
        date: new Date().toISOString().split('T')[0],
        subjective: '',
        objective: '',
        assessment: '',
        plan: '',
        vetSignature: 'Dr. Sarah Alizai (L-' + Math.floor(1000 + Math.random() * 9000) + ')'
      });
      // Reset Prescription Form
      setPrescriptionForm({
        patientName: '',
        ownerName: '',
        ownerPhone: '',
        weightKg: 5,
        drugs: [{ name: '', brandName: '', isGeneric: true, dosage: '', instructions: '' }],
        dispensedFromStock: false,
        vetSignature: ''
      });
      setIncludePrescription(false);
      setCustomObjectiveText('');
      setVitalsEnabled({
        temp: false,
        hr: false,
        rr: false,
        mm: false,
        crt: false,
        palpation: false,
        hydration: false,
        bcs: false
      });

      // Reload lists and set active soap
      const updatedSoaps = await ClinicService.fetchSoapRecords(user.uid);
      setSoaps(updatedSoaps);
      const updatedPrescs = await ClinicService.fetchPrescriptions(user.uid);
      setPrescriptions(updatedPrescs);
      
      const savedRecord = updatedSoaps.find(s => s.id === soapId) || record;
      setActiveSoap(savedRecord);

      // Force view active SOAP tab so the ledger panel loaded with the newly saved item is visible
      setActiveTab('soap');

    } catch (err) {
      alert(`Error publishing SOAP record: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleLockSoapRecord = (soapId: string) => {
    const target = soaps.find(s => s.id === soapId);
    if (!target) return;

    setConfirmState({
      title: "Permanently Lock Soap Record",
      message: "Are you sure you want to permanently lock this SOAP Clinical Record? This action is irreversible and ensures digital veterinary registry integrity.",
      confirmText: "🔒 Permanent Lock",
      isDanger: true,
      onConfirm: async () => {
        try {
          const updated = { ...target, isLocked: true, lastUpdated: Date.now() };
          await ClinicService.saveSoapRecord(updated);
          
          setActiveSoap(updated);
          loadData();
          setConfirmState(null);
        } catch (err) {
          alert(`Error locking SOAP record: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    });
  };

  // Prescription Writer Handlers
  const addPrescDrugRow = () => {
    setPrescriptionForm({
      ...prescriptionForm,
      drugs: [...prescriptionForm.drugs, { name: '', brandName: '', isGeneric: true, dosage: '', instructions: '' }]
    });
  };

  const removePrescDrugRow = (idx: number) => {
    const updated = [...prescriptionForm.drugs];
    updated.splice(idx, 1);
    setPrescriptionForm({ ...prescriptionForm, drugs: updated });
  };

  const handleCreatePrescription = async (e: FormEvent) => {
    e.preventDefault();
    if (!prescriptionForm.patientName || prescriptionForm.drugs.some(d => !d.name)) return;

    try {
      // Interaction Warn Analyzer
      const selectedDrugNames = prescriptionForm.drugs.map(d => d.name.toLowerCase());
      const isControlled = prescriptionForm.drugs.some(pd => {
        const nameLower = pd.name.toLowerCase();
        return nameLower.includes('ketamine') || nameLower.includes('xylazine');
      });

      const record: ClinicPrescription = {
        id: 'prc_' + Date.now(),
        clinicId: user.uid,
        patientName: prescriptionForm.patientName,
        species: prescriptionForm.species || '',
        ownerName: prescriptionForm.ownerName,
        ownerPhone: prescriptionForm.ownerPhone,
        date: new Date().toISOString().split('T')[0],
        weightKg: Number(prescriptionForm.weightKg),
        dispensedFromStock: prescriptionForm.dispensedFromStock,
        isControlled,
        controlledLogRef: isControlled ? 'CR-LOG-' + Math.floor(100000 + Math.random() * 900000) : undefined,
        vetSignature: prescriptionForm.vetSignature,
        drugs: prescriptionForm.drugs,
        createdAt: Date.now(),
        authorUid: user.uid,
        userId: user.uid
      };

      await ClinicService.savePrescription(record);
      setShowPrescModal(false);
      setPrescriptionForm({
        patientName: '',
        species: '',
        ownerName: '',
        ownerPhone: '',
        weightKg: 5,
        drugs: [{ name: '', brandName: '', isGeneric: true, dosage: '', instructions: '' }],
        dispensedFromStock: true,
        vetSignature: ''
      });
      setActivePrescription(record);
      loadData();
    } catch (err) {
      alert(`Error issuing prescription: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleDeletePrescription = (id: string, patientName: string) => {
    setConfirmState({
      title: "Delete Prescription Record",
      message: `Are you sure you want to permanently delete the clinical prescription for ${patientName}? This action is irreversible and will remove the prescription from the digital veterinary records.`,
      confirmText: "🗑️ Yes, Delete",
      cancelText: "Cancel / Return",
      isDanger: true,
      onConfirm: async () => {
        try {
          await ClinicService.deletePrescription(id);
          setActivePrescription((prev) => {
            if (prev?.id === id) return null;
            return prev;
          });
          await loadData();
          setConfirmState(null);
        } catch (err) {
          alert(`Error deleting prescription: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    });
  };

  const handleDeleteSoap = (id: string, patientName: string) => {
    setConfirmState({
      title: "Delete SOAP Clinical Record",
      message: `Are you sure you want to permanently delete the SOAP ledger entry for ${patientName}? This action is irreversible and will remove the clinical card from the medical registry.`,
      confirmText: "🗑️ Yes, Delete",
      cancelText: "Cancel / Return",
      isDanger: true,
      onConfirm: async () => {
        try {
          await ClinicService.deleteSoapRecord(id);
          setActiveSoap((prev) => {
            if (prev?.id === id) return null;
            return prev;
          });
          await loadData();
          setConfirmState(null);
        } catch (err) {
          alert(`Error deleting SOAP record: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    });
  };

  // Canvas Exporter: Merges SOAP + Prescription and downloads as PNG Image alongside JSON local record
  const handleDownloadAsImage = (soapRecord: ClinicSoapRecord, prescription: ClinicPrescription | null) => {
    try {
      const width = 900;
      const height = prescription ? 1550 : 1000;
      
      const canvas = document.createElement('canvas');
      // Retina scale 2x for professional sharpness
      canvas.width = width * 2;
      canvas.height = height * 2;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        alert("Failed to build graphics execution engine. Canvas context unavailable.");
        return;
      }
      ctx.scale(2, 2);

      // 1. Fill Ivory Paper Background
      ctx.fillStyle = '#fdfbf7';
      ctx.fillRect(0, 0, width, height);

      // 2. Styled Vintage double border
      ctx.strokeStyle = '#e3dec9';
      ctx.lineWidth = 1;
      ctx.strokeRect(10, 10, width - 20, height - 20);
      ctx.strokeStyle = '#8b8b6a';
      ctx.lineWidth = 2;
      ctx.strokeRect(15, 15, width - 30, height - 30);

      // 3. Vintage notebook margin red line
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.25)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(65, 15);
      ctx.lineTo(65, height - 15);
      ctx.stroke();

      // Wrapped Text Utility
      const drawWrappedText = (
        text: string, 
        x: number, 
        y: number, 
        maxWidth: number, 
        lineHeight: number, 
        fontStyle = '12px "Times New Roman", serif', 
        fillStyle = '#3e3d36'
      ): number => {
        ctx.font = fontStyle;
        ctx.fillStyle = fillStyle;
        const paragraphs = text.split('\n');
        let currentY = y;
        for (const paragraph of paragraphs) {
          const words = paragraph.split(' ');
          let line = '';
          for (let n = 0; n < words.length; n++) {
            let testLine = line + words[n] + ' ';
            let testWidth = ctx.measureText(testLine).width;
            if (testWidth > maxWidth && n > 0) {
              ctx.fillText(line, x, currentY);
              line = words[n] + ' ';
              currentY += lineHeight;
            } else {
              line = testLine;
            }
          }
          ctx.fillText(line, x, currentY);
          currentY += lineHeight; // extra gap between lines
        }
        return currentY;
      };

      // 4. Clinical Letterhead Centered Section
      ctx.textAlign = 'center';
      ctx.fillStyle = '#5a5a40';
      ctx.font = 'bold 22px "Georgia", serif';
      ctx.fillText(user.name?.toUpperCase() || 'VETAXIS OFFICIAL CLINIC', width / 2, 70);

      ctx.fillStyle = '#6b7280';
      ctx.font = 'italic 11px sans-serif';
      ctx.fillText('Licensed Diagnostic Laboratory & Surgery Registry', width / 2, 92);

      ctx.font = '9px monospace';
      ctx.fillText(`ADDRESS: ${user.address || 'CANTT PLAZA, PESHAWAR, PAKISTAN'} · PH: ${user.phone || '091-522222'}`, width / 2, 110);

      // Solid divider line
      ctx.strokeStyle = '#5a5a40';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(40, 125);
      ctx.lineTo(width - 40, 125);
      ctx.stroke();

      // 5. Patient Card Metadata box
      ctx.textAlign = 'left';
      ctx.fillStyle = '#faf8f2';
      ctx.fillRect(80, 140, width - 160, 90);
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1;
      ctx.strokeRect(80, 140, width - 160, 90);

      ctx.font = '9px monospace';
      ctx.fillStyle = '#64748b';
      ctx.fillText('PATIENT PET:', 100, 165);
      ctx.fillText('DATE RECORDED:', 100, 192);
      ctx.fillText('OWNER / CLIENT:', 100, 215);

      ctx.fillText('RECORD TYPE:', width / 2 + 10, 165);
      ctx.fillText('WEIGHT:', width / 2 + 10, 192);
      ctx.fillText('CASE FILE ID:', width / 2 + 10, 215);

      ctx.font = 'bold 10px sans-serif';
      ctx.fillStyle = '#1e293b';
      ctx.fillText(soapRecord.patientName.toUpperCase(), 210, 165);
      ctx.fillText(soapRecord.date, 210, 192);
      ctx.fillText(soapRecord.ownerName, 210, 215);

      ctx.fillText(prescription ? 'SOAP MEDICAL EXAM + RX DISPATCH' : 'CLINICAL SOAP EXAM CARD', width / 2 + 120, 165);
      ctx.fillText(prescription ? `${prescription.weightKg} kg` : 'Not Measured', width / 2 + 120, 192);
      ctx.fillText(soapRecord.id, width / 2 + 120, 215);

      // 6. Draw SOAP Sections
      let y = 275;
      const startX = 80;
      const contentWidth = width - 160;

      // Subjective
      ctx.fillStyle = '#a0522d';
      ctx.fillRect(startX, y - 14, 20, 18);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText('S', startX + 6, y - 1);
      ctx.font = 'bold 10px sans-serif';
      ctx.fillStyle = '#a0522d';
      ctx.fillText('SUBJECTIVE CASE COMPLAINT (OWNER DISCLOSURE)', startX + 28, y - 1);
      y += 15;
      y = drawWrappedText(soapRecord.subjective || 'No complaints detailed.', startX + 10, y, contentWidth - 20, 15, '11px "Times New Roman", serif', '#334155');
      y += 15;

      // Objective
      ctx.fillStyle = '#065f46';
      ctx.fillRect(startX, y - 14, 20, 18);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText('O', startX + 6, y - 1);
      ctx.font = 'bold 10px sans-serif';
      ctx.fillStyle = '#065f46';
      ctx.fillText('OBJECTIVE PHYSICAL EXAMINATION & VITALS', startX + 28, y - 1);
      y += 15;
      y = drawWrappedText(soapRecord.objective || 'No physical findings locked.', startX + 10, y, contentWidth - 20, 15, '11px "Times New Roman", serif', '#334155');
      y += 15;

      // Assessment
      ctx.fillStyle = '#5a5a40';
      ctx.fillRect(startX, y - 14, 20, 18);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText('A', startX + 6, y - 1);
      ctx.font = 'bold 10px sans-serif';
      ctx.fillStyle = '#5a5a40';
      ctx.fillText('ASSESSMENT & CLINICAL IMPRESSION / DIAGNOSIS', startX + 28, y - 1);
      y += 15;
      y = drawWrappedText(soapRecord.assessment || 'No Working diagnosis formulated.', startX + 10, y, contentWidth - 20, 15, 'bold 12px "Times New Roman", serif', '#0f172a');
      y += 15;

      // Plan
      ctx.fillStyle = '#1e3a8a';
      ctx.fillRect(startX, y - 14, 20, 18);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText('P', startX + 6, y - 1);
      ctx.font = 'bold 10px sans-serif';
      ctx.fillStyle = '#1e3a8a';
      ctx.fillText('CLINICAL TREATMENT PLAN & DISCHARGE DIRECTIVES', startX + 28, y - 1);
      y += 15;
      y = drawWrappedText(soapRecord.plan || 'No plan or instructions detailed.', startX + 10, y, contentWidth - 20, 15, '11px "Times New Roman", serif', '#334155');
      y += 20;

      // 7. Render merged prescription section if available
      if (prescription) {
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 1;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(40, y);
        ctx.lineTo(width - 40, y);
        ctx.stroke();
        ctx.setLineDash([]);
        y += 28;

        // Big absolute position Rx watermark
        ctx.fillStyle = 'rgba(190, 24, 74, 0.04)';
        ctx.font = 'bold 110px "Georgia", serif';
        ctx.fillText('℞', startX, y + 80);

        ctx.fillStyle = '#be184a';
        ctx.font = 'bold 15px "Georgia", serif';
        ctx.fillText('℞  DIGITAL MEDICAL PRESCRIPTION DRUGS DISPATCH', startX, y);
        y += 24;

        prescription.drugs.forEach((d, index) => {
          ctx.fillStyle = '#0f172a';
          ctx.font = 'bold 11px "Georgia", serif';
          ctx.fillText(`${index + 1}. ${d.name} ${d.brandName ? `(${d.brandName})` : ''}`, startX + 15, y);
          y += 15;

          ctx.font = 'italic 10px "Times New Roman", serif';
          ctx.fillStyle = '#475569';
          y = drawWrappedText(`Dosage: ${d.dosage || 'Check label'} · Administration Instructions: ${d.instructions || 'As directed by staff'}`, startX + 25, y, contentWidth - 35, 14, 'italic 10px "Times New Roman", serif', '#475569');
          y += 5;
        });
        y += 10;
      }

      // 8. Practitioner legal stamp block
      y = height - 120;
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1;
      ctx.strokeRect(width - 340, y, 260, 70);
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(width - 340, y, 260, 70);

      ctx.fillStyle = '#64748b';
      ctx.font = '7px monospace';
      ctx.fillText('AUTHORIZED VET CLINICAL LEDGER STAMP', width - 330, y + 15);

      ctx.fillStyle = '#1e3a8a';
      ctx.font = 'italic bold 12px "Georgia", serif';
      ctx.fillText(`🖋️ ${soapRecord.vetSignature}`, width - 330, y + 38);

      ctx.font = '6px monospace';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('SECURITY DIGITAL AUDIT REGISTER ID: ' + soapRecord.id, width - 330, y + 58);

      // Download file action
      const dataUrl = canvas.toDataURL('image/png');
      const dLink = document.createElement('a');
      const cleanName = soapRecord.patientName.replace(/\s+/g, '_').toLowerCase();
      dLink.download = `medical_record_${cleanName}_${soapRecord.date}.png`;
      dLink.href = dataUrl;
      dLink.click();

    } catch (err) {
      alert(`Error building export graphics: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  // Invoicing Action Helpers
  const addInvoiceItemRow = () => {
    setInvoiceForm({
      ...invoiceForm,
      items: [...invoiceForm.items, { catalogId: '', name: '', quantity: 1, unitPrice: 0, category: 'consultation' }]
    });
  };

  const removeInvoiceItemRow = (idx: number) => {
    const updated = [...invoiceForm.items];
    updated.splice(idx, 1);
    setInvoiceForm({ ...invoiceForm, items: updated });
  };

  const handleInvoiceCatalogSelect = (idx: number, catId: string) => {
    const item = catalog.find(c => c.id === catId);
    if (!item) return;

    const updated = [...invoiceForm.items];
    updated[idx] = {
      catalogId: item.id,
      name: item.name,
      quantity: 1,
      unitPrice: item.price,
      category: item.category
    };
    setInvoiceForm({ ...invoiceForm, items: updated });
  };

  const handleCreateInvoice = async (e: FormEvent) => {
    e.preventDefault();
    if (!invoiceForm.patientName || !invoiceForm.ownerName) return;

    const subtotal = invoiceForm.items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
    const actualSubtotal = Math.max(0, subtotal - Number(invoiceForm.discountAmount));
    const taxAmount = Math.round(actualSubtotal * 0.16); // 16% standard Vet Service Tax PKR
    const total = actualSubtotal + taxAmount;

    const record: ClinicInvoice = {
      id: 'inv_' + Date.now(),
      clinicId: user.uid,
      patientName: invoiceForm.patientName,
      ownerName: invoiceForm.ownerName,
      date: new Date().toISOString().split('T')[0],
      items: invoiceForm.items.map((it, idx) => ({ id: 'line_' + idx, ...it })),
      subtotal,
      discountAmount: Number(invoiceForm.discountAmount),
      discountReason: invoiceForm.discountReason,
      taxAmount,
      total,
      paidAmount: total, // Set fully paid by default
      paymentMethod: invoiceForm.paymentMethod,
      paymentStatus: 'Paid',
      createdAt: Date.now(),
      authorUid: user.uid,
      userId: user.uid
    };

    await ClinicService.saveInvoice(record);
    setShowInvoiceModal(false);
    setInvoiceForm({
      patientName: '',
      ownerName: '',
      items: [{ catalogId: '', name: '', quantity: 1, unitPrice: 0, category: 'consultation' }],
      discountAmount: 0,
      discountReason: '',
      paymentMethod: 'cash'
    });
    loadData();
  };

  // Simulated WhatsApp Dispatcher
  const handleSendWhatsAppNotification = (appt: ClinicAppointment) => {
    alert(`📱 Auto SMS/WhatsApp reminder queued successfully for ${appt.ownerName} (${appt.ownerPhone})!\nContent: "Dear Zainab Ahmed, VetAxis reminds you of Sheru's consultation with Dr. Sarah Alizai scheduled at exactly ${appt.time} on ${appt.date}. Location: ${user.address || 'VetAxis Central Clinic'}. Please bring health logs."`);
  };

  // Dynamic SOAP Print / Share Trigger popup
  const triggerPrintDoc = (type: 'soap' | 'presc' | 'invoice', id: string) => {
    setShowPrintModal({ type, id });
  };

  // Fetch helper lists
  const filteredAppointments = appointments.filter(a => {
    if (selectedSubTab === 'wait') {
      return a.status === 'Checked In' || a.status === 'In Progress';
    }
    if (selectedSubTab === 'blocked') {
      return !!a.isBlocked;
    }
    if (selectedSubTab === 'completed') {
      return a.status === 'Completed';
    }
    if (selectedSubTab === 'cancelled') {
      return a.status === 'Cancelled';
    }
    if (selectedSubTab === 'noshow') {
      return a.status === 'No Show';
    }
    return !a.isBlocked && a.status === 'Scheduled';
  });

  const searchedAppointments = filteredAppointments.filter(a => 
    a.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.ownerName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Core Analytical aggregation
  const analyticsToday = (() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const todays = appointments.filter(a => a.date === todayStr);
    const activeQueue = appointments.filter(a => a.status === 'Checked In' || a.status === 'In Progress').length;
    const closedInvoices = invoices.filter(i => i.date === todayStr);
    const totalRevenueToday = closedInvoices.reduce((sum, inv) => sum + inv.total, 0);

    // Low stock count finder
    const lowStock = 0;

    // Fulfill rate percentage
    const finishedCount = appointments.filter(a => a.status === 'Completed').length;
    const missedCount = appointments.filter(a => a.status === 'No Show' || a.status === 'Cancelled').length;
    let fulfillRate = 100;
    if (finishedCount + missedCount > 0) {
      fulfillRate = Math.round((finishedCount / (finishedCount + missedCount)) * 100);
    }

    return {
      appointmentsToday: todays.length,
      revenueToday: totalRevenueToday,
      activeQueue,
      lowStock,
      fulfillRate
    };
  })();

  const revenueAreaChartData = [
    { name: 'Mon', Revenue: 18000 },
    { name: 'Tue', Revenue: 22000 },
    { name: 'Wed', Revenue: 15000 },
    { name: 'Thu', Revenue: 31000 },
    { name: 'Fri', Revenue: 29000 },
    { name: 'Sat', Revenue: 42000 },
    { name: 'Sun', Revenue: 35000 },
  ];

  const diagnosesPieData = [
    { name: 'Flea/Tinea dermatitis', value: 35, color: '#a0522d' },
    { name: 'Vaccination routines', value: 45, color: '#5a5a40' },
    { name: 'Spaying/Neutering', value: 15, color: '#8c8c6a' },
    { name: 'Digestive ailments', value: 20, color: '#cdc6ad' }
  ];

  // Drug contraindication interaction warning flag
  const checkDrugCompatibility = () => {
    const selections = prescriptionForm.drugs.map(d => d.name).filter(Boolean);
    if (selections.includes('Amoxicillin') && selections.includes('Ketamine 10%')) {
      return {
        severity: 'high' as const,
        warn: '⚠️ ALERT: Known mild cardiorespiratory compatibility check recommended. Administer cautiously under active surgery blocks.'
      };
    }
    return null;
  };
  const activeWarning = checkDrugCompatibility();

  return (
    <div id="clinic-management-desk" className="space-y-6 max-w-7xl mx-auto w-[95%] text-left pb-16">
      
      {/* Top Header Card with Stats */}
      <div className="bg-white border border-[#e3dec9] border-b-[4px] border-b-[#cdc6ad] rounded-2xl p-6 shadow-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 text-neutral-100 font-bold select-none text-[150px] leading-none pointer-events-none font-serif">
          ➕
        </div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1 px-2.5 bg-[#a0522d] rounded-lg text-white font-mono text-[9px] font-bold tracking-wider uppercase animate-pulse">
                🏥 VETAXIS CENTRAL CLINIC
              </span>
              <button 
                onClick={loadData}
                disabled={isSyncing}
                className="cursor-pointer bg-transparent border-none text-[#5a5a40] hover:text-[#3e3e2b]"
                title="Force refresh database links"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              </button>
            </div>
            <h1 className="font-serif text-3xl font-black text-[#5a5a40] tracking-tight">Clinical Operations Ledger</h1>
            <p className="text-xs text-[#7a766f]">Manage appointments, records, SOAP diagnostic blueprints, and print custom medication prescriptions.</p>
          </div>
          
          <div className="flex items-center gap-2.5">
            <button 
              onClick={handleQuickWalkIn}
              className="cursor-pointer flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-mono text-[10px] uppercase font-bold px-3 py-2 rounded-xl transition-all border-none shadow-xs"
            >
              <Users className="w-3.5 h-3.5" />
              Quick Walk-In Queue
            </button>
            <button 
              onClick={() => setShowApptModal(true)}
              className="cursor-pointer flex items-center gap-1.5 bg-[#5a5a40] hover:bg-[#3e3e2b] text-white font-mono text-[10px] uppercase font-bold px-3 py-2 rounded-xl transition-all border-none shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              Schedule Appointment
            </button>
          </div>
        </div>
      </div>

      {/* Main Mode Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[#e3dec9] pb-3">
        {[
          { id: 'appointments', label: 'Appointments Book', icon: CalendarIcon },
          { id: 'soap', label: 'Clinical SOAP Notes', icon: FileText }
        ].map(tab => {
          const ActiveIcon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`cursor-pointer flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all border ${
                isActive 
                  ? 'bg-[#5a5a40] text-white border-[#5a5a40] border-b-[3px] border-b-[#3e3e2b]' 
                  : 'bg-white text-gray-600 border-[#e3dec9] border-b-[2px] border-b-[#cdc6ad] hover:bg-stone-50'
              }`}
            >
              <ActiveIcon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>


      {/* ─── TAB 2: APPOINTMENTS BOOK ──────────────────────────────── */}
      {activeTab === 'appointments' && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#fdfbf7] p-4 rounded-xl border border-[#e3dec9]">
            {/* View selectors */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#5a5a40] uppercase mr-2">Calendar Span:</span>
              {['daily', 'weekly', 'monthly'].map(mode => (
                <button
                  key={mode}
                  onClick={() => setCalendarView(mode as any)}
                  className={`cursor-pointer text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg border transition-all ${
                    calendarView === mode
                      ? 'bg-[#5a5a40] text-white border-[#5a5a40]'
                      : 'bg-white text-gray-600 border-gray-300 hover:bg-stone-50'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>

            {/* Time blocking */}
            <div className="flex items-center gap-2">
              <button 
                onClick={handleBlockTimeSlot}
                className="cursor-pointer text-[10px] font-bold uppercase border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 px-3 py-1.5 rounded-lg"
              >
                Block Hours Slot
              </button>
            </div>
          </div>

          {/* Table / Queue filters */}
          <div className="flex flex-wrap gap-x-4 gap-y-2 border-b border-[#e3dec9] pb-1.5">
            {[
              { id: 'list', label: 'Booked Schedule 📅' },
              { id: 'wait', label: 'Active Queue & Walk-ins ⚡' },
              { id: 'blocked', label: 'Time Blocks / Absences 🚫' },
              { id: 'completed', label: 'Completed ✅' },
              { id: 'cancelled', label: 'Cancelled ❌' },
              { id: 'noshow', label: 'No Shows 🔇' }
            ].map(sub => (
              <button
                key={sub.id}
                onClick={() => setSelectedSubTab(sub.id as any)}
                className={`cursor-pointer text-xs font-bold pb-2 px-1 transition-all ${
                  selectedSubTab === sub.id
                    ? 'border-b-2 border-[#5a5a40] text-gray-900 font-extrabold'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                {sub.label}
              </button>
            ))}
          </div>

          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search appointments, patients or contact name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-[#e3dec9] border-b-[2px] rounded-xl text-xs"
            />
          </div>

          <div className="bg-white border border-[#e3dec9] border-b-[4px] border-b-[#cdc6ad] rounded-2xl overflow-hidden">
            <div className="p-4 bg-[#fdfbf7] border-b border-[#e3dec9]">
              <h2 className="font-serif font-black text-sm text-[#5a5a40] uppercase tracking-wider">Active Bookings ledger for {calendarView} grid</h2>
            </div>
            
            {searchedAppointments.length === 0 ? (
              <div className="py-12 text-center text-gray-400 flex flex-col items-center justify-center gap-1">
                <CalendarIcon className="w-8 h-8 opacity-40 animate-pulse text-[#5a5a40]" />
                <p className="font-bold text-xs mt-2">No Appointments Found</p>
                <p className="text-[10px]">Verify your filters or schedule a new walk-in!</p>
              </div>
            ) : (
              <div className="divide-y divide-[#f4f1e9] overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-stone-50 text-[10px] text-gray-500 uppercase font-bold tracking-wider font-mono">
                      <th className="p-4">Time / Date</th>
                      <th className="p-4">Active Patient</th>
                      <th className="p-4">Assigned Vet</th>
                      <th className="p-4">Appointment Type</th>
                      <th className="p-4">Reminders</th>
                      <th className="p-4">Status & Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f4f1e9] text-xs">
                    {searchedAppointments.map(appt => (
                      <tr 
                        key={appt.id} 
                        className={`transition-all duration-300 ${
                          highlightedApptId === appt.id 
                            ? 'bg-amber-50/90 border-l-4 border-amber-500 font-bold' 
                            : 'hover:bg-amber-50/10'
                        }`}
                      >
                        <td className="p-4 font-mono">
                          <span className="block font-bold text-gray-900">{appt.time}</span>
                          <span className="text-[9px] text-gray-500">{appt.date}</span>
                        </td>
                        <td className="p-4">
                          {appt.isBlocked ? (
                            <span className="text-amber-800 font-bold flex items-center gap-1">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              {appt.blockedReason}
                            </span>
                          ) : (
                            <div>
                              <span className="block font-bold text-gray-900">{appt.patientName}</span>
                              <span className="block text-[10px] text-gray-600 font-medium">Owner: {appt.ownerName}</span>
                              <span className="text-[9px] text-gray-500 block font-mono">{appt.ownerPhone}</span>
                            </div>
                          )}
                        </td>
                        <td className="p-4 font-semibold text-gray-700">
                          {appt.isBlocked ? 'N/A' : appt.vetName}
                        </td>
                        <td className="p-4">
                          {!appt.isBlocked && (
                            <span className={`px-2 py-0.5 rounded-md font-mono text-[9px] uppercase font-bold text-white ${
                              appt.type === 'consultation' ? 'bg-[#5a5a40]' :
                              appt.type === 'surgery' ? 'bg-[#a0522d]' :
                              appt.type === 'emergency' ? 'bg-red-600 animate-pulse' :
                              'bg-[#cdc6ad] text-stone-900'
                            }`}>
                              {appt.type}
                            </span>
                          )}
                        </td>
                        <td className="p-4">
                          {!appt.isBlocked && (
                            <button
                              onClick={() => handleSendWhatsAppNotification(appt)}
                              className="cursor-pointer bg-emerald-50 text-emerald-800 hover:bg-emerald-100 font-mono text-[9px] font-bold px-2 py-1.5 rounded-lg border border-emerald-200 flex items-center gap-1"
                            >
                              <Phone className="w-3 h-3" />
                              WhatsApp
                            </button>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-1.5">
                            <select
                              value={appt.status}
                              onChange={(e) => updateApptStatus(appt.id, e.target.value)}
                              className="bg-white border border-[#e3dec9] rounded-lg p-1 text-[10px] font-bold"
                            >
                              <option value="Scheduled">Scheduled</option>
                              <option value="Checked In">Checked In</option>
                              <option value="In Progress">In Progress</option>
                              <option value="Completed">Completed</option>
                              <option value="No Show">No Show</option>
                              <option value="Cancelled">Cancelled</option>
                            </select>
                            
                            {/* Action to formulate Soap directly if Checked In / In Progress or Complete */}
                            {(appt.status === 'Checked In' || appt.status === 'In Progress') && (
                              <button
                                onClick={() => {
                                  setNewSoap({
                                    ...newSoap,
                                    patientName: appt.patientName,
                                    ownerName: appt.ownerName,
                                    ownerPhone: appt.ownerPhone
                                  });
                                  setShowSoapModal(true);
                                }}
                                className="cursor-pointer bg-[#5a5a40] hover:bg-[#3e3e2b] text-white p-1 rounded-lg"
                                title="Draft SOAP notes"
                              >
                                <FileText className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── TAB 3: CLINICAL SOAP RECORDS ──────────────────────────── */}
      {activeTab === 'soap' && (
        <div className="space-y-6">
          <div className="flex justify-end gap-2">
            <button
              onClick={() => {
                setNewSoap({
                  patientName: '',
                  ownerName: '',
                  ownerPhone: '',
                  date: new Date().toISOString().split('T')[0],
                  subjective: '',
                  objective: '',
                  assessment: '',
                  plan: '',
                  vetSignature: 'Dr. Sarah Alizai (L-' + Math.floor(1000 + Math.random() * 9000) + ')'
                });
                setShowSoapModal(true);
              }}
              className="cursor-pointer flex items-center gap-1.5 bg-[#5a5a40] hover:bg-[#3e3e2b] text-white font-mono text-[10px] uppercase font-bold px-3 py-2 rounded-xl border-none shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              Write SOAP Entry
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* List left pane */}
            <div className="bg-white border border-[#e3dec9] border-b-[4px] border-b-[#cdc6ad] rounded-2xl p-4 space-y-3 max-h-[70vh] overflow-y-auto">
              <h3 className="font-serif font-bold text-sm text-[#5a5a40] mb-2 border-b border-[#f4f1e9] pb-2">Historic SOAP Ledger</h3>
              {soaps.length === 0 ? (
                <p className="text-stone-400 text-xs text-center py-6">No clinical SOAP cards available yet.</p>
              ) : (
                soaps.map(r => (
                  <div
                    key={r.id}
                    onClick={() => setActiveSoap(r)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer text-left ${
                      activeSoap?.id === r.id 
                        ? 'bg-amber-50/20 border-[#a0522d]' 
                        : 'bg-stone-50 hover:bg-[#fdfbf7] border-gray-200'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-mono text-[9px] text-[#a0522d] font-bold">{r.id}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[9px] text-gray-500">{r.date}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteSoap(r.id, r.patientName);
                          }}
                          className="cursor-pointer p-1 text-gray-400 hover:text-rose-500 rounded hover:bg-rose-50 transition-all border-none"
                          title="Delete SOAP Ledger Entry"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <span className="block font-bold text-xs mt-1 text-gray-900">{r.patientName}</span>
                    <span className="block text-[10px] text-gray-600">Owner: {r.ownerName}</span>
                    {r.isLocked && (
                      <span className="text-[8px] uppercase font-bold text-red-600 font-mono mt-1 block">🔒 LOCKED (Integrity check)</span>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Read/Edit right panel - Refactored as digital clinical paper sheet */}
            <div className="bg-white border border-[#e3dec9] border-b-[4px] border-b-[#cdc6ad] rounded-2xl p-4 md:col-span-2 space-y-6">
              {activeSoap ? (() => {
                const linkedPresc = prescriptions.find(p => p.soapId === activeSoap.id || (p.patientName === activeSoap.patientName && p.date === activeSoap.date));
                return (
                  <div className="space-y-4">
                    {/* Action items above the paper */}
                    <div className="flex items-center justify-between border-b border-[#e3dec9] pb-3">
                      <span className="font-mono text-[9px] text-[#a0522d] font-bold bg-amber-100/60 px-2 py-0.5 rounded-md">LIVE CLINICAL LEDGER CASE FILE</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDeleteSoap(activeSoap.id, activeSoap.patientName)}
                          className="cursor-pointer bg-rose-50 hover:bg-rose-100 text-rose-700 py-1.5 px-3 rounded-xl text-xs font-bold border border-rose-200 flex items-center gap-1.5 transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete
                        </button>
                        <button
                          onClick={() => handleDownloadAsImage(activeSoap, linkedPresc || null)}
                          className="cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white py-1.5 px-3 rounded-xl text-xs font-bold border-none flex items-center gap-1.5 shadow-sm transition-all"
                        >
                          <Save className="w-3.5 h-3.5" />
                          Save & Export Record
                        </button>
                      </div>
                    </div>

                    {/* Physical Digital Paper Sheet Container - Sheet 1: SOAP */}
                    <div className="relative bg-[#fdfaf2] border-2 border-[#e6dfcc] rounded-xl p-8 shadow-md overflow-hidden font-serif text-[#3e3d36] min-h-[500px]">
                      {/* Retro watermark '℞' background element */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] select-none">
                        <span className="font-serif text-[320px] font-black text-[#5a5a40]">℞</span>
                      </div>

                      {/* Blue vertical margin line (typical of notepad stationery sheets) */}
                      <div className="absolute left-6 top-0 bottom-0 w-[1.5px] bg-[#f0a5a5]/70 pointer-events-none" />

                      {/* Official Medical Letterhead Block */}
                      <div className="border-b-2 border-[#5a5a40] pb-4 mb-6 ml-6 text-center relative">
                        <h2 className="text-[#5a5a40] font-black text-xl font-serif uppercase tracking-tight">{user.name || 'VetAxis Clinical Center'}</h2>
                        <p className="text-[10px] text-stone-600 font-mono italic">Licensed Diagnostic Laboratory & Surgery Registry</p>
                        <p className="text-[9px] font-mono text-stone-500 mt-1">ADDRESS: {user.address || 'CANTT PLAZA, PESHAWAR, PAKISTAN'} · PH: {user.phone || '091-522222'} · EMAIL: {user.email || 'CLINIC@VETAXIS.PK'}</p>
                      </div>

                      {/* Metadata block in typewriter aesthetics */}
                      <div className="ml-6 mb-6 bg-white/50 border border-[#e3dec9] rounded-lg p-3 grid grid-cols-2 gap-3 text-[11px] font-mono shadow-sm">
                        <div>
                          <span className="text-gray-500 block uppercase text-[8px] font-bold">Patient-Pet ID:</span>
                          <span className="font-bold text-gray-900">{activeSoap.patientName}</span>
                        </div>
                        <div>
                          <span className="text-gray-500 block uppercase text-[8px] font-bold">Owner Registrar:</span>
                          <span className="font-bold text-gray-950">{activeSoap.ownerName}</span>
                        </div>
                        <div>
                          <span className="text-gray-500 block uppercase text-[8px] font-bold">Date of Intake:</span>
                          <span className="text-gray-900">{activeSoap.date}</span>
                        </div>
                        <div>
                          <span className="text-gray-500 block uppercase text-[8px] font-bold">Ledger Card ID:</span>
                          <span className="font-bold text-[#a0522d]">{activeSoap.id}</span>
                        </div>
                      </div>

                      {/* Clinical SOAP Sections with beautiful serif typography & red highlights */}
                      <div className="ml-6 space-y-5 text-left">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 border-b border-[#ece6d2] pb-1">
                            <span className="bg-[#a0522d] text-white font-mono font-bold text-[9px] px-1.5 py-0.5 rounded">S</span>
                            <span className="font-mono text-[9px] font-extrabold uppercase text-[#a0522d] tracking-wider">Subjective Narrative Complaint</span>
                          </div>
                          <p className="text-[12px] font-serif leading-relaxed text-stone-800 whitespace-pre-wrap pl-6">{activeSoap.subjective}</p>
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center gap-2 border-b border-[#ece6d2] pb-1">
                            <span className="bg-emerald-800 text-white font-mono font-bold text-[9px] px-1.5 py-0.5 rounded">O</span>
                            <span className="font-mono text-[9px] font-extrabold uppercase text-emerald-800 tracking-wider">Objective Examination / Vitals</span>
                          </div>
                          <p className="text-[12px] font-serif leading-relaxed text-stone-800 whitespace-pre-wrap pl-6">{activeSoap.objective}</p>
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center gap-2 border-b border-[#ece6d2] pb-1">
                            <span className="bg-[#5a5a40] text-white font-mono font-bold text-[9px] px-1.5 py-0.5 rounded">A</span>
                            <span className="font-mono text-[9px] font-extrabold uppercase text-[#5a5a40] tracking-wider">Clinical Assessment & Working Diagnosis</span>
                          </div>
                          <p className="text-[12px] font-serif font-black leading-relaxed text-stone-900 whitespace-pre-wrap pl-6 bg-[#f7f3e8]/40 py-1 rounded">{activeSoap.assessment}</p>
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center gap-2 border-b border-[#ece6d2] pb-1">
                            <span className="bg-blue-900 text-white font-mono font-bold text-[9px] px-1.5 py-0.5 rounded">P</span>
                            <span className="font-mono text-[9px] font-extrabold uppercase text-blue-900 tracking-wider">Management Plan & Outpatient Orders</span>
                          </div>
                          <p className="text-[12px] font-serif leading-relaxed text-stone-800 whitespace-pre-wrap pl-6">{activeSoap.plan}</p>
                        </div>
                      </div>

                      {/* Official Stamp & Sign Off at bottom */}
                      <div className="ml-6 mt-8 pt-6 border-t border-[#ece6d2] flex justify-between items-end">
                        <div className="text-left">
                          <p className="font-mono text-[8px] uppercase text-stone-400">Security Signature Licence</p>
                          <div className="text-[#2b3c73] font-serif italic text-xs font-bold font-display mt-1 bg-blue-50/50 border border-blue-200/50 rounded px-2.5 py-1.5 inline-block">
                            🖋️ {activeSoap.vetSignature}
                            <span className="block text-[8px] font-mono font-normal opacity-70 mt-0.5 text-blue-800">Verified Professional Ledger Session</span>
                          </div>
                        </div>

                        <div>
                          {activeSoap.isLocked ? (
                            <div className="border-2 border-red-600 rounded-lg p-1.5 text-center transform rotate-[-3deg] inline-block shadow-xs bg-red-50/20">
                              <span className="block text-[8px] font-mono uppercase font-black tracking-tight text-red-600">OFFICIALLY REGISTERED</span>
                              <span className="block text-[7px] font-mono uppercase font-medium text-red-600">LOCKED CASE CARD</span>
                            </div>
                          ) : (
                            <div className="text-right space-y-1.5">
                              <span className="block font-mono text-[8px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded uppercase font-bold">✓ DRAFT ACTIVE</span>
                              <button
                                type="button"
                                onClick={() => handleLockSoapRecord(activeSoap.id)}
                                className="cursor-pointer bg-red-600 hover:bg-red-700 text-white font-mono text-[9px] uppercase font-bold py-1 px-2.5 rounded-lg border-none shadow transition-all"
                              >
                                🔒 LOCK NOW
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Physical Digital Paper Sheet Container - Sheet 2: Rx Prescription Pad */}
                    {linkedPresc ? (
                      <div className="relative bg-[#fdfcf7] border-2 border-[#e3dec9] rounded-xl p-8 shadow-md overflow-hidden font-serif text-[#3e3d36] min-h-[350px] transition-all">
                        {/* Retro watermark '℞' background element */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.04] select-none">
                          <span className="font-serif text-[280px] font-black text-rose-800">℞</span>
                        </div>

                        {/* Red pad left margin line */}
                        <div className="absolute left-6 top-0 bottom-0 w-[1.5px] bg-rose-400/40 pointer-events-none" />

                        {/* Official Stamp header */}
                        <div className="border-b-2 border-stone-800 pb-3 mb-4 ml-6 text-center">
                          <h3 className="text-stone-900 font-serif font-black text-lg uppercase tracking-tight">℞ Official Clinician Medication Orders</h3>
                          <p className="text-[10px] text-stone-500 font-mono">Patient Weight: {linkedPresc.weightKg} kg · Record Linked to Case File</p>
                        </div>

                        {/* Prescription lists */}
                        <div className="ml-6 space-y-4">
                          {linkedPresc.drugs.map((d, dIdx) => (
                            <div key={dIdx} className="border-b border-dashed border-[#ece6d2] pb-2 text-left space-y-1">
                              <span className="font-bold text-sm text-stone-900">
                                {dIdx + 1}. {d.name} {d.brandName ? `(${d.brandName})` : ''}
                              </span>
                              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-[#5a5a40]">
                                <div><span className="text-gray-400 text-[8px] font-bold block">DOSAGE:</span><strong>{d.dosage}</strong></div>
                                <div><span className="text-gray-400 text-[8px] font-bold block">SCHEDULE:</span><i>{d.instructions}</i></div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Sign stamp */}
                        <div className="ml-6 mt-6 pt-4 border-t border-stone-200 flex justify-between items-end">
                          <div className="text-left font-mono text-[9px] text-[#5a5a40] uppercase">
                            <span>Dispensing: {linkedPresc.dispensedFromStock ? 'IN-CLINIC CORE STOCK' : 'OUTPATIENT SOURCE'}</span>
                          </div>
                          <div className="text-[#be184a] font-serif italic text-xs font-bold border border-rose-200 rounded-lg px-2.5 py-1 bg-rose-50/40">
                            🖋️ {linkedPresc.vetSignature || activeSoap.vetSignature}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 bg-amber-50/20 border-2 border-dashed border-[#e3dec9] rounded-xl flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="text-left space-y-1 ml-4">
                          <span className="font-serif font-black text-sm text-[#5a5a40] block">Attached Digital Prescription (Rx)</span>
                          <p className="text-[10.5px] text-stone-500 font-serif">There is no prescription sheet linked to this diagnostics record yet. You can attach a prescription to this SOAP record directly.</p>
                        </div>
                        <button
                          onClick={() => {
                            setPrescriptionForm({
                              patientName: activeSoap.patientName,
                              ownerName: activeSoap.ownerName,
                              ownerPhone: activeSoap.ownerPhone,
                              weightKg: 5,
                              drugs: [{ name: '', brandName: '', isGeneric: true, dosage: '', instructions: '' }],
                              dispensedFromStock: true,
                              vetSignature: activeSoap.vetSignature
                            });
                            setIncludePrescription(true);
                            setNewSoap(activeSoap);
                            setShowSoapModal(true);
                          }}
                          className="cursor-pointer bg-[#5a5a40] hover:bg-[#3e3e2b] text-white py-2 px-4 rounded-xl text-xs font-bold uppercase font-mono border-none whitespace-nowrap"
                        >
                          + Link Prescription
                        </button>
                      </div>
                    )}
                  </div>
                );
              })() : (
                <div className="py-24 text-center text-gray-400 space-y-2">
                  <FileText className="w-12 h-12 mx-auto opacity-30 text-[#5a5a40]" />
                  <p className="font-bold text-xs">Select a SOAP ledger from the history</p>
                  <p className="text-[10px]">Select a record on the left to review diagnostic details, digital signatures, and export options in digital clinical paper format.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}



      {/* ─────────────────── MODALS & DIALOGS ───────────────────── */}

      {/* 1. Modal: Schedule Appointment */}
      <AnimatePresence>
        {showApptModal && (
          <div className="fixed inset-0 bg-black/45 backdrop-blur-xs z-[500] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#fcf9f2] w-full max-w-lg rounded-3xl border border-[#e3dec9] border-b-[6px] border-b-[#cdc6ad] shadow-2xl p-6 text-left space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center border-b border-[#e3dec9] pb-3">
                <h3 className="font-serif text-lg font-black text-[#5a5a40]">Schedule Clinic Appointment</h3>
                <button onClick={() => setShowApptModal(false)} className="cursor-pointer p-1 rounded-full border border-[#e3dec9] bg-white"><X className="w-4 h-4" /></button>
              </div>

              <form onSubmit={handleCreateAppointment} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="font-bold text-gray-700">Patient Pet Name & Species</label>
                    <input type="text" placeholder="e.g. Bruno (Labrador Puppy)" required value={newAppt.patientName} onChange={(e) => setNewAppt({...newAppt, patientName: e.target.value})} className="w-full bg-white border border-[#e3dec9] p-2 rounded-xl" />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-gray-700">Owner Full Name</label>
                    <input type="text" placeholder="e.g. Zainab Ahmed" required value={newAppt.ownerName} onChange={(e) => setNewAppt({...newAppt, ownerName: e.target.value})} className="w-full bg-white border border-[#e3dec9] p-2 rounded-xl" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="font-bold text-gray-700">Owner Contact (Phone/WhatsApp)</label>
                    <input type="text" placeholder="e.g. 03001234567" value={newAppt.ownerPhone} onChange={(e) => setNewAppt({...newAppt, ownerPhone: e.target.value})} className="w-full bg-white border border-[#e3dec9] p-2 rounded-xl" />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-gray-700">Appointment Type</label>
                    <select value={newAppt.type} onChange={(e) => setNewAppt({...newAppt, type: e.target.value as any})} className="w-full bg-white border border-[#e3dec9] p-2 rounded-xl">
                      <option value="consultation">Consultation</option>
                      <option value="surgery">Surgery</option>
                      <option value="grooming">Grooming</option>
                      <option value="vaccination">Vaccination</option>
                      <option value="follow-up">Follow-up</option>
                      <option value="emergency">Emergency</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="font-bold text-gray-700">Appointment Date</label>
                    <input type="date" value={newAppt.date} onChange={(e) => setNewAppt({...newAppt, date: e.target.value})} className="w-full bg-white border border-[#e3dec9] p-2 rounded-xl" />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-gray-700">Appointment Time Block</label>
                    <input type="time" value={newAppt.time} onChange={(e) => setNewAppt({...newAppt, time: e.target.value})} className="w-full bg-white border border-[#e3dec9] p-2 rounded-xl" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="font-bold text-gray-700">Assigned Doctor</label>
                    <select value={newAppt.vetName} onChange={(e) => setNewAppt({...newAppt, vetName: e.target.value})} className="w-full bg-white border border-[#e3dec9] p-2 rounded-xl">
                      <option value="Dr. Sarah Alizai">Dr. Sarah Alizai</option>
                      <option value="Dr. Faisal Shah">Dr. Faisal Shah</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-gray-700">Recurring Treatments</label>
                    <select value={newAppt.recurrencePattern} onChange={(e) => setNewAppt({...newAppt, recurrencePattern: e.target.value as any, isRecurring: e.target.value !== 'None'})} className="w-full bg-white border border-[#e3dec9] p-2 rounded-xl">
                      <option value="None">Non-Recurring</option>
                      <option value="Daily">Daily Follow-ups</option>
                      <option value="Weekly">Weekly Dressing</option>
                      <option value="Monthly">Monthly Vaccinations</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="font-bold text-gray-700">Appointment Status</label>
                    <select value={newAppt.status} onChange={(e) => setNewAppt({...newAppt, status: e.target.value as any})} className="w-full bg-white border border-[#e3dec9] p-2 rounded-xl text-[#5a5a40] font-bold">
                      <option value="Scheduled">Scheduled</option>
                      <option value="Checked In">Checked In</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Completed">Completed</option>
                      <option value="No Show">No Show</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </div>
                  <div className="space-y-1 flex flex-col justify-end">
                    <div className="flex items-center gap-2 p-1.5 pt-4">
                      <input type="checkbox" id="is_blocked_appt" checked={!!newAppt.isBlocked} onChange={(e) => setNewAppt({...newAppt, isBlocked: e.target.checked, patientName: e.target.checked ? '⚠️ BLOCKED SLOT' : (newAppt.patientName === '⚠️ BLOCKED SLOT' ? '' : newAppt.patientName)})} className="w-4 h-4 text-[#5a5a40]" />
                      <label htmlFor="is_blocked_appt" className="font-bold text-gray-700 cursor-pointer">Block this slot (lunch/meetings)</label>
                    </div>
                  </div>
                </div>

                {newAppt.isBlocked && (
                  <div className="space-y-1">
                    <label className="font-bold text-gray-700">System Blocked Reason</label>
                    <input type="text" placeholder="e.g. Staff Lunch break, Clinical meeting" value={newAppt.blockedReason || ''} onChange={(e) => setNewAppt({...newAppt, blockedReason: e.target.value})} className="w-full bg-stone-50 border border-[#e3dec9] p-2 rounded-xl" />
                  </div>
                )}

                <div className="space-y-1">
                  <label className="font-bold text-gray-700">Booking Context / Symptoms notes</label>
                  <textarea placeholder="Write any pre-consultation notes here..." value={newAppt.notes} onChange={(e) => setNewAppt({...newAppt, notes: e.target.value})} className="w-full bg-white border border-[#e3dec9] p-2 rounded-xl h-20" />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t">
                  <button type="button" onClick={() => setShowApptModal(false)} className="cursor-pointer bg-neutral-100 hover:bg-neutral-200 text-gray-700 px-4 py-2 rounded-xl font-bold border-none">Cancel</button>
                  <button type="submit" className="cursor-pointer bg-[#5a5a40] hover:bg-[#3e3e2b] text-white px-5 py-2 rounded-xl font-bold border-none">Confirm Appointment</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2. Modal: Create SOAP Note */}
      <AnimatePresence>
        {showSoapModal && (
          <div className="fixed inset-0 bg-black/45 backdrop-blur-xs z-[500] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#fcf9f2] w-full max-w-3xl rounded-3xl border border-[#e3dec9] border-b-[6px] border-b-[#cdc6ad] shadow-2xl p-6 text-left space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center border-b border-[#e3dec9] pb-3">
                <div className="text-left">
                  <h3 className="font-serif text-lg font-black text-[#5a5a40]">Unified Clinical Case & Prescription Workbench</h3>
                  <p className="text-[10px] text-stone-500">Record physical SOAP diagnostics and dispatch Rx prescriptions in one unified platform.</p>
                </div>
                <button onClick={() => setShowSoapModal(false)} className="cursor-pointer p-1 rounded-full border border-[#e3dec9] bg-white"><X className="w-4 h-4" /></button>
              </div>

              {/* Template shortcuts */}
              <div className="flex items-center gap-2 p-2 bg-stone-50 rounded-xl border">
                <span className="text-[10px] font-bold text-gray-500 uppercase font-mono">Fill Preset Diagnostics Template:</span>
                <button type="button" onClick={() => applySoapTemplate('vaccine')} className="cursor-pointer text-[10px] font-bold bg-white border hover:bg-stone-100 p-1 px-2 rounded-lg">Core Vaccine Inoculation</button>
                <button type="button" onClick={() => applySoapTemplate('flea')} className="cursor-pointer text-[10px] font-bold bg-white border hover:bg-stone-100 p-1 px-2 rounded-lg">Flea Dermatitis</button>
                <button type="button" onClick={() => applySoapTemplate('spay')} className="cursor-pointer text-[10px] font-bold bg-white border hover:bg-stone-100 p-1 px-2 rounded-lg">Ovariohysterectomy Spay</button>
              </div>

              <form onSubmit={handleCreateSoap} className="space-y-4 text-xs">
                {/* Patient basics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="font-bold text-gray-700">Patient Pet Title</label>
                    <input type="text" placeholder="e.g. Sheru" required value={newSoap.patientName} onChange={(e) => setNewSoap({...newSoap, patientName: e.target.value})} className="w-full bg-white border border-[#e3dec9] p-2 rounded-xl" />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-gray-700">Species</label>
                    <input type="text" placeholder="e.g. Canine / Feline / Goat" required value={newSoap.species || ''} onChange={(e) => setNewSoap({...newSoap, species: e.target.value})} className="w-full bg-white border border-[#e3dec9] p-2 rounded-xl" />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-gray-700">Owner Full Name</label>
                    <input type="text" placeholder="e.g. Zainab Ahmed" required value={newSoap.ownerName} onChange={(e) => setNewSoap({...newSoap, ownerName: e.target.value})} className="w-full bg-white border border-[#e3dec9] p-2 rounded-xl" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="font-bold text-gray-700">Contact Number</label>
                    <input type="text" placeholder="e.g. 03001234567" value={newSoap.ownerPhone} onChange={(e) => setNewSoap({...newSoap, ownerPhone: e.target.value})} className="w-full bg-white border border-[#e3dec9] p-2 rounded-xl" />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-gray-700">Consultation Date</label>
                    <input type="date" value={newSoap.date} onChange={(e) => setNewSoap({...newSoap, date: e.target.value})} className="w-full bg-white border border-[#e3dec9] p-2 rounded-xl" />
                  </div>
                </div>

                {/* S - Subjective */}
                <div className="space-y-1">
                  <label className="font-bold text-[#a0522d]">S - Subjective Case Complaint (Owner complaints & duration)</label>
                  <textarea required placeholder="Write case history down..." value={newSoap.subjective} onChange={(e) => setNewSoap({...newSoap, subjective: e.target.value})} className="w-full bg-white border border-[#e3dec9] p-2 rounded-xl h-20" />
                </div>

                {/* O - Objective & Interactive Vitals checklist */}
                <div className="space-y-2 border border-[#e3dec9] bg-white rounded-2xl p-4">
                  <span className="font-serif font-bold text-xs text-[#065f46] block border-b pb-1.5 mb-2">O - Objective Physical Vitals Checklist (Tick to automatically write)</span>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {/* Temperature */}
                    <div className="p-2 border rounded-xl bg-stone-50/50 flex flex-col gap-1 text-[10px]">
                      <div className="flex items-center gap-1.5 font-bold text-gray-700">
                        <input type="checkbox" checked={vitalsEnabled.temp} onChange={(e) => setVitalsEnabled({...vitalsEnabled, temp: e.target.checked})} className="w-3.5 h-3.5" />
                        <span>Temperature</span>
                      </div>
                      <input 
                        type="text" 
                        value={vitalsValues.temp} 
                        onChange={(e) => {
                          setVitalsValues({...vitalsValues, temp: e.target.value});
                          setVitalsEnabled({...vitalsEnabled, temp: true});
                        }} 
                        className="w-full bg-white border p-1 rounded-lg text-[9px] mt-1 font-mono focus:ring-1 focus:ring-emerald-500" 
                      />
                      <select 
                        value="" 
                        onChange={(e) => {
                          if (e.target.value) {
                            setVitalsValues({...vitalsValues, temp: e.target.value});
                            setVitalsEnabled({...vitalsEnabled, temp: true});
                          }
                        }} 
                        className="w-full bg-stone-100/50 border p-1 rounded-lg text-[8px] mt-1 text-gray-600 cursor-pointer"
                      >
                        <option value="">-- Apply Quick Preset --</option>
                        <option value="38.5 °C (Normal)">38.5 °C (Normal)</option>
                        <option value="39.6 °C (High Fever)">39.6 °C (High Fever)</option>
                        <option value="36.8 °C (Subnormal/Low)">36.8 °C (Subnormal/Low)</option>
                      </select>
                    </div>

                    {/* Heart Rate */}
                    <div className="p-2 border rounded-xl bg-stone-50/50 flex flex-col gap-1 text-[10px]">
                      <div className="flex items-center gap-1.5 font-bold text-gray-700">
                        <input type="checkbox" checked={vitalsEnabled.hr} onChange={(e) => setVitalsEnabled({...vitalsEnabled, hr: e.target.checked})} className="w-3.5 h-3.5" />
                        <span>Heart Rate / HR</span>
                      </div>
                      <input 
                        type="text" 
                        value={vitalsValues.hr} 
                        onChange={(e) => {
                          setVitalsValues({...vitalsValues, hr: e.target.value});
                          setVitalsEnabled({...vitalsEnabled, hr: true});
                        }} 
                        className="w-full bg-white border p-1 rounded-lg text-[9px] mt-1 font-mono focus:ring-1 focus:ring-emerald-500" 
                      />
                      <select 
                        value="" 
                        onChange={(e) => {
                          if (e.target.value) {
                            setVitalsValues({...vitalsValues, hr: e.target.value});
                            setVitalsEnabled({...vitalsEnabled, hr: true});
                          }
                        }} 
                        className="w-full bg-stone-100/50 border p-1 rounded-lg text-[8px] mt-1 text-gray-600 cursor-pointer"
                      >
                        <option value="">-- Apply Quick Preset --</option>
                        <option value="90 bpm (Normal)">90 bpm (Normal)</option>
                        <option value="145 bpm (Elevated/High)">145 bpm (Elevated/High)</option>
                        <option value="60 bpm (Low/Bradycardia)">60 bpm (Low/Bradycardia)</option>
                      </select>
                    </div>

                    {/* Resp Rate */}
                    <div className="p-2 border rounded-xl bg-stone-50/50 flex flex-col gap-1 text-[10px]">
                      <div className="flex items-center gap-1.5 font-bold text-gray-700">
                        <input type="checkbox" checked={vitalsEnabled.rr} onChange={(e) => setVitalsEnabled({...vitalsEnabled, rr: e.target.checked})} className="w-3.5 h-3.5" />
                        <span>Respiratory Rate</span>
                      </div>
                      <input 
                        type="text" 
                        value={vitalsValues.rr} 
                        onChange={(e) => {
                          setVitalsValues({...vitalsValues, rr: e.target.value});
                          setVitalsEnabled({...vitalsEnabled, rr: true});
                        }} 
                        className="w-full bg-white border p-1 rounded-lg text-[9px] mt-1 font-mono focus:ring-1 focus:ring-emerald-500" 
                      />
                      <select 
                        value="" 
                        onChange={(e) => {
                          if (e.target.value) {
                            setVitalsValues({...vitalsValues, rr: e.target.value});
                            setVitalsEnabled({...vitalsEnabled, rr: true});
                          }
                        }} 
                        className="w-full bg-stone-100/50 border p-1 rounded-lg text-[8px] mt-1 text-gray-600 cursor-pointer"
                      >
                        <option value="">-- Apply Quick Preset --</option>
                        <option value="24 bpm (Normal)">24 bpm (Normal)</option>
                        <option value="46 bpm (Tachypnea)">46 bpm (Tachypnea)</option>
                        <option value="15 bpm (Bradypnea)">15 bpm (Bradypnea)</option>
                      </select>
                    </div>

                    {/* Mucous Membranes */}
                    <div className="p-2 border rounded-xl bg-stone-50/50 flex flex-col gap-1 text-[10px]">
                      <div className="flex items-center gap-1.5 font-bold text-gray-700">
                        <input type="checkbox" checked={vitalsEnabled.mm} onChange={(e) => setVitalsEnabled({...vitalsEnabled, mm: e.target.checked})} className="w-3.5 h-3.5" />
                        <span>Mucous Membranes</span>
                      </div>
                      <input 
                        type="text" 
                        value={vitalsValues.mm} 
                        onChange={(e) => {
                          setVitalsValues({...vitalsValues, mm: e.target.value});
                          setVitalsEnabled({...vitalsEnabled, mm: true});
                        }} 
                        className="w-full bg-white border p-1 rounded-lg text-[9px] mt-1 font-mono focus:ring-1 focus:ring-emerald-500" 
                      />
                      <select 
                        value="" 
                        onChange={(e) => {
                          if (e.target.value) {
                            setVitalsValues({...vitalsValues, mm: e.target.value});
                            setVitalsEnabled({...vitalsEnabled, mm: true});
                          }
                        }} 
                        className="w-full bg-stone-100/50 border p-1 rounded-lg text-[8px] mt-1 text-gray-600 cursor-pointer"
                      >
                        <option value="">-- Apply Quick Preset --</option>
                        <option value="Pink & Moist">Pink & Moist</option>
                        <option value="Pale / Anemic">Pale / Anemic</option>
                        <option value="Cyanotic (Blue)">Cyanotic (Blue)</option>
                        <option value="Icteric (Yellow)">Icteric (Yellow)</option>
                      </select>
                    </div>

                    {/* CRT */}
                    <div className="p-2 border rounded-xl bg-stone-50/50 flex flex-col gap-1 text-[10px]">
                      <div className="flex items-center gap-1.5 font-bold text-gray-700">
                        <input type="checkbox" checked={vitalsEnabled.crt} onChange={(e) => setVitalsEnabled({...vitalsEnabled, crt: e.target.checked})} className="w-3.5 h-3.5" />
                        <span>CRT (Capillary Refill)</span>
                      </div>
                      <input 
                        type="text" 
                        value={vitalsValues.crt} 
                        onChange={(e) => {
                          setVitalsValues({...vitalsValues, crt: e.target.value});
                          setVitalsEnabled({...vitalsEnabled, crt: true});
                        }} 
                        className="w-full bg-white border p-1 rounded-lg text-[9px] mt-1 font-mono focus:ring-1 focus:ring-emerald-500" 
                      />
                      <select 
                        value="" 
                        onChange={(e) => {
                          if (e.target.value) {
                            setVitalsValues({...vitalsValues, crt: e.target.value});
                            setVitalsEnabled({...vitalsEnabled, crt: true});
                          }
                        }} 
                        className="w-full bg-stone-100/50 border p-1 rounded-lg text-[8px] mt-1 text-gray-600 cursor-pointer"
                      >
                        <option value="">-- Apply Quick Preset --</option>
                        <option value="< 2 seconds (Normal)">&lt; 2 seconds (Normal)</option>
                        <option value="Delayed (3+ seconds)">Delayed (3+ seconds)</option>
                      </select>
                    </div>

                    {/* Palpation */}
                    <div className="p-2 border rounded-xl bg-stone-50/50 flex flex-col gap-1 text-[10px]">
                      <div className="flex items-center gap-1.5 font-bold text-gray-700">
                        <input type="checkbox" checked={vitalsEnabled.palpation} onChange={(e) => setVitalsEnabled({...vitalsEnabled, palpation: e.target.checked})} className="w-3.5 h-3.5" />
                        <span>Abdomen Palpation</span>
                      </div>
                      <input 
                        type="text" 
                        value={vitalsValues.palpation} 
                        onChange={(e) => {
                          setVitalsValues({...vitalsValues, palpation: e.target.value});
                          setVitalsEnabled({...vitalsEnabled, palpation: true});
                        }} 
                        className="w-full bg-white border p-1 rounded-lg text-[9px] mt-1 font-mono focus:ring-1 focus:ring-emerald-500" 
                      />
                      <select 
                        value="" 
                        onChange={(e) => {
                          if (e.target.value) {
                            setVitalsValues({...vitalsValues, palpation: e.target.value});
                            setVitalsEnabled({...vitalsEnabled, palpation: true});
                          }
                        }} 
                        className="w-full bg-stone-100/50 border p-1 rounded-lg text-[8px] mt-1 text-gray-600 cursor-pointer"
                      >
                        <option value="">-- Apply Quick Preset --</option>
                        <option value="Soft, Non-painful">Soft, Non-painful</option>
                        <option value="Tense & Painful">Tense & Painful</option>
                        <option value="Gaseous distension flex">Gaseous distension</option>
                      </select>
                    </div>

                    {/* Hydration */}
                    <div className="p-2 border rounded-xl bg-stone-50/50 flex flex-col gap-1 text-[10px]">
                      <div className="flex items-center gap-1.5 font-bold text-gray-700">
                        <input type="checkbox" checked={vitalsEnabled.hydration} onChange={(e) => setVitalsEnabled({...vitalsEnabled, hydration: e.target.checked})} className="w-3.5 h-3.5" />
                        <span>Hydration Status</span>
                      </div>
                      <input 
                        type="text" 
                        value={vitalsValues.hydration} 
                        onChange={(e) => {
                          setVitalsValues({...vitalsValues, hydration: e.target.value});
                          setVitalsEnabled({...vitalsEnabled, hydration: true});
                        }} 
                        className="w-full bg-white border p-1 rounded-lg text-[9px] mt-1 font-mono focus:ring-1 focus:ring-emerald-500" 
                      />
                      <select 
                        value="" 
                        onChange={(e) => {
                          if (e.target.value) {
                            setVitalsValues({...vitalsValues, hydration: e.target.value});
                            setVitalsEnabled({...vitalsEnabled, hydration: true});
                          }
                        }} 
                        className="w-full bg-stone-100/50 border p-1 rounded-lg text-[8px] mt-1 text-gray-600 cursor-pointer"
                      >
                        <option value="">-- Apply Quick Preset --</option>
                        <option value="Normal/Hydrated">Normal/Hydrated</option>
                        <option value="Mildly dehydrated (5-6%)">Mildly dehydrated (5-6%)</option>
                        <option value="Severely dehydrated (8%+)">Severely dehydrated (8%+)</option>
                      </select>
                    </div>

                    {/* BCS */}
                    <div className="p-2 border rounded-xl bg-stone-50/50 flex flex-col gap-1 text-[10px]">
                      <div className="flex items-center gap-1.5 font-bold text-gray-700">
                        <input type="checkbox" checked={vitalsEnabled.bcs} onChange={(e) => setVitalsEnabled({...vitalsEnabled, bcs: e.target.checked})} className="w-3.5 h-3.5" />
                        <span>Body Condition (BCS)</span>
                      </div>
                      <input 
                        type="text" 
                        value={vitalsValues.bcs} 
                        onChange={(e) => {
                          setVitalsValues({...vitalsValues, bcs: e.target.value});
                          setVitalsEnabled({...vitalsEnabled, bcs: true});
                        }} 
                        className="w-full bg-white border p-1 rounded-lg text-[9px] mt-1 font-mono focus:ring-1 focus:ring-emerald-500" 
                      />
                      <select 
                        value="" 
                        onChange={(e) => {
                          if (e.target.value) {
                            setVitalsValues({...vitalsValues, bcs: e.target.value});
                            setVitalsEnabled({...vitalsEnabled, bcs: true});
                          }
                        }} 
                        className="w-full bg-stone-100/50 border p-1 rounded-lg text-[8px] mt-1 text-gray-600 cursor-pointer"
                      >
                        <option value="">-- Apply Quick Preset --</option>
                        <option value="5/9 (Ideal weight)">5/9 (Ideal weight)</option>
                        <option value="3/9 (Underweight)">3/9 (Underweight)</option>
                        <option value="7/9 (Overweight)">7/9 (Overweight)</option>
                      </select>
                    </div>
                  </div>

                  {/* Generated Objective preview display block */}
                  <div className="bg-emerald-50/30 border border-[#e3dec9] rounded-xl p-3 text-[10px] space-y-1">
                    <span className="font-bold text-emerald-800 uppercase font-mono block">Compiled Auto-Generated Objective:</span>
                    <p className="font-mono text-stone-600 bg-white p-2 rounded border">{newSoap.objective || 'No vitals checked above. Text will compile when checked.'}</p>
                  </div>

                  {/* Optional Custom User Objective Writing Text Area */}
                  <div className="space-y-1 mt-2">
                    <label className="font-bold text-[#065f46]">Write Optional / Additional Objective Findings (Custom Text)</label>
                    <textarea placeholder="e.g. Heart auscultation reveals clear rhythms, clear lungs bilaterally, clear ocular/aural status..." value={customObjectiveText} onChange={(e) => setCustomObjectiveText(e.target.value)} className="w-full bg-white border border-[#e3dec9] p-2 rounded-xl h-20" />
                  </div>
                </div>

                {/* A - Assessment */}
                <div className="space-y-1">
                  <label className="font-bold text-[#5a5a40]">A - Assessment & Impression (Differential & Working diagnosis)</label>
                  <textarea required placeholder="Write diagnosis impression..." value={newSoap.assessment} onChange={(e) => setNewSoap({...newSoap, assessment: e.target.value})} className="w-full bg-white border border-[#e3dec9] p-2 rounded-xl h-20" />
                </div>

                {/* P - Plan */}
                <div className="space-y-1">
                  <label className="font-bold text-blue-900">P - Clinical Plan (Procedures, follow-up timelines)</label>
                  <textarea required placeholder="Write action plan..." value={newSoap.plan} onChange={(e) => setNewSoap({...newSoap, plan: e.target.value})} className="w-full bg-white border border-[#e3dec9] p-2 rounded-xl h-20" />
                </div>

                {/* MERGING DIGITAL PRESCRIPTION FLOW */}
                <div className="border-t border-[#e3dec9] pt-4 mt-4 space-y-4">
                  <div className="flex items-center gap-3 p-3.5 bg-amber-50/40 border border-[#e3dec9] rounded-2xl">
                    <input
                      type="checkbox"
                      id="enable_rx_section_soap"
                      checked={includePrescription}
                      onChange={(e) => setIncludePrescription(e.target.checked)}
                      className="w-5 h-5 accent-[#5a5a40] cursor-pointer"
                    />
                    <div>
                      <label htmlFor="enable_rx_section_soap" className="font-serif font-bold text-xs text-[#5a5a40] block cursor-pointer">💊 Merge Digital Prescription (Rx)</label>
                      <span className="text-[10px] text-stone-500 block">Check this box to prepare medication prescriptions alongside this diagnostic visit card.</span>
                    </div>
                  </div>

                  {includePrescription && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 bg-white border border-[#e3dec9] rounded-2xl space-y-4 shadow-sm"
                    >
                      <div className="grid grid-cols-1 gap-4">
                        <div className="space-y-1">
                          <label className="font-bold text-stone-700">Patient Weight (Kg) <span className="text-red-500">*</span></label>
                          <input type="number" step="0.1" min="0.1" required={includePrescription} placeholder="e.g. 12.4" value={prescriptionForm.weightKg} onChange={(e) => setPrescriptionForm({...prescriptionForm, weightKg: parseFloat(e.target.value) || 0})} className="w-full bg-stone-50 border border-[#e3dec9] p-2 rounded-xl font-bold font-mono text-stone-800" />
                        </div>
                      </div>

                      {/* Interactive Prescription drug listing */}
                      <div className="flex justify-between items-center border-b pb-1.5 pt-2">
                        <span className="font-mono text-[10px] uppercase font-bold text-[#5a5a40]">Active Rx Prescribed Drugs</span>
                        <button type="button" onClick={() => {
                          setPrescriptionForm({
                            ...prescriptionForm,
                            drugs: [...prescriptionForm.drugs, { name: '', brandName: '', isGeneric: true, dosage: '', instructions: '' }]
                          });
                        }} className="cursor-pointer font-mono text-[9px] uppercase font-bold bg-[#5a5a40] hover:bg-[#3e3e2b] text-white px-2 py-1 rounded-lg border-none flex items-center gap-1">
                          + Add Drug Row
                        </button>
                      </div>

                      <div className="space-y-3">
                        {prescriptionForm.drugs.map((d, index) => (
                          <div key={index} className="p-3 bg-stone-50 border rounded-xl space-y-2 relative">
                            {prescriptionForm.drugs.length > 1 && (
                              <button type="button" onClick={() => {
                                const list = [...prescriptionForm.drugs];
                                list.splice(index, 1);
                                setPrescriptionForm({...prescriptionForm, drugs: list});
                              }} className="cursor-pointer absolute top-2 right-2 text-red-600 bg-transparent border-none p-1">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <label className="font-bold text-stone-700">Medication Name</label>
                                <input type="text" placeholder="e.g. Meloxicam liquid 1.5mg/ml" required={includePrescription} value={d.name} onChange={(e) => {
                                  const updated = [...prescriptionForm.drugs];
                                  updated[index].name = e.target.value;
                                  setPrescriptionForm({...prescriptionForm, drugs: updated});
                                }} className="w-full bg-white border border-[#e3dec9] p-2 rounded-xl" />
                              </div>

                              <div className="space-y-1">
                                <label className="font-bold text-stone-700">Dosage details (mg/ml/vials)</label>
                                <input type="text" placeholder="e.g. 1.25 ml oral suspension" value={d.dosage} onChange={(e) => {
                                  const updated = [...prescriptionForm.drugs];
                                  updated[index].dosage = e.target.value;
                                  setPrescriptionForm({...prescriptionForm, drugs: updated});
                                }} className="w-full bg-white border border-[#e3dec9] p-2 rounded-xl font-mono" />
                              </div>
                            </div>

                            <div className="space-y-1">
                              <label className="font-bold text-stone-700">Instructions for Administration</label>
                              <input type="text" placeholder="e.g. Give twice daily by mouth for 5 days" value={d.instructions} onChange={(e) => {
                                const updated = [...prescriptionForm.drugs];
                                updated[index].instructions = e.target.value;
                                setPrescriptionForm({...prescriptionForm, drugs: updated});
                              }} className="w-full bg-white border border-[#e3dec9] p-2 rounded-xl" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-gray-700">Practitioner Digital Signature Licence</label>
                  <input type="text" required value={newSoap.vetSignature} onChange={(e) => setNewSoap({...newSoap, vetSignature: e.target.value})} className="w-full bg-white border border-[#e3dec9] p-2 rounded-xl font-mono" />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t">
                  <button type="button" onClick={() => setShowSoapModal(false)} className="cursor-pointer bg-neutral-100 hover:bg-neutral-200 text-gray-700 px-4 py-2 rounded-xl font-bold border-none">Cancel</button>
                  <button type="submit" className="cursor-pointer bg-[#5a5a40] hover:bg-[#3e3e2b] text-white px-5 py-2 rounded-xl font-bold border-none">Save & Lock Clinical Record</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 3. Modal: Write Prescription */}
      <AnimatePresence>
        {showPrescModal && (
          <div className="fixed inset-0 bg-black/45 backdrop-blur-xs z-[500] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#fcf9f2] w-full max-w-2xl rounded-3xl border border-[#e3dec9] border-b-[6px] border-b-[#cdc6ad] shadow-2xl p-6 text-left space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center border-b border-[#e3dec9] pb-3">
                <h3 className="font-serif text-lg font-black text-[#5a5a40]">Write Digital Prescription</h3>
                <button onClick={() => setShowPrescModal(false)} className="cursor-pointer p-1 rounded-full border border-[#e3dec9] bg-white"><X className="w-4 h-4" /></button>
              </div>

              <form onSubmit={handleCreatePrescription} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <label className="font-bold text-gray-700">Patient Pet Name</label>
                    <input type="text" required placeholder="Sheru" value={prescriptionForm.patientName} onChange={(e) => setPrescriptionForm({...prescriptionForm, patientName: e.target.value})} className="w-full bg-white border border-[#e3dec9] p-2 rounded-xl" />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-gray-700">Species</label>
                    <input type="text" required placeholder="Canine" value={prescriptionForm.species || ''} onChange={(e) => setPrescriptionForm({...prescriptionForm, species: e.target.value})} className="w-full bg-white border border-[#e3dec9] p-2 rounded-xl" />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-gray-700">Weight (Kg)</label>
                    <input type="number" step="0.1" min="0.1" required placeholder="e.g. 5.4" value={prescriptionForm.weightKg} onChange={(e) => setPrescriptionForm({...prescriptionForm, weightKg: parseFloat(e.target.value) || 0})} className="w-full bg-white border border-[#e3dec9] p-2 rounded-xl font-bold font-mono" />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-gray-700">Owner Name</label>
                    <input type="text" required placeholder="Zainab Ahmed" value={prescriptionForm.ownerName} onChange={(e) => setPrescriptionForm({...prescriptionForm, ownerName: e.target.value})} className="w-full bg-white border border-[#e3dec9] p-2 rounded-xl" />
                  </div>
                </div>

                <div className="flex justify-between items-center border-b pb-1">
                  <span className="font-mono text-[10px] uppercase font-bold text-[#5a5a40]">Prescribed Drugs List</span>
                  <button type="button" onClick={addPrescDrugRow} className="cursor-pointer font-mono text-[9px] uppercase font-bold bg-[#5a5a40] hover:bg-[#3e3e2b] text-white px-2 py-1 rounded-lg border-none flex items-center gap-1">
                    <Plus className="w-3. h-3" /> Add Drug Row
                  </button>
                </div>

                <div className="space-y-3">
                  {prescriptionForm.drugs.map((d, index) => (
                    <div key={index} className="p-3 bg-stone-50 border rounded-xl space-y-2 relative">
                      {prescriptionForm.drugs.length > 1 && (
                        <button type="button" onClick={() => removePrescDrugRow(index)} className="cursor-pointer absolute top-2 right-2 text-red-600 bg-transparent border-none p-1">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="font-bold text-stone-700">Medication Name</label>
                          <div className="flex gap-2">
                            <input type="text" placeholder="e.g. Amoxicillin syrup or tablet" required value={d.name} onChange={(e) => {
                              const updated = [...prescriptionForm.drugs];
                              updated[index].name = e.target.value;
                              setPrescriptionForm({...prescriptionForm, drugs: updated});
                            }} className="w-full bg-white border border-[#e3dec9] p-2 rounded-xl" />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="font-bold text-stone-700">Dosage details (mg/ml/vials)</label>
                          <input type="text" placeholder="e.g. 5ml oral suspension" value={d.dosage} onChange={(e) => {
                            const updated = [...prescriptionForm.drugs];
                            updated[index].dosage = e.target.value;
                            setPrescriptionForm({...prescriptionForm, drugs: updated});
                          }} className="w-full bg-white border border-[#e3dec9] p-2 rounded-xl font-mono" />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="font-bold text-stone-700">Instructions for Administration</label>
                        <input type="text" placeholder="e.g. Give twice daily after food for three days" value={d.instructions} onChange={(e) => {
                          const updated = [...prescriptionForm.drugs];
                          updated[index].instructions = e.target.value;
                          setPrescriptionForm({...prescriptionForm, drugs: updated});
                        }} className="w-full bg-white border border-[#e3dec9] p-2 rounded-xl" />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Compatibility check output banner */}
                {activeWarning && (
                  <div className="p-2.5 bg-red-50 text-red-800 rounded-xl border border-red-200 font-mono text-[10px] flex items-center gap-2">
                    <Info className="w-4 h-4 text-red-600 flex-shrink-0" />
                    <span>{activeWarning.warn}</span>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="font-bold text-gray-700">Practitioner Digital Signature Licence</label>
                  <input type="text" required placeholder="Type signature & license (e.g., Dr. Sarah Alizai L-3968)" value={prescriptionForm.vetSignature} onChange={(e) => setPrescriptionForm({...prescriptionForm, vetSignature: e.target.value})} className="w-full bg-white border border-[#e3dec9] p-2 rounded-xl font-mono" />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t">
                  <button type="button" onClick={() => setShowPrescModal(false)} className="cursor-pointer bg-neutral-100 hover:bg-neutral-200 text-gray-700 px-4 py-2 rounded-xl font-bold border-none">Cancel</button>
                  <button type="submit" className="cursor-pointer bg-[#5a5a40] hover:bg-[#3e3e2b] text-white px-5 py-2 rounded-xl font-bold border-none">Issue Prescription Rx</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>



      {/* 5. Modal: Dynamic Custom Print Document Preview */}
      <AnimatePresence>
        {showPrintModal && (
          <div className="fixed inset-0 bg-black/55 backdrop-blur-xs z-[550] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white w-full max-w-xl rounded-2xl shadow-2xl p-6 text-left space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center border-b pb-3 border-stone-200">
                <span className="font-mono text-xs uppercase font-bold text-gray-500">Document Print Preview Workspace</span>
                <button onClick={() => setShowPrintModal(null)} className="cursor-pointer p-1 rounded-full border bg-neutral-100 font-bold text-gray-700"><X className="w-4 h-4" /></button>
              </div>

              {/* Dynamic print-page simulator inside UI frame */}
              <div className="border border-stone-300 p-8 bg-[#fafafa] rounded-lg shadow-inner font-serif" id="printable-pdf-target">
                <div className="text-center space-y-1 border-b-[2px] border-stone-800 pb-4">
                  <span className="text-2xl font-black text-stone-900 block font-display tracking-tight">{user.name || 'VetAxis Official Clinical Center'}</span>
                  <p className="text-[10px] text-stone-600 font-mono">PH: {user.phone || '091-522222'} · ADDRESS: {user.address || 'Cantt Plaza, Peshawar, Pakistan'}</p>
                </div>

                {showPrintModal.type === 'soap' && (() => {
                  const match = soaps.find(s => s.id === showPrintModal.id);
                  if (!match) return null;
                  return (
                    <div className="mt-6 space-y-4 text-xs text-stone-800">
                      <div className="grid grid-cols-2 gap-4 border-b pb-2 font-mono text-[10px]">
                        <div>
                          <span><strong>Patient Name:</strong> {match.patientName}</span><br />
                          <span><strong>Owner Name:</strong> {match.ownerName}</span>
                        </div>
                        <div className="text-right">
                          <span><strong>Date Filed:</strong> {match.date}</span><br />
                          <span><strong>Record ID:</strong> {match.id}</span>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <strong className="block text-[#a0522d] font-mono text-[9px] uppercase">Subjective:</strong>
                          <p className="mt-0.5 leading-relaxed text-stone-700 text-[11px] font-serif">{match.subjective}</p>
                        </div>
                        <div>
                          <strong className="block text-emerald-800 font-mono text-[9px] uppercase">Objective Examination:</strong>
                          <p className="mt-0.5 leading-relaxed text-stone-700 text-[11px] font-serif">{match.objective}</p>
                        </div>
                        <div>
                          <strong className="block text-[#5a5a40] font-mono text-[9px] uppercase">Assessment & Diagnosis:</strong>
                          <p className="mt-0.5 leading-relaxed text-stone-700 text-[11px] font-serif font-bold">{match.assessment}</p>
                        </div>
                        <div>
                          <strong className="block text-blue-900 font-mono text-[9px] uppercase">Treatment Action Plan:</strong>
                          <p className="mt-0.5 leading-relaxed text-stone-700 text-[11px] font-serif">{match.plan}</p>
                        </div>
                      </div>

                      <div className="border-t border-stone-300 pt-3 mt-6 flex justify-between items-center text-[10px]">
                        <span>Authorized Vet Signature:</span>
                        <div className="text-right font-mono font-bold text-stone-900 bg-stone-100 p-1 px-2.5 rounded">
                          {match.vetSignature}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {showPrintModal.type === 'presc' && (() => {
                  const match = prescriptions.find(p => p.id === showPrintModal.id);
                  if (!match) return null;
                  return (
                    <div className="mt-6 space-y-4 text-xs text-stone-800">
                      <div className="grid grid-cols-2 gap-4 border-b pb-2 font-mono text-[10px]">
                        <div>
                          <span><strong>Rx Name:</strong> {match.patientName}</span><br />
                          <span><strong>Owner Name:</strong> {match.ownerName}</span>
                        </div>
                        <div className="text-right">
                          <span><strong>Date:</strong> {match.date}</span><br />
                          <span><strong>Weight:</strong> {match.weightKg} Kg</span>
                        </div>
                      </div>

                      <div className="space-y-1 mt-4">
                        <span className="font-serif italic text-base border-b block pb-1">℞ Prescribed Medication Grid:</span>
                        {match.drugs.map((d, index) => (
                          <div key={index} className="p-2 border border-stone-300 rounded mb-2">
                            <span className="font-bold block text-[11px]">{index + 1}. {d.name} {d.brandName ? `(Brand: ${d.brandName})` : ''}</span>
                            <span className="block text-[10px] text-stone-600">Dose instructions: {d.dosage} · Frequency: {d.instructions}</span>
                          </div>
                        ))}
                      </div>

                      <div className="border-t border-stone-300 pt-3 mt-6 flex justify-between items-center text-[10px]">
                        <span>Practitioner Stamp & Registration:</span>
                        <div className="text-right font-mono font-bold text-stone-900 bg-stone-100 p-1 px-2.5 rounded">
                          {match.vetSignature}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {showPrintModal.type === 'invoice' && (() => {
                  const match = invoices.find(i => i.id === showPrintModal.id);
                  if (!match) return null;
                  return (
                    <div className="mt-6 space-y-4 text-xs text-stone-800">
                      <div className="grid grid-cols-2 gap-4 border-b pb-2 font-mono text-[10px]">
                        <div>
                          <span><strong>Bill to:</strong> {match.ownerName}</span><br />
                          <span><strong>Pet Patient:</strong> {match.patientName}</span>
                        </div>
                        <div className="text-right">
                          <span><strong>Receipt Date:</strong> {match.date}</span><br />
                          <span><strong>Receipt ID:</strong> {match.id}</span>
                        </div>
                      </div>

                      <table className="w-full text-left text-[11px] mt-4">
                        <thead>
                          <tr className="border-b-[2px] border-stone-700">
                            <th className="py-2">Item Context</th>
                            <th className="py-2 text-center">Qty</th>
                            <th className="py-2 text-right">Price</th>
                            <th className="py-2 text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {match.items.map((it, idx) => (
                            <tr key={idx} className="border-b border-stone-300">
                              <td className="py-2">{it.name}</td>
                              <td className="py-2 text-center">{it.quantity}</td>
                              <td className="py-2 text-right font-mono">PKR {it.unitPrice.toLocaleString()}</td>
                              <td className="py-2 text-right font-mono">PKR {(it.unitPrice * it.quantity).toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      <div className="border-t pt-2 space-y-1 text-right text-[10px] font-mono">
                        <div>Subtotal: PKR {match.subtotal.toLocaleString()}</div>
                        <div className="text-rose-800">Discounts Deducted: - PKR {match.discountAmount.toLocaleString()}</div>
                        <div>16% Vet Service Tax Support (GST): PKR {match.taxAmount.toLocaleString()}</div>
                        <div className="text-sm font-bold block text-stone-900 border-t pt-1">Total Settled: PKR {match.total.toLocaleString()}</div>
                      </div>

                      <div className="text-center border-t border-dashed border-stone-400 pt-4 text-[9px] font-mono mt-8">
                        🟢 THANK YOU FOR CHOOSING VETAXIS SERVICES FOR YOUR ANIMAL FAMILY MEMBERS!
                      </div>
                    </div>
                  );
                })()}
              </div>

              <div className="flex justify-end gap-2 text-xs">
                <button onClick={() => setShowPrintModal(null)} className="cursor-pointer bg-neutral-100 px-4 py-2 rounded-xl text-gray-700 font-bold border-none">Close Preview</button>
                <button onClick={() => window.print()} className="cursor-pointer bg-[#5a5a40] text-white px-5 py-2 rounded-xl font-bold border-none flex items-center gap-1">
                  <Printer className="w-4 h-4" />
                  Print Document
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 5. Custom Elegant Action Confirmation Overlay (Iframe Safe & Gorgeous) */}
      <AnimatePresence>
        {confirmState && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[999] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#fcf9f2] w-full max-w-md rounded-3xl border-2 border-[#e3dec9] border-b-[6px] border-b-[#cdc6ad] shadow-2xl p-6 text-left space-y-4"
            >
              <div className="flex items-start gap-3">
                <div className={`p-2.5 rounded-2xl ${confirmState.isDanger ? 'bg-rose-100 text-rose-800' : 'bg-[#e3dec9] text-[#a0522d]'}`}>
                  <AlertTriangle className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-serif text-base font-black text-[#5a5a40] leading-tight">
                    {confirmState.title || 'Administrative Verification Required'}
                  </h3>
                  <p className="text-[10px] text-[#7a766f] font-mono leading-none tracking-wider mt-1 uppercase">
                    VetAxis Official Protocol Registry
                  </p>
                </div>
              </div>

              <p className="text-xs text-stone-700 font-serif leading-relaxed bg-white border border-[#e3dec9] p-3 rounded-xl shadow-inner">
                {confirmState.message}
              </p>

              <div className="flex gap-2 justify-end text-xs pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmState(null)}
                  className="cursor-pointer bg-neutral-100 hover:bg-neutral-200 text-gray-700 px-4 py-2.5 rounded-xl font-bold border-none"
                >
                  {confirmState.cancelText || 'Cancel / Return'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const cb = confirmState.onConfirm;
                    cb();
                  }}
                  className={`cursor-pointer text-white px-5 py-2.5 rounded-xl font-bold border-none shadow-md ${
                    confirmState.isDanger 
                      ? 'bg-rose-700 hover:bg-rose-800' 
                      : 'bg-[#5a5a40] hover:bg-[#3e3e2b]'
                  }`}
                >
                  {confirmState.confirmText || 'Yes, Confirm'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
