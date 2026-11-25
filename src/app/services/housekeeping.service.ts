import { Injectable, NgZone, computed, inject, signal } from '@angular/core';
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import {
  getDownloadURL,
  ref,
  uploadBytesResumable,
} from 'firebase/storage';
import {
  CleaningScheduleItem,
  HousekeepingRoomStatus,
  HousekeepingTaskCreateData,
  MaintenanceIssueItem,
  RoomInspectionRecord,
  RoomItem,
} from '../interface';
import { FirebaseService } from './firebase.service';
import { LodgeDataService } from './lodge-data.service';
import { PropertyService } from './property.service';
import { RoleService } from './role.service';
import { EmployeeService } from './employee.service';

const MAX_HK_IMG_BYTES = 5 * 1024 * 1024;
const ALLOWED_HK_IMG_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

@Injectable({
  providedIn: 'root',
})
export class HousekeepingService {
  private readonly ngZone = inject(NgZone);
  private readonly firebaseService = inject(FirebaseService);
  private readonly lodgeData = inject(LodgeDataService);
  private readonly propertyService = inject(PropertyService);
  private readonly roleService = inject(RoleService);
  private readonly employeeService = inject(EmployeeService);

  private unsubInspections: (() => void) | null = null;
  private unsubMaint: (() => void) | null = null;

  private readonly rawInspections = signal<RoomInspectionRecord[]>([]);
  private readonly rawMaintenance = signal<MaintenanceIssueItem[]>([]);

  readonly tasks = this.lodgeData.housekeeping;
  readonly rooms = this.lodgeData.rooms;

  readonly inspections = computed<RoomInspectionRecord[]>(() => {
    const selProp = this.propertyService.selectedPropertyId();
    return this.rawInspections()
      .filter((i) => {
        if (!this.roleService.canAccessProperty(i.propertyId)) return false;
        if (selProp !== 'all' && i.propertyId !== selProp) return false;
        return true;
      })
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  });

  readonly maintenanceIssues = computed<MaintenanceIssueItem[]>(() => {
    const selProp = this.propertyService.selectedPropertyId();
    return this.rawMaintenance()
      .filter((m) => {
        if (!this.roleService.canAccessProperty(m.propertyId)) return false;
        if (selProp !== 'all' && m.propertyId !== selProp) return false;
        return true;
      })
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  });

  constructor() {
    this.firebaseService.currentUser$.subscribe((user) => {
      if (user) this.startListeners();
      else this.stopListeners();
    });
  }

  private startListeners(): void {
    const db = this.firebaseService.dbInstance;
    if (!this.unsubInspections) {
      this.unsubInspections = onSnapshot(
        collection(db, 'housekeepingInspections'),
        (snap) => {
          const items = snap.docs.map((d) => ({
            ...(d.data() as RoomInspectionRecord),
            id: d.id,
          }));
          this.ngZone.run(() => this.rawInspections.set(items));
        },
        (err) => console.warn('Inspections listener error:', err.message),
      );
    }
    if (!this.unsubMaint) {
      this.unsubMaint = onSnapshot(
        collection(db, 'maintenanceIssues'),
        (snap) => {
          const items = snap.docs.map((d) => ({
            ...(d.data() as MaintenanceIssueItem),
            id: d.id,
          }));
          this.ngZone.run(() => this.rawMaintenance.set(items));
        },
        (err) => console.warn('Maintenance listener error:', err.message),
      );
    }
  }

  private stopListeners(): void {
    try { this.unsubInspections?.(); } catch {}
    try { this.unsubMaint?.(); } catch {}
    this.unsubInspections = null;
    this.unsubMaint = null;
  }

  getRoomHousekeepingStatus(room: RoomItem): HousekeepingRoomStatus {
    if (room.housekeepingStatus) return room.housekeepingStatus;
    if (room.status === 'Dirty') return 'Dirty';
    if (room.status === 'Cleaning') return 'Cleaning';
    if (room.status === 'Inspection') return 'Inspection Pending';
    if (room.status === 'Out of Service' || room.status === 'Maintenance') return 'Out of Service';
    return 'Clean';
  }

  isRoomEligibleForCheckIn(room: RoomItem): boolean {
    const hk = this.getRoomHousekeepingStatus(room);
    const op = room.operationalStatus || 'active';
    const maintOpen = this.rawMaintenance().some(
      (m) => m.roomId === room.id && m.status !== 'Resolved' && m.markOutOfService,
    );
    return (
      (hk === 'Clean' || hk === 'Inspected') &&
      op === 'active' &&
      !maintOpen &&
      room.status !== 'Occupied' &&
      room.status !== 'Maintenance' &&
      room.status !== 'Out of Service'
    );
  }

  async updateRoomHousekeepingStatus(
    roomId: string,
    hkStatus: HousekeepingRoomStatus,
  ): Promise<void> {
    const updates: Partial<RoomItem> = {
      housekeepingStatus: hkStatus,
      updatedAt: new Date().toISOString(),
    };
    if (hkStatus === 'Clean' || hkStatus === 'Inspected') {
      updates.lastCleaned = new Date().toISOString();
    }
    await this.lodgeData.updateRoom(roomId, updates);
  }

  async createAndAssignTask(data: HousekeepingTaskCreateData): Promise<string> {
    if (!this.roleService.canAccessProperty(data.propertyId)) {
      throw new Error('Unauthorized lodge access.');
    }

    if (data.assignedStaffId) {
      const emp = this.employeeService.getEmployeeById(data.assignedStaffId);
      if (emp) {
        if (emp.employmentStatus !== 'active') {
          throw new Error(`Employee "${emp.name}" is not active.`);
        }
        if (emp.role !== 'owner' && !emp.assignedLodgeIds.includes(data.propertyId)) {
          throw new Error(`Employee "${emp.name}" is not assigned to this lodge.`);
        }
      }
    }

    const user = this.roleService.currentUserProfile();
    const now = new Date().toISOString();
    const taskId = `HK-${Date.now()}`;
    const task: CleaningScheduleItem = {
      id: taskId,
      organizationId: this.roleService.currentOrganizationId(),
      propertyId: data.propertyId,
      roomId: data.roomId,
      room: data.room,
      floor: data.floor,
      type: data.type,
      taskType: data.taskType || 'Regular Cleaning',
      assignedTo: data.assignedTo || 'Unassigned',
      assignedStaffId: data.assignedStaffId,
      status: data.assignedStaffId ? 'Assigned' : 'Pending',
      time: data.dueAt ? data.dueAt.slice(11, 16) : 'Scheduled',
      dueAt: data.dueAt || now,
      priority: data.priority || 'Normal',
      instructions: data.instructions || '',
      notes: data.notes || '',
      createdBy: user?.name || user?.email || 'Manager',
      createdAt: now,
      updatedAt: now,
    };

    await setDoc(
      doc(this.firebaseService.dbInstance, 'housekeeping', taskId),
      this.stripUndefined(task),
    );
    return taskId;
  }

  async startCleaning(task: CleaningScheduleItem): Promise<void> {
    const now = new Date().toISOString();
    await updateDoc(doc(this.firebaseService.dbInstance, 'housekeeping', task.id), {
      status: 'In Progress',
      startedAt: now,
      updatedAt: now,
    });
    const room = this.rooms().find(
      (r) => (task.roomId && r.id === task.roomId) || (r.propertyId === task.propertyId && r.number === task.room),
    );
    if (room) {
      await this.lodgeData.updateRoom(room.id, {
        housekeepingStatus: 'Cleaning',
        status: room.status === 'Occupied' ? 'Occupied' : 'Cleaning',
      });
    }
  }

  async completeCleaning(
    task: CleaningScheduleItem,
    notes: string,
    photos: string[],
    missingItems: string[],
    submitForInspection = true,
  ): Promise<void> {
    const now = new Date().toISOString();
    const nextTaskStatus = submitForInspection ? 'Inspection Pending' : 'Completed';
    await updateDoc(doc(this.firebaseService.dbInstance, 'housekeeping', task.id), {
      status: nextTaskStatus,
      notes: notes.trim(),
      photos,
      missingItems,
      completedAt: now,
      updatedAt: now,
    });

    const room = this.rooms().find(
      (r) => (task.roomId && r.id === task.roomId) || (r.propertyId === task.propertyId && r.number === task.room),
    );
    if (room) {
      await this.lodgeData.updateRoom(room.id, {
        housekeepingStatus: submitForInspection ? 'Inspection Pending' : 'Clean',
        lastCleaned: now,
        status:
          room.status === 'Occupied'
            ? 'Occupied'
            : submitForInspection
              ? 'Inspection'
              : 'Available',
      });
    }
  }

  async submitInspection(params: {
    task: CleaningScheduleItem;
    checklist: { label: string; passed: boolean }[];
    notes: string;
    photos: string[];
    outcome: 'Approved' | 'Rejected';
    rejectionReason?: string;
  }): Promise<void> {
    const user = this.roleService.currentUserProfile();
    if (!user) throw new Error('Authentication required.');
    if (
      !this.roleService.isOwner() &&
      params.task.assignedStaffId === user.uid
    ) {
      throw new Error('Staff cannot approve or inspect their own cleaning task.');
    }
    if (params.outcome === 'Rejected' && !params.rejectionReason?.trim()) {
      throw new Error('Rejection reason is required.');
    }

    const now = new Date().toISOString();
    const inspId = `INSP-${Date.now()}`;
    const room = this.rooms().find(
      (r) =>
        (params.task.roomId && r.id === params.task.roomId) ||
        (r.propertyId === params.task.propertyId && r.number === params.task.room),
    );

    const record: RoomInspectionRecord = {
      id: inspId,
      taskId: params.task.id,
      organizationId: this.roleService.currentOrganizationId(),
      propertyId: params.task.propertyId || '',
      roomId: room?.id || params.task.roomId || params.task.room,
      roomNumber: params.task.room,
      inspectorUid: user.uid,
      inspectorName: user.name || user.email || 'Inspector',
      checklist: params.checklist,
      notes: params.notes.trim(),
      photos: params.photos,
      outcome: params.outcome,
      rejectionReason: params.rejectionReason?.trim(),
      createdAt: now,
    };

    await setDoc(
      doc(this.firebaseService.dbInstance, 'housekeepingInspections', inspId),
      this.stripUndefined(record),
    );

    await updateDoc(doc(this.firebaseService.dbInstance, 'housekeeping', params.task.id), {
      status: params.outcome === 'Approved' ? 'Approved' : 'Rejected',
      verifiedBy: user.name || user.email || 'Inspector',
      verifiedAt: now,
      rejectionReason: params.rejectionReason?.trim() || '',
      updatedAt: now,
    });

    if (room) {
      if (params.outcome === 'Approved') {
        const canBeAvailable =
          room.status !== 'Occupied' &&
          room.operationalStatus !== 'maintenance' &&
          room.operationalStatus !== 'blocked';
        await this.lodgeData.updateRoom(room.id, {
          housekeepingStatus: 'Inspected',
          lastInspectedAt: now,
          lastInspectedBy: user.name || user.email || 'Inspector',
          status: canBeAvailable ? 'Available' : room.status,
        });
      } else {
        await this.lodgeData.updateRoom(room.id, {
          housekeepingStatus: 'Dirty',
          status: room.status === 'Occupied' ? 'Occupied' : 'Dirty',
        });
      }
    }
  }

  async reportMaintenanceIssue(params: {
    propertyId: string;
    room: RoomItem;
    taskId?: string;
    category: MaintenanceIssueItem['category'];
    description: string;
    severity: MaintenanceIssueItem['severity'];
    markOutOfService: boolean;
  }): Promise<string> {
    const user = this.roleService.currentUserProfile();
    if (!user) throw new Error('Authentication required.');
    const id = `MNT-${Date.now()}`;
    const now = new Date().toISOString();

    const issue: MaintenanceIssueItem = {
      id,
      organizationId: this.roleService.currentOrganizationId(),
      propertyId: params.propertyId,
      roomId: params.room.id,
      roomNumber: params.room.number,
      taskId: params.taskId,
      category: params.category,
      description: params.description.trim(),
      severity: params.severity,
      status: 'Open',
      markOutOfService: params.markOutOfService,
      reportedBy: user.name || user.email || 'Staff',
      reportedByUid: user.uid,
      createdAt: now,
    };

    await setDoc(
      doc(this.firebaseService.dbInstance, 'maintenanceIssues', id),
      this.stripUndefined(issue),
    );

    if (params.markOutOfService) {
      await this.lodgeData.updateRoom(params.room.id, {
        operationalStatus: 'maintenance',
        housekeepingStatus: 'Out of Service',
        status: 'Maintenance',
      });
    }
    return id;
  }

  uploadTaskPhoto(
    lodgeId: string,
    roomId: string,
    taskId: string,
    file: File,
    onProgress?: (pct: number) => void,
  ): Promise<string> {
    if (!ALLOWED_HK_IMG_TYPES.includes(file.type)) {
      return Promise.reject(new Error('Unsupported format. Use JPG, PNG, or WebP.'));
    }
    if (file.size > MAX_HK_IMG_BYTES) {
      return Promise.reject(new Error('Photo exceeds 5 MB limit.'));
    }

    const orgId = this.roleService.currentOrganizationId();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `businesses/${orgId}/lodges/${lodgeId}/rooms/${roomId}/housekeeping/${taskId}/${Date.now()}_${safeName}`;
    const storageRef = ref(this.firebaseService.storageInstance, path);

    return new Promise((resolve, reject) => {
      const task = uploadBytesResumable(storageRef, file, { contentType: file.type });
      task.on(
        'state_changed',
        (snap) => {
          if (onProgress && snap.totalBytes > 0) {
            this.ngZone.run(() =>
              onProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
            );
          }
        },
        (e) => reject(e),
        async () => {
          try {
            const url = await getDownloadURL(task.snapshot.ref);
            resolve(url);
          } catch (e) {
            reject(e);
          }
        },
      );
    });
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
