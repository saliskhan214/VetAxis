import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calculator, 
  Droplet, 
  Activity, 
  ShieldAlert, 
  Utensils, 
  Calendar, 
  TrendingUp, 
  Copy, 
  Check, 
  AlertTriangle, 
  Search, 
  BookOpen, 
  Sparkles,
  Info,
  ChevronRight,
  Clock,
  Heart,
  FileText,
  Plus,
  Trash2,
  Edit3,
  Sliders,
  RotateCcw
} from 'lucide-react';
import { 
  VETERINARY_DRUG_DATABASE, 
  DrugReference,
  SPECIES_VITALS_MATRIX, 
  calculateFluidTherapy, 
  calculatePetEnergyRequirements, 
  TOXIC_SUBSTANCE_DATABASE, 
  calculateLivestockGestation, 
  calculateDairyFarmEconomics,
  PetLifeStage,
  PET_ENERGY_FACTORS
} from '../lib/veterinaryFormulas';
import { UserProfile } from '../types';

interface VeterinaryClinicalSuiteProps {
  currentUser?: UserProfile | null;
  onNavigate?: (section: string) => void;
  initialTab?: 'wave1' | 'wave2' | 'wave3' | 'wave4';
}

const LOCAL_STORAGE_CUSTOM_DRUGS_KEY = 'vetaxis_custom_drugs_v1';

export function VeterinaryClinicalSuite({
  currentUser,
  onNavigate,
  initialTab = 'wave1'
}: VeterinaryClinicalSuiteProps) {
  // Main Wave Selector
  const [activeWave, setActiveWave] = useState<'wave1' | 'wave2' | 'wave3' | 'wave4'>(initialTab);

  // Sub-tab selectors for each wave
  const [wave1SubTab, setWave1SubTab] = useState<'drug_dosing' | 'fluid_therapy' | 'vitals_matrix'>('drug_dosing');
  const [wave2SubTab, setWave2SubTab] = useState<'calorie_calc' | 'toxicity_checker' | 'vaccine_schedule' | 'age_calc'>('calorie_calc');
  const [wave3SubTab, setWave3SubTab] = useState<'gestation_timeline' | 'dairy_economics' | 'mastitis_cmt'>('gestation_timeline');
  const [wave4SubTab, setWave4SubTab] = useState<'pet_ds' | 'blood_ranges' | 'travel_iata' | 'safe_adoption'>('pet_ds');

  // Wave 4 state: Blood normal ranges search & filter
  const [bloodSearchQuery, setBloodSearchQuery] = useState('');
  const [bloodSpeciesFilter, setBloodSpeciesFilter] = useState<'all' | 'canine' | 'feline'>('all');

  // Wave 4 state: IATA pet crate calculator
  const [petLengthA, setPetLengthA] = useState<number>(65); // nose to root of tail in cm
  const [petElbowB, setPetElbowB] = useState<number>(25); // elbow to ground in cm
  const [petWidthC, setPetWidthC] = useState<number>(24); // across shoulders in cm
  const [petHeightD, setPetHeightD] = useState<number>(55); // ground to tip of ears in cm

  // Automatically check URL parameters (?sub= or ?guide=)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const sub = params.get('sub') || params.get('guide');
      if (sub) {
        if (sub === 'pet_ds' || sub === 'parvo' || sub === 'ckd' || sub === 'bloat') {
          setActiveWave('wave4');
          setWave4SubTab('pet_ds');
        } else if (sub === 'blood_chart' || sub === 'blood_ranges') {
          setActiveWave('wave4');
          setWave4SubTab('blood_ranges');
        } else if (sub === 'travel_guidelines' || sub === 'iata' || sub === 'travel') {
          setActiveWave('wave4');
          setWave4SubTab('travel_iata');
        } else if (sub === 'safe_buying' || sub === 'safe_adoption' || sub === 'scams') {
          setActiveWave('wave4');
          setWave4SubTab('safe_adoption');
        }
      }
    } catch {
      // ignore
    }
  }, []);

  // Copy feedback state
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  // ----------------------------------------------------
  // WAVE 1: CLINICAL PRACTICE SUITE STATES & CUSTOM DRUGS
  // ----------------------------------------------------
  // Custom user-added drugs persisted in localStorage
  const [customDrugs, setCustomDrugs] = useState<DrugReference[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_CUSTOM_DRUGS_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_CUSTOM_DRUGS_KEY, JSON.stringify(customDrugs));
    } catch (e) {
      console.error('Failed to save custom drugs to localStorage', e);
    }
  }, [customDrugs]);

  // Merge built-in database + custom user drugs
  const allDrugs = useMemo(() => {
    return [...VETERINARY_DRUG_DATABASE, ...customDrugs];
  }, [customDrugs]);

  // Drug Dosing states
  const [drugSpecies, setDrugSpecies] = useState<'dog' | 'cat' | 'cattle' | 'buffalo' | 'goat' | 'sheep' | 'horse'>('dog');
  const [drugSearch, setDrugSearch] = useState<string>('');
  const [selectedDrugId, setSelectedDrugId] = useState<string>('amox_clav');
  const [patientWeightKg, setPatientWeightKg] = useState<number>(10);
  const [customDoseMgKg, setCustomDoseMgKg] = useState<number | ''>('');
  const [selectedConcentrationIdx, setSelectedConcentrationIdx] = useState<number>(0);

  // Custom Formulation Mode (allows entering custom bottle/ampoule/tablet strength)
  const [isCustomConcentrationMode, setIsCustomConcentrationMode] = useState<boolean>(false);
  const [customConcValue, setCustomConcValue] = useState<number | ''>('');
  const [customConcUnit, setCustomConcUnit] = useState<'mg/mL' | 'mg/tablet' | 'IU/mL' | 'mcg/mL'>('mg/mL');
  const [customConcLabel, setCustomConcLabel] = useState<string>('');

  // Modal State for adding a brand new medicine
  const [showAddDrugModal, setShowAddDrugModal] = useState<boolean>(false);
  const [newDrugName, setNewDrugName] = useState<string>('');
  const [newDrugCategory, setNewDrugCategory] = useState<DrugReference['category']>('Antibiotic');
  const [newDrugSpecies, setNewDrugSpecies] = useState<('dog' | 'cat' | 'cattle' | 'buffalo' | 'goat' | 'sheep' | 'horse')[]>(['dog', 'cat', 'cattle']);
  const [newDrugDoseDefault, setNewDrugDoseDefault] = useState<number>(10);
  const [newDrugDoseMin, setNewDrugDoseMin] = useState<number>(5);
  const [newDrugDoseMax, setNewDrugDoseMax] = useState<number>(15);
  const [newDrugRoute, setNewDrugRoute] = useState<string>('IM / SC');
  const [newDrugFrequency, setNewDrugFrequency] = useState<string>('q24h (SID)');
  const [newDrugInstructions, setNewDrugInstructions] = useState<string>('Administer with veterinary oversight.');
  const [newDrugConcStrength, setNewDrugConcStrength] = useState<number>(100);
  const [newDrugConcUnit, setNewDrugConcUnit] = useState<'mg/mL' | 'mg/tablet'>('mg/mL');
  const [newDrugConcLabel, setNewDrugConcLabel] = useState<string>('Standard 100 mg/mL Vial');
  const [newDrugContraindications, setNewDrugContraindications] = useState<string>('');
  const [newDrugClinicalNotes, setNewDrugClinicalNotes] = useState<string>('');

  const handleSaveCustomDrug = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDrugName.trim()) return;

    const newId = `custom_drug_${Date.now()}`;
    const defaultDoseMap: DrugReference['defaultDoseMgKg'] = {};
    newDrugSpecies.forEach(sp => {
      defaultDoseMap[sp] = {
        min: newDrugDoseMin || (newDrugDoseDefault * 0.8),
        max: newDrugDoseMax || (newDrugDoseDefault * 1.5),
        default: newDrugDoseDefault || 10,
        frequency: newDrugFrequency || 'q24h (SID)',
        route: newDrugRoute || 'IM / SC',
        instructions: newDrugInstructions || 'Follow clinical guidance.'
      };
    });

    const createdDrug: DrugReference = {
      id: newId,
      name: newDrugName.trim(),
      category: newDrugCategory,
      species: newDrugSpecies.length > 0 ? newDrugSpecies : ['dog', 'cat', 'cattle', 'buffalo', 'goat', 'sheep', 'horse'],
      defaultDoseMgKg: defaultDoseMap,
      commonConcentrations: [
        {
          label: newDrugConcLabel.trim() || `${newDrugConcStrength} ${newDrugConcUnit}`,
          valueMgPerUnit: Number(newDrugConcStrength) || 100,
          unit: newDrugConcUnit
        }
      ],
      contraindications: newDrugContraindications.trim() || 'No specific contraindications logged. Review manufacturer insert.',
      clinicalNotes: newDrugClinicalNotes.trim() || 'Custom clinician added medicine.'
    };

    setCustomDrugs(prev => [createdDrug, ...prev]);
    setSelectedDrugId(newId);
    setCustomDoseMgKg('');
    setIsCustomConcentrationMode(false);
    setSelectedConcentrationIdx(0);
    setShowAddDrugModal(false);

    // Reset Form
    setNewDrugName('');
    setNewDrugContraindications('');
    setNewDrugClinicalNotes('');
  };

  const handleDeleteCustomDrug = (drugId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Remove this custom medicine from your local drug library?')) {
      setCustomDrugs(prev => prev.filter(d => d.id !== drugId));
      if (selectedDrugId === drugId) {
        setSelectedDrugId('amox_clav');
        setSelectedConcentrationIdx(0);
        setCustomDoseMgKg('');
      }
    }
  };

  const selectedDrug = useMemo(() => {
    return allDrugs.find(d => d.id === selectedDrugId) || allDrugs[0] || VETERINARY_DRUG_DATABASE[0];
  }, [selectedDrugId, allDrugs]);

  const filteredDrugs = useMemo(() => {
    return allDrugs.filter(d => {
      const matchSpecies = d.species.includes(drugSpecies);
      const matchSearch = d.name.toLowerCase().includes(drugSearch.toLowerCase()) || 
                          d.category.toLowerCase().includes(drugSearch.toLowerCase());
      return matchSpecies && matchSearch;
    });
  }, [allDrugs, drugSpecies, drugSearch]);

  const speciesDoseInfo = selectedDrug.defaultDoseMgKg[drugSpecies] || Object.values(selectedDrug.defaultDoseMgKg)[0] || {
    min: 5,
    max: 15,
    default: 10,
    frequency: 'q24h (SID)',
    route: 'IM / SC',
    instructions: 'Observe clinical standard.'
  };

  const activeDoseMgKg = customDoseMgKg !== '' ? Number(customDoseMgKg) : (speciesDoseInfo?.default || 10);
  const totalMgDose = patientWeightKg * activeDoseMgKg;

  // Concentration calculation (standard preset vs custom entered vial strength)
  const currentConcentration = selectedDrug.commonConcentrations[selectedConcentrationIdx] || selectedDrug.commonConcentrations[0] || {
    label: 'Standard',
    valueMgPerUnit: 100,
    unit: 'mg/mL' as const
  };

  const effectiveConcentrationValue = isCustomConcentrationMode && customConcValue !== '' && Number(customConcValue) > 0
    ? Number(customConcValue)
    : currentConcentration.valueMgPerUnit;

  const effectiveUnit = isCustomConcentrationMode
    ? customConcUnit
    : currentConcentration.unit;

  const calculatedVolumeOrUnits = effectiveConcentrationValue > 0
    ? (totalMgDose / effectiveConcentrationValue)
    : 0;

  const isSelectedDrugCustom = useMemo(() => {
    return customDrugs.some(d => d.id === selectedDrug.id);
  }, [customDrugs, selectedDrug]);

  // Fluid Therapy State
  const [fluidSpecies, setFluidSpecies] = useState<'dog' | 'cat' | 'large_animal'>('dog');
  const [fluidWeightKg, setFluidWeightKg] = useState<number>(12);
  const [dehydrationPercent, setDehydrationPercent] = useState<number>(6);
  const [deliveryHours, setDeliveryHours] = useState<number>(24);
  const [ongoingLossesMl, setOngoingLossesMl] = useState<number>(100);
  const [dripFactor, setDripFactor] = useState<10 | 15 | 20 | 60>(15);

  const fluidResults = useMemo(() => {
    return calculateFluidTherapy(
      fluidWeightKg,
      dehydrationPercent,
      deliveryHours,
      ongoingLossesMl,
      dripFactor,
      fluidSpecies
    );
  }, [fluidWeightKg, dehydrationPercent, deliveryHours, ongoingLossesMl, dripFactor, fluidSpecies]);

  // Vitals Matrix State
  const [selectedVitalsSpecies, setSelectedVitalsSpecies] = useState<string>('dog');
  const currentVitals = SPECIES_VITALS_MATRIX[selectedVitalsSpecies] || SPECIES_VITALS_MATRIX['dog'];

  // ----------------------------------------------------
  // WAVE 2: PET PARENT SUITE STATES
  // ----------------------------------------------------
  // Calorie & Portion
  const [petSpecies, setPetSpecies] = useState<'dog' | 'cat'>('dog');
  const [petWeightKg, setPetWeightKg] = useState<number>(12);
  const [petLifeStage, setPetLifeStage] = useState<PetLifeStage>('neutered_adult');
  const [kibbleCalDensity, setKibbleCalDensity] = useState<number>(375);

  const energyResults = useMemo(() => {
    return calculatePetEnergyRequirements(petSpecies, petWeightKg, petLifeStage, kibbleCalDensity);
  }, [petSpecies, petWeightKg, petLifeStage, kibbleCalDensity]);

  // Toxicity Search
  const [toxicSearchQuery, setToxicSearchQuery] = useState<string>('');
  const [selectedToxicityCategory, setSelectedToxicityCategory] = useState<string>('all');

  const filteredToxins = useMemo(() => {
    return TOXIC_SUBSTANCE_DATABASE.filter(t => {
      const matchesSearch = t.name.toLowerCase().includes(toxicSearchQuery.toLowerCase()) || 
                            t.toxicPrinciple.toLowerCase().includes(toxicSearchQuery.toLowerCase());
      const matchesCat = selectedToxicityCategory === 'all' || t.category === selectedToxicityCategory;
      return matchesSearch && matchesCat;
    });
  }, [toxicSearchQuery, selectedToxicityCategory]);

  // Pet Age Converter
  const [petAgeYears, setPetAgeYears] = useState<number>(3);
  const [canineSize, setCanineSize] = useState<'small' | 'medium' | 'large' | 'giant'>('medium');

  const humanAgeEstimate = useMemo(() => {
    if (petSpecies === 'cat') {
      if (petAgeYears <= 1) return 15;
      if (petAgeYears === 2) return 24;
      return 24 + (petAgeYears - 2) * 4;
    } else {
      // Canine size curves
      if (petAgeYears <= 1) return 15;
      if (petAgeYears === 2) return 24;
      const rate = canineSize === 'small' ? 4 : canineSize === 'medium' ? 5 : canineSize === 'large' ? 6 : 7.5;
      return Math.round(24 + (petAgeYears - 2) * rate);
    }
  }, [petSpecies, petAgeYears, canineSize]);

  // ----------------------------------------------------
  // WAVE 3: LIVESTOCK & DAIRY SUITE STATES
  // ----------------------------------------------------
  // Gestation Calculator
  const [gestationSpecies, setGestationSpecies] = useState<'cattle' | 'buffalo' | 'goat' | 'sheep' | 'horse'>('cattle');
  const [serviceDateInput, setServiceDateInput] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });

  const gestationResults = useMemo(() => {
    const d = new Date(serviceDateInput);
    const validDate = isNaN(d.getTime()) ? new Date() : d;
    return calculateLivestockGestation(gestationSpecies, validDate);
  }, [gestationSpecies, serviceDateInput]);

  // Dairy Economics
  const [milkingCowsCount, setMilkingCowsCount] = useState<number>(20);
  const [avgYieldLiters, setAvgYieldLiters] = useState<number>(18);
  const [milkPricePkr, setMilkPricePkr] = useState<number>(185);
  const [silageKgPerHead, setSilageKgPerHead] = useState<number>(22);
  const [silagePricePkr, setSilagePricePkr] = useState<number>(12);
  const [wandaKgPerHead, setWandaKgPerHead] = useState<number>(6);
  const [wandaPricePkr, setWandaPricePkr] = useState<number>(95);
  const [greenFodderKg, setGreenFodderKg] = useState<number>(20);
  const [greenFodderPrice, setGreenFodderPrice] = useState<number>(4);

  const dairyResults = useMemo(() => {
    return calculateDairyFarmEconomics(
      milkingCowsCount,
      avgYieldLiters,
      milkPricePkr,
      silageKgPerHead,
      silagePricePkr,
      wandaKgPerHead,
      wandaPricePkr,
      greenFodderKg,
      greenFodderPrice
    );
  }, [
    milkingCowsCount,
    avgYieldLiters,
    milkPricePkr,
    silageKgPerHead,
    silagePricePkr,
    wandaKgPerHead,
    wandaPricePkr,
    greenFodderKg,
    greenFodderPrice
  ]);

  return (
    <div className="space-y-8 animate-fadeIn text-[#3c3c3b]">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#2c3e35] via-[#3a5246] to-[#2c3e35] text-white p-6 sm:p-8 rounded-3xl border border-[#4a6b5a] shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-72 h-72 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg border border-emerald-400/30">
                ⭐ Peer-Reviewed Clinical Standards
              </span>
              <span className="text-stone-300 text-xs font-semibold">
                Plumb's • Merck • AAHA • WSAVA • NRC
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-black tracking-tight text-white flex items-center gap-3">
              <span>🧮</span> Veterinary & Pet Health Calculators
            </h1>
            <p className="text-xs sm:text-sm text-stone-200 mt-1 max-w-2xl font-medium leading-relaxed">
              Clinical drug dosage calculators, fluid therapy infusion rates, species physiological vitals, pet calorie portions, toxicity checker, and livestock gestation timelines.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-black/25 backdrop-blur-md p-1.5 rounded-2xl border border-white/10">
            <span className="text-[11px] font-bold text-stone-300 px-2">Quick Jump:</span>
            <button
              onClick={() => { setActiveWave('wave1'); setWave1SubTab('drug_dosing'); }}
              className="text-xs font-bold bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-xl transition-all cursor-pointer"
            >
              💊 Drug Dosing
            </button>
            <button
              onClick={() => { setActiveWave('wave1'); setWave1SubTab('fluid_therapy'); }}
              className="text-xs font-bold bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-xl transition-all cursor-pointer"
            >
              💧 IV Fluids
            </button>
            <button
              onClick={() => { setActiveWave('wave2'); setWave2SubTab('toxicity_checker'); }}
              className="text-xs font-bold bg-red-500/30 hover:bg-red-500/40 text-red-200 px-3 py-1.5 rounded-xl transition-all cursor-pointer"
            >
              ⚠️ Toxic Alert
            </button>
            <button
              onClick={() => { setActiveWave('wave4'); setWave4SubTab('pet_ds'); }}
              className="text-xs font-bold bg-emerald-500/30 hover:bg-emerald-500/40 text-emerald-200 px-3 py-1.5 rounded-xl transition-all cursor-pointer"
            >
              🔬 Pet DS & Lab
            </button>
          </div>
        </div>
      </div>

      {/* Main Category Tabs Selector */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <button
          onClick={() => setActiveWave('wave1')}
          className={`p-4 rounded-2xl border transition-all text-left cursor-pointer flex items-center gap-3.5 shadow-sm ${
            activeWave === 'wave1'
              ? 'bg-[#5a5a40] text-white border-[#5a5a40] border-b-[5px] border-b-[#3e3e2b]'
              : 'bg-white text-[#5a5a40] border-[#e3dec9] border-b-[3px] border-b-[#cdc6ad] hover:bg-[#fcf9f2]'
          }`}
        >
          <div className={`p-2.5 rounded-xl text-xl ${activeWave === 'wave1' ? 'bg-white/20' : 'bg-[#f4efe4]'}`}>
            🩺
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider block opacity-80">Clinical Care</span>
            <h2 className="text-sm font-black m-0 leading-tight">Clinical Practice Calculators</h2>
            <p className="text-[11px] opacity-75 mt-0.5">Drug dosages, IV fluid rates, and species vitals</p>
          </div>
        </button>

        <button
          onClick={() => setActiveWave('wave2')}
          className={`p-4 rounded-2xl border transition-all text-left cursor-pointer flex items-center gap-3.5 shadow-sm ${
            activeWave === 'wave2'
              ? 'bg-[#5a5a40] text-white border-[#5a5a40] border-b-[5px] border-b-[#3e3e2b]'
              : 'bg-white text-[#5a5a40] border-[#e3dec9] border-b-[3px] border-b-[#cdc6ad] hover:bg-[#fcf9f2]'
          }`}
        >
          <div className={`p-2.5 rounded-xl text-xl ${activeWave === 'wave2' ? 'bg-white/20' : 'bg-[#f4efe4]'}`}>
            🐾
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider block opacity-80">Pets & Nutrition</span>
            <h2 className="text-sm font-black m-0 leading-tight">Pet Nutrition & Health Tools</h2>
            <p className="text-[11px] opacity-75 mt-0.5">Calorie portions, toxic foods, and age calculator</p>
          </div>
        </button>

        <button
          onClick={() => setActiveWave('wave3')}
          className={`p-4 rounded-2xl border transition-all text-left cursor-pointer flex items-center gap-3.5 shadow-sm ${
            activeWave === 'wave3'
              ? 'bg-[#5a5a40] text-white border-[#5a5a40] border-b-[5px] border-b-[#3e3e2b]'
              : 'bg-white text-[#5a5a40] border-[#e3dec9] border-b-[3px] border-b-[#cdc6ad] hover:bg-[#fcf9f2]'
          }`}
        >
          <div className={`p-2.5 rounded-xl text-xl ${activeWave === 'wave3' ? 'bg-white/20' : 'bg-[#f4efe4]'}`}>
            🐄
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider block opacity-80">Farm & Livestock</span>
            <h2 className="text-sm font-black m-0 leading-tight">Livestock & Dairy Calculators</h2>
            <p className="text-[11px] opacity-75 mt-0.5">Gestation timelines, feed economics, and CMT matrix</p>
          </div>
        </button>

        <button
          onClick={() => setActiveWave('wave4')}
          className={`p-4 rounded-2xl border transition-all text-left cursor-pointer flex items-center gap-3.5 shadow-sm ${
            activeWave === 'wave4'
              ? 'bg-[#5a5a40] text-white border-[#5a5a40] border-b-[5px] border-b-[#3e3e2b]'
              : 'bg-white text-[#5a5a40] border-[#e3dec9] border-b-[3px] border-b-[#cdc6ad] hover:bg-[#fcf9f2]'
          }`}
        >
          <div className={`p-2.5 rounded-xl text-xl ${activeWave === 'wave4' ? 'bg-white/20' : 'bg-[#f4efe4]'}`}>
            🔬
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider block opacity-80">Diagnostics & DS</span>
            <h2 className="text-sm font-black m-0 leading-tight">Pet DS & Diagnostics Hub</h2>
            <p className="text-[11px] opacity-75 mt-0.5">Parvo, CKD stages, blood lab ranges, travel & IATA</p>
          </div>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* WAVE 1: CLINICAL VETS & FRESH DVM GRADUATE SUITE */}
      {/* ========================================================================= */}
      {activeWave === 'wave1' && (
        <div className="space-y-6">
          {/* Sub Navigation Bar */}
          <div className="flex items-center gap-2 border-b border-[#e3dec9] pb-3 overflow-x-auto">
            <button
              onClick={() => setWave1SubTab('drug_dosing')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border ${
                wave1SubTab === 'drug_dosing'
                  ? 'bg-[#2d4a39] text-white border-[#2d4a39] shadow-xs'
                  : 'bg-white text-[#5a5a40] border-[#e3dec9] hover:bg-[#fcf9f2]'
              }`}
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>Multi-Species Drug Dosing Calculator</span>
            </button>

            <button
              onClick={() => setWave1SubTab('fluid_therapy')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border ${
                wave1SubTab === 'fluid_therapy'
                  ? 'bg-[#2d4a39] text-white border-[#2d4a39] shadow-xs'
                  : 'bg-white text-[#5a5a40] border-[#e3dec9] hover:bg-[#fcf9f2]'
              }`}
            >
              <Droplet className="w-3.5 h-3.5" />
              <span>AAHA / WSAVA Fluid Therapy & Drip Rate</span>
            </button>

            <button
              onClick={() => setWave1SubTab('vitals_matrix')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border ${
                wave1SubTab === 'vitals_matrix'
                  ? 'bg-[#2d4a39] text-white border-[#2d4a39] shadow-xs'
                  : 'bg-white text-[#5a5a40] border-[#e3dec9] hover:bg-[#fcf9f2]'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Merck Normal Vitals & Triage Reference</span>
            </button>
          </div>

          {/* 1.1 DRUG DOSING CALCULATOR */}
          {wave1SubTab === 'drug_dosing' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Left Column: Drug & Parameter Selection */}
              <div className="lg:col-span-5 space-y-4">
                <div className="bg-white p-5 rounded-2xl border border-[#e3dec9] border-b-[4px] border-b-[#cdc6ad] shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-serif font-black text-base text-[#3c3c3b] flex items-center gap-2">
                      <span>1. Patient & Species Parameters</span>
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowAddDrugModal(true)}
                      className="px-2.5 py-1 text-[11px] font-black rounded-lg bg-emerald-800 text-white hover:bg-emerald-700 flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                      title="Add your own custom veterinary medicine, dose rates, and regional formulations"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Medicine</span>
                    </button>
                  </div>

                  {/* Species Selector */}
                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-wider text-[#7a766f] mb-1.5">
                      Target Species
                    </label>
                    <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
                      {[
                        { key: 'dog', label: '🐕 Dog' },
                        { key: 'cat', label: '🐈 Cat' },
                        { key: 'cattle', label: '🐄 Cow' },
                        { key: 'buffalo', label: '🐃 Buffalo' },
                        { key: 'goat', label: '🐐 Goat' },
                        { key: 'sheep', label: '🐑 Sheep' },
                        { key: 'horse', label: '🐎 Horse' }
                      ].map(sp => (
                        <button
                          key={sp.key}
                          onClick={() => setDrugSpecies(sp.key as any)}
                          className={`p-2 rounded-xl text-xs font-bold border transition-all text-center cursor-pointer ${
                            drugSpecies === sp.key
                              ? 'bg-[#5a5a40] text-white border-[#5a5a40]'
                              : 'bg-[#fdfbf7] text-[#5a5a40] border-[#e3dec9] hover:bg-[#f4efe4]'
                          }`}
                        >
                          {sp.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Patient Weight */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-[11px] font-black uppercase tracking-wider text-[#7a766f]">
                        Patient Body Weight (kg)
                      </label>
                      <span className="text-xs font-bold text-[#5a5a40]">{patientWeightKg} kg (~{(patientWeightKg * 2.20462).toFixed(1)} lbs)</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min={0.5}
                        max={drugSpecies === 'cattle' || drugSpecies === 'buffalo' || drugSpecies === 'horse' ? 800 : 70}
                        step={patientWeightKg > 50 ? 5 : 0.5}
                        value={patientWeightKg}
                        onChange={(e) => setPatientWeightKg(Number(e.target.value))}
                        className="flex-1 accent-[#5a5a40]"
                      />
                      <input
                        type="number"
                        min={0.1}
                        max={1500}
                        value={patientWeightKg}
                        onChange={(e) => setPatientWeightKg(Math.max(0.1, Number(e.target.value)))}
                        className="w-20 p-2 rounded-xl border border-[#e3dec9] text-xs font-bold text-center bg-[#fdfbf7]"
                      />
                    </div>
                  </div>

                  {/* Search & Select Drug */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-[11px] font-black uppercase tracking-wider text-[#7a766f]">
                        Select Veterinary Pharmaceutical ({filteredDrugs.length})
                      </label>
                      {customDrugs.length > 0 && (
                        <span className="text-[10px] text-emerald-800 font-bold bg-emerald-100 px-1.5 py-0.5 rounded">
                          {customDrugs.length} custom added
                        </span>
                      )}
                    </div>
                    <div className="relative mb-2">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                      <input
                        type="text"
                        placeholder="Search active molecule, brand, or custom drug..."
                        value={drugSearch}
                        onChange={(e) => setDrugSearch(e.target.value)}
                        className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-[#e3dec9] bg-[#fdfbf7]"
                      />
                    </div>

                    <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                      {filteredDrugs.map(drug => {
                        const isCustom = customDrugs.some(cd => cd.id === drug.id);
                        return (
                          <div
                            key={drug.id}
                            onClick={() => {
                              setSelectedDrugId(drug.id);
                              setCustomDoseMgKg('');
                              setSelectedConcentrationIdx(0);
                              setIsCustomConcentrationMode(false);
                            }}
                            className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all flex items-center justify-between ${
                              selectedDrugId === drug.id
                                ? 'bg-emerald-50 border-emerald-500 text-emerald-950 font-bold shadow-xs'
                                : 'bg-[#fdfbf7] border-[#e3dec9] text-[#5a5a40] hover:bg-[#f4efe4]'
                            }`}
                          >
                            <div className="flex-1 pr-2">
                              <div className="flex items-center gap-1.5">
                                <p className="font-bold text-xs leading-tight">{drug.name}</p>
                                {isCustom && (
                                  <span className="text-[9px] bg-amber-200 text-amber-900 font-black px-1.5 py-0.2 rounded">
                                    CUSTOM
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-stone-500 uppercase tracking-wider font-semibold">{drug.category}</span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              {isCustom && (
                                <button
                                  type="button"
                                  onClick={(e) => handleDeleteCustomDrug(drug.id, e)}
                                  className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                                  title="Delete custom drug"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                              {selectedDrugId === drug.id && (
                                <span className="text-emerald-700 font-bold text-xs">Active</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Dosage Override / Concentration */}
                  <div className="pt-3 border-t border-[#f4f1e9] space-y-3.5">
                    {/* Dose Rate */}
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-[11px] font-black uppercase tracking-wider text-[#7a766f]">
                          Standard Dose Rate: <strong className="text-[#2d4a39]">{speciesDoseInfo?.default || 10} mg/kg</strong>
                        </label>
                        <span className="text-[10px] text-stone-500">Range: {speciesDoseInfo?.min}-{speciesDoseInfo?.max} mg/kg</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          step="0.01"
                          placeholder={`Custom (default ${speciesDoseInfo?.default || 10})`}
                          value={customDoseMgKg}
                          onChange={(e) => setCustomDoseMgKg(e.target.value === '' ? '' : Number(e.target.value))}
                          className="flex-1 p-2 text-xs rounded-xl border border-[#e3dec9] bg-[#fdfbf7] font-semibold"
                        />
                        <span className="text-xs font-bold text-stone-600">mg / kg</span>
                      </div>
                    </div>

                    {/* Regional / Commercial Formulation & Concentration Setting */}
                    <div className="bg-[#faf8f2] p-3 rounded-xl border border-[#e3dec9] space-y-2.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-black uppercase tracking-wider text-[#5a5a40] flex items-center gap-1.5">
                          <Sliders className="w-3.5 h-3.5 text-emerald-800" />
                          <span>Commercial Formulation & Strength</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setIsCustomConcentrationMode(!isCustomConcentrationMode);
                            if (!isCustomConcentrationMode && customConcValue === '') {
                              setCustomConcValue(currentConcentration.valueMgPerUnit);
                              setCustomConcUnit(currentConcentration.unit as any);
                              setCustomConcLabel(currentConcentration.label);
                            }
                          }}
                          className={`text-[10px] font-bold px-2 py-0.5 rounded transition-all cursor-pointer ${
                            isCustomConcentrationMode
                              ? 'bg-amber-600 text-white'
                              : 'bg-stone-200 text-stone-700 hover:bg-stone-300'
                          }`}
                        >
                          {isCustomConcentrationMode ? '⚡ Using Custom Strength' : '+ Enter Custom Vial/Ampoule Strength'}
                        </button>
                      </div>

                      {!isCustomConcentrationMode ? (
                        <div>
                          <select
                            value={selectedConcentrationIdx}
                            onChange={(e) => setSelectedConcentrationIdx(Number(e.target.value))}
                            className="w-full p-2 text-xs rounded-xl border border-[#e3dec9] bg-white font-semibold text-[#3c3c3b]"
                          >
                            {selectedDrug.commonConcentrations.map((c, idx) => (
                              <option key={idx} value={idx}>
                                {c.label} ({c.valueMgPerUnit} {c.unit})
                              </option>
                            ))}
                          </select>
                          <p className="text-[10px] text-stone-500 mt-1 leading-tight">
                            Selected preset: <strong>{currentConcentration.valueMgPerUnit} {currentConcentration.unit}</strong>. Click "+ Enter Custom" to input your specific local bottle strength.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2 pt-1">
                          <div className="grid grid-cols-12 gap-2">
                            <div className="col-span-7">
                              <label className="block text-[10px] font-bold text-stone-600 mb-0.5">Strength / Conc</label>
                              <input
                                type="number"
                                step="any"
                                min="0.001"
                                placeholder="e.g. 50, 100, 250"
                                value={customConcValue}
                                onChange={(e) => setCustomConcValue(e.target.value === '' ? '' : Number(e.target.value))}
                                className="w-full p-2 text-xs rounded-xl border border-amber-400 bg-white font-bold text-amber-950 focus:outline-emerald-800"
                              />
                            </div>
                            <div className="col-span-5">
                              <label className="block text-[10px] font-bold text-stone-600 mb-0.5">Unit</label>
                              <select
                                value={customConcUnit}
                                onChange={(e) => setCustomConcUnit(e.target.value as any)}
                                className="w-full p-2 text-xs rounded-xl border border-amber-400 bg-white font-bold text-amber-950"
                              >
                                <option value="mg/mL">mg / mL (Injectable / Liquid)</option>
                                <option value="mg/tablet">mg / tablet (Solid)</option>
                                <option value="mcg/mL">mcg / mL</option>
                                <option value="IU/mL">IU / mL</option>
                              </select>
                            </div>
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-stone-600 mb-0.5">Brand / Packaging Note (Optional)</label>
                            <input
                              type="text"
                              placeholder="e.g. 10 mL Local Vial, 500mg Bolus, 5% Solution"
                              value={customConcLabel}
                              onChange={(e) => setCustomConcLabel(e.target.value)}
                              className="w-full p-1.5 text-xs rounded-xl border border-[#e3dec9] bg-white text-stone-700"
                            />
                          </div>

                          <div className="flex items-center justify-between text-[10px] text-amber-800 pt-0.5">
                            <span>Active: <strong>{customConcValue || 0} {customConcUnit}</strong></span>
                            <button
                              type="button"
                              onClick={() => setIsCustomConcentrationMode(false)}
                              className="text-stone-500 hover:text-stone-800 underline font-medium"
                            >
                              Reset to Standard Presets
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              </div>

              {/* Right Column: Calculated Prescription Card & Authoritative Warnings */}
              <div className="lg:col-span-7 space-y-4">
                
                {/* Result Card */}
                <div className="bg-gradient-to-br from-emerald-900 to-[#1c2e24] text-white p-6 rounded-3xl border border-emerald-700 shadow-xl relative overflow-hidden">
                  <div className="flex items-center justify-between border-b border-emerald-700/60 pb-3 mb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-emerald-300 block">
                          CALCULATED CLINICAL DOSAGE
                        </span>
                        {isSelectedDrugCustom && (
                          <span className="bg-amber-400 text-stone-900 text-[9px] font-black px-1.5 py-0.2 rounded">
                            USER CUSTOM DRUG
                          </span>
                        )}
                        {isCustomConcentrationMode && (
                          <span className="bg-emerald-400 text-stone-950 text-[9px] font-black px-1.5 py-0.2 rounded">
                            CUSTOM CONCENTRATION
                          </span>
                        )}
                      </div>
                      <h4 className="text-lg font-serif font-black text-white m-0">
                        {selectedDrug.name}
                      </h4>
                    </div>
                    <button
                      onClick={() => {
                        const formulationText = isCustomConcentrationMode
                          ? `${customConcValue} ${customConcUnit}${customConcLabel ? ` (${customConcLabel})` : ''}`
                          : currentConcentration?.label;
                        const rxText = `VetAxis Clinical Rx:\nDrug: ${selectedDrug.name}\nPatient: ${drugSpecies.toUpperCase()} (${patientWeightKg} kg)\nTotal Dose: ${totalMgDose.toFixed(1)} mg (${activeDoseMgKg} mg/kg)\nCommercial Formulation: ${formulationText}\nAdminister: ${calculatedVolumeOrUnits.toFixed(2)} ${effectiveUnit === 'mg/mL' ? 'mL' : effectiveUnit === 'mg/tablet' ? 'tablet(s)' : effectiveUnit} via ${speciesDoseInfo?.route || 'PO'}\nFrequency: ${speciesDoseInfo?.frequency}\nInstructions: ${speciesDoseInfo?.instructions}`;
                        handleCopy(rxText, 'rx_copy');
                      }}
                      className="bg-emerald-800/80 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl border border-emerald-600 flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                    >
                      {copiedKey === 'rx_copy' ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedKey === 'rx_copy' ? 'Copied Rx!' : 'Copy Rx'}</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-5">
                    <div className="bg-white/10 p-3.5 rounded-2xl backdrop-blur-xs border border-white/10">
                      <span className="text-[10px] font-bold text-emerald-200 block uppercase">Total Active Dose</span>
                      <p className="text-xl sm:text-2xl font-black text-white mt-1">
                        {totalMgDose.toFixed(1)} <span className="text-xs font-normal">mg</span>
                      </p>
                      <span className="text-[10px] text-emerald-300">@{activeDoseMgKg} mg/kg</span>
                    </div>

                    <div className="bg-emerald-500/20 p-3.5 rounded-2xl backdrop-blur-xs border border-emerald-400/30">
                      <span className="text-[10px] font-bold text-emerald-200 block uppercase">Administer Volume / Units</span>
                      <p className="text-xl sm:text-2xl font-black text-amber-300 mt-1">
                        {calculatedVolumeOrUnits.toFixed(2)} <span className="text-xs font-normal text-white">{effectiveUnit === 'mg/mL' ? 'mL' : effectiveUnit === 'mg/tablet' ? 'tabs' : effectiveUnit}</span>
                      </p>
                      <span className="text-[10px] text-emerald-300">
                        {isCustomConcentrationMode 
                          ? `@ ${customConcValue} ${customConcUnit}` 
                          : `Using ${currentConcentration?.label}`}
                      </span>
                    </div>

                    <div className="bg-white/10 p-3.5 rounded-2xl backdrop-blur-xs border border-white/10 col-span-2 sm:col-span-1">
                      <span className="text-[10px] font-bold text-emerald-200 block uppercase">Route & Regimen</span>
                      <p className="text-sm font-black text-white mt-1">
                        {speciesDoseInfo?.route || 'PO'} • {speciesDoseInfo?.frequency || 'q12h'}
                      </p>
                      <span className="text-[10px] text-emerald-300">Target species: {drugSpecies.toUpperCase()}</span>
                    </div>
                  </div>

                  {/* Route & Administration Instruction */}
                  <div className="bg-black/30 p-3.5 rounded-xl border border-white/10 text-xs text-stone-200 flex items-start gap-2.5">
                    <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-white">Clinical Administration Advice: </strong>
                      {speciesDoseInfo?.instructions || 'Administer as prescribed by licensed DVM.'}
                    </div>
                  </div>
                </div>

                {/* Contraindications & Black Box Notices from Plumb's */}
                <div className="bg-red-50/90 border border-red-200 p-4 rounded-2xl text-xs space-y-2">
                  <div className="flex items-center gap-2 text-red-900 font-black">
                    <ShieldAlert className="w-4 h-4 text-red-600" />
                    <span>Clinical Warnings & Contraindications</span>
                  </div>
                  <p className="text-red-800 leading-relaxed font-medium">
                    {selectedDrug.contraindications}
                  </p>
                  <p className="text-stone-600 text-[11px] pt-1 border-t border-red-200/60">
                    <strong>Pharmacology & Notes: </strong>{selectedDrug.clinicalNotes}
                  </p>
                </div>

              </div>

            </div>
          )}

          {/* ADD CUSTOM MEDICINE MODAL */}
          <AnimatePresence>
            {showAddDrugModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 max-h-[90vh] overflow-y-auto"
                >
                  <div className="flex items-center justify-between border-b border-stone-200 pb-3 mb-4">
                    <div>
                      <span className="text-[10px] font-black uppercase text-emerald-800 tracking-wider">Clinician Formulary Builder</span>
                      <h3 className="text-lg font-serif font-black text-stone-900">Add Custom Medicine</h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowAddDrugModal(false)}
                      className="p-1 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100"
                    >
                      ✕
                    </button>
                  </div>

                  <form onSubmit={handleSaveCustomDrug} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-stone-800 mb-1">
                        Medicine Name & Generic / Brand *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Enrofloxacin (Baytril 10%) or Marbofloxacin"
                        value={newDrugName}
                        onChange={(e) => setNewDrugName(e.target.value)}
                        className="w-full p-2.5 text-xs rounded-xl border border-stone-300 focus:border-emerald-700 focus:outline-hidden"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-stone-800 mb-1">Category</label>
                        <select
                          value={newDrugCategory}
                          onChange={(e) => setNewDrugCategory(e.target.value as any)}
                          className="w-full p-2 text-xs rounded-xl border border-stone-300"
                        >
                          <option value="Antibiotic">Antibiotic</option>
                          <option value="NSAID / Analgesic">NSAID / Analgesic</option>
                          <option value="Antiparasitic / Dewormer">Antiparasitic / Dewormer</option>
                          <option value="Emergency / Critical">Emergency / Critical</option>
                          <option value="Steroid / Anti-inflammatory">Steroid / Anti-inflammatory</option>
                          <option value="Sedative / Anesthetic">Sedative / Anesthetic</option>
                          <option value="Gastrointestinal">Gastrointestinal</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-stone-800 mb-1">Default Route</label>
                        <input
                          type="text"
                          placeholder="e.g. IM, SC, PO, IV"
                          value={newDrugRoute}
                          onChange={(e) => setNewDrugRoute(e.target.value)}
                          className="w-full p-2 text-xs rounded-xl border border-stone-300"
                        />
                      </div>
                    </div>

                    {/* Target Species checkboxes */}
                    <div>
                      <label className="block text-xs font-bold text-stone-800 mb-1.5">
                        Applicable Target Species
                      </label>
                      <div className="grid grid-cols-4 gap-2">
                        {[
                          { key: 'dog', label: '🐕 Dog' },
                          { key: 'cat', label: '🐈 Cat' },
                          { key: 'cattle', label: '🐄 Cattle' },
                          { key: 'buffalo', label: '🐃 Buffalo' },
                          { key: 'goat', label: '🐐 Goat' },
                          { key: 'sheep', label: '🐑 Sheep' },
                          { key: 'horse', label: '🐎 Horse' }
                        ].map(sp => {
                          const isSelected = newDrugSpecies.includes(sp.key as any);
                          return (
                            <button
                              type="button"
                              key={sp.key}
                              onClick={() => {
                                if (isSelected) {
                                  setNewDrugSpecies(newDrugSpecies.filter(s => s !== sp.key));
                                } else {
                                  setNewDrugSpecies([...newDrugSpecies, sp.key as any]);
                                }
                              }}
                              className={`p-2 rounded-xl text-xs font-bold border transition-all text-center ${
                                isSelected 
                                  ? 'bg-emerald-800 text-white border-emerald-800' 
                                  : 'bg-stone-50 text-stone-600 border-stone-200'
                              }`}
                            >
                              {sp.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Dose Rates */}
                    <div className="grid grid-cols-3 gap-2 bg-stone-50 p-3 rounded-xl border border-stone-200">
                      <div>
                        <label className="block text-[10px] font-black uppercase text-stone-600 mb-1">Standard (mg/kg)</label>
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={newDrugDoseDefault}
                          onChange={(e) => setNewDrugDoseDefault(Number(e.target.value))}
                          className="w-full p-1.5 text-xs font-bold rounded-lg border border-stone-300 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase text-stone-600 mb-1">Min (mg/kg)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={newDrugDoseMin}
                          onChange={(e) => setNewDrugDoseMin(Number(e.target.value))}
                          className="w-full p-1.5 text-xs font-bold rounded-lg border border-stone-300 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase text-stone-600 mb-1">Max (mg/kg)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={newDrugDoseMax}
                          onChange={(e) => setNewDrugDoseMax(Number(e.target.value))}
                          className="w-full p-1.5 text-xs font-bold rounded-lg border border-stone-300 bg-white"
                        />
                      </div>
                    </div>

                    {/* Formulation / Concentration */}
                    <div className="bg-emerald-50/70 p-3 rounded-xl border border-emerald-200 space-y-2">
                      <span className="text-[10px] font-black uppercase text-emerald-900 block">Formulation & Commercial Strength</span>
                      <div className="grid grid-cols-12 gap-2">
                        <div className="col-span-7">
                          <label className="block text-[10px] font-bold text-stone-600 mb-0.5">Strength / Conc</label>
                          <input
                            type="number"
                            step="any"
                            required
                            placeholder="e.g. 100 or 250"
                            value={newDrugConcStrength}
                            onChange={(e) => setNewDrugConcStrength(Number(e.target.value))}
                            className="w-full p-1.5 text-xs font-bold rounded-lg border border-stone-300 bg-white"
                          />
                        </div>
                        <div className="col-span-5">
                          <label className="block text-[10px] font-bold text-stone-600 mb-0.5">Unit</label>
                          <select
                            value={newDrugConcUnit}
                            onChange={(e) => setNewDrugConcUnit(e.target.value as any)}
                            className="w-full p-1.5 text-xs font-bold rounded-lg border border-stone-300 bg-white"
                          >
                            <option value="mg/mL">mg / mL</option>
                            <option value="mg/tablet">mg / tablet</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-stone-600 mb-0.5">Packaging / Vial Label</label>
                        <input
                          type="text"
                          placeholder="e.g. 50 mL Injectable Vial, 100mg Bolus"
                          value={newDrugConcLabel}
                          onChange={(e) => setNewDrugConcLabel(e.target.value)}
                          className="w-full p-1.5 text-xs rounded-lg border border-stone-300 bg-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-stone-800 mb-1">Frequency</label>
                        <input
                          type="text"
                          placeholder="e.g. q24h (SID), q12h (BID)"
                          value={newDrugFrequency}
                          onChange={(e) => setNewDrugFrequency(e.target.value)}
                          className="w-full p-2 text-xs rounded-xl border border-stone-300"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-stone-800 mb-1">Instructions / Notes</label>
                        <input
                          type="text"
                          placeholder="e.g. Give with feed / Slow IV"
                          value={newDrugInstructions}
                          onChange={(e) => setNewDrugInstructions(e.target.value)}
                          className="w-full p-2 text-xs rounded-xl border border-stone-300"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-800 mb-1">Contraindications & Warnings</label>
                      <textarea
                        rows={2}
                        placeholder="e.g. Do not use in pregnant animals or growing pups..."
                        value={newDrugContraindications}
                        onChange={(e) => setNewDrugContraindications(e.target.value)}
                        className="w-full p-2 text-xs rounded-xl border border-stone-300"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-200">
                      <button
                        type="button"
                        onClick={() => setShowAddDrugModal(false)}
                        className="px-4 py-2 text-xs font-bold text-stone-600 hover:bg-stone-100 rounded-xl"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 text-xs font-black text-white bg-emerald-800 hover:bg-emerald-700 rounded-xl shadow-xs cursor-pointer"
                      >
                        Save Medicine to Library
                      </button>
                    </div>
                  </form>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* 1.2 FLUID THERAPY & DRIP RATE CALCULATOR */}
          {wave1SubTab === 'fluid_therapy' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              <div className="lg:col-span-5 space-y-4">
                <div className="bg-white p-5 rounded-2xl border border-[#e3dec9] border-b-[4px] border-b-[#cdc6ad] shadow-sm space-y-4">
                  <h3 className="font-serif font-black text-base text-[#3c3c3b] flex items-center gap-2">
                    <Droplet className="w-4 h-4 text-sky-600" />
                    <span>Fluid Parameters (AAHA / WSAVA Formula)</span>
                  </h3>

                  {/* Patient Type */}
                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-wider text-[#7a766f] mb-1.5">
                      Animal Category
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { key: 'dog', label: '🐕 Canine (Dog)' },
                        { key: 'cat', label: '🐈 Feline (Cat)' },
                        { key: 'large_animal', label: '🐄 Large Animal' }
                      ].map(t => (
                        <button
                          key={t.key}
                          onClick={() => setFluidSpecies(t.key as any)}
                          className={`p-2 rounded-xl text-xs font-bold border transition-all text-center cursor-pointer ${
                            fluidSpecies === t.key
                              ? 'bg-[#2d4a39] text-white border-[#2d4a39]'
                              : 'bg-[#fdfbf7] text-[#5a5a40] border-[#e3dec9] hover:bg-[#f4efe4]'
                          }`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Body Weight */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-[11px] font-black uppercase tracking-wider text-[#7a766f]">
                        Body Weight (kg)
                      </label>
                      <span className="text-xs font-bold text-[#5a5a40]">{fluidWeightKg} kg</span>
                    </div>
                    <input
                      type="range"
                      min={0.5}
                      max={fluidSpecies === 'large_animal' ? 600 : 70}
                      step={0.5}
                      value={fluidWeightKg}
                      onChange={(e) => setFluidWeightKg(Number(e.target.value))}
                      className="w-full accent-[#2d4a39]"
                    />
                  </div>

                  {/* Dehydration % */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-[11px] font-black uppercase tracking-wider text-[#7a766f]">
                        Estimated Dehydration: <strong className="text-sky-700">{dehydrationPercent}%</strong>
                      </label>
                      <span className="text-[10px] text-stone-500">
                        {dehydrationPercent <= 5 ? '<5% (Unnoticeable / Dry mouth)' : 
                         dehydrationPercent <= 7 ? '6-8% (Mild loss of skin turgor, dry mucous membranes)' : 
                         dehydrationPercent <= 10 ? '9-10% (Severe skin tenting, sunken eyes, weak pulse)' : 
                         '11-12%+ (Critical hypovolemic shock / Moribund)'}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={12}
                      step={1}
                      value={dehydrationPercent}
                      onChange={(e) => setDehydrationPercent(Number(e.target.value))}
                      className="w-full accent-sky-600"
                    />
                  </div>

                  {/* Delivery Hours & Losses */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-black uppercase tracking-wider text-[#7a766f] mb-1">
                        Correction Hours
                      </label>
                      <select
                        value={deliveryHours}
                        onChange={(e) => setDeliveryHours(Number(e.target.value))}
                        className="w-full p-2 text-xs rounded-xl border border-[#e3dec9] bg-[#fdfbf7]"
                      >
                        <option value={6}>6 Hours (Urgent)</option>
                        <option value={12}>12 Hours (Moderate)</option>
                        <option value={24}>24 Hours (Standard)</option>
                        <option value={48}>48 Hours (Gradual)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-black uppercase tracking-wider text-[#7a766f] mb-1">
                        Ongoing Losses (mL)
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={3000}
                        value={ongoingLossesMl}
                        onChange={(e) => setOngoingLossesMl(Number(e.target.value))}
                        className="w-full p-2 text-xs rounded-xl border border-[#e3dec9] bg-[#fdfbf7]"
                      />
                    </div>
                  </div>

                  {/* Drip Set Factor */}
                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-wider text-[#7a766f] mb-1.5">
                      IV Administration Infusion Set
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { factor: 60, label: '60 gtt/mL (Micro-drip <10kg)' },
                        { factor: 15, label: '15 gtt/mL (Standard Macro)' },
                        { factor: 10, label: '10 gtt/mL (Large Macro)' }
                      ].map(item => (
                        <button
                          key={item.factor}
                          onClick={() => setDripFactor(item.factor as any)}
                          className={`p-2 rounded-xl text-[11px] font-bold border transition-all text-center cursor-pointer ${
                            dripFactor === item.factor
                              ? 'bg-sky-700 text-white border-sky-700'
                              : 'bg-[#fdfbf7] text-[#5a5a40] border-[#e3dec9] hover:bg-[#f4efe4]'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                </div>
              </div>

              {/* Right Column: Fluid Calculation Breakdown */}
              <div className="lg:col-span-7 space-y-4">
                <div className="bg-gradient-to-br from-sky-950 via-[#153448] to-[#0f2431] text-white p-6 rounded-3xl border border-sky-700 shadow-xl space-y-5">
                  <div className="flex items-center justify-between border-b border-sky-800 pb-3">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-sky-300 block">
                        AAHA/WSAVA FLUID REGIMEN REPORT
                      </span>
                      <h4 className="text-lg font-serif font-black text-white m-0">
                        {fluidWeightKg} kg Patient • {dehydrationPercent}% Dehydration
                      </h4>
                    </div>
                    <span className="bg-sky-500/20 text-sky-300 border border-sky-400/30 text-xs font-bold px-3 py-1 rounded-xl">
                      {dripFactor} drops/mL Set
                    </span>
                  </div>

                  {/* Flow Rates Showcase */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-xs border border-white/10">
                      <span className="text-[10px] font-bold text-sky-200 uppercase block">Total Volume</span>
                      <p className="text-2xl font-black text-white mt-1">
                        {fluidResults.totalVolumeMl} <span className="text-xs font-normal">mL</span>
                      </p>
                      <span className="text-[10px] text-sky-300">Over {deliveryHours} Hours</span>
                    </div>

                    <div className="bg-amber-500/20 p-4 rounded-2xl backdrop-blur-xs border border-amber-400/30">
                      <span className="text-[10px] font-bold text-amber-200 uppercase block">Infusion Pump Rate</span>
                      <p className="text-2xl font-black text-amber-300 mt-1">
                        {fluidResults.rateMlPerHour} <span className="text-xs font-normal text-white">mL / hr</span>
                      </p>
                      <span className="text-[10px] text-amber-200">{(fluidResults.rateMlPerHour / 60).toFixed(2)} mL/min</span>
                    </div>

                    <div className="bg-sky-400/20 p-4 rounded-2xl backdrop-blur-xs border border-sky-300/30">
                      <span className="text-[10px] font-bold text-sky-200 uppercase block">Gravity Drip Speed</span>
                      <p className="text-2xl font-black text-sky-200 mt-1">
                        {fluidResults.dropsPerMinute} <span className="text-xs font-normal text-white">drops / min</span>
                      </p>
                      <span className="text-[10px] text-sky-300">1 drop every ~{fluidResults.secondsPerDrop}s</span>
                    </div>
                  </div>

                  {/* Equation Components Table */}
                  <div className="bg-black/30 p-4 rounded-2xl border border-white/10 space-y-2 text-xs text-stone-200">
                    <p className="font-bold text-white text-xs uppercase tracking-wider border-b border-white/10 pb-1.5">
                      Mathematical Breakdown (AAHA / WSAVA Components):
                    </p>
                    <div className="flex justify-between py-1 border-b border-white/5">
                      <span>1. Fluid Deficit (BW × Dehydration% × 1000 mL):</span>
                      <strong className="text-sky-300">{fluidResults.fluidDeficitMl} mL</strong>
                    </div>
                    <div className="flex justify-between py-1 border-b border-white/5">
                      <span>2. Maintenance Requirement ({deliveryHours} hr window):</span>
                      <strong className="text-sky-300">{fluidResults.periodMaintenanceMl} mL <span className="text-[10px] text-stone-400 font-normal">({fluidResults.dailyMaintenanceMl} mL/24h)</span></strong>
                    </div>
                    <div className="flex justify-between py-1 border-b border-white/5">
                      <span>3. Ongoing Gastrointestinal / Effusion Losses:</span>
                      <strong className="text-sky-300">{fluidResults.ongoingLossesMl} mL</strong>
                    </div>
                    <div className="flex justify-between pt-1 font-bold text-sm text-white">
                      <span>Total Calculated Volume:</span>
                      <span className="text-amber-300">{fluidResults.totalVolumeMl} mL</span>
                    </div>
                  </div>

                  {/* Emergency Shock Fluid Note */}
                  <div className="bg-red-950/60 border border-red-700/60 p-3 rounded-xl text-xs text-red-200 flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-red-300">Hypovolemic Shock Resuscitation Rule: </strong>
                      Total shock blood volume is ~{fluidResults.shockBolusMl} mL. In acute shock, administer 1/4 of shock dose ({Math.round(fluidResults.shockBolusMl / 4)} mL isotonic crystalloid) as rapid IV bolus over 15 minutes, then reassess perfusion vitals (CRT, pulse quality, lactate).
                    </div>
                  </div>

                </div>
              </div>

            </div>
          )}

          {/* 1.3 VITALS MATRIX */}
          {wave1SubTab === 'vitals_matrix' && (
            <div className="space-y-4">
              <div className="bg-white p-5 rounded-3xl border border-[#e3dec9] border-b-[4px] border-b-[#cdc6ad] shadow-sm">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
                  <div>
                    <h3 className="font-serif font-black text-base text-[#3c3c3b]">
                      Merck Veterinary Physiological Normal Ranges
                    </h3>
                    <p className="text-xs text-stone-500">
                      Authoritative baseline vitals, body temperature ranges, resting cardiopulmonary rates, and estrus parameters.
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
                    {Object.keys(SPECIES_VITALS_MATRIX).map(k => (
                      <button
                        key={k}
                        onClick={() => setSelectedVitalsSpecies(k)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all whitespace-nowrap cursor-pointer ${
                          selectedVitalsSpecies === k
                            ? 'bg-[#2d4a39] text-white border-[#2d4a39]'
                            : 'bg-[#fdfbf7] text-[#5a5a40] border-[#e3dec9] hover:bg-[#f4efe4]'
                        }`}
                      >
                        {SPECIES_VITALS_MATRIX[k].speciesName.split(' ')[0]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Vitals Display Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200">
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 block">
                      Body Temperature
                    </span>
                    <p className="text-xl font-black text-amber-950 mt-1">
                      {currentVitals.tempRangeC.min}°C - {currentVitals.tempRangeC.max}°C
                    </p>
                    <span className="text-xs text-amber-800 font-semibold">
                      ({currentVitals.tempRangeF.min}°F - {currentVitals.tempRangeF.max}°F)
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-rose-50/60 border border-rose-200">
                    <span className="text-[10px] font-black uppercase tracking-wider text-rose-800 block">
                      Resting Heart Rate
                    </span>
                    <p className="text-xl font-black text-rose-950 mt-1">
                      {currentVitals.heartRateBpm.min} - {currentVitals.heartRateBpm.max} <span className="text-xs font-normal">bpm</span>
                    </p>
                    <span className="text-xs text-rose-800 font-semibold">
                      Mean: {currentVitals.heartRateBpm.average} bpm
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-sky-50/60 border border-sky-200">
                    <span className="text-[10px] font-black uppercase tracking-wider text-sky-800 block">
                      Respiratory Rate
                    </span>
                    <p className="text-xl font-black text-sky-950 mt-1">
                      {currentVitals.respRateBpm.min} - {currentVitals.respRateBpm.max} <span className="text-xs font-normal">breaths/min</span>
                    </p>
                    <span className="text-xs text-sky-800 font-semibold">
                      CRT: {currentVitals.crtSeconds.normal}
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200">
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 block">
                      Gestation Duration
                    </span>
                    <p className="text-xl font-black text-emerald-950 mt-1">
                      ~{currentVitals.gestationDays.average} <span className="text-xs font-normal">days</span>
                    </p>
                    <span className="text-[11px] text-emerald-800 font-semibold truncate block">
                      Range: {currentVitals.gestationDays.min}-{currentVitals.gestationDays.max} days
                    </span>
                  </div>
                </div>

                <div className="mt-4 p-4 rounded-2xl bg-[#fdfbf7] border border-[#e3dec9] text-xs space-y-2">
                  <div className="flex items-center gap-2 font-bold text-[#2d4a39]">
                    <BookOpen className="w-4 h-4" />
                    <span>Clinical Diagnostic Pearls for {currentVitals.speciesName} ({currentVitals.scientificGroup}):</span>
                  </div>
                  <p className="text-stone-700 leading-relaxed font-medium">
                    {currentVitals.clinicalPearls}
                  </p>
                  <div className="pt-2 border-t border-[#e3dec9] flex flex-wrap gap-4 text-[11px] text-stone-600">
                    <span><strong>Total Blood Volume:</strong> ~{currentVitals.bloodVolumeMlKg} mL / kg</span>
                    <span><strong>Estrus Cycle Pattern:</strong> {currentVitals.estrusCycleDays}</span>
                  </div>
                </div>

              </div>
            </div>
          )}

        </div>
      )}

      {/* ========================================================================= */}
      {/* WAVE 2: PET PARENT HEALTH, NUTRITION & TOXICITY SUITE */}
      {/* ========================================================================= */}
      {activeWave === 'wave2' && (
        <div className="space-y-6">
          
          <div className="flex items-center gap-2 border-b border-[#e3dec9] pb-3 overflow-x-auto">
            <button
              onClick={() => setWave2SubTab('calorie_calc')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border ${
                wave2SubTab === 'calorie_calc'
                  ? 'bg-[#2d4a39] text-white border-[#2d4a39] shadow-xs'
                  : 'bg-white text-[#5a5a40] border-[#e3dec9] hover:bg-[#fcf9f2]'
              }`}
            >
              <Utensils className="w-3.5 h-3.5" />
              <span>WSAVA / NRC Daily Calorie & Kibble Portion Calculator</span>
            </button>

            <button
              onClick={() => setWave2SubTab('toxicity_checker')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border ${
                wave2SubTab === 'toxicity_checker'
                  ? 'bg-rose-800 text-white border-rose-800 shadow-xs'
                  : 'bg-white text-rose-900 border-[#e3dec9] hover:bg-rose-50'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Emergency Toxic Food & Plant Safety Checker</span>
            </button>

            <button
              onClick={() => setWave2SubTab('age_calc')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border ${
                wave2SubTab === 'age_calc'
                  ? 'bg-[#2d4a39] text-white border-[#2d4a39] shadow-xs'
                  : 'bg-white text-[#5a5a40] border-[#e3dec9] hover:bg-[#fcf9f2]'
              }`}
            >
              <Heart className="w-3.5 h-3.5" />
              <span>Pet Age in Human Years & Life Stage Milestones</span>
            </button>
          </div>

          {/* 2.1 CALORIE & PORTION CALCULATOR */}
          {wave2SubTab === 'calorie_calc' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              <div className="lg:col-span-5 space-y-4">
                <div className="bg-white p-5 rounded-2xl border border-[#e3dec9] border-b-[4px] border-b-[#cdc6ad] shadow-sm space-y-4">
                  <h3 className="font-serif font-black text-base text-[#3c3c3b]">
                    Pet Nutrition Profile (WSAVA Global Guidelines)
                  </h3>

                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-wider text-[#7a766f] mb-1.5">
                      Species
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setPetSpecies('dog')}
                        className={`p-2.5 rounded-xl text-xs font-bold border transition-all text-center cursor-pointer ${
                          petSpecies === 'dog'
                            ? 'bg-[#2d4a39] text-white border-[#2d4a39]'
                            : 'bg-[#fdfbf7] text-[#5a5a40] border-[#e3dec9] hover:bg-[#f4efe4]'
                        }`}
                      >
                        🐕 Dog (Canine)
                      </button>
                      <button
                        onClick={() => setPetSpecies('cat')}
                        className={`p-2.5 rounded-xl text-xs font-bold border transition-all text-center cursor-pointer ${
                          petSpecies === 'cat'
                            ? 'bg-[#2d4a39] text-white border-[#2d4a39]'
                            : 'bg-[#fdfbf7] text-[#5a5a40] border-[#e3dec9] hover:bg-[#f4efe4]'
                        }`}
                      >
                        🐈 Cat (Feline)
                      </button>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-[11px] font-black uppercase tracking-wider text-[#7a766f]">
                        Pet Weight: <strong className="text-[#2d4a39]">{petWeightKg} kg</strong>
                      </label>
                      <span className="text-xs text-stone-500 font-semibold">~{(petWeightKg * 2.20462).toFixed(1)} lbs</span>
                    </div>
                    <input
                      type="range"
                      min={0.5}
                      max={petSpecies === 'dog' ? 80 : 12}
                      step={0.5}
                      value={petWeightKg}
                      onChange={(e) => setPetWeightKg(Number(e.target.value))}
                      className="w-full accent-[#2d4a39]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-wider text-[#7a766f] mb-1">
                      Life Stage & Activity Level
                    </label>
                    <select
                      value={petLifeStage}
                      onChange={(e) => setPetLifeStage(e.target.value as PetLifeStage)}
                      className="w-full p-2.5 text-xs rounded-xl border border-[#e3dec9] bg-[#fdfbf7] font-semibold text-[#3c3c3b]"
                    >
                      {Object.keys(PET_ENERGY_FACTORS[petSpecies]).map(k => (
                        <option key={k} value={k}>
                          {PET_ENERGY_FACTORS[petSpecies][k as PetLifeStage].label} ({PET_ENERGY_FACTORS[petSpecies][k as PetLifeStage].factor}x RER)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-[11px] font-black uppercase tracking-wider text-[#7a766f]">
                        Food Caloric Density (kcal / standard measuring cup)
                      </label>
                      <span className="text-xs font-bold text-[#5a5a40]">{kibbleCalDensity} kcal</span>
                    </div>
                    <input
                      type="number"
                      min={200}
                      max={600}
                      value={kibbleCalDensity}
                      onChange={(e) => setKibbleCalDensity(Number(e.target.value))}
                      className="w-full p-2 text-xs rounded-xl border border-[#e3dec9] bg-[#fdfbf7]"
                    />
                    <span className="text-[10px] text-stone-500 block mt-1">
                      Standard dry kibble is ~350-400 kcal/cup (1 cup ~ 100-105 grams).
                    </span>
                  </div>

                </div>
              </div>

              {/* Energy Results */}
              <div className="lg:col-span-7 space-y-4">
                <div className="bg-gradient-to-br from-amber-950 via-[#422e1d] to-[#24170d] text-white p-6 rounded-3xl border border-amber-700 shadow-xl space-y-5">
                  <div className="flex items-center justify-between border-b border-amber-800 pb-3">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-amber-300 block">
                        WSAVA DAILY ENERGY & PORTION PRESCRIPTION
                      </span>
                      <h4 className="text-lg font-serif font-black text-white m-0">
                        {petWeightKg} kg {petSpecies === 'dog' ? 'Dog' : 'Cat'} • {energyResults.lifeStageLabel}
                      </h4>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-xs border border-white/10">
                      <span className="text-[10px] font-bold text-amber-200 uppercase block">Daily Calorie Target (MER)</span>
                      <p className="text-2xl font-black text-amber-300 mt-1">
                        {energyResults.merKcal} <span className="text-xs font-normal text-white">kcal / day</span>
                      </p>
                      <span className="text-[10px] text-stone-300">Base RER: {energyResults.rerKcal} kcal</span>
                    </div>

                    <div className="bg-amber-500/20 p-4 rounded-2xl backdrop-blur-xs border border-amber-400/30">
                      <span className="text-[10px] font-bold text-amber-200 uppercase block">Total Daily Kibble</span>
                      <p className="text-2xl font-black text-white mt-1">
                        {energyResults.dailyGrams} <span className="text-xs font-normal">grams</span>
                      </p>
                      <span className="text-[10px] text-amber-200">~{energyResults.dailyCups} measuring cups</span>
                    </div>

                    <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-xs border border-white/10">
                      <span className="text-[10px] font-bold text-amber-200 uppercase block">Split: 2 Meals / Day</span>
                      <p className="text-2xl font-black text-emerald-300 mt-1">
                        {energyResults.twoMealsPortionGrams} <span className="text-xs font-normal text-white">g / meal</span>
                      </p>
                      <span className="text-[10px] text-stone-300">~{energyResults.twoMealsPortionCups} cups morning & evening</span>
                    </div>
                  </div>

                  <div className="bg-black/30 p-4 rounded-2xl border border-white/10 text-xs text-stone-200 space-y-2">
                    <div className="flex items-center gap-2 text-amber-300 font-bold">
                      <Info className="w-4 h-4" />
                      <span>The 10% Treat Allowance Rule (WSAVA Standard):</span>
                    </div>
                    <p className="leading-relaxed">
                      Treats, table tidbits, and dental chews should NEVER exceed 10% of total daily energy intake (max <strong>{Math.round(energyResults.merKcal * 0.10)} kcal</strong>/day). Feeding excess treats dilutes vital micronutrients and predisposes to obesity and pancreatitis.
                    </p>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* 2.2 TOXICITY SAFETY CHECKER */}
          {wave2SubTab === 'toxicity_checker' && (
            <div className="space-y-4">
              <div className="bg-white p-5 rounded-3xl border border-[#e3dec9] border-b-[4px] border-b-[#cdc6ad] shadow-sm space-y-4">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                  <div>
                    <h3 className="font-serif font-black text-base text-rose-950 flex items-center gap-2">
                      <ShieldAlert className="w-5 h-5 text-rose-600" />
                      <span>Emergency Pet Toxicity & Food Poisoning Database</span>
                    </h3>
                    <p className="text-xs text-stone-500">
                      Grounded in ASPCA Animal Poison Control Center & Pet Poison Helpline clinical data.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                      <input
                        type="text"
                        placeholder="Search food, medication, or plant..."
                        value={toxicSearchQuery}
                        onChange={(e) => setToxicSearchQuery(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-[#e3dec9] bg-[#fdfbf7]"
                      />
                    </div>

                    <select
                      value={selectedToxicityCategory}
                      onChange={(e) => setSelectedToxicityCategory(e.target.value)}
                      className="p-1.5 text-xs rounded-xl border border-[#e3dec9] bg-[#fdfbf7]"
                    >
                      <option value="all">All Categories</option>
                      <option value="Human Food">Human Food</option>
                      <option value="Human Medication">Human Medication</option>
                      <option value="Plant">Plant</option>
                    </select>
                  </div>
                </div>

                {/* Toxic Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredToxins.map(toxin => (
                    <div
                      key={toxin.id}
                      className={`p-5 rounded-2xl border transition-all ${
                        toxin.toxicityLevel === 'CRITICAL_FATAL'
                          ? 'bg-rose-50/70 border-rose-300'
                          : toxin.toxicityLevel === 'HIGH'
                          ? 'bg-amber-50/70 border-amber-300'
                          : 'bg-stone-50 border-stone-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md text-white ${
                              toxin.toxicityLevel === 'CRITICAL_FATAL' ? 'bg-rose-700 animate-pulse' : 'bg-amber-600'
                            }`}>
                              {toxin.toxicityLevel === 'CRITICAL_FATAL' ? '🚨 DANGEROUS / FATAL' : '⚠️ HIGH TOXICITY'}
                            </span>
                            <span className="text-[10px] text-stone-500 font-bold uppercase">
                              {toxin.category} • Toxic to: {toxin.toxicTo.join(', ').toUpperCase()}
                            </span>
                          </div>
                          <h4 className="text-base font-bold text-[#3c3c3b] mt-1.5">{toxin.name}</h4>
                        </div>
                      </div>

                      <div className="space-y-2 text-xs text-stone-700 mt-3">
                        <p>
                          <strong>Mechanism: </strong>{toxin.toxicPrinciple}
                        </p>
                        <p className="text-[11px] text-rose-900 bg-white/60 p-2 rounded-lg border border-rose-200/50">
                          <strong>Toxic Dose: </strong>{toxin.toxicDoseSummary}
                        </p>
                        <p>
                          <strong>Clinical Signs: </strong>{toxin.clinicalSigns}
                        </p>
                        <div className="pt-2 border-t border-rose-200/60">
                          <strong className="text-rose-900">Immediate Action: </strong>
                          <span className="text-stone-800">{toxin.emergencyActions}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

              </div>
            </div>
          )}

          {/* 2.3 PET AGE IN HUMAN YEARS */}
          {wave2SubTab === 'age_calc' && (
            <div className="bg-white p-6 rounded-3xl border border-[#e3dec9] border-b-[4px] border-b-[#cdc6ad] shadow-sm max-w-3xl mx-auto space-y-6">
              <div>
                <h3 className="font-serif font-black text-lg text-[#3c3c3b]">
                  Pet Physiological Age & Life Stage Translator
                </h3>
                <p className="text-xs text-stone-500">
                  Unlike the old "1 year = 7 years" myth, pets age rapidly in their first 2 years, followed by species and size-specific aging curves.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-[#7a766f] mb-1.5">
                    Pet Type
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setPetSpecies('dog')}
                      className={`p-2.5 rounded-xl text-xs font-bold border transition-all ${
                        petSpecies === 'dog' ? 'bg-[#2d4a39] text-white' : 'bg-[#fdfbf7] text-[#5a5a40]'
                      }`}
                    >
                      🐕 Dog
                    </button>
                    <button
                      onClick={() => setPetSpecies('cat')}
                      className={`p-2.5 rounded-xl text-xs font-bold border transition-all ${
                        petSpecies === 'cat' ? 'bg-[#2d4a39] text-white' : 'bg-[#fdfbf7] text-[#5a5a40]'
                      }`}
                    >
                      🐈 Cat
                    </button>
                  </div>
                </div>

                {petSpecies === 'dog' && (
                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-wider text-[#7a766f] mb-1.5">
                      Canine Breed Size
                    </label>
                    <select
                      value={canineSize}
                      onChange={(e) => setCanineSize(e.target.value as any)}
                      className="w-full p-2.5 text-xs rounded-xl border border-[#e3dec9] bg-[#fdfbf7] font-semibold"
                    >
                      <option value="small">Small Breed (&lt;10 kg, e.g. Shih Tzu, Pug)</option>
                      <option value="medium">Medium Breed (10-25 kg, e.g. Beagle, Cocker)</option>
                      <option value="large">Large Breed (25-45 kg, e.g. GSD, Labrador)</option>
                      <option value="giant">Giant Breed (&gt;45 kg, e.g. Great Dane, Mastiff)</option>
                    </select>
                  </div>
                )}
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[11px] font-black uppercase tracking-wider text-[#7a766f]">
                    Chronological Pet Age: <strong className="text-[#2d4a39]">{petAgeYears} Years Old</strong>
                  </label>
                </div>
                <input
                  type="range"
                  min={0.5}
                  max={20}
                  step={0.5}
                  value={petAgeYears}
                  onChange={(e) => setPetAgeYears(Number(e.target.value))}
                  className="w-full accent-[#2d4a39]"
                />
              </div>

              <div className="bg-gradient-to-r from-[#2d4a39] to-[#1c2e24] text-white p-6 rounded-2xl text-center space-y-2">
                <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-300">
                  Physiological Equivalent
                </span>
                <p className="text-4xl font-serif font-black text-amber-300">
                  ~{humanAgeEstimate} <span className="text-lg text-white font-normal">Human Years</span>
                </p>
                <p className="text-xs text-stone-200 max-w-md mx-auto">
                  {humanAgeEstimate < 20 ? '🌱 Juvenile / Junior Stage: Rapid skeletal growth and core vaccination series required.' :
                   humanAgeEstimate < 50 ? '⚡ Prime Adult Stage: Peak physiological performance, annual dental scaling, and wellness blood panels.' :
                   '👴 Senior Stage: Bi-annual geriatric screenings (Renal, Hepatic, Cardiac & Thyroid panels) recommended.'}
                </p>
              </div>

            </div>
          )}

        </div>
      )}

      {/* ========================================================================= */}
      {/* WAVE 3: DAIRY & LIVESTOCK PRODUCTIVITY SUITE */}
      {/* ========================================================================= */}
      {activeWave === 'wave3' && (
        <div className="space-y-6">
          
          <div className="flex items-center gap-2 border-b border-[#e3dec9] pb-3 overflow-x-auto">
            <button
              onClick={() => setWave3SubTab('gestation_timeline')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border ${
                wave3SubTab === 'gestation_timeline'
                  ? 'bg-[#2d4a39] text-white border-[#2d4a39] shadow-xs'
                  : 'bg-white text-[#5a5a40] border-[#e3dec9] hover:bg-[#fcf9f2]'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Livestock Gestation & Calving Milestone Timeline</span>
            </button>

            <button
              onClick={() => setWave3SubTab('dairy_economics')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border ${
                wave3SubTab === 'dairy_economics'
                  ? 'bg-[#2d4a39] text-white border-[#2d4a39] shadow-xs'
                  : 'bg-white text-[#5a5a40] border-[#e3dec9] hover:bg-[#fcf9f2]'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Dairy Feed Cost & Profit Optimizer</span>
            </button>

            <button
              onClick={() => setWave3SubTab('mastitis_cmt')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border ${
                wave3SubTab === 'mastitis_cmt'
                  ? 'bg-[#2d4a39] text-white border-[#2d4a39] shadow-xs'
                  : 'bg-white text-[#5a5a40] border-[#e3dec9] hover:bg-[#fcf9f2]'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Subclinical Mastitis CMT Scoring Guide</span>
            </button>
          </div>

          {/* 3.1 GESTATION TIMELINE */}
          {wave3SubTab === 'gestation_timeline' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              <div className="lg:col-span-4 space-y-4">
                <div className="bg-white p-5 rounded-2xl border border-[#e3dec9] border-b-[4px] border-b-[#cdc6ad] shadow-sm space-y-4">
                  <h3 className="font-serif font-black text-base text-[#3c3c3b]">
                    Breeding Parameters
                  </h3>

                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-wider text-[#7a766f] mb-1.5">
                      Animal Species
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { key: 'cattle', label: '🐄 Cow (~283d)' },
                        { key: 'buffalo', label: '🐃 Buffalo (~310d)' },
                        { key: 'goat', label: '🐐 Goat (~150d)' },
                        { key: 'sheep', label: '🐑 Sheep (~148d)' },
                        { key: 'horse', label: '🐎 Mare (~340d)' }
                      ].map(sp => (
                        <button
                          key={sp.key}
                          onClick={() => setGestationSpecies(sp.key as any)}
                          className={`p-2.5 rounded-xl text-xs font-bold border transition-all text-center cursor-pointer ${
                            gestationSpecies === sp.key
                              ? 'bg-[#2d4a39] text-white border-[#2d4a39]'
                              : 'bg-[#fdfbf7] text-[#5a5a40] border-[#e3dec9] hover:bg-[#f4efe4]'
                          }`}
                        >
                          {sp.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-wider text-[#7a766f] mb-1">
                      Artificial Insemination (AI) / Mating Date
                    </label>
                    <input
                      type="date"
                      value={serviceDateInput}
                      onChange={(e) => setServiceDateInput(e.target.value)}
                      className="w-full p-2.5 text-xs rounded-xl border border-[#e3dec9] bg-[#fdfbf7] font-semibold"
                    />
                  </div>

                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 space-y-1">
                    <span className="font-bold block uppercase text-[10px] text-emerald-800">Expected Delivery Window</span>
                    <p className="text-base font-black text-emerald-900">{gestationResults.expectedDueDate}</p>
                    <p className="text-[11px] text-emerald-700">
                      Normal biological span: {gestationResults.windowMinDate} to {gestationResults.windowMaxDate}
                    </p>
                  </div>
                </div>
              </div>

              {/* Milestones Timeline */}
              <div className="lg:col-span-8 space-y-3">
                <div className="bg-white p-5 rounded-3xl border border-[#e3dec9] border-b-[4px] border-b-[#cdc6ad] shadow-sm">
                  <h4 className="font-serif font-black text-base text-[#3c3c3b] mb-4">
                    Sequential Reproductive & Nutritional Milestones
                  </h4>

                  <div className="relative border-l-2 border-[#2d4a39]/30 ml-4 space-y-4 pl-5">
                    {gestationResults.milestones.map((m, idx) => (
                      <div key={idx} className="relative">
                        <div className={`absolute -left-[27px] top-1 w-3.5 h-3.5 rounded-full border-2 border-white ${
                          m.urgency === 'critical' ? 'bg-red-500 ring-2 ring-red-200' :
                          m.urgency === 'important' ? 'bg-amber-500' : 'bg-[#2d4a39]'
                        }`} />
                        <div className="bg-[#fdfbf7] p-3.5 rounded-2xl border border-[#e3dec9]">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="text-xs font-black text-[#2d4a39]">
                              Day {m.dayNumber} ({m.dateString})
                            </span>
                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md text-white ${
                              m.urgency === 'critical' ? 'bg-red-600' :
                              m.urgency === 'important' ? 'bg-amber-600' : 'bg-stone-500'
                            }`}>
                              {m.category}
                            </span>
                          </div>
                          <h5 className="text-sm font-bold text-stone-900 m-0">{m.milestoneTitle}</h5>
                          <p className="text-xs text-stone-600 mt-1 leading-relaxed">{m.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                </div>
              </div>

            </div>
          )}

          {/* 3.2 DAIRY ECONOMICS */}
          {wave3SubTab === 'dairy_economics' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Left Column: Farm Finance Inputs */}
              <div className="lg:col-span-5 space-y-4">
                <div className="bg-white p-5 rounded-2xl border border-[#e3dec9] border-b-[4px] border-b-[#cdc6ad] shadow-sm space-y-3.5">
                  <h3 className="font-serif font-black text-base text-[#3c3c3b]">
                    Dairy Herd Production & Feed Costs
                  </h3>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-black uppercase tracking-wider text-[#7a766f] mb-1">
                        Milking Herd Count
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={5000}
                        value={milkingCowsCount}
                        onChange={(e) => setMilkingCowsCount(Number(e.target.value))}
                        className="w-full p-2 text-xs rounded-xl border border-[#e3dec9] bg-[#fdfbf7] font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-black uppercase tracking-wider text-[#7a766f] mb-1">
                        Avg Yield (L / cow / day)
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={60}
                        value={avgYieldLiters}
                        onChange={(e) => setAvgYieldLiters(Number(e.target.value))}
                        className="w-full p-2 text-xs rounded-xl border border-[#e3dec9] bg-[#fdfbf7] font-bold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-wider text-[#7a766f] mb-1">
                      Farmgate Milk Price (PKR / Liter)
                    </label>
                    <input
                      type="number"
                      min={50}
                      max={400}
                      value={milkPricePkr}
                      onChange={(e) => setMilkPricePkr(Number(e.target.value))}
                      className="w-full p-2 text-xs rounded-xl border border-[#e3dec9] bg-[#fdfbf7] font-bold text-emerald-800"
                    />
                  </div>

                  {/* Silage Inputs */}
                  <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-stone-700 block">🌽 Corn Silage</span>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] text-stone-500">kg / Cow / Day</span>
                        <input
                          type="number"
                          value={silageKgPerHead}
                          onChange={(e) => setSilageKgPerHead(Number(e.target.value))}
                          className="w-full p-1.5 text-xs rounded-lg border border-stone-300 bg-white"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-stone-500">PKR / kg</span>
                        <input
                          type="number"
                          value={silagePricePkr}
                          onChange={(e) => setSilagePricePkr(Number(e.target.value))}
                          className="w-full p-1.5 text-xs rounded-lg border border-stone-300 bg-white"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Concentrate / Wanda Inputs */}
                  <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-stone-700 block">🌾 Concentrate / Wanda</span>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] text-stone-500">kg / Cow / Day</span>
                        <input
                          type="number"
                          value={wandaKgPerHead}
                          onChange={(e) => setWandaKgPerHead(Number(e.target.value))}
                          className="w-full p-1.5 text-xs rounded-lg border border-stone-300 bg-white"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-stone-500">PKR / kg</span>
                        <input
                          type="number"
                          value={wandaPricePkr}
                          onChange={(e) => setWandaPricePkr(Number(e.target.value))}
                          className="w-full p-1.5 text-xs rounded-lg border border-stone-300 bg-white"
                        />
                      </div>
                    </div>
                  </div>

                </div>
              </div>

              {/* Right Column: Financial Results Dashboard */}
              <div className="lg:col-span-7 space-y-4">
                <div className="bg-gradient-to-br from-emerald-950 via-[#1c3829] to-[#12261b] text-white p-6 rounded-3xl border border-emerald-700 shadow-xl space-y-5">
                  <div className="flex items-center justify-between border-b border-emerald-800 pb-3">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-emerald-300 block">
                        FARM FINANCIAL PERFORMANCE LEDGER
                      </span>
                      <h4 className="text-lg font-serif font-black text-white m-0">
                        {dairyResults.totalDailyLiters} Liters Total Production / Day
                      </h4>
                    </div>
                    <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-bold px-3 py-1 rounded-xl">
                      {dairyResults.grossMarginPercent}% Profit Margin
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-white/10 p-4 rounded-2xl border border-white/10">
                      <span className="text-[10px] font-bold text-emerald-200 uppercase block">Daily Gross Revenue</span>
                      <p className="text-2xl font-black text-white mt-1">
                        Rs. {dairyResults.totalDailyRevenue.toLocaleString()}
                      </p>
                      <span className="text-[10px] text-stone-300">@{milkPricePkr} PKR / liter</span>
                    </div>

                    <div className="bg-rose-500/20 p-4 rounded-2xl border border-rose-400/30">
                      <span className="text-[10px] font-bold text-rose-200 uppercase block">Total Herd Daily Feed Cost</span>
                      <p className="text-2xl font-black text-rose-300 mt-1">
                        Rs. {dairyResults.totalHerdDailyFeedCost.toLocaleString()}
                      </p>
                      <span className="text-[10px] text-rose-200">Rs. {dairyResults.singleAnimalFeedCost} / cow / day</span>
                    </div>

                    <div className="bg-emerald-500/20 p-4 rounded-2xl border border-emerald-400/30 col-span-2">
                      <span className="text-[10px] font-bold text-emerald-200 uppercase block">Estimated Net Profit</span>
                      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 mt-1">
                        <p className="text-3xl font-black text-amber-300 m-0">
                          Rs. {dairyResults.netDailyProfit.toLocaleString()} <span className="text-xs font-normal text-white">/ day</span>
                        </p>
                        <span className="text-sm font-bold text-emerald-300">
                          ~Rs. {dairyResults.netMonthlyProfit.toLocaleString()} / Month
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/10 text-xs">
                    <div className="bg-black/30 p-3 rounded-xl border border-white/5">
                      <span className="text-stone-400 block text-[10px] uppercase font-bold">Feed Cost Per Liter:</span>
                      <strong className="text-white text-sm">Rs. {dairyResults.feedCostPerLiter}</strong>
                    </div>
                    <div className="bg-black/30 p-3 rounded-xl border border-white/5">
                      <span className="text-stone-400 block text-[10px] uppercase font-bold">Break-Even Yield / Cow:</span>
                      <strong className="text-amber-300 text-sm">{dairyResults.breakEvenYieldPerCow} Liters</strong>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* 3.3 SUBCLINICAL MASTITIS CMT GUIDE */}
          {wave3SubTab === 'mastitis_cmt' && (
            <div className="bg-white p-6 rounded-3xl border border-[#e3dec9] border-b-[4px] border-b-[#cdc6ad] shadow-sm space-y-4">
              <div>
                <h3 className="font-serif font-black text-base text-[#3c3c3b]">
                  California Mastitis Test (CMT) Interpretation & Somatic Cell Count (SCC) Matrix
                </h3>
                <p className="text-xs text-stone-500">
                  Authoritative scoring guide to detect subclinical mastitis before visible clots appear in milk.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                {[
                  { score: 'N (Negative)', gel: 'No thickening; mixture remains completely liquid', scc: '<200,000 cells/mL', action: 'Healthy quarter. Normal milking.', color: 'bg-emerald-50 border-emerald-300 text-emerald-950' },
                  { score: 'T (Trace)', gel: 'Slight slime forms at bottom of paddle; disappears with swirl', scc: '200,000 - 400,000', action: 'Re-test in 3 days. Inspect teat dipping.', color: 'bg-lime-50 border-lime-300 text-lime-950' },
                  { score: '1 (Weak Positive)', gel: 'Distinct gel formation with no central peak', scc: '400,000 - 1,200,000', action: 'Subclinical mastitis. Culture milk sample.', color: 'bg-amber-50 border-amber-300 text-amber-950' },
                  { score: '2 (Distinct Positive)', gel: 'Mixture thickens immediately; moves toward center as paddle swirls', scc: '1,200,000 - 5,000,000', action: 'Isolate milk. Treat quarter with intramammary antibiotics.', color: 'bg-orange-50 border-orange-300 text-orange-950' },
                  { score: '3 (Strong Positive)', gel: 'Heavy viscous gel forming central convex peak (like egg white)', scc: '>5,000,000 cells/mL', action: 'Acute infection. Immediate vet intervention and NSAID therapy.', color: 'bg-rose-50 border-rose-300 text-rose-950' }
                ].map((item, idx) => (
                  <div key={idx} className={`p-4 rounded-2xl border ${item.color} space-y-2`}>
                    <span className="text-[10px] font-black uppercase tracking-wider block">CMT Score</span>
                    <h5 className="text-sm font-black m-0">{item.score}</h5>
                    <p className="text-[11px] leading-tight font-medium"><strong>Viscosity: </strong>{item.gel}</p>
                    <span className="text-[10px] block font-bold">SCC: {item.scc}</span>
                    <p className="text-[10px] pt-1 border-t border-black/10 font-bold">Action: {item.action}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}

      {/* ========================================================================= */}
      {/* WAVE 4: PET DS (DISEASES, DIAGNOSTICS & CLINICAL GUIDELINES)             */}
      {/* ========================================================================= */}
      {activeWave === 'wave4' && (
        <div className="space-y-6">
          {/* Wave 4 Sub-Tabs Navigation */}
          <div className="flex flex-wrap gap-2 p-1.5 bg-[#eae4d3] rounded-2xl border border-[#cdc6ad]">
            <button
              onClick={() => setWave4SubTab('pet_ds')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                wave4SubTab === 'pet_ds'
                  ? 'bg-[#5a5a40] text-white shadow-xs'
                  : 'text-[#5a5a40] hover:bg-white/50'
              }`}
            >
              <span>🔬</span> Pet DS: Disease Protocols &amp; Emergencies
            </button>
            <button
              onClick={() => setWave4SubTab('blood_ranges')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                wave4SubTab === 'blood_ranges'
                  ? 'bg-[#5a5a40] text-white shadow-xs'
                  : 'text-[#5a5a40] hover:bg-white/50'
              }`}
            >
              <span>🩸</span> Canine &amp; Feline Blood Test Normal Ranges
            </button>
            <button
              onClick={() => setWave4SubTab('travel_iata')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                wave4SubTab === 'travel_iata'
                  ? 'bg-[#5a5a40] text-white shadow-xs'
                  : 'text-[#5a5a40] hover:bg-white/50'
              }`}
            >
              <span>✈️</span> Pet Travel (USDA / CDC) &amp; IATA Crate Calculator
            </button>
            <button
              onClick={() => setWave4SubTab('safe_adoption')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                wave4SubTab === 'safe_adoption'
                  ? 'bg-[#5a5a40] text-white shadow-xs'
                  : 'text-[#5a5a40] hover:bg-white/50'
              }`}
            >
              <span>🛡️</span> Safe Pet Adoption &amp; Anti-Scam Guide
            </button>
          </div>

          {/* 4.1 PET DS: DISEASE PROTOCOLS & EMERGENCIES */}
          {wave4SubTab === 'pet_ds' && (
            <div className="space-y-6">
              {/* Header Card */}
              <div className="bg-white p-6 rounded-3xl border border-[#e3dec9] border-b-[4px] border-b-[#cdc6ad] shadow-sm">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#5a5a40] bg-[#f4efe4] px-2.5 py-1 rounded-full">
                      Clinical Reference Guide
                    </span>
                    <h3 className="font-serif font-black text-xl text-[#3c3c3b] mt-1">
                      Pet DS — Critical Disease Triage, Timelines &amp; Emergency Signs
                    </h3>
                    <p className="text-xs text-stone-500 mt-0.5">
                      Evidence-based clinical disease markers: Canine Parvovirus, Feline CKD Staging, GDV Bloat, and FIP therapeutic protocols.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopy(
                        "CANINE PARVOVIRUS PROTOCOL: Day 1-2 Fever, anorexia; Day 3-4 Projectile vomiting, hematochezia, severe leukopenia; Day 5+ Sepsis risk. Triage: IV crystalloids (LRS/Plasmalyte), Maropitant (1 mg/kg), Ampicillin/Enrofloxacin, Buprenorphine, micro-enteral nutrition.\n\nFELINE CKD IRIS STAGES: Stage 1 (<1.6 mg/dL, >3 yrs); Stage 2 (1.6-2.8 mg/dL, 2-3 yrs); Stage 3 (2.9-5.0 mg/dL, 1-2 yrs); Stage 4 (>5.0 mg/dL, 1-3 mos).\n\nDOG BLOAT (GDV): Non-productive retching, tympanic abdominal distension, restlessness. Emergency: Decompress stomach immediately, IV shock fluids, surgical gastropexy.",
                        "pet_ds_summary"
                      )}
                      className="px-3 py-1.5 bg-[#fcf9f2] border border-[#e3dec9] hover:bg-[#eae4d3] text-[#5a5a40] rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      {copiedKey === 'pet_ds_summary' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedKey === 'pet_ds_summary' ? 'Copied' : 'Copy Emergency Protocols'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* 1. Canine Parvovirus Day-by-Day Progression */}
              <div className="bg-white p-6 rounded-3xl border border-[#e3dec9] border-b-[4px] border-b-[#cdc6ad] shadow-sm space-y-4">
                <div className="flex items-center gap-2">
                  <span className="p-2 rounded-xl bg-rose-100 text-rose-800 text-lg">🦠</span>
                  <div>
                    <h4 className="font-serif font-black text-base text-stone-900 m-0">
                      Canine Parvovirus (CPV-2) Symptoms in Puppies — Day-by-Day Timeline
                    </h4>
                    <p className="text-xs text-stone-500">
                      Incubation: 3 to 7 days post-exposure. Immediate hospitalization within 48 hours boosts survival from 10% to &gt;85%.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 bg-amber-200/60 px-2 py-0.5 rounded-md">
                      Days 1 – 2: Prodromal
                    </span>
                    <h5 className="font-bold text-sm text-amber-950 m-0">Early Malaise &amp; Fever</h5>
                    <ul className="text-[11px] text-amber-900 space-y-1 list-disc pl-4">
                      <li>High fever (103°F - 105°F)</li>
                      <li>Depression, reluctance to play</li>
                      <li>Refusal of food and water</li>
                      <li>Early subclinical leukopenia</li>
                    </ul>
                  </div>

                  <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-rose-800 bg-rose-200/60 px-2 py-0.5 rounded-md">
                      Days 3 – 4: Acute GI Crisis
                    </span>
                    <h5 className="font-bold text-sm text-rose-950 m-0">Vomiting &amp; Hematochezia</h5>
                    <ul className="text-[11px] text-rose-900 space-y-1 list-disc pl-4">
                      <li>Intractable projectile vomiting</li>
                      <li>Foul, mustard-colored or bloody diarrhea</li>
                      <li>Profound dehydration (&gt;8-10%)</li>
                      <li>Hypoglycemia &amp; hypokalemia</li>
                    </ul>
                  </div>

                  <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-purple-800 bg-purple-200/60 px-2 py-0.5 rounded-md">
                      Days 5 – 7: Critical Window
                    </span>
                    <h5 className="font-bold text-sm text-purple-950 m-0">Endotoxemia &amp; Sepsis</h5>
                    <ul className="text-[11px] text-purple-900 space-y-1 list-disc pl-4">
                      <li>Intestinal mucosal barrier collapse</li>
                      <li>Bacterial translocation (Gram-negative sepsis)</li>
                      <li>Severe neutropenia (WBC &lt; 2,000/mcL)</li>
                      <li>Hypothermia &amp; septic shock risk</li>
                    </ul>
                  </div>

                  <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-200/60 px-2 py-0.5 rounded-md">
                      Day 8+: Recovery
                    </span>
                    <h5 className="font-bold text-sm text-emerald-950 m-0">Mucosal Regeneration</h5>
                    <ul className="text-[11px] text-emerald-900 space-y-1 list-disc pl-4">
                      <li>Vomiting cessation, appetite returns</li>
                      <li>Stool begins firming up</li>
                      <li>Rebound leukocytosis</li>
                      <li>Lifelong immunity established</li>
                    </ul>
                  </div>
                </div>

                <div className="bg-[#fcf9f2] p-4 rounded-2xl border border-[#e3dec9] text-xs text-stone-700 space-y-1.5">
                  <h6 className="font-bold text-stone-900 text-xs">Standard Parvovirus Inpatient Triage Protocol:</h6>
                  <p className="text-[11px] leading-relaxed">
                    1. <strong>Aggressive Crystalloid Resuscitation:</strong> Plasmalyte or LRS at 60-90 mL/kg/day + dehydration deficit + ongoing losses, supplemented with 20-30 mEq/L KCl and 2.5-5% dextrose.<br />
                    2. <strong>Antiemetic Control:</strong> Maropitant (Cerenia) 1 mg/kg SC q24h + Ondansetron 0.5 mg/kg IV q8h.<br />
                    3. <strong>Broad-Spectrum Antimicrobials:</strong> Ampicillin-Sulbactam 30 mg/kg IV q8h OR Cefazolin + Enrofloxacin/Amikacin once hydrated.<br />
                    4. <strong>Early Enteral Nutrition:</strong> Micro-enteral trickle feeding via nasogastric tube accelerates enterocyte healing.
                  </p>
                </div>
              </div>

              {/* 2. Feline Chronic Kidney Disease (CKD) IRIS Staging & Survival Rates */}
              <div className="bg-white p-6 rounded-3xl border border-[#e3dec9] border-b-[4px] border-b-[#cdc6ad] shadow-sm space-y-4">
                <div className="flex items-center gap-2">
                  <span className="p-2 rounded-xl bg-blue-100 text-blue-800 text-lg">🐱</span>
                  <div>
                    <h4 className="font-serif font-black text-base text-stone-900 m-0">
                      Cat Chronic Kidney Disease (CKD) — IRIS Staging, Lab Markers &amp; Survival Rates
                    </h4>
                    <p className="text-xs text-stone-500">
                      International Renal Interest Society (IRIS) classification based on fasting blood creatinine and symmetric dimethylarginine (SDMA).
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border border-stone-200 rounded-xl overflow-hidden">
                    <thead className="bg-[#f4efe4] text-[#5a5a40] font-black uppercase text-[10px]">
                      <tr>
                        <th className="p-3">IRIS Stage</th>
                        <th className="p-3">Serum Creatinine</th>
                        <th className="p-3">Blood SDMA</th>
                        <th className="p-3">Remaining Nephrons</th>
                        <th className="p-3">Median Survival Time</th>
                        <th className="p-3">Primary Clinical Interventions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 text-[11px] text-stone-700">
                      <tr className="hover:bg-stone-50">
                        <td className="p-3 font-bold text-emerald-700">Stage 1 (Non-Azotemic)</td>
                        <td className="p-3 font-mono">&lt; 1.6 mg/dL</td>
                        <td className="p-3 font-mono">&lt; 18 mcg/dL</td>
                        <td className="p-3">33% – 100%</td>
                        <td className="p-3 font-bold text-stone-900">&gt; 3 Years (1,150+ days)</td>
                        <td className="p-3">Treat underlying cause, discontinue nephrotoxic drugs, monitor blood pressure &amp; proteinuria.</td>
                      </tr>
                      <tr className="hover:bg-stone-50">
                        <td className="p-3 font-bold text-blue-700">Stage 2 (Mild Azotemia)</td>
                        <td className="p-3 font-mono">1.6 – 2.8 mg/dL</td>
                        <td className="p-3 font-mono">18 – 25 mcg/dL</td>
                        <td className="p-3">25% – 33%</td>
                        <td className="p-3 font-bold text-stone-900">2 to 3 Years (800+ days)</td>
                        <td className="p-3">Transition to veterinary renal diet (low phosphorus, high-quality restricted protein), hydration support.</td>
                      </tr>
                      <tr className="hover:bg-stone-50">
                        <td className="p-3 font-bold text-amber-700">Stage 3 (Moderate Azotemia)</td>
                        <td className="p-3 font-mono">2.9 – 5.0 mg/dL</td>
                        <td className="p-3 font-mono">26 – 38 mcg/dL</td>
                        <td className="p-3">10% – 25%</td>
                        <td className="p-3 font-bold text-stone-900">1 to 2 Years (~400 days)</td>
                        <td className="p-3">Strict renal prescription diet, intestinal phosphate binders (calcium carbonate/sevelamer), potassium supplementation, SQ fluids.</td>
                      </tr>
                      <tr className="hover:bg-stone-50">
                        <td className="p-3 font-bold text-rose-700">Stage 4 (Severe End-Stage)</td>
                        <td className="p-3 font-mono">&gt; 5.0 mg/dL</td>
                        <td className="p-3 font-mono">&gt; 38 mcg/dL</td>
                        <td className="p-3">&lt; 10%</td>
                        <td className="p-3 font-bold text-stone-900">1 to 3 Months (~35 – 100 days)</td>
                        <td className="p-3">Daily SQ fluids (LRS), appetite stimulants (mirtazapine), anti-nausea therapy, EPO for non-regenerative anemia.</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 3. Dog Bloat GDV & Emergency Triad */}
              <div className="bg-white p-6 rounded-3xl border border-[#e3dec9] border-b-[4px] border-b-[#cdc6ad] shadow-sm space-y-4">
                <div className="flex items-center gap-2">
                  <span className="p-2 rounded-xl bg-red-100 text-red-800 text-lg">⚠️</span>
                  <div>
                    <h4 className="font-serif font-black text-base text-stone-900 m-0">
                      Dog Bloat (Gastric Dilatation-Volvulus / GDV) — Emergency Signs &amp; Immediate Action
                    </h4>
                    <p className="text-xs text-stone-500">
                      Deep-chested breeds (Great Danes, German Shepherds, Standard Poodles, Boxers). 100% fatal without emergency surgery.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div className="p-4 rounded-2xl bg-red-50 border border-red-200 space-y-1.5">
                    <span className="text-[10px] font-black uppercase text-red-700">Classic Symptom 1</span>
                    <h5 className="font-bold text-red-950 text-sm m-0">Unproductive Retching</h5>
                    <p className="text-[11px] text-red-900">
                      The dog frantically attempts to vomit every few minutes, coughing up small amounts of white saliva or thick foam without bringing up stomach contents.
                    </p>
                  </div>
                  <div className="p-4 rounded-2xl bg-red-50 border border-red-200 space-y-1.5">
                    <span className="text-[10px] font-black uppercase text-red-700">Classic Symptom 2</span>
                    <h5 className="font-bold text-red-950 text-sm m-0">Distended, Hard Abdomen</h5>
                    <p className="text-[11px] text-red-900">
                      The cranial abdomen balloons outwards, feeling tight and drum-like when gently tapped (tympanitic sound).
                    </p>
                  </div>
                  <div className="p-4 rounded-2xl bg-red-50 border border-red-200 space-y-1.5">
                    <span className="text-[10px] font-black uppercase text-red-700">Classic Symptom 3</span>
                    <h5 className="font-bold text-red-950 text-sm m-0">Extreme Restlessness &amp; Pain</h5>
                    <p className="text-[11px] text-red-900">
                      Inability to lie down comfortably, pacing, looking at the flank, rapid shallow panting, pale or grayish gums, and sudden collapse from caudal vena cava shock.
                    </p>
                  </div>
                </div>

                <div className="bg-stone-900 text-white p-4 rounded-2xl text-xs space-y-1">
                  <span className="text-[10px] uppercase tracking-wider text-amber-400 font-bold block">🚨 Immediate Action Required:</span>
                  <p className="text-[11px] text-stone-300">
                    Transport immediately to the nearest 24/7 veterinary emergency hospital. Do NOT give water, food, or home remedies. Vets must decompress the stomach with an 14G needle trochar or orogastric tube, administer shock IV fluids via large-bore front-leg catheters, and perform emergency surgical derotation with incisional gastropexy.
                  </p>
                </div>
              </div>

              {/* 4. FIP & Canine Distemper Differential */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-5 rounded-3xl border border-[#e3dec9] space-y-2">
                  <span className="text-[10px] font-black uppercase text-purple-700 bg-purple-100 px-2 py-0.5 rounded">Feline Clinical Protocol</span>
                  <h5 className="font-bold text-sm text-stone-900 m-0">Feline Infectious Peritonitis (FIP) — GS-441524 Protocol</h5>
                  <p className="text-[11px] text-stone-600 leading-relaxed">
                    Once deemed 100% fatal, FIP is now curable with nucleoside analog GS-441524 (oral or SC) administered daily for 84 consecutive days.<br />
                    • <strong>Wet / Effusive FIP:</strong> 5 – 6 mg/kg q24h<br />
                    • <strong>Dry / Non-effusive FIP:</strong> 6 – 8 mg/kg q24h<br />
                    • <strong>Ocular FIP:</strong> 8 – 10 mg/kg q24h<br />
                    • <strong>Neurological FIP:</strong> 10 – 15 mg/kg q24h<br />
                    Monitor body weight weekly to adjust dose as kitten grows. Evaluate complete blood count and A:G ratio at weeks 4, 8, and 12.
                  </p>
                </div>

                <div className="bg-white p-5 rounded-3xl border border-[#e3dec9] space-y-2">
                  <span className="text-[10px] font-black uppercase text-amber-700 bg-amber-100 px-2 py-0.5 rounded">Differential Diagnosis</span>
                  <h5 className="font-bold text-sm text-stone-900 m-0">Canine Distemper Early Symptoms vs. Kennel Cough</h5>
                  <p className="text-[11px] text-stone-600 leading-relaxed">
                    • <strong>Kennel Cough (CIRD Complex):</strong> Sharp, dry, hacking "honking" cough often triggered by tracheal palpation. Dogs remain energetic and maintain normal appetite. Self-limiting in 10–14 days.<br />
                    • <strong>Canine Distemper Virus (CDV):</strong> Biphasic fever spike, thick mucopurulent oculonasal discharge, severe lethargy, coughing, vomiting, diarrhea, followed weeks later by hyperkeratosis ("hard pad disease" of nose and paw pads), enamel hypoplasia, and neurological involuntary muscle twitching (myoclonus) or seizures.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 4.2 CANINE & FELINE BLOOD TEST NORMAL REFERENCE RANGES */}
          {wave4SubTab === 'blood_ranges' && (
            <div className="bg-white p-6 rounded-3xl border border-[#e3dec9] border-b-[4px] border-b-[#cdc6ad] shadow-sm space-y-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#5a5a40] bg-[#f4efe4] px-2.5 py-1 rounded-full">
                    Laboratory Diagnostics Reference Chart
                  </span>
                  <h3 className="font-serif font-black text-xl text-[#3c3c3b] mt-1">
                    Canine &amp; Feline Blood Test Normal Ranges — Reference Matrix
                  </h3>
                  <p className="text-xs text-stone-500">
                    Comprehensive normal reference ranges for Complete Blood Count (CBC) and Serum Chemistry Profiles with clinical indications.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopy(
                      "CANINE BLOOD NORMAL RANGES:\nRBC: 5.5 - 8.5 x10^6/mcL | HGB: 12.0 - 18.0 g/dL | HCT: 37 - 55%\nWBC: 6.0 - 17.0 x10^3/mcL | Platelets: 175 - 500 x10^3/mcL\nBUN: 7 - 27 mg/dL | Creatinine: 0.5 - 1.4 mg/dL | SDMA: 0 - 14 mcg/dL\nALT: 10 - 100 U/L | ALKP: 20 - 150 U/L | Total Protein: 5.4 - 7.5 g/dL\nAlbumin: 2.6 - 4.0 g/dL | Glucose: 70 - 130 mg/dL\nSodium: 140 - 154 mEq/L | Potassium: 3.8 - 5.6 mEq/L | Chloride: 105 - 120 mEq/L\n\nFELINE BLOOD NORMAL RANGES:\nRBC: 5.0 - 10.0 x10^6/mcL | HGB: 9.0 - 15.0 g/dL | HCT: 29 - 45%\nWBC: 5.5 - 19.5 x10^3/mcL | Platelets: 200 - 600 x10^3/mcL\nBUN: 14 - 36 mg/dL | Creatinine: 0.8 - 2.4 mg/dL | SDMA: 0 - 14 mcg/dL\nALT: 10 - 80 U/L | ALKP: 10 - 90 U/L | Total Protein: 6.0 - 8.0 g/dL\nAlbumin: 2.3 - 3.9 g/dL | Glucose: 70 - 150 mg/dL",
                      "blood_chart_copy"
                    )}
                    className="px-3 py-1.5 bg-[#fcf9f2] border border-[#e3dec9] hover:bg-[#eae4d3] text-[#5a5a40] rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs shrink-0"
                  >
                    {copiedKey === 'blood_chart_copy' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey === 'blood_chart_copy' ? 'Copied Chart' : 'Copy All Lab Ranges'}</span>
                  </button>
                </div>
              </div>

              {/* Search & Species Filter */}
              <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-stone-50 p-3 rounded-2xl border border-stone-200">
                <div className="relative w-full sm:w-72">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type="text"
                    value={bloodSearchQuery}
                    onChange={(e) => setBloodSearchQuery(e.target.value)}
                    placeholder="Search biomarker (e.g. Creatinine, RBC, ALT)..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-[#cdc6ad] bg-white text-xs text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-[#5a5a40]"
                  />
                </div>

                <div className="flex items-center gap-1 text-xs">
                  <span className="font-semibold text-stone-600 mr-1 text-[11px]">Species:</span>
                  {(['all', 'canine', 'feline'] as const).map((sp) => (
                    <button
                      key={sp}
                      onClick={() => setBloodSpeciesFilter(sp)}
                      className={`px-3 py-1 rounded-xl font-bold capitalize transition-all cursor-pointer ${
                        bloodSpeciesFilter === sp
                          ? 'bg-[#5a5a40] text-white'
                          : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-100'
                      }`}
                    >
                      {sp === 'all' ? 'All Biomarkers' : sp === 'canine' ? '🐕 Dogs Only' : '🐈 Cats Only'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Lab Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border border-stone-200 rounded-xl overflow-hidden">
                  <thead className="bg-[#f4efe4] text-[#5a5a40] font-black uppercase text-[10px]">
                    <tr>
                      <th className="p-3">Biomarker</th>
                      <th className="p-3">Category</th>
                      <th className="p-3">Canine Range (Dog)</th>
                      <th className="p-3">Feline Range (Cat)</th>
                      <th className="p-3">Units</th>
                      <th className="p-3">Clinical Indication (High / Low)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 text-[11px] text-stone-700">
                    {[
                      { name: 'RBC (Red Blood Cells)', cat: 'CBC', dog: '5.5 – 8.5', catRange: '5.0 – 10.0', unit: 'x10^6 / mcL', indication: 'Low: Non-regenerative or hemolytic anemia, blood loss. High: Dehydration (hemoconcentration), polycythemia.' },
                      { name: 'Hemoglobin (HGB)', cat: 'CBC', dog: '12.0 – 18.0', catRange: '9.0 – 15.0', unit: 'g/dL', indication: 'Oxygen transport protein. Low: Anemia, hemorrhage, iron deficiency. High: Dehydration.' },
                      { name: 'Hematocrit (HCT / PCV)', cat: 'CBC', dog: '37.0 – 55.0', catRange: '29.0 – 45.0', unit: '%', indication: 'Volume of RBCs. PCV <20% indicates severe anemia requiring blood transfusion consideration.' },
                      { name: 'WBC (Total Leukocytes)', cat: 'CBC', dog: '6.0 – 17.0', catRange: '5.5 – 19.5', unit: 'x10^3 / mcL', indication: 'Low: Viral infections (Parvo, Panleukopenia), bone marrow toxicity. High: Bacterial infection, inflammation, stress leukogram.' },
                      { name: 'Platelets (PLT)', cat: 'CBC', dog: '175 – 500', catRange: '200 – 600', unit: 'x10^3 / mcL', indication: 'Clotting cells. Low: Tick-borne diseases (Ehrlichia, Babesia), immune thrombocytopenia (ITP), DIC bleeding.' },
                      { name: 'BUN (Blood Urea Nitrogen)', cat: 'Chemistry', dog: '7.0 – 27.0', catRange: '14.0 – 36.0', unit: 'mg/dL', indication: 'Low: Hepatic insufficiency, portosystemic shunt. High: Renal failure, dehydration (prerenal azotemia), GI bleed.' },
                      { name: 'Creatinine (CREA)', cat: 'Chemistry', dog: '0.5 – 1.4', catRange: '0.8 – 2.4', unit: 'mg/dL', indication: 'Key renal filtration index. Elevations indicate loss of >67-75% functional nephrons.' },
                      { name: 'SDMA (Symmetric Dimethylarginine)', cat: 'Chemistry', dog: '0 – 14.0', catRange: '0 – 14.0', unit: 'mcg/dL', indication: 'Early biomarker of kidney disease, detects loss of 25-40% kidney function well before creatinine rises.' },
                      { name: 'ALT (Alanine Aminotransferase)', cat: 'Chemistry', dog: '10 – 100', catRange: '10 – 80', unit: 'U/L', indication: 'Specific liver parenchymal leakage enzyme. High: Acute hepatic injury, trauma, toxicities (acetaminophen, NSAIDs).' },
                      { name: 'ALKP / ALP (Alkaline Phosphatase)', cat: 'Chemistry', dog: '20 – 150', catRange: '10 – 90', unit: 'U/L', indication: 'Cholestasis & bone turnover. High: Biliary obstruction, Cushing\'s disease (hyperadrenocorticism), steroid administration.' },
                      { name: 'Total Protein (TP)', cat: 'Chemistry', dog: '5.4 – 7.5', catRange: '6.0 – 8.0', unit: 'g/dL', indication: 'Low: Protein-losing nephropathy/enteropathy, liver failure. High: Dehydration, multiple myeloma, chronic infection (FIP).' },
                      { name: 'Albumin (ALB)', cat: 'Chemistry', dog: '2.6 – 4.0', catRange: '2.3 – 3.9', unit: 'g/dL', indication: 'Oncotic pressure maintainer. Low: Severe GI loss (PLE), kidney loss (PLN), third-space fluid effusion.' },
                      { name: 'Glucose (GLU)', cat: 'Chemistry', dog: '70 – 130', catRange: '70 – 150', unit: 'mg/dL', indication: 'Low: Sepsis, neonatal starvation, insulinoma. High: Diabetes mellitus, feline stress-induced hyperglycemia.' },
                      { name: 'Sodium (Na+)', cat: 'Electrolytes', dog: '140 – 154', catRange: '145 – 158', unit: 'mEq/L', indication: 'Extracellular fluid osmolality. Low: Addison\'s disease (hypoadrenocorticism), severe diarrhea. High: Dehydration, water deprivation.' },
                      { name: 'Potassium (K+)', cat: 'Electrolytes', dog: '3.8 – 5.6', catRange: '3.7 – 5.3', unit: 'mEq/L', indication: 'Cardiac conduction critical ion. High: Urethral obstruction (blocked tomcat), Addison\'s, acute renal failure. Low: Anorexia, CKD losses.' },
                      { name: 'Phosphorus (PHOS)', cat: 'Chemistry', dog: '2.5 – 6.0', catRange: '2.5 – 6.5', unit: 'mg/dL', indication: 'Mineral metabolism. Elevated in renal failure due to impaired excretion; accelerates kidney damage progression.' }
                    ].filter((item) => {
                      const matchQuery = bloodSearchQuery.trim() === '' || 
                        item.name.toLowerCase().includes(bloodSearchQuery.toLowerCase()) || 
                        item.cat.toLowerCase().includes(bloodSearchQuery.toLowerCase()) ||
                        item.indication.toLowerCase().includes(bloodSearchQuery.toLowerCase());
                      return matchQuery;
                    }).map((row, idx) => (
                      <tr key={idx} className="hover:bg-stone-50">
                        <td className="p-3 font-bold text-stone-900">{row.name}</td>
                        <td className="p-3">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-stone-100 text-stone-700">
                            {row.cat}
                          </span>
                        </td>
                        <td className="p-3 font-mono font-semibold text-emerald-800">{row.dog}</td>
                        <td className="p-3 font-mono font-semibold text-blue-800">{row.catRange}</td>
                        <td className="p-3 text-stone-500 font-mono text-[10px]">{row.unit}</td>
                        <td className="p-3 text-[10px] text-stone-600 leading-tight max-w-xs">{row.indication}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 4.3 INTERNATIONAL PET TRAVEL (USDA / CDC / IATA CRATE CALCULATOR) */}
          {wave4SubTab === 'travel_iata' && (
            <div className="space-y-6">
              {/* Guidelines Card */}
              <div className="bg-white p-6 rounded-3xl border border-[#e3dec9] border-b-[4px] border-b-[#cdc6ad] shadow-sm space-y-4">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#5a5a40] bg-[#f4efe4] px-2.5 py-1 rounded-full">
                    International Pet Travel Regulations
                  </span>
                  <h3 className="font-serif font-black text-xl text-[#3c3c3b] mt-1">
                    International Pet Travel Guidelines — USDA APHIS, CDC &amp; IATA Flight Standards
                  </h3>
                  <p className="text-xs text-stone-500">
                    Mandatory protocols for flying dogs and cats across the United States, European Union, United Kingdom, and Middle East.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                  <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-1.5">
                    <span className="text-[10px] font-bold text-stone-500 block uppercase">Step 1</span>
                    <h5 className="font-bold text-stone-900 text-sm m-0">ISO 11784/11785 Microchip</h5>
                    <p className="text-[11px] text-stone-600">
                      Must be a 15-digit non-encrypted microchip operating at 134.2 kHz. <strong>Crucial rule:</strong> The microchip must be implanted BEFORE or on the same day as the primary rabies vaccination.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-1.5">
                    <span className="text-[10px] font-bold text-stone-500 block uppercase">Step 2</span>
                    <h5 className="font-bold text-stone-900 text-sm m-0">Rabies &amp; Titer Test (FAVN)</h5>
                    <p className="text-[11px] text-stone-600">
                      Rabies vaccine administered at age &gt;12 weeks. High-risk rabies countries require an OIE/CDC certified Fluorescent Antibody Virus Neutralization (FAVN) test with titer level &gt;= 0.5 IU/mL, drawn at least 30 days post-vaccination.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-1.5">
                    <span className="text-[10px] font-bold text-stone-500 block uppercase">Step 3</span>
                    <h5 className="font-bold text-stone-900 text-sm m-0">Animal Health Certificate (AHC)</h5>
                    <p className="text-[11px] text-stone-600">
                      USDA APHIS 7001 or destination country endorsed certificate signed by an accredited veterinarian within 10 days of departure. Internal and external parasite (Tapeworm / Echinococcus) treatment 24-120h prior to entry into UK/EU.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-1.5">
                    <span className="text-[10px] font-bold text-stone-500 block uppercase">Step 4</span>
                    <h5 className="font-bold text-stone-900 text-sm m-0">Updated CDC Dog Import Rules</h5>
                    <p className="text-[11px] text-stone-600">
                      Dogs entering the US must be at least 6 months old, have an ISO microchip, look healthy, and have the online CDC Dog Import Form receipt submitted prior to boarding the flight.
                    </p>
                  </div>
                </div>
              </div>

              {/* Interactive IATA Crate Dimensions Calculator */}
              <div className="bg-white p-6 rounded-3xl border border-[#e3dec9] border-b-[4px] border-b-[#cdc6ad] shadow-sm space-y-5">
                <div>
                  <h4 className="font-serif font-black text-base text-stone-900 m-0">
                    📐 Interactive IATA Approved Airline Pet Carrier Crate Sizing Calculator
                  </h4>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Airlines strictly enforce IATA Live Animal Regulations (LAR). Crates where the animal cannot stand fully erect, turn around 360°, and lie down comfortably will be rejected at cargo check-in.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Inputs */}
                  <div className="space-y-4">
                    <h5 className="text-xs font-bold text-stone-700 uppercase tracking-wider">Pet Measurements (in Centimeters):</h5>
                    
                    <div>
                      <label className="text-xs font-semibold text-stone-800 flex justify-between">
                        <span>A: Animal Length (Nose tip to base of tail)</span>
                        <span className="font-mono text-[#5a5a40] font-bold">{petLengthA} cm</span>
                      </label>
                      <input
                        type="range"
                        min="20"
                        max="130"
                        value={petLengthA}
                        onChange={(e) => setPetLengthA(Number(e.target.value))}
                        className="w-full accent-[#5a5a40]"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-stone-800 flex justify-between">
                        <span>B: Front Leg Height (Elbow joint to ground)</span>
                        <span className="font-mono text-[#5a5a40] font-bold">{petElbowB} cm</span>
                      </label>
                      <input
                        type="range"
                        min="5"
                        max="60"
                        value={petElbowB}
                        onChange={(e) => setPetElbowB(Number(e.target.value))}
                        className="w-full accent-[#5a5a40]"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-stone-800 flex justify-between">
                        <span>C: Animal Width (Widest point across shoulders)</span>
                        <span className="font-mono text-[#5a5a40] font-bold">{petWidthC} cm</span>
                      </label>
                      <input
                        type="range"
                        min="10"
                        max="50"
                        value={petWidthC}
                        onChange={(e) => setPetWidthC(Number(e.target.value))}
                        className="w-full accent-[#5a5a40]"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-stone-800 flex justify-between">
                        <span>D: Standing Height (Ground to top of head / ear tips)</span>
                        <span className="font-mono text-[#5a5a40] font-bold">{petHeightD} cm</span>
                      </label>
                      <input
                        type="range"
                        min="15"
                        max="110"
                        value={petHeightD}
                        onChange={(e) => setPetHeightD(Number(e.target.value))}
                        className="w-full accent-[#5a5a40]"
                      />
                    </div>
                  </div>

                  {/* Calculated Results */}
                  {(() => {
                    const minLength = Math.round(petLengthA + (petElbowB / 2));
                    const minWidth = Math.round(petWidthC * 2);
                    const minHeight = Math.round(petHeightD + 5); // +5cm airline safety clearance

                    let recommendedSize = "IATA #100 (Small: 53 x 40 x 38 cm)";
                    if (minLength > 100 || minHeight > 80) recommendedSize = "IATA #700 (Giant: 122 x 81 x 89 cm)";
                    else if (minLength > 85 || minHeight > 68) recommendedSize = "IATA #500 (X-Large: 102 x 69 x 76 cm)";
                    else if (minLength > 75 || minHeight > 60) recommendedSize = "IATA #400 (Large: 91 x 64 x 69 cm)";
                    else if (minLength > 65 || minHeight > 50) recommendedSize = "IATA #300 (Intermediate: 81 x 57 x 61 cm)";
                    else if (minLength > 50 || minHeight > 40) recommendedSize = "IATA #200 (Medium: 71 x 52 x 54 cm)";

                    return (
                      <div className="bg-[#fcf9f2] p-5 rounded-2xl border border-[#e3dec9] flex flex-col justify-between space-y-4">
                        <div className="space-y-3">
                          <span className="text-[10px] font-black uppercase text-[#5a5a40] bg-[#eae4d3] px-2.5 py-1 rounded-md">
                            Minimum IATA Cargo Dimensions
                          </span>
                          
                          <div className="grid grid-cols-3 gap-2 text-center">
                            <div className="bg-white p-3 rounded-xl border border-stone-200">
                              <span className="text-[10px] text-stone-500 uppercase block font-bold">Min Length</span>
                              <strong className="text-base text-stone-900 font-mono">{minLength} cm</strong>
                              <span className="text-[9px] text-stone-400 block mt-0.5">(A + ½B)</span>
                            </div>
                            <div className="bg-white p-3 rounded-xl border border-stone-200">
                              <span className="text-[10px] text-stone-500 uppercase block font-bold">Min Width</span>
                              <strong className="text-base text-stone-900 font-mono">{minWidth} cm</strong>
                              <span className="text-[9px] text-stone-400 block mt-0.5">(C x 2)</span>
                            </div>
                            <div className="bg-white p-3 rounded-xl border border-stone-200">
                              <span className="text-[10px] text-stone-500 uppercase block font-bold">Min Height</span>
                              <strong className="text-base text-stone-900 font-mono">{minHeight} cm</strong>
                              <span className="text-[9px] text-stone-400 block mt-0.5">(D + 5cm)</span>
                            </div>
                          </div>

                          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs space-y-1">
                            <span className="font-bold text-emerald-900">Recommended Standard Crate:</span>
                            <p className="font-mono text-emerald-800 font-black text-sm">{recommendedSize}</p>
                          </div>
                        </div>

                        <p className="text-[10px] text-stone-500 leading-tight">
                          * Note: Airline cargo staff require metal bolts (plastic clips prohibited on international flights), non-spillable clip-on water dish, and live animal labels attached to all 4 sides.
                        </p>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}

          {/* 4.4 ETHICAL PET ADOPTION & ANTI-SCAM GUIDE */}
          {wave4SubTab === 'safe_adoption' && (
            <div className="bg-white p-6 rounded-3xl border border-[#e3dec9] border-b-[4px] border-b-[#cdc6ad] shadow-sm space-y-6">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-[#5a5a40] bg-[#f4efe4] px-2.5 py-1 rounded-full">
                  Pet Parent Protection &amp; Welfare
                </span>
                <h3 className="font-serif font-black text-xl text-[#3c3c3b] mt-1">
                  Ethical Pet Adoption &amp; Puppy Scam Prevention Guidelines
                </h3>
                <p className="text-xs text-stone-500">
                  How to safely adopt rescue pets, verify certified pedigree breeders, and identify online pet deposit scams.
                </p>
              </div>

              {/* Red Flags vs Safe Practices */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-5 rounded-2xl bg-rose-50 border border-rose-200 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-rose-700 font-bold text-lg">🚩</span>
                    <h4 className="font-bold text-rose-950 text-sm m-0">Puppy &amp; Pet Scam Red Flags</h4>
                  </div>
                  <ul className="text-xs text-rose-900 space-y-2 list-disc pl-4 leading-relaxed">
                    <li><strong>Upfront Untraceable Payments:</strong> Seller demands non-refundable advance deposits via wire transfer, gift cards, or crypto before you see the animal.</li>
                    <li><strong>Unusually Low Prices:</strong> Purebred puppies (French Bulldogs, Golden Retrievers, Persian Kittens) offered for &quot;free adoption if you pay shipping fees.&quot;</li>
                    <li><strong>Refusal of Video Verification:</strong> Seller refuses to make a live WhatsApp video call showing the pet interacting with the mother.</li>
                    <li><strong>Phony Courier Fees:</strong> Seller claims the pet is stuck at airport cargo and demands sudden payments for &quot;temperature-controlled insurance crates.&quot;</li>
                  </ul>
                </div>

                <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-700 font-bold text-lg">✅</span>
                    <h4 className="font-bold text-emerald-950 text-sm m-0">Safe Adoption &amp; Verified Breeder Checklist</h4>
                  </div>
                  <ul className="text-xs text-emerald-900 space-y-2 list-disc pl-4 leading-relaxed">
                    <li><strong>In-Person or Live Video Meeting:</strong> Always see the puppy/kitten in its living environment with its mother prior to committing funds.</li>
                    <li><strong>Veterinarian Health Record:</strong> Demand a veterinary vaccination card signed by a licensed DVM with genuine manufacturer vaccine stickers.</li>
                    <li><strong>Genetic Health Clearances:</strong> Reputable breeders provide OFA/PennHIP hip scores, elbow clearance, and breed-specific DNA disease screens.</li>
                    <li><strong>Adopt Don&apos;t Shop:</strong> Check verified animal shelters and rescue organizations on VetAxis 360 offering ethical home checks and microchipping.</li>
                  </ul>
                </div>
              </div>

              {/* Exotic Animals & License Alert */}
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-950 space-y-1">
                <span className="font-bold block">⚖️ Legal Regulations on Exotic Pets (Birds, Reptiles, Small Animals):</span>
                <p className="text-[11px] text-amber-900">
                  Certain parrots, birds of prey, reptiles, and wild cats fall under CITES (Convention on International Trade in Endangered Species) and provincial wildlife protection departments. Always verify possession licenses and import certificates before acquiring exotic animals.
                </p>
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
}
