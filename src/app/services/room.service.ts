import { Injectable, NgZone, inject } from '@angular/core';
import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  runTransaction,
  setDoc,
  updateDoc,
  where,
  Unsubscribe,
} from 'firebase/firestore';
import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytesResumable,
} from 'firebase/storage';
import {
  OperationalRoomStatus,
  RoomActivityItem,
  RoomItem,
  RoomStatus,
} from '../interface';
import { FirebaseService } from './firebase.service';
import { LodgeDataService } from './lodge-data.service';
import { RoleService } from './role.service';

const MAX_ROOM_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_ROOM_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

@Injectable({
  providedIn: 'root',
})
export class RoomService {
  private readonly ngZone = inject(NgZone);
  private readonly firebaseService = inject(FirebaseService);
  private readonly lodgeData = inject(LodgeDataService);
  private readonly roleService = inject(RoleService);

  readonly rooms = this.lodgeData.rooms;
  readonly allRooms = this.lodgeData.allRooms;

  getRoomById(roomId: string): RoomItem | undefined {
    return this.allRooms().find((r) => r.id === roomId);
  }

  getRooms(filters?: {
    propertyId?: string;
    floor?: string;
    type?: string;
    operationalStatus?: OperationalRoomStatus;
    checkIn?: string;
    checkOut?: string;
  }): RoomItem[] {
    return this.rooms().filter((r) => {
      if (filters?.propertyId && filters.propertyId !== 'all' && r.propertyId !== filters.propertyId) {
        return false;
      }
      if (filters?.floor && filters.floor !== 'all' && r.floor !== filters.floor) {
        return false;
      }
      if (filters?.type && filters.type !== 'all' && r.type !== filters.type) {
        return false;
      }
      if (
        filters?.operationalStatus &&
        this.getEffectiveOperationalStatus(r) !== filters.operationalStatus
      ) {
        return false;
      }
      if (filters?.checkIn && filters?.checkOut) {
        return this.lodgeData.checkRoomAvailability(
          r.propertyId || '',
          r.number,
          filters.checkIn,
          filters.checkOut,
        );
      }
      return true;
    });
  }

  getEffectiveOperationalStatus(room: RoomItem): OperationalRoomStatus {
    if (room.operationalStatus) return room.operationalStatus;
    if (room.status === 'Cleaning' || room.status === 'Dirty' || room.status === 'Inspection') {
      return 'cleaning';
    }
    if (room.status === 'Maintenance') return 'maintenance';
    if (room.status === 'Out of Service') return 'blocked';
    return 'active';
  }

  getRoomAvailability(
    room: RoomItem,
    checkIn: string,
    checkOut: string,
  ): boolean {
    return this.lodgeData.checkRoomAvailability(
      room.propertyId || '',
      room.number,
      checkIn,
      checkOut,
    );
  }

  async isRoomNumberUnique(
    propertyId: string,
    roomNumber: string,
    excludeRoomId?: string,
  ): Promise<boolean> {
    const normalized = roomNumber.trim().toLowerCase();
    if (!normalized) return false;
    const localDup = this.allRooms().some(
      (r) =>
        r.id !== excludeRoomId &&
        (r.propertyId || '') === propertyId &&
        r.number.trim().toLowerCase() === normalized,
    );
    if (localDup) return false;

    const db = this.firebaseService.dbInstance;
    const q = query(
      collection(db, 'rooms'),
      where('propertyId', '==', propertyId),
      where('number', '==', roomNumber.trim()),
    );
    const snap = await getDocs(q);
    return snap.docs.every((d) => d.id === excludeRoomId);
  }

  async createRoom(data: Omit<RoomItem, 'id'>): Promise<string> {
    const propertyId = data.propertyId || '';
    if (!this.roleService.canAccessProperty(propertyId) || this.roleService.isStaff()) {
      throw new Error('Unauthorized to create rooms in this lodge.');
    }

    const db = this.firebaseService.dbInstance;
    const orgId = this.roleService.currentOrganizationId();
    const user = this.roleService.currentUserProfile();
    const now = new Date().toISOString();
    const roomNum = data.number.trim();
    const roomId = `RM-${propertyId.slice(-4)}-${roomNum}-${Date.now().toString().slice(-4)}`;
    const codeKey = `${propertyId}_${roomNum.toUpperCase()}`;

    const roomRef = doc(db, 'rooms', roomId);
    const codeRef = doc(db, 'roomCodes', codeKey);

    const payload: RoomItem = {
      ...data,
      id: roomId,
      organizationId: orgId,
      number: roomNum,
      createdAt: now,
      updatedAt: now,
      updatedBy: user?.name || user?.email || user?.uid || '',
    };

    await runTransaction(db, async (tx) => {
      const existing = await tx.get(codeRef);
      if (existing.exists()) {
        throw new Error(`Room number "${roomNum}" already exists in this lodge.`);
      }
      tx.set(codeRef, {
        propertyId,
        organizationId: orgId,
        roomId,
        number: roomNum,
        createdAt: now,
      });
      tx.set(roomRef, this.stripUndefined(payload));
    });

    await this.logActivity(roomId, 'Room Created', `Created room ${roomNum} (${data.type})`);
    return roomId;
  }

  async updateRoom(roomId: string, updates: Partial<RoomItem>): Promise<void> {
    const existing = this.getRoomById(roomId);
    if (!existing) throw new Error('Room not found.');
    if (!this.roleService.canAccessProperty(existing.propertyId || '') || this.roleService.isStaff()) {
      throw new Error('Unauthorized to update this room.');
    }

    const db = this.firebaseService.dbInstance;
    const user = this.roleService.currentUserProfile();
    const now = new Date().toISOString();
    const { id: _id, number: _num, ...safeUpdates } = updates;

    await updateDoc(
      doc(db, 'rooms', roomId),
      this.stripUndefined({
        ...safeUpdates,
        updatedAt: now,
        updatedBy: user?.name || user?.email || user?.uid || '',
      }),
    );

    await this.logActivity(roomId, 'Room Updated', 'Updated room details/pricing');
  }

  async updateOperationalStatus(
    roomId: string,
    opStatus: OperationalRoomStatus,
  ): Promise<void> {
    const existing = this.getRoomById(roomId);
    if (!existing) throw new Error('Room not found.');
    if (!this.roleService.canAccessProperty(existing.propertyId || '')) {
      throw new Error('Unauthorized to update room status.');
    }

    let lifecycleStatus: Exclude<RoomStatus, 'All'> = existing.status;
    if (opStatus === 'cleaning') lifecycleStatus = 'Cleaning';
    else if (opStatus === 'maintenance') lifecycleStatus = 'Maintenance';
    else if (opStatus === 'blocked' || opStatus === 'inactive') lifecycleStatus = 'Out of Service';
    else if (opStatus === 'active' && ['Cleaning', 'Maintenance', 'Out of Service', 'Dirty', 'Inspection'].includes(existing.status)) {
      lifecycleStatus = 'Available';
    }

    const db = this.firebaseService.dbInstance;
    const user = this.roleService.currentUserProfile();
    const now = new Date().toISOString();

    await updateDoc(doc(db, 'rooms', roomId), {
      operationalStatus: opStatus,
      status: lifecycleStatus,
      updatedAt: now,
      ...(opStatus === 'active' ? { lastCleaned: now } : {}),
    });

    await this.logActivity(
      roomId,
      'Status Changed',
      `Operational status changed to ${opStatus} (${lifecycleStatus}) by ${user?.name || 'User'}`,
    );
  }

  // ==========================================
  // FIREBASE STORAGE (ROOM IMAGES)
  // ==========================================

  validateImage(file: File): string | null {
    if (!ALLOWED_ROOM_IMAGE_TYPES.includes(file.type)) {
      return 'Unsupported image format. Please use JPG, PNG, or WebP.';
    }
    if (file.size > MAX_ROOM_IMAGE_BYTES) {
      return 'Image exceeds 5 MB limit.';
    }
    return null;
  }

  uploadRoomImage(
    lodgeId: string,
    roomId: string,
    folder: 'primary' | 'gallery',
    file: File,
    onProgress?: (pct: number) => void,
  ): Promise<{ url: string; storagePath: string }> {
    const err = this.validateImage(file);
    if (err) return Promise.reject(new Error(err));

    const storage = this.firebaseService.storageInstance;
    const orgId = this.roleService.currentOrganizationId();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `businesses/${orgId}/lodges/${lodgeId}/rooms/${roomId}/${folder}/${Date.now()}_${safeName}`;
    const storageRef = ref(storage, storagePath);

    return new Promise((resolve, reject) => {
      const task = uploadBytesResumable(storageRef, file, { contentType: file.type });
      task.on(
        'state_changed',
        (snap) => {
          if (onProgress && snap.totalBytes > 0) {
            const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
            this.ngZone.run(() => onProgress(pct));
          }
        },
        (e) => reject(e),
        async () => {
          try {
            const url = await getDownloadURL(task.snapshot.ref);
            resolve({ url, storagePath });
          } catch (e) {
            reject(e);
          }
        },
      );
    });
  }

  async deleteStorageFile(storagePath?: string | null): Promise<void> {
    if (!storagePath) return;
    try {
      await deleteObject(ref(this.firebaseService.storageInstance, storagePath));
    } catch (e: any) {
      if (e?.code !== 'storage/object-not-found') {
        console.warn('Room storage cleanup warning:', e?.message || e);
      }
    }
  }

  // ==========================================
  // ACTIVITY HISTORY
  // ==========================================

  async logActivity(roomId: string, action: string, details: string): Promise<void> {
    try {
      const db = this.firebaseService.dbInstance;
      const user = this.roleService.currentUserProfile();
      const actId = `act_${Date.now()}`;
      const item: RoomActivityItem = {
        id: actId,
        roomId,
        action,
        details,
        performedBy: user?.name || user?.email || 'System',
        timestamp: new Date().toISOString(),
      };
      await setDoc(doc(db, 'rooms', roomId, 'activity', actId), item);
    } catch {}
  }

  watchRoomActivity(
    roomId: string,
    onChange: (items: RoomActivityItem[]) => void,
  ): Unsubscribe {
    const db = this.firebaseService.dbInstance;
    return onSnapshot(
      collection(db, 'rooms', roomId, 'activity'),
      (snap) => {
        const items = snap.docs
          .map((d) => ({ ...(d.data() as RoomActivityItem), id: d.id }))
          .sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
        this.ngZone.run(() => onChange(items));
      },
      (err) => console.warn('Room activity listener error:', err.message),
    );
  }

  private stripUndefined<T extends Record<string, any>>(obj: T): T {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (v === undefined) continue;
      if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
        out[k] = this.stripUndefined(v);
      } else {
        out[k] = v;
      }
    }
    return out as T;
  }
}
