import { Injectable, NgZone, computed, inject, signal } from '@angular/core';
import {
  collection,
  doc,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
  Unsubscribe,
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import {
  MaintenanceCategory,
  MaintenancePriority,
  MaintenanceRequestItem,
  MaintenanceRequestStatus,
  RoomItem,
  WorkOrderIssuedItem,
  WorkOrderItem,
  WorkOrderStatus,
} from '../interface';
import { FirebaseService } from './firebase.service';
import { LodgeDataService } from './lodge-data.service';
import { OperationsInventoryService } from './operations-inventory.service';
import { PropertyService } from './property.service';
import { RoleService } from './role.service';

@Injectable({
  providedIn: 'root',
})
export class MaintenanceService {
  private readonly firebaseService = inject(FirebaseService);
  private readonly lodgeData = inject(LodgeDataService);
  private readonly propertyService = inject(PropertyService);
  private readonly roleService = inject(RoleService);
  private readonly opsInventory = inject(OperationsInventoryService);
  private readonly ngZone = inject(NgZone);

  private readonly rawRequests = signal<MaintenanceRequestItem[]>([]);
  private readonly rawWorkOrders = signal<WorkOrderItem[]>([]);

  private unsubRequests: Unsubscribe | null = null;
  private unsubWorkOrders: Unsubscribe | null = null;

  readonly requests = computed<MaintenanceRequestItem[]>(() => {
    const allowed = new Set(
      this.propertyService.accessibleProperties().map((p) => p.id),
    );
    return [...this.rawRequests()]
      .filter((r) => this.roleService.isOwner() || allowed.has(r.propertyId))
      .sort((a, b) => (b.reportedAt || '').localeCompare(a.reportedAt || ''));
  });

  readonly workOrders = computed<WorkOrderItem[]>(() => {
    const allowed = new Set(
      this.propertyService.accessibleProperties().map((p) => p.id),
    );
    return [...this.rawWorkOrders()]
      .filter((w) => this.roleService.isOwner() || allowed.has(w.propertyId))
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  });

  readonly rooms = computed<RoomItem[]>(() => {
    const allowed = new Set(
      this.propertyService.accessibleProperties().map((p) => p.id),
    );
    return this.lodgeData
      .allRooms()
      .filter((r) => this.roleService.isOwner() || !r.propertyId || allowed.has(r.propertyId));
  });

  constructor() {
    this.firebaseService.currentUser$.subscribe((user) => {
      if (user) this.startListeners();
      else this.stopListeners();
    });
  }

  private startListeners(): void {
    const orgId = this.roleService.currentOrganizationId();
    if (!orgId) return;
    const db = this.firebaseService.dbInstance;

    if (!this.unsubRequests) {
      const q = query(
        collection(db, 'maintenanceRequests'),
        where('organizationId', '==', orgId),
      );
      this.unsubRequests = onSnapshot(q, (snap) => {
        const list = snap.docs.map(
          (d) => ({ ...d.data(), id: d.id }) as MaintenanceRequestItem,
        );
        this.ngZone.run(() => this.rawRequests.set(list));
      });
    }

    if (!this.unsubWorkOrders) {
      const q = query(
        collection(db, 'workOrders'),
        where('organizationId', '==', orgId),
      );
      this.unsubWorkOrders = onSnapshot(q, (snap) => {
        const list = snap.docs.map(
          (d) => ({ ...d.data(), id: d.id }) as WorkOrderItem,
        );
        this.ngZone.run(() => this.rawWorkOrders.set(list));
      });
    }
  }

  private stopListeners(): void {
    this.unsubRequests?.();
    this.unsubRequests = null;
    this.unsubWorkOrders?.();
    this.unsubWorkOrders = null;
    this.rawRequests.set([]);
    this.rawWorkOrders.set([]);
  }

  private stripUndefined<T extends object>(obj: T): T {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (v !== undefined) out[k] = v;
    }
    return out as T;
  }

  async uploadMaintenancePhoto(
    lodgeId: string,
    entityId: string,
    file: File,
  ): Promise<string> {
    const orgId = this.roleService.currentOrganizationId();
    const path = `businesses/${orgId}/lodges/${lodgeId}/maintenance/${entityId}/${Date.now()}_${file.name}`;
    const storageRef = ref(this.firebaseService.storageInstance, path);
    await uploadBytes(storageRef, file);
    return getDownloadURL(storageRef);
  }

  async createRequest(params: {
    propertyId: string;
    roomId?: string;
    roomNumber?: string;
    areaName?: string;
    category: MaintenanceCategory;
    title: string;
    description: string;
    priority: MaintenancePriority;
    photos?: string[];
    notes?: string;
    markRoomOutOfService?: boolean;
  }): Promise<string> {
    const db = this.firebaseService.dbInstance;
    const orgId = this.roleService.currentOrganizationId();
    const user = this.roleService.currentUserProfile();
    const id = `MREQ-${Date.now()}`;
    const now = new Date().toISOString();

    const req: MaintenanceRequestItem = this.stripUndefined({
      id,
      organizationId: orgId,
      propertyId: params.propertyId,
      roomId: params.roomId,
      roomNumber: params.roomNumber,
      areaName: params.areaName,
      category: params.category,
      title: params.title.trim(),
      description: params.description.trim(),
      priority: params.priority,
      status: 'Reported',
      photos: params.photos || [],
      notes: params.notes?.trim(),
      markRoomOutOfService: Boolean(params.markRoomOutOfService),
      reportedBy: user?.name || user?.email || 'Staff',
      reportedByUid: user?.uid || '',
      reportedAt: now,
      updatedAt: now,
    });

    await setDoc(doc(db, 'maintenanceRequests', id), req);

    if (params.markRoomOutOfService && params.roomId) {
      await this.setRoomMaintenanceBlock(params.roomId, true);
    }

    return id;
  }

  async reviewRequest(
    requestId: string,
    status: MaintenanceRequestStatus,
    rejectionReason?: string,
  ): Promise<void> {
    const user = this.roleService.currentUserProfile();
    const now = new Date().toISOString();
    await updateDoc(
      doc(this.firebaseService.dbInstance, 'maintenanceRequests', requestId),
      this.stripUndefined({
        status,
        reviewedBy: user?.name || user?.email || 'Manager',
        reviewedAt: now,
        rejectionReason,
        updatedAt: now,
      }),
    );
  }

  async createWorkOrderFromRequest(params: {
    request: MaintenanceRequestItem;
    assignedTechnicianUid?: string;
    assignedTechnicianName: string;
    repairDescription: string;
    requiredParts?: string;
    dueDate?: string;
  }): Promise<string> {
    const db = this.firebaseService.dbInstance;
    const orgId = this.roleService.currentOrganizationId();
    const user = this.roleService.currentUserProfile();
    const id = `WO-${Date.now()}`;
    const workOrderNumber = `WO-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;
    const now = new Date().toISOString();

    const wo: WorkOrderItem = this.stripUndefined({
      id,
      workOrderNumber,
      requestId: params.request.id,
      organizationId: orgId,
      propertyId: params.request.propertyId,
      roomId: params.request.roomId,
      roomNumber: params.request.roomNumber,
      areaName: params.request.areaName,
      category: params.request.category,
      priority: params.request.priority,
      assignedTechnicianUid: params.assignedTechnicianUid,
      assignedTechnicianName: params.assignedTechnicianName,
      repairDescription: params.repairDescription.trim(),
      requiredParts: params.requiredParts?.trim(),
      issuedItems: [],
      linkedPurchaseOrderIds: [],
      labourCost: 0,
      materialCost: 0,
      totalCost: 0,
      status: 'Assigned',
      beforePhotos: params.request.photos || [],
      afterPhotos: [],
      dueDate: params.dueDate,
      createdBy: user?.name || user?.email || 'Manager',
      createdByUid: user?.uid || '',
      createdAt: now,
      updatedAt: now,
    });

    await setDoc(doc(db, 'workOrders', id), wo);
    await updateDoc(doc(db, 'maintenanceRequests', params.request.id), {
      status: 'Assigned',
      workOrderId: id,
      updatedAt: now,
    });

    return id;
  }

  async updateWorkOrderStatus(
    workOrderId: string,
    status: WorkOrderStatus,
    extra?: Partial<WorkOrderItem>,
  ): Promise<void> {
    const now = new Date().toISOString();
    await updateDoc(
      doc(this.firebaseService.dbInstance, 'workOrders', workOrderId),
      this.stripUndefined({
        ...extra,
        status,
        updatedAt: now,
      }),
    );

    const wo = this.workOrders().find((w) => w.id === workOrderId);
    if (wo?.requestId) {
      const reqStatusMap: Partial<Record<WorkOrderStatus, MaintenanceRequestStatus>> = {
        Assigned: 'Assigned',
        'In Progress': 'In Progress',
        'Waiting for Parts': 'Waiting for Parts',
        Completed: 'Completed',
        Verified: 'Verified',
        Closed: 'Verified',
        Cancelled: 'Cancelled',
      };
      const nextReqStatus = reqStatusMap[status];
      if (nextReqStatus) {
        await updateDoc(doc(this.firebaseService.dbInstance, 'maintenanceRequests', wo.requestId), {
          status: nextReqStatus,
          updatedAt: now,
        });
      }
    }
  }

  async issuePartToWorkOrder(params: {
    workOrder: WorkOrderItem;
    itemId: string;
    quantity: number;
    notes?: string;
  }): Promise<void> {
    const user = this.roleService.currentUserProfile();
    const issueResult = await this.opsInventory.issueStock({
      itemId: params.itemId,
      quantity: params.quantity,
      department: 'Maintenance',
      issuedTo: params.workOrder.assignedTechnicianName,
      reason: `Issued to Work Order ${params.workOrder.workOrderNumber}`,
      referenceType: 'WorkOrder',
      referenceId: params.workOrder.id,
      notes: params.notes,
    });

    const newIssued: WorkOrderIssuedItem = {
      movementId: issueResult.movementId,
      itemId: params.itemId,
      itemName: issueResult.itemName,
      unit: issueResult.unit,
      quantity: params.quantity,
      returnedQuantity: 0,
      unitCost: issueResult.unitCost,
      totalCost: issueResult.totalCost,
      issuedAt: new Date().toISOString(),
      issuedBy: user?.name || user?.email || 'User',
    };

    const nextIssued = [...(params.workOrder.issuedItems || []), newIssued];
    const materialCost = nextIssued.reduce((s, i) => s + i.totalCost, 0);
    const totalCost = materialCost + (params.workOrder.labourCost || 0);

    await updateDoc(doc(this.firebaseService.dbInstance, 'workOrders', params.workOrder.id), {
      issuedItems: nextIssued,
      materialCost,
      totalCost,
      updatedAt: new Date().toISOString(),
    });
  }

  async returnPartFromWorkOrder(params: {
    workOrder: WorkOrderItem;
    issuedIndex: number;
    returnQuantity: number;
    reason: string;
  }): Promise<void> {
    const line = params.workOrder.issuedItems[params.issuedIndex];
    if (!line) throw new Error('Issued part line not found.');
    const remaining = line.quantity - (line.returnedQuantity || 0);
    if (params.returnQuantity <= 0 || params.returnQuantity > remaining) {
      throw new Error(`Return quantity must be between 1 and ${remaining}.`);
    }

    await this.opsInventory.returnStock({
      itemId: line.itemId,
      quantity: params.returnQuantity,
      originalMovementId: line.movementId,
      workOrderId: params.workOrder.id,
      reason: params.reason || `Unused part returned from ${params.workOrder.workOrderNumber}`,
    });

    const updatedIssued = params.workOrder.issuedItems.map((item, idx) => {
      if (idx !== params.issuedIndex) return item;
      const nextReturned = (item.returnedQuantity || 0) + params.returnQuantity;
      const netQty = Math.max(0, item.quantity - nextReturned);
      return {
        ...item,
        returnedQuantity: nextReturned,
        totalCost: netQty * item.unitCost,
      };
    });

    const materialCost = updatedIssued.reduce((s, i) => s + i.totalCost, 0);
    const totalCost = materialCost + (params.workOrder.labourCost || 0);

    await updateDoc(doc(this.firebaseService.dbInstance, 'workOrders', params.workOrder.id), {
      issuedItems: updatedIssued,
      materialCost,
      totalCost,
      updatedAt: new Date().toISOString(),
    });
  }

  async completeWorkOrder(params: {
    workOrder: WorkOrderItem;
    labourCost: number;
    completionNotes: string;
    afterPhotos: string[];
  }): Promise<void> {
    const now = new Date().toISOString();
    const materialCost = (params.workOrder.issuedItems || []).reduce(
      (s, i) => s + i.totalCost,
      0,
    );
    const totalCost = materialCost + Number(params.labourCost || 0);

    await this.updateWorkOrderStatus(params.workOrder.id, 'Completed', {
      labourCost: Number(params.labourCost || 0),
      materialCost,
      totalCost,
      completionNotes: params.completionNotes.trim(),
      afterPhotos: params.afterPhotos,
      completedAt: now,
    });
  }

  async verifyAndCloseWorkOrder(params: {
    workOrder: WorkOrderItem;
    verificationNotes?: string;
    restoreRoomIfClean?: boolean;
    recordLabourExpense?: boolean;
  }): Promise<void> {
    const user = this.roleService.currentUserProfile();
    const now = new Date().toISOString();

    await this.updateWorkOrderStatus(params.workOrder.id, 'Closed', {
      verifiedBy: user?.name || user?.email || 'Manager',
      verifiedByUid: user?.uid,
      verifiedAt: now,
      verificationNotes: params.verificationNotes?.trim(),
    });

    if (params.recordLabourExpense && params.workOrder.labourCost > 0) {
      await this.lodgeData.addExpense({
        propertyId: params.workOrder.propertyId,
        title: `Maintenance Labour - ${params.workOrder.workOrderNumber}`,
        category: 'Maintenance',
        amount: params.workOrder.labourCost,
        expenseDate: now.slice(0, 10),
        paymentMethod: 'Cash',
        vendor: params.workOrder.assignedTechnicianName,
        description: params.workOrder.repairDescription,
      });
    }

    if (params.restoreRoomIfClean && params.workOrder.roomId) {
      const room = this.rooms().find((r) => r.id === params.workOrder.roomId);
      if (room) {
        const hk = room.housekeepingStatus || 'Clean';
        const isHkClear = hk === 'Clean' || hk === 'Inspected';
        await this.lodgeData.updateRoom(room.id, {
          operationalStatus: 'active',
          status:
            room.status === 'Occupied'
              ? 'Occupied'
              : isHkClear
                ? 'Available'
                : 'Dirty',
        });
      }
    }
  }

  async setRoomMaintenanceBlock(
    roomId: string,
    blocked: boolean,
  ): Promise<void> {
    const room = this.rooms().find((r) => r.id === roomId);
    if (!room) return;
    if (blocked) {
      await this.lodgeData.updateRoom(roomId, {
        operationalStatus: 'maintenance',
        status: room.status === 'Occupied' ? 'Occupied' : 'Maintenance',
      });
    } else {
      const hk = room.housekeepingStatus || 'Clean';
      const isHkClear = hk === 'Clean' || hk === 'Inspected';
      await this.lodgeData.updateRoom(roomId, {
        operationalStatus: 'active',
        status:
          room.status === 'Occupied'
            ? 'Occupied'
            : isHkClear
              ? 'Available'
              : 'Dirty',
      });
    }
  }
}
