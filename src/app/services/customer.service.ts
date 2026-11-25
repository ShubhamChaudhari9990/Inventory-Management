import { Injectable, NgZone, inject } from '@angular/core';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  Unsubscribe,
} from 'firebase/firestore';
import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytesResumable,
} from 'firebase/storage';
import {
  CustomerActivityItem,
  CustomerItem,
  CustomerNoteItem,
  CustomerStatsSummary,
  ExtendedBookingItem,
} from '../interface';
import { FirebaseService } from './firebase.service';
import { LodgeDataService } from './lodge-data.service';
import { PropertyService } from './property.service';
import { RoleService } from './role.service';

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

@Injectable({
  providedIn: 'root',
})
export class CustomerService {
  private readonly ngZone = inject(NgZone);
  private readonly firebaseService = inject(FirebaseService);
  private readonly lodgeData = inject(LodgeDataService);
  private readonly propertyService = inject(PropertyService);
  private readonly roleService = inject(RoleService);

  readonly customers = this.lodgeData.customers;
  readonly allCustomers = this.lodgeData.allCustomers;

  normalizePhone(phone?: string | null): string {
    if (!phone) return '';
    const digits = phone.replace(/\D/g, '');
    return digits.length > 10 ? digits.slice(-10) : digits;
  }

  normalizeEmail(email?: string | null): string {
    return (email || '').trim().toLowerCase();
  }

  getCustomerById(customerId: string): CustomerItem | undefined {
    return this.allCustomers().find((c) => c.id === customerId);
  }

  findDuplicates(
    phone: string,
    email?: string,
    excludeCustomerId?: string,
  ): CustomerItem[] {
    const normPhone = this.normalizePhone(phone);
    const normEmail = this.normalizeEmail(email);

    return this.allCustomers().filter((c) => {
      if (excludeCustomerId && c.id === excludeCustomerId) return false;
      const cPhone = c.normalizedPhone || this.normalizePhone(c.phone);
      const cEmail = c.normalizedEmail || this.normalizeEmail(c.email);
      const phoneMatch = !!normPhone && normPhone.length >= 7 && cPhone === normPhone;
      const emailMatch = !!normEmail && cEmail === normEmail;
      return phoneMatch || emailMatch;
    });
  }

  async createCustomer(
    data: Omit<CustomerItem, 'id'>,
    allowSharedPhone = false,
  ): Promise<string> {
    const normPhone = this.normalizePhone(data.phone);
    const normEmail = this.normalizeEmail(data.email);

    if (!allowSharedPhone) {
      const dups = this.findDuplicates(data.phone, data.email);
      if (dups.length > 0) {
        throw new Error(
          `A customer with this phone or email already exists (${dups[0].name}).`,
        );
      }
    }

    const user = this.roleService.currentUserProfile();
    const now = new Date().toISOString();
    const docId = `CUST-${Date.now()}`;
    const db = this.firebaseService.dbInstance;
    const propertyId =
      data.propertyId ||
      (this.propertyService.selectedPropertyId() !== 'all'
        ? this.propertyService.selectedPropertyId()
        : this.propertyService.accessibleProperties()[0]?.id || 'lodge_001');

    const payload: CustomerItem = {
      ...data,
      id: docId,
      organizationId: this.roleService.currentOrganizationId(),
      propertyId,
      normalizedPhone: normPhone,
      normalizedEmail: normEmail || undefined,
      fullName: data.fullName || data.name,
      customerType: data.customerType || 'Regular',
      customerStatus: data.customerStatus || 'active',
      createdAt: now,
      updatedAt: now,
      registeredAt: now,
      createdBy: user?.name || user?.email || user?.uid || 'System',
      updatedBy: user?.name || user?.email || user?.uid || 'System',
    };

    await setDoc(doc(db, 'customers', docId), this.stripUndefined(payload));
    await this.logActivity(
      docId,
      'Customer Created',
      `Profile created for ${payload.name} (${payload.customerType})`,
    );
    return docId;
  }

  async updateCustomer(
    customerId: string,
    updates: Partial<CustomerItem>,
    auditSummary = 'Updated customer profile',
  ): Promise<void> {
    const existing = this.getCustomerById(customerId);
    if (!existing) throw new Error('Customer not found.');

    const user = this.roleService.currentUserProfile();
    const now = new Date().toISOString();
    const normPhone =
      updates.phone !== undefined
        ? this.normalizePhone(updates.phone)
        : existing.normalizedPhone;
    const normEmail =
      updates.email !== undefined
        ? this.normalizeEmail(updates.email)
        : existing.normalizedEmail;

    const { id: _id, ...safe } = updates;
    await updateDoc(
      doc(this.firebaseService.dbInstance, 'customers', customerId),
      this.stripUndefined({
        ...safe,
        normalizedPhone: normPhone,
        normalizedEmail: normEmail || undefined,
        updatedAt: now,
        updatedBy: user?.name || user?.email || user?.uid || 'System',
      }),
    );

    const typeChanged =
      updates.customerType && updates.customerType !== existing.customerType;
    await this.logActivity(
      customerId,
      typeChanged ? 'Customer Type Changed' : 'Customer Updated',
      typeChanged
        ? `Type changed from ${existing.customerType || 'Regular'} to ${updates.customerType}`
        : auditSummary,
    );
  }

  getCustomerBookings(customer: CustomerItem): ExtendedBookingItem[] {
    const normPhone = customer.normalizedPhone || this.normalizePhone(customer.phone);
    const normEmail = customer.normalizedEmail || this.normalizeEmail(customer.email);
    return this.lodgeData.bookings().filter((b) => {
      if (b.customerId && b.customerId === customer.id) return true;
      const bPhone = this.normalizePhone(b.guestPhone);
      if (normPhone && bPhone && bPhone === normPhone) return true;
      if (normEmail && b.guestEmail && this.normalizeEmail(b.guestEmail) === normEmail) {
        return true;
      }
      return b.guestName.trim().toLowerCase() === customer.name.trim().toLowerCase();
    });
  }

  computeCustomerStats(customer: CustomerItem): CustomerStatsSummary {
    const list = this.getCustomerBookings(customer);
    const today = new Date().toISOString().slice(0, 10);

    let completedStays = 0;
    let cancelledBookings = 0;
    let upcomingBookings = 0;
    let totalNights = 0;
    let lastVisit: string | null = customer.lastVisit || null;

    for (const b of list) {
      if (b.status === 'Cancelled') {
        cancelledBookings++;
        continue;
      }
      if (b.status === 'Checked-Out') {
        completedStays++;
        if (!lastVisit || b.checkOut > lastVisit) lastVisit = b.checkOut;
      }
      if (b.checkIn >= today && (b.status === 'Confirmed' || b.status === 'Pending')) {
        upcomingBookings++;
      }
      const start = Date.parse(b.checkIn);
      const end = Date.parse(b.checkOut);
      if (!Number.isNaN(start) && !Number.isNaN(end) && end > start) {
        totalNights += Math.round((end - start) / 86400000);
      } else {
        totalNights += Number(b.numberOfNights) || 1;
      }
    }

    const totalBookings = list.length || customer.totalBookings || customer.visits || 0;
    return {
      totalBookings,
      completedStays,
      cancelledBookings,
      totalNights: totalNights || customer.totalNights || 0,
      lastVisit,
      upcomingBookings,
      isReturning: totalBookings > 1 || !!customer.isRepeatCustomer,
    };
  }

  // ==========================================
  // FIREBASE STORAGE (PROFILE PHOTO)
  // ==========================================

  validatePhoto(file: File): string | null {
    if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
      return 'Unsupported image format. Please use JPG, PNG, or WebP.';
    }
    if (file.size > MAX_AVATAR_BYTES) {
      return 'Profile photo exceeds 5 MB limit.';
    }
    return null;
  }

  uploadProfilePhoto(
    customerId: string,
    file: File,
    onProgress?: (pct: number) => void,
  ): Promise<{ url: string; storagePath: string }> {
    const err = this.validatePhoto(file);
    if (err) return Promise.reject(new Error(err));

    const orgId = this.roleService.currentOrganizationId();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `businesses/${orgId}/customers/${customerId}/profile/${Date.now()}_${safeName}`;
    const storageRef = ref(this.firebaseService.storageInstance, storagePath);

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
        console.warn('Customer photo cleanup warning:', e?.message || e);
      }
    }
  }

  // ==========================================
  // INTERNAL NOTES & ACTIVITY HISTORY
  // ==========================================

  watchNotes(
    customerId: string,
    onChange: (notes: CustomerNoteItem[]) => void,
  ): Unsubscribe {
    const db = this.firebaseService.dbInstance;
    return onSnapshot(
      collection(db, 'customers', customerId, 'notes'),
      (snap) => {
        const items = snap.docs
          .map((d) => ({ ...(d.data() as CustomerNoteItem), id: d.id }))
          .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        this.ngZone.run(() => onChange(items));
      },
      (err) => console.warn('Customer notes listener error:', err.message),
    );
  }

  async addNote(customerId: string, content: string): Promise<void> {
    const user = this.roleService.currentUserProfile();
    if (!user) throw new Error('Authentication required.');
    const noteId = `note_${Date.now()}`;
    const now = new Date().toISOString();
    const item: CustomerNoteItem = {
      id: noteId,
      customerId,
      content: content.trim(),
      authorName: user.name || user.email || 'Staff',
      authorUid: user.uid,
      createdAt: now,
    };
    await setDoc(
      doc(this.firebaseService.dbInstance, 'customers', customerId, 'notes', noteId),
      item,
    );
    await this.logActivity(customerId, 'Note Added', 'Added internal note');
  }

  async updateNote(customerId: string, noteId: string, content: string): Promise<void> {
    await updateDoc(
      doc(this.firebaseService.dbInstance, 'customers', customerId, 'notes', noteId),
      { content: content.trim(), updatedAt: new Date().toISOString() },
    );
  }

  async deleteNote(customerId: string, noteId: string): Promise<void> {
    await deleteDoc(
      doc(this.firebaseService.dbInstance, 'customers', customerId, 'notes', noteId),
    );
  }

  watchActivity(
    customerId: string,
    onChange: (items: CustomerActivityItem[]) => void,
  ): Unsubscribe {
    const db = this.firebaseService.dbInstance;
    return onSnapshot(
      collection(db, 'customers', customerId, 'activity'),
      (snap) => {
        const items = snap.docs
          .map((d) => ({ ...(d.data() as CustomerActivityItem), id: d.id }))
          .sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
        this.ngZone.run(() => onChange(items));
      },
      (err) => console.warn('Customer activity listener error:', err.message),
    );
  }

  async logActivity(
    customerId: string,
    action: string,
    details: string,
  ): Promise<void> {
    try {
      const user = this.roleService.currentUserProfile();
      const actId = `act_${Date.now()}`;
      const item: CustomerActivityItem = {
        id: actId,
        customerId,
        action,
        details,
        performedBy: user?.name || user?.email || 'System',
        timestamp: new Date().toISOString(),
      };
      await setDoc(
        doc(this.firebaseService.dbInstance, 'customers', customerId, 'activity', actId),
        item,
      );
    } catch {}
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
