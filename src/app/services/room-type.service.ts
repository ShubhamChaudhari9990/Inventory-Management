import { Injectable, NgZone, computed, inject, signal } from '@angular/core';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { RoomType } from '../interface';
import { FirebaseService } from './firebase.service';
import { LodgeDataService } from './lodge-data.service';
import { PropertyService } from './property.service';
import { RoleService } from './role.service';

@Injectable({
  providedIn: 'root',
})
export class RoomTypeService {
  private readonly ngZone = inject(NgZone);
  private readonly firebaseService = inject(FirebaseService);
  private readonly lodgeData = inject(LodgeDataService);
  private readonly propertyService = inject(PropertyService);
  private readonly roleService = inject(RoleService);

  private unsub: (() => void) | null = null;
  private readonly rawTypes = signal<RoomType[]>([]);

  readonly roomTypes = computed<RoomType[]>(() => {
    const selProp = this.propertyService.selectedPropertyId();
    return this.rawTypes().filter((t) => {
      if (t.propertyId && t.propertyId !== 'all' && !this.roleService.canAccessProperty(t.propertyId)) {
        return false;
      }
      if (selProp !== 'all' && t.propertyId && t.propertyId !== 'all' && t.propertyId !== selProp) {
        return false;
      }
      return true;
    });
  });

  readonly allRoomTypes = computed<RoomType[]>(() => this.rawTypes());

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
      collection(db, 'roomTypes'),
      (snap) => {
        const list = snap.docs.map((d) => ({ ...(d.data() as RoomType), id: d.id }));
        this.ngZone.run(() => this.rawTypes.set(list));
      },
      (err) => console.warn('RoomTypes listener error:', err.message),
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

  getRoomTypes(propertyId?: string): RoomType[] {
    return this.rawTypes().filter(
      (t) =>
        !propertyId ||
        propertyId === 'all' ||
        t.propertyId === 'all' ||
        t.propertyId === propertyId,
    );
  }

  async createRoomType(
    data: Omit<RoomType, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'>,
  ): Promise<string> {
    if (this.roleService.isStaff()) {
      throw new Error('Unauthorized to create room types.');
    }
    const db = this.firebaseService.dbInstance;
    const id = `RT-${Date.now()}`;
    const now = new Date().toISOString();
    const item: RoomType = {
      ...data,
      id,
      organizationId: this.roleService.currentOrganizationId(),
      status: data.status || 'active',
      createdAt: now,
      updatedAt: now,
    };
    await setDoc(doc(db, 'roomTypes', id), item);
    return id;
  }

  async updateRoomType(typeId: string, updates: Partial<RoomType>): Promise<void> {
    if (this.roleService.isStaff()) {
      throw new Error('Unauthorized to update room types.');
    }
    await updateDoc(doc(this.firebaseService.dbInstance, 'roomTypes', typeId), {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  }

  async deleteRoomType(typeId: string): Promise<void> {
    if (!this.roleService.isOwner() && !this.roleService.isManager()) {
      throw new Error('Unauthorized to delete room types.');
    }
    const rt = this.rawTypes().find((t) => t.id === typeId);
    if (!rt) throw new Error('Room type not found.');

    const inUse = this.lodgeData.allRooms().filter(
      (r) => r.roomTypeId === typeId || r.type.toLowerCase() === rt.name.toLowerCase(),
    );
    if (inUse.length > 0) {
      throw new Error(
        `Cannot delete "${rt.name}" because ${inUse.length} room(s) actively reference it.`,
      );
    }

    await deleteDoc(doc(this.firebaseService.dbInstance, 'roomTypes', typeId));
  }
}
