import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  updateDoc,
  query,
  where
} from 'firebase/firestore';

import { db, isFirebaseConfigured, handleFirestoreError, OperationType } from './firebase';

// ─── CLINIC INTERFACES ───────────────────────────────────────────

export interface ClinicAppointment {
  id: string;
  clinicId: string;
  patientName: string;
  ownerName: string;
  ownerPhone: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  vetId: string;
  vetName: string;
  type: 'consultation' | 'surgery' | 'grooming' | 'vaccination' | 'follow-up' | 'emergency';
  status: 'Scheduled' | 'Checked In' | 'In Progress' | 'Completed' | 'No Show' | 'Cancelled';
  isRecurring: boolean;
  recurrencePattern?: 'None' | 'Daily' | 'Weekly' | 'Monthly';
  isBlocked?: boolean;
  blockedReason?: string;
  createdAt: number;
  notes?: string;
  userId?: string;
  sent6hReminder?: boolean;
}

export interface ClinicSoapRecord {
  id: string;
  clinicId: string;
  appointmentId?: string;
  patientName: string;
  species?: string;
  ownerName: string;
  ownerPhone: string;
  date: string; // YYYY-MM-DD
  subjective: string; // complaint, duration, behavioral changes
  objective: string; // temperature, heart rate, respiratory rate, weight, physical exams
  assessment: string; // differential / working diagnoses
  plan: string; // treatment, follow-up instructions
  vetSignature: string; // Digital signature
  createdAt: number;
  lastUpdated: number;
  isLocked: boolean; // lock records after 24 hrs
}

export interface DrugRecord {
  id: string;
  name: string;
  brandName?: string;
  isControlled: boolean;
  stockQuantity: number;
  unitPrice: number;
  expiryDate: string;
  dosageFormula: string; // e.g., "0.1 ml/kg"
  commonContraindications?: string[];
  alternatives?: string[];
}

export interface ClinicPrescription {
  id: string;
  clinicId: string;
  soapId?: string;
  patientName: string;
  species?: string;
  ownerName: string;
  ownerPhone: string;
  date: string;
  weightKg: number;
  dispensedFromStock: boolean;
  isControlled: boolean;
  controlledLogRef?: string;
  vetSignature: string;
  drugs: Array<{
    name: string;
    brandName?: string;
    isGeneric: boolean;
    dosage: string;
    instructions: string;
  }>;
  createdAt: number;
}

export interface InvoiceItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  category: 'consultation' | 'procedure' | 'vaccine' | 'medicine' | 'other';
}

export interface ClinicInvoice {
  id: string;
  clinicId: string;
  appointmentId?: string;
  patientName: string;
  ownerName: string;
  date: string; // YYYY-MM-DD
  items: InvoiceItem[];
  subtotal: number;
  discountAmount: number;
  discountReason?: string;
  taxAmount: number; // e.g. GST (usually 16% inside Pakistan)
  total: number;
  paidAmount: number;
  paymentMethod: 'cash' | 'JazzCash' | 'Easypaisa' | 'bank transfer' | 'card';
  paymentStatus: 'Paid' | 'Partial' | 'Unpaid' | 'Refunded';
  refundReason?: string;
  refundAuthorizedBy?: string;
  createdAt: number;
}

export interface ServiceCatalogItem {
  id: string;
  name: string;
  category: 'consultation' | 'procedure' | 'vaccine' | 'medicine' | 'other';
  price: number;
  taxPct: number;
}

// ─── KEYS FOR OFFLINE CACHE ─────────────────────────────────────
const LOCAL_APPTS_KEY = 'va_clinic_appointments';
const LOCAL_SOAP_KEY = 'va_clinic_soap_records';
const LOCAL_PRESC_KEY = 'va_clinic_prescriptions';
const LOCAL_INVOICE_KEY = 'va_clinic_invoices';
const LOCAL_CATALOG_KEY = 'va_clinic_catalog';
const LOCAL_DRUGS_KEY = 'va_clinic_drugs_inventory';

let offlineOverride = false;

function isCloud() {
  return isFirebaseConfigured && db && !offlineOverride;
}

function cleanUndefined<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => cleanUndefined(item)) as any;
  }
  const result = { ...obj } as any;
  Object.keys(result).forEach(key => {
    if (result[key] === undefined) {
      delete result[key];
    } else if (typeof result[key] === 'object' && result[key] !== null) {
      result[key] = cleanUndefined(result[key]);
    }
  });
  return result;
}

// Seed catalog and default drugs on initial fetch
const DEFAULT_CATALOG: ServiceCatalogItem[] = [
  { id: 'sc_1', name: 'General Consultation', category: 'consultation', price: 1500, taxPct: 16 },
  { id: 'sc_2', name: 'Emergency Consultation', category: 'consultation', price: 3000, taxPct: 16 },
  { id: 'sc_3', name: 'Vaccination Appointment', category: 'vaccine', price: 2000, taxPct: 16 },
  { id: 'sc_4', name: 'Feline Spay Surgery', category: 'procedure', price: 12000, taxPct: 16 },
  { id: 'sc_5', name: 'Canine Neutering', category: 'procedure', price: 15000, taxPct: 16 },
  { id: 'sc_6', name: 'Grooming Standard', category: 'other', price: 2500, taxPct: 16 },
  { id: 'sc_7', name: 'Dental Scaling', category: 'procedure', price: 8000, taxPct: 16 },
  { id: 'sc_8', name: 'CBC Blood Analysis', category: 'procedure', price: 1800, taxPct: 16 }
];

const DEFAULT_DRUGS: DrugRecord[] = [
  { id: 'dr_1', name: 'Amoxicillin', brandName: 'Aclam', isControlled: false, stockQuantity: 150, unitPrice: 400, expiryDate: '2027-12-01', dosageFormula: '12.5 mg/kg', commonContraindications: ['Penicillin allergy'], alternatives: ['Erythromycin', 'Clindamycin'] },
  { id: 'dr_2', name: 'Meloxicam', brandName: 'Maxicam', isControlled: false, stockQuantity: 200, unitPrice: 200, expiryDate: '2026-11-15', dosageFormula: '0.2 mg/kg', commonContraindications: ['Gastrointestinal ulcers', 'Kidney impaired'], alternatives: ['Carprofen', 'Ketoprofen'] },
  { id: 'dr_3', name: 'Ketamine 10%', brandName: 'Ketamax', isControlled: true, stockQuantity: 15, unitPrice: 1500, expiryDate: '2028-05-30', dosageFormula: '5.0 mg/kg', commonContraindications: ['Hypertension', 'Cardiac arrest risks'], alternatives: ['Propofol'] },
  { id: 'dr_4', name: 'Xylazine 2%', brandName: 'Rompun', isControlled: true, stockQuantity: 20, unitPrice: 1200, expiryDate: '2027-02-28', dosageFormula: '1.0 mg/kg', commonContraindications: ['Cardiorespiratory failure'], alternatives: ['Dexmedetomidine'] },
  { id: 'dr_5', name: 'Ivermectin Injection', brandName: 'Ivermax', isControlled: false, stockQuantity: 80, unitPrice: 650, expiryDate: '2026-08-10', dosageFormula: '0.2 mg/kg', commonContraindications: ['Collie breeds risk (MDR1 mutation)'], alternatives: ['Selamectin', 'Milbemycin'] }
];

const DEFAULT_APPOINTMENTS = (clinicId: string): ClinicAppointment[] => {
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 24 * 3600 * 1000).toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 24 * 3600 * 1000).toISOString().split('T')[0];

  return [
    {
      id: `apt_${clinicId}_1`,
      clinicId,
      patientName: 'Sheru (German Shepherd)',
      ownerName: 'Zainab Ahmed',
      ownerPhone: '03001234567',
      date: today,
      time: '09:30',
      vetId: 'vet_default',
      vetName: 'Dr. Sarah Alizai',
      type: 'consultation',
      status: 'Scheduled',
      isRecurring: false,
      createdAt: Date.now() - 3600000 * 12
    },
    {
      id: `apt_${clinicId}_2`,
      clinicId,
      patientName: 'Mano (Persian Cat)',
      ownerName: 'Ali Raza',
      ownerPhone: '03217654321',
      date: today,
      time: '11:00',
      vetId: 'vet_default',
      vetName: 'Dr. Sarah Alizai',
      type: 'vaccination',
      status: 'Checked In',
      isRecurring: false,
      createdAt: Date.now() - 3600000 * 10
    },
    {
      id: `apt_${clinicId}_3`,
      clinicId,
      patientName: 'Lucy (Pug)',
      ownerName: 'Farhan Beg',
      ownerPhone: '03339090901',
      date: yesterday,
      time: '14:30',
      vetId: 'vet_default',
      vetName: 'Dr. Faisal Shah',
      type: 'surgery',
      status: 'Completed',
      isRecurring: false,
      createdAt: Date.now() - 24 * 3600000
    },
    {
      id: `apt_${clinicId}_4`,
      clinicId,
      patientName: 'Rocky (Husky)',
      ownerName: 'Kamil Khan',
      ownerPhone: '03005556677',
      date: tomorrow,
      time: '16:00',
      vetId: 'vet_default',
      vetName: 'Dr. Faisal Shah',
      type: 'follow-up',
      status: 'Scheduled',
      isRecurring: true,
      recurrencePattern: 'Monthly',
      createdAt: Date.now() - 3600000 * 4
    }
  ];
};

const DEFAULT_SOAPS = (clinicId: string): ClinicSoapRecord[] => {
  const yesterday = new Date(Date.now() - 24 * 3600 * 1000).toISOString().split('T')[0];
  return [
    {
      id: `soap_${clinicId}_1`,
      clinicId,
      appointmentId: `apt_${clinicId}_3`,
      patientName: 'Lucy (Pug)',
      ownerName: 'Farhan Beg',
      ownerPhone: '03339090901',
      date: yesterday,
      subjective: 'Owner report bilateral ear scratching and yellowish discharge for 5 days. Mild appetite decline.',
      objective: 'Temp: 38.9 C, HR: 110 bpm, Weight: 8.5 kg. Bilateral otitis externa with heavy ceruminous exudate.',
      assessment: 'Bilateral bacterial otitis externa. Mild ear-mite infestation co-suspected.',
      plan: 'Ear canal flush with medicated cleanser. Administer topical Clotrimazole drops and prescribe oral Amoxicillin.',
      vetSignature: 'Dr. Sarah Alizai (L-3902)',
      createdAt: Date.now() - 18 * 3600 * 1000,
      lastUpdated: Date.now() - 17 * 3600 * 1000,
      isLocked: false // Easily editable within 24 hours
    }
  ];
};

const DEFAULT_INVOICES = (clinicId: string): ClinicInvoice[] => {
  const yesterday = new Date(Date.now() - 24 * 3600 * 1000).toISOString().split('T')[0];
  return [
    {
      id: `inv_${clinicId}_1`,
      clinicId,
      appointmentId: `apt_${clinicId}_3`,
      date: yesterday,
      patientName: 'Lucy (Pug)',
      ownerName: 'Farhan Beg',
      items: [
        { id: 'i1', name: 'General Consultation', quantity: 1, unitPrice: 1500, category: 'consultation' },
        { id: 'i2', name: 'Amoxicillin Dosage Pack', quantity: 1, unitPrice: 400, category: 'medicine' },
        { id: 'i3', name: 'Ear Flush Procedure', quantity: 1, unitPrice: 1200, category: 'procedure' }
      ],
      subtotal: 3100,
      discountAmount: 200,
      discountReason: 'First visit welcome gesture',
      taxAmount: 464, // 16% on subtotal of remaining
      total: 3364,
      paidAmount: 3364,
      paymentMethod: 'JazzCash',
      paymentStatus: 'Paid',
      createdAt: Date.now() - 16 * 3600 * 1000
    }
  ];
};

export const ClinicService = {
  setOfflineOverride(val: boolean) {
    offlineOverride = val;
  },

  // ─── ALIGN SYNCHRONIZER ────────────────────────
  async syncOfflineDataWithServer(): Promise<void> {
    if (!isFirebaseConfigured || !db) return;

    try {
      const appts: ClinicAppointment[] = JSON.parse(localStorage.getItem(LOCAL_APPTS_KEY) || '[]');
      const soaps: ClinicSoapRecord[] = JSON.parse(localStorage.getItem(LOCAL_SOAP_KEY) || '[]');
      const prescs: ClinicPrescription[] = JSON.parse(localStorage.getItem(LOCAL_PRESC_KEY) || '[]');
      const invoices: ClinicInvoice[] = JSON.parse(localStorage.getItem(LOCAL_INVOICE_KEY) || '[]');
      const catalog: ServiceCatalogItem[] = JSON.parse(localStorage.getItem(LOCAL_CATALOG_KEY) || '[]');
      const drugs: DrugRecord[] = JSON.parse(localStorage.getItem(LOCAL_DRUGS_KEY) || '[]');

      for (const a of appts) await setDoc(doc(db, 'clinic_appointments', a.id), cleanUndefined(a));
      for (const s of soaps) await setDoc(doc(db, 'clinic_soap_records', s.id), cleanUndefined(s));
      for (const p of prescs) await setDoc(doc(db, 'clinic_prescriptions', p.id), cleanUndefined(p));
      for (const i of invoices) await setDoc(doc(db, 'clinic_invoices', i.id), cleanUndefined(i));
      for (const c of catalog) await setDoc(doc(db, 'clinic_service_catalog', c.id), cleanUndefined(c));
      for (const d of drugs) await setDoc(doc(db, 'clinic_drugs_inventory', d.id), cleanUndefined(d));

      console.log('[VetAxis] Clinic management data synchronized safely with custom firestore collections.');
    } catch (err) {
      console.error('[VetAxis] Error during clinic sync:', err);
    }
  },

  // ─── APPOINTMENT ACTIONS ───────────────────────
  async fetchAppointments(clinicId: string): Promise<ClinicAppointment[]> {
    if (isCloud()) {
      try {
        const q = query(collection(db, 'clinic_appointments'), where('clinicId', '==', clinicId));
        const snaps = await getDocs(q);
        const results = snaps.docs.map(d => d.data() as ClinicAppointment);
        // Exclude preset seeds
        return results.filter(a => !['1', '2', '3', '4'].includes(a.id.replace(`apt_${clinicId}_`, '')));
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, 'clinic_appointments');
        return [];
      }
    } else {
      let local = localStorage.getItem(LOCAL_APPTS_KEY);
      if (!local) {
        localStorage.setItem(LOCAL_APPTS_KEY, JSON.stringify([]));
        return [];
      }
      const parsed = JSON.parse(local) as ClinicAppointment[];
      return parsed.filter(a => !['1', '2', '3', '4'].includes(a.id.replace(`apt_${clinicId}_`, '')));
    }
  },

  async fetchAppointmentsByUserId(userId: string): Promise<ClinicAppointment[]> {
    if (isCloud()) {
      try {
        const q = query(collection(db, 'clinic_appointments'), where('userId', '==', userId));
        const snaps = await getDocs(q);
        return snaps.docs.map(d => d.data() as ClinicAppointment);
      } catch (err) {
        console.error('Error fetching appointments by user:', err);
        return [];
      }
    } else {
      const localStr = localStorage.getItem(LOCAL_APPTS_KEY) || '[]';
      const all = JSON.parse(localStr) as ClinicAppointment[];
      return all.filter(a => a.userId === userId);
    }
  },

  async saveAppointment(appt: ClinicAppointment): Promise<void> {
    const cleaned = cleanUndefined(appt);
    if (isCloud()) {
      try {
        await setDoc(doc(db, 'clinic_appointments', appt.id), cleaned);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `clinic_appointments/${appt.id}`);
      }
    } else {
      const allStr = localStorage.getItem(LOCAL_APPTS_KEY) || '[]';
      const all = JSON.parse(allStr) as ClinicAppointment[];
      const idx = all.findIndex(a => a.id === appt.id);
      if (idx !== -1) {
        all[idx] = cleaned;
      } else {
        all.push(cleaned);
      }
      localStorage.setItem(LOCAL_APPTS_KEY, JSON.stringify(all));
    }
  },

  async deleteAppointment(id: string): Promise<void> {
    if (isCloud()) {
      try {
        await deleteDoc(doc(db, 'clinic_appointments', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `clinic_appointments/${id}`);
      }
    } else {
      const allStr = localStorage.getItem(LOCAL_APPTS_KEY) || '[]';
      const all = JSON.parse(allStr) as ClinicAppointment[];
      const filtered = all.filter(a => a.id !== id);
      localStorage.setItem(LOCAL_APPTS_KEY, JSON.stringify(filtered));
    }
  },

  // ─── SOAP ACTIONS ──────────────────────────────
  async fetchSoapRecords(clinicId: string): Promise<ClinicSoapRecord[]> {
    if (isCloud()) {
      try {
        const q = query(collection(db, 'clinic_soap_records'), where('clinicId', '==', clinicId));
        const snaps = await getDocs(q);
        const results = snaps.docs.map(d => d.data() as ClinicSoapRecord);
        return results.filter(s => s.id !== `soap_${clinicId}_1`);
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, 'clinic_soap_records');
        return [];
      }
    } else {
      let local = localStorage.getItem(LOCAL_SOAP_KEY);
      if (!local) {
        localStorage.setItem(LOCAL_SOAP_KEY, JSON.stringify([]));
        return [];
      }
      const parsed = JSON.parse(local) as ClinicSoapRecord[];
      return parsed.filter(s => s.id !== `soap_${clinicId}_1`);
    }
  },

  async saveSoapRecord(soap: ClinicSoapRecord): Promise<void> {
    // Integrity check - Locked after 24 hrs
    const recordAgeInHrs = (Date.now() - soap.createdAt) / 3600000;
    if (recordAgeInHrs > 24) {
      soap.isLocked = true;
    }
    const cleaned = cleanUndefined(soap);
    if (isCloud()) {
      try {
        await setDoc(doc(db, 'clinic_soap_records', soap.id), cleaned);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `clinic_soap_records/${soap.id}`);
      }
    } else {
      const allStr = localStorage.getItem(LOCAL_SOAP_KEY) || '[]';
      const all = JSON.parse(allStr) as ClinicSoapRecord[];
      const idx = all.findIndex(s => s.id === soap.id);
      if (idx !== -1) {
        if (all[idx].isLocked) {
          throw new Error("This clinical ledger entry is locked to preserve digital veterinary integrity records and prevent backdating.");
        }
        all[idx] = cleaned;
      } else {
        all.push(cleaned);
      }
      localStorage.setItem(LOCAL_SOAP_KEY, JSON.stringify(all));
    }
  },

  async deleteSoapRecord(id: string): Promise<void> {
    if (isCloud()) {
      try {
        await deleteDoc(doc(db, 'clinic_soap_records', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `clinic_soap_records/${id}`);
      }
    } else {
      const allStr = localStorage.getItem(LOCAL_SOAP_KEY) || '[]';
      const all = JSON.parse(allStr) as ClinicSoapRecord[];
      const filtered = all.filter(s => s.id !== id);
      localStorage.setItem(LOCAL_SOAP_KEY, JSON.stringify(filtered));
    }
  },

  // ─── PRESCRIPTION ACTIONS ──────────────────────
  async fetchPrescriptions(clinicId: string): Promise<ClinicPrescription[]> {
    if (isCloud()) {
      try {
        const q = query(collection(db, 'clinic_prescriptions'), where('clinicId', '==', clinicId));
        const snaps = await getDocs(q);
        return snaps.docs.map(d => d.data() as ClinicPrescription);
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, 'clinic_prescriptions');
        return [];
      }
    } else {
      let local = localStorage.getItem(LOCAL_PRESC_KEY);
      if (!local) {
        localStorage.setItem(LOCAL_PRESC_KEY, JSON.stringify([]));
        return [];
      }
      return JSON.parse(local) as ClinicPrescription[];
    }
  },

  async savePrescription(presc: ClinicPrescription): Promise<void> {
    const cleaned = cleanUndefined(presc);
    if (isCloud()) {
      try {
        await setDoc(doc(db, 'clinic_prescriptions', presc.id), cleaned);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `clinic_prescriptions/${presc.id}`);
      }
    } else {
      const allStr = localStorage.getItem(LOCAL_PRESC_KEY) || '[]';
      const all = JSON.parse(allStr) as ClinicPrescription[];
      const idx = all.findIndex(p => p.id === presc.id);
      if (idx !== -1) {
        all[idx] = cleaned;
      } else {
        all.push(cleaned);
      }
      localStorage.setItem(LOCAL_PRESC_KEY, JSON.stringify(all));
    }
  },

  async deletePrescription(id: string): Promise<void> {
    if (isCloud()) {
      try {
        await deleteDoc(doc(db, 'clinic_prescriptions', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `clinic_prescriptions/${id}`);
      }
    } else {
      const allStr = localStorage.getItem(LOCAL_PRESC_KEY) || '[]';
      const all = JSON.parse(allStr) as ClinicPrescription[];
      const filtered = all.filter(p => p.id !== id);
      localStorage.setItem(LOCAL_PRESC_KEY, JSON.stringify(filtered));
    }
  },

  // ─── INVOICE ACTIONS ───────────────────────────
  async fetchInvoices(clinicId: string): Promise<ClinicInvoice[]> {
    if (isCloud()) {
      try {
        const q = query(collection(db, 'clinic_invoices'), where('clinicId', '==', clinicId));
        const snaps = await getDocs(q);
        const results = snaps.docs.map(d => d.data() as ClinicInvoice);
        return results.filter(i => i.id !== `inv_${clinicId}_1`);
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, 'clinic_invoices');
        return [];
      }
    } else {
      let local = localStorage.getItem(LOCAL_INVOICE_KEY);
      if (!local) {
        localStorage.setItem(LOCAL_INVOICE_KEY, JSON.stringify([]));
        return [];
      }
      const parsed = JSON.parse(local) as ClinicInvoice[];
      return parsed.filter(i => i.id !== `inv_${clinicId}_1`);
    }
  },

  async saveInvoice(invoice: ClinicInvoice): Promise<void> {
    const cleaned = cleanUndefined(invoice);
    if (isCloud()) {
      try {
        await setDoc(doc(db, 'clinic_invoices', invoice.id), cleaned);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `clinic_invoices/${invoice.id}`);
      }
    } else {
      const allStr = localStorage.getItem(LOCAL_INVOICE_KEY) || '[]';
      const all = JSON.parse(allStr) as ClinicInvoice[];
      const idx = all.findIndex(i => i.id === invoice.id);
      if (idx !== -1) {
        all[idx] = cleaned;
      } else {
        all.push(cleaned);
      }
      localStorage.setItem(LOCAL_INVOICE_KEY, JSON.stringify(all));
    }
  },

  // ─── AUX ACTIONS: SERVICE CATALOG & DRUGS ───────────
  async fetchServiceCatalog(): Promise<ServiceCatalogItem[]> {
    if (isCloud()) {
      try {
        const snaps = await getDocs(collection(db, 'clinic_service_catalog'));
        const results = snaps.docs.map(d => d.data() as ServiceCatalogItem);
        if (results.length === 0) {
          for (const s of DEFAULT_CATALOG) {
            await setDoc(doc(db, 'clinic_service_catalog', s.id), s);
          }
          return DEFAULT_CATALOG;
        }
        return results;
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, 'clinic_service_catalog');
      }
    } else {
      let local = localStorage.getItem(LOCAL_CATALOG_KEY);
      if (!local) {
        localStorage.setItem(LOCAL_CATALOG_KEY, JSON.stringify(DEFAULT_CATALOG));
        return DEFAULT_CATALOG;
      }
      return JSON.parse(local) as ServiceCatalogItem[];
    }
  },

  async saveServiceCatalogItem(item: ServiceCatalogItem): Promise<void> {
    const cleaned = cleanUndefined(item);
    if (isCloud()) {
      try {
        await setDoc(doc(db, 'clinic_service_catalog', item.id), cleaned);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `clinic_service_catalog/${item.id}`);
      }
    } else {
      const all = JSON.parse(localStorage.getItem(LOCAL_CATALOG_KEY) || '[]') as ServiceCatalogItem[];
      const idx = all.findIndex(i => i.id === item.id);
      if (idx !== -1) {
        all[idx] = cleaned;
      } else {
        all.push(cleaned);
      }
      localStorage.setItem(LOCAL_CATALOG_KEY, JSON.stringify(all));
    }
  },

  async fetchDrugsInventory(): Promise<DrugRecord[]> {
    if (isCloud()) {
      try {
        const snaps = await getDocs(collection(db, 'clinic_drugs_inventory'));
        const results = snaps.docs.map(d => d.data() as DrugRecord);
        if (results.length === 0) {
          for (const s of DEFAULT_DRUGS) {
            await setDoc(doc(db, 'clinic_drugs_inventory', s.id), s);
          }
          return DEFAULT_DRUGS;
        }
        return results;
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, 'clinic_drugs_inventory');
      }
    } else {
      let local = localStorage.getItem(LOCAL_DRUGS_KEY);
      if (!local) {
        localStorage.setItem(LOCAL_DRUGS_KEY, JSON.stringify(DEFAULT_DRUGS));
        return DEFAULT_DRUGS;
      }
      return JSON.parse(local) as DrugRecord[];
    }
  },

  async saveDrugRecord(drug: DrugRecord): Promise<void> {
    const cleaned = cleanUndefined(drug);
    if (isCloud()) {
      try {
        await setDoc(doc(db, 'clinic_drugs_inventory', drug.id), cleaned);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `clinic_drugs_inventory/${drug.id}`);
      }
    } else {
      const all = JSON.parse(localStorage.getItem(LOCAL_DRUGS_KEY) || '[]') as DrugRecord[];
      const idx = all.findIndex(d => d.id === drug.id);
      if (idx !== -1) {
        all[idx] = cleaned;
      } else {
        all.push(cleaned);
      }
      localStorage.setItem(LOCAL_DRUGS_KEY, JSON.stringify(all));
    }
  }
};
