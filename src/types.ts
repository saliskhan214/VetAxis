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
  isVerified?: boolean;
  emailVerified?: boolean;
  avgRating?: number;
  totalReviews?: number;
  reviews?: Review[]; // For local schema backward compatibility
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
  authorName: string;
  role: UserRole;
  profilePic: string;
  text: string;
  category: 'lost' | 'adoption' | 'help' | 'general';
  ts: number;
  reactions: {
    [key: string]: string[]; // maps '❤️' | '👍' | '❗' to array of user emails/UIDs
  };
}

export enum SORT_TYPES {
  NEAREST = 'nearest',
  HIGHEST = 'highestRated',
  RECENT = 'recent',
  RECOMMENDED = 'recommended',
}
