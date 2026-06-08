export type UserRole = 'doctor' | 'clinic' | 'assistant' | 'user';

export function canUserReview(reviewerRole: UserRole, targetRole: UserRole): boolean {
  // 1. Roles as Doctors cant rate or give reviews doctors
  if (reviewerRole === 'doctor' && targetRole === 'doctor') {
    return false;
  }
  // 2. Roles as clinics cant rate or give reviews clinics
  if (reviewerRole === 'clinic' && targetRole === 'clinic') {
    return false;
  }
  // 3. Helpers (assistant) cant rate and give reviews to helpers (assistant)
  if (reviewerRole === 'assistant' && targetRole === 'assistant') {
    return false;
  }
  // 4. Helpers (assistant) can give rate and reviews to clinics and doctors
  if (reviewerRole === 'assistant' && (targetRole === 'clinic' || targetRole === 'doctor')) {
    return true;
  }
  // 5. Only General users can rate and give reviews to Clinics, doctors, and helpers
  if (reviewerRole === 'user') {
    return targetRole === 'clinic' || targetRole === 'doctor' || targetRole === 'assistant';
  }
  // 6. Clinics can rate or give reviews to doctors and helpers
  if (reviewerRole === 'clinic' && (targetRole === 'doctor' || targetRole === 'assistant')) {
    return true;
  }

  // Fallback / any other combination (e.g. doctors trying to rate non-doctors, etc.)
  return false;
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
  emailVerified?: boolean;
  avgRating?: number;
  totalReviews?: number;
  reviews?: Review[]; // For local schema backward compatibility
  isOnline?: boolean;
  lastSeen?: number; // timestamp in milliseconds
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
}

export interface CommunityPost {
  id: string;
  authorEmail: string;
  authorUid?: string; // High-precision unique ID representing Auth UID
  authorName: string;
  role: UserRole;
  profilePic: string;
  text: string;
  category: 'lost' | 'adoption' | 'help' | 'general';
  ts: number;
  reactions: {
    [key: string]: string[]; // maps '❤️' | '👍' | '❗' to array of user emails/UIDs
  };
  title?: string; // Professional posting titles
  imageUrl?: string; // Rich media card support
  images?: string[]; // Up to 2 base64 images, 1MB max each
  isBoosted?: boolean; // Emergency Boost Flag
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
  type: 'like' | 'comment' | 'apply' | 'status_change' | 'farm_assign' | 'farm_response' | 'farm_reminder';
  targetId: string;
  targetType: 'post' | 'job' | 'application' | 'farm';
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

