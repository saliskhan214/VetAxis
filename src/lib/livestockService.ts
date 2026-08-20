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
import { LivestockFarm, LivestockAnimal, LivestockBatch, LivestockTask, IndividualAnimalRecord, HerdLevelMasterRecord } from '../types';

const LOCAL_FARMS_KEY = 'va_farms';
const LOCAL_ANIMALS_KEY = 'va_animals';
const LOCAL_BATCHES_KEY = 'va_batches';
const LOCAL_TASKS_KEY = 'va_tasks';
const LOCAL_INDIVIDUAL_RECORDS_KEY = 'va_individual_records';
const LOCAL_HERD_RECORDS_KEY = 'va_herd_records';

let offlineOverride = false;

function mergeCachedItems<T extends { id: any }>(key: string, newItems: T[]) {
  try {
    const existingStr = localStorage.getItem(key);
    let existing: T[] = [];
    try { existing = existingStr ? JSON.parse(existingStr) : []; } catch {}
    const newIds = new Set(newItems.map(item => item.id));
    const merged = [...newItems, ...existing.filter(e => !newIds.has(e.id))];
    localStorage.setItem(key, JSON.stringify(merged));
  } catch (e) {
    console.error("Failed to merge local storage caching for " + key, e);
  }
}

function isCloud() {
  return isFirebaseConfigured && db && !offlineOverride;
}

function isPermissionError(err: any): boolean {
  if (!err) return false;
  const msg = (err.message || String(err)).toLowerCase();
  return err.code === 'permission-denied' || msg.includes('permission') || msg.includes('insufficient');
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

// Date helper to add days
export function addDays(dateStr: string | undefined, days: number): string {
  const base = dateStr ? new Date(dateStr) : new Date();
  if (isNaN(base.getTime())) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  }
  const clone = new Date(base.getTime());
  clone.setDate(clone.getDate() + days);
  return clone.toISOString().split('T')[0];
}

// Date helper to add months (useful for booster triggers)
export function addMonths(dateStr: string | undefined, months: number): string {
  const base = dateStr ? new Date(dateStr) : new Date();
  if (isNaN(base.getTime())) {
    const d = new Date();
    d.setMonth(d.getMonth() + months);
    return d.toISOString().split('T')[0];
  }
  const clone = new Date(base.getTime());
  clone.setMonth(clone.getMonth() + months);
  return clone.toISOString().split('T')[0];
}

export const LivestockService = {
  // ─── Offline Mechanics ───────────────────────────────────────────
  setOfflineOverride(val: boolean) {
    offlineOverride = val;
  },

  async syncOfflineDataWithServer(): Promise<void> {
    if (!isFirebaseConfigured || !db) return;

    // 1. Sync Farms
    try {
      const farms: LivestockFarm[] = JSON.parse(localStorage.getItem(LOCAL_FARMS_KEY) || '[]');
      for (const f of farms) {
        await setDoc(doc(db, 'livestock_farms', f.id), cleanUndefined(f));
      }
    } catch (e) {
      console.error("Sync farms error:", e);
    }

    // 2. Sync Animals
    try {
      const animals: LivestockAnimal[] = JSON.parse(localStorage.getItem(LOCAL_ANIMALS_KEY) || '[]');
      for (const a of animals) {
        await setDoc(doc(db, 'livestock_animals', a.id), cleanUndefined(a));
      }
    } catch (e) {
      console.error("Sync animals error:", e);
    }

    // 3. Sync Batches
    try {
      const batches: LivestockBatch[] = JSON.parse(localStorage.getItem(LOCAL_BATCHES_KEY) || '[]');
      for (const b of batches) {
        await setDoc(doc(db, 'livestock_batches', b.id), cleanUndefined(b));
      }
    } catch (e) {
      console.error("Sync batches error:", e);
    }

    // 4. Sync Tasks
    try {
      const tasks: LivestockTask[] = JSON.parse(localStorage.getItem(LOCAL_TASKS_KEY) || '[]');
      for (const t of tasks) {
        await setDoc(doc(db, 'livestock_tasks', t.id), cleanUndefined(t));
      }
    } catch (e) {
      console.error("Sync tasks error:", e);
    }

    // 5. Sync Comprehensive Individual Animal Records
    try {
      const records: IndividualAnimalRecord[] = JSON.parse(localStorage.getItem(LOCAL_INDIVIDUAL_RECORDS_KEY) || '[]');
      for (const r of records) {
        await setDoc(doc(db, 'livestock_individual_records', r.id), cleanUndefined(r));
      }
    } catch (e) {
      console.error("Sync individual records error:", e);
    }

    // 6. Sync Comprehensive Herd Master Records
    try {
      const records: HerdLevelMasterRecord[] = JSON.parse(localStorage.getItem(LOCAL_HERD_RECORDS_KEY) || '[]');
      for (const r of records) {
        await setDoc(doc(db, 'livestock_herd_records', r.id), cleanUndefined(r));
      }
    } catch (e) {
      console.error("Sync herd records error:", e);
    }

    try {
      localStorage.setItem('vetaxis_last_sync_timestamp', new Date().toISOString());
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('vetaxis-sync-complete'));
      }
    } catch (e) {
      console.error("Error setting sync timestamp", e);
    }
  },

  // ─────────────────────────────────────────────────────────────────
  // FARMS SERVICE
  // ─────────────────────────────────────────────────────────────────
  async fetchFarms(): Promise<LivestockFarm[]> {
    if (isCloud()) {
      try {
        const snap = await getDocs(collection(db, 'livestock_farms'));
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() })) as LivestockFarm[];
        mergeCachedItems(LOCAL_FARMS_KEY, list);
        return list;
      } catch (err) {
        if (!isPermissionError(err)) {
          console.warn("Offline fallback triggered for fetchFarms. Using local storage cache:", err);
        }
        try {
          return JSON.parse(localStorage.getItem(LOCAL_FARMS_KEY) || '[]');
        } catch {
          return [];
        }
      }
    } else {
      try {
        return JSON.parse(localStorage.getItem(LOCAL_FARMS_KEY) || '[]');
      } catch {
        return [];
      }
    }
  },

  async fetchFarmById(farmId: string): Promise<LivestockFarm | null> {
    if (isCloud()) {
      try {
        const snap = await getDoc(doc(db, 'livestock_farms', farmId));
        if (snap.exists()) {
          const item = { id: snap.id, ...snap.data() } as LivestockFarm;
          mergeCachedItems(LOCAL_FARMS_KEY, [item]);
          return item;
        }
        return null;
      } catch (err) {
        if (!isPermissionError(err)) {
          console.warn(`Offline fallback triggered for fetchFarmById(${farmId}). Using local storage cache:`, err);
        }
        const list = await this.fetchFarms();
        return list.find(f => f.id === farmId) || null;
      }
    } else {
      const list = await this.fetchFarms();
      return list.find(f => f.id === farmId) || null;
    }
  },

  async createFarm(farm: Partial<LivestockFarm>): Promise<LivestockFarm> {
    const newFarm: LivestockFarm = {
      id: 'farm_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      name: farm.name || 'My Farm',
      location: farm.location || 'Capital Area, Islamabad',
      farmType: farm.farmType || 'Mixed Farm',
      mixedOptions: farm.mixedOptions,
      ownerUid: farm.ownerUid || '',
      ownerName: farm.ownerName || 'Fermer',
      ownerEmail: farm.ownerEmail || '',
      managerUid: farm.managerUid,
      managerName: farm.managerName,
      managerRole: farm.managerRole,
      managerStatus: farm.managerStatus || 'unassigned',
      createdAt: Date.now(),
      team: farm.team || []
    };

    const initialMemberUids = [newFarm.ownerUid, ...(newFarm.team || []).map(m => m.uid)];
    if (newFarm.managerUid) {
      initialMemberUids.push(newFarm.managerUid);
    }
    newFarm.memberUids = Array.from(new Set(initialMemberUids.filter(Boolean)));

    if (isCloud()) {
      try {
        await setDoc(doc(db, 'livestock_farms', newFarm.id), cleanUndefined(newFarm));
        return newFarm;
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `livestock_farms/${newFarm.id}`);
      }
    } else {
      const list = await this.fetchFarms();
      list.push(newFarm);
      localStorage.setItem(LOCAL_FARMS_KEY, JSON.stringify(list));
      return newFarm;
    }
    return newFarm;
  },

  async updateFarm(farmId: string, updates: Partial<LivestockFarm>): Promise<void> {
    if (isCloud()) {
      try {
        let finalUpdates = { ...updates };
        if (updates.team || updates.managerUid || updates.ownerUid) {
          try {
            const snap = await getDoc(doc(db, 'livestock_farms', farmId));
            if (snap.exists()) {
              const existingFarm = snap.data() as LivestockFarm;
              const owner = updates.ownerUid || existingFarm.ownerUid || '';
              const t = updates.team || existingFarm.team || [];
              const mgr = 'managerUid' in updates ? updates.managerUid : existingFarm.managerUid;

              const finalMemberUids = [owner, ...t.map(m => m.uid)];
              if (mgr) {
                finalMemberUids.push(mgr);
              }
              finalUpdates.memberUids = Array.from(new Set(finalMemberUids.filter(Boolean)));
            }
          } catch (e) {
            console.error("Failed to dynamically compute memberUids on update:", e);
          }
        }
        await updateDoc(doc(db, 'livestock_farms', farmId), cleanUndefined(finalUpdates));
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `livestock_farms/${farmId}`);
      }
    } else {
      const list = await this.fetchFarms();
      const idx = list.findIndex(f => f.id === farmId);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...updates };
        localStorage.setItem(LOCAL_FARMS_KEY, JSON.stringify(list));
      }
    }
  },

  async deleteFarm(farmId: string): Promise<void> {
    if (isCloud()) {
      try {
        await deleteDoc(doc(db, 'livestock_farms', farmId));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `livestock_farms/${farmId}`);
      }
    } else {
      // Cascade delete locally
      const farms = await this.fetchFarms();
      localStorage.setItem(LOCAL_FARMS_KEY, JSON.stringify(farms.filter(f => f.id !== farmId)));

      const animals = await this.fetchAllAnimals();
      localStorage.setItem(LOCAL_ANIMALS_KEY, JSON.stringify(animals.filter(a => a.farmId !== farmId)));

      const batches = await this.fetchAllBatches();
      localStorage.setItem(LOCAL_BATCHES_KEY, JSON.stringify(batches.filter(b => b.farmId !== farmId)));

      const tasks = await this.fetchAllTasks();
      localStorage.setItem(LOCAL_TASKS_KEY, JSON.stringify(tasks.filter(t => t.farmId !== farmId)));
    }
  },

  // ─────────────────────────────────────────────────────────────────
  // ANIMALS SERVICE (Individual Entry Mode)
  // ─────────────────────────────────────────────────────────────────
  async fetchAllAnimals(): Promise<LivestockAnimal[]> {
    if (isCloud()) {
      try {
        const snap = await getDocs(collection(db, 'livestock_animals'));
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() })) as LivestockAnimal[];
        mergeCachedItems(LOCAL_ANIMALS_KEY, list);
        return list;
      } catch (err) {
        if (!isPermissionError(err)) {
          console.warn("Offline fallback triggered for fetchAllAnimals. Using local storage cache:", err);
        }
        try {
          return JSON.parse(localStorage.getItem(LOCAL_ANIMALS_KEY) || '[]');
        } catch {
          return [];
        }
      }
    } else {
      try {
        return JSON.parse(localStorage.getItem(LOCAL_ANIMALS_KEY) || '[]');
      } catch {
        return [];
      }
    }
  },

  async fetchAnimals(farmId: string): Promise<LivestockAnimal[]> {
    if (isCloud()) {
      try {
        const q = query(collection(db, 'livestock_animals'), where('farmId', '==', farmId));
        const snap = await getDocs(q);
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() })) as LivestockAnimal[];
        mergeCachedItems(LOCAL_ANIMALS_KEY, list);
        return list;
      } catch (err) {
        if (!isPermissionError(err)) {
          console.warn(`Offline fallback triggered for fetchAnimals(${farmId}). Using local storage cache:`, err);
        }
        const all = await this.fetchAllAnimals();
        return all.filter(a => a.farmId === farmId);
      }
    } else {
      const all = await this.fetchAllAnimals();
      return all.filter(a => a.farmId === farmId);
    }
  },

  async createAnimal(animal: Partial<LivestockAnimal>): Promise<LivestockAnimal> {
    const newAnimal: LivestockAnimal = {
      id: 'animal_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      farmId: animal.farmId || '',
      animalId: animal.animalId || '',
      species: animal.species || 'Cattle',
      tagNumber: animal.tagNumber,
      gender: animal.gender || 'Female',
      dob: animal.dob || new Date().toISOString().split('T')[0],
      breed: animal.breed,
      weight: animal.weight,
      healthStatus: animal.healthStatus || 'Healthy',
      entryType: 'individual',
      createdAt: Date.now()
    };

    if (isCloud()) {
      try {
        await setDoc(doc(db, 'livestock_animals', newAnimal.id), cleanUndefined(newAnimal));
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `livestock_animals/${newAnimal.id}`);
      }
    } else {
      const list = await this.fetchAllAnimals();
      list.push(newAnimal);
      localStorage.setItem(LOCAL_ANIMALS_KEY, JSON.stringify(list));
    }

    // Smart Scheduling Trigger:
    await this.autoGenerateSchedulesForAnimal(newAnimal);

    return newAnimal;
  },

  async autoGenerateSchedulesForAnimal(animal: LivestockAnimal) {
    const dob = animal.dob || new Date().toISOString().split('T')[0];
    const tasksToSchedule: Partial<LivestockTask>[] = [];

    if (animal.species === 'Cattle' || animal.species === 'Buffalo') {
      tasksToSchedule.push({
        serviceType: 'Deworming (First Dose)',
        dueDate: addDays(dob, 30),
        autoScheduleNext: false
      });
      tasksToSchedule.push({
        serviceType: 'Vaccination (Foot-and-Mouth Disease)',
        dueDate: addDays(dob, 60),
        autoScheduleNext: false
      });
      tasksToSchedule.push({
        serviceType: 'Vaccination (Haemorrhagic Septicaemia)',
        dueDate: addDays(dob, 150),
        autoScheduleNext: false
      });
      tasksToSchedule.push({
        serviceType: 'Booster Vaccination',
        dueDate: addDays(dob, 330),
        autoScheduleNext: true
      });
    } else if (animal.species === 'Goat' || animal.species === 'Sheep') {
      tasksToSchedule.push({
        serviceType: 'Deworming (First Dose)',
        dueDate: addDays(dob, 21),
        autoScheduleNext: false
      });
      tasksToSchedule.push({
        serviceType: 'Vaccination (PPR / Goat Plague)',
        dueDate: addDays(dob, 45),
        autoScheduleNext: false
      });
      tasksToSchedule.push({
        serviceType: 'Booster Vaccination',
        dueDate: addDays(dob, 180),
        autoScheduleNext: true
      });
    } else {
      tasksToSchedule.push({
        serviceType: 'General Checkup',
        dueDate: addDays(dob, 14),
        autoScheduleNext: false
      });
    }

    for (const task of tasksToSchedule) {
      await this.createTask({
        farmId: animal.farmId,
        targetId: animal.id,
        targetType: 'individual',
        targetName: animal.animalId + (animal.tagNumber ? ` (Tag ID: ${animal.tagNumber})` : ''),
        serviceType: task.serviceType,
        dueDate: task.dueDate,
        status: 'Pending',
        createdBy: 'system',
        autoScheduleNext: task.autoScheduleNext
      });
    }
  },

  async updateAnimal(animalId: string, updates: Partial<LivestockAnimal>): Promise<void> {
    if (isCloud()) {
      try {
        await updateDoc(doc(db, 'livestock_animals', animalId), cleanUndefined(updates));
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `livestock_animals/${animalId}`);
      }
    } else {
      const list = await this.fetchAllAnimals();
      const idx = list.findIndex(a => a.id === animalId);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...updates };
        localStorage.setItem(LOCAL_ANIMALS_KEY, JSON.stringify(list));
      }
    }
  },

  async deleteAnimal(animalId: string): Promise<void> {
    if (isCloud()) {
      try {
        await deleteDoc(doc(db, 'livestock_animals', animalId));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `livestock_animals/${animalId}`);
      }
    } else {
      const list = await this.fetchAllAnimals();
      localStorage.setItem(LOCAL_ANIMALS_KEY, JSON.stringify(list.filter(a => a.id !== animalId)));

      const tasks = await this.fetchAllTasks();
      localStorage.setItem(LOCAL_TASKS_KEY, JSON.stringify(tasks.filter(t => t.targetId !== animalId)));
    }
  },

  // ─────────────────────────────────────────────────────────────────
  // BATCHES SERVICE (Flock / Batch Entry Mode)
  // ─────────────────────────────────────────────────────────────────
  async fetchAllBatches(): Promise<LivestockBatch[]> {
    if (isCloud()) {
      try {
        const snap = await getDocs(collection(db, 'livestock_batches'));
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() })) as LivestockBatch[];
        mergeCachedItems(LOCAL_BATCHES_KEY, list);
        return list;
      } catch (err) {
        if (!isPermissionError(err)) {
          console.warn("Offline fallback triggered for fetchAllBatches. Using local storage cache:", err);
        }
        try {
          return JSON.parse(localStorage.getItem(LOCAL_BATCHES_KEY) || '[]');
        } catch {
          return [];
        }
      }
    } else {
      try {
        return JSON.parse(localStorage.getItem(LOCAL_BATCHES_KEY) || '[]');
      } catch {
        return [];
      }
    }
  },

  async fetchBatches(farmId: string): Promise<LivestockBatch[]> {
    if (isCloud()) {
      try {
        const q = query(collection(db, 'livestock_batches'), where('farmId', '==', farmId));
        const snap = await getDocs(q);
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() })) as LivestockBatch[];
        mergeCachedItems(LOCAL_BATCHES_KEY, list);
        return list;
      } catch (err) {
        if (!isPermissionError(err)) {
          console.warn(`Offline fallback triggered for fetchBatches(${farmId}). Using local storage cache:`, err);
        }
        const all = await this.fetchAllBatches();
        return all.filter(b => b.farmId === farmId);
      }
    } else {
      const all = await this.fetchAllBatches();
      return all.filter(b => b.farmId === farmId);
    }
  },

  async createBatch(batch: Partial<LivestockBatch>): Promise<LivestockBatch> {
    const newBatch: LivestockBatch = {
      id: 'batch_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      farmId: batch.farmId || '',
      batchName: batch.batchName || '',
      species: batch.species || 'Poultry',
      quantity: batch.quantity || 100,
      arrivalDate: batch.arrivalDate || new Date().toISOString().split('T')[0],
      breed: batch.breed,
      entryType: 'batch',
      status: 'Active',
      createdAt: Date.now()
    };

    if (isCloud()) {
      try {
        await setDoc(doc(db, 'livestock_batches', newBatch.id), cleanUndefined(newBatch));
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `livestock_batches/${newBatch.id}`);
      }
    } else {
      const list = await this.fetchAllBatches();
      list.push(newBatch);
      localStorage.setItem(LOCAL_BATCHES_KEY, JSON.stringify(list));
    }

    await this.autoGenerateSchedulesForBatch(newBatch);

    return newBatch;
  },

  async autoGenerateSchedulesForBatch(batch: LivestockBatch) {
    const arrDate = batch.arrivalDate || new Date().toISOString().split('T')[0];
    const tasksToSchedule: Partial<LivestockTask>[] = [];

    if (batch.species === 'Poultry') {
      tasksToSchedule.push({
        serviceType: 'Newcastle Disease Vaccination (LaSota)',
        dueDate: addDays(arrDate, 7)
      });
      tasksToSchedule.push({
        serviceType: 'Infectious Bursal Disease Vaccine (Gumboro)',
        dueDate: addDays(arrDate, 14)
      });
      tasksToSchedule.push({
        serviceType: 'Newcastle Disease Booster Vaccine',
        dueDate: addDays(arrDate, 24)
      });
      tasksToSchedule.push({
        serviceType: 'Growth Tracking & Water Hygiene Audit',
        dueDate: addDays(arrDate, 28)
      });
      tasksToSchedule.push({
        serviceType: 'Final Pre-Market Health Audit',
        dueDate: addDays(arrDate, 38)
      });
    } else {
      tasksToSchedule.push({
        serviceType: 'Batch Acclimatization Inspection',
        dueDate: addDays(arrDate, 3)
      });
      tasksToSchedule.push({
        serviceType: 'Batch Deworming Cycle',
        dueDate: addDays(arrDate, 30)
      });
    }

    for (const task of tasksToSchedule) {
      await this.createTask({
        farmId: batch.farmId,
        targetId: batch.id,
        targetType: 'batch',
        targetName: `${batch.batchName} (${batch.quantity} birds)`,
        serviceType: task.serviceType,
        dueDate: task.dueDate,
        status: 'Pending',
        createdBy: 'system'
      });
    }
  },

  async updateBatch(batchId: string, updates: Partial<LivestockBatch>): Promise<void> {
    if (isCloud()) {
      try {
        await updateDoc(doc(db, 'livestock_batches', batchId), cleanUndefined(updates));
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `livestock_batches/${batchId}`);
      }
    } else {
      const list = await this.fetchAllBatches();
      const idx = list.findIndex(b => b.id === batchId);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...updates };
        localStorage.setItem(LOCAL_BATCHES_KEY, JSON.stringify(list));
      }
    }
  },

  async deleteBatch(batchId: string): Promise<void> {
    if (isCloud()) {
      try {
        await deleteDoc(doc(db, 'livestock_batches', batchId));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `livestock_batches/${batchId}`);
      }
    } else {
      const list = await this.fetchAllBatches();
      localStorage.setItem(LOCAL_BATCHES_KEY, JSON.stringify(list.filter(b => b.id !== batchId)));

      const tasks = await this.fetchAllTasks();
      localStorage.setItem(LOCAL_TASKS_KEY, JSON.stringify(tasks.filter(t => t.targetId !== batchId)));
    }
  },

  // ─────────────────────────────────────────────────────────────────
  // TASKS / REMINDER SERVICE
  // ─────────────────────────────────────────────────────────────────
  async fetchAllTasks(): Promise<LivestockTask[]> {
    if (isCloud()) {
      try {
        const snap = await getDocs(collection(db, 'livestock_tasks'));
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() })) as LivestockTask[];
        mergeCachedItems(LOCAL_TASKS_KEY, list);
        return list;
      } catch (err) {
        if (!isPermissionError(err)) {
          console.warn("Offline fallback triggered for fetchAllTasks. Using local storage cache:", err);
        }
        try {
          return JSON.parse(localStorage.getItem(LOCAL_TASKS_KEY) || '[]');
        } catch {
          return [];
        }
      }
    } else {
      try {
        return JSON.parse(localStorage.getItem(LOCAL_TASKS_KEY) || '[]');
      } catch {
        return [];
      }
    }
  },

  async fetchTasks(farmId: string): Promise<LivestockTask[]> {
    if (isCloud()) {
      try {
        const q = query(collection(db, 'livestock_tasks'), where('farmId', '==', farmId));
        const snap = await getDocs(q);
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() })) as LivestockTask[];
        mergeCachedItems(LOCAL_TASKS_KEY, list);
        return list;
      } catch (err) {
        if (!isPermissionError(err)) {
          console.warn(`Offline fallback triggered for fetchTasks(${farmId}). Using local storage cache:`, err);
        }
        const all = await this.fetchAllTasks();
        return all.filter(t => t.farmId === farmId);
      }
    } else {
      const all = await this.fetchAllTasks();
      return all.filter(t => t.farmId === farmId);
    }
  },

  async createTask(task: Partial<LivestockTask>): Promise<LivestockTask> {
    const newTask: LivestockTask = {
      id: 'task_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      farmId: task.farmId || '',
      targetId: task.targetId || '',
      targetType: task.targetType || 'individual',
      targetName: task.targetName || '',
      serviceType: task.serviceType || 'General Checkup',
      dueDate: task.dueDate || new Date().toISOString().split('T')[0],
      status: task.status || 'Pending',
      completedDate: task.completedDate,
      vaccineUsed: task.vaccineUsed,
      notes: task.notes,
      createdBy: task.createdBy || 'manual',
      completedByUid: task.completedByUid,
      completedByName: task.completedByName,
      createdAt: Date.now(),
      autoScheduleNext: task.autoScheduleNext
    };

    if (isCloud()) {
      try {
        await setDoc(doc(db, 'livestock_tasks', newTask.id), cleanUndefined(newTask));
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `livestock_tasks/${newTask.id}`);
      }
    } else {
      const list = await this.fetchAllTasks();
      list.push(newTask);
      localStorage.setItem(LOCAL_TASKS_KEY, JSON.stringify(list));
    }
    return newTask;
  },

  async updateTask(taskId: string, updates: Partial<LivestockTask>): Promise<void> {
    if (isCloud()) {
      try {
        await updateDoc(doc(db, 'livestock_tasks', taskId), cleanUndefined(updates));
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `livestock_tasks/${taskId}`);
      }
    } else {
      const list = await this.fetchAllTasks();
      const idx = list.findIndex(t => t.id === taskId);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...updates };
        localStorage.setItem(LOCAL_TASKS_KEY, JSON.stringify(list));
      }
    }
  },

  async deleteTask(taskId: string): Promise<void> {
    if (isCloud()) {
      try {
        await deleteDoc(doc(db, 'livestock_tasks', taskId));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `livestock_tasks/${taskId}`);
      }
    } else {
      const list = await this.fetchAllTasks();
      localStorage.setItem(LOCAL_TASKS_KEY, JSON.stringify(list.filter(t => t.id !== taskId)));
    }
  },

  async completeTask(taskId: string, details: { completedByUid: string, completedByName: string, vaccineUsed?: string, notes?: string }): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const updatePayload: Partial<LivestockTask> = {
      status: 'Completed',
      completedDate: today,
      completedByUid: details.completedByUid,
      completedByName: details.completedByName,
      vaccineUsed: details.vaccineUsed,
      notes: details.notes
    };

    let currentTask: LivestockTask | null = null;
    const all = await this.fetchAllTasks();
    currentTask = all.find(t => t.id === taskId) || null;

    await this.updateTask(taskId, updatePayload);

    if (currentTask && currentTask.autoScheduleNext) {
      const nextDueStr = addMonths(today, 6);
      await this.createTask({
        farmId: currentTask.farmId,
        targetId: currentTask.targetId,
        targetType: currentTask.targetType,
        targetName: currentTask.targetName,
        serviceType: `Booster Vaccination (Routine Cycle)`,
        dueDate: nextDueStr,
        status: 'Pending',
        createdBy: 'system',
        autoScheduleNext: true
      });
    }
  },

  // ─────────────────────────────────────────────────────────────────
  // COMPREHENSIVE INDIVIDUAL ANIMAL RECORDS SERVICE
  // ─────────────────────────────────────────────────────────────────
  async fetchIndividualRecordById(id: string): Promise<IndividualAnimalRecord | null> {
    if (isCloud()) {
      try {
        const snap = await getDoc(doc(db, 'livestock_individual_records', id));
        if (snap.exists()) {
          const item = { id: snap.id, ...snap.data() } as IndividualAnimalRecord;
          mergeCachedItems(LOCAL_INDIVIDUAL_RECORDS_KEY, [item]);
          return item;
        }
        return null;
      } catch (err) {
        if (!isPermissionError(err)) {
          console.warn(`Offline fallback triggered for fetchIndividualRecordById(${id}). Using local storage cache:`, err);
        }
        const all = await this.fetchAllIndividualRecords();
        return all.find(r => r.id === id) || null;
      }
    } else {
      const all = await this.fetchAllIndividualRecords();
      return all.find(r => r.id === id) || null;
    }
  },

  async fetchAllIndividualRecords(): Promise<IndividualAnimalRecord[]> {
    if (isCloud()) {
      try {
        const snap = await getDocs(collection(db, 'livestock_individual_records'));
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() })) as IndividualAnimalRecord[];
        mergeCachedItems(LOCAL_INDIVIDUAL_RECORDS_KEY, list);
        return list;
      } catch (err) {
        if (!isPermissionError(err)) {
          console.warn("Offline fallback triggered for fetchAllIndividualRecords. Using local storage cache:", err);
        }
        try {
          return JSON.parse(localStorage.getItem(LOCAL_INDIVIDUAL_RECORDS_KEY) || '[]');
        } catch {
          return [];
        }
      }
    } else {
      try {
        return JSON.parse(localStorage.getItem(LOCAL_INDIVIDUAL_RECORDS_KEY) || '[]');
      } catch {
        return [];
      }
    }
  },

  async fetchIndividualRecords(farmId: string): Promise<IndividualAnimalRecord[]> {
    if (isCloud()) {
      try {
        const q = query(collection(db, 'livestock_individual_records'), where('farmId', '==', farmId));
        const snap = await getDocs(q);
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() })) as IndividualAnimalRecord[];
        mergeCachedItems(LOCAL_INDIVIDUAL_RECORDS_KEY, list);
        return list;
      } catch (err) {
        if (!isPermissionError(err)) {
          console.warn(`Offline fallback triggered for fetchIndividualRecords(${farmId}). Using local storage cache:`, err);
        }
        const all = await this.fetchAllIndividualRecords();
        return all.filter(r => r.farmId === farmId);
      }
    } else {
      const all = await this.fetchAllIndividualRecords();
      return all.filter(r => r.farmId === farmId);
    }
  },

  async createIndividualRecord(record: Partial<IndividualAnimalRecord>): Promise<IndividualAnimalRecord> {
    const newRecord: IndividualAnimalRecord = {
      id: 'indrec_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      farmId: record.farmId || '',
      createdAt: Date.now(),
      
      animalId: record.animalId || '',
      earTagNumber: record.earTagNumber || '',
      name: record.name || '',
      species: record.species || 'Cattle',
      breed: record.breed || '',
      sex: record.sex || '',
      colorMarkings: record.colorMarkings || '',
      dob: record.dob || '',
      age: record.age || '',
      source: record.source || '',
      purchaseDate: record.purchaseDate || '',
      purchasePrice: record.purchasePrice || null,
      
      sireId: record.sireId || '',
      damId: record.damId || '',
      breedOfSire: record.breedOfSire || '',
      breedOfDam: record.breedOfDam || '',
      generation: record.generation || '',
      
      bodyWeight: record.bodyWeight || null,
      bcs: record.bcs || '',
      heightAtWithers: record.heightAtWithers || '',
      heartGirth: record.heartGirth || '',
      hornStatus: record.hornStatus || '',
      identificationMarks: record.identificationMarks || '',
      
      pubertyDate: record.pubertyDate || '',
      estrusDates: record.estrusDates || '',
      serviceDate: record.serviceDate || '',
      aiOrNatural: record.aiOrNatural || '',
      bullOrBuckUsed: record.bullOrBuckUsed || '',
      pregnancyDiagDate: record.pregnancyDiagDate || '',
      expectedParturition: record.expectedParturition || '',
      actualParturition: record.actualParturition || '',
      typeOfBirth: record.typeOfBirth || '',
      calvingDifficulty: record.calvingDifficulty || '',
      placentaExpulsionTime: record.placentaExpulsionTime || '',
      
      breedingSoundnessDate: record.breedingSoundnessDate || '',
      semenEvaluation: record.semenEvaluation || '',
      breedingSeason: record.breedingSeason || '',
      femalesServedCount: record.femalesServedCount || null,
      
      offspringId: record.offspringId || '',
      offspringBirthDate: record.offspringBirthDate || '',
      offspringSex: record.offspringSex || '',
      offspringBirthWeight: record.offspringBirthWeight || null,
      offspringWeaningWeight: record.offspringWeaningWeight || null,
      offspringRemarks: record.offspringRemarks || '',
      
      healthRecords: record.healthRecords || [],
      vaccinationRecords: record.vaccinationRecords || [],
      dewormingRecords: record.dewormingRecords || [],
      parasiteRecords: record.parasiteRecords || [],
      
      feedingGroup: record.feedingGroup || '',
      dailyConcentrate: record.dailyConcentrate || '',
      greenFodder: record.greenFodder || '',
      dryFodder: record.dryFodder || '',
      mineralMixture: record.mineralMixture || '',
      waterIntake: record.waterIntake || '',
      
      morningMilk: record.morningMilk || null,
      eveningMilk: record.eveningMilk || null,
      totalMilk: record.totalMilk || null,
      bodyWeightMeat: record.bodyWeightMeat || null,
      adg: record.adg || null,
      
      servicesPerConception: record.servicesPerConception || null,
      ageAtFirstService: record.ageAtFirstService || '',
      ageAtFirstParturition: record.ageAtFirstParturition || '',
      calvingInterval: record.calvingInterval || '',
      daysOpen: record.daysOpen || '',
      
      labRecords: record.labRecords || [],
      surgicalRecords: record.surgicalRecords || [],
      
      mortalityDate: record.mortalityDate || '',
      mortalityReason: record.mortalityReason || '',
      necropsyDetails: record.necropsyDetails || '',
      disposalMethod: record.disposalMethod || '',
      
      finPurchase: record.finPurchase || null,
      finFeed: record.finFeed || null,
      finMedicine: record.finMedicine || null,
      finLabor: record.finLabor || null,
      finMilkIncome: record.finMilkIncome || null,
      finSaleIncome: record.finSaleIncome || null,
      
      notes: record.notes || '',
      dailyMonitoring: record.dailyMonitoring || []
    };

    if (isCloud()) {
      try {
        await setDoc(doc(db, 'livestock_individual_records', newRecord.id), cleanUndefined(newRecord));
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `livestock_individual_records/${newRecord.id}`);
      }
    } else {
      const list = await this.fetchAllIndividualRecords();
      list.push(newRecord);
      localStorage.setItem(LOCAL_INDIVIDUAL_RECORDS_KEY, JSON.stringify(list));
    }
    return newRecord;
  },

  async updateIndividualRecord(id: string, updates: Partial<IndividualAnimalRecord>): Promise<void> {
    if (isCloud()) {
      try {
        await updateDoc(doc(db, 'livestock_individual_records', id), cleanUndefined(updates));
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `livestock_individual_records/${id}`);
      }
    } else {
      const list = await this.fetchAllIndividualRecords();
      const idx = list.findIndex(r => r.id === id);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...updates };
        localStorage.setItem(LOCAL_INDIVIDUAL_RECORDS_KEY, JSON.stringify(list));
      }
    }
  },

  async deleteIndividualRecord(id: string): Promise<void> {
    if (isCloud()) {
      try {
        await deleteDoc(doc(db, 'livestock_individual_records', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `livestock_individual_records/${id}`);
      }
    } else {
      const list = await this.fetchAllIndividualRecords();
      localStorage.setItem(LOCAL_INDIVIDUAL_RECORDS_KEY, JSON.stringify(list.filter(r => r.id !== id)));
    }
  },

  // ─────────────────────────────────────────────────────────────────
  // COMPREHENSIVE HERD MASTER RECORDS SERVICE
  // ─────────────────────────────────────────────────────────────────
  async fetchAllHerdRecords(): Promise<HerdLevelMasterRecord[]> {
    if (isCloud()) {
      try {
        const snap = await getDocs(collection(db, 'livestock_herd_records'));
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() })) as HerdLevelMasterRecord[];
        mergeCachedItems(LOCAL_HERD_RECORDS_KEY, list);
        return list;
      } catch (err) {
        if (!isPermissionError(err)) {
          console.warn("Offline fallback triggered for fetchAllHerdRecords. Using local storage cache:", err);
        }
        try {
          return JSON.parse(localStorage.getItem(LOCAL_HERD_RECORDS_KEY) || '[]');
        } catch {
          return [];
        }
      }
    } else {
      try {
        return JSON.parse(localStorage.getItem(LOCAL_HERD_RECORDS_KEY) || '[]');
      } catch {
        return [];
      }
    }
  },

  async fetchHerdRecords(farmId: string): Promise<HerdLevelMasterRecord[]> {
    if (isCloud()) {
      try {
        const q = query(collection(db, 'livestock_herd_records'), where('farmId', '==', farmId));
        const snap = await getDocs(q);
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() })) as HerdLevelMasterRecord[];
        mergeCachedItems(LOCAL_HERD_RECORDS_KEY, list);
        return list;
      } catch (err) {
        if (!isPermissionError(err)) {
          console.warn(`Offline fallback triggered for fetchHerdRecords(${farmId}). Using local storage cache:`, err);
        }
        const all = await this.fetchAllHerdRecords();
        return all.filter(r => r.farmId === farmId);
      }
    } else {
      const all = await this.fetchAllHerdRecords();
      return all.filter(r => r.farmId === farmId);
    }
  },

  async createHerdRecord(record: Partial<HerdLevelMasterRecord>): Promise<HerdLevelMasterRecord> {
    const newRecord: HerdLevelMasterRecord = {
      id: 'herdrec_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      farmId: record.farmId || '',
      createdAt: Date.now(),
      
      farmName: record.farmName || '',
      farmManager: record.farmManager || '',
      species: record.species || 'Cattle',
      breeds: record.breeds || '',
      totalHerdSize: record.totalHerdSize || 0,
      dateUpdated: record.dateUpdated || new Date().toISOString().split('T')[0],
      
      inventory: record.inventory || {
        adultMales: 0,
        adultFemales: 0,
        pregnantQty: 0,
        lactatingQty: 0,
        dryQty: 0,
        youngQty: 0,
        replacementQty: 0,
        sickQty: 0
      },
      
      reproductive: record.reproductive || {
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
      
      monthlyProduction: record.monthlyProduction || [],
      
      feedUsage: record.feedUsage || {
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
      
      vaccinations: record.vaccinations || [],
      dewormings: record.dewormings || [],
      diseases: record.diseases || [],
      mortalities: record.mortalities || [],
      culled: record.culled || [],
      
      gAvgBirthWeight: record.gAvgBirthWeight || null,
      gAvgWeaningWeight: record.gAvgWeaningWeight || null,
      gAvgAdultWeight: record.gAvgAdultWeight || null,
      
      finances: record.finances || {
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
      
      kpis: record.kpis || {
        mortalityPctTarget: 0,
        mortalityPctActual: 0,
        conceptionPctTarget: 0,
        conceptionPctActual: 0,
        calvingPctTarget: 0,
        calvingPctActual: 0,
        adgTarget: 0,
        adgActual: 0,
        milkYieldTarget: 0,
        milkYieldActual: 0,
        fcrTarget: 0,
        fcrActual: 0
      }
    };

    if (isCloud()) {
      try {
        await setDoc(doc(db, 'livestock_herd_records', newRecord.id), cleanUndefined(newRecord));
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `livestock_herd_records/${newRecord.id}`);
      }
    } else {
      const list = await this.fetchAllHerdRecords();
      list.push(newRecord);
      localStorage.setItem(LOCAL_HERD_RECORDS_KEY, JSON.stringify(list));
    }
    return newRecord;
  },

  async updateHerdRecord(id: string, updates: Partial<HerdLevelMasterRecord>): Promise<void> {
    if (isCloud()) {
      try {
        await updateDoc(doc(db, 'livestock_herd_records', id), cleanUndefined(updates));
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `livestock_herd_records/${id}`);
      }
    } else {
      const list = await this.fetchAllHerdRecords();
      const idx = list.findIndex(r => r.id === id);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...updates };
        localStorage.setItem(LOCAL_HERD_RECORDS_KEY, JSON.stringify(list));
      }
    }
  },

  async deleteHerdRecord(id: string): Promise<void> {
    if (isCloud()) {
      try {
        await deleteDoc(doc(db, 'livestock_herd_records', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `livestock_herd_records/${id}`);
      }
    } else {
      const list = await this.fetchAllHerdRecords();
      localStorage.setItem(LOCAL_HERD_RECORDS_KEY, JSON.stringify(list.filter(r => r.id !== id)));
    }
  }
}
