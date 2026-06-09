import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  getDocFromServer
} from 'firebase/firestore';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile as fbUpdateProfile,
  updatePassword as fbUpdatePassword,
  sendEmailVerification,
  signInWithPopup,
  GoogleAuthProvider,
  deleteUser as fbDeleteUser
} from 'firebase/auth';

import { db, auth, isFirebaseConfigured, handleFirestoreError, OperationType } from './firebase';
import { UserProfile, Review, Product, PetAd, CommunityPost, SORT_TYPES, GeoLocation, canUserReview, JobPost, JobApplication, VetNotification } from '../types';

// ─────────────────────────────────────────────────────────────────
// MOCK FALLBACK DATABASE ACTIONS (LocalStorage)
// ─────────────────────────────────────────────────────────────────
const LOCAL_USERS_KEY = 'va_users';
const LOCAL_SESSION_KEY = 'va_session';
const LOCAL_ACC_KEY = 'va_accessories';
const LOCAL_PETS_KEY = 'va_pet_ads';
const LOCAL_POSTS_KEY = 'va_community_posts';
const LOCAL_JOBS_KEY = 'va_job_posts';
const LOCAL_APPLICATIONS_KEY = 'va_job_applications';
const LOCAL_NOTIFICATIONS_KEY = 'va_notifications';

export function injectPresence(profile: UserProfile | null): UserProfile | null {
  if (!profile) return null;

  // Get active session UID
  let activeUid: string | null = null;
  try {
    const raw = localStorage.getItem(LOCAL_SESSION_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.uid) {
        activeUid = parsed.uid;
      }
    }
  } catch {}

  // If this profile is the logged-in user, they are truly online
  if (activeUid && activeUid === profile.uid) {
    profile.isOnline = true;
    profile.lastSeen = Date.now();
    return profile;
  }

  // Real presence calculation (active inside the last 5 minutes)
  const fiveMinutesMs = 5 * 60 * 1000;
  if (profile.lastSeen && (Date.now() - profile.lastSeen <= fiveMinutesMs) && profile.isOnline === true) {
    profile.isOnline = true;
  } else {
    profile.isOnline = false;
  }

  // If lastSeen is missing, set a stable fallback timestamp
  if (!profile.lastSeen) {
    const charSum = profile.uid.split('').reduce((sum: number, ch: string) => sum + ch.charCodeAt(0), 0);
    const hoursAgo = (charSum % 12) + 1;
    profile.lastSeen = Date.now() - (hoursAgo * 60 * 60 * 1000);
  }

  return profile;
}

function getLocalUsers(): UserProfile[] {
  try {
    const list = JSON.parse(localStorage.getItem(LOCAL_USERS_KEY) || '[]');
    return list.map((u: any) => injectPresence(injectTemporaryPlatinum(u)) as UserProfile);
  } catch {
    return [];
  }
}

function saveLocalUsers(list: UserProfile[]) {
  const mapped = list.map(u => injectPresence(injectTemporaryPlatinum(u)) as UserProfile);
  localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(mapped));
}

export function injectTemporaryPlatinum(user: UserProfile | null): UserProfile | null {
  if (user && user.email && user.email.toLowerCase().trim() === 'saliskhan214@gmail.com') {
    user.subscriptionTier = 'Gold';
    user.subscriptionExpiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000;
    user.isVerified = true;
  }
  return user;
}

export function getLocalSession(): UserProfile | null {
  try {
    const u = JSON.parse(localStorage.getItem(LOCAL_SESSION_KEY) || 'null');
    return injectPresence(injectTemporaryPlatinum(u));
  } catch {
    return null;
  }
}

function saveLocalSession(user: UserProfile | null) {
  const finalUser = injectPresence(injectTemporaryPlatinum(user));
  if (finalUser) {
    localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(finalUser));
  } else {
    localStorage.removeItem(LOCAL_SESSION_KEY);
  }
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

// Ensure first-time boot has some default demo professionals populated so the preview isn't blank
function populateInitialSeeds() {
  const users = getLocalUsers();
  if (users.length === 0) {
    const seeds: UserProfile[] = [
      {
        uid: 'seed_doc_1',
        name: 'Dr. Sarah Alizai',
        email: 'sarah.alizai@vetaxis.pk',
        phone: '03001234567',
        role: 'doctor',
        expertise: 'Feline Specialist, General Surgery',
        createdAt: Date.now() - 5 * 24 * 3600000,
        isVerified: true,
        avgRating: 4.8,
        totalReviews: 12,
        reviews: [
          {
            id: 'rev_1',
            reviewerEmail: 'user1@test.com',
            reviewerName: 'Ali Khan',
            reviewerRole: 'user',
            rating: 5,
            comment: 'Dr. Sarah saved my cat! She is extremely thorough and caring.',
            date: Date.now() - 2 * 24 * 3600000
          }
        ]
      },
      {
        uid: 'seed_doc_2',
        name: 'Dr. Faisal Shah',
        email: 'faisal.shah@vetaxis.pk',
        phone: '03217654321',
        role: 'doctor',
        expertise: 'Avian Medicine, Surgery & Orthopedics',
        createdAt: Date.now() - 15 * 24 * 3600000,
        isVerified: true,
        avgRating: 4.5,
        totalReviews: 6,
        reviews: []
      },
      {
        uid: 'seed_clinic_1',
        name: 'Peshawar Animal Hospital',
        email: 'peshawar.vet@clinic.pk',
        phone: '0915222222',
        role: 'clinic',
        facilities: 'Digital X-Ray, ICU, Laboratory, 24/7 Emergency',
        address: 'Khyber Road, Peshawar Cantonment',
        createdAt: Date.now() - 30 * 24 * 3600000,
        isVerified: true,
        location: {
          lat: 34.0151,
          lng: 71.5249,
          address: 'Khyber Road, Peshawar Cantonment'
        },
        avgRating: 4.9,
        totalReviews: 15,
        reviews: []
      },
      {
        uid: 'seed_assistant_1',
        name: 'Haris Qureshi',
        email: 'haris.q@vetaxis.pk',
        phone: '03339090901',
        role: 'assistant',
        expertise: 'Wound dressing, vaccination schedules, post-op care',
        createdAt: Date.now() - 2 * 24 * 3600000,
        isVerified: false,
        avgRating: 4.0,
        totalReviews: 2,
        reviews: []
      }
    ];
    saveLocalUsers(seeds);
  }

  // Seed default marketplace items
  if (!localStorage.getItem(LOCAL_ACC_KEY)) {
    const marketSeeds: Product[] = [
      {
        id: 'p_seed_1',
        name: 'Organic Anti-Flea Shampoo',
        price: 1250,
        quantity: 25,
        description: 'Clinically proven herbal anti-flea formula for kittens and dogs. Free from harsh chemicals.',
        whatsapp: '923001234567',
        ownerEmail: 'sarah.alizai@vetaxis.pk',
        ownerName: 'Dr. Sarah Alizai',
        ownerRole: 'doctor',
        createdAt: Date.now() - 1 * 24 * 3600000
      },
      {
        id: 'p_seed_2',
        name: 'Premium Calcium Tablets for Canines',
        price: 850,
        quantity: 50,
        description: 'Supports absolute bone density and joint strength. Specially formulated for retrievers and large breeds.',
        whatsapp: '923217654321',
        ownerEmail: 'faisal.shah@vetaxis.pk',
        ownerName: 'Dr. Faisal Shah',
        ownerRole: 'doctor',
        createdAt: Date.now() - 3 * 24 * 3600000
      }
    ];
    localStorage.setItem(LOCAL_ACC_KEY, JSON.stringify(marketSeeds));
  }

  // Seed default pet ads
  if (!localStorage.getItem(LOCAL_PETS_KEY)) {
    const petSeeds: PetAd[] = [
      {
        id: 'ad_seed_1',
        adType: 'adoption',
        petType: 'Cat',
        breed: 'Persian Crossbreed',
        age: 3,
        price: 0,
        description: 'Extremely playful kitten vaccinated and trained. Looking for a warm home.',
        location: 'Gulshan Iqbal, Karachi',
        whatsapp: '923001234567',
        ownerEmail: 'user1@test.com',
        ownerName: 'Ali Khan',
        ownerRole: 'user',
        createdAt: Date.now() - 2 * 24 * 3600000
      }
    ];
    localStorage.setItem(LOCAL_PETS_KEY, JSON.stringify(petSeeds));
  }

  // Seed community posts
  if (!localStorage.getItem(LOCAL_POSTS_KEY)) {
    const postSeeds: CommunityPost[] = [
      {
        id: 'post_seed_1',
        authorEmail: 'sarah.alizai@vetaxis.pk',
        authorName: 'Dr. Sarah Alizai',
        role: 'doctor',
        profilePic: 'default',
        text: 'Hello everyone! I noticed a sudden spike in ticks in Peshawar cantonment area due to early summer. Please check your dogs paws, ears, and belly after walks. Use standard fipronil protective drops if needed!',
        category: 'help',
        ts: Date.now() - 4 * 3600000,
        reactions: { '❤️': ['user1@test.com'], '👍': ['faisal.shah@vetaxis.pk'], '❗': [] }
      }
    ];
    localStorage.setItem(LOCAL_POSTS_KEY, JSON.stringify(postSeeds));
  }

  // Seed default job postings
  if (!localStorage.getItem(LOCAL_JOBS_KEY)) {
    const jobSeeds: JobPost[] = [
      {
        id: 'job_seed_1',
        clinicId: 'seed_clinic_1',
        clinicName: 'Peshawar Animal Hospital',
        clinicEmail: 'peshawar.vet@clinic.pk',
        title: 'Junior Veterinarian Surgery Specialist',
        jobType: 'Full-time',
        location: 'Khyber Road, Peshawar Cantonment',
        salaryMin: 85000,
        salaryMax: 130000,
        experience: '2+ years experience in soft tissue surgery or orthopedics.',
        workingHours: '9:00 AM - 6:00 PM, rotatory emergency support',
        genderPreference: 'No Preference',
        deadline: '2026-07-20',
        positions: 2,
        status: 'open',
        screeningQuestions: [
          'Do you have independent surgery experience?',
          'How many years of clinical veterinary practice do you have?'
        ],
        requiredDocuments: ['CV', 'Degree Certificate', 'License Number'],
        minQualificationGate: 'doctor',
        createdAt: Date.now() - 3 * 24 * 3600000
      },
      {
        id: 'job_seed_2',
        clinicId: 'seed_clinic_1',
        clinicName: 'Peshawar Animal Hospital',
        clinicEmail: 'peshawar.vet@clinic.pk',
        title: 'Vet Clinic Assistant & Dressing Helper',
        jobType: 'Part-time',
        location: 'Khyber Road, Peshawar Cantonment',
        salaryMin: 40000,
        salaryMax: 55000,
        experience: '1 year in hand-dressing, animal restraint, and basic hygiene care.',
        workingHours: '12:00 PM - 6:00 PM, weekends on call',
        genderPreference: 'No Preference',
        deadline: '2026-06-30',
        positions: 1,
        status: 'open',
        screeningQuestions: [
          'Are you comfortable handling aggressive canine/feline patients?',
          'Are you familiar with basic vaccination scheduled dose logs?'
        ],
        requiredDocuments: ['CV', 'Reference Contacts'],
        minQualificationGate: 'assistant',
        createdAt: Date.now() - 5 * 24 * 3600000
      }
    ];
    localStorage.setItem(LOCAL_JOBS_KEY, JSON.stringify(jobSeeds));
  }
}

// Execute seeds init on import to guarantee user isn't greeting an empty screen
populateInitialSeeds();

// ─────────────────────────────────────────────────────────────────
// AUTH ENGINE (Live Firebase or LocalStorage Fallback)
// ─────────────────────────────────────────────────────────────────
export const AuthService = {
  async signUp(email: string, password: string, name: string, phone: string, role: string, extra: any): Promise<UserProfile> {
    const emailLower = email.toLowerCase().trim();

    if (isFirebaseConfigured && auth && db) {
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, emailLower, password);
        const uid = userCredential.user.uid;

        // Create user document in Firestore users collection
        const profile: UserProfile = {
          uid,
          name: name.trim(),
          email: emailLower,
          phone: phone.trim() || undefined,
          role: role as any,
          expertise: extra.expertise || undefined,
          facilities: extra.facilities || undefined,
          address: extra.address || undefined,
          profilePic: 'default',
          createdAt: Date.now(),
          location: extra.location || null,
          isVerified: false,
          emailVerified: false
        };

        await setDoc(doc(db, 'users', uid), cleanUndefined(profile));
        await fbUpdateProfile(userCredential.user, { displayName: name });
        
        // Trigger verification email send (non-blocking so signup still succeeds)
        try {
          await sendEmailVerification(userCredential.user);
          console.log('[VetAxis] Verification email dispatched.');
        } catch (sendErr) {
          console.error('[VetAxis] Failed to dispatch verification email during signUp:', sendErr);
        }

        saveLocalSession(profile);
        return profile;
      } catch (err: any) {
        const msg = err?.message || String(err);
        if (msg.includes('operation-not-allowed')) {
          throw new Error("Email/Password registration is disabled in this limited Sandbox Firebase project. Please use \"Continue with Google\" to register. Google Sign-In supports ANY email provider (like Yahoo, Outlook, or corporate addresses) if they are registered as Google Accounts.");
        }
        throw new Error(msg || 'Registration failed.');
      }
    } else {
      // Local Fallback Sign Up
      const users = getLocalUsers();
      if (users.some(u => u.email === emailLower)) {
        throw new Error('An account with this email address already exists.');
      }

      const uid = 'usr_' + Date.now();
      const profile: UserProfile = {
        uid,
        name: name.trim(),
        email: emailLower,
        phone: phone.trim() || undefined,
        role: role as any,
        expertise: extra.expertise || undefined,
        facilities: extra.facilities || undefined,
        address: extra.address || undefined,
        profilePic: 'default',
        createdAt: Date.now(),
        location: extra.location || null,
        isVerified: false,
        emailVerified: false,
        reviews: []
      };

      // Also support mock password matching
      (profile as any)._password = password;

      users.push(profile);
      saveLocalUsers(users);
      saveLocalSession(profile);
      return profile;
    }
  },

  async signIn(email: string, password: string): Promise<UserProfile> {
    const emailLower = email.toLowerCase().trim();

    if (isFirebaseConfigured && auth && db) {
      try {
        const userCredential = await signInWithEmailAndPassword(auth, emailLower, password);
        const uid = userCredential.user.uid;

        // Fetch user doc from Firestore
        const userDoc = await getDoc(doc(db, 'users', uid));
        if (!userDoc.exists()) {
          throw new Error('User profile does not exist in Firestore. Please register again.');
        }

        const profile = userDoc.data() as UserProfile;
        saveLocalSession(profile);
        return profile;
      } catch (err: any) {
        const msg = err?.message || String(err);
        if (msg.includes('operation-not-allowed')) {
          throw new Error("Email/Password sign-in is disabled in this limited Sandbox Firebase project. Please use \"Continue with Google\" to sign in. Google Sign-In supports ANY email provider (like Yahoo, Outlook, or corporate addresses) if they are registered as Google Accounts.");
        }
        throw new Error(msg || 'Incorrect password or authentication error.');
      }
    } else {
      // Local Fallback Sign In
      const users = getLocalUsers();
      const user = users.find(u => u.email === emailLower);
      if (!user || (user as any)._password !== password) {
        throw new Error('Incorrect email address or password.');
      }

      saveLocalSession(user);
      return user;
    }
  },

  async signOut(): Promise<void> {
    if (isFirebaseConfigured && auth) {
      try {
        await signOut(auth);
      } catch (err) {
        console.error('Firebase signout error:', err);
      }
    }
    saveLocalSession(null);
  },

  async updateProfile(uid: string, fields: Partial<UserProfile>): Promise<UserProfile> {
    if (isFirebaseConfigured && db) {
      try {
        const userRef = doc(db, 'users', uid);
        await updateDoc(userRef, cleanUndefined(fields));
        
        // Fetch fresh copy
        const freshDoc = await getDoc(userRef);
        const freshProfile = freshDoc.data() as UserProfile;
        saveLocalSession(freshProfile);
        return freshProfile;
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${uid}`);
      }
    } else {
      // Local fallback
      const users = getLocalUsers();
      const idx = users.findIndex(u => u.uid === uid);
      if (idx !== -1) {
        users[idx] = { ...users[idx], ...fields };
        saveLocalUsers(users);
        saveLocalSession(users[idx]);
        return users[idx];
      }
      throw new Error('User not found.');
    }
  },

  async changePassword(newPw: string): Promise<void> {
    const session = getLocalSession();
    if (!session) throw new Error('No active login session.');

    if (isFirebaseConfigured && auth?.currentUser) {
      try {
        await fbUpdatePassword(auth.currentUser, newPw);
      } catch (err) {
        throw new Error(err instanceof Error ? err.message : 'Failed to change password. Retype credentials.');
      }
    } else {
      // Local fallback
      const users = getLocalUsers();
      const idx = users.findIndex(u => u.email === session.email);
      if (idx !== -1) {
        (users[idx] as any)._password = newPw;
        saveLocalUsers(users);
      }
    }
  },

  async resendVerification(): Promise<void> {
    if (isFirebaseConfigured && auth?.currentUser) {
      try {
        await sendEmailVerification(auth.currentUser);
      } catch (err: any) {
        throw new Error(err.message || 'Failed to resend verification email.');
      }
    } else {
      // Local fallback
      const session = getLocalSession();
      if (!session) throw new Error('No active login session.');
      console.log('Mocked resent verification email for', session.email);
    }
  },

  async reloadUser(): Promise<UserProfile> {
    const session = getLocalSession();
    if (!session) throw new Error('No active login session.');

    if (isFirebaseConfigured && auth?.currentUser) {
      try {
        await auth.currentUser.reload();
        const firebaseVerified = auth.currentUser.emailVerified;
        
        // Update both local session and Firestore document
        const freshProfile = { ...session, emailVerified: firebaseVerified };
        const userRef = doc(db, 'users', session.uid);
        await updateDoc(userRef, { emailVerified: firebaseVerified });
        
        saveLocalSession(freshProfile);
        return freshProfile;
      } catch (err: any) {
        throw new Error(err.message || 'Failed to reload user from Firebase.');
      }
    } else {
      // Local fallback - clicking reload/verify button instantly verifies in local mock mode
      const users = getLocalUsers();
      const idx = users.findIndex(u => u.uid === session.uid);
      if (idx !== -1) {
        users[idx].emailVerified = true;
        saveLocalUsers(users);
        saveLocalSession(users[idx]);
        return users[idx];
      }
      throw new Error('User not found.');
    }
  },

  async signInWithGoogle(roleForSignUp: string = 'user'): Promise<any> {
    if (isFirebaseConfigured && auth && db) {
      try {
        const provider = new GoogleAuthProvider();
        const userCredential = await signInWithPopup(auth, provider);
        const uid = userCredential.user.uid;
        const email = userCredential.user.email || '';
        const displayName = userCredential.user.displayName || 'Google User';
        const photoURL = userCredential.user.photoURL || 'default';

        // Check if user already exists in Firestore
        const userRef = doc(db, 'users', uid);
        const userDoc = await getDoc(userRef);

        if (userDoc.exists()) {
          // Returning user
          const profile = userDoc.data() as UserProfile;
          profile.emailVerified = userCredential.user.emailVerified;
          await updateDoc(userRef, { emailVerified: profile.emailVerified });
          saveLocalSession(profile);
          return { exists: true, profile };
        } else {
          // New Google Sign Up
          return {
            exists: false,
            pendingInfo: {
              uid,
              name: displayName,
              email: email.toLowerCase(),
              profilePic: photoURL,
              emailVerified: userCredential.user.emailVerified
            }
          };
        }
      } catch (err: any) {
        throw new Error(err.message || 'Google Sign-In failed.');
      }
    } else {
      // Local Fallback Mock
      const users = getLocalUsers();
      let profile = users.find(u => u.email === 'google@test.com');
      if (profile) {
        saveLocalSession(profile);
        return { exists: true, profile };
      } else {
        return {
          exists: false,
          pendingInfo: {
            uid: 'google_user_1',
            name: 'Google Dummy User',
            email: 'google@test.com',
            profilePic: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150',
            emailVerified: true
          }
        };
      }
    }
  },

  async registerGoogleUser(
    pendingInfo: { uid: string; name: string; email: string; profilePic: string; emailVerified: boolean },
    role: string,
    phone: string,
    extra: any
  ): Promise<UserProfile> {
    const profile: UserProfile = {
      uid: pendingInfo.uid,
      name: pendingInfo.name,
      email: pendingInfo.email,
      phone: phone.trim() || undefined,
      role: role as any,
      expertise: extra.expertise || undefined,
      facilities: extra.facilities || undefined,
      address: extra.address || undefined,
      profilePic: pendingInfo.profilePic,
      createdAt: Date.now(),
      isVerified: false,
      emailVerified: pendingInfo.emailVerified
    };

    if (isFirebaseConfigured && db) {
      await setDoc(doc(db, 'users', pendingInfo.uid), cleanUndefined(profile));
    } else {
      const users = getLocalUsers();
      users.push(profile);
      saveLocalUsers(users);
    }

    saveLocalSession(profile);
    return profile;
  },

  async validateUserProfile(uid: string): Promise<boolean> {
    if (isFirebaseConfigured && db) {
      try {
        const userRef = doc(db, 'users', uid);
        const userSnap = await getDoc(userRef);
        return userSnap.exists();
      } catch (err) {
        console.error("Failed to validate user profile:", err);
        // If error (network/permission), assume valid to prevent false positive logouts
        return true; 
      }
    } else {
      const users = getLocalUsers();
      return users.some(u => u.uid === uid);
    }
  },

  async deleteAccount(uid: string): Promise<void> {
    const session = getLocalSession();
    if (!session) throw new Error('No active login session.');
    const userEmail = session.email;

    if (isFirebaseConfigured && db) {
      try {
        // 1. Delete user profile doc
        await deleteDoc(doc(db, 'users', uid));

        // 2. Delete pet ads matching the user's email
        try {
          const adsQuery = query(collection(db, 'pet_ads'), where('ownerEmail', '==', userEmail));
          const adsSnap = await getDocs(adsQuery);
          for (const d of adsSnap.docs) {
            await deleteDoc(doc(db, 'pet_ads', d.id));
          }
        } catch (adErr) {
          console.error('Error deleting user ads during account erasure:', adErr);
        }

        // 3. Delete marketplace products matching the user's email
        try {
          const prodQuery = query(collection(db, 'marketplace_products'), where('ownerEmail', '==', userEmail));
          const prodSnap = await getDocs(prodQuery);
          for (const d of prodSnap.docs) {
            await deleteDoc(doc(db, 'marketplace_products', d.id));
          }
        } catch (prodErr) {
          console.error('Error deleting user products during account erasure:', prodErr);
        }

        // 4. Delete community posts matching the user's email
        try {
          const postQuery = query(collection(db, 'community_posts'), where('authorEmail', '==', userEmail));
          const postSnap = await getDocs(postQuery);
          for (const d of postSnap.docs) {
            await deleteDoc(doc(db, 'community_posts', d.id));
          }
        } catch (postErr) {
          console.error('Error deleting user community posts during account erasure:', postErr);
        }

        // 5. Delete from Firebase Auth if current user matches
        if (auth?.currentUser && auth.currentUser.uid === uid) {
          try {
            await fbDeleteUser(auth.currentUser);
          } catch (authErr: any) {
            console.error('Firebase Auth account delete failed:', authErr);
            // Sign out regardless so they are logged out
            await signOut(auth);
          }
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `users/${uid}`);
      }
    } else {
      // Local fallback
      // 1. Delete user from users storage
      const users = getLocalUsers();
      const filteredUsers = users.filter(u => u.uid !== uid);
      saveLocalUsers(filteredUsers);

      // 2. Delete ads
      const adsJson = localStorage.getItem(LOCAL_PETS_KEY);
      if (adsJson) {
        try {
          const ads = JSON.parse(adsJson) as PetAd[];
          const filteredAds = ads.filter(a => a.ownerEmail !== userEmail);
          localStorage.setItem(LOCAL_PETS_KEY, JSON.stringify(filteredAds));
        } catch (e) {
          console.error(e);
        }
      }

      // 3. Delete marketplace products
      const prodJson = localStorage.getItem(LOCAL_ACC_KEY);
      if (prodJson) {
        try {
          const prods = JSON.parse(prodJson) as Product[];
          const filteredProds = prods.filter(p => p.ownerEmail !== userEmail);
          localStorage.setItem(LOCAL_ACC_KEY, JSON.stringify(filteredProds));
        } catch (e) {
          console.error(e);
        }
      }

      // 4. Delete community posts
      const postsJson = localStorage.getItem(LOCAL_POSTS_KEY);
      if (postsJson) {
        try {
          const posts = JSON.parse(postsJson) as CommunityPost[];
          const filteredPosts = posts.filter(p => p.authorEmail !== userEmail);
          localStorage.setItem(LOCAL_POSTS_KEY, JSON.stringify(filteredPosts));
        } catch (e) {
          console.error(e);
        }
      }
    }

    // 6. Complete erasure from client session
    saveLocalSession(null);
  }
};

const SEED_EMAILS = new Set([
  'sarah.alizai@vetaxis.pk',
  'faisal.shah@vetaxis.pk',
  'peshawar.vet@clinic.pk',
  'haris.q@vetaxis.pk',
  'user1@test.com'
]);

class WildcardSet extends Set<string> {
  has(value: string): boolean {
    return true;
  }
}

async function getValidUserEmails(): Promise<Set<string>> {
  if (isFirebaseConfigured && db) {
    // In Firebase mode, we do not query the entire '/users' collection on client side
    // to search for emails (which breaks rules under PII security and leaks user details).
    // Any post, ad, or product is already guaranteed to be authored by a authenticated user on creation.
    return new WildcardSet();
  }
  const emails = new Set<string>(SEED_EMAILS);
  const users = getLocalUsers();
  users.forEach(u => {
    if (u.email) {
      emails.add(u.email.toLowerCase().trim());
    }
  });
  return emails;
}

// ─────────────────────────────────────────────────────────────────
// EXPLORE SERVICE (Sorting, Reviews, Geolocation distance haversine)
// ─────────────────────────────────────────────────────────────────
export const LocationService = {
  haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // earth radius in km
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
};

export const ExploreService = {
  async fetchProfessionals(role: 'doctor' | 'clinic' | 'assistant'): Promise<UserProfile[]> {
    const validEmails = await getValidUserEmails();
    if (isFirebaseConfigured && db) {
      try {
        const q = query(collection(db, 'users'), where('role', '==', role));
        const snapshots = await getDocs(q);
        const list: UserProfile[] = [];
        
        for (const userDoc of snapshots.docs) {
          const profile = userDoc.data() as UserProfile;
          // Subcollection reviews fetch
          const revSnap = await getDocs(collection(db, 'users', profile.uid, 'reviews'));
          const reviews = revSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Review[];
          
          const filteredReviews = reviews.filter(rev => {
            const email = (rev.reviewerEmail || '').toLowerCase().trim();
            return !email || validEmails.has(email);
          });
          profile.reviews = filteredReviews;
          
          // Recompute stats inline safely
          if (filteredReviews.length > 0) {
            const sum = filteredReviews.reduce((s, r) => s + r.rating, 0);
            profile.avgRating = parseFloat((sum / filteredReviews.length).toFixed(1));
            profile.totalReviews = filteredReviews.length;
          } else {
            profile.avgRating = 0;
            profile.totalReviews = 0;
          }
          list.push(injectPresence(injectTemporaryPlatinum(profile)) as UserProfile);
        }
        return list;
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, 'users');
      }
    } else {
      // Local Fallback list
      const users = getLocalUsers();
      return users.filter(u => u.role === role).map(u => {
        const reviews = u.reviews || [];
        const filteredReviews = reviews.filter(rev => {
          const email = (rev.reviewerEmail || '').toLowerCase().trim();
          return !email || validEmails.has(email);
        });
        u.reviews = filteredReviews;
        if (filteredReviews.length > 0) {
          const sum = filteredReviews.reduce((acc, r) => acc + r.rating, 0);
          u.avgRating = parseFloat((sum / filteredReviews.length).toFixed(1));
          u.totalReviews = filteredReviews.length;
        } else {
          u.avgRating = 0;
          u.totalReviews = 0;
        }
        return injectPresence(injectTemporaryPlatinum(u)) as UserProfile;
      });
    }
  },

  sortUsers(list: UserProfile[], sortType: SORT_TYPES, userLoc: GeoLocation | null): UserProfile[] {
    const listCopy = [...list];

    const getTierOrder = (p: UserProfile) => {
      if (p.subscriptionTier === 'Platinum') return 3;
      if (p.subscriptionTier === 'Gold') return 2;
      if (p.subscriptionTier === 'Silver') return 1;
      return 0;
    };

    switch (sortType) {
      case SORT_TYPES.HIGHEST:
        return listCopy.sort((a, b) => {
          const tierDiff = getTierOrder(b) - getTierOrder(a);
          if (tierDiff !== 0) return tierDiff;
          return (b.avgRating || 0) - (a.avgRating || 0);
        });
      case SORT_TYPES.RECENT:
        return listCopy.sort((a, b) => {
          const tierDiff = getTierOrder(b) - getTierOrder(a);
          if (tierDiff !== 0) return tierDiff;
          return (b.createdAt || 0) - (a.createdAt || 0);
        });
      case SORT_TYPES.NEAREST: {
        return listCopy.sort((a, b) => {
          const tierDiff = getTierOrder(b) - getTierOrder(a);
          if (tierDiff !== 0) return tierDiff;
          if (!userLoc) return (b.avgRating || 0) - (a.avgRating || 0);
          const distA = a.location?.lat ? LocationService.haversine(userLoc.lat, userLoc.lng, a.location.lat, a.location.lng) : 99999;
          const distB = b.location?.lat ? LocationService.haversine(userLoc.lat, userLoc.lng, b.location.lat, b.location.lng) : 99999;
          return distA - distB;
        });
      }
      case SORT_TYPES.RECOMMENDED: {
        return listCopy.sort((a, b) => {
          const tierDiff = getTierOrder(b) - getTierOrder(a);
          if (tierDiff !== 0) return tierDiff;
          const score = (p: UserProfile) => {
            const rScore = (p.avgRating || 0) * 10;
            let dScore = 0;
            if (userLoc && p.location?.lat) {
              const km = LocationService.haversine(userLoc.lat, userLoc.lng, p.location.lat, p.location.lng);
              dScore = -(km * 1.5);
            }
            const isRecent = Date.now() - p.createdAt < 30 * 24 * 3600000 ? 5 : 0;
            return rScore + dScore + isRecent;
          };
          return score(b) - score(a);
        });
      }
      default:
        return listCopy;
    }
  },

  async addReview(targetUid: string, rating: number, comment: string, reviewer: UserProfile): Promise<Review[]> {
    const newReview: Review = {
      id: 'rev_' + Date.now(),
      reviewerEmail: reviewer.email,
      reviewerName: reviewer.name,
      reviewerRole: reviewer.role,
      rating,
      comment: comment.trim(),
      date: Date.now()
    };

    if (isFirebaseConfigured && db) {
      try {
        const targetDoc = await getDoc(doc(db, 'users', targetUid));
        const targetData = targetDoc.data() as UserProfile | undefined;
        if (!targetData) {
          throw new Error('Target profile not found.');
        }
        if (!canUserReview(reviewer.role, targetData.role)) {
          throw new Error('You do not have permission to rate or review this role.');
        }

        const reviewColRef = collection(db, 'users', targetUid, 'reviews');
        // Check for duplicates/existing review from same author
        const authorQ = query(reviewColRef, where('reviewerEmail', '==', reviewer.email));
        const existingDocs = await getDocs(authorQ);
        if (existingDocs.docs.length > 0) {
          // Overwrite/Update existing review
          const docId = existingDocs.docs[0].id;
          await setDoc(doc(db, 'users', targetUid, 'reviews', docId), newReview);
        } else {
          // Add new
          await addDoc(reviewColRef, newReview);
        }

        // Return full review list
        const snapshot = await getDocs(reviewColRef);
        const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Review[];

        // Re-write total stats on user profile document atomically
        const sum = list.reduce((s, r) => s + r.rating, 0);
        const avg = parseFloat((sum / list.length).toFixed(1));
        await updateDoc(doc(db, 'users', targetUid), { avgRating: avg, totalReviews: list.length });

        return list;
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `users/${targetUid}/reviews`);
      }
    } else {
      // Local fallback reviews
      const users = getLocalUsers();
      const idx = users.findIndex(u => u.uid === targetUid);
      if (idx !== -1) {
        const target = users[idx];
        if (!canUserReview(reviewer.role, target.role)) {
          throw new Error('You do not have permission to rate or review this role.');
        }
        if (!users[idx].reviews) users[idx].reviews = [];
        
        // Remove existing review from same reviewer if present
        users[idx].reviews = (users[idx].reviews || []).filter(r => r.reviewerEmail !== reviewer.email);
        users[idx].reviews?.push(newReview);

        const list = users[idx].reviews || [];
        const sum = list.reduce((s, r) => s + r.rating, 0);
        users[idx].avgRating = parseFloat((sum / list.length).toFixed(1));
        users[idx].totalReviews = list.length;

        saveLocalUsers(users);
        return list;
      }
      throw new Error('Clinician not found.');
    }
  }
};

// ─────────────────────────────────────────────────────────────────
// COMMUNITY POSTS SERVICE
// ─────────────────────────────────────────────────────────────────
export const CommunityService = {
  async fetchPosts(): Promise<CommunityPost[]> {
    let list: CommunityPost[] = [];
    if (isFirebaseConfigured && db) {
      try {
        const q = query(collection(db, 'community_posts'), orderBy('ts', 'desc'));
        const snapshot = await getDocs(q);
        list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as CommunityPost[];
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, 'community_posts');
      }
    } else {
      try {
        list = JSON.parse(localStorage.getItem(LOCAL_POSTS_KEY) || '[]');
      } catch {
        list = [];
      }
    }
    const validEmails = await getValidUserEmails();
    return list.filter(post => {
      const email = (post.authorEmail || '').toLowerCase().trim();
      return !email || validEmails.has(email);
    });
  },

  async createPost(
    text: string,
    category: any,
    author: UserProfile,
    title?: string,
    imageUrl?: string,
    isBoosted?: boolean,
    boostDetails?: {
      amountPaid: number;
      lastSeenLoc: GeoLocation;
      radiusKm: number;
      notifiedCount: number;
      ts: number;
    },
    images?: string[]
  ): Promise<CommunityPost> {
    const post: CommunityPost = {
      id: 'post_' + Date.now(),
      authorEmail: (author.email || '').toLowerCase().trim(),
      authorUid: author.uid,
      authorName: author.name,
      role: author.role,
      profilePic: author.profilePic || 'default',
      text: text.trim(),
      category,
      ts: Date.now(),
      reactions: { '❤️': [], '👍': [], '❗': [] },
      title: title?.trim() || undefined,
      imageUrl: imageUrl?.trim() || undefined,
      images: images || undefined,
      isBoosted: isBoosted || undefined,
      boostDetails: boostDetails || undefined
    };

    if (isFirebaseConfigured && db) {
      try {
        if (isBoosted && boostDetails) {
          // Find nearby users and send notifications in database
          let nearbyCount = 0;
          const usersSnap = await getDocs(collection(db, 'users'));
          const allUsers = usersSnap.docs.map(d => ({ uid: d.id, ...d.data() })) as UserProfile[];

          for (const user of allUsers) {
            if (user.uid === author.uid) continue;
            if (user.location && user.location.lat && user.location.lng) {
              const distance = LocationService.haversine(
                boostDetails.lastSeenLoc.lat,
                boostDetails.lastSeenLoc.lng,
                user.location.lat,
                user.location.lng
              );
              if (distance <= boostDetails.radiusKm) {
                nearbyCount++;
                const notifId = 'notif_boost_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
                const notif: Partial<VetNotification> = {
                  id: notifId,
                  userId: user.uid,
                  senderId: author.uid,
                  senderName: author.name,
                  type: 'status_change',
                  targetId: post.id,
                  targetType: 'post',
                  message: `📢 PRIORITY RECOUP ALERT [${distance.toFixed(1)} km away]: Priority Lost Pet broadcast near ${boostDetails.lastSeenLoc.address}! Please double-check surrounding areas.`,
                  read: false,
                  createdAt: Date.now()
                };
                await setDoc(doc(db, 'notifications', notifId), notif);
              }
            }
          }
          post.boostDetails!.notifiedCount = nearbyCount;
        }

        // Enforce exact structure rules requirement on creation
        await setDoc(doc(db, 'community_posts', post.id), cleanUndefined(post));
        return post;
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, 'community_posts');
      }
    } else {
      if (isBoosted && boostDetails) {
        // Offline notifications logic
        const allUsers = getLocalUsers();
        let nearbyCount = 0;
        for (const user of allUsers) {
          if (user.uid === author.uid) continue;
          if (user.location && user.location.lat && user.location.lng) {
            const distance = LocationService.haversine(
              boostDetails.lastSeenLoc.lat,
              boostDetails.lastSeenLoc.lng,
              user.location.lat,
              user.location.lng
            );
            if (distance <= boostDetails.radiusKm) {
              nearbyCount++;
              const localNotifs = JSON.parse(localStorage.getItem(LOCAL_NOTIFICATIONS_KEY) || '[]');
              localNotifs.unshift({
                id: 'notif_boost_' + Date.now() + '_' + Math.floor(Math.random() * 10000),
                userId: user.uid,
                senderId: author.uid,
                senderName: author.name,
                type: 'status_change',
                targetId: post.id,
                targetType: 'post',
                message: `📢 PRIORITY RECOUP ALERT [${distance.toFixed(1)} km away]: Priority Lost Pet broadcast near ${boostDetails.lastSeenLoc.address}! Please double-check surrounding areas.`,
                read: false,
                createdAt: Date.now()
              });
              localStorage.setItem(LOCAL_NOTIFICATIONS_KEY, JSON.stringify(localNotifs));
            }
          }
        }
        post.boostDetails!.notifiedCount = nearbyCount;
      }
      const posts = await this.fetchPosts();
      posts.unshift(post);
      localStorage.setItem(LOCAL_POSTS_KEY, JSON.stringify(posts));
      return post;
    }
    return post;
  },

  async boostPost(postId: string, amount: number, lastSeenLoc: GeoLocation, radiusKm: number, currentUser: UserProfile): Promise<CommunityPost> {
    let updatedPost: CommunityPost | null = null;
    if (isFirebaseConfigured && db) {
      try {
        const docRef = doc(db, 'community_posts', postId);
        const snap = await getDoc(docRef);
        if (!snap.exists()) throw new Error('Post not found in database.');
        const post = snap.data() as CommunityPost;

        post.isBoosted = true;
        post.boostDetails = {
          amountPaid: amount,
          lastSeenLoc: lastSeenLoc,
          radiusKm: radiusKm,
          notifiedCount: 0,
          ts: Date.now()
        };

        // Find nearby users
        let nearbyCount = 0;
        const usersSnap = await getDocs(collection(db, 'users'));
        const allUsers = usersSnap.docs.map(d => ({ uid: d.id, ...d.data() })) as UserProfile[];

        for (const user of allUsers) {
          if (user.uid === currentUser.uid) continue; // skip self
          if (user.location && user.location.lat && user.location.lng) {
            const distance = LocationService.haversine(
              lastSeenLoc.lat,
              lastSeenLoc.lng,
              user.location.lat,
              user.location.lng
            );

            if (distance <= radiusKm) {
              nearbyCount++;
              // Create notification
              const notifId = 'notif_boost_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
              const notif: Partial<VetNotification> = {
                id: notifId,
                userId: user.uid,
                senderId: currentUser.uid,
                senderName: currentUser.name,
                type: 'status_change', // triggers a prominent popup animation
                targetId: postId,
                targetType: 'post',
                message: `📢 PRIORITY RECOUP ALERT [${distance.toFixed(1)} km away]: Priority Lost Pet broadcast near ${lastSeenLoc.address}! Please double-check surrounding areas.`,
                read: false,
                createdAt: Date.now()
              };
              await setDoc(doc(db, 'notifications', notifId), notif);
            }
          }
        }

        post.boostDetails.notifiedCount = nearbyCount;
        await setDoc(docRef, cleanUndefined(post));
        updatedPost = post;
      } catch (err: any) {
        handleFirestoreError(err, OperationType.UPDATE, `community_posts/${postId}`);
      }
    } else {
      // Offline Local Storage fallback
      const posts = await this.fetchPosts();
      const idx = posts.findIndex(p => p.id === postId);
      if (idx !== -1) {
        posts[idx].isBoosted = true;
        const allUsers = getLocalUsers();
        let nearbyCount = 0;

        for (const user of allUsers) {
          if (user.uid === currentUser.uid) continue;
          if (user.location && user.location.lat && user.location.lng) {
            const distance = LocationService.haversine(
              lastSeenLoc.lat,
              lastSeenLoc.lng,
              user.location.lat,
              user.location.lng
            );
            if (distance <= radiusKm) {
              nearbyCount++;
              // Add a local notification
              const localNotifs = JSON.parse(localStorage.getItem(LOCAL_NOTIFICATIONS_KEY) || '[]');
              localNotifs.unshift({
                id: 'notif_boost_' + Date.now() + '_' + Math.floor(Math.random() * 10000),
                userId: user.uid,
                senderId: currentUser.uid,
                senderName: currentUser.name,
                type: 'status_change',
                targetId: postId,
                targetType: 'post',
                message: `📢 PRIORITY RECOUP ALERT [${distance.toFixed(1)} km away]: Priority Lost Pet broadcast near ${lastSeenLoc.address}! Please double-check surrounding areas.`,
                read: false,
                createdAt: Date.now()
              });
              localStorage.setItem(LOCAL_NOTIFICATIONS_KEY, JSON.stringify(localNotifs));
            }
          }
        }

        posts[idx].boostDetails = {
          amountPaid: amount,
          lastSeenLoc,
          radiusKm,
          notifiedCount: nearbyCount,
          ts: Date.now()
        };
        localStorage.setItem(LOCAL_POSTS_KEY, JSON.stringify(posts));
        updatedPost = posts[idx];
      }
    }
    
    // Fallback if update fails
    if (!updatedPost) {
      throw new Error('Failed to boost post.');
    }
    return updatedPost;
  },

  async toggleReaction(postId: string, emoji: string, userEmail: string): Promise<CommunityPost> {
    if (isFirebaseConfigured && db) {
      try {
        const docRef = doc(db, 'community_posts', postId);
        const postSnap = await getDoc(docRef);
        if (!postSnap.exists()) throw new Error('Post not found in database.');
        
        const post = postSnap.data() as CommunityPost;
        const index = (post.reactions[emoji] || []).indexOf(userEmail);
        if (index === -1) {
          post.reactions[emoji] = [...(post.reactions[emoji] || []), userEmail];
        } else {
          post.reactions[emoji] = (post.reactions[emoji] || []).filter(email => email !== userEmail);
        }

        await updateDoc(docRef, { reactions: post.reactions });
        return { ...post, id: postId };
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `community_posts/${postId}`);
      }
    } else {
      const posts = await this.fetchPosts();
      const idx = posts.findIndex(p => p.id === postId);
      if (idx !== -1) {
        const reactions = posts[idx].reactions || { '❤️': [], '👍': [], '❗': [] };
        if (!reactions[emoji]) reactions[emoji] = [];
        const index = reactions[emoji].indexOf(userEmail);
        if (index === -1) {
          reactions[emoji].push(userEmail);
        } else {
          reactions[emoji] = reactions[emoji].filter(email => email !== userEmail);
        }
        posts[idx].reactions = reactions;
        localStorage.setItem(LOCAL_POSTS_KEY, JSON.stringify(posts));
        return posts[idx];
      }
      throw new Error('Post not found.');
    }
  },

  async deletePost(postId: string): Promise<void> {
    if (isFirebaseConfigured && db) {
      try {
        await deleteDoc(doc(db, 'community_posts', postId));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `community_posts/${postId}`);
      }
    } else {
      const posts = await this.fetchPosts();
      const filtered = posts.filter(p => p.id !== postId);
      localStorage.setItem(LOCAL_POSTS_KEY, JSON.stringify(filtered));
    }
  }
};

// ─────────────────────────────────────────────────────────────────
// PET ADS SERVICE
// ─────────────────────────────────────────────────────────────────
export const PetAdsService = {
  async fetchAds(): Promise<PetAd[]> {
    let list: PetAd[] = [];
    if (isFirebaseConfigured && db) {
      try {
        const snapshot = await getDocs(query(collection(db, 'pet_ads'), orderBy('createdAt', 'desc')));
        list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as PetAd[];
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, 'pet_ads');
      }
    } else {
      try {
        list = JSON.parse(localStorage.getItem(LOCAL_PETS_KEY) || '[]');
      } catch {
        list = [];
      }
    }

    // Background async auto cleanup expired ads
    setTimeout(() => {
      this.autoCleanupAds().catch(e => console.error('Auto cleanup ads error:', e));
    }, 100);

    const validEmails = await getValidUserEmails();
    return list.filter(ad => {
      const email = (ad.ownerEmail || '').toLowerCase().trim();
      return !email || validEmails.has(email);
    });
  },

  async autoCleanupAds(): Promise<void> {
    let list: PetAd[] = [];
    if (isFirebaseConfigured && db) {
      try {
        const snapshot = await getDocs(collection(db, 'pet_ads'));
        list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as PetAd[];
      } catch (err) {
        console.error('Failed to fetch ads for cleanup:', err);
        return;
      }
    } else {
      try {
        list = JSON.parse(localStorage.getItem(LOCAL_PETS_KEY) || '[]');
      } catch {
        list = [];
      }
    }

    const now = Date.now();
    for (const ad of list) {
      // Determine if premium
      const isPremium = ad.isPremium || (ad.ownerRole === 'clinic' || ad.ownerRole === 'doctor');
      const maxAge = isPremium ? 90 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000;
      if (now - ad.createdAt > maxAge) {
        // Expired! Delete it
        console.log(`Auto-cleaning expired ad: ${ad.id} (${ad.petType}) - premium: ${isPremium}`);
        await this.deleteAd(ad.id);

        // Notify the user
        try {
          const ownerProfile = await NotificationService.findUserByEmail(ad.ownerEmail);
          if (ownerProfile) {
            await NotificationService.createNotification({
              userId: ownerProfile.uid,
              senderId: 'system',
              senderName: 'System Moderator',
              type: 'status_change',
              targetId: ad.id,
              targetType: 'post',
              message: `Your classified ad listing for "${ad.petType} - ${ad.breed || ''}" has expired and was auto-removed after ${isPremium ? 90 : 30} days.`,
              read: false,
              createdAt: Date.now()
            });
          }
        } catch (notifErr) {
          console.error(`Failed to send ad expiry notification to ${ad.ownerEmail}:`, notifErr);
        }
      }
    }
  },

  async createAd(adData: Partial<PetAd>, owner: UserProfile): Promise<PetAd> {
    const isOwnerPremium = owner.subscriptionTier === 'Silver' || owner.subscriptionTier === 'Gold' || owner.subscriptionTier === 'Platinum';
    const ad: PetAd = {
      id: 'ad_' + Date.now(),
      adType: adData.adType || 'adoption',
      petType: adData.petType || 'Other',
      breed: adData.breed || 'Not specified',
      age: adData.age !== undefined ? adData.age : null,
      price: adData.price || 0,
      description: adData.description || '',
      location: adData.location || '',
      whatsapp: adData.whatsapp || '',
      image: adData.image || '',
      ownerEmail: owner.email,
      ownerName: owner.name,
      ownerRole: owner.role,
      createdAt: Date.now(),
      isPremium: isOwnerPremium
    };

    if (isFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, 'pet_ads', ad.id), cleanUndefined(ad));
        return ad;
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `pet_ads/${ad.id}`);
      }
    } else {
      const ads = await this.fetchAds();
      ads.unshift(ad);
      localStorage.setItem(LOCAL_PETS_KEY, JSON.stringify(ads));
      return ad;
    }
  },

  async deleteAd(adId: string): Promise<void> {
    if (isFirebaseConfigured && db) {
      try {
        await deleteDoc(doc(db, 'pet_ads', adId));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `pet_ads/${adId}`);
      }
    } else {
      const ads = await JSON.parse(localStorage.getItem(LOCAL_PETS_KEY) || '[]');
      const filtered = ads.filter((a: any) => a.id !== adId);
      localStorage.setItem(LOCAL_PETS_KEY, JSON.stringify(filtered));
    }
  }
};

// ─────────────────────────────────────────────────────────────────
// MARKETPLACE PRODUCT SERVICE
// ─────────────────────────────────────────────────────────────────
export const MarketplaceService = {
  async fetchProducts(): Promise<Product[]> {
    let list: Product[] = [];
    if (isFirebaseConfigured && db) {
      try {
        const snapshot = await getDocs(query(collection(db, 'marketplace_products'), orderBy('createdAt', 'desc')));
        list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Product[];
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, 'marketplace_products');
      }
    } else {
      try {
        list = JSON.parse(localStorage.getItem(LOCAL_ACC_KEY) || '[]');
      } catch {
        list = [];
      }
    }

    // Background async auto cleanup expired products
    setTimeout(() => {
      this.autoCleanupProducts().catch(e => console.error('Auto cleanup products error:', e));
    }, 100);

    const validEmails = await getValidUserEmails();
    return list.filter(p => {
      const email = (p.ownerEmail || '').toLowerCase().trim();
      return !email || validEmails.has(email);
    });
  },

  async autoCleanupProducts(): Promise<void> {
    let list: Product[] = [];
    if (isFirebaseConfigured && db) {
      try {
        const snapshot = await getDocs(collection(db, 'marketplace_products'));
        list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Product[];
      } catch (err) {
        console.error('Failed to fetch products for cleanup:', err);
        return;
      }
    } else {
      try {
        list = JSON.parse(localStorage.getItem(LOCAL_ACC_KEY) || '[]');
      } catch {
        list = [];
      }
    }

    const now = Date.now();
    for (const p of list) {
      const isPremium = p.isPremium || (p.ownerRole === 'clinic' || p.ownerRole === 'doctor');
      const maxAge = isPremium ? 90 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000;
      if (now - p.createdAt > maxAge) {
        console.log(`Auto-cleaning expired product: ${p.id} (${p.name}) - premium: ${isPremium}`);
        await this.deleteProduct(p.id);

        // Notify the user
        try {
          const ownerProfile = await NotificationService.findUserByEmail(p.ownerEmail);
          if (ownerProfile) {
            await NotificationService.createNotification({
              userId: ownerProfile.uid,
              senderId: 'system',
              senderName: 'System Moderator',
              type: 'status_change',
              targetId: p.id,
              targetType: 'post',
              message: `Your product listing for "${p.name}" has expired and was auto-removed after ${isPremium ? 90 : 30} days.`,
              read: false,
              createdAt: Date.now()
            });
          }
        } catch (notifErr) {
          console.error(`Failed to send product expiry notification to ${p.ownerEmail}:`, notifErr);
        }
      }
    }
  },

  async createProduct(prodData: Partial<Product>, owner: UserProfile): Promise<Product> {
    const isOwnerPremium = owner.subscriptionTier === 'Silver' || owner.subscriptionTier === 'Gold' || owner.subscriptionTier === 'Platinum';
    const product: Product = {
      id: 'p_' + Date.now(),
      name: prodData.name || '',
      price: prodData.price || 0,
      quantity: prodData.quantity || 1,
      description: prodData.description || '',
      whatsapp: prodData.whatsapp || '',
      image: prodData.image || '',
      ownerEmail: owner.email,
      ownerName: owner.name,
      ownerRole: owner.role,
      createdAt: Date.now(),
      isPremium: isOwnerPremium
    };

    if (isFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, 'marketplace_products', product.id), cleanUndefined(product));
        return product;
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `marketplace_products/${product.id}`);
      }
    } else {
      const products = await this.fetchProducts();
      products.unshift(product);
      localStorage.setItem(LOCAL_ACC_KEY, JSON.stringify(products));
      return product;
    }
  },

  async deleteProduct(productId: string): Promise<void> {
    if (isFirebaseConfigured && db) {
      try {
        await deleteDoc(doc(db, 'marketplace_products', productId));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `marketplace_products/${productId}`);
      }
    } else {
      const products = await JSON.parse(localStorage.getItem(LOCAL_ACC_KEY) || '[]');
      const filtered = products.filter((p: any) => p.id !== productId);
      localStorage.setItem(LOCAL_ACC_KEY, JSON.stringify(filtered));
    }
  }
};

export const JobBoardService = {
  async fetchJobs(): Promise<JobPost[]> {
    let list: JobPost[] = [];
    if (isFirebaseConfigured && db) {
      try {
        const snapshot = await getDocs(query(collection(db, 'job_posts'), orderBy('createdAt', 'desc')));
        list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as JobPost[];
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, 'job_posts');
      }
    } else {
      try {
        list = JSON.parse(localStorage.getItem(LOCAL_JOBS_KEY) || '[]');
      } catch {
        list = [];
      }
    }
    return list;
  },

  async createJob(jobData: Partial<JobPost>, clinic: UserProfile): Promise<JobPost> {
    const job: JobPost = {
      id: 'job_' + Date.now(),
      clinicId: clinic.uid,
      clinicName: clinic.name,
      clinicEmail: clinic.email,
      title: jobData.title || '',
      jobType: jobData.jobType || 'Full-time',
      location: jobData.location || '',
      salaryMin: jobData.salaryMin || 0,
      salaryMax: jobData.salaryMax || 0,
      experience: jobData.experience || '',
      workingHours: jobData.workingHours || '',
      genderPreference: jobData.genderPreference || 'No Preference',
      deadline: jobData.deadline || '',
      positions: jobData.positions || 1,
      status: 'open',
      screeningQuestions: jobData.screeningQuestions || [],
      requiredDocuments: jobData.requiredDocuments || [],
      minQualificationGate: jobData.minQualificationGate || 'none',
      createdAt: Date.now(),
      clinicAddress: jobData.clinicAddress || '',
      clinicWebsite: jobData.clinicWebsite || '',
      clinicContactPhone: jobData.clinicContactPhone || '',
      clinicFacilities: jobData.clinicFacilities || ''
    };

    if (isFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, 'job_posts', job.id), cleanUndefined(job));
        return job;
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `job_posts/${job.id}`);
      }
    } else {
      const jobs = await this.fetchJobs();
      jobs.unshift(job);
      localStorage.setItem(LOCAL_JOBS_KEY, JSON.stringify(jobs));
      return job;
    }
  },

  async updateJob(jobId: string, updatedData: Partial<JobPost>): Promise<void> {
    if (isFirebaseConfigured && db) {
      try {
        await updateDoc(doc(db, 'job_posts', jobId), cleanUndefined(updatedData));
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `job_posts/${jobId}`);
      }
    } else {
      const jobs = await this.fetchJobs();
      const idx = jobs.findIndex(j => j.id === jobId);
      if (idx !== -1) {
        jobs[idx] = { ...jobs[idx], ...updatedData } as JobPost;
        localStorage.setItem(LOCAL_JOBS_KEY, JSON.stringify(jobs));
      }
    }
  },

  async deleteJob(jobId: string): Promise<void> {
    if (isFirebaseConfigured && db) {
      try {
        await deleteDoc(doc(db, 'job_posts', jobId));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `job_posts/${jobId}`);
      }
    } else {
      const jobs = await this.fetchJobs();
      const filtered = jobs.filter(j => j.id !== jobId);
      localStorage.setItem(LOCAL_JOBS_KEY, JSON.stringify(filtered));
    }
  },

  async fetchApplications(filter: { jobId?: string; applicantId?: string; clinicId?: string; clinicEmail?: string }): Promise<JobApplication[]> {
    let list: JobApplication[] = [];
    if (isFirebaseConfigured && db) {
      try {
        const qConstraints = [];
        if (filter.jobId) {
          qConstraints.push(where('jobId', '==', filter.jobId));
        }
        if (filter.applicantId) {
          qConstraints.push(where('applicantId', '==', filter.applicantId));
        }
        if (filter.clinicId) {
          qConstraints.push(where('clinicId', '==', filter.clinicId));
        }
        if (filter.clinicEmail) {
          qConstraints.push(where('clinicEmail', '==', filter.clinicEmail));
        }
        const ref = collection(db, 'job_applications');
        const snap = qConstraints.length > 0
          ? await getDocs(query(ref, ...qConstraints))
          : await getDocs(ref);
        list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as JobApplication[];
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, 'job_applications');
      }
    } else {
      try {
        list = JSON.parse(localStorage.getItem(LOCAL_APPLICATIONS_KEY) || '[]');
      } catch {
        list = [];
      }
      if (filter.jobId) {
        list = list.filter(a => a.jobId === filter.jobId);
      }
      if (filter.applicantId) {
        list = list.filter(a => a.applicantId === filter.applicantId);
      }
      if (filter.clinicId) {
        list = list.filter(a => a.clinicId === filter.clinicId);
      }
      if (filter.clinicEmail) {
        list = list.filter(a => a.clinicEmail === filter.clinicEmail);
      }
    }
    return list;
  },

  async applyForJob(appData: Partial<JobApplication>, applicant: UserProfile, job: JobPost): Promise<JobApplication> {
    const application: JobApplication = {
      id: 'app_' + Date.now(),
      jobId: job.id,
      clinicId: job.clinicId,
      clinicEmail: job.clinicEmail || '',
      applicantId: applicant.uid,
      applicantName: applicant.name,
      applicantEmail: applicant.email,
      applicantPhone: applicant.phone || '',
      applicantRole: applicant.role,
      answers: appData.answers || [],
      submittedDocs: appData.submittedDocs || {},
      status: 'Pending',
      createdAt: Date.now()
    };

    if (isFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, 'job_applications', application.id), cleanUndefined(application));
        return application;
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `job_applications/${application.id}`);
      }
    } else {
      let apps = [];
      try {
        apps = JSON.parse(localStorage.getItem(LOCAL_APPLICATIONS_KEY) || '[]');
      } catch {
        apps = [];
      }
      apps.unshift(application);
      localStorage.setItem(LOCAL_APPLICATIONS_KEY, JSON.stringify(apps));
      return application;
    }
  },

  async updateApplicationStatus(applicationId: string, newStatus: JobApplication['status']): Promise<void> {
    if (isFirebaseConfigured && db) {
      try {
        await updateDoc(doc(db, 'job_applications', applicationId), { status: newStatus });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `job_applications/${applicationId}`);
      }
    } else {
      let apps = [];
      try {
        apps = JSON.parse(localStorage.getItem(LOCAL_APPLICATIONS_KEY) || '[]');
      } catch {
        apps = [];
      }
      const idx = apps.findIndex(a => a.id === applicationId);
      if (idx !== -1) {
        apps[idx].status = newStatus;
        localStorage.setItem(LOCAL_APPLICATIONS_KEY, JSON.stringify(apps));
      }
    }
  }
};

// ─────────────────────────────────────────────────────────────────
// NOTIFICATIONS SERVICE
// ─────────────────────────────────────────────────────────────────
export const NotificationService = {
  async findUserByEmail(email: string): Promise<UserProfile | null> {
    const emailLower = email.toLowerCase().trim();
    if (isFirebaseConfigured && db) {
      try {
        const q = query(collection(db, 'users'), where('email', '==', emailLower));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const docData = snap.docs[0].data();
          return { uid: snap.docs[0].id, ...docData } as UserProfile;
        }
      } catch (err) {
        console.error('findUserByEmail error:', err);
      }
    } else {
      const users = getLocalUsers();
      const found = users.find(u => u.email.toLowerCase().trim() === emailLower);
      if (found) return found;
    }
    return null;
  },

  async fetchNotifications(userId: string): Promise<VetNotification[]> {
    let list: VetNotification[] = [];
    if (isFirebaseConfigured && db) {
      try {
        const q = query(
          collection(db, 'notifications'),
          where('userId', '==', userId)
        );
        const snapshot = await getDocs(q);
        list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as VetNotification[];
        list.sort((a, b) => b.createdAt - a.createdAt);
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, 'notifications');
      }
    } else {
      try {
        list = JSON.parse(localStorage.getItem(LOCAL_NOTIFICATIONS_KEY) || '[]');
      } catch {
        list = [];
      }
      list = list.filter(n => n.userId === userId).sort((a, b) => b.createdAt - a.createdAt);
    }
    return list;
  },

  async createNotification(data: Partial<VetNotification>): Promise<VetNotification> {
    const notification: VetNotification = {
      id: 'notif_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      userId: data.userId || '',
      senderId: data.senderId || '',
      senderName: data.senderName || 'Someone',
      type: data.type || 'like',
      targetId: data.targetId || '',
      targetType: data.targetType || 'post',
      message: data.message || '',
      read: false,
      createdAt: Date.now()
    };

    if (isFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, 'notifications', notification.id), cleanUndefined(notification));
        return notification;
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `notifications/${notification.id}`);
      }
    } else {
      let list: VetNotification[] = [];
      try {
        list = JSON.parse(localStorage.getItem(LOCAL_NOTIFICATIONS_KEY) || '[]');
      } catch {
        list = [];
      }
      list.unshift(notification);
      localStorage.setItem(LOCAL_NOTIFICATIONS_KEY, JSON.stringify(list));
      return notification;
    }
    return notification;
  },

  async markAllAsRead(userId: string): Promise<void> {
    if (isFirebaseConfigured && db) {
      try {
        const list = await this.fetchNotifications(userId);
        const unread = list.filter(n => !n.read);
        await Promise.all(unread.map(async (n) => {
          await updateDoc(doc(db, 'notifications', n.id), { read: true });
        }));
      } catch (err) {
        console.error('Failed to mark live notifications read:', err);
      }
    } else {
      let list: VetNotification[] = [];
      try {
        list = JSON.parse(localStorage.getItem(LOCAL_NOTIFICATIONS_KEY) || '[]');
      } catch {
        list = [];
      }
      list.forEach(n => {
        if (n.userId === userId) {
          n.read = true;
        }
      });
      localStorage.setItem(LOCAL_NOTIFICATIONS_KEY, JSON.stringify(list));
    }
  },

  async deleteNotification(notificationId: string): Promise<void> {
    if (isFirebaseConfigured && db) {
      try {
        await deleteDoc(doc(db, 'notifications', notificationId));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `notifications/${notificationId}`);
      }
    } else {
      let list: VetNotification[] = [];
      try {
        list = JSON.parse(localStorage.getItem(LOCAL_NOTIFICATIONS_KEY) || '[]');
      } catch {
        list = [];
      }
      const filtered = list.filter(n => n.id !== notificationId);
      localStorage.setItem(LOCAL_NOTIFICATIONS_KEY, JSON.stringify(filtered));
    }
  }
};
