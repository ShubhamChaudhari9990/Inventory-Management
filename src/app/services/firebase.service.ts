import { Injectable } from '@angular/core';
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
} from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { Observable, BehaviorSubject } from 'rxjs';

import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class FirebaseService {
  private readonly app: FirebaseApp;
  private readonly auth: Auth;
  private readonly db: Firestore;

  private readonly currentUserSubject = new BehaviorSubject<User | null>(null);
  public readonly currentUser$: Observable<User | null> =
    this.currentUserSubject.asObservable();

  constructor() {
    this.app = getApps().length
      ? getApp()
      : initializeApp(environment.firebase);
    this.auth = getAuth(this.app);
    this.db = getFirestore(this.app);

    onAuthStateChanged(this.auth, (user) => {
      this.currentUserSubject.next(user);
    });
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

  get currentUser(): User | null {
    return this.auth.currentUser;
  }

  async login(email: string, pass: string): Promise<UserCredential> {
    return signInWithEmailAndPassword(this.auth, email, pass);
  }

  async register(email: string, pass: string): Promise<UserCredential> {
    return createUserWithEmailAndPassword(this.auth, email, pass);
  }

  async logout(): Promise<void> {
    return signOut(this.auth);
  }
}
