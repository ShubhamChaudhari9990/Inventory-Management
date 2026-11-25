import { Injectable, NgZone, computed, inject } from '@angular/core';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
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
  Lodge,
  LodgeDocumentItem,
  LodgeFacilityItem,
  LodgeFormData,
  LodgeGalleryItem,
  LodgeSettingsData,
  PropertyStatus,
} from '../interface';
import { FirebaseService } from './firebase.service';
import { PropertyService } from './property.service';
import { RoleService } from './role.service';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB
const MAX_DOC_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_DOC_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

@Injectable({
  providedIn: 'root',
})
export class LodgeService {
  private readonly ngZone = inject(NgZone);
  private readonly firebaseService = inject(FirebaseService);
  private readonly propertyService = inject(PropertyService);
  private readonly roleService = inject(RoleService);

  readonly lodges = computed<Lodge[]>(
    () => this.propertyService.accessibleProperties() as Lodge[],
  );

  getLodgeById(lodgeId: string): Lodge | undefined {
    return this.lodges().find((l) => l.id === lodgeId);
  }

  generateDefaultLodgeCode(name = 'LW'): string {
    const clean = name
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .trim()
      .split(/\s+/)
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 4);
    const prefix = clean || 'LW';
    const num = Math.floor(100 + Math.random() * 900);
    return `${prefix}-${num}`;
  }

  async isLodgeCodeUnique(code: string, excludeLodgeId?: string): Promise<boolean> {
    const normalized = code.trim().toUpperCase();
    if (!normalized) return false;
    const orgId = this.roleService.currentOrganizationId();
    const db = this.firebaseService.dbInstance;

    // 1. Check reservation doc
    const codeKey = `${orgId}_${normalized}`;
    const codeSnap = await getDoc(doc(db, 'lodgeCodes', codeKey));
    if (codeSnap.exists()) {
      const ownerLodgeId = codeSnap.data()?.['lodgeId'];
      if (!excludeLodgeId || ownerLodgeId !== excludeLodgeId) {
        return false;
      }
    }

    // 2. Fallback check in properties collection
    const q = query(
      collection(db, 'properties'),
      where('organizationId', '==', orgId),
      where('code', '==', normalized),
    );
    const snap = await getDocs(q);
    return snap.docs.every((d) => d.id === excludeLodgeId);
  }

  async createLodgeTransaction(data: LodgeFormData): Promise<string> {
    if (!this.roleService.isOwner()) {
      throw new Error('Only the organization Owner can create new lodges.');
    }
    const db = this.firebaseService.dbInstance;
    const orgId = this.roleService.currentOrganizationId();
    const user = this.roleService.currentUserProfile();
    const now = new Date().toISOString();
    const normalizedCode = data.code.trim().toUpperCase();
    const lodgeId = `lodge_${Date.now()}`;
    const codeKey = `${orgId}_${normalizedCode}`;

    const lodgeRef = doc(db, 'properties', lodgeId);
    const codeRef = doc(db, 'lodgeCodes', codeKey);

    const activeFacilityNames = data.facilityItems
      .filter((f) => f.active)
      .map((f) => f.name);

    const newLodge: Lodge = {
      id: lodgeId,
      organizationId: orgId,
      name: data.name.trim(),
      code: normalizedCode,
      businessName: data.businessName?.trim() || '',
      description: data.description?.trim() || '',
      tagline: data.description?.trim() || '',
      type: data.type || 'Lodge',
      status: data.status || 'active',
      phone: data.contact.primaryPhone.trim(),
      email: data.contact.email?.trim() || '',
      address: [data.lodgeAddress.addressLine1, data.lodgeAddress.addressLine2]
        .filter(Boolean)
        .join(', '),
      city: data.lodgeAddress.city.trim(),
      state: data.lodgeAddress.state.trim(),
      country: data.lodgeAddress.country?.trim() || 'India',
      district: data.lodgeAddress.district?.trim() || '',
      pincode: data.lodgeAddress.postalCode?.trim() || '',
      postalCode: data.lodgeAddress.postalCode?.trim() || '',
      totalRooms: Number(data.propertyDetails.estimatedRoomCount) || 0,
      totalFloors: Number(data.propertyDetails.totalFloors) || 1,
      checkInTime: data.propertyDetails.checkInTime || '12:00',
      checkOutTime: data.propertyDetails.checkOutTime || '11:00',
      currency: data.propertyDetails.currency || 'INR',
      timezone: data.propertyDetails.timezone || 'Asia/Kolkata',
      gstin: data.taxSettings.gstNumber?.trim() || '',
      imageUrl: data.images.cover || data.images.logo || '',
      amenities: activeFacilityNames,
      facilities: activeFacilityNames,
      facilityItems: data.facilityItems,
      contact: data.contact,
      lodgeAddress: data.lodgeAddress,
      propertyDetails: data.propertyDetails,
      images: data.images,
      taxSettings: data.taxSettings,
      createdAt: now,
      updatedAt: now,
      createdBy: user?.uid || '',
    };

    await runTransaction(db, async (tx) => {
      const existingCode = await tx.get(codeRef);
      if (existingCode.exists()) {
        throw new Error(`Lodge code "${normalizedCode}" is already in use.`);
      }
      tx.set(codeRef, {
        code: normalizedCode,
        organizationId: orgId,
        lodgeId,
        createdAt: now,
      });
      tx.set(lodgeRef, this.stripUndefined(newLodge));
    });

    return lodgeId;
  }

  async updateLodge(
    lodgeId: string,
    data: Partial<LodgeFormData> | Partial<Lodge>,
    oldCode?: string,
  ): Promise<void> {
    if (!this.roleService.canAccessProperty(lodgeId)) {
      throw new Error('Unauthorized lodge update attempt.');
    }
    if (this.roleService.isStaff()) {
      throw new Error('Staff members cannot edit lodge information.');
    }

    const db = this.firebaseService.dbInstance;
    const orgId = this.roleService.currentOrganizationId();
    const now = new Date().toISOString();
    const lodgeRef = doc(db, 'properties', lodgeId);

    const payload: Record<string, unknown> = {
      ...data,
      updatedAt: now,
    };

    if ('facilityItems' in data && Array.isArray(data.facilityItems)) {
      const activeNames = data.facilityItems.filter((f) => f.active).map((f) => f.name);
      payload['amenities'] = activeNames;
      payload['facilities'] = activeNames;
    }

    if ('contact' in data && data.contact) {
      payload['phone'] = data.contact.primaryPhone;
      payload['email'] = data.contact.email || '';
    }

    if ('lodgeAddress' in data && data.lodgeAddress) {
      payload['address'] = [data.lodgeAddress.addressLine1, data.lodgeAddress.addressLine2]
        .filter(Boolean)
        .join(', ');
      payload['city'] = data.lodgeAddress.city;
      payload['state'] = data.lodgeAddress.state;
      payload['country'] = data.lodgeAddress.country;
      payload['district'] = data.lodgeAddress.district || '';
      payload['postalCode'] = data.lodgeAddress.postalCode || '';
      payload['pincode'] = data.lodgeAddress.postalCode || '';
    }

    if ('propertyDetails' in data && data.propertyDetails) {
      payload['totalRooms'] = Number(data.propertyDetails.estimatedRoomCount) || 0;
      payload['totalFloors'] = Number(data.propertyDetails.totalFloors) || 1;
      payload['checkInTime'] = data.propertyDetails.checkInTime;
      payload['checkOutTime'] = data.propertyDetails.checkOutTime;
      payload['currency'] = data.propertyDetails.currency;
      payload['timezone'] = data.propertyDetails.timezone;
    }

    if ('images' in data && data.images) {
      payload['imageUrl'] = data.images.cover || data.images.logo || '';
    }

    if ('taxSettings' in data && data.taxSettings) {
      payload['gstin'] = data.taxSettings.gstNumber || '';
    }

    const newCode = data.code ? data.code.trim().toUpperCase() : undefined;
    const prevCode = oldCode ? oldCode.trim().toUpperCase() : undefined;

    if (newCode && prevCode && newCode !== prevCode) {
      payload['code'] = newCode;
      const newCodeRef = doc(db, 'lodgeCodes', `${orgId}_${newCode}`);
      const oldCodeRef = doc(db, 'lodgeCodes', `${orgId}_${prevCode}`);

      await runTransaction(db, async (tx) => {
        const existingNew = await tx.get(newCodeRef);
        if (existingNew.exists() && existingNew.data()?.['lodgeId'] !== lodgeId) {
          throw new Error(`Lodge code "${newCode}" is already in use.`);
        }
        tx.set(newCodeRef, {
          code: newCode,
          organizationId: orgId,
          lodgeId,
          updatedAt: now,
        });
        tx.delete(oldCodeRef);
        tx.update(lodgeRef, this.stripUndefined(payload));
      });
    } else {
      if (newCode) payload['code'] = newCode;
      await updateDoc(lodgeRef, this.stripUndefined(payload));
    }
  }

  async setLodgeStatus(
    lodgeId: string,
    status: PropertyStatus,
    reason?: string,
  ): Promise<void> {
    if (!this.roleService.isOwner()) {
      throw new Error('Only the Owner can activate or deactivate lodges.');
    }
    const db = this.firebaseService.dbInstance;
    const now = new Date().toISOString();
    const user = this.roleService.currentUserProfile();
    const updates: Record<string, unknown> = {
      status,
      updatedAt: now,
    };
    if (status === 'inactive') {
      updates['deactivatedAt'] = now;
      updates['deactivatedBy'] = user?.name || user?.email || user?.uid || 'Owner';
      updates['deactivationReason'] = reason || 'Deactivated by owner';
    } else {
      updates['deactivatedAt'] = null;
      updates['deactivatedBy'] = null;
      updates['deactivationReason'] = null;
    }
    await updateDoc(doc(db, 'properties', lodgeId), updates);
  }

  // ==========================================
  // FIREBASE STORAGE UPLOADS & CLEANUP
  // ==========================================

  validateImageFile(file: File): string | null {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return 'Unsupported image format. Please upload JPG, PNG, or WebP.';
    }
    if (file.size > MAX_IMAGE_BYTES) {
      return 'Image size exceeds 5 MB limit.';
    }
    return null;
  }

  validateDocumentFile(file: File): string | null {
    if (!ALLOWED_DOC_TYPES.includes(file.type)) {
      return 'Unsupported document format. Allowed: PDF, JPG, PNG, WebP, DOC, DOCX.';
    }
    if (file.size > MAX_DOC_BYTES) {
      return 'Document size exceeds 10 MB limit.';
    }
    return null;
  }

  uploadLodgeFile(
    lodgeId: string,
    folder: 'branding' | 'gallery' | 'documents',
    file: File,
    onProgress?: (pct: number) => void,
  ): Promise<{ url: string; storagePath: string }> {
    const validationErr =
      folder === 'documents'
        ? this.validateDocumentFile(file)
        : this.validateImageFile(file);
    if (validationErr) {
      return Promise.reject(new Error(validationErr));
    }

    const storage = this.firebaseService.storageInstance;
    const orgId = this.roleService.currentOrganizationId();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `lodges/${orgId}/${lodgeId}/${folder}/${Date.now()}_${safeName}`;
    const storageRef = ref(storage, storagePath);

    return new Promise((resolve, reject) => {
      const task = uploadBytesResumable(storageRef, file, {
        contentType: file.type,
      });

      task.on(
        'state_changed',
        (snapshot) => {
          if (onProgress && snapshot.totalBytes > 0) {
            const pct = Math.round(
              (snapshot.bytesTransferred / snapshot.totalBytes) * 100,
            );
            this.ngZone.run(() => onProgress(pct));
          }
        },
        (err) => reject(err),
        async () => {
          try {
            const url = await getDownloadURL(task.snapshot.ref);
            resolve({ url, storagePath });
          } catch (err) {
            reject(err);
          }
        },
      );
    });
  }

  async deleteStorageFile(storagePath?: string | null): Promise<void> {
    if (!storagePath) return;
    try {
      const storage = this.firebaseService.storageInstance;
      const fileRef = ref(storage, storagePath);
      await deleteObject(fileRef);
    } catch (err: any) {
      if (err?.code !== 'storage/object-not-found') {
        console.warn('Storage cleanup warning:', err?.message || err);
      }
    }
  }

  // ==========================================
  // GALLERY & FACILITIES
  // ==========================================

  async saveGallery(
    lodgeId: string,
    gallery: LodgeGalleryItem[],
    coverUrl?: string | null,
    coverPath?: string | null,
  ): Promise<void> {
    const existing = this.getLodgeById(lodgeId);
    const currentImages = existing?.images || {
      logo: null,
      cover: null,
      gallery: [],
    };
    const nextImages = {
      ...currentImages,
      gallery,
      ...(coverUrl !== undefined ? { cover: coverUrl } : {}),
      ...(coverPath !== undefined ? { coverPath } : {}),
    };
    await this.updateLodge(lodgeId, {
      images: nextImages,
      imageUrl: nextImages.cover || nextImages.logo || '',
    });
  }

  async saveFacilities(
    lodgeId: string,
    facilityItems: LodgeFacilityItem[],
  ): Promise<void> {
    const activeNames = facilityItems.filter((f) => f.active).map((f) => f.name);
    await this.updateLodge(lodgeId, {
      facilityItems,
      amenities: activeNames,
      facilities: activeNames,
    });
  }

  // ==========================================
  // LODGE DOCUMENTS (SUBCOLLECTION)
  // ==========================================

  watchLodgeDocuments(
    lodgeId: string,
    onChange: (docs: LodgeDocumentItem[]) => void,
  ): Unsubscribe {
    const db = this.firebaseService.dbInstance;
    const colRef = collection(db, 'properties', lodgeId, 'documents');
    return onSnapshot(
      colRef,
      (snap) => {
        const items = snap.docs
          .map((d) => ({ ...(d.data() as LodgeDocumentItem), id: d.id }))
          .sort((a, b) => (b.uploadedAt || '').localeCompare(a.uploadedAt || ''));
        this.ngZone.run(() => onChange(items));
      },
      (err) => {
        console.warn('Lodge documents listener error:', err.message);
      },
    );
  }

  async addLodgeDocument(
    lodgeId: string,
    docData: Omit<LodgeDocumentItem, 'id'>,
  ): Promise<string> {
    if (!this.roleService.canAccessProperty(lodgeId) || this.roleService.isStaff()) {
      throw new Error('Unauthorized to upload lodge documents.');
    }
    const db = this.firebaseService.dbInstance;
    const docId = `doc_${Date.now()}`;
    const docRef = doc(db, 'properties', lodgeId, 'documents', docId);
    await setDoc(docRef, this.stripUndefined({ ...docData, id: docId }));
    return docId;
  }

  async deleteLodgeDocument(
    lodgeId: string,
    docId: string,
    storagePath?: string,
  ): Promise<void> {
    if (!this.roleService.canAccessProperty(lodgeId) || this.roleService.isStaff()) {
      throw new Error('Unauthorized to delete lodge documents.');
    }
    const db = this.firebaseService.dbInstance;
    await deleteDoc(doc(db, 'properties', lodgeId, 'documents', docId));
    await this.deleteStorageFile(storagePath);
  }

  // ==========================================
  // LODGE SETTINGS (ISOLATED SUBCOLLECTION)
  // ==========================================

  buildDefaultSettings(lodge: Lodge): LodgeSettingsData {
    return {
      lodgeId: lodge.id,
      organizationId: lodge.organizationId,
      general: {
        displayName: lodge.name || '',
        shortCode: lodge.code || '',
        tagline: lodge.tagline || lodge.description || '',
        lodgeType: lodge.type || 'Lodge',
      },
      contact: {
        primaryPhone: lodge.contact?.primaryPhone || lodge.phone || '',
        alternatePhone: lodge.contact?.alternatePhone || '',
        email: lodge.contact?.email || lodge.email || '',
        website: lodge.contact?.website || '',
        contactPerson: lodge.contact?.contactPerson || '',
      },
      booking: {
        allowOnlineBooking: true,
        requireAdvancePayment: true,
        advancePercentage: 30,
        autoCancelUnpaidHours: 24,
        allowSameDayCheckIn: true,
      },
      checkInOut: {
        standardCheckInTime: lodge.propertyDetails?.checkInTime || lodge.checkInTime || '12:00',
        standardCheckOutTime: lodge.propertyDetails?.checkOutTime || lodge.checkOutTime || '11:00',
        earlyCheckInAllowed: true,
        lateCheckOutAllowed: true,
        gracePeriodMinutes: 60,
      },
      roomConfig: {
        defaultCurrency: lodge.propertyDetails?.currency || lodge.currency || 'INR',
        allowExtraBed: true,
        extraBedCharge: 500,
        requireIdVerification: true,
        autoAssignHousekeepingOnCheckout: true,
      },
      tax: {
        gstNumber: lodge.taxSettings?.gstNumber || lodge.gstin || '',
        panNumber: lodge.taxSettings?.panNumber || '',
        businessRegNumber: lodge.taxSettings?.businessRegNumber || '',
        invoicePrefix: lodge.taxSettings?.invoicePrefix || `${lodge.code || 'LW'}-INV`,
        defaultTaxRate: lodge.taxSettings?.defaultTaxRate ?? 12,
        taxInclusive: lodge.taxSettings?.taxInclusive ?? false,
      },
      invoice: {
        invoicePrefix: lodge.taxSettings?.invoicePrefix || `${lodge.code || 'LW'}-INV`,
        startingNumber: 1001,
        footerNotes: 'Thank you for staying with us!',
        showGstBreakdown: true,
      },
      notifications: {
        notifyNewBooking: true,
        notifyCheckInReminder: true,
        notifyLowInventory: true,
        notifyMaintenanceAlert: true,
      },
      operational: {
        timezone: lodge.propertyDetails?.timezone || lodge.timezone || 'Asia/Kolkata',
        maintenanceMode: lodge.status === 'maintenance',
        housekeepingCutoffTime: '16:00',
        nightAuditTime: '23:30',
      },
    };
  }

  async getLodgeSettings(lodgeId: string): Promise<LodgeSettingsData | null> {
    const lodge = this.getLodgeById(lodgeId);
    const db = this.firebaseService.dbInstance;
    const refDoc = doc(db, 'properties', lodgeId, 'settings', 'config');
    const snap = await getDoc(refDoc);
    if (snap.exists()) {
      return snap.data() as LodgeSettingsData;
    }
    return lodge ? this.buildDefaultSettings(lodge) : null;
  }

  async saveLodgeSettings(
    lodgeId: string,
    settings: LodgeSettingsData,
  ): Promise<void> {
    if (!this.roleService.canAccessProperty(lodgeId) || this.roleService.isStaff()) {
      throw new Error('Unauthorized to update lodge settings.');
    }
    const db = this.firebaseService.dbInstance;
    const user = this.roleService.currentUserProfile();
    const now = new Date().toISOString();
    const refDoc = doc(db, 'properties', lodgeId, 'settings', 'config');
    const payload: LodgeSettingsData = {
      ...settings,
      lodgeId,
      updatedAt: now,
      updatedBy: user?.name || user?.email || user?.uid || '',
    };
    await setDoc(refDoc, this.stripUndefined(payload), { merge: true });
  }

  private stripUndefined<T extends Record<string, any>>(obj: T): T {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value === undefined) continue;
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        result[key] = this.stripUndefined(value);
      } else {
        result[key] = value;
      }
    }
    return result as T;
  }
}
