export type UserRole = 'doctor' | 'clinic' | 'assistant' | 'user' | 'vendor';

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
  offersHomeVisit?: boolean; // Doctors & Clinics can offer home visit / farm call services
  homeVisitCharges?: string; // Optional rate or coverage details (e.g. 'Available on-call / Doorstep vaccinations')
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

export interface VetAnswer {
  id: string;
  authorUid: string;
  authorEmail: string;
  authorName: string;
  authorRole: UserRole;
  profilePic?: string;
  subscriptionTier?: 'Silver' | 'Gold' | 'Platinum';
  text: string;
  ts: number;
  upvotes: string[]; // array of user UIDs or emails who upvoted this answer
}

export interface CommunityPost {
  id: string;
  authorEmail: string;
  authorUid?: string; // High-precision unique ID representing Auth UID
  authorName: string;
  role: UserRole;
  profilePic: string;
  text: string;
  category: 'lost' | 'adoption' | 'help' | 'general' | 'emergency' | 'ask_vet';
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
  answers?: VetAnswer[]; // Answers from verified Silver/Gold/Platinum practitioners
}

export enum SORT_TYPES {
  NEAREST = 'nearest',
  HIGHEST = 'highestRated',
  RECENT = 'recent',
  RECOMMENDED = 'recommended',
}

export interface JobPost {
  id: string;
  clinicId: string; // poster UID
  clinicName: string; // hiring entity / clinic / farm name
  clinicEmail: string;
  posterRole?: UserRole;
  employerType?: 'clinic' | 'farm' | 'individual' | 'hospital';
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
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  rejectedReason?: string;
  approvedAt?: number;
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
  type: 'like' | 'comment' | 'apply' | 'status_change' | 'appointment_booked' | 'appointment_action' | 'admin_broadcast';
  targetId: string;
  targetType: 'post' | 'job' | 'application' | 'appointment' | 'broadcast' | 'announcement';
  title?: string;
  message: string;
  read: boolean;
  createdAt: number;
  priority?: 'normal' | 'urgent' | 'high';
}

export interface AdminBroadcast {
  id: string;
  adminUid: string;
  adminName: string;
  adminEmail: string;
  title: string;
  message: string;
  category: 'announcement' | 'emergency' | 'maintenance' | 'update' | 'advisory';
  targetAudience: 'all' | UserRole;
  priority: 'normal' | 'urgent';
  recipientCount: number;
  sendInApp: boolean;
  sendBrowser: boolean;
  createdAt: number;
}

export interface PromotionalAd {
  id: string;
  sponsorName: string;
  title: string;
  description: string;
  couponCode?: string;
  ctaText: string;
  ctaUrl: string;
  ctaType?: 'whatsapp' | 'profile' | 'call' | 'custom';
  ownerPhone?: string;
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

export interface BlogArticle {
  id: string;
  title: string;
  slug: string;
  summary: string;
  content: string;
  imageUrl?: string;
  category: string;
  authorName: string;
  authorId: string;
  createdAt: number; // timestamp ms
  readTime: string;
  tags?: string[];
  views: number;
}

// ─────────────────────────────────────────────────────────────────
// MESSENGER TYPES
// ─────────────────────────────────────────────────────────────────
export type MessageStatus = 'sent' | 'delivered' | 'seen';

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderRole?: UserRole;
  senderPic?: string;
  receiverId: string;
  text: string;
  timestamp: number; // in milliseconds
  status: MessageStatus;
  createdAt: number;
}

export interface ConversationParticipant {
  uid: string;
  name: string;
  email?: string;
  role: UserRole;
  profilePic?: string;
  isOnline?: boolean;
  lastSeen?: number;
}

export interface Conversation {
  id: string;
  participantIds: string[];
  participants: Record<string, ConversationParticipant>;
  lastMessage?: string;
  lastMessageTime?: number;
  lastSenderId?: string;
  unreadCounts: Record<string, number>;
  createdAt: number;
  updatedAt: number;
}






