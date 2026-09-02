/**
 * VetAxis 360 - Authoritative Veterinary Clinical Reference & Calculation Engine
 * Grounded in Gold-Standard Veterinary Literature:
 * - Plumb's Veterinary Drug Handbook (9th & 10th Editions)
 * - The Merck Veterinary Manual (11th & 12th Editions)
 * - AAHA/WSAVA Fluid Therapy Guidelines for Dogs and Cats
 * - WSAVA Global Nutrition Guidelines & NRC Nutrient Requirements
 * - ASPCA Animal Poison Control Center & Pet Poison Helpline
 * - Large Animal Internal Medicine (Bradford P. Smith) & Veterinary Reproduction (Arthur/Noakes)
 */

export interface DrugReference {
  id: string;
  name: string;
  category: 'Antibiotic' | 'NSAID / Analgesic' | 'Antiparasitic / Dewormer' | 'Emergency / Critical' | 'Steroid / Anti-inflammatory' | 'Sedative / Anesthetic' | 'Gastrointestinal';
  species: ('dog' | 'cat' | 'cattle' | 'buffalo' | 'goat' | 'sheep' | 'horse')[];
  defaultDoseMgKg: {
    [speciesKey: string]: {
      min: number;
      max: number;
      default: number;
      frequency: string; // e.g. 'q12h (BID)', 'q24h (SID)'
      route: string; // e.g. 'PO', 'IV', 'IM', 'SC', 'IV / IM / SC', etc.
      instructions: string;
    };
  };
  commonConcentrations: { label: string; valueMgPerUnit: number; unit: 'mg/mL' | 'mg/tablet' }[];
  contraindications: string;
  clinicalNotes: string;
}

export const VETERINARY_DRUG_DATABASE: DrugReference[] = [
  {
    id: 'amox_clav',
    name: 'Amoxicillin + Clavulanic Acid (Augmentin / Clavamox)',
    category: 'Antibiotic',
    species: ['dog', 'cat', 'cattle', 'goat', 'sheep'],
    defaultDoseMgKg: {
      dog: { min: 12.5, max: 25, default: 13.75, frequency: 'q12h (BID)', route: 'PO', instructions: 'Give with food to reduce GI upset' },
      cat: { min: 12.5, max: 20, default: 12.5, frequency: 'q12h (BID)', route: 'PO', instructions: 'Suspension preferred; ensure swallow with water to prevent esophageal stricture' },
      cattle: { min: 7, max: 10, default: 8.75, frequency: 'q24h (SID)', route: 'IM / SC', instructions: 'Shake well. Observe meat/milk withdrawal times' },
      goat: { min: 10, max: 15, default: 12.5, frequency: 'q24h (SID)', route: 'IM / SC', instructions: 'Deep IM injection; rotate injection sites' },
      sheep: { min: 10, max: 15, default: 12.5, frequency: 'q24h (SID)', route: 'IM / SC', instructions: 'Deep IM injection; rotate injection sites' }
    },
    commonConcentrations: [
      { label: '62.5 mg tablet (Dog/Cat)', valueMgPerUnit: 62.5, unit: 'mg/tablet' },
      { label: '125 mg tablet (Small/Medium Dog)', valueMgPerUnit: 125, unit: 'mg/tablet' },
      { label: '250 mg tablet (Medium Dog)', valueMgPerUnit: 250, unit: 'mg/tablet' },
      { label: '375 mg tablet (Large Dog)', valueMgPerUnit: 375, unit: 'mg/tablet' },
      { label: '625 mg tablet (Giant Dog)', valueMgPerUnit: 625, unit: 'mg/tablet' },
      { label: '140 mg/mL Ready-to-use Injectable (Livestock)', valueMgPerUnit: 140, unit: 'mg/mL' },
      { label: '62.5 mg/mL Oral Pediatric Drops', valueMgPerUnit: 62.5, unit: 'mg/mL' }
    ],
    contraindications: 'Do NOT use in rabbits, guinea pigs, chinchillas, or hamsters (fatal enterotoxemia). Contraindicated in penicillin-hypersensitive animals.',
    clinicalNotes: 'First-line broad-spectrum potentiated beta-lactam for pyoderma, UTI, bite wounds, respiratory infections, and periodontal disease.'
  },
  {
    id: 'meloxicam',
    name: 'Meloxicam (Metacam / Mobic)',
    category: 'NSAID / Analgesic',
    species: ['dog', 'cat', 'cattle', 'goat', 'sheep', 'horse'],
    defaultDoseMgKg: {
      dog: { min: 0.1, max: 0.2, default: 0.2, frequency: 'Day 1: 0.2 mg/kg, then 0.1 mg/kg q24h', route: 'PO / IV / SC', instructions: 'Give with or after food. Always ensure adequate hydration' },
      cat: { min: 0.05, max: 0.1, default: 0.05, frequency: 'Single pre-op dose 0.1 mg/kg SC or 0.05 mg/kg PO', route: 'PO / SC', instructions: 'Use extreme caution in cats with renal compromise. Ensure micro-dosing precision' },
      cattle: { min: 0.5, max: 0.5, default: 0.5, frequency: 'Single dose q48h-72h', route: 'IV / SC', instructions: 'Indicated for acute mastitis, dehorning, and calf pneumonia' },
      goat: { min: 0.5, max: 1.0, default: 0.5, frequency: 'q24h-q48h', route: 'PO / SC', instructions: 'Excellent post-operative and musculoskeletal anti-inflammatory' },
      sheep: { min: 0.5, max: 1.0, default: 0.5, frequency: 'q24h-q48h', route: 'PO / SC', instructions: 'Useful in lameness, footrot pain relief, and post-castration' },
      horse: { min: 0.6, max: 0.6, default: 0.6, frequency: 'q24h (SID)', route: 'PO / IV', instructions: 'Musculoskeletal disorders and colic adjunct' }
    },
    commonConcentrations: [
      { label: '1.5 mg/mL Oral Suspension (Dogs)', valueMgPerUnit: 1.5, unit: 'mg/mL' },
      { label: '0.5 mg/mL Oral Suspension (Cats)', valueMgPerUnit: 0.5, unit: 'mg/mL' },
      { label: '5 mg/mL Injectable Solution (Small Animals)', valueMgPerUnit: 5, unit: 'mg/mL' },
      { label: '20 mg/mL Injectable Solution (Large Animals/Cattle)', valueMgPerUnit: 20, unit: 'mg/mL' },
      { label: '7.5 mg Tablet', valueMgPerUnit: 7.5, unit: 'mg/tablet' },
      { label: '15 mg Tablet', valueMgPerUnit: 15, unit: 'mg/tablet' }
    ],
    contraindications: 'NEVER combine concurrently with corticosteroids (e.g. Dexamethasone, Prednisolone) or other NSAIDs (risk of severe GI perforation). Avoid in dehydrated or hypotensive animals.',
    clinicalNotes: 'COX-2 preferential non-steroidal anti-inflammatory. Primary drug for acute perioperative pain, osteoarthritis, and soft tissue trauma.'
  },
  {
    id: 'enrofloxacin',
    name: 'Enrofloxacin (Baytril / Floxvet)',
    category: 'Antibiotic',
    species: ['dog', 'cat', 'cattle', 'goat', 'sheep'],
    defaultDoseMgKg: {
      dog: { min: 5, max: 10, default: 5, frequency: 'q24h (SID) or divided q12h', route: 'PO / IV / SC', instructions: 'Dilute slow IV over 20-30 min. Avoid bolus' },
      cat: { min: 5, max: 5, default: 5, frequency: 'q24h (SID) - DO NOT EXCEED 5 mg/kg', route: 'PO / SC', instructions: 'Strict maximum 5 mg/kg/day to prevent acute irreversible retinal degeneration/blindness' },
      cattle: { min: 2.5, max: 5.0, default: 2.5, frequency: 'q24h for 3 days or single 7.5 mg/kg dose', route: 'SC', instructions: 'BRD (Bovine Respiratory Disease) and coliform mastitis' },
      goat: { min: 5, max: 10, default: 5, frequency: 'q24h (SID)', route: 'IM / SC', instructions: 'Observe extra-label withdrawal times' },
      sheep: { min: 5, max: 10, default: 5, frequency: 'q24h (SID)', route: 'IM / SC', instructions: 'Observe extra-label withdrawal times' }
    },
    commonConcentrations: [
      { label: '50 mg/mL Injectable (Small Animals)', valueMgPerUnit: 50, unit: 'mg/mL' },
      { label: '100 mg/mL Injectable (Large Animals)', valueMgPerUnit: 100, unit: 'mg/mL' },
      { label: '50 mg Tablet', valueMgPerUnit: 50, unit: 'mg/tablet' },
      { label: '150 mg Tablet', valueMgPerUnit: 150, unit: 'mg/tablet' }
    ],
    contraindications: 'Contraindicated in rapidly growing juvenile dogs (articular cartilage damage in large breeds <12-18 mos). Strict cap in cats (retinotoxicity).',
    clinicalNotes: 'Fluoroquinolone bactericidal antibiotic with concentration-dependent killing against Gram-negative aerobes (Pseudomonas, E. coli, Klebsiella).'
  },
  {
    id: 'oxytetracycline',
    name: 'Oxytetracycline LA 20% (Terramycin LA / Oxyvet)',
    category: 'Antibiotic',
    species: ['cattle', 'buffalo', 'goat', 'sheep'],
    defaultDoseMgKg: {
      cattle: { min: 20, max: 20, default: 20, frequency: 'Single long-acting dose (effective 72 hrs)', route: 'IM / SC', instructions: 'Deep IM injection; maximum 10-15 mL per injection site' },
      buffalo: { min: 20, max: 20, default: 20, frequency: 'Single long-acting dose (effective 72 hrs)', route: 'IM / SC', instructions: 'Deep IM injection; rotate injection sites' },
      goat: { min: 20, max: 20, default: 20, frequency: 'Single long-acting dose (effective 72 hrs)', route: 'IM / SC', instructions: 'Indicated for CCPP, pneumonia, and footrot' },
      sheep: { min: 20, max: 20, default: 20, frequency: 'Single long-acting dose (effective 72 hrs)', route: 'IM / SC', instructions: 'Indicated for chlamydial abortion, pasteurellosis, and footrot' }
    },
    commonConcentrations: [
      { label: '200 mg/mL (20% LA Injectable)', valueMgPerUnit: 200, unit: 'mg/mL' },
      { label: '100 mg/mL (10% Solution)', valueMgPerUnit: 100, unit: 'mg/mL' },
      { label: '50 mg/mL (5% Solution)', valueMgPerUnit: 50, unit: 'mg/mL' }
    ],
    contraindications: 'Do not administer rapid IV (risk of cardiovascular collapse from calcium chelation). Avoid in late pregnancy or young neonates (stains teeth/bones).',
    clinicalNotes: 'Broad-spectrum bacteriostatic tetracycline. Staple treatment for Anaplasmosis, Theileriosis (supportive), Pasteurellosis (HS/BRD), and Contagious Agalactia.'
  },
  {
    id: 'ivermectin',
    name: 'Ivermectin 1% (Ivomec / Ivotek)',
    category: 'Antiparasitic / Dewormer',
    species: ['cattle', 'buffalo', 'goat', 'sheep', 'dog'],
    defaultDoseMgKg: {
      cattle: { min: 0.2, max: 0.2, default: 0.2, frequency: 'Single dose; repeat in 14-21 days if needed', route: 'SC', instructions: 'Inject subcutaneously only in front of or behind the shoulder' },
      buffalo: { min: 0.2, max: 0.2, default: 0.2, frequency: 'Single dose; repeat in 14-21 days if needed', route: 'SC', instructions: 'Subcutaneous injection; effective against mange mites, ticks, gastrointestinal nematodes' },
      goat: { min: 0.2, max: 0.4, default: 0.2, frequency: 'Single dose; higher dose (0.4 mg/kg) often required for Caprine GI nematodes', route: 'SC', instructions: 'Observe 28-35 day meat withdrawal' },
      sheep: { min: 0.2, max: 0.2, default: 0.2, frequency: 'Single dose; repeat in 21 days for Psoroptes ovis (sheep scab)', route: 'SC', instructions: 'Ensure accurate weight calculation' },
      dog: { min: 0.006, max: 0.2, default: 0.006, frequency: '0.006 mg/kg (6 mcg/kg) for heartworm prevention; 0.2-0.4 mg/kg for generalized Demodex under vet supervision', route: 'PO / SC', instructions: 'Test for MDR1 gene mutation before high-dose acaricidal therapy' }
    },
    commonConcentrations: [
      { label: '10 mg/mL (1% Injectable Solution)', valueMgPerUnit: 10, unit: 'mg/mL' },
      { label: '2 mg/mL (0.2% Oral Drench)', valueMgPerUnit: 2, unit: 'mg/mL' },
      { label: '68 mcg Tablet (Heartworm preventative for small dogs)', valueMgPerUnit: 0.068, unit: 'mg/tablet' }
    ],
    contraindications: 'DANGEROUS in Collie-type breeds, Australian Shepherds, and dogs with MDR1 gene mutation (severe neurotoxicity, coma, death). Do NOT administer IV or IM.',
    clinicalNotes: 'Macrocyclic lactone. Potent against gastrointestinal roundworms, lungworms, sucking lice, and mange mites (Sarcoptes, Psoroptes).'
  },
  {
    id: 'fenbendazole',
    name: 'Fenbendazole (Panacur / Wormstop)',
    category: 'Antiparasitic / Dewormer',
    species: ['dog', 'cat', 'cattle', 'goat', 'sheep', 'horse'],
    defaultDoseMgKg: {
      dog: { min: 50, max: 50, default: 50, frequency: 'q24h for 3 consecutive days (Giardia: 5 days)', route: 'PO', instructions: 'Mix with palatable food. Broad spectrum against roundworms, hookworms, whipworms, and Giardia' },
      cat: { min: 50, max: 50, default: 50, frequency: 'q24h for 3-5 consecutive days', route: 'PO', instructions: 'Safe in kittens older than 2 weeks' },
      cattle: { min: 7.5, max: 10, default: 7.5, frequency: 'Single oral drench', route: 'PO', instructions: 'Drench slowly over back of the tongue' },
      goat: { min: 10, max: 15, default: 10, frequency: 'Single oral drench (higher dose required in goats due to rapid hepatic metabolism)', route: 'PO', instructions: 'Goats metabolize benzimidazoles at twice the rate of sheep' },
      sheep: { min: 5, max: 7.5, default: 5, frequency: 'Single oral drench', route: 'PO', instructions: 'Effective against Haemonchus and Trichostrongylus' },
      horse: { min: 5, max: 10, default: 7.5, frequency: 'Single oral paste or 5-day course for encysted cyathostomins', route: 'PO', instructions: 'Administer via oral dosing syringe' }
    },
    commonConcentrations: [
      { label: '100 mg/mL (10% Oral Suspension)', valueMgPerUnit: 100, unit: 'mg/mL' },
      { label: '25 mg/mL (2.5% Oral Drench)', valueMgPerUnit: 25, unit: 'mg/mL' },
      { label: '500 mg Tablet', valueMgPerUnit: 500, unit: 'mg/tablet' },
      { label: '250 mg Tablet', valueMgPerUnit: 250, unit: 'mg/tablet' }
    ],
    contraindications: 'Extremely high safety margin. Very few contraindications. Safe in pregnant animals at standard therapeutic doses.',
    clinicalNotes: 'Benzimidazole anthelmintic that binds to nematode tubulin. Drug of choice for canine Giardiasis and Taenia tapeworms (at extended dosing).'
  },
  {
    id: 'furosemide',
    name: 'Furosemide (Lasix / Dimazon)',
    category: 'Emergency / Critical',
    species: ['dog', 'cat', 'cattle', 'horse'],
    defaultDoseMgKg: {
      dog: { min: 1, max: 4, default: 2, frequency: 'q8h-q12h (Acute pulmonary edema: 2-4 mg/kg IV/IM q1-2h until stable)', route: 'PO / IV / IM', instructions: 'Monitor hydration, BUN, Creatinine, and electrolytes (potassium)' },
      cat: { min: 1, max: 2, default: 1, frequency: 'q12h-q24h (Acute CHF: 1-2 mg/kg IV/IM)', route: 'PO / IV / IM', instructions: 'Cats are highly sensitive to rapid dehydration and prerenal azotemia' },
      cattle: { min: 0.5, max: 1.0, default: 0.5, frequency: 'q12h-q24h', route: 'IV / IM', instructions: 'Indicated for severe post-parturient udder edema' },
      horse: { min: 0.5, max: 1.0, default: 0.5, frequency: 'Single dose 4 hours prior to strenuous exercise or for acute pulmonary edema', route: 'IV', instructions: 'Used in EIPH (Exercise Induced Pulmonary Hemorrhage)' }
    },
    commonConcentrations: [
      { label: '50 mg/mL Injectable Solution', valueMgPerUnit: 50, unit: 'mg/mL' },
      { label: '40 mg Tablet', valueMgPerUnit: 40, unit: 'mg/tablet' },
      { label: '20 mg Tablet', valueMgPerUnit: 20, unit: 'mg/tablet' }
    ],
    contraindications: 'Contraindicated in anuria, severe electrolyte depletion, hypovolemic shock, and uncorrected dehydration.',
    clinicalNotes: 'Potent loop diuretic acting on the ascending limb of Henle. First-line emergency intervention for cardiogenic pulmonary edema and congestive heart failure.'
  },
  {
    id: 'atropine',
    name: 'Atropine Sulfate 0.1% (1 mg/mL)',
    category: 'Emergency / Critical',
    species: ['dog', 'cat', 'cattle', 'buffalo', 'goat', 'sheep', 'horse'],
    defaultDoseMgKg: {
      dog: { min: 0.02, max: 0.04, default: 0.04, frequency: 'Emergency CPR / Organophosphate: 0.2-0.5 mg/kg (give 1/4 IV, remainder IM/SC)', route: 'IV / IM / SC / IT', instructions: 'Standard pre-med / bradycardia: 0.02-0.04 mg/kg. OP poisoning requires aggressive atropinization' },
      cat: { min: 0.02, max: 0.04, default: 0.02, frequency: 'Bradycardia: 0.02-0.04 mg/kg IV/IM', route: 'IV / IM / SC', instructions: 'Use with caution in tachyarrhythmias' },
      cattle: { min: 0.04, max: 0.1, default: 0.05, frequency: 'OP toxicity: 0.5-1.0 mg/kg (1/3 IV, 2/3 SC); Repeat q4-6h as needed', route: 'IV / IM / SC', instructions: 'Essential antidote for organophosphate / carbamate pesticide toxicity in grazing livestock' },
      buffalo: { min: 0.04, max: 0.1, default: 0.05, frequency: 'OP toxicity: 0.5-1.0 mg/kg (1/3 IV, 2/3 SC)', route: 'IV / IM / SC', instructions: 'Key antidote in acute pesticide toxicity cases' },
      goat: { min: 0.04, max: 0.1, default: 0.05, frequency: 'OP toxicity: 0.5-1.0 mg/kg (1/3 IV, 2/3 SC)', route: 'IV / IM / SC', instructions: 'Maintain dry airways and resolve muscarinic signs (salivation, bronchoconstriction)' },
      sheep: { min: 0.04, max: 0.1, default: 0.05, frequency: 'OP toxicity: 0.5-1.0 mg/kg (1/3 IV, 2/3 SC)', route: 'IV / IM / SC', instructions: 'Resolution of bronchial secretions is the key endpoint' },
      horse: { min: 0.01, max: 0.02, default: 0.01, frequency: 'Single IV dose for life-threatening bradycardia or bronchospasm', route: 'IV', instructions: 'Causes prolonged ileus in equines; use sparingly' }
    },
    commonConcentrations: [
      { label: '1 mg/mL (0.1% Injectable Vial)', valueMgPerUnit: 1.0, unit: 'mg/mL' },
      { label: '0.6 mg/mL Injectable Ampoule', valueMgPerUnit: 0.6, unit: 'mg/mL' }
    ],
    contraindications: 'Do not use in sinus tachycardia or glaucoma (causes mydriasis and increases IOP). Caution in equines due to risk of intestinal stasis/colic.',
    clinicalNotes: 'Anticholinergic / antimuscarinic agent. Blocks acetylcholine at parasympathetic neuroeffector sites. Indicated for severe vagal bradycardia, CPR, and OP poisoning.'
  }
];

export interface SpeciesVitals {
  speciesName: string;
  scientificGroup: string;
  tempRangeC: { min: number; max: number; average: number };
  tempRangeF: { min: number; max: number; average: number };
  heartRateBpm: { min: number; max: number; average: number };
  respRateBpm: { min: number; max: number; average: number };
  crtSeconds: { normal: string };
  gestationDays: { min: number; max: number; average: number; notes: string };
  bloodVolumeMlKg: number;
  estrusCycleDays: string;
  clinicalPearls: string;
}

export const SPECIES_VITALS_MATRIX: { [key: string]: SpeciesVitals } = {
  dog: {
    speciesName: 'Canine (Dog)',
    scientificGroup: 'Canis lupus familiaris',
    tempRangeC: { min: 37.8, max: 39.2, average: 38.5 },
    tempRangeF: { min: 100.0, max: 102.5, average: 101.3 },
    heartRateBpm: { min: 60, max: 140, average: 90 }, // Large breeds 60-100, Toy/Puppies 100-160
    respRateBpm: { min: 10, max: 30, average: 20 },
    crtSeconds: { normal: '< 2.0 seconds' },
    gestationDays: { min: 58, max: 68, average: 63, notes: '63 days from ovulation / 56-72 days from first breeding' },
    bloodVolumeMlKg: 80, // 80-90 mL/kg
    estrusCycleDays: 'Monoestrous non-seasonal (every 6-8 months)',
    clinicalPearls: 'Panting causes elevated respiratory rate without dyspnea. Heart rate in toy breeds/puppies normally reaches 160-180 bpm.'
  },
  cat: {
    speciesName: 'Feline (Cat)',
    scientificGroup: 'Felis catus',
    tempRangeC: { min: 38.0, max: 39.2, average: 38.6 },
    tempRangeF: { min: 100.5, max: 102.5, average: 101.5 },
    heartRateBpm: { min: 140, max: 220, average: 180 },
    respRateBpm: { min: 20, max: 40, average: 28 },
    crtSeconds: { normal: '< 2.0 seconds' },
    gestationDays: { min: 63, max: 67, average: 65, notes: 'Induced ovulators; average 65 days' },
    bloodVolumeMlKg: 60, // 55-65 mL/kg
    estrusCycleDays: 'Seasonally polyestrous (induced ovulator, every 2-3 weeks in season)',
    clinicalPearls: 'Open-mouth panting in cats is ALWAYS an emergency sign (severe dyspnea, pleural effusion, asthma, or CHF). Stress hyperglycemia is very common.'
  },
  cattle: {
    speciesName: 'Bovine (Cattle / Cow)',
    scientificGroup: 'Bos taurus / Bos indicus',
    tempRangeC: { min: 38.0, max: 39.3, average: 38.6 },
    tempRangeF: { min: 100.4, max: 102.8, average: 101.5 },
    heartRateBpm: { min: 48, max: 84, average: 65 },
    respRateBpm: { min: 15, max: 35, average: 24 },
    crtSeconds: { normal: '< 2.0 seconds' },
    gestationDays: { min: 279, max: 287, average: 283, notes: 'Standard ~283 days (~9 months 9 days)' },
    bloodVolumeMlKg: 60, // 55-65 mL/kg
    estrusCycleDays: 'Polyestrous all year (every 21 days; standing heat lasts 12-18 hrs)',
    clinicalPearls: 'Primary rumen contractions: 2-3 cycles per 2 minutes in left paralumbar fossa. Atony signals hypocalcemia, acidosis, or TRP.'
  },
  buffalo: {
    speciesName: 'Bubaline (Water Buffalo / Nili-Ravi / Kundi)',
    scientificGroup: 'Bubalus bubalis',
    tempRangeC: { min: 37.5, max: 39.0, average: 38.2 },
    tempRangeF: { min: 99.5, max: 102.2, average: 100.8 },
    heartRateBpm: { min: 45, max: 70, average: 55 },
    respRateBpm: { min: 15, max: 30, average: 20 },
    crtSeconds: { normal: '< 2.0 seconds' },
    gestationDays: { min: 305, max: 315, average: 310, notes: 'Longer than cattle (~10 months 10 days)' },
    bloodVolumeMlKg: 60,
    estrusCycleDays: 'Seasonally polyestrous (short-day breeders, 21-day cycle, silent heat common)',
    clinicalPearls: 'Fewer sweat glands; highly susceptible to heat stress and mud wallowing requirements. Silent heat is frequent in summer.'
  },
  goat: {
    speciesName: 'Caprine (Goat / Beetal / Teddy / Kamori)',
    scientificGroup: 'Capra hircus',
    tempRangeC: { min: 38.5, max: 40.0, average: 39.0 },
    tempRangeF: { min: 101.3, max: 104.0, average: 102.5 },
    heartRateBpm: { min: 70, max: 110, average: 85 },
    respRateBpm: { min: 15, max: 30, average: 20 },
    crtSeconds: { normal: '< 2.0 seconds' },
    gestationDays: { min: 145, max: 155, average: 150, notes: 'Standard ~150 days (5 months)' },
    bloodVolumeMlKg: 70,
    estrusCycleDays: 'Seasonally polyestrous (every 18-21 days; heat duration 24-36 hrs)',
    clinicalPearls: 'Normal baseline body temperature runs noticeably higher than cattle. Goats have faster drug metabolism requiring higher dose rates for many anthelmintics.'
  },
  sheep: {
    speciesName: 'Ovine (Sheep / Kajli / Damani)',
    scientificGroup: 'Ovis aries',
    tempRangeC: { min: 38.5, max: 40.0, average: 39.1 },
    tempRangeF: { min: 101.3, max: 104.0, average: 102.5 },
    heartRateBpm: { min: 70, max: 100, average: 80 },
    respRateBpm: { min: 15, max: 30, average: 20 },
    crtSeconds: { normal: '< 2.0 seconds' },
    gestationDays: { min: 144, max: 152, average: 148, notes: 'Standard ~148 days (~5 months)' },
    bloodVolumeMlKg: 65,
    estrusCycleDays: 'Seasonally polyestrous (every 16-17 days; heat duration 24-36 hrs)',
    clinicalPearls: 'Prone to copper toxicity (sheep liver stores copper avidly; avoid cattle-formulated mineral blocks).'
  },
  horse: {
    speciesName: 'Equine (Horse / Pony)',
    scientificGroup: 'Equus caballus',
    tempRangeC: { min: 37.2, max: 38.5, average: 37.8 },
    tempRangeF: { min: 99.0, max: 101.3, average: 100.0 },
    heartRateBpm: { min: 28, max: 44, average: 36 },
    respRateBpm: { min: 8, max: 16, average: 12 },
    crtSeconds: { normal: '< 2.0 seconds' },
    gestationDays: { min: 330, max: 345, average: 340, notes: 'Standard ~340 days (~11 months)' },
    bloodVolumeMlKg: 75,
    estrusCycleDays: 'Seasonally polyestrous (long-day breeders; every 21 days; heat duration 5-7 days)',
    clinicalPearls: 'Heart rate > 60 bpm in resting adult horse indicates acute pain, colic, endotoxemia, or cardiovascular collapse. Inability to vomit.'
  }
};

/**
 * AAHA / WSAVA Fluid Therapy Formulas:
 * 1. Deficit (mL) = BodyWeight_kg * (Dehydration% / 100) * 1000 mL
 * 2. Daily Maintenance (mL/day):
 *    - Allometric Formula (Standard WSAVA): 70 * (BodyWeight_kg ^ 0.75) for small animals
 *    - Linear Standard: Dogs ~ 60 mL/kg/day, Cats ~ 50 mL/kg/day, Large Animals ~ 50 mL/kg/day
 * 3. Ongoing Losses (mL/day): Estimated vomiting/diarrhea volume
 * 4. Drip Rate (drops/min) = (Total Infusion Volume in mL * Drip Factor) / (Delivery Time in Hours * 60)
 */
export function calculateFluidTherapy(
  weightKg: number,
  dehydrationPercent: number,
  deliveryHours: number = 24,
  ongoingLossesMl: number = 0,
  dripFactor: 10 | 15 | 20 | 60 = 15,
  species: 'dog' | 'cat' | 'large_animal' = 'dog'
) {
  const safeWeight = Math.max(0.1, weightKg);
  const safeDehydration = Math.min(15, Math.max(0, dehydrationPercent));
  const safeHours = Math.max(1, deliveryHours);

  // 1. Fluid Deficit in mL
  const fluidDeficitMl = safeWeight * (safeDehydration / 100) * 1000;

  // 2. Daily Maintenance in mL/24h (WSAVA allometric for small animals, standard linear for large)
  let dailyMaintenanceMl = 0;
  if (species === 'cat') {
    dailyMaintenanceMl = 80 * Math.pow(safeWeight, 0.75); // WSAVA feline curve
  } else if (species === 'dog') {
    dailyMaintenanceMl = 132 * Math.pow(safeWeight, 0.75); // WSAVA canine curve (or ~60 mL/kg)
  } else {
    dailyMaintenanceMl = safeWeight * 50; // Bovine/Equine ~50 mL/kg/day
  }

  // Adjusted maintenance for the planned delivery duration window
  const periodMaintenanceMl = dailyMaintenanceMl * (safeHours / 24);

  // 3. Total Volume Required in the window
  const totalVolumeMl = Math.round(fluidDeficitMl + periodMaintenanceMl + ongoingLossesMl);

  // 4. Flow Rates
  const rateMlPerHour = totalVolumeMl / safeHours;
  const rateMlPerMinute = rateMlPerHour / 60;
  const dropsPerMinute = Math.round((totalVolumeMl * dripFactor) / (safeHours * 60));
  const secondsPerDrop = dropsPerMinute > 0 ? (60 / dropsPerMinute).toFixed(1) : '0';

  return {
    weightKg: safeWeight,
    dehydrationPercent: safeDehydration,
    deliveryHours: safeHours,
    fluidDeficitMl: Math.round(fluidDeficitMl),
    dailyMaintenanceMl: Math.round(dailyMaintenanceMl),
    periodMaintenanceMl: Math.round(periodMaintenanceMl),
    ongoingLossesMl,
    totalVolumeMl,
    rateMlPerHour: Number(rateMlPerHour.toFixed(1)),
    dropsPerMinute,
    secondsPerDrop,
    dripFactor,
    shockBolusMl: species === 'cat' ? Math.round(safeWeight * 45) : Math.round(safeWeight * 90) // Total shock blood volume guideline
  };
}

/**
 * WSAVA Global Nutrition / NRC Energy Requirement Calculations:
 * RER = 70 * (BodyWeight_kg ^ 0.75)
 * MER = RER * Factor
 */
export type PetLifeStage = 
  | 'neutered_adult' 
  | 'intact_adult' 
  | 'inactive_obese_prone' 
  | 'weight_loss' 
  | 'active_working' 
  | 'puppy_kitten_growth' 
  | 'gestation_lactation' 
  | 'geriatric_senior';

export const PET_ENERGY_FACTORS: { [species in 'dog' | 'cat']: { [key in PetLifeStage]: { factor: number; label: string } } } = {
  dog: {
    neutered_adult: { factor: 1.6, label: 'Neutered Adult (Standard maintenance)' },
    intact_adult: { factor: 1.8, label: 'Intact Adult (Normal activity)' },
    inactive_obese_prone: { factor: 1.4, label: 'Inactive / Prone to weight gain' },
    weight_loss: { factor: 1.0, label: 'Active Weight Loss (Weight reduction)' },
    active_working: { factor: 2.5, label: 'Active Working / Agility Dog' },
    puppy_kitten_growth: { factor: 3.0, label: 'Puppy Growth (<4 months old: 3.0x, >4 months: 2.0x)' },
    gestation_lactation: { factor: 3.5, label: 'Gestation (last trimester) & Peak Lactation' },
    geriatric_senior: { factor: 1.2, label: 'Senior / Geriatric with reduced activity' }
  },
  cat: {
    neutered_adult: { factor: 1.2, label: 'Neutered Adult (Standard indoor cat)' },
    intact_adult: { factor: 1.4, label: 'Intact Adult (Normal activity)' },
    inactive_obese_prone: { factor: 1.0, label: 'Inactive / Prone to weight gain' },
    weight_loss: { factor: 0.8, label: 'Active Weight Loss (Safe feline reduction)' },
    active_working: { factor: 1.6, label: 'Highly Active Outdoor Cat' },
    puppy_kitten_growth: { factor: 2.5, label: 'Kitten Growth (<10 months)' },
    gestation_lactation: { factor: 2.5, label: 'Queen Gestation & Lactation' },
    geriatric_senior: { factor: 1.1, label: 'Senior / Geriatric Cat' }
  }
};

export function calculatePetEnergyRequirements(
  species: 'dog' | 'cat',
  weightKg: number,
  lifeStage: PetLifeStage,
  foodCalorieDensityKcalPerCup: number = 375 // standard commercial dry food ~ 350-400 kcal/cup (1 cup ~ 100-110g)
) {
  const safeWeight = Math.max(0.2, weightKg);
  // WSAVA Standard RER
  const rerKcal = 70 * Math.pow(safeWeight, 0.75);
  const factorInfo = PET_ENERGY_FACTORS[species][lifeStage] || { factor: 1.4, label: 'Adult' };
  const merKcal = rerKcal * factorInfo.factor;

  const dailyCups = merKcal / Math.max(100, foodCalorieDensityKcalPerCup);
  const dailyGrams = (dailyCups * 105); // Approx 105g per standard measuring cup of dry food

  return {
    weightKg: safeWeight,
    rerKcal: Math.round(rerKcal),
    merKcal: Math.round(merKcal),
    factor: factorInfo.factor,
    lifeStageLabel: factorInfo.label,
    dailyCups: Number(dailyCups.toFixed(2)),
    dailyGrams: Math.round(dailyGrams),
    twoMealsPortionGrams: Math.round(dailyGrams / 2),
    twoMealsPortionCups: Number((dailyCups / 2).toFixed(2))
  };
}

/**
 * ASPCA & Pet Poison Helpline Grounded Toxicity Database
 */
export interface ToxicSubstance {
  id: string;
  name: string;
  category: 'Human Food' | 'Human Medication' | 'Plant' | 'Chemical / Household' | 'Pesticide';
  toxicityLevel: 'CRITICAL_FATAL' | 'HIGH' | 'MODERATE' | 'MILD_IRRITANT' | 'SAFE';
  toxicTo: ('dog' | 'cat')[];
  toxicPrinciple: string;
  toxicDoseSummary: string;
  clinicalSigns: string;
  emergencyActions: string;
  contraindications: string;
}

export const TOXIC_SUBSTANCE_DATABASE: ToxicSubstance[] = [
  {
    id: 'chocolate',
    name: 'Chocolate / Cocoa / Dark Chocolate',
    category: 'Human Food',
    toxicityLevel: 'HIGH',
    toxicTo: ['dog', 'cat'],
    toxicPrinciple: 'Theobromine & Caffeine (Methylxanthines)',
    toxicDoseSummary: 'Mild signs at 20 mg/kg theobromine; Cardiotoxicity at 40-50 mg/kg; Seizures at >60 mg/kg. Cocoa powder & Dark/Baking chocolate contain 10x more theobromine than milk chocolate.',
    clinicalSigns: 'Vomiting, diarrhea, restlessness, hyperactivity, tachycardia, cardiac arrhythmias, muscle tremors, seizures, hyperthermia, death.',
    emergencyActions: 'Induce emesis if ingested within 2 hours under veterinary guidance (3% Hydrogen Peroxide or Apomorphine in dogs). Administer repeated Activated Charcoal. IV fluids and supportive antiarrhythmics.',
    contraindications: 'Do NOT induce emesis if animal is already showing neurological tremors or altered consciousness (aspiration risk).'
  },
  {
    id: 'paracetamol',
    name: 'Paracetamol / Acetaminophen (Panadol / Tylenol)',
    category: 'Human Medication',
    toxicityLevel: 'CRITICAL_FATAL',
    toxicTo: ['cat', 'dog'],
    toxicPrinciple: 'Toxic metabolite NAPQI causes severe Methemoglobinemia & Hepatic Necrosis',
    toxicDoseSummary: 'CATS: ANY dose is fatal (>10-40 mg/kg is lethal due to deficient glucuronyl transferase). DOGS: >100 mg/kg causes acute liver failure.',
    clinicalSigns: 'Cats: Brown/chocolate-colored mucous membranes (methemoglobinemia), facial/paw edema, severe dyspnea, hypothermia, coma. Dogs: Jaundice, vomiting, hepatic failure.',
    emergencyActions: 'IMMEDIATE VETERINARY EMERGENCY. Specific antidote: N-Acetylcysteine (NAC) IV or PO, Cimetidine, Ascorbic Acid (Vitamin C), and Oxygen support.',
    contraindications: 'NEVER give Paracetamol/Panadol to cats under ANY circumstance.'
  },
  {
    id: 'grapes_raisins',
    name: 'Grapes, Raisins, Sultanas & Currants',
    category: 'Human Food',
    toxicityLevel: 'CRITICAL_FATAL',
    toxicTo: ['dog', 'cat'],
    toxicPrinciple: 'Tartaric Acid & Potassium Bitartrate',
    toxicDoseSummary: 'Idiosyncratic toxic threshold — even 1-2 raisins can induce acute oliguric renal failure in susceptible dogs.',
    clinicalSigns: 'Vomiting/diarrhea within 6-12 hours, anorexia, lethargy, abdominal pain, oliguria/anuria within 24-72 hours due to acute proximal renal tubular necrosis.',
    emergencyActions: 'Decontamination within 2-4 hours. Aggressive IV fluid diuresis (2-3x maintenance rate) for 48 hours to preserve renal perfusion.',
    contraindications: 'Do not delay fluid therapy waiting for bloodwork changes; renal damage may become irreversible.'
  },
  {
    id: 'allium',
    name: 'Onions, Garlic, Leeks, Chives (Allium Family)',
    category: 'Human Food',
    toxicityLevel: 'HIGH',
    toxicTo: ['dog', 'cat'],
    toxicPrinciple: 'N-propyl disulfide causes oxidative damage to red blood cells (Heinz Body Anemia)',
    toxicDoseSummary: 'Cats are 2-3x more sensitive than dogs. >5 g/kg in cats or >15-30 g/kg in dogs can cause clinically significant hemolytic anemia.',
    clinicalSigns: 'Weakness, lethargy, pale or jaundiced gums, tachypnea, tachycardia, dark reddish-brown urine (hemoglobinuria), collapse 2-5 days post-ingestion.',
    emergencyActions: 'Decontamination, activated charcoal, IV fluids, supportive oxygen, and blood transfusion in severe hemolytic crisis.',
    contraindications: 'Cooked, raw, and powdered forms (garlic/onion powder in soups or baby food) are all equally toxic.'
  },
  {
    id: 'lilies',
    name: 'Lilies (Easter, Tiger, Day, Asiatic, Stargazer Lilies)',
    category: 'Plant',
    toxicityLevel: 'CRITICAL_FATAL',
    toxicTo: ['cat'],
    toxicPrinciple: 'Water-soluble nephrotoxin causing acute necrosis of renal tubular epithelial cells',
    toxicDoseSummary: 'Ingestion of less than 1-2 leaves or petals, or even grooming pollen off fur/drinking vase water causes fatal acute renal failure in cats.',
    clinicalSigns: 'Vomiting within 1-3 hours, salivation, depression, followed by acute anuric kidney failure within 24-48 hours (severe uremia, death).',
    emergencyActions: 'Immediate aggressive decontamination. Wash coat if pollen present. IV fluid therapy at 2-3x maintenance for at least 48 hours is mandatory.',
    contraindications: 'Non-toxic to dogs (causes mild GI upset), but strictly fatal to cats.'
  },
  {
    id: 'xylitol',
    name: 'Xylitol (Birch Sugar / Sugar-free Gum & Peanut Butter)',
    category: 'Human Food',
    toxicityLevel: 'CRITICAL_FATAL',
    toxicTo: ['dog'],
    toxicPrinciple: 'Stimulates massive 6x-8x insulin release in dogs causing profound Hypoglycemia and acute Hepatic Necrosis',
    toxicDoseSummary: '>0.1 g/kg causes life-threatening hypoglycemia within 15-30 mins; >0.5 g/kg causes acute fatal hepatic necrosis.',
    clinicalSigns: 'Vomiting, ataxia, weakness, collapse, seizures, severe hypoglycemia within 30 mins; petechiae, coagulopathy, and liver failure in 24-48 hours.',
    emergencyActions: 'Emergency IV Dextrose bolus (0.5 g/kg of 25% solution) followed by 2.5-5% Dextrose constant rate infusion (CRI). Hepatoprotectants (SAMe, Milk Thistle).',
    contraindications: 'Do NOT induce emesis if dog is already hypoglycemic, ataxic, or comatose.'
  }
];

/**
 * Livestock Gestation Milestones Engine
 */
export interface GestationTimelineMilestone {
  dayNumber: number;
  dateString: string;
  milestoneTitle: string;
  description: string;
  category: 'health' | 'nutrition' | 'management' | 'delivery';
  urgency: 'routine' | 'important' | 'critical';
}

export function calculateLivestockGestation(
  species: 'cattle' | 'buffalo' | 'goat' | 'sheep' | 'horse',
  serviceDate: Date
) {
  const vitals = SPECIES_VITALS_MATRIX[species];
  const gestationLengthDays = vitals.gestationDays.average;

  const expectedDueDate = new Date(serviceDate.getTime() + gestationLengthDays * 86400000);
  const minDueDate = new Date(serviceDate.getTime() + vitals.gestationDays.min * 86400000);
  const maxDueDate = new Date(serviceDate.getTime() + vitals.gestationDays.max * 86400000);

  const milestones: GestationTimelineMilestone[] = [];

  const addMilestone = (
    day: number,
    title: string,
    desc: string,
    cat: 'health' | 'nutrition' | 'management' | 'delivery',
    urg: 'routine' | 'important' | 'critical'
  ) => {
    if (day <= gestationLengthDays) {
      const d = new Date(serviceDate.getTime() + day * 86400000);
      milestones.push({
        dayNumber: day,
        dateString: d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }),
        milestoneTitle: title,
        description: desc,
        category: cat,
        urgency: urg
      });
    }
  };

  if (species === 'cattle' || species === 'buffalo') {
    addMilestone(21, 'Check for Return to Heat', 'Observe animal for standing heat signs (mucus discharge, mounting). Absence suggests conception.', 'management', 'routine');
    addMilestone(35, 'Early Ultrasound Pregnancy Diagnosis', 'Perform veterinary transrectal ultrasonography to confirm heartbeat and embryonic vesicle.', 'health', 'important');
    addMilestone(60, 'Manual Rectal Palpation Confirmation', 'Rectal palpation to feel fetal membrane slip, amniotic vesicle, and asymmetric uterine horns.', 'health', 'routine');
    addMilestone(species === 'cattle' ? 220 : 250, 'Dry-Off Period (Stop Milking)', 'Stop milking cow to allow mammary gland involution and regeneration. Administer dry cow antibiotic intramammary therapy.', 'management', 'critical');
    addMilestone(species === 'cattle' ? 260 : 285, 'Transition Diet & Pre-calving Wanda', 'Introduce pre-calving transition concentrate (Anionic salts / DCAD balancing, high calcium bypass, extra vitamin E) to prevent Milk Fever.', 'nutrition', 'critical');
    addMilestone(species === 'cattle' ? 265 : 290, 'Pre-Calving Booster Vaccination', 'Administer Clostridial / Enterotoxemia and Rotavirus/Coronavirus vaccine to maximize maternal antibodies in colostrum.', 'health', 'important');
    addMilestone(gestationLengthDays - 3, 'Move to Clean Maternity Pen', 'Separate into a deeply bedded, sanitized calving pen with non-slip flooring.', 'management', 'critical');
    addMilestone(gestationLengthDays, `Expected Calving Window (${species === 'cattle' ? '283' : '310'} Days)`, 'Monitor stage 1 and stage 2 labor. Deliver clean warm colostrum within 2-4 hours of birth.', 'delivery', 'critical');
  } else if (species === 'goat' || species === 'sheep') {
    addMilestone(18, 'Check for Return to Estrus', 'Observe doe/ewe for flagging tail or estrus behavior.', 'management', 'routine');
    addMilestone(45, 'Transabdominal Ultrasound Scanning', 'Confirm multiple fetus count (twins/triplets) to adjust third-trimester feed rations.', 'health', 'important');
    addMilestone(105, 'Third Trimester Energy Boost', 'Increase energy density of ration to prevent Pregnancy Toxemia (Ketosis / Twin Lamb Disease).', 'nutrition', 'critical');
    addMilestone(120, 'Enterotoxemia (ETV) & Tetanus Booster', 'Boost maternal colostral immunity for newborn kids/lambs.', 'health', 'critical');
    addMilestone(145, 'Prepare Clean Kidding / Lambing Pen', 'Disinfect pen, prepare 7% iodine for navel dip, and warm towels.', 'management', 'critical');
    addMilestone(gestationLengthDays, 'Expected Kidding / Lambing Delivery', 'Ensure kid/lamb drinks 10-15% of body weight in colostrum within first 6 hours.', 'delivery', 'critical');
  } else {
    // Equine
    addMilestone(14, 'Early Equine Ultrasound & Twin Check', 'Detect pregnancy and pinch down twin vesicles before fixation (day 16).', 'health', 'critical');
    addMilestone(300, 'Late Gestation Vaccination Booster', 'EHV-1, Tetanus, and Rabies booster to enrich colostrum.', 'health', 'important');
    addMilestone(330, 'Waxing of Teats & Foaling Watch', 'Inspect mammary secretion calcium hardness strip test.', 'management', 'critical');
    addMilestone(gestationLengthDays, 'Expected Foaling Delivery', 'Rapid stage 2 labor (usually <30 minutes). 1-2-3 Rule (Stand in 1 hr, Nurse in 2 hrs, Pass placenta in 3 hrs).', 'delivery', 'critical');
  }

  return {
    species,
    serviceDate: serviceDate.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }),
    expectedDueDate: expectedDueDate.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }),
    windowMinDate: minDueDate.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }),
    windowMaxDate: maxDueDate.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }),
    gestationLengthDays,
    milestones: milestones.sort((a, b) => a.dayNumber - b.dayNumber)
  };
}

/**
 * Dairy Economics & Feed Optimization Calculator
 */
export function calculateDairyFarmEconomics(
  milkingCowsCount: number,
  avgYieldLitersPerDay: number,
  milkSellingPricePerLiter: number, // PKR
  silageKgPerAnimal: number,
  silagePricePerKg: number, // PKR
  concentrateWandaKgPerAnimal: number,
  concentrateWandaPricePerKg: number, // PKR
  greenFodderKgPerAnimal: number = 25,
  greenFodderPricePerKg: number = 4
) {
  const safeCount = Math.max(1, milkingCowsCount);
  const safeYield = Math.max(0, avgYieldLitersPerDay);
  const safePrice = Math.max(0, milkSellingPricePerLiter);

  // Daily Farm Production
  const totalDailyLiters = safeCount * safeYield;
  const totalDailyRevenue = totalDailyLiters * safePrice;

  // Daily Feed Cost Per Single Animal
  const singleSilageCost = silageKgPerAnimal * silagePricePerKg;
  const singleConcentrateCost = concentrateWandaKgPerAnimal * concentrateWandaPricePerKg;
  const singleGreenFodderCost = greenFodderKgPerAnimal * greenFodderPricePerKg;
  const singleAnimalFeedCost = singleSilageCost + singleConcentrateCost + singleGreenFodderCost;

  // Herd Totals
  const totalHerdDailyFeedCost = safeCount * singleAnimalFeedCost;
  const netDailyProfit = totalDailyRevenue - totalHerdDailyFeedCost;
  const netMonthlyProfit = netDailyProfit * 30;

  // Metrics
  const feedCostPerLiter = totalDailyLiters > 0 ? (totalHerdDailyFeedCost / totalDailyLiters) : 0;
  const grossMarginPercent = totalDailyRevenue > 0 ? ((netDailyProfit / totalDailyRevenue) * 100) : 0;
  const breakEvenYieldPerCow = singleAnimalFeedCost > 0 && safePrice > 0 ? (singleAnimalFeedCost / safePrice) : 0;

  return {
    milkingCowsCount: safeCount,
    avgYieldLitersPerDay: safeYield,
    totalDailyLiters,
    totalDailyRevenue: Math.round(totalDailyRevenue),
    singleAnimalFeedCost: Math.round(singleAnimalFeedCost),
    totalHerdDailyFeedCost: Math.round(totalHerdDailyFeedCost),
    netDailyProfit: Math.round(netDailyProfit),
    netMonthlyProfit: Math.round(netMonthlyProfit),
    feedCostPerLiter: Number(feedCostPerLiter.toFixed(2)),
    grossMarginPercent: Number(grossMarginPercent.toFixed(1)),
    breakEvenYieldPerCow: Number(breakEvenYieldPerCow.toFixed(2))
  };
}
