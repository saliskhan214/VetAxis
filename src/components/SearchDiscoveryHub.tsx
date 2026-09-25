import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  MapPin, 
  Stethoscope, 
  Users, 
  ShoppingBag, 
  Activity, 
  ShieldCheck, 
  HeartHandshake, 
  Globe, 
  ArrowRight, 
  ExternalLink,
  PhoneCall,
  Clock,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  FileText,
  BadgePercent,
  Plane,
  Calculator
} from 'lucide-react';

interface SearchQueryItem {
  query: string;
  category: string;
  badge?: string;
  targetTab: 'explore' | 'clinical_tools' | 'community' | 'marketplace' | 'pet_ads' | 'news' | 'jobs';
  targetParam?: string;
  description: string;
}

const SEO_SEARCH_CLUSTERS: {
  id: string;
  title: string;
  icon: any;
  color: string;
  tagline: string;
  items: SearchQueryItem[];
}[] = [
  {
    id: 'vet_near_me',
    title: '1. "Vet Near Me" Search Queries',
    icon: MapPin,
    color: 'emerald',
    tagline: '24/7 Immediate Need, Walk-in Clinics, Home Visits & Species Specialists',
    items: [
      {
        query: 'best vet near me open now',
        category: 'Immediate Need & Urgency',
        badge: 'Open Now',
        targetTab: 'explore',
        targetParam: 'filter=emergency',
        description: 'Locate highest-rated veterinarians open right now with live operating hours and direct clinic triage.'
      },
      {
        query: 'emergency vet near me 24 hours',
        category: 'Immediate Need & Urgency',
        badge: '24/7 ICU',
        targetTab: 'explore',
        targetParam: 'filter=emergency',
        description: 'Critical trauma centers, night-shift surgeons, and round-the-clock emergency animal hospital intensive care.'
      },
      {
        query: 'affordable vet near me walk in',
        category: 'Immediate Need & Urgency',
        badge: 'Walk-in',
        targetTab: 'explore',
        targetParam: 'filter=walkin',
        description: 'Same-day walk-in animal clinics with transparent, low-cost examination and consultation fees.'
      },
      {
        query: 'cheap vet near me for dogs without appointment',
        category: 'Immediate Need & Urgency',
        badge: 'No Appt',
        targetTab: 'explore',
        targetParam: 'filter=walkin',
        description: 'Immediate companion canine care without prior booking or surge surcharge.'
      },
      {
        query: 'mobile vet near me home visit',
        category: 'Immediate Need & Urgency',
        badge: 'Home Visit',
        targetTab: 'explore',
        targetParam: 'filter=mobile',
        description: 'Licensed mobile veterinarians delivering doorstep vaccines, diagnostics, and home hospice visits.'
      },
      {
        query: 'after hours animal doctor near me',
        category: 'Immediate Need & Urgency',
        badge: 'After Hours',
        targetTab: 'explore',
        targetParam: 'filter=emergency',
        description: 'Late evening and overnight veterinary doctors available for urgent triage.'
      },
      {
        query: 'weekend vet near me open sunday',
        category: 'Immediate Need & Urgency',
        badge: 'Sunday Open',
        targetTab: 'explore',
        targetParam: 'filter=walkin',
        description: 'Weekend veterinary clinics with Sunday emergency slots and walk-in consultation hours.'
      },
      {
        query: 'urgent pet care near me phone number',
        category: 'Immediate Need & Urgency',
        badge: 'Direct Call',
        targetTab: 'explore',
        targetParam: 'filter=emergency',
        description: 'Verified direct telephone and WhatsApp contact lines for immediate triage guidance.'
      },
      {
        query: 'cat only vet near me fear free certified',
        category: 'Specialized Animal Types',
        badge: 'Feline Certified',
        targetTab: 'explore',
        targetParam: 'filter=cat_only',
        description: 'Low-stress feline-only clinics designed to eliminate canine sensory triggers.'
      },
      {
        query: 'exotic pet vet near me rabbits birds reptiles',
        category: 'Specialized Animal Types',
        badge: 'Exotics',
        targetTab: 'explore',
        targetParam: 'filter=exotic',
        description: 'Specialists certified in small mammal exotics, companion rabbits, avians, and herpetology.'
      },
      {
        query: 'avian vet near me bird specialist',
        category: 'Specialized Animal Types',
        badge: 'Avian',
        targetTab: 'explore',
        targetParam: 'filter=exotic',
        description: 'Parrot, cockatiel, and poultry medical diagnostics, beak trimming, and crop care.'
      },
      {
        query: 'equine veterinarian near me horse care',
        category: 'Specialized Animal Types',
        badge: 'Equine',
        targetTab: 'explore',
        targetParam: 'filter=equine',
        description: 'Equine ambulatory doctors for colic management, equine dentistry, and lameness exams.'
      },
      {
        query: 'reptile and snake veterinarian near me',
        category: 'Specialized Animal Types',
        badge: 'Reptile',
        targetTab: 'explore',
        targetParam: 'filter=exotic',
        description: 'Herpetological care: respiratory infection therapy, metabolic bone disease, and shedding care.'
      },
      {
        query: 'highest rated vet near me google reviews',
        category: 'Ratings & Cost Comparison',
        badge: 'Top Rated ★★★★★',
        targetTab: 'explore',
        targetParam: 'sort=highest',
        description: 'Verified clinical practitioners with highest 5-star verified client feedback.'
      },
      {
        query: 'low cost vet near me for low income families',
        category: 'Ratings & Cost Comparison',
        badge: 'Subsidized',
        targetTab: 'explore',
        targetParam: 'filter=low_cost',
        description: 'Community veterinary programs, low-cost neuter schemes, and income-qualified care.'
      },
      {
        query: 'vet near me payment plans accepted carecredit',
        category: 'Ratings & Cost Comparison',
        badge: 'Payment Plans',
        targetTab: 'explore',
        targetParam: 'filter=payment_plans',
        description: 'Practices accepting CareCredit, EasyPaisa monthly installments, and installment billing.'
      },
      {
        query: 'free vet consultation near me helpline',
        category: 'Ratings & Cost Comparison',
        badge: 'Free Helpline',
        targetTab: 'community',
        targetParam: 'filter=ask_vet',
        description: 'Complimentary online community triage and volunteer DVM chat advisory.'
      }
    ]
  },
  {
    id: 'vet_clinic_near_me',
    title: '2. "Vet Clinic Near Me" Search Queries',
    icon: Stethoscope,
    color: 'blue',
    tagline: 'Routine Preventive Care, Digital Diagnostics & Surgical Clinical Procedures',
    items: [
      {
        query: 'vet clinic near me for puppy vaccinations and deworming',
        category: 'Routine Preventive Care',
        badge: 'AAHA Protocol',
        targetTab: 'clinical_tools',
        targetParam: 'sub=vaccine_schedule',
        description: 'Core DHPP & Rabies puppy vaccine schedule calculator, deworming dosing, and records.'
      },
      {
        query: 'cat spay neuter clinic near me low cost',
        category: 'Routine Preventive Care',
        badge: 'Low-Cost Surgery',
        targetTab: 'explore',
        targetParam: 'filter=spay_neuter',
        description: 'Affordable feline gonadectomy, micro-incision ovariohysterectomy, and castration clinics.'
      },
      {
        query: 'pet dental clinic near me teeth cleaning cost',
        category: 'Routine Preventive Care',
        badge: 'Dental Scaling',
        targetTab: 'explore',
        targetParam: 'filter=dental',
        description: 'Ultrasonic subgingival scaling, polishing, tooth extraction, and bad breath stomatitis care.'
      },
      {
        query: 'animal hospital and surgical clinic near me',
        category: 'Routine Preventive Care',
        badge: 'Surgical Theater',
        targetTab: 'explore',
        targetParam: 'filter=surgery',
        description: 'Fully sterile operating suites with isoflurane gas anesthesia and vital sign monitoring.'
      },
      {
        query: 'microchipping pet clinic near me price',
        category: 'Routine Preventive Care',
        badge: 'ISO 11784',
        targetTab: 'clinical_tools',
        targetParam: 'sub=travel_iata',
        description: 'Universal 15-digit ISO 11784/11785 RFID microchip implantation with digital pet passport.'
      },
      {
        query: 'pet dermatology clinic near me allergy testing',
        category: 'Routine Preventive Care',
        badge: 'Dermatology',
        targetTab: 'explore',
        targetParam: 'filter=dermatology',
        description: 'Intradermal skin testing, serum IgE allergy panels, atopica, and cytopoint injections.'
      },
      {
        query: 'vet clinic near me with ultrasound and digital x ray',
        category: 'Diagnostics & Urgent Symptoms',
        badge: 'Digital Imaging',
        targetTab: 'explore',
        targetParam: 'filter=diagnostics',
        description: 'High-frequency abdominal ultrasonography and digital radiology (computed radiography).'
      },
      {
        query: 'pet clinic near me dog vomiting blood test',
        category: 'Diagnostics & Urgent Symptoms',
        badge: 'In-House Lab',
        targetTab: 'clinical_tools',
        targetParam: 'sub=blood_ranges',
        description: 'Immediate complete blood count (CBC), chemistry analyzer, and parvo/pancreatitis testing.'
      },
      {
        query: 'walk in vet clinic near me for dog limping',
        category: 'Diagnostics & Urgent Symptoms',
        badge: 'Orthopedic',
        targetTab: 'explore',
        targetParam: 'filter=walkin',
        description: 'Cruciate ligament evaluation, hip dysplasia screening, and fracture stabilization.'
      },
      {
        query: 'vet clinic near me with in house blood lab',
        category: 'Diagnostics & Urgent Symptoms',
        badge: '15-Min Results',
        targetTab: 'explore',
        targetParam: 'filter=diagnostics',
        description: 'Stat clinical biochemistry, electrolyte electrolytes, and SDMA renal biomarker profiles.'
      },
      {
        query: 'government animal veterinary hospital near me contact',
        category: 'Diagnostics & Urgent Symptoms',
        badge: 'Govt Hospital',
        targetTab: 'explore',
        targetParam: 'filter=government',
        description: 'Civil veterinary hospital contact directories, rabies vaccination points, and livestock dispensaries.'
      }
    ]
  },
  {
    id: 'vet_community',
    title: '3. "Vet Community" Search Queries',
    icon: Users,
    color: 'amber',
    tagline: 'Professional DVM Forums, VIN Networks, Student Discord & CE Webinars',
    items: [
      {
        query: 'veterinary community forum online discussion',
        category: 'Professional Forums & Networks',
        badge: 'DVM Forum',
        targetTab: 'community',
        targetParam: 'filter=all',
        description: 'Join peer-to-peer discussions on diagnostic challenges, pharmacology, and clinic management.'
      },
      {
        query: 'veterinary information network login VIN',
        category: 'Professional Forums & Networks',
        badge: 'VIN Discussions',
        targetTab: 'community',
        targetParam: 'filter=vin',
        description: 'Connect with global veterinary specialists, database cross-references, and consults.'
      },
      {
        query: 'vet tech community reddit career advice',
        category: 'Professional Forums & Networks',
        badge: 'Vet Tech Hub',
        targetTab: 'jobs',
        targetParam: 'type=tech',
        description: 'Veterinary nursing career trajectories, CVT/RVT licensing, and salary benchmarks.'
      },
      {
        query: 'veterinarian peer support network mental health',
        category: 'Professional Forums & Networks',
        badge: 'Peer Wellness',
        targetTab: 'community',
        targetParam: 'filter=peer_support',
        description: 'Confidential peer support networks combating compassion fatigue and veterinary burnout.'
      },
      {
        query: 'global veterinary associations directory',
        category: 'Professional Forums & Networks',
        badge: 'WSAVA / AVMA',
        targetTab: 'news',
        targetParam: 'topic=associations',
        description: 'Accreditation directories: WSAVA, AVMA, PVMC, RCVS, and FECAVA membership rosters.'
      },
      {
        query: 'DVM community whatsapp group links join',
        category: 'Professional Forums & Networks',
        badge: 'WhatsApp Link',
        targetTab: 'community',
        targetParam: 'filter=groups',
        description: 'Join verified regional DVM and clinical resident study and case exchange groups.'
      },
      {
        query: 'ask a vet online free community chat',
        category: 'Professional Forums & Networks',
        badge: 'Free Q&A',
        targetTab: 'community',
        targetParam: 'filter=ask_vet',
        description: 'Ask clinical questions and receive evidence-based triage opinions from registered practitioners.'
      },
      {
        query: 'vet school student study community discord',
        category: 'Student & Clinical Case Sharing',
        badge: 'Student Discord',
        targetTab: 'community',
        targetParam: 'filter=students',
        description: 'Anatomy, physiology, NAVLE review, and clinical rotations discussion for DVM undergrads.'
      },
      {
        query: 'veterinary case studies community radiograph discussion',
        category: 'Student & Clinical Case Sharing',
        badge: 'Radiology Rounds',
        targetTab: 'community',
        targetParam: 'filter=case_studies',
        description: 'Review Thoracic/Abdominal X-rays, ultrasound loops, and complex orthopedic case presentations.'
      },
      {
        query: 'vet surgery community protocols and tips',
        category: 'Student & Clinical Case Sharing',
        badge: 'Surgical Protocols',
        targetTab: 'community',
        targetParam: 'filter=surgery',
        description: 'Soft-tissue, orthopedic, and emergency gastropexy techniques shared by board surgeons.'
      },
      {
        query: 'veterinary continuing education CE webinars community',
        category: 'Student & Clinical Case Sharing',
        badge: 'RACE CE Credits',
        targetTab: 'community',
        targetParam: 'filter=ce_webinars',
        description: 'Accredited clinical webinars, pharmacology updates, and diagnostic certificates.'
      }
    ]
  },
  {
    id: 'vet_products',
    title: '4. "Vet Products" Search Queries',
    icon: ShoppingBag,
    color: 'indigo',
    tagline: 'Prescription Pharmaceuticals, Parasite Preventatives & Veterinary Diets',
    items: [
      {
        query: 'buy veterinary prescription medicine online direct',
        category: 'Medications & Preventive Treatments',
        badge: 'Rx Pharmacy',
        targetTab: 'marketplace',
        targetParam: 'search=prescription',
        description: 'Verified animal pharmacy dispensing authentic veterinary prescription drugs directly.'
      },
      {
        query: 'best flea and tick prevention chewables for dogs',
        category: 'Medications & Preventive Treatments',
        badge: 'Parasite Defense',
        targetTab: 'marketplace',
        targetParam: 'search=flea',
        description: 'Monthly isoxazoline chewables (fluralaner, afoxolaner, sarolaner) for dogs and cats.'
      },
      {
        query: 'broad spectrum heartworm pills for dogs online',
        category: 'Medications & Preventive Treatments',
        badge: 'Heartworm',
        targetTab: 'marketplace',
        targetParam: 'search=heartworm',
        description: 'Ivermectin / milbemycin oxime monthly chewable preventive tablets for canine protection.'
      },
      {
        query: 'veterinary antibiotics amoxicillin for cats dosage buy',
        category: 'Medications & Preventive Treatments',
        badge: 'Antibiotic Dosing',
        targetTab: 'clinical_tools',
        targetParam: 'search=amoxicillin',
        description: 'Exact mg/kg dosing calculator and prescription ordering for amoxicillin-clavulanate oral suspension.'
      },
      {
        query: 'canine joint supplements collagen glucosamine chewable',
        category: 'Medications & Preventive Treatments',
        badge: 'Joint Support',
        targetTab: 'marketplace',
        targetParam: 'search=glucosamine',
        description: 'Type II collagen, MSM, chondroitin, and green-lipped mussel soft chews for arthritis.'
      },
      {
        query: 'vet approved ear infection drops for dogs',
        category: 'Medications & Preventive Treatments',
        badge: 'Otic Drops',
        targetTab: 'marketplace',
        targetParam: 'search=ear',
        description: 'Broad-spectrum antifungal, antibacterial, and anti-inflammatory otic suspensions.'
      },
      {
        query: 'veterinary wound spray antiseptics buy bulk',
        category: 'Medications & Preventive Treatments',
        badge: 'Wound Care',
        targetTab: 'marketplace',
        targetParam: 'search=wound',
        description: 'Hypochlorous acid and medical-grade chlorhexidine wound cleansing sprays.'
      },
      {
        query: 'veterinary urinary care prescription cat food delivery',
        category: 'Prescription Diets & Hygiene',
        badge: 'Urinary Care S/O',
        targetTab: 'marketplace',
        targetParam: 'search=urinary',
        description: 'Struvite and calcium oxalate crystal dissolution feline clinical diet formulas.'
      },
      {
        query: 'dog kidney support renal diet wet food vet recommended',
        category: 'Prescription Diets & Hygiene',
        badge: 'Renal Support',
        targetTab: 'marketplace',
        targetParam: 'search=renal',
        description: 'Low-phosphorus, controlled-protein wet food specifically formulated for CKD management.'
      },
      {
        query: 'veterinary antiseptic shampoo chlorhexidine 4 percent',
        category: 'Prescription Diets & Hygiene',
        badge: 'Chlorhexidine 4%',
        targetTab: 'marketplace',
        targetParam: 'search=shampoo',
        description: 'Antifungal, antibacterial dermatological treatment shampoo for pyoderma and hot spots.'
      },
      {
        query: 'enzymatic pet toothpaste vet recommended buy',
        category: 'Prescription Diets & Hygiene',
        badge: 'Dental Hygiene',
        targetTab: 'marketplace',
        targetParam: 'search=toothpaste',
        description: 'Dual-enzyme safe swallowed tartar-inhibiting toothpaste for dogs and cats.'
      }
    ]
  },
  {
    id: 'pet_ds',
    title: '5. "Pet DS" (Diseases, Diagnostics & Dietary Supplements)',
    icon: Activity,
    color: 'rose',
    tagline: 'Canine Blood Reference Ranges, Day-by-Day Disease Guides & Diagnostic Kits',
    items: [
      {
        query: 'parvovirus symptoms in puppies day by day',
        category: 'Pet Diseases & Symptoms',
        badge: 'CPV Day-by-Day',
        targetTab: 'clinical_tools',
        targetParam: 'sub=pet_ds',
        description: 'Day 1 to 7 progression guide: fever, vomiting, bloody stool, fluid triage, and recovery benchmarks.'
      },
      {
        query: 'cat chronic kidney disease stages and survival rate',
        category: 'Pet Diseases & Symptoms',
        badge: 'IRIS Stages 1-4',
        targetTab: 'clinical_tools',
        targetParam: 'sub=pet_ds',
        description: 'International Renal Interest Society (IRIS) staging, SDMA testing, and life expectancy curves.'
      },
      {
        query: 'tick borne disease in dogs symptoms and blood test cost',
        category: 'Pet Diseases & Symptoms',
        badge: '4Dx SNAP Test',
        targetTab: 'clinical_tools',
        targetParam: 'sub=pet_ds',
        description: 'Ehrlichia, Anaplasma, Lyme, and Babesia diagnostic markers, PCR tests, and treatment.'
      },
      {
        query: 'dog bloat GDV emergency signs what to do',
        category: 'Pet Diseases & Symptoms',
        badge: 'GDV Emergency',
        targetTab: 'clinical_tools',
        targetParam: 'sub=pet_ds',
        description: 'Life-saving protocols: unproductive retching, distended abdomen, gastropexy, and immediate decompression.'
      },
      {
        query: 'feline infectious peritonitis FIP treatment availability',
        category: 'Pet Diseases & Symptoms',
        badge: 'GS-441524 Protocol',
        targetTab: 'clinical_tools',
        targetParam: 'sub=pet_ds',
        description: 'Wet vs dry FIP antiviral nucleotide analog treatment dosages, monitoring, and remission guidelines.'
      },
      {
        query: 'canine distemper early symptoms vs kennel cough',
        category: 'Pet Diseases & Symptoms',
        badge: 'Distemper vs Cough',
        targetTab: 'clinical_tools',
        targetParam: 'sub=pet_ds',
        description: 'Biphasic fever, ocular discharge, hyperkeratosis (hard pad) vs infectious tracheobronchitis.'
      },
      {
        query: 'pet DNA and health testing kit reviews accuracy',
        category: 'Diagnostics & Testing',
        badge: 'Genetic DNA',
        targetTab: 'clinical_tools',
        targetParam: 'sub=pet_ds',
        description: 'MDR1 drug sensitivity, Von Willebrand disease, and genetic breed composition screening.'
      },
      {
        query: 'canine blood test normal ranges reference chart pdf',
        category: 'Diagnostics & Testing',
        badge: 'Normal Ranges Chart',
        targetTab: 'clinical_tools',
        targetParam: 'sub=blood_chart',
        description: 'Complete canine & feline hematology (RBC, WBC, PLT) and chemistry (BUN, Creatinine, ALT, ALKP) table.'
      },
      {
        query: 'rapid parvo test kit buy online veterinary diagnostics',
        category: 'Diagnostics & Testing',
        badge: 'Rapid Test Kits',
        targetTab: 'marketplace',
        targetParam: 'search=parvo',
        description: '10-minute colloidal gold immunochromatographic antigen cassette kits for veterinary clinics.'
      },
      {
        query: 'pet dropshipping suppliers private label pet products',
        category: 'Diagnostics & Testing',
        badge: 'Wholesale B2B',
        targetTab: 'marketplace',
        targetParam: 'category=clinical_equipment',
        description: 'Direct clinic supply chain, private label pet supplements, and diagnostics wholesale.'
      },
      {
        query: 'dog allergy home test kit saliva vs blood',
        category: 'Diagnostics & Testing',
        badge: 'Allergy Testing',
        targetTab: 'clinical_tools',
        targetParam: 'sub=pet_ds',
        description: 'Scientific analysis of serum IgE testing vs unverified home saliva kits.'
      },
      {
        query: 'pet diagnostic test kits direct supply wholesale',
        category: 'Diagnostics & Testing',
        badge: 'Lab Supplies',
        targetTab: 'marketplace',
        targetParam: 'search=diagnostic',
        description: 'Giardia, FeLV/FIV combos, Heartworm, and distemper diagnostic cassettes in clinic bulk.'
      }
    ]
  },
  {
    id: 'vet_accessories',
    title: '6. "Vet Accessories Buy & Sale" Search Queries',
    icon: ShieldCheck,
    color: 'cyan',
    tagline: 'Clinical Surgical Hardware, Refurbished Ultrasound & Clinic Hardware',
    items: [
      {
        query: 'veterinary surgical instruments set buy online',
        category: 'Clinical & Surgical Equipment',
        badge: 'Surgical Sets',
        targetTab: 'marketplace',
        targetParam: 'search=surgical',
        description: 'German grade stainless steel scalpel handles, Metzenbaum scissors, and needle holders.'
      },
      {
        query: 'used veterinary ultrasound machine for sale certified refurbished',
        category: 'Clinical & Surgical Equipment',
        badge: 'Refurbished Imaging',
        targetTab: 'marketplace',
        targetParam: 'search=ultrasound',
        description: 'Color Doppler portable ultrasound systems with microconvex and linear rectal probes.'
      },
      {
        query: 'veterinary digital x ray sensor price buy sell',
        category: 'Clinical & Surgical Equipment',
        badge: 'DR Flat Panel',
        targetTab: 'marketplace',
        targetParam: 'search=x-ray',
        description: 'Wireless direct radiography (DR) Cesium Iodide flat panel detectors and DICOM viewers.'
      },
      {
        query: 'veterinary anesthesia machine buy new and used',
        category: 'Clinical & Surgical Equipment',
        badge: 'Anesthesia Units',
        targetTab: 'marketplace',
        targetParam: 'search=anesthesia',
        description: 'Closed-circuit veterinary anesthesia workstations with precision isoflurane vaporizers.'
      },
      {
        query: 'veterinary examination table stainless steel wholesale',
        category: 'Clinical & Surgical Equipment',
        badge: 'Stainless Exam',
        targetTab: 'marketplace',
        targetParam: 'search=table',
        description: '304-grade stainless steel hydraulic lift and V-top surgical positioning tables.'
      },
      {
        query: 'vet autoclaves and sterilizers buy sale medical supply',
        category: 'Clinical & Surgical Equipment',
        badge: 'Class B Autoclave',
        targetTab: 'marketplace',
        targetParam: 'search=autoclave',
        description: 'Vacuum autoclaves with sterilization drying cycles for orthopedic and surgical tool sets.'
      },
      {
        query: 'vet clinic stainless steel recovery cages modular buy sale',
        category: 'Clinic Hardware & Cages',
        badge: 'Modular Cages',
        targetTab: 'marketplace',
        targetParam: 'search=cage',
        description: 'Slam-latch hospital ward stainless steel dog and cat boarding recovery cage banks.'
      },
      {
        query: 'veterinary dental scaler machine price sale',
        category: 'Clinic Hardware & Cages',
        badge: 'Dental Scalers',
        targetTab: 'marketplace',
        targetParam: 'search=scaler',
        description: 'Piezoelectric ultrasonic scalers with built-in water bottle and LED handpieces.'
      },
      {
        query: 'veterinary orthopedic drill system buy sale',
        category: 'Clinic Hardware & Cages',
        badge: 'Orthopedic Drills',
        targetTab: 'marketplace',
        targetParam: 'search=drill',
        description: 'Cannulated bone drills and oscillating sagittal saws for cruciate and fracture repair.'
      },
      {
        query: 'used animal clinic equipment liquidators near me',
        category: 'Clinic Hardware & Cages',
        badge: 'Liquidators',
        targetTab: 'marketplace',
        targetParam: 'search=equipment',
        description: 'Complete hospital liquidations: surgery lights, monitors, centrifuges, and tables.'
      },
      {
        query: 'veterinary PPE surgical gowns and drapes wholesale suppliers',
        category: 'Clinic Hardware & Cages',
        badge: 'Wholesale PPE',
        targetTab: 'marketplace',
        targetParam: 'search=ppe',
        description: 'Sterile surgical drapes, fenestrated sheets, disposable gowns, and nitrile gloves.'
      }
    ]
  },
  {
    id: 'pets_adoption',
    title: '7. "Pets Buy, Sale & Adoption" Search Queries',
    icon: HeartHandshake,
    color: 'teal',
    tagline: 'Shelters, Foster-to-Adopt, Ethical Breeding & Puppy Scam Prevention',
    items: [
      {
        query: 'dog adoption near me shelters with puppies available',
        category: 'Adoptions & Rescues',
        badge: 'Shelter Puppies',
        targetTab: 'pet_ads',
        targetParam: 'type=adoption',
        description: 'Verified animal shelters with fully vaccinated and dewormed rescue puppies available.'
      },
      {
        query: 'rescue cat adoption center near me free adoption weekend',
        category: 'Adoptions & Rescues',
        badge: 'Free Adoption',
        targetTab: 'pet_ads',
        targetParam: 'type=adoption',
        description: 'Spayed/neutered feline rescue adoption events with microchips and starter packages.'
      },
      {
        query: 'adopt senior dog near me foster to adopt programs',
        category: 'Adoptions & Rescues',
        badge: 'Senior Dogs',
        targetTab: 'pet_ads',
        targetParam: 'type=adoption',
        description: 'Trial foster-to-adopt arrangements giving gentle senior dogs a dignified second home.'
      },
      {
        query: 'rabbit and small animal rescue adoption near me',
        category: 'Adoptions & Rescues',
        badge: 'Small Animals',
        targetTab: 'pet_ads',
        targetParam: 'type=adoption',
        description: 'Bonded bunny pairs, guinea pigs, and small companion rescues awaiting homes.'
      },
      {
        query: 'pet rescue adoption application process checklist',
        category: 'Adoptions & Rescues',
        badge: 'Application Guide',
        targetTab: 'clinical_tools',
        targetParam: 'sub=safe_adoption',
        description: 'Home inspection standards, landlord approvals, and veterinary reference checklist.'
      },
      {
        query: 'reputable certified dog breeders near me health tested',
        category: 'Buy & Sell (Classifieds)',
        badge: 'Health Tested',
        targetTab: 'clinical_tools',
        targetParam: 'sub=safe_adoption',
        description: 'OFA hip/elbow dysplasia certifications, eye CERF scores, and DNA parentage verification.'
      },
      {
        query: 'buy kitten near me verified pedigree GCCF TICA',
        category: 'Buy & Sell (Classifieds)',
        badge: 'TICA / GCCF',
        targetTab: 'pet_ads',
        targetParam: 'type=sale',
        description: 'Pedigreed British Shorthair, Persian, and Maine Coon kittens with registration papers.'
      },
      {
        query: 'ethical pet rehoming websites no fee',
        category: 'Buy & Sell (Classifieds)',
        badge: 'Zero-Fee Rehome',
        targetTab: 'pet_ads',
        targetParam: 'type=adoption',
        description: 'Direct family-to-family rehoming without commercial broker fees or shady markups.'
      },
      {
        query: 'birds parrots buy sale near me hand tamed',
        category: 'Buy & Sell (Classifieds)',
        badge: 'Hand-Tamed Birds',
        targetTab: 'pet_ads',
        targetParam: 'type=sale',
        description: 'Hand-reared African Greys, Cockatoos, and Budgies with health screening records.'
      },
      {
        query: 'exotic pets buy and sell legal licenses required',
        category: 'Buy & Sell (Classifieds)',
        badge: 'CITES / Permits',
        targetTab: 'news',
        targetParam: 'topic=regulations',
        description: 'Provincial wildlife permits, non-native species legislation, and animal welfare compliance.'
      },
      {
        query: 'puppy scams how to safely buy pets online guidelines',
        category: 'Buy & Sell (Classifieds)',
        badge: 'Anti-Scam Alert',
        targetTab: 'clinical_tools',
        targetParam: 'sub=safe_adoption',
        description: 'Crucial rules: never wire untraceable deposits, demand live video verify, and insist on vet records.'
      }
    ]
  },
  {
    id: 'animal_news',
    title: '8. "Animal News & Guidelines" Search Queries',
    icon: Globe,
    color: 'purple',
    tagline: 'International Travel, USDA APHIS, CDC Rabies, IATA Crates & Disease Alerts',
    items: [
      {
        query: 'international pet travel guidelines USDA APHIS import requirements',
        category: 'Regulations & Travel',
        badge: 'USDA APHIS',
        targetTab: 'clinical_tools',
        targetParam: 'sub=travel_iata',
        description: 'Endorsed health certificate timelines, country-specific titer tests, and airline protocol.'
      },
      {
        query: 'IATA approved pet carrier crate dimensions international flight',
        category: 'Regulations & Travel',
        badge: 'IATA Calculator',
        targetTab: 'clinical_tools',
        targetParam: 'sub=travel_iata',
        description: 'Interactive pet measurement calculator for cargo container height, length, and ventilation.'
      },
      {
        query: 'CDC dog import rabies vaccination rules updated guidelines',
        category: 'Regulations & Travel',
        badge: 'CDC Rules 2026',
        targetTab: 'clinical_tools',
        targetParam: 'sub=travel_iata',
        description: 'New microchip rules, CDC Dog Import Form, titer requirements from high-risk countries.'
      },
      {
        query: 'pet microchip ISO standard 11784 international travel',
        category: 'Regulations & Travel',
        badge: 'ISO 11784/11785',
        targetTab: 'clinical_tools',
        targetParam: 'sub=travel_iata',
        description: '15-digit 134.2 kHz FDX-B universal microchip requirements for EU, UK, and US entry.'
      },
      {
        query: 'animal health certificate AHC requirements for pet travel',
        category: 'Regulations & Travel',
        badge: 'AHC Certificate',
        targetTab: 'clinical_tools',
        targetParam: 'sub=travel_iata',
        description: 'Official Veterinarian (OV) completion checklists, tapeworm treatments, and validity windows.'
      },
      {
        query: 'FDA pet food recall list updated this month',
        category: 'Health Updates & News',
        badge: 'FDA Recalls',
        targetTab: 'news',
        targetParam: 'topic=fda_pet_food_recalls',
        description: 'Live alerts on salmonella contamination, elevated aflatoxins, and excess Vitamin D.'
      },
      {
        query: 'mystery canine respiratory illness latest news and symptoms',
        category: 'Health Updates & News',
        badge: 'Atypical CIRDC',
        targetTab: 'news',
        targetParam: 'topic=respiratory',
        description: 'Clinical presentations, veterinary quarantine advice, and PCR diagnostics for stubborn coughs.'
      },
      {
        query: 'WHO zoonotic disease outbreaks animal to human updates',
        category: 'Health Updates & News',
        badge: 'Zoonotic Alerts',
        targetTab: 'news',
        targetParam: 'topic=zoonotic',
        description: 'Global surveillance on rabies, brucellosis, leptospirosis, and anthrax cross-species prevention.'
      },
      {
        query: 'AAHA canine vaccination guidelines core vs noncore schedule',
        category: 'Health Updates & News',
        badge: 'AAHA Schedule',
        targetTab: 'news',
        targetParam: 'topic=aaha_vaccine_guidelines',
        description: 'Core (Rabies, Distemper, Parvo, Adenovirus) vs Non-core (Lepto, Lyme, Bordetella, Flu).'
      },
      {
        query: 'animal welfare act latest legal amendments and penalties',
        category: 'Health Updates & News',
        badge: 'Welfare Laws',
        targetTab: 'news',
        targetParam: 'topic=welfare_laws',
        description: 'Cruelty protections, transport regulations, and legal penalties under provincial laws.'
      },
      {
        query: 'bird flu avian influenza domestic pet safety news',
        category: 'Health Updates & News',
        badge: 'H5N1 Alert',
        targetTab: 'news',
        targetParam: 'topic=avian_flu',
        description: 'H5N1 transmission risks for domestic cats and dogs exposed to wild waterfowl.'
      }
    ]
  }
];

interface SearchDiscoveryHubProps {
  onNavigate: (section: string, filterOrParam?: string) => void;
  onClose?: () => void;
}

export function SearchDiscoveryHub({ onNavigate, onClose }: SearchDiscoveryHubProps) {
  const [activeClusterId, setActiveClusterId] = useState<string>('all');
  const [filterQuery, setFilterQuery] = useState<string>('');

  const filteredClusters = useMemo(() => {
    return SEO_SEARCH_CLUSTERS.map(cluster => {
      if (activeClusterId !== 'all' && cluster.id !== activeClusterId) {
        return null;
      }
      if (!filterQuery.trim()) {
        return cluster;
      }
      const q = filterQuery.toLowerCase();
      const matchedItems = cluster.items.filter(item => 
        item.query.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        (item.badge || '').toLowerCase().includes(q)
      );
      if (matchedItems.length === 0) return null;
      return {
        ...cluster,
        items: matchedItems
      };
    }).filter(Boolean) as typeof SEO_SEARCH_CLUSTERS;
  }, [activeClusterId, filterQuery]);

  const totalQueriesCount = useMemo(() => {
    return SEO_SEARCH_CLUSTERS.reduce((acc, c) => acc + c.items.length, 0);
  }, []);

  const handleItemClick = (item: SearchQueryItem) => {
    // Navigate with query or sub parameters
    if (item.targetTab === 'explore') {
      if (item.targetParam?.includes('filter=')) {
        const f = item.targetParam.split('filter=')[1];
        onNavigate('explore', f);
      } else if (item.targetParam?.includes('sort=')) {
        onNavigate('explore');
      } else {
        onNavigate('explore', item.query);
      }
    } else if (item.targetTab === 'clinical_tools') {
      if (item.targetParam) {
        window.history.pushState({}, '', `/?tab=clinical_tools&${item.targetParam}`);
      }
      onNavigate('clinical_tools', item.targetParam);
    } else if (item.targetTab === 'marketplace') {
      if (item.targetParam) {
        window.history.pushState({}, '', `/?tab=marketplace&${item.targetParam}`);
      }
      onNavigate('marketplace', item.targetParam);
    } else if (item.targetTab === 'community') {
      onNavigate('community', item.targetParam);
    } else if (item.targetTab === 'pet_ads') {
      onNavigate('pet_ads', item.targetParam);
    } else if (item.targetTab === 'jobs') {
      onNavigate('jobs', item.targetParam);
    } else if (item.targetTab === 'news') {
      onNavigate('news', item.targetParam);
    } else {
      onNavigate('explore');
    }

    if (onClose) onClose();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 text-left">
      {/* Hero Header */}
      <div className="bg-gradient-to-br from-[#2d3a30] via-[#3a4a3e] to-[#1c2e24] text-white rounded-3xl p-6 sm:p-10 shadow-xl border border-[#4a5d4e]/40 relative overflow-hidden">
        <div className="absolute -right-12 -top-12 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-4 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-950/70 border border-emerald-500/30 text-emerald-300 text-xs font-black tracking-wide uppercase">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>Search &amp; SEO Discovery Engine — {totalQueriesCount} Clinical Query Topics</span>
          </div>

          <h1 className="font-serif text-2xl sm:text-4xl font-black tracking-tight text-white leading-tight">
            Veterinary Intelligence &amp; Search Portal
          </h1>

          <p className="text-stone-300 text-sm sm:text-base leading-relaxed font-medium">
            Explore Pakistan and global search terms: 24/7 emergency veterinary clinics, low-cost walk-in pet hospitals, DVM clinical case discussions, prescription medications, Canine Blood Test normal ranges, surgical supplies, and official animal travel guidelines.
          </p>

          {/* Quick Real-Time Search Bar */}
          <div className="pt-2">
            <div className="relative max-w-xl">
              <Search className="w-5 h-5 text-stone-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                placeholder="Search any query (e.g. 'emergency vet 24 hours', 'parvovirus day by day', 'IATA crate', 'amoxicillin')..."
                className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-white/10 hover:bg-white/15 focus:bg-white text-white focus:text-stone-900 border border-white/20 focus:border-emerald-500 outline-none transition-all placeholder:text-stone-400 text-sm font-semibold shadow-inner"
              />
              {filterQuery && (
                <button
                  onClick={() => setFilterQuery('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs bg-white/20 hover:bg-white/30 text-white px-2 py-1 rounded-lg font-bold"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Cluster Navigation Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 bg-[#fcfbf9] border border-[#e3dec9] p-2 rounded-2xl shadow-sm">
        <button
          onClick={() => setActiveClusterId('all')}
          className={`cursor-pointer px-4 py-2 text-xs font-black rounded-xl border transition-all ${
            activeClusterId === 'all'
              ? 'bg-[#5a5a40] text-white border-[#5a5a40] shadow-sm'
              : 'bg-white text-stone-600 border-[#e3dec9] hover:bg-stone-50'
          }`}
        >
          🌐 All 8 Query Categories ({totalQueriesCount})
        </button>

        {SEO_SEARCH_CLUSTERS.map((cluster) => {
          const isActive = activeClusterId === cluster.id;
          return (
            <button
              key={cluster.id}
              onClick={() => setActiveClusterId(cluster.id)}
              className={`cursor-pointer px-3.5 py-2 text-xs font-bold rounded-xl border transition-all inline-flex items-center gap-1.5 ${
                isActive
                  ? 'bg-[#5a5a40] text-white border-[#5a5a40] shadow-sm'
                  : 'bg-white text-stone-700 border-[#e3dec9] hover:bg-stone-50'
              }`}
            >
              <span>{cluster.title.split('.')[1]?.trim().split('Search')[0] || cluster.title}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono ${isActive ? 'bg-white/20 text-white' : 'bg-stone-100 text-stone-600'}`}>
                {cluster.items.length}
              </span>
            </button>
          );
        })}
      </div>

      {/* Clusters & Query Cards List */}
      <div className="space-y-10">
        {filteredClusters.length === 0 ? (
          <div className="bg-white border border-[#e3dec9] rounded-3xl p-12 text-center space-y-3">
            <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
            <h3 className="font-serif font-bold text-lg text-stone-800">No matching search query found</h3>
            <p className="text-xs text-stone-500 max-w-md mx-auto">
              We couldn't find queries matching "{filterQuery}". Try terms like "emergency", "parvovirus", "ultrasound", or "travel".
            </p>
            <button
              onClick={() => { setFilterQuery(''); setActiveClusterId('all'); }}
              className="mt-2 btn-tactile-3d px-5 py-2 text-xs font-bold text-white bg-[#5a5a40]"
            >
              Reset Search Filters
            </button>
          </div>
        ) : (
          filteredClusters.map((cluster) => {
            const ClusterIcon = cluster.icon;
            return (
              <div 
                key={cluster.id}
                className="bg-white border border-[#e3dec9] border-b-[4px] border-b-[#d5cfb8] rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs"
              >
                {/* Cluster Title Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#f4f1e9] pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-[#f4f1e9] text-[#5a5a40] flex items-center justify-center font-bold">
                      <ClusterIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="font-serif font-black text-xl text-stone-800 tracking-tight">
                        {cluster.title}
                      </h2>
                      <p className="text-xs text-stone-500 font-medium">
                        {cluster.tagline}
                      </p>
                    </div>
                  </div>

                  <span className="text-xs font-bold text-stone-600 bg-[#f4f1e9] px-3 py-1 rounded-xl self-start sm:self-auto">
                    {cluster.items.length} High-Volume Search Lines
                  </span>
                </div>

                {/* Query Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {cluster.items.map((item, idx) => (
                    <motion.div
                      key={idx}
                      whileHover={{ y: -2 }}
                      onClick={() => handleItemClick(item)}
                      className="cursor-pointer group bg-[#fdfcf9] hover:bg-white border border-[#e8e4d3] hover:border-[#5a5a40] hover:shadow-md p-4 rounded-2xl transition-all flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        {/* Badges */}
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-md">
                            {item.category}
                          </span>
                          {item.badge && (
                            <span className="text-[10px] font-bold text-[#5a5a40] bg-[#f4f1e9] px-2 py-0.5 rounded-md">
                              {item.badge}
                            </span>
                          )}
                        </div>

                        {/* Search Query String */}
                        <h4 className="font-bold text-sm text-stone-900 group-hover:text-[#5a5a40] transition-colors leading-snug">
                          "{item.query}"
                        </h4>

                        {/* Query Intent Summary */}
                        <p className="text-xs text-stone-500 leading-relaxed line-clamp-2">
                          {item.description}
                        </p>
                      </div>

                      {/* Footer Call to Action */}
                      <div className="mt-4 pt-3 border-t border-[#f4f1e9] flex items-center justify-between text-xs font-bold text-[#5a5a40]">
                        <span className="text-[11px] text-stone-400 group-hover:text-stone-600 font-mono">
                          View in {item.targetTab.replace('_', ' ')}
                        </span>
                        <span className="inline-flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                          <span>Open</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
