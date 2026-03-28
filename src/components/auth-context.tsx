'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithRedirect,
  getRedirectResult,
  signOut, 
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  setPersistence,
  browserSessionPersistence,
  User as FirebaseUser 
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp, updateDoc, onSnapshot, getDocs, query, collection, where, deleteDoc, writeBatch, getDoc, limit } from 'firebase/firestore';
import { useAuth as useFirebaseAuth, useFirestore } from '@/firebase';

interface UserProfile {
  uid: string;
  email: string;
  username?: string;
  displayName: string;
  photoURL: string;
  roles: ('alumno' | 'mentor' | 'admin' | 'marketing')[];
  mentorPermissions?: string[];
  isActive: boolean;
  termsUsageAccepted?: boolean;
  termsUsageAcceptedAt?: string;
  signInProvider?: string;
  subscription?: any; // Usar any temporalmente para flexibilidad con la interfaz TutorSubscription o definirla aquí
  profile?: {
    bio?: string;
    socials?: Record<string, string>;
    branding?: {
      primaryColor?: string;
      logoUrl?: string;
      layoutMode?: 'light' | 'dark';
    };
    mercadopago?: {
      accessToken?: string;
      publicKey?: string;
    };
  };
}

interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loginWithGoogle: () => Promise<void>;
  loginWithGoogleRedirect: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (email: string, pass: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
  isRedirecting: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SUPER_ADMIN_EMAILS = ['felizdeemprender@gmail.com'];

const ALL_MENTOR_PERMISSIONS = ['academic_management', 'mentor_challenges', 'students_view', 'followups_management'];
const INACTIVITY_TIMEOUT = 2 * 60 * 60 * 1000; // 2 horas
const FORCE_LOGOUT_VERSION = 'v2.1'; // Incrementa para forzar cierre de sesión global

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const auth = useFirebaseAuth();
  const db = useFirestore();
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRedirecting, setIsRedirecting] = useState(false);

  const logout = useCallback(async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  }, [auth]);

  useEffect(() => {
    const currentVersion = localStorage.getItem('EA_SESSION_VER');
    if (currentVersion !== FORCE_LOGOUT_VERSION) {
      signOut(auth).then(() => {
        localStorage.setItem('EA_SESSION_VER', FORCE_LOGOUT_VERSION);
        window.location.reload();
      });
    }
  }, [auth]);

  useEffect(() => {
    if (!user) return;
    let timeout: NodeJS.Timeout;
    const resetTimer = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => logout(), INACTIVITY_TIMEOUT);
    };
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove'];
    events.forEach(event => window.addEventListener(event, resetTimer));
    resetTimer();
    return () => {
      clearTimeout(timeout);
      events.forEach(event => window.removeEventListener(event, resetTimer));
    };
  }, [user, logout]);

  useEffect(() => {
    const handleRedirectResult = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result?.user) {
          // No user-facing changes needed here
        }
      } catch (error: any) {
        if (error.message?.includes('missing initial state')) {
          setIsRedirecting(false);
        }
      }
    };
    handleRedirectResult();
  }, [auth]);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }

      if (firebaseUser) {
        setUser(firebaseUser);
        const userEmail = firebaseUser.email?.toLowerCase().trim() || '';
        const userRef = doc(db, 'users', firebaseUser.uid);
        const signInProvider = firebaseUser.providerData[0]?.providerId || 'password';
        
        unsubscribeProfile = onSnapshot(userRef, async (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            const isSuperAdmin = SUPER_ADMIN_EMAILS.includes(userEmail);
            let currentRoles = data.roles || ['alumno'];
            let currentPerms = data.mentorPermissions || [];

            if (isSuperAdmin) {
              const needsUpdate = !currentRoles.includes('admin') || !currentRoles.includes('mentor') || !currentRoles.includes('marketing') || currentPerms.length !== ALL_MENTOR_PERMISSIONS.length;
              if (needsUpdate) {
                const updatedRoles = Array.from(new Set([...currentRoles, 'alumno', 'mentor', 'admin', 'marketing']));
                updateDoc(userRef, { 
                  roles: updatedRoles,
                  mentorPermissions: ALL_MENTOR_PERMISSIONS,
                  updatedAt: serverTimestamp()
                }).catch((e) => console.error("[Auth] Error update admin:", e));
                currentRoles = updatedRoles as any;
                currentPerms = ALL_MENTOR_PERMISSIONS;
              }
            }

            if (data.signInProvider !== signInProvider) {
              updateDoc(userRef, { signInProvider }).catch(() => {});
            }

            setProfile({
              uid: firebaseUser.uid,
              email: userEmail,
              displayName: data.displayName || firebaseUser.displayName || userEmail.split('@')[0],
              photoURL: data.photoURL || firebaseUser.photoURL || '',
              roles: currentRoles,
              mentorPermissions: currentPerms,
              isActive: data.isActive !== false,
              termsUsageAccepted: data.termsUsageAccepted,
              termsUsageAcceptedAt: data.termsUsageAcceptedAt,
              signInProvider: data.signInProvider || signInProvider,
              subscription: data.subscription,
              profile: data.profile,
              username: data.username
            });
            setIsLoading(false);
            setIsRedirecting(false);
          } else {
            console.log("[Auth] Perfil no encontrado para UID:", firebaseUser.uid, "Iniciando creación...");
            try {
              // Intentar buscar por email como fallback (migración o pre-registro)
              const q = query(collection(db, 'users'), where('email', '==', userEmail), limit(1));
              const querySnap = await getDocs(q);
              
              const isSuperAdmin = SUPER_ADMIN_EMAILS.includes(userEmail);
              
              if (!querySnap.empty) {
                const preDoc = querySnap.docs[0];
                const preProfile = preDoc.data();
                const oldDocId = preDoc.id;
                console.log("[Auth] Vínculo con pre-registro encontrado:", oldDocId);

                const finalProfile = {
                  uid: firebaseUser.uid,
                  email: userEmail,
                  displayName: firebaseUser.displayName || preProfile.displayName || userEmail.split('@')[0],
                  photoURL: firebaseUser.photoURL || preProfile.photoURL || '',
                  roles: isSuperAdmin ? ['alumno', 'mentor', 'admin', 'marketing'] : (preProfile.roles || ['alumno']),
                  mentorPermissions: isSuperAdmin ? ALL_MENTOR_PERMISSIONS : (preProfile.mentorPermissions || []),
                  signInProvider: signInProvider,
                  isActive: preProfile.isActive !== false,
                  updatedAt: serverTimestamp(),
                  createdAt: preProfile.createdAt || serverTimestamp(),
                  termsUsageAccepted: preProfile.termsUsageAccepted || false
                };

                await setDoc(userRef, finalProfile);
                console.log("[Auth] Documento creado/actualizado para UID:", firebaseUser.uid);

                // Migrar colecciones si el ID cambió
                if (oldDocId !== firebaseUser.uid) {
                  const batch = writeBatch(db);
                  const enrollmentsSnap = await getDocs(query(collection(db, 'enrollments'), where('studentId', '==', oldDocId)));
                  enrollmentsSnap.docs.forEach((enroll) => batch.update(enroll.ref, { studentId: firebaseUser.uid }));

                  const followUpsSnap = await getDocs(query(collection(db, 'followups'), where('studentId', '==', oldDocId)));
                  followUpsSnap.docs.forEach((fu) => batch.update(fu.ref, { studentId: firebaseUser.uid }));

                  await batch.commit();
                  await deleteDoc(doc(db, 'users', oldDocId)).catch(() => {});
                }
              } else {
                console.log("[Auth] Creando nuevo perfil desde cero para:", userEmail);
                await setDoc(userRef, {
                  uid: firebaseUser.uid,
                  email: userEmail,
                  displayName: firebaseUser.displayName || userEmail.split('@')[0],
                  photoURL: firebaseUser.photoURL || '',
                  roles: isSuperAdmin ? ['alumno', 'mentor', 'admin', 'marketing'] : ['alumno'],
                  mentorPermissions: isSuperAdmin ? ALL_MENTOR_PERMISSIONS : [],
                  isActive: true,
                  signInProvider: signInProvider,
                  createdAt: serverTimestamp(),
                  updatedAt: serverTimestamp()
                });
                console.log("[Auth] Perfil creado exitosamente.");
              }
            } catch (error) {
              console.error("[Auth] Error crítico en inicialización de perfil:", error);
              setIsLoading(false);
              setIsRedirecting(false);
            }
          }
        }, (error) => {
          console.error("[Auth] Error en listener de perfil (onSnapshot):", error);
          setIsLoading(false);
          setIsRedirecting(false);
        });

      } else {
        setUser(null);
        setProfile(null);
        setIsLoading(false);
        setIsRedirecting(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, [auth, db]);

  // Escuchar actualizaciones de suscripción desde admin
  useEffect(() => {
    const handleSubscriptionUpdate = (event: any) => {
      console.log('🔍 DEBUG - Evento subscription-updated recibido:', event.detail);
      const { userId, subscription } = event.detail;
      
      // Si el usuario actual es el que se actualizó, recargar profile
      if (profile && profile.uid === userId && subscription) {
        console.log('🔍 DEBUG - Recargando profile por actualización de suscripción');
        setProfile(prev => prev ? {
          ...prev,
          subscription: subscription
        } : null);
      }
    };

    window.addEventListener('subscription-updated', handleSubscriptionUpdate);
    
    return () => {
      window.removeEventListener('subscription-updated', handleSubscriptionUpdate);
    };
  }, [profile]);

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      await setPersistence(auth, browserSessionPersistence);
      await signInWithPopup(auth, provider);
    } catch (e) {
      throw e;
    }
  };

  const loginWithGoogleRedirect = async () => {
    setIsRedirecting(true);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      await setPersistence(auth, browserSessionPersistence);
      await signInWithRedirect(auth, provider);
    } catch (e) {
      setIsRedirecting(false);
      throw e;
    }
  };

  const loginWithEmail = async (email: string, pass: string) => {
    await setPersistence(auth, browserSessionPersistence);
    await signInWithEmailAndPassword(auth, email.toLowerCase().trim(), pass);
  };

  const registerWithEmail = async (email: string, pass: string) => {
    await setPersistence(auth, browserSessionPersistence);
    await createUserWithEmailAndPassword(auth, email.toLowerCase().trim(), pass);
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email.toLowerCase().trim());
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      profile, 
      loginWithGoogle, 
      loginWithGoogleRedirect, 
      loginWithEmail, 
      registerWithEmail, 
      resetPassword, 
      logout, 
      isLoading,
      isRedirecting
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
