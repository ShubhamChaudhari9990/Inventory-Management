import { Injectable, NgZone, computed, inject, signal } from '@angular/core';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { FloorItem } from '../interface';
import { FirebaseService } from './firebase.service';
import { LodgeDataService } from './lodge-data.service';
import { PropertyService } from './property.service';
import { RoleService } from './role.service';

@Injectable({
  providedIn: 'root',
})
export class FloorService {
  private readonly ngZone = inject(NgZone);
  private readonly firebaseService = inject(FirebaseService);
  private readonly lodgeData = inject(LodgeDataService);
  private readonly propertyService = inject(PropertyService);
  private readonly roleService = inject(RoleService);

  private unsub: (() => void) | null = null;
  private readonly rawFloors = signal<FloorItem[]>([]);

  readonly floors = computed<FloorItem[]>(() => {
    const selProp = this.propertyService.selectedPropertyId();
    return this.rawFloors()
      .filter((f) => {
        if (!this.roleService.canAccessProperty(f.propertyId)) return false;
        if (selProp !== 'all' && f.propertyId !== selProp) return false;
        return true;
      })
      .sort((a, b) => (a.floorNumber ?? 0) - (b.floorNumber ?? 0));
  });

  readonly allFloors = computed<FloorItem[]>(() => this.rawFloors());

  constructor() {
    this.firebaseService.currentUser$.subscribe((user) => {
      if (user) this.startListener();
      else this.stopListener();
    });
  }

  private startListener(): void {
    if (this.unsub) return;
    const db = this.firebaseService.dbInstance;
    this.unsub = onSnapshot(
      collection(db, 'floors'),
      (snap) => {
        const list = snap.docs.map((d) => ({ ...(d.data() as FloorItem), id: d.id }));
        this.ngZone.run(() => this.rawFloors.set(list));
      },
      (err) => console.warn('Floors listener error:', err.message),
    );
  }

  private stopListener(): void {
    if (this.unsub) {
      try {
        this.unsub();
      } catch {}
      this.unsub = null;
    }
  }

  getFloors(lodgeId: string): FloorItem[] {
    return this.rawFloors()
      .filter((f) => f.propertyId === lodgeId)
      .sort((a, b) => (a.floorNumber ?? 0) - (b.floorNumber ?? 0));
  }

  async createFloor(
    data: Omit<FloorItem, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'>,
  ): Promise<string> {
    if (!this.roleService.canAccessProperty(data.propertyId) || this.roleService.isStaff()) {
      throw new Error('Unauthorized to create floors.');
    }
    const db = this.firebaseService.dbInstance;
    const id = `FLR-${Date.now()}`;
    const now = new Date().toISOString();
    const item: FloorItem = {
      ...data,
      id,
      organizationId: this.roleService.currentOrganizationId(),
      createdAt: now,
      updatedAt: now,
    };
    await setDoc(doc(db, 'floors', id), item);
    return id;
  }

  async updateFloor(floorId: string, updates: Partial<FloorItem>): Promise<void> {
    const existing = this.rawFloors().find((f) => f.id === floorId);
    if (!existing || !this.roleService.canAccessProperty(existing.propertyId) || this.roleService.isStaff()) {
      throw new Error('Unauthorized to update floor.');
    }
    const db = this.firebaseService.dbInstance;
    await updateDoc(doc(db, 'floors', floorId), {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  }

  async deleteFloor(floorId: string): Promise<void> {
    const floor = this.rawFloors().find((f) => f.id === floorId);
    if (!floor) throw new Error('Floor not found.');
    if (!this.roleService.canAccessProperty(floor.propertyId) || this.roleService.isStaff()) {
      throw new Error('Unauthorized to delete floor.');
    }

    const assignedRooms = this.lodgeData.allRooms().filter(
      (r) =>
        r.propertyId === floor.propertyId &&
        (r.floorId === floorId || r.floor === floor.floorName || r.floor === String(floor.floorNumber)),
    );
    if (assignedRooms.length > 0) {
      throw new Error(
        `Cannot delete "${floor.floorName}" because ${assignedRooms.length} room(s) are assigned to it. Reassign those rooms first.`,
      );
    }

    await deleteDoc(doc(this.firebaseService.dbInstance, 'floors', floorId));
  }
}
