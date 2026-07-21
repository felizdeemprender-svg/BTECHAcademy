'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  User as FirebaseUser, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  setPersistence,
  browserSessionPersistence
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  onSnapshot, 
  serverTimestamp, 
  collection, 
  query, 
  where, 
  getDocs, 
  limit, 
  deleteDoc,
  getDoc
} from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';

const { auth, firestore: db } = initializeFirebase();

interface AuthContextType {
  user: FirebaseUser | null;
  profile: any | null;
  isLoading: boolean;
  isRedirecting: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (email: string, pass: string) => Promise<FirebaseUser>;
  refreshProfile: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SUPER_ADMIN_EMAILS = [
  'felizdeemprender@gmail.com',
  'btouchacademy@gmail.com',
  'FastoriaAcademy.ai@gmail.com'
];

const ALL_MENTOR_PERMISSIONS = ['academic', 'challenges', 'students', 'followups', 'marketing'];

async function consolidateEnrollmentsForUser(uid: string, email: string, displayName: string) {
  if (!email) return;
  try {
    const q = query(
      collection(db, 'enrollments'),
      where('inviteEmail', '==', email.toLowerCase().trim())
    );
    const snap = await getDocs(q);
    for (const docSnap of snap.docs) {
      const data = docSnap.data();
      if (data.studentId !== uid) {
        console.log(`[Auth-Consolidation] Migrando enrollment ${docSnap.id} a UID real ${uid}`);
        await setDoc(docSnap.ref, {
          studentId: uid,
          studentName: displayName || data.studentName
        }, { merge: true });
      }
    }
  } catch (err) {
    console.error("[Auth-Consolidation] Error consolidando inscripciones:", err);
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }

      if (firebaseUser) {
        setUser(firebaseUser);
        console.log("[Auth] Usuario detectado:", firebaseUser.email);
        const userRef = doc(db, 'users', firebaseUser.uid);
        
        try {
          // 1. Verificación y Migración Silenciosa
          const initialSnap = await getDoc(userRef);

          if (initialSnap.exists()) {
            const data = initialSnap.data();
            setProfile(data);
            if (typeof document !== 'undefined') {
              const primaryRole = data.roles?.[0] || 'none';
              document.cookie = `btech_uid=${firebaseUser.uid}; path=/; max-age=36000; SameSite=Lax`;
              document.cookie = `btech_role=${primaryRole}; path=/; max-age=36000; SameSite=Lax`;
            }
            setIsLoading(false);
            consolidateEnrollmentsForUser(firebaseUser.uid, firebaseUser.email || '', data.displayName || firebaseUser.displayName || '');
          } else {
            const userEmail = (firebaseUser.email || '').toLowerCase();
            const q = query(collection(db, 'users'), where('email', '==', userEmail), limit(1));
            const querySnap = await getDocs(q);

            const isSuperAdmin = SUPER_ADMIN_EMAILS.includes(userEmail);

            if (!querySnap.empty) {
              const preDoc = querySnap.docs[0];
              const preProfile = preDoc.data();
              
              const finalProfile = {
                uid: firebaseUser.uid,
                email: userEmail,
                displayName: firebaseUser.displayName || preProfile.displayName || userEmail.split('@')[0],
                photoURL: firebaseUser.photoURL || preProfile.photoURL || '',
                roles: isSuperAdmin ? ['alumno', 'mentor', 'admin', 'marketing'] : (preProfile.roles || ['alumno']),
                mentorPermissions: isSuperAdmin ? ALL_MENTOR_PERMISSIONS : (preProfile.mentorPermissions || []),
                isActive: true,
                subscription: preProfile.subscription || null,
                aiQuotas: preProfile.aiQuotas || null,
                updatedAt: serverTimestamp(),
                createdAt: preProfile.createdAt || serverTimestamp(),
              };

              await setDoc(userRef, finalProfile);
              if (preDoc.id !== firebaseUser.uid) {
                await deleteDoc(preDoc.ref).catch(() => {});
              }
              setProfile(finalProfile);
            } else {
              const newProfile = {
                uid: firebaseUser.uid,
                email: userEmail,
                displayName: firebaseUser.displayName || userEmail.split('@')[0],
                roles: isSuperAdmin ? ['alumno', 'mentor', 'admin', 'marketing'] : ['alumno'],
                isActive: true,
                createdAt: serverTimestamp(),
              };

              await setDoc(userRef, newProfile);
              setProfile(newProfile);
            }

            if (typeof document !== 'undefined') {
              const primaryRole = (profile?.roles?.[0] || 'alumno') as string;
              document.cookie = `btech_uid=${firebaseUser.uid}; path=/; max-age=36000; SameSite=Lax`;
              document.cookie = `btech_role=${primaryRole}; path=/; max-age=36000; SameSite=Lax`;
            }
            setIsLoading(false);
            consolidateEnrollmentsForUser(firebaseUser.uid, userEmail, firebaseUser.displayName || userEmail.split('@')[0]);
          }

          // 2. Establecer listener definitivo
          unsubscribeProfile = onSnapshot(userRef, (snapshot) => {
            if (snapshot.exists()) {
              const data = snapshot.data();
              
              // Conector Automático de Identidad: Guardamos en cookies para que el servidor lo vea
              if (typeof document !== 'undefined') {
                const primaryRole = data.roles?.[0] || 'none';
                document.cookie = `btech_uid=${firebaseUser.uid}; path=/; max-age=36000; SameSite=Lax`;
                document.cookie = `btech_role=${primaryRole}; path=/; max-age=36000; SameSite=Lax`;
              }

              // Solo actualizamos si los datos son distintos para evitar bucles de render
              setProfile(data);
              setIsLoading(false);
            }
          }, (err) => {
            console.error("[Auth] Snapshot Error:", err);
            setIsLoading(false);
          });

        } catch (err) {
          console.error("[Auth] Critical Init Error:", err);
          setIsLoading(false);
        }
      } else {
        // Limpiar rastro de identidad
        if (typeof document !== 'undefined') {
          document.cookie = "btech_uid=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
          document.cookie = "btech_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        }
        setUser(null);
        setProfile(null);
        setIsLoading(false);
      }
    });

    return () => {
      if (unsubscribeAuth) unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await setPersistence(auth, browserSessionPersistence);
      await signInWithPopup(auth, provider);
    } catch (e) { throw e; }
  };

  const loginWithEmail = async (email: string, pass: string) => {
    await signInWithEmailAndPassword(auth, email, pass);
  };

  const registerWithEmail = async (email: string, pass: string) => {
    const res = await createUserWithEmailAndPassword(auth, email, pass);
    return res.user;
  };

  const refreshProfile = async () => {
    if (!user) return;
    try {
      const snapshot = await getDoc(doc(db, 'users', user.uid));
      if (snapshot.exists()) {
        setProfile(snapshot.data());
      }
    } catch (e) {
      console.error('[Auth] Error refreshing profile:', e);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setProfile(null);
    } catch (e) {}
  };

  return (
    <AuthContext.Provider value={{ 
      user, profile, isLoading, isRedirecting,
      loginWithGoogle, loginWithEmail, registerWithEmail, refreshProfile, logout 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext)!;
