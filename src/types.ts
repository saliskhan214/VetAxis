export type UserRole = 'doctor' | 'clinic' | 'assistant' | 'user';

export function canUserReview(reviewerRole?: UserRole | string | null, targetRole?: UserRole | string | null): boolean {
  return true;
}

export interface GeoLocation {
  lat: number;
  lng: number;
  address: string;
}

export interface Review {
  id: string; // added for Firestore safety
  reviewerEmail: string;
  reviewerName: string;
  reviewerRole: UserRole;
  rating: number;
  comment: string;
  date: number;
}

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  expertise?: string;    // doctors / assistants
  facilities?: string;   // clinics
  address?: string;      // clinics
  profilePic?: string;   // base64 or 'default'
  createdAt: number;
  location?: GeoLocation | null;
  isVerified?: boolean; // legacy
  subscriptionTier?: 'Silver' | 'Gold' | 'Platinum';
  subscriptionExpiresAt?: number;
  promoAdsUsed?: number;
  emailVerified?: boolean;
  avgRating?: number;
  totalReviews?: number;
  reviews?: Review[]; // For local schema backward compatibility
  isOnline?: boolean;
  lastSeen?: number; // timestamp in milliseconds
  isAdmin?: boolean;
}

export interface ManualPayment {
  id: string;
  userId: string;
  userName?: string;
  userEmail: string;
  planId: 'Silver' | 'Gold' | 'Platinum';
  transactionId: string;
  paymentMethod?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: number;
}

export interface PetAd {
  id: string;
  adType: 'sale' | 'adoption';
  petType: string;
  breed: string;
  age: number | null;
  price: number;
  description: string;
  location: string;
  whatsapp: string;
  image?: string; // base64
  ownerEmail: string;
  ownerName: string;
  ownerRole: UserRole;
  createdAt: number;
  isPremium?: boolean;
  ownerSubscriptionTier?: 'Silver' | 'Gold' | 'Platinum';
}

export interface Product {
  id: string;
  name: string;
  price: number;
  quantity: number;
  description: string;
  whatsapp: string;
  image?: string; // base64
  ownerEmail: string;
  ownerName: string;
  ownerRole: UserRole;
  createdAt: number;
  isPremium?: boolean;
  ownerSubscriptionTier?: 'Silver' | 'Gold' | 'Platinum';
}

export interface CommunityPost {
  id: string;
  authorEmail: string;
  authorUid?: string; // High-precision unique ID representing Auth UID
  authorName: string;
  role: UserRole;
  profilePic: string;
  text: string;
  category: 'lost' | 'adoption' | 'help' | 'general' | 'emergency';
  ts: number;
  reactions: {
    [key: string]: string[]; // maps '❤️' | '👍' | '❗' to array of user emails/UIDs
  };
  title?: string; // Professional posting titles
  imageUrl?: string; // Rich media card support
  images?: string[]; // Up to 2 base64 images, 1MB max each
  isBoosted?: boolean; // Emergency Boost Flag
  city?: string; // Geographic City tag for filtering separation
  address?: string; // Emergency or generalized address tag
  boostDetails?: {
    amountPaid: number;
    lastSeenLoc: GeoLocation;
    radiusKm: number;
    notifiedCount: number;
    ts: number;
  };
}

export enum SORT_TYPES {
  NEAREST = 'nearest',
  HIGHEST = 'highestRated',
  RECENT = 'recent',
  RECOMMENDED = 'recommended',
}

export interface JobPost {
  id: string;
  clinicId: string;
  clinicName: string;
  clinicEmail: string;
  title: string;
  jobType: 'Full-time' | 'Part-time' | 'Freelance' | 'Internship';
  location: string;
  salaryMin: number;
  salaryMax: number;
  experience: string;
  workingHours: string;
  genderPreference: 'No Preference' | 'Male' | 'Female';
  deadline: string;
  positions: number;
  status: 'open' | 'closed';
  screeningQuestions: string[];
  requiredDocuments: string[];
  minQualificationGate: 'none' | 'assistant' | 'doctor';
  createdAt: number;
  clinicAddress?: string;
  clinicWebsite?: string;
  clinicContactPhone?: string;
  clinicFacilities?: string;
}

export interface JobApplication {
  id: string;
  jobId: string;
  clinicId: string;
  clinicEmail?: string;
  applicantId: string;
  applicantName: string;
  applicantEmail: string;
  applicantPhone: string;
  applicantRole: UserRole;
  answers: string[];
  submittedDocs: {
    cvText?: string;
    degreeLinkOrText?: string;
    licenseNumber?: string;
    references?: string;
  };
  status: 'Pending' | 'Reviewed' | 'Shortlisted' | 'Rejected' | 'Hired';
  createdAt: number;
}

export interface VetNotification {
  id: string;
  userId: string;
  senderId: string;
  senderName: string;
  type: 'like' | 'comment' | 'apply' | 'status_change' | 'farm_assign' | 'farm_response' | 'farm_reminder' | 'appointment_booked' | 'appointment_action';
  targetId: string;
  targetType: 'post' | 'job' | 'application' | 'farm' | 'appointment';
  message: string;
  read: boolean;
  createdAt: number;
}

// ─────────────────────────────────────────────────────────────────
// LIVESTOCK MANAGEMENT TYPES
// ─────────────────────────────────────────────────────────────────

export interface FarmTeamMember {
  uid: string;
  name: string;
  email: string;
  role: 'Owner' | 'Manager' | 'Worker' | 'Veterinarian' | 'Assistant';
}

export type FarmType = 'Poultry Farm' | 'Dairy Farm' | 'Buffalo Farm' | 'Goat Farm' | 'Sheep Farm' | 'Mixed Farm';

export interface MixedFarmOptions {
  cattle: boolean;
  buffalo: boolean;
  goats: boolean;
  sheep: boolean;
  poultry: boolean;
}

export interface LivestockFarm {
  id: string;
  name: string;
  location: string;
  farmType: FarmType;
  mixedOptions?: MixedFarmOptions;
  ownerUid: string;
  ownerName: string;
  ownerEmail: string;
  managerUid?: string;       // Assigned Vet/Clinic UID
  managerName?: string;      // Assigned Vet/Clinic Name
  managerRole?: 'doctor' | 'clinic' | 'assistant';
  managerStatus: 'unassigned' | 'pending' | 'linked' | 'declined';
  managerDeclinedReason?: string;
  createdAt: number;
  team: FarmTeamMember[];
  memberUids?: string[];
}

export interface LivestockAnimal {
  id: string;
  farmId: string;
  animalId: string; // e.g. COW001, GOAT002
  species: 'Cattle' | 'Buffalo' | 'Goat' | 'Sheep' | 'Poultry' | 'Other';
  tagNumber?: string;
  gender: 'Male' | 'Female';
  dob?: string; // date string e.g. "2026-01-01"
  breed?: string;
  weight?: number; // weight in kg
  healthStatus: 'Healthy' | 'Sick' | 'Under Treatment' | 'Quarantined';
  entryType: 'individual';
  createdAt: number;
}

export interface LivestockBatch {
  id: string;
  farmId: string;
  batchName: string; // e.g. Broiler Batch #1
  species: 'Cattle' | 'Buffalo' | 'Goat' | 'Sheep' | 'Poultry' | 'Other';
  quantity: number;
  arrivalDate?: string; // e.g. "2026-06-01"
  breed?: string;
  entryType: 'batch';
  status: 'Active' | 'Sold' | 'Archived';
  createdAt: number;
}

export interface LivestockTask {
  id: string;
  farmId: string;
  targetId: string; // ID of animal or batch
  targetType: 'individual' | 'batch';
  targetName: string; // COW001 or "Broiler Batch #1"
  serviceType: string; // e.g., "Vaccination", "Booster Vaccination", "Pregnancy Diagnosis"
  dueDate: string; // "YYYY-MM-DD" style
  status: 'Pending' | 'Completed';
  completedDate?: string;
  vaccineUsed?: string;
  notes?: string;
  createdBy: 'system' | 'manual';
  completedByUid?: string;
  completedByName?: string;
  createdAt: number;
  autoScheduleNext?: boolean; // if true, completion schedules next booster in 6 months
}

export interface PromotionalAd {
  id: string;
  sponsorName: string;
  title: string;
  description: string;
  couponCode?: string;
  ctaText: string;
  ctaUrl: string;
  bgGradient: string;
  badge: string;
  icon?: string;
  ownerEmail: string;
  ownerUid: string;
  ownerRole: 'doctor' | 'clinic';
  pricePaid: number;
  durationDays: number;
  expiresAt: number; // millisecond timestamp
  createdAt: number; // millisecond timestamp
  status?: 'pending' | 'approved' | 'rejected';
  approved?: boolean;
  paymentMethod?: string;
  transactionId?: string;
}


// ─────────────────────────────────────────────────────────────────
// COMPREHENSIVE RECORDS TYPES
// ─────────────────────────────────────────────────────────────────

export interface HealthRecordEntry {
  id: string;
  date: string;
  disease: string;
  diagnosis: string;
  treatment: string;
  veterinarian: string;
}

export interface VaccineRecordEntry {
  id: string;
  date: string;
  vaccine: string;
  dose: string;
  nextDue: string;
}

export interface DewormingRecordEntry {
  id: string;
  date: string;
  drug: string;
  dose: string;
  route: string;
  nextDue: string;
}

export interface ParasiteRecordEntry {
  id: string;
  date: string;
  product: string;
  parasites: string;
  remarks: string;
}

export interface LaboratoryRecordEntry {
  id: string;
  date: string;
  test: string;
  result: string;
}

export interface SurgicalRecordEntry {
  id: string;
  date: string;
  procedure: string;
  surgeon: string;
  remarks: string;
}

export interface DailyMonitoringEntry {
  id: string;
  date: string;
  feed: string;
  water: string;
  temp: string;
  appetite: string;
  feces: string;
  urine: string;
  remarks: string;
}

export interface IndividualAnimalRecord {
  id: string;
  farmId: string;
  createdAt: number;
  healthStatus?: 'Healthy' | 'Sick' | 'Under Treatment' | 'Quarantined';
  
  // 1. Identification
  animalId: string;
  earTagNumber: string;
  name: string;
  species: string;
  breed: string;
  sex: 'Male' | 'Female' | '';
  colorMarkings: string;
  dob: string;
  age: string;
  source: string;
  purchaseDate: string;
  purchasePrice: number | null;
  
  // 2. Parentage
  sireId: string;
  damId: string;
  breedOfSire: string;
  breedOfDam: string;
  generation: string;
  
  // 3. Physical
  bodyWeight: number | null;
  bcs: string; 
  heightAtWithers: string;
  heartGirth: string;
  hornStatus: string;
  identificationMarks: string;
  
  // 4. Reproductive
  pubertyDate: string;
  estrusDates: string;
  serviceDate: string;
  aiOrNatural: string;
  bullOrBuckUsed: string;
  pregnancyDiagDate: string;
  expectedParturition: string;
  actualParturition: string;
  typeOfBirth: string;
  calvingDifficulty: string;
  placentaExpulsionTime: string;
  
  breedingSoundnessDate: string;
  semenEvaluation: string;
  breedingSeason: string;
  femalesServedCount: number | null;
  
  // 5. Offspring
  offspringId: string;
  offspringBirthDate: string;
  offspringSex: 'Male' | 'Female' | '';
  offspringBirthWeight: number | null;
  offspringWeaningWeight: number | null;
  offspringRemarks: string;
  
  // Logs & lists
  healthRecords: HealthRecordEntry[];
  vaccinationRecords: VaccineRecordEntry[];
  dewormingRecords: DewormingRecordEntry[];
  parasiteRecords: ParasiteRecordEntry[];
  
  // 10. Feeding Record
  feedingGroup: string;
  dailyConcentrate: string;
  greenFodder: string;
  dryFodder: string;
  mineralMixture: string;
  waterIntake: string;
  
  // 11. Production Record
  morningMilk: number | null;
  eveningMilk: number | null;
  totalMilk: number | null;
  bodyWeightMeat: number | null;
  adg: number | null;
  
  // 12. Breeding Performance
  servicesPerConception: number | null;
  ageAtFirstService: string;
  ageAtFirstParturition: string;
  calvingInterval: string;
  daysOpen: string;
  
  labRecords: LaboratoryRecordEntry[];
  surgicalRecords: SurgicalRecordEntry[];
  
  // 15. Mortality
  mortalityDate: string;
  mortalityReason: string;
  necropsyDetails: string;
  disposalMethod: string;
  
  // 16. Financial
  finPurchase: number | null;
  finFeed: number | null;
  finMedicine: number | null;
  finLabor: number | null;
  finMilkIncome: number | null;
  finSaleIncome: number | null;
  
  // 17. Notes
  notes: string;
  dailyMonitoring: DailyMonitoringEntry[];
}

export interface HerdInventory {
  adultMales: number;
  adultFemales: number;
  pregnantQty: number;
  lactatingQty: number;
  dryQty: number;
  youngQty: number;
  replacementQty: number;
  sickQty: number;
}

export interface ReproductiveSummary {
  exposed: number;
  conceived: number;
  conceptionRate: number;
  abortions: number;
  births: number;
  singles: number;
  twins: number;
  triplets: number;
  stillbirths: number;
  mortalityAtBirth: number;
}

export interface HerdMonthlyProduction {
  id: string;
  month: string;
  animalsMilked: number;
  totalMilkVolume: number;
  averageMilkPerDay: number;
  meatStartingWeight: number;
  meatEndingWeight: number;
  meatAdg: number;
}

export interface HerdFeedUsage {
  greenFodderDaily: number;
  dryFodderDaily: number;
  concentrateDaily: number;
  mineralDaily: number;
  saltDaily: number;
  greenFodderMonthlyCategory: number;
  dryFodderMonthlyCategory: number;
  concentrateMonthlyCategory: number;
  mineralMonthlyCategory: number;
  saltMonthlyCategory: number;
}

export interface HerdVaccinationRegisterEntry {
  id: string;
  date: string;
  vaccine: string;
  animalsCount: number;
  nextDue: string;
}

export interface HerdDewormingRegisterEntry {
  id: string;
  date: string;
  drug: string;
  animalsCount: number;
  nextDue: string;
}

export interface HerdDiseaseRegisterEntry {
  id: string;
  date: string;
  disease: string;
  affected: number;
  recovered: number;
  dead: number;
}

export interface HerdMortalityRegisterEntry {
  id: string;
  date: string;
  category: string;
  cause: string;
  count: number;
}

export interface HerdCullingRegisterEntry {
  id: string;
  date: string;
  reason: string;
  count: number;
}

export interface HerdFinancialSummary {
  expFeed: number;
  expMedicines: number;
  expLabor: number;
  expUtilities: number;
  expMiscellaneous: number;
  
  incMilk: number;
  incMeat: number;
  incSale: number;
  incManure: number;
  incOther: number;
}

export interface HerdKpiTargetActual {
  mortalityPctTarget: number;
  mortalityPctActual: number;
  conceptionPctTarget: number;
  conceptionPctActual: number;
  calvingPctTarget: number;
  calvingPctActual: number;
  adgTarget: number;
  adgActual: number;
  milkYieldTarget: number;
  milkYieldActual: number;
  fcrTarget: number;
  fcrActual: number;
}

export interface HerdLevelMasterRecord {
  id: string;
  farmId: string;
  createdAt: number;
  
  // 1. Identification
  farmName: string;
  farmManager: string;
  species: string;
  breeds: string;
  totalHerdSize: number;
  dateUpdated: string;
  
  // 2. Inventory
  inventory: HerdInventory;
  
  // 3. Reproductive
  reproductive: ReproductiveSummary;
  
  // 4. Monthly Production
  monthlyProduction: HerdMonthlyProduction[];
  
  // 5. Feed consumption
  feedUsage: HerdFeedUsage;
  
  // 6. Registers
  vaccinations: HerdVaccinationRegisterEntry[];
  dewormings: HerdDewormingRegisterEntry[];
  diseases: HerdDiseaseRegisterEntry[];
  mortalities: HerdMortalityRegisterEntry[];
  culled: HerdCullingRegisterEntry[];
  
  // 11. Growth monitoring
  gAvgBirthWeight: number | null;
  gAvgWeaningWeight: number | null;
  gAvgAdultWeight: number | null;
  
  // 12. Financial
  finances: HerdFinancialSummary;
  
  // 13. KPIs Dashboard
  kpis: HerdKpiTargetActual;
}




