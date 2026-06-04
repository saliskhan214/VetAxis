export type UserRole = 'doctor' | 'clinic' | 'assistant' | 'user';

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
