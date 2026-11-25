import { Injectable, NgZone, computed, inject, signal } from '@angular/core';
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { Property, PropertyFilter, PropertyStatus } from '../interface';
import { FirebaseService } from './firebase.service';
import { RoleService } from './role.service';

export const DEFAULT_PROPERTIES: readonly Property[] = [];

@Injectable({
  providedIn: 'root',
})
export class PropertyService {
  private readonly ngZone = inject(NgZone);
  private readonly firebaseService = inject(FirebaseService);
  private readonly roleService = inject(RoleService);

  private unsubscribeProperties: (() => void) | null = null;

  readonly properties = signal<Property[]>([]);
  readonly selectedPropertyId = signal<PropertyFilter>('all');

  readonly accessibleProperties = computed<Property[]>(() => {
    const all = this.properties();
    if (this.roleService.isOwner()) {
      return all;
    }
    const allowedIds = this.roleService.assignedPropertyIds();
    return all.filter((p) => allowedIds.includes(p.id));
  });

  readonly currentProperty = computed<Property | null>(() => {
    const id = this.selectedPropertyId();
    if (id === 'all') {
      return null;
    }
    return this.properties().find((p) => p.id === id) ?? null;
  });

  readonly selectedPropertyName = computed<string>(() => {
    const prop = this.currentProperty();
    if (prop) return prop.name;
    return 'LODGE.ALL_LODGES';
  });

  constructor() {
    this.firebaseService.currentUser$.subscribe((user) => {
      if (user) {
        this.startPropertiesListener();
      } else {
        this.stopPropertiesListener();
      }
    });
  }

  private startPropertiesListener(): void {
    if (this.unsubscribeProperties) return;

    const db = this.firebaseService.dbInstance;
    const colRef = collection(db, 'properties');

    this.unsubscribeProperties = onSnapshot(
      colRef,
      (snapshot) => {
        const items = snapshot.docs.map((d) => ({
          ...d.data(),
          id: d.id,
        })) as Property[];
        this.ngZone.run(() => {
          this.properties.set(items);
        });
      },
      (error) => {
        console.warn('Firestore listener error on properties:', error.message);
      },
    );
  }

  private stopPropertiesListener(): void {
    if (this.unsubscribeProperties) {
      try {
        this.unsubscribeProperties();
      } catch {}
      this.unsubscribeProperties = null;
    }
  }

  switchProperty(id: PropertyFilter): boolean {
    if (id === 'all') {
      if (this.roleService.isOwner()) {
        this.selectedPropertyId.set('all');
        return true;
      }
      // Non-owners cannot select 'all', lock to their first assigned property
      const firstAllowed = this.accessibleProperties()[0]?.id ?? '';
      this.selectedPropertyId.set(firstAllowed);
      return false;
    }

    if (this.roleService.canAccessProperty(id)) {
      this.selectedPropertyId.set(id);
      return true;
    }

    console.warn(`Unauthorized property switch attempt to ${id}`);
    return false;
  }

  async addProperty(prop: Omit<Property, 'id'>): Promise<string> {
    if (!this.roleService.isOwner()) {
      throw new Error('Only the organization Owner can create new properties.');
    }
    const db = this.firebaseService.dbInstance;
    const docId = `lodge_${Date.now()}`;
    const docRef = doc(db, 'properties', docId);
    const newProp: Property = { ...prop, id: docId };
    await setDoc(docRef, newProp);
    return docId;
  }

  async updateProperty(id: string, updates: Partial<Property>): Promise<void> {
    if (!this.roleService.canAccessProperty(id)) {
      throw new Error('Unauthorized property update.');
    }
    const db = this.firebaseService.dbInstance;
    const docRef = doc(db, 'properties', id);
    await updateDoc(docRef, updates);
  }

  async setPropertyStatus(id: string, status: PropertyStatus): Promise<void> {
    if (!this.roleService.isOwner()) {
      throw new Error('Only the Owner can change property activation status.');
    }
    await this.updateProperty(id, { status });
  }

  async archiveProperty(id: string, isArchived: boolean): Promise<void> {
    if (!this.roleService.isOwner()) {
      throw new Error('Only the Owner can archive properties.');
    }
    await this.updateProperty(id, { status: isArchived ? 'inactive' : 'active' });
  }
}
