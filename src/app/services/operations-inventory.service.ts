import { Injectable, NgZone, computed, inject, signal } from '@angular/core';
import {
  collection,
  doc,
  onSnapshot,
  query,
  runTransaction,
  setDoc,
  updateDoc,
  where,
  Unsubscribe,
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import {
  INVENTORY_CATEGORIES,
  INVENTORY_UNITS,
  InventoryItem,
  InventoryItemFormData,
  InventoryStockStatus,
  InventoryTaxonomyConfig,
  PurchaseOrderItem,
  PurchaseOrderLineItem,
  PurchaseOrderStatus,
  StockMovement,
  StockTransferItem,
  StorageLocationItem,
  SupplierItem,
} from '../interface';
import { FirebaseService } from './firebase.service';
import { LodgeDataService } from './lodge-data.service';
import { PropertyService } from './property.service';
import { RoleService } from './role.service';

export interface LowStockAlertItem {
  item: InventoryItem;
  alertType: 'Out of Stock' | 'Low Stock' | 'Expiring Soon' | 'Expired';
}

@Injectable({
  providedIn: 'root',
})
export class OperationsInventoryService {
  private readonly firebaseService = inject(FirebaseService);
  private readonly lodgeData = inject(LodgeDataService);
  private readonly propertyService = inject(PropertyService);
  private readonly roleService = inject(RoleService);
  private readonly ngZone = inject(NgZone);

  private readonly rawSuppliers = signal<SupplierItem[]>([]);
  private readonly rawPurchaseOrders = signal<PurchaseOrderItem[]>([]);
  private readonly rawTransfers = signal<StockTransferItem[]>([]);
  private readonly rawLocations = signal<StorageLocationItem[]>([]);
  private readonly taxonomyConfig = signal<InventoryTaxonomyConfig | null>(null);

  private unsubSuppliers: Unsubscribe | null = null;
  private unsubPOs: Unsubscribe | null = null;
  private unsubTransfers: Unsubscribe | null = null;
  private unsubLocations: Unsubscribe | null = null;
  private unsubTaxonomy: Unsubscribe | null = null;

  readonly items = computed<InventoryItem[]>(() => {
    const allowed = new Set(
      this.propertyService.accessibleProperties().map((p) => p.id),
    );
    return this.lodgeData
      .allInventory()
      .filter((i) => !i.propertyId || allowed.has(i.propertyId));
  });

  readonly movements = computed<StockMovement[]>(() => {
    const allowed = new Set(
      this.propertyService.accessibleProperties().map((p) => p.id),
    );
    return this.lodgeData
      .stockMovements()
      .filter((m) => !m.propertyId || allowed.has(m.propertyId))
      .sort((a, b) =>
        (b.timestamp || b.createdAt || '').localeCompare(
          a.timestamp || a.createdAt || '',
        ),
      );
  });

  readonly suppliers = computed<SupplierItem[]>(() =>
    [...this.rawSuppliers()].sort((a, b) => a.name.localeCompare(b.name)),
  );

  readonly activeSuppliers = computed<SupplierItem[]>(() =>
    this.suppliers().filter((s) => s.status === 'Active'),
  );

  readonly purchaseOrders = computed<PurchaseOrderItem[]>(() => {
    const allowed = new Set(
      this.propertyService.accessibleProperties().map((p) => p.id),
    );
    return [...this.rawPurchaseOrders()]
      .filter((po) => this.roleService.isOwner() || allowed.has(po.propertyId))
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  });

  readonly stockTransfers = computed<StockTransferItem[]>(() => {
    const allowed = new Set(
      this.propertyService.accessibleProperties().map((p) => p.id),
    );
    return [...this.rawTransfers()]
      .filter(
        (t) =>
          this.roleService.isOwner() ||
          allowed.has(t.sourcePropertyId) ||
          allowed.has(t.destinationPropertyId),
      )
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  });

  readonly storageLocations = computed<StorageLocationItem[]>(() => {
    const allowed = new Set(
      this.propertyService.accessibleProperties().map((p) => p.id),
    );
    return [...this.rawLocations()]
      .filter((l) => this.roleService.isOwner() || allowed.has(l.propertyId))
      .sort((a, b) => a.name.localeCompare(b.name));
  });

  readonly categories = computed<string[]>(() => {
    const custom = this.taxonomyConfig()?.customCategories || [];
    return Array.from(new Set([...INVENTORY_CATEGORIES, ...custom]));
  });

  readonly units = computed<string[]>(() => {
    const custom = this.taxonomyConfig()?.customUnits || [];
    return Array.from(new Set([...INVENTORY_UNITS, ...custom]));
  });

  readonly stockAlerts = computed<LowStockAlertItem[]>(() => {
    const alerts: LowStockAlertItem[] = [];
    const now = Date.now();
    const soonThreshold = now + 30 * 24 * 60 * 60 * 1000;

    for (const item of this.items()) {
      if ((item.quantity || 0) <= 0) {
        alerts.push({ item, alertType: 'Out of Stock' });
      } else if ((item.quantity || 0) <= (item.min || 0)) {
        alerts.push({ item, alertType: 'Low Stock' });
      }

      if (item.expiryDate) {
        const expMs = Date.parse(item.expiryDate);
        if (!Number.isNaN(expMs)) {
          if (expMs < now) {
            alerts.push({ item, alertType: 'Expired' });
          } else if (expMs <= soonThreshold) {
            alerts.push({ item, alertType: 'Expiring Soon' });
          }
        }
      }
    }
    return alerts;
  });

  constructor() {
    this.firebaseService.currentUser$.subscribe((user) => {
      if (user) {
        this.startListeners();
      } else {
        this.stopListeners();
      }
    });
  }

  private startListeners(): void {
    const orgId = this.roleService.currentOrganizationId();
    if (!orgId) return;
    const db = this.firebaseService.dbInstance;

    if (!this.unsubSuppliers) {
      const q = query(
        collection(db, 'suppliers'),
        where('organizationId', '==', orgId),
      );
      this.unsubSuppliers = onSnapshot(q, (snap) => {
        const list = snap.docs.map(
          (d) => ({ ...d.data(), id: d.id }) as SupplierItem,
        );
        this.ngZone.run(() => this.rawSuppliers.set(list));
      });
    }

    if (!this.unsubPOs) {
      const q = query(
        collection(db, 'purchaseOrders'),
        where('organizationId', '==', orgId),
      );
      this.unsubPOs = onSnapshot(q, (snap) => {
        const list = snap.docs.map(
          (d) => ({ ...d.data(), id: d.id }) as PurchaseOrderItem,
        );
        this.ngZone.run(() => this.rawPurchaseOrders.set(list));
      });
    }

    if (!this.unsubTransfers) {
      const q = query(
        collection(db, 'stockTransfers'),
        where('organizationId', '==', orgId),
      );
      this.unsubTransfers = onSnapshot(q, (snap) => {
        const list = snap.docs.map(
          (d) => ({ ...d.data(), id: d.id }) as StockTransferItem,
        );
        this.ngZone.run(() => this.rawTransfers.set(list));
      });
    }

    if (!this.unsubLocations) {
      const q = query(
        collection(db, 'storageLocations'),
        where('organizationId', '==', orgId),
      );
      this.unsubLocations = onSnapshot(q, (snap) => {
        const list = snap.docs.map(
          (d) => ({ ...d.data(), id: d.id }) as StorageLocationItem,
        );
        this.ngZone.run(() => this.rawLocations.set(list));
      });
    }

    if (!this.unsubTaxonomy) {
      this.unsubTaxonomy = onSnapshot(
        doc(db, 'inventorySettings', orgId),
        (snap) => {
          this.ngZone.run(() => {
            this.taxonomyConfig.set(
              snap.exists() ? (snap.data() as InventoryTaxonomyConfig) : null,
            );
          });
        },
      );
    }
  }

  private stopListeners(): void {
    this.unsubSuppliers?.();
    this.unsubSuppliers = null;
    this.unsubPOs?.();
    this.unsubPOs = null;
    this.unsubTransfers?.();
    this.unsubTransfers = null;
    this.unsubLocations?.();
    this.unsubLocations = null;
    this.unsubTaxonomy?.();
    this.unsubTaxonomy = null;
    this.rawSuppliers.set([]);
    this.rawPurchaseOrders.set([]);
    this.rawTransfers.set([]);
    this.rawLocations.set([]);
    this.taxonomyConfig.set(null);
  }

  computeStockStatus(qty: number, min: number): InventoryStockStatus {
    if (qty <= 0) return 'Out of Stock';
    if (qty <= min) return 'Low Stock Alerts';
    return 'In stock';
  }

  private stripUndefined<T extends object>(obj: T): T {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (v !== undefined) out[k] = v;
    }
    return out as T;
  }

  async uploadItemImage(
    itemId: string,
    file: File,
  ): Promise<string> {
    const orgId = this.roleService.currentOrganizationId();
    const path = `businesses/${orgId}/inventory/${itemId}/${Date.now()}_${file.name}`;
    const storageRef = ref(this.firebaseService.storageInstance, path);
    await uploadBytes(storageRef, file);
    return getDownloadURL(storageRef);
  }

  async createInventoryItem(data: InventoryItemFormData): Promise<string> {
    const db = this.firebaseService.dbInstance;
    const orgId = this.roleService.currentOrganizationId();
    const user = this.roleService.currentUserProfile();
    const itemId = `INV-${Date.now()}`;
    const now = new Date().toISOString();
    const qty = Number(data.quantity || 0);
    const min = Number(data.min || 0);

    const item: InventoryItem = this.stripUndefined({
      id: itemId,
      organizationId: orgId,
      propertyId: data.propertyId,
      name: data.name.trim(),
      category: data.category,
      sku: data.sku?.trim() || `SKU-${Date.now().toString().slice(-6)}`,
      description: data.description?.trim(),
      brand: data.brand?.trim(),
      imageUrl: data.imageUrl,
      unit: data.unit,
      openingStock: Number(data.openingStock ?? qty),
      quantity: qty,
      inTransitQuantity: 0,
      usedQuantity: 0,
      damagedQuantity: 0,
      min,
      reorderQuantity: Number(data.reorderQuantity || Math.max(min * 2, 10)),
      storageLocation: data.storageLocation?.trim() || 'Main Store',
      purchasePrice: Number(data.purchasePrice || 0),
      supplier: data.supplier?.trim(),
      preferredSupplierId: data.preferredSupplierId,
      trackingType: data.trackingType || 'Consumable',
      serialNumber: data.serialNumber?.trim(),
      batchNumber: data.batchNumber?.trim(),
      expiryDate: data.expiryDate,
      allowNegativeStock: Boolean(data.allowNegativeStock),
      status: this.computeStockStatus(qty, min),
      createdAt: now,
      lastUpdated: now,
    });

    await setDoc(doc(db, 'inventory', itemId), item);

    if (qty > 0) {
      const movId = `SM-${Date.now()}`;
      const mov: StockMovement = this.stripUndefined({
        id: movId,
        organizationId: orgId,
        propertyId: data.propertyId,
        itemId,
        itemName: item.name,
        change: qty,
        quantity: qty,
        delta: `+${qty}`,
        type: 'Purchase',
        movementType: 'Opening Stock',
        unitCost: item.purchasePrice || 0,
        referenceType: 'Manual',
        toLocation: item.storageLocation,
        reason: 'Opening stock recorded on item creation',
        performedBy: user?.name || user?.email || 'User',
        performedById: user?.uid,
        timestamp: now,
        createdAt: now,
        tone: 'success',
      });
      await setDoc(doc(db, 'inventory_movements', movId), mov);
    }

    return itemId;
  }

  async addCustomCategory(category: string): Promise<void> {
    const clean = category.trim();
    if (!clean) return;
    const orgId = this.roleService.currentOrganizationId();
    const db = this.firebaseService.dbInstance;
    const existing = this.taxonomyConfig();
    const nextCats = Array.from(
      new Set([...(existing?.customCategories || []), clean]),
    );
    await setDoc(
      doc(db, 'inventorySettings', orgId),
      {
        id: orgId,
        organizationId: orgId,
        customCategories: nextCats,
        customUnits: existing?.customUnits || [],
        updatedAt: new Date().toISOString(),
      },
      { merge: true },
    );
  }

  async addCustomUnit(unit: string): Promise<void> {
    const clean = unit.trim();
    if (!clean) return;
    const orgId = this.roleService.currentOrganizationId();
    const db = this.firebaseService.dbInstance;
    const existing = this.taxonomyConfig();
    const nextUnits = Array.from(
      new Set([...(existing?.customUnits || []), clean]),
    );
    await setDoc(
      doc(db, 'inventorySettings', orgId),
      {
        id: orgId,
        organizationId: orgId,
        customCategories: existing?.customCategories || [],
        customUnits: nextUnits,
        updatedAt: new Date().toISOString(),
      },
      { merge: true },
    );
  }

  async recordStockInward(params: {
    itemId: string;
    quantity: number;
    unitPrice: number;
    supplierName?: string;
    storageLocation?: string;
    invoiceNumber?: string;
    batchNumber?: string;
    expiryDate?: string;
    notes?: string;
    referenceType?: StockMovement['referenceType'];
    referenceId?: string;
  }): Promise<string> {
    if (params.quantity <= 0) throw new Error('Received quantity must be greater than zero.');
    const db = this.firebaseService.dbInstance;
    const user = this.roleService.currentUserProfile();
    const orgId = this.roleService.currentOrganizationId();
    const now = new Date().toISOString();
    const movId = `SM-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    await runTransaction(db, async (tx) => {
      const itemRef = doc(db, 'inventory', params.itemId);
      const itemSnap = await tx.get(itemRef);
      if (!itemSnap.exists()) throw new Error('Inventory item not found.');

      const item = itemSnap.data() as InventoryItem;
      const newQty = (item.quantity || 0) + params.quantity;
      const status = this.computeStockStatus(newQty, item.min || 0);

      tx.update(
        itemRef,
        this.stripUndefined({
          quantity: newQty,
          status,
          purchasePrice: params.unitPrice > 0 ? params.unitPrice : item.purchasePrice,
          supplier: params.supplierName || item.supplier,
          storageLocation: params.storageLocation || item.storageLocation,
          batchNumber: params.batchNumber || item.batchNumber,
          expiryDate: params.expiryDate || item.expiryDate,
          lastPurchaseDate: now,
          lastUpdated: now,
        }),
      );

      const mov: StockMovement = this.stripUndefined({
        id: movId,
        organizationId: orgId,
        propertyId: item.propertyId || '',
        itemId: item.id,
        itemName: item.name,
        change: params.quantity,
        quantity: params.quantity,
        delta: `+${params.quantity}`,
        type: 'Purchase',
        movementType: 'Purchase In',
        unitCost: params.unitPrice,
        cost: params.unitPrice * params.quantity,
        supplier: params.supplierName,
        invoiceNumber: params.invoiceNumber,
        batchNumber: params.batchNumber,
        expiryDate: params.expiryDate,
        toLocation: params.storageLocation || item.storageLocation,
        referenceType: params.referenceType || 'Manual',
        referenceId: params.referenceId,
        reason: params.notes || 'Stock inward receipt',
        notes: params.notes,
        performedBy: user?.name || user?.email || 'User',
        performedById: user?.uid,
        timestamp: now,
        createdAt: now,
        tone: 'success',
      });
      tx.set(doc(db, 'inventory_movements', movId), mov);
    });

    return movId;
  }

  async issueStock(params: {
    itemId: string;
    quantity: number;
    department: NonNullable<StockMovement['department']>;
    issuedTo: string;
    reason: string;
    referenceType?: StockMovement['referenceType'];
    referenceId?: string;
    notes?: string;
  }): Promise<{ movementId: string; unitCost: number; totalCost: number; itemName: string; unit: string }> {
    if (params.quantity <= 0) throw new Error('Issue quantity must be greater than zero.');
    const db = this.firebaseService.dbInstance;
    const user = this.roleService.currentUserProfile();
    const orgId = this.roleService.currentOrganizationId();
    const now = new Date().toISOString();
    const movId = `SM-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    let unitCost = 0;
    let itemName = '';
    let unit = 'Piece';

    await runTransaction(db, async (tx) => {
      const itemRef = doc(db, 'inventory', params.itemId);
      const itemSnap = await tx.get(itemRef);
      if (!itemSnap.exists()) throw new Error('Inventory item not found.');

      const item = itemSnap.data() as InventoryItem;
      const currentQty = item.quantity || 0;
      if (!item.allowNegativeStock && currentQty < params.quantity) {
        throw new Error(
          `Insufficient stock for ${item.name}. Available: ${currentQty} ${item.unit}.`,
        );
      }

      unitCost = Number(item.purchasePrice || 0);
      itemName = item.name;
      unit = item.unit || 'Piece';
      const newQty = currentQty - params.quantity;

      tx.update(itemRef, {
        quantity: newQty,
        usedQuantity: (item.usedQuantity || 0) + params.quantity,
        status: this.computeStockStatus(newQty, item.min || 0),
        lastUpdated: now,
      });

      const mov: StockMovement = this.stripUndefined({
        id: movId,
        organizationId: orgId,
        propertyId: item.propertyId || '',
        itemId: item.id,
        itemName: item.name,
        change: -params.quantity,
        quantity: params.quantity,
        delta: `-${params.quantity}`,
        type: 'Consumption',
        movementType: 'Issue Out',
        unitCost,
        cost: unitCost * params.quantity,
        department: params.department,
        issuedTo: params.issuedTo,
        fromLocation: item.storageLocation,
        referenceType: params.referenceType || 'Manual',
        referenceId: params.referenceId,
        reason: params.reason,
        notes: params.notes,
        performedBy: user?.name || user?.email || 'User',
        performedById: user?.uid,
        timestamp: now,
        createdAt: now,
        tone: 'warm',
      });
      tx.set(doc(db, 'inventory_movements', movId), mov);
    });

    return {
      movementId: movId,
      unitCost,
      totalCost: unitCost * params.quantity,
      itemName,
      unit,
    };
  }

  async returnStock(params: {
    itemId: string;
    quantity: number;
    originalMovementId?: string;
    workOrderId?: string;
    reason: string;
  }): Promise<string> {
    if (params.quantity <= 0) throw new Error('Return quantity must be greater than zero.');
    const db = this.firebaseService.dbInstance;
    const user = this.roleService.currentUserProfile();
    const orgId = this.roleService.currentOrganizationId();
    const now = new Date().toISOString();
    const movId = `SM-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    await runTransaction(db, async (tx) => {
      const itemRef = doc(db, 'inventory', params.itemId);
      const itemSnap = await tx.get(itemRef);
      if (!itemSnap.exists()) throw new Error('Inventory item not found.');
      const item = itemSnap.data() as InventoryItem;
      const newQty = (item.quantity || 0) + params.quantity;

      tx.update(itemRef, {
        quantity: newQty,
        usedQuantity: Math.max(0, (item.usedQuantity || 0) - params.quantity),
        status: this.computeStockStatus(newQty, item.min || 0),
        lastUpdated: now,
      });

      const mov: StockMovement = this.stripUndefined({
        id: movId,
        organizationId: orgId,
        propertyId: item.propertyId || '',
        itemId: item.id,
        itemName: item.name,
        change: params.quantity,
        quantity: params.quantity,
        delta: `+${params.quantity}`,
        type: 'Adjustment',
        movementType: 'Return In',
        unitCost: item.purchasePrice || 0,
        referenceType: params.workOrderId ? 'WorkOrder' : 'Manual',
        referenceId: params.workOrderId || params.originalMovementId,
        toLocation: item.storageLocation,
        reason: params.reason,
        performedBy: user?.name || user?.email || 'User',
        performedById: user?.uid,
        timestamp: now,
        createdAt: now,
        tone: 'success',
      });
      tx.set(doc(db, 'inventory_movements', movId), mov);
    });

    return movId;
  }

  async adjustStock(params: {
    itemId: string;
    delta: number;
    reason: string;
  }): Promise<string> {
    if (!params.reason.trim()) throw new Error('Adjustment reason is required.');
    if (params.delta === 0) throw new Error('Adjustment quantity cannot be zero.');

    const db = this.firebaseService.dbInstance;
    const user = this.roleService.currentUserProfile();
    const orgId = this.roleService.currentOrganizationId();
    const now = new Date().toISOString();
    const movId = `SM-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    await runTransaction(db, async (tx) => {
      const itemRef = doc(db, 'inventory', params.itemId);
      const snap = await tx.get(itemRef);
      if (!snap.exists()) throw new Error('Inventory item not found.');
      const item = snap.data() as InventoryItem;
      const newQty = (item.quantity || 0) + params.delta;
      if (!item.allowNegativeStock && newQty < 0) {
        throw new Error('Adjustment would cause negative stock.');
      }

      tx.update(itemRef, {
        quantity: newQty,
        status: this.computeStockStatus(newQty, item.min || 0),
        lastUpdated: now,
      });

      const mov: StockMovement = this.stripUndefined({
        id: movId,
        organizationId: orgId,
        propertyId: item.propertyId || '',
        itemId: item.id,
        itemName: item.name,
        change: params.delta,
        quantity: Math.abs(params.delta),
        delta: params.delta > 0 ? `+${params.delta}` : `${params.delta}`,
        type: 'Adjustment',
        movementType: params.delta > 0 ? 'Adjustment In' : 'Adjustment Out',
        referenceType: 'Manual',
        reason: params.reason.trim(),
        performedBy: user?.name || user?.email || 'User',
        performedById: user?.uid,
        approvedBy: user?.name || user?.email,
        timestamp: now,
        createdAt: now,
        tone: params.delta > 0 ? 'success' : 'danger',
      });
      tx.set(doc(db, 'inventory_movements', movId), mov);
    });

    return movId;
  }

  // --- Suppliers ---
  async saveSupplier(
    data: Omit<SupplierItem, 'id' | 'organizationId' | 'createdAt'>,
    existingId?: string,
  ): Promise<string> {
    const db = this.firebaseService.dbInstance;
    const orgId = this.roleService.currentOrganizationId();
    const now = new Date().toISOString();

    if (existingId) {
      await updateDoc(
        doc(db, 'suppliers', existingId),
        this.stripUndefined({ ...data, updatedAt: now }),
      );
      return existingId;
    }

    const id = `SUP-${Date.now()}`;
    const supplier: SupplierItem = this.stripUndefined({
      ...data,
      id,
      organizationId: orgId,
      createdAt: now,
      updatedAt: now,
    });
    await setDoc(doc(db, 'suppliers', id), supplier);
    return id;
  }

  async toggleSupplierStatus(supplier: SupplierItem): Promise<void> {
    const nextStatus = supplier.status === 'Active' ? 'Inactive' : 'Active';
    await updateDoc(doc(this.firebaseService.dbInstance, 'suppliers', supplier.id), {
      status: nextStatus,
      updatedAt: new Date().toISOString(),
    });
  }

  // --- Storage Locations ---
  async createStorageLocation(
    data: Omit<StorageLocationItem, 'id' | 'organizationId' | 'createdAt'>,
  ): Promise<string> {
    const db = this.firebaseService.dbInstance;
    const orgId = this.roleService.currentOrganizationId();
    const id = `LOC-${Date.now()}`;
    const loc: StorageLocationItem = this.stripUndefined({
      ...data,
      id,
      organizationId: orgId,
      createdAt: new Date().toISOString(),
    });
    await setDoc(doc(db, 'storageLocations', id), loc);
    return id;
  }

  // --- Purchase Orders ---
  async createPurchaseOrder(params: {
    propertyId: string;
    supplierId: string;
    supplierName: string;
    items: PurchaseOrderLineItem[];
    tax: number;
    discount: number;
    expectedDeliveryDate?: string;
    linkedWorkOrderId?: string;
    notes?: string;
    status?: PurchaseOrderStatus;
  }): Promise<string> {
    const db = this.firebaseService.dbInstance;
    const orgId = this.roleService.currentOrganizationId();
    const user = this.roleService.currentUserProfile();
    const id = `PO-${Date.now()}`;
    const poNumber = `PO-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;
    const now = new Date().toISOString();

    const subtotal = params.items.reduce(
      (sum, l) => sum + l.orderedQty * l.unitPrice,
      0,
    );
    const total = Math.max(0, subtotal + (params.tax || 0) - (params.discount || 0));

    const po: PurchaseOrderItem = this.stripUndefined({
      id,
      poNumber,
      organizationId: orgId,
      propertyId: params.propertyId,
      supplierId: params.supplierId,
      supplierName: params.supplierName,
      items: params.items,
      subtotal,
      tax: params.tax || 0,
      discount: params.discount || 0,
      total,
      expectedDeliveryDate: params.expectedDeliveryDate,
      status: params.status || 'Pending Approval',
      linkedWorkOrderId: params.linkedWorkOrderId,
      expenseRecorded: false,
      notes: params.notes,
      createdBy: user?.name || user?.email || 'User',
      createdByUid: user?.uid || '',
      createdAt: now,
      updatedAt: now,
    });

    await setDoc(doc(db, 'purchaseOrders', id), po);
    return id;
  }

  async updatePurchaseOrderStatus(
    poId: string,
    status: PurchaseOrderStatus,
  ): Promise<void> {
    const user = this.roleService.currentUserProfile();
    const now = new Date().toISOString();
    const updates: Record<string, unknown> = { status, updatedAt: now };
    if (status === 'Approved') {
      updates['approvedBy'] = user?.name || user?.email || 'Owner';
      updates['approvedAt'] = now;
    }
    await updateDoc(doc(this.firebaseService.dbInstance, 'purchaseOrders', poId), updates);
  }

  async receivePurchaseOrderItems(params: {
    poId: string;
    receivedMap: Record<string, number>;
    invoiceNumber?: string;
    storageLocation?: string;
    recordExpense?: boolean;
  }): Promise<void> {
    const db = this.firebaseService.dbInstance;
    const user = this.roleService.currentUserProfile();
    const orgId = this.roleService.currentOrganizationId();
    const now = new Date().toISOString();
    let receivedCostTotal = 0;
    let poRefData: PurchaseOrderItem | null = null;

    await runTransaction(db, async (tx) => {
      const poRef = doc(db, 'purchaseOrders', params.poId);
      const poSnap = await tx.get(poRef);
      if (!poSnap.exists()) throw new Error('Purchase order not found.');

      const po = poSnap.data() as PurchaseOrderItem;
      poRefData = po;
      if (po.status === 'Cancelled' || po.status === 'Received') {
        throw new Error(`Purchase order is already ${po.status}.`);
      }

      const updatedLines: PurchaseOrderLineItem[] = [];
      for (const line of po.items) {
        const qtyToReceive = Number(params.receivedMap[line.itemId] || 0);
        if (qtyToReceive < 0) {
          throw new Error('Received quantity cannot be negative.');
        }
        const remaining = Math.max(0, line.orderedQty - (line.receivedQty || 0));
        if (qtyToReceive > remaining) {
          throw new Error(
            `Cannot receive more than remaining (${remaining}) for ${line.itemName}.`,
          );
        }

        if (qtyToReceive > 0) {
          const itemRef = doc(db, 'inventory', line.itemId);
          const itemSnap = await tx.get(itemRef);
          if (!itemSnap.exists()) {
            throw new Error(`Inventory item ${line.itemName} not found.`);
          }
          const inv = itemSnap.data() as InventoryItem;
          const nextQty = (inv.quantity || 0) + qtyToReceive;
          tx.update(
            itemRef,
            this.stripUndefined({
              quantity: nextQty,
              status: this.computeStockStatus(nextQty, inv.min || 0),
              purchasePrice: line.unitPrice > 0 ? line.unitPrice : inv.purchasePrice,
              supplier: po.supplierName,
              storageLocation: params.storageLocation || inv.storageLocation,
              lastPurchaseDate: now,
              lastUpdated: now,
            }),
          );

          const movId = `SM-${Date.now()}-${line.itemId.slice(-4)}`;
          const lineCost = qtyToReceive * line.unitPrice;
          receivedCostTotal += lineCost;

          tx.set(
            doc(db, 'inventory_movements', movId),
            this.stripUndefined({
              id: movId,
              organizationId: orgId,
              propertyId: po.propertyId,
              itemId: line.itemId,
              itemName: line.itemName,
              change: qtyToReceive,
              quantity: qtyToReceive,
              delta: `+${qtyToReceive}`,
              type: 'Purchase',
              movementType: 'Purchase In',
              unitCost: line.unitPrice,
              cost: lineCost,
              supplier: po.supplierName,
              invoiceNumber: params.invoiceNumber,
              referenceType: 'PO',
              referenceId: po.id,
              reason: `PO Receipt (${po.poNumber})`,
              performedBy: user?.name || user?.email || 'User',
              performedById: user?.uid,
              timestamp: now,
              createdAt: now,
              tone: 'success',
            }),
          );
        }

        updatedLines.push({
          ...line,
          receivedQty: (line.receivedQty || 0) + qtyToReceive,
        });
      }

      if (receivedCostTotal <= 0 && Object.values(params.receivedMap).every((v) => !v)) {
        throw new Error('Enter at least one quantity to receive.');
      }

      const allReceived = updatedLines.every(
        (l) => (l.receivedQty || 0) >= l.orderedQty,
      );
      const nextStatus: PurchaseOrderStatus = allReceived
        ? 'Received'
        : 'Partially Received';

      tx.update(poRef, {
        items: updatedLines,
        status: nextStatus,
        updatedAt: now,
      });
    });

    if (
      params.recordExpense &&
      receivedCostTotal > 0 &&
      poRefData &&
      !(poRefData as PurchaseOrderItem).expenseRecorded
    ) {
      const po = poRefData as PurchaseOrderItem;
      const expenseId = await this.lodgeData.addExpense({
        propertyId: po.propertyId,
        title: `Purchase Order ${po.poNumber} (${po.supplierName})`,
        category: 'Inventory Purchases',
        amount: receivedCostTotal,
        expenseDate: now.slice(0, 10),
        paymentMethod: 'Bank Transfer',
        vendor: po.supplierName,
        description: `Inventory stock receipt for PO ${po.poNumber}`,
      });
      await updateDoc(doc(db, 'purchaseOrders', po.id), {
        expenseRecorded: true,
        expenseId,
      });
    }
  }

  // --- Inter-Lodge Stock Transfers ---
  async createStockTransfer(params: {
    sourcePropertyId: string;
    destinationPropertyId: string;
    sourceItem: InventoryItem;
    quantity: number;
    notes?: string;
  }): Promise<string> {
    if (params.sourcePropertyId === params.destinationPropertyId) {
      throw new Error('Source and destination lodges must be different.');
    }
    if (params.quantity <= 0) {
      throw new Error('Transfer quantity must be greater than zero.');
    }
    if ((params.sourceItem.quantity || 0) < params.quantity) {
      throw new Error('Insufficient stock at source lodge.');
    }

    const db = this.firebaseService.dbInstance;
    const orgId = this.roleService.currentOrganizationId();
    const user = this.roleService.currentUserProfile();
    const id = `TRF-${Date.now()}`;
    const now = new Date().toISOString();

    const srcName = this.propertyService
      .accessibleProperties()
      .find((p) => p.id === params.sourcePropertyId)?.name;
    const dstName = this.propertyService
      .accessibleProperties()
      .find((p) => p.id === params.destinationPropertyId)?.name;

    const transfer: StockTransferItem = this.stripUndefined({
      id,
      organizationId: orgId,
      sourcePropertyId: params.sourcePropertyId,
      sourcePropertyName: srcName,
      destinationPropertyId: params.destinationPropertyId,
      destinationPropertyName: dstName,
      sourceItemId: params.sourceItem.id,
      itemName: params.sourceItem.name,
      sku: params.sourceItem.sku,
      unit: params.sourceItem.unit,
      quantity: params.quantity,
      status: 'Requested',
      notes: params.notes,
      requestedBy: user?.name || user?.email || 'User',
      requestedByUid: user?.uid || '',
      createdAt: now,
      updatedAt: now,
    });

    await setDoc(doc(db, 'stockTransfers', id), transfer);
    return id;
  }

  async approveStockTransfer(transferId: string): Promise<void> {
    const user = this.roleService.currentUserProfile();
    await updateDoc(
      doc(this.firebaseService.dbInstance, 'stockTransfers', transferId),
      {
        status: 'Approved',
        approvedBy: user?.name || user?.email || 'Owner',
        approvedByUid: user?.uid || '',
        updatedAt: new Date().toISOString(),
      },
    );
  }

  async dispatchStockTransfer(transferId: string): Promise<void> {
    const db = this.firebaseService.dbInstance;
    const user = this.roleService.currentUserProfile();
    const orgId = this.roleService.currentOrganizationId();
    const now = new Date().toISOString();

    await runTransaction(db, async (tx) => {
      const trfRef = doc(db, 'stockTransfers', transferId);
      const trfSnap = await tx.get(trfRef);
      if (!trfSnap.exists()) throw new Error('Transfer not found.');
      const trf = trfSnap.data() as StockTransferItem;

      if (trf.status !== 'Approved') {
        throw new Error('Transfer must be Approved before dispatch.');
      }

      const srcRef = doc(db, 'inventory', trf.sourceItemId);
      const srcSnap = await tx.get(srcRef);
      if (!srcSnap.exists()) throw new Error('Source inventory item not found.');
      const srcItem = srcSnap.data() as InventoryItem;

      if ((srcItem.quantity || 0) < trf.quantity) {
        throw new Error('Insufficient stock at source lodge for dispatch.');
      }

      const nextQty = (srcItem.quantity || 0) - trf.quantity;
      tx.update(srcRef, {
        quantity: nextQty,
        inTransitQuantity: (srcItem.inTransitQuantity || 0) + trf.quantity,
        status: this.computeStockStatus(nextQty, srcItem.min || 0),
        lastUpdated: now,
      });

      const movId = `SM-${Date.now()}-TOUT`;
      tx.set(
        doc(db, 'inventory_movements', movId),
        this.stripUndefined({
          id: movId,
          organizationId: orgId,
          propertyId: trf.sourcePropertyId,
          itemId: srcItem.id,
          itemName: srcItem.name,
          change: -trf.quantity,
          quantity: trf.quantity,
          delta: `-${trf.quantity}`,
          type: 'Transfer',
          movementType: 'Transfer Out',
          referenceType: 'Transfer',
          referenceId: trf.id,
          fromLocation: trf.sourcePropertyName || trf.sourcePropertyId,
          toLocation: trf.destinationPropertyName || trf.destinationPropertyId,
          reason: `Inter-lodge transfer dispatched to ${trf.destinationPropertyName || trf.destinationPropertyId}`,
          performedBy: user?.name || user?.email || 'User',
          performedById: user?.uid,
          timestamp: now,
          createdAt: now,
          tone: 'warm',
        }),
      );

      tx.update(trfRef, {
        status: 'Dispatched',
        dispatchedAt: now,
        updatedAt: now,
      });
    });
  }

  async receiveStockTransfer(transferId: string): Promise<void> {
    const db = this.firebaseService.dbInstance;
    const user = this.roleService.currentUserProfile();
    const orgId = this.roleService.currentOrganizationId();
    const now = new Date().toISOString();

    await runTransaction(db, async (tx) => {
      const trfRef = doc(db, 'stockTransfers', transferId);
      const trfSnap = await tx.get(trfRef);
      if (!trfSnap.exists()) throw new Error('Transfer not found.');
      const trf = trfSnap.data() as StockTransferItem;

      if (trf.status !== 'Dispatched') {
        throw new Error('Transfer must be Dispatched before receipt.');
      }

      const srcRef = doc(db, 'inventory', trf.sourceItemId);
      const srcSnap = await tx.get(srcRef);
      const srcItem = srcSnap.exists() ? (srcSnap.data() as InventoryItem) : null;
      if (srcItem) {
        tx.update(srcRef, {
          inTransitQuantity: Math.max(0, (srcItem.inTransitQuantity || 0) - trf.quantity),
          lastUpdated: now,
        });
      }

      const existingDest = this.lodgeData
        .allInventory()
        .find(
          (i) =>
            i.propertyId === trf.destinationPropertyId &&
            (i.name.toLowerCase() === trf.itemName.toLowerCase() ||
              (trf.sku && i.sku === trf.sku)),
        );

      let destItemId: string;
      if (existingDest) {
        destItemId = existingDest.id;
        const destRef = doc(db, 'inventory', destItemId);
        const destSnap = await tx.get(destRef);
        const destData = destSnap.data() as InventoryItem;
        const nextQty = (destData.quantity || 0) + trf.quantity;
        tx.update(destRef, {
          quantity: nextQty,
          status: this.computeStockStatus(nextQty, destData.min || 0),
          lastUpdated: now,
        });
      } else {
        destItemId = `INV-${Date.now()}`;
        const newDest: InventoryItem = this.stripUndefined({
          id: destItemId,
          organizationId: orgId,
          propertyId: trf.destinationPropertyId,
          name: trf.itemName,
          category: srcItem?.category || 'Other',
          sku: trf.sku,
          unit: trf.unit,
          openingStock: trf.quantity,
          quantity: trf.quantity,
          inTransitQuantity: 0,
          usedQuantity: 0,
          damagedQuantity: 0,
          min: srcItem?.min || 5,
          purchasePrice: srcItem?.purchasePrice || 0,
          status: this.computeStockStatus(trf.quantity, srcItem?.min || 5),
          createdAt: now,
          lastUpdated: now,
        });
        tx.set(doc(db, 'inventory', destItemId), newDest);
      }

      const movId = `SM-${Date.now()}-TIN`;
      tx.set(
        doc(db, 'inventory_movements', movId),
        this.stripUndefined({
          id: movId,
          organizationId: orgId,
          propertyId: trf.destinationPropertyId,
          itemId: destItemId,
          itemName: trf.itemName,
          change: trf.quantity,
          quantity: trf.quantity,
          delta: `+${trf.quantity}`,
          type: 'Transfer',
          movementType: 'Transfer In',
          referenceType: 'Transfer',
          referenceId: trf.id,
          fromLocation: trf.sourcePropertyName || trf.sourcePropertyId,
          toLocation: trf.destinationPropertyName || trf.destinationPropertyId,
          reason: `Inter-lodge transfer received from ${trf.sourcePropertyName || trf.sourcePropertyId}`,
          performedBy: user?.name || user?.email || 'User',
          performedById: user?.uid,
          timestamp: now,
          createdAt: now,
          tone: 'success',
        }),
      );

      tx.update(trfRef, {
        status: 'Received',
        destinationItemId: destItemId,
        receivedBy: user?.name || user?.email || 'User',
        receivedAt: now,
        updatedAt: now,
      });
    });
  }

  async rejectOrCancelTransfer(
    transferId: string,
    status: 'Rejected' | 'Cancelled',
    reason?: string,
  ): Promise<void> {
    await updateDoc(
      doc(this.firebaseService.dbInstance, 'stockTransfers', transferId),
      this.stripUndefined({
        status,
        rejectionReason: reason,
        updatedAt: new Date().toISOString(),
      }),
    );
  }
}
