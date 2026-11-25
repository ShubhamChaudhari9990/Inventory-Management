import { Injectable, NgZone, inject } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@southdevs/capacitor-google-auth';
import { initializeApp, getApp, getApps, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  Auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
  UserCredential,
  GoogleAuthProvider,
  signInWithCredential,
  signInWithPopup,
  signInWithRedirect,
  sendEmailVerification,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { Observable, BehaviorSubject } from 'rxjs';

import { environment } from '../../environments/environment';

const GOOGLE_CLIENT_ID = '371488536263-26obcj8uetvmq6g1e6i0519jv81i6hku.apps.googleusercontent.com';

export interface GoogleAuthResponse {
  credential: UserCredential;
  googleUser?: {
    name?: string | null;
    displayName?: string | null;
    email?: string | null;
    imageUrl?: string | null;
    id?: string | null;
  } | null;
}

@Injectable({
  providedIn: 'root',
})
export class FirebaseService {
  private readonly ngZone = inject(NgZone);
  private readonly app: FirebaseApp;
  private readonly auth: Auth;
  private readonly db: Firestore;
  private readonly storage: FirebaseStorage;
  private readonly googleProvider = new GoogleAuthProvider();

  private readonly currentUserSubject = new BehaviorSubject<User | null>(null);
  public readonly currentUser$: Observable<User | null> =
    this.currentUserSubject.asObservable();

  constructor() {
    this.app = getApps().length
      ? getApp()
      : initializeApp(environment.firebase);
    this.auth = getAuth(this.app);
    this.db = getFirestore(this.app);
    this.storage = getStorage(this.app);

    this.googleProvider.setCustomParameters({
      prompt: 'select_account',
    });

    onAuthStateChanged(this.auth, (user) => {
      this.ngZone.run(() => {
        this.currentUserSubject.next(user);
      });
    });

    if (Capacitor.isNativePlatform()) {
      try {
        void GoogleAuth.initialize({
          clientId: GOOGLE_CLIENT_ID,
          scopes: ['profile', 'email'],
          grantOfflineAccess: false,
        });
      } catch (err) {
        console.warn('Native GoogleAuth init warning:', err);
      }
    }
  }

  get appInstance(): FirebaseApp {
    return this.app;
  }

  get authInstance(): Auth {
    return this.auth;
  }

  get dbInstance(): Firestore {
    return this.db;
  }

  get storageInstance(): FirebaseStorage {
    return this.storage;
  }

  get currentUser(): User | null {
    return this.auth.currentUser;
  }

  get isAuthenticated(): boolean {
    return !!this.auth.currentUser;
  }

  async authStateReady(): Promise<User | null> {
    try {
      if (typeof (this.auth as any).authStateReady === 'function') {
        await (this.auth as any).authStateReady();
      }
    } catch {}
    return this.auth.currentUser;
  }

  async login(email: string, pass: string): Promise<UserCredential> {
    return signInWithEmailAndPassword(this.auth, email, pass);
  }

  async loginWithGoogle(): Promise<GoogleAuthResponse> {
    if (Capacitor.isNativePlatform()) {
      // In native Android/iOS app, use native GoogleAuth dialog (in-app, no browser!)
      try {
        await GoogleAuth.initialize({
          clientId: GOOGLE_CLIENT_ID,
          scopes: ['profile', 'email'],
          grantOfflineAccess: false,
        });
        const googleUser = await GoogleAuth.signIn({
          clientId: GOOGLE_CLIENT_ID,
          serverClientId: GOOGLE_CLIENT_ID,
          scopes: ['profile', 'email'],
          grantOfflineAccess: false,
        });
        const idToken =
          googleUser.authentication?.idToken ||
          (googleUser as any).idToken;
        if (!idToken) {
          throw new Error('No ID token received from native Google Sign-In');
        }
        const credential = GoogleAuthProvider.credential(idToken);
        const fbCred = await signInWithCredential(this.auth, credential);
        return {
          credential: fbCred,
          googleUser: {
            name: (googleUser as any).name || (googleUser as any).displayName || fbCred.user.displayName,
            displayName: (googleUser as any).displayName || (googleUser as any).name || fbCred.user.displayName,
            email: (googleUser as any).email || fbCred.user.email,
            imageUrl: (googleUser as any).imageUrl || fbCred.user.photoURL,
            id: (googleUser as any).id || fbCred.user.uid,
          },
        };
      } catch (nativeError: any) {
        console.error('Native Google Sign-In error:', nativeError);
        throw nativeError;
      }
    } else {
      // Web browser flow
      try {
        const fbCred = await signInWithPopup(this.auth, this.googleProvider);
        return {
          credential: fbCred,
          googleUser: {
            name: fbCred.user.displayName,
            displayName: fbCred.user.displayName,
            email: fbCred.user.email,
            imageUrl: fbCred.user.photoURL,
            id: fbCred.user.uid,
          },
        };
      } catch (popupError: any) {
        if (
          popupError?.code === 'auth/popup-blocked' ||
          popupError?.code === 'auth/cancelled-popup-request'
        ) {
          await signInWithRedirect(this.auth, this.googleProvider);
          throw new Error('REDIRECTING');
        }
        throw popupError;
      }
    }
  }

  async register(email: string, pass: string): Promise<UserCredential> {
    return createUserWithEmailAndPassword(this.auth, email, pass);
  }

  async sendVerificationEmail(user?: User): Promise<void> {
    const targetUser = user || this.auth.currentUser;
    if (targetUser) {
      await sendEmailVerification(targetUser);
    }
  }

  async reloadUser(): Promise<User | null> {
    if (this.auth.currentUser) {
      await this.auth.currentUser.reload();
      this.currentUserSubject.next(this.auth.currentUser);
    }
    return this.auth.currentUser;
  }

  isEmailVerified(): boolean {
    return this.auth.currentUser?.emailVerified ?? false;
  }

  async sendPasswordResetEmail(email: string): Promise<void> {
    return sendPasswordResetEmail(this.auth, email);
  }

  async logout(): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      try {
        await GoogleAuth.signOut();
      } catch {
        // ignore error if not signed in via google
      }
    }
    return signOut(this.auth);
  }
}
