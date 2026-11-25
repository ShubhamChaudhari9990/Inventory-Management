import { Injectable, NgZone, computed, inject, signal } from '@angular/core';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
} from 'firebase/firestore';

import { FirebaseService } from './firebase.service';
import { PropertyService } from './property.service';
import { RoleService } from './role.service';
import {
  ActivityItem,
  BulkRoomCreateData,
  CleaningScheduleItem,
  CustomerItem,
  DashboardKpi,
  ExpenseCategory,
  ExpenseFormData,
  ExpenseItem,
  ExtendedBookingItem,
  HousekeepingTaskCreateData,
  HousekeepingTaskStatus,
  InventoryItem,
  PaymentFormData,
  PaymentMethod,
  PaymentRecord,
  RecentBooking,
  RecentPayment,
  RevenuePayment,
  RoomItem,
  RoomStatus,
  StaffMember,
  StockMovement,
} from '../interface';

export type { ExtendedBookingItem };

@Injectable({
  providedIn: 'root',
})
export class LodgeDataService {
  private readonly ngZone = inject(NgZone);
  private readonly firebaseService = inject(FirebaseService);
  private readonly propertyService = inject(PropertyService);
  private readonly roleService = inject(RoleService);

  private activeUnsubscribers: (() => void)[] = [];

  // Raw signals holding all documents synchronized in real-time from Firestore
  private readonly rawRooms = signal<RoomItem[]>([]);
  private readonly rawBookings = signal<ExtendedBookingItem[]>([]);
  private readonly rawInventory = signal<InventoryItem[]>([]);
  private readonly rawStockMovements = signal<StockMovement[]>([]);
  private readonly rawCustomers = signal<CustomerItem[]>([]);
  private readonly rawExpenseItems = signal<ExpenseItem[]>([]);
  private readonly rawStaff = signal<StaffMember[]>([]);
  private readonly rawHousekeeping = signal<CleaningScheduleItem[]>([]);
  private readonly rawPayments = signal<PaymentRecord[]>([]);

  // ==========================================
  // MULTI-LODGE & ROLE FILTERED PUBLIC SIGNALS
  // ==========================================

  // --- Rooms ---
  readonly rooms = computed<RoomItem[]>(() => {
    const list = this.rawRooms();
    const selProp = this.propertyService.selectedPropertyId();

    return list.filter((item) => {
      const itemProp = item.propertyId;
      if (itemProp && !this.roleService.canAccessProperty(itemProp)) return false;
      if (selProp !== 'all' && itemProp && itemProp !== selProp) return false;
      return true;
    });
  });

  readonly allRooms = computed<RoomItem[]>(() => this.rawRooms());

  // --- Bookings ---
  readonly bookings = computed<ExtendedBookingItem[]>(() => {
    const list = this.rawBookings();
    const selProp = this.propertyService.selectedPropertyId();

    return list.filter((item) => {
      const itemProp = item.propertyId;
      if (itemProp && !this.roleService.canAccessProperty(itemProp)) return false;
      if (selProp !== 'all' && itemProp && itemProp !== selProp) return false;
      return true;
    });
  });

  readonly allBookings = computed<ExtendedBookingItem[]>(() => this.rawBookings());

  // --- Inventory ---
  readonly inventory = computed<InventoryItem[]>(() => {
    const list = this.rawInventory();
    const selProp = this.propertyService.selectedPropertyId();

    return list.filter((item) => {
      const itemProp = item.propertyId;
      if (itemProp && !this.roleService.canAccessProperty(itemProp)) return false;
      if (selProp !== 'all' && itemProp && itemProp !== selProp) return false;
      return true;
    });
  });

  readonly allInventory = computed<InventoryItem[]>(() => this.rawInventory());

  // --- Stock Movements ---
  readonly stockMovements = computed<StockMovement[]>(() => {
    const list = this.rawStockMovements();
    const selProp = this.propertyService.selectedPropertyId();

    return list.filter((item) => {
      const itemProp = item.propertyId;
      if (itemProp && !this.roleService.canAccessProperty(itemProp)) return false;
      if (selProp !== 'all' && itemProp && itemProp !== selProp) return false;
      return true;
    });
  });

  readonly allStockMovements = computed<StockMovement[]>(() => this.rawStockMovements());

  // --- Customers ---
  readonly customers = computed<CustomerItem[]>(() => {
    const list = this.rawCustomers();
    const selProp = this.propertyService.selectedPropertyId();

    return list.filter((item) => {
      const itemProp = item.propertyId;
      if (itemProp && !this.roleService.canAccessProperty(itemProp)) return false;
      if (selProp !== 'all' && itemProp && itemProp !== selProp) return false;
      return true;
    });
  });

  readonly allCustomers = computed<CustomerItem[]>(() => this.rawCustomers());

  // --- Expense Records ---
  readonly expenseItems = computed<ExpenseItem[]>(() => {
    const list = this.rawExpenseItems();
    const selProp = this.propertyService.selectedPropertyId();

    return list.filter((item) => {
      const itemProp = item.propertyId;
      if (itemProp && !this.roleService.canAccessProperty(itemProp)) return false;
      if (selProp !== 'all' && itemProp && itemProp !== selProp) return false;
      return true;
    });
  });

  readonly allExpenseItems = computed<ExpenseItem[]>(() => this.rawExpenseItems());

  // Dynamic category aggregation computed from live expense records
  readonly expenses = computed<ExpenseCategory[]>(() => {
    const items = this.expenseItems().filter((e) => !e.isReversed);
    if (items.length === 0) return [];

    const total = items.reduce((sum, e) => sum + (e.numericAmount || 0), 0);
    const categoryMap = new Map<string, { count: number; sum: number }>();

    for (const item of items) {
      const cat = item.category || 'Other';
      const prev = categoryMap.get(cat) || { count: 0, sum: 0 };
      categoryMap.set(cat, {
        count: prev.count + 1,
        sum: prev.sum + (item.numericAmount || 0),
      });
    }

    const tones: Array<'primary' | 'warm' | 'success' | 'muted'> = [
      'primary',
      'warm',
      'success',
      'muted',
    ];

    return Array.from(categoryMap.entries()).map(([cat, data], idx) => {
      const fillPercent = total > 0 ? Math.round((data.sum / total) * 100) : 0;
      return {
        id: cat.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        name: cat,
        nameKey: `EXPENSES.CATEGORY.${cat.toUpperCase().replace(/\s+/g, '_')}`,
        amount: `₹${data.sum.toLocaleString('en-IN')}`,
        fillPercent,
        percent: `${fillPercent}%`,
        count: `${data.count} items`,
        tone: tones[idx % tones.length],
      };
    });
  });

  // --- Staff ---
  readonly staff = computed<StaffMember[]>(() => {
    const list = this.rawStaff();
    const selProp = this.propertyService.selectedPropertyId();

    return list.filter((item) => {
      const itemProp = item.propertyId;
      if (itemProp && !this.roleService.canAccessProperty(itemProp)) return false;
      if (selProp !== 'all' && itemProp && itemProp !== selProp) return false;
      return true;
    });
  });

  readonly allStaff = computed<StaffMember[]>(() => this.rawStaff());

  // --- Housekeeping ---
  readonly housekeeping = computed<CleaningScheduleItem[]>(() => {
    const list = this.rawHousekeeping();
    const selProp = this.propertyService.selectedPropertyId();

    return list.filter((item) => {
      const itemProp = item.propertyId;
      if (itemProp && !this.roleService.canAccessProperty(itemProp)) return false;
      if (selProp !== 'all' && itemProp && itemProp !== selProp) return false;
      return true;
    });
  });

  readonly allHousekeeping = computed<CleaningScheduleItem[]>(() => this.rawHousekeeping());

  // --- Payments ---
  readonly payments = computed<PaymentRecord[]>(() => {
    const list = this.rawPayments();
    const selProp = this.propertyService.selectedPropertyId();

    return list.filter((item) => {
      const itemProp = item.propertyId;
      if (itemProp && !this.roleService.canAccessProperty(itemProp)) return false;
      if (selProp !== 'all' && itemProp && itemProp !== selProp) return false;
      return true;
    });
  });

  readonly allPayments = computed<PaymentRecord[]>(() => this.rawPayments());

  // ==========================================
  // REAL-TIME COMPUTED DASHBOARD AGGREGATIONS
  // ==========================================

  readonly dynamicKpis = computed<DashboardKpi[]>(() => {
    const rooms = this.rooms();
    const inventory = this.inventory();
    const staff = this.staff();
    const bookings = this.bookings();
    const payments = this.payments();
    const expenses = this.expenseItems().filter((e) => !e.isReversed);

    const availableCount = rooms.filter((r) => r.status === 'Available').length;
    const occupiedCount = rooms.filter((r) => r.status === 'Occupied').length;
    const reservedCount = rooms.filter((r) => r.status === 'Reserved').length;
    const cleaningCount = rooms.filter((r) => r.status === 'Cleaning').length;

    const todayStr = new Date().toISOString().slice(0, 10);
    const todayCheckins = bookings.filter((b) => b.checkIn === todayStr || b.status === 'Checked-In').length;
    const todayCheckouts = bookings.filter((b) => b.checkOut === todayStr || b.status === 'Checked-Out').length;

    const totalRev = payments.reduce((sum, p) => sum + (p.numericAmount || 0), 0);
    const totalExp = expenses.reduce((sum, e) => sum + (e.numericAmount || 0), 0);
    const netProfit = totalRev - totalExp;

    const pendingPayments = bookings
      .filter((b) => b.status === 'Due' || b.status === 'Pending')
      .reduce((sum, b) => {
        const amt = parseFloat(b.amount?.replace(/[^0-9.-]+/g, '') || '0');
        return sum + (isNaN(amt) ? 0 : amt);
      }, 0);

    const lowStockCount = inventory.filter((i) => i.status === 'Low Stock Alerts' || i.quantity <= i.min).length;
    const staffPresent = staff.filter((s) => s.status === 'Present').length;
    const staffTotal = staff.length;

    return [
      {
        id: 'revenue',
        label: 'DASHBOARD.KPI.REVENUE',
        value: `₹${totalRev.toLocaleString('en-IN')}`,
        meta: 'Live collections',
        icon: 'rupee',
        tone: 'success',
      },
      {
        id: 'expenses',
        label: 'DASHBOARD.KPI.EXPENSES',
        value: `₹${totalExp.toLocaleString('en-IN')}`,
        icon: 'receipt-outline',
        tone: 'danger',
      },
      {
        id: 'profit',
        label: 'DASHBOARD.KPI.PROFIT',
        value: `₹${netProfit.toLocaleString('en-IN')}`,
        icon: 'trending-up-outline',
        tone: netProfit >= 0 ? 'primary' : 'danger',
      },
      {
        id: 'available',
        label: 'DASHBOARD.KPI.AVAILABLE',
        value: String(availableCount),
        icon: 'door-open',
        tone: 'success',
      },
      {
        id: 'occupied',
        label: 'DASHBOARD.KPI.OCCUPIED',
        value: String(occupiedCount),
        icon: 'bed-outline',
        tone: 'primary',
      },
      {
        id: 'reserved',
        label: 'DASHBOARD.KPI.RESERVED',
        value: String(reservedCount),
        icon: 'calendar-clock',
        tone: 'secondary',
      },
      {
        id: 'cleaning',
        label: 'DASHBOARD.KPI.CLEANING',
        value: String(cleaningCount),
        icon: 'sparkles-outline',
        tone: 'warm',
      },
      {
        id: 'check-in',
        label: 'DASHBOARD.KPI.CHECK_IN',
        value: String(todayCheckins),
        icon: 'log-in-outline',
        tone: 'primary',
      },
      {
        id: 'check-out',
        label: 'DASHBOARD.KPI.CHECK_OUT',
        value: String(todayCheckouts),
        icon: 'log-out-outline',
        tone: 'warm',
      },
      {
        id: 'pending-payments',
        label: 'DASHBOARD.KPI.PENDING_PAYMENTS',
        value: `₹${pendingPayments.toLocaleString('en-IN')}`,
        icon: 'warning-outline',
        tone: 'danger',
      },
      {
        id: 'low-stock',
        label: 'DASHBOARD.KPI.LOW_STOCK',
        value: String(lowStockCount),
        icon: 'package-open',
        tone: 'warm',
      },
      {
        id: 'staff-present',
        label: 'DASHBOARD.KPI.STAFF_PRESENT',
        value: `${staffPresent}/${staffTotal}`,
        icon: 'user-check',
        tone: 'success',
      },
    ];
  });

  readonly recentBookings = computed<RecentBooking[]>(() => {
    return this.bookings()
      .filter((b) => b.status !== 'Cancelled')
      .slice(0, 5)
      .map((b) => ({
        id: b.id,
        guest: b.guestName,
        room: `Room ${b.room}`,
        checkIn: b.checkIn,
        checkOut: b.checkOut,
        amount: b.amount,
        status: (b.status === 'Paid' ? 'Paid' : 'Due') as 'Paid' | 'Due',
        propertyId: b.propertyId,
        propertyName: b.propertyName,
        contact: b.guestPhone,
      }));
  });

  readonly recentPayments = computed<RecentPayment[]>(() => {
    return this.payments().slice(0, 5).map((p) => ({
      id: p.id,
      guest: p.guestName,
      room: p.bookingId ? `Booking #${p.bookingId.slice(0, 8)}` : 'Direct',
      method: p.method,
      amount: `₹${p.numericAmount.toLocaleString('en-IN')}`,
      time: p.createdAt ? p.createdAt.slice(0, 10) : 'Today',
      propertyId: p.propertyId,
      propertyName: p.propertyName,
      status: p.status,
    }));
  });

  readonly recentActivity = computed<ActivityItem[]>(() => {
    const list: ActivityItem[] = [];

    for (const b of this.bookings().slice(0, 3)) {
      list.push({
        id: `act-${b.id}`,
        title: `Reservation ${b.status}`,
        text: `${b.guestName} booked Room ${b.room} (${b.amount})`,
        time: b.createdAt || b.checkIn,
        timeAgo: 'Recent',
        icon: 'calendar-outline',
        propertyId: b.propertyId,
        propertyName: b.propertyName,
        type: 'booking',
      });
    }

    for (const p of this.payments().slice(0, 3)) {
      list.push({
        id: `act-${p.id}`,
        title: `Payment ${p.status}`,
        text: `Received ₹${p.numericAmount.toLocaleString('en-IN')} via ${p.method} for ${p.guestName}`,
        time: p.createdAt,
        timeAgo: 'Recent',
        icon: 'cash-outline',
        propertyId: p.propertyId,
        propertyName: p.propertyName,
        type: 'payment',
      });
    }

    for (const h of this.housekeeping().slice(0, 3)) {
      list.push({
        id: `act-${h.id}`,
        title: `Housekeeping ${h.status}`,
        text: `Room ${h.room} task updated to ${h.status} (Assignee: ${h.assignedTo || 'Unassigned'})`,
        time: h.createdAt || h.time,
        timeAgo: 'Recent',
        icon: 'sparkles-outline',
        propertyId: h.propertyId,
        type: 'housekeeping',
      });
    }

    return list.slice(0, 6);
  });

  readonly revenuePayments = computed<RevenuePayment[]>(() => {
    const list = this.payments();
    return list.map((p) => ({
      id: p.id,
      propertyId: p.propertyId,
      guest: p.guestName,
      room: p.bookingId ? `Booking #${p.bookingId}` : undefined,
      amount: p.amount,
      numericAmount: p.numericAmount,
      method: p.method,
      time: p.createdAt ? p.createdAt.slice(11, 16) : 'Now',
      status: p.status,
    }));
  });

  // ==========================================
  // INITIALIZATION & REAL-TIME LISTENERS
  // ==========================================

  constructor() {
    this.firebaseService.currentUser$.subscribe((user) => {
      if (user) {
        this.startRealtimeListeners();
      } else {
        this.stopRealtimeListeners();
      }
    });
  }

  startRealtimeListeners(): void {
    this.stopRealtimeListeners();

    if (!this.firebaseService.currentUser) return;

    this.listenCollection<RoomItem>('rooms', (items) => this.rawRooms.set(items));
    this.listenCollection<ExtendedBookingItem>('bookings', (items) => this.rawBookings.set(items));
    this.listenCollection<InventoryItem>('inventory', (items) => this.rawInventory.set(items));
    this.listenCollection<StockMovement>('inventory_movements', (items) => this.rawStockMovements.set(items));
    this.listenCollection<CustomerItem>('customers', (items) => this.rawCustomers.set(items));
    this.listenCollection<CleaningScheduleItem>('housekeeping', (items) => this.rawHousekeeping.set(items));
    this.listenCollection<PaymentRecord>('payments', (items) => this.rawPayments.set(items));
    this.listenCollection<ExpenseItem>('expenses', (items) => this.rawExpenseItems.set(items));
    this.listenCollection<StaffMember>('staff', (items) => this.rawStaff.set(items));
  }

  stopRealtimeListeners(): void {
    for (const unsub of this.activeUnsubscribers) {
      try {
        unsub();
      } catch {}
    }
    this.activeUnsubscribers = [];
  }

  private listenCollection<T extends { id: string }>(
    collectionName: string,
    callback: (items: T[]) => void,
  ): void {
    const db = this.firebaseService.dbInstance;
    const colRef = collection(db, collectionName);

    try {
      const unsub = onSnapshot(
        colRef,
        (snapshot) => {
          const items = snapshot.docs.map((docSnap) => ({
            ...docSnap.data(),
            id: docSnap.id,
          })) as T[];
          this.ngZone.run(() => {
            callback(items);
          });
        },
        (error) => {
          console.warn(`Firestore live sync on ${collectionName}:`, error.message);
        },
      );
      this.activeUnsubscribers.push(unsub);
    } catch (err: any) {
      console.warn(`Could not attach listener for ${collectionName}:`, err.message);
    }
  }

  private getEffectivePropertyId(explicitPropertyId?: string): string {
    if (explicitPropertyId && explicitPropertyId !== 'all') {
      return explicitPropertyId;
    }
    const current = this.propertyService.selectedPropertyId();
    if (current && current !== 'all') {
      return current;
    }
    const firstAllowed = this.propertyService.accessibleProperties()[0]?.id;
    return firstAllowed || '';
  }

  // ==========================================
  // ROOM CRUD OPERATIONS
  // ==========================================

  getRoom(roomId: string): RoomItem | undefined {
    return this.rawRooms().find((r) => r.id === roomId);
  }

  async addRoom(room: Omit<RoomItem, 'id'>): Promise<string> {
    const propertyId = this.getEffectivePropertyId(room.propertyId);

    // Duplicate room number validation
    const existing = this.rawRooms().find(
      (r) =>
        (r.propertyId || '') === propertyId &&
        r.number.trim().toLowerCase() === room.number.trim().toLowerCase(),
    );
    if (existing) {
      throw new Error(`Room number ${room.number} already exists in this lodge.`);
    }

    const db = this.firebaseService.dbInstance;
    const docId = `R_${propertyId}_${room.number.trim().replace(/\s+/g, '')}`;
    const docRef = doc(db, 'rooms', docId);
    const newRoom: RoomItem = {
      ...room,
      id: docId,
      propertyId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await setDoc(docRef, newRoom);
    return docId;
  }

  async bulkAddRooms(data: BulkRoomCreateData): Promise<number> {
    const propertyId = this.getEffectivePropertyId(data.propertyId);
    let createdCount = 0;

    for (let i = 0; i < data.count; i++) {
      const roomNum = String(data.startRoomNumber + i);
      const exists = this.rawRooms().some(
        (r) => (r.propertyId || '') === propertyId && r.number === roomNum,
      );
      if (!exists) {
        await this.addRoom({
          number: roomNum,
          floor: data.floor,
          type: data.type,
          price: data.pricePerNight.startsWith('₹') ? data.pricePerNight : `₹${data.pricePerNight}`,
          capacity: data.capacity || 2,
          beds: data.beds || 1,
          amenities: data.amenities || ['Free WiFi', 'TV', 'Air Conditioning'],
          status: 'Available',
          propertyId,
        });
        createdCount++;
      }
    }
    return createdCount;
  }

  async updateRoom(roomId: string, updates: Partial<RoomItem>): Promise<void> {
    const db = this.firebaseService.dbInstance;
    const docRef = doc(db, 'rooms', roomId);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  }

  async updateRoomStatus(roomId: string, status: Exclude<RoomStatus, 'All'>): Promise<void> {
    const db = this.firebaseService.dbInstance;
    const docRef = doc(db, 'rooms', roomId);
    await updateDoc(docRef, { status, updatedAt: new Date().toISOString() });
  }

  async deleteRoom(roomId: string): Promise<{ success: boolean; message?: string }> {
    const room = this.getRoom(roomId);
    if (!room) {
      return { success: false, message: 'Room not found.' };
    }

    // Safety check: ensure no active bookings rely on this room
    const hasActiveBookings = this.rawBookings().some(
      (b) =>
        (b.propertyId || '') === (room.propertyId || '') &&
        b.room === room.number &&
        ['Paid', 'Advance', 'Due', 'Checked-In', 'Confirmed'].includes(b.status),
    );

    if (hasActiveBookings) {
      return {
        success: false,
        message: `Cannot delete Room ${room.number} because it has active or upcoming reservations.`,
      };
    }

    const db = this.firebaseService.dbInstance;
    const docRef = doc(db, 'rooms', roomId);
    await deleteDoc(docRef);
    return { success: true };
  }

  // ==========================================
  // BOOKING CRUD OPERATIONS
  // ==========================================

  getBooking(bookingId: string): ExtendedBookingItem | undefined {
    return this.rawBookings().find((b) => b.id === bookingId);
  }

  checkRoomAvailability(
    propertyId: string,
    roomNumber: string,
    checkIn: string,
    checkOut: string,
    excludeBookingId?: string,
  ): boolean {
    const targetRoom = this.rawRooms().find(
      (r) => (r.propertyId || '') === propertyId && r.number === roomNumber,
    );
    if (targetRoom) {
      const op = targetRoom.operationalStatus;
      if (
        op === 'maintenance' ||
        op === 'blocked' ||
        op === 'inactive' ||
        targetRoom.status === 'Maintenance' ||
        targetRoom.status === 'Out of Service'
      ) {
        return false;
      }
    }

    const activeBookings = this.rawBookings().filter((b) => {
      if (excludeBookingId && b.id === excludeBookingId) return false;
      const bProp = b.propertyId || '';
      return (
        bProp === propertyId &&
        b.room === roomNumber &&
        b.status !== 'Cancelled' &&
        b.status !== 'Checked-Out'
      );
    });

    const reqStart = Date.parse(checkIn);
    const reqEnd = Date.parse(checkOut);
    const hasValidReqRange = !Number.isNaN(reqStart) && !Number.isNaN(reqEnd);

    for (const b of activeBookings) {
      if (hasValidReqRange) {
        const bStart = Date.parse(b.checkIn);
        const bEnd = Date.parse(b.checkOut);
        if (!Number.isNaN(bStart) && !Number.isNaN(bEnd)) {
          if (reqStart < bEnd && reqEnd > bStart) {
            return false;
          }
          continue;
        }
      }
      if (b.checkIn === checkIn || b.checkOut === checkOut) {
        return false;
      }
    }
    return true;
  }

  async addBooking(
    booking: Omit<ExtendedBookingItem, 'id'>,
    paymentInfo?: { method: PaymentMethod; amount: number },
  ): Promise<string> {
    const propertyId = this.getEffectivePropertyId(booking.propertyId);
    if (!propertyId) {
      throw new Error('Please select a lodge before creating a booking.');
    }

    const targetProperty = this.propertyService
      .properties()
      .find((p) => p.id === propertyId);
    if (targetProperty && targetProperty.status === 'inactive') {
      throw new Error(
        `Lodge "${targetProperty.name}" is currently inactive. New bookings are disabled.`,
      );
    }

    const isAvail = this.checkRoomAvailability(
      propertyId,
      booking.room,
      booking.checkIn,
      booking.checkOut,
    );
    if (!isAvail) {
      throw new Error(`Room ${booking.room} is already booked for these dates.`);
    }

    const db = this.firebaseService.dbInstance;
    const docId = `BK-${Math.floor(1000 + Math.random() * 9000)}`;
    const docRef = doc(db, 'bookings', docId);
    const property = this.propertyService.properties().find((p) => p.id === propertyId);

    const targetRoom = this.rawRooms().find(
      (r) => (r.propertyId || '') === propertyId && r.number === booking.room,
    );

    const rawBooking: ExtendedBookingItem = {
      ...booking,
      id: docId,
      propertyId,
      propertyName: property?.name || 'LemonWood Heritage',
      roomRate: booking.roomRate || targetRoom?.price,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const newBookingObj: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(rawBooking)) {
      if (v !== undefined) newBookingObj[k] = v;
    }
    const newBooking = newBookingObj as unknown as ExtendedBookingItem;
    await setDoc(docRef, newBooking);

    // Update room status to Occupied if checking in now
    if (targetRoom && booking.status === 'Checked-In') {
      await this.updateRoomStatus(targetRoom.id, 'Occupied');
    } else if (targetRoom && targetRoom.status === 'Available') {
      await this.updateRoomStatus(targetRoom.id, 'Reserved');
    }

    // Auto-record initial payment if supplied
    if (paymentInfo && paymentInfo.amount > 0) {
      await this.recordPayment({
        propertyId,
        bookingId: docId,
        guestName: booking.guestName,
        guestPhone: booking.guestPhone,
        amount: paymentInfo.amount,
        method: paymentInfo.method,
        type: paymentInfo.amount >= (booking.totalAmount || 1800) ? 'Full' : 'Advance',
        notes: `Initial payment at booking time via ${paymentInfo.method}`,
      });
    }

    return docId;
  }

  async updateBooking(
    bookingId: string,
    updates: Partial<ExtendedBookingItem>,
  ): Promise<void> {
    const db = this.firebaseService.dbInstance;
    const docRef = doc(db, 'bookings', bookingId);
    await updateDoc(docRef, { ...updates, updatedAt: new Date().toISOString() });
  }

  async cancelBooking(bookingId: string, reason?: string): Promise<void> {
    const booking = this.getBooking(bookingId);
    if (!booking) return;

    await this.updateBooking(bookingId, {
      status: 'Cancelled',
      notes: reason ? `${booking.notes || ''} [Cancelled: ${reason}]` : booking.notes,
    });

    const targetRoom = this.rawRooms().find(
      (r) =>
        (r.propertyId || '') === (booking.propertyId || '') &&
        r.number === booking.room,
    );
    if (targetRoom && targetRoom.status === 'Occupied') {
      await this.updateRoomStatus(targetRoom.id, 'Available');
    }
  }

  async checkInGuest(bookingId: string): Promise<void> {
    const booking = this.getBooking(bookingId);
    if (!booking) return;

    await this.updateBooking(bookingId, { status: 'Checked-In' });

    const targetRoom = this.rawRooms().find(
      (r) =>
        (r.propertyId || '') === (booking.propertyId || '') &&
        r.number === booking.room,
    );
    if (targetRoom) {
      await this.updateRoomStatus(targetRoom.id, 'Occupied');
    }
  }

  async checkoutGuest(bookingId: string, roomNumber: string): Promise<void> {
    const db = this.firebaseService.dbInstance;

    const bookingRef = doc(db, 'bookings', bookingId);
    await updateDoc(bookingRef, { status: 'Checked-Out', updatedAt: new Date().toISOString() });

    const room = this.rawRooms().find(
      (r) => r.number === roomNumber || r.id === roomNumber,
    );
    if (room) {
      await this.updateRoomStatus(room.id, 'Dirty');
      await updateDoc(doc(db, 'rooms', room.id), {
        housekeepingStatus: 'Dirty',
        updatedAt: new Date().toISOString(),
      });

      const taskId = `HK-CHK-${bookingId}`;
      const existingTask = this.rawHousekeeping().find((t) => t.id === taskId);
      if (!existingTask) {
        const hkRef = doc(db, 'housekeeping', taskId);
        const now = new Date().toISOString();
        const newTask: CleaningScheduleItem = {
          id: taskId,
          organizationId: room.organizationId || '',
          propertyId: room.propertyId || '',
          roomId: room.id,
          room: room.number,
          type: room.type || 'Standard',
          ...(room.floor ? { floor: room.floor } : {}),
          taskType: 'Checkout Cleaning',
          assignedTo: 'Unassigned',
          status: 'Pending',
          time: 'Now',
          priority: 'High',
          bookingId,
          createdAt: now,
          updatedAt: now,
        };
        await setDoc(hkRef, newTask);
      }
    }
  }

  async deleteBooking(bookingId: string): Promise<void> {
    const db = this.firebaseService.dbInstance;
    const docRef = doc(db, 'bookings', bookingId);
    await deleteDoc(docRef);
  }

  // ==========================================
  // CUSTOMER CRUD OPERATIONS
  // ==========================================

  getCustomer(customerId: string): CustomerItem | undefined {
    return this.rawCustomers().find((c) => c.id === customerId);
  }

  async addCustomer(customer: Omit<CustomerItem, 'id'>): Promise<string> {
    const db = this.firebaseService.dbInstance;
    const docId = `CUST-${Date.now()}`;
    const docRef = doc(db, 'customers', docId);
    const newCustomer: CustomerItem = {
      ...customer,
      id: docId,
      propertyId: this.getEffectivePropertyId(customer.propertyId),
      registeredAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await setDoc(docRef, newCustomer);
    return docId;
  }

  async updateCustomer(customerId: string, updates: Partial<CustomerItem>): Promise<void> {
    const db = this.firebaseService.dbInstance;
    const docRef = doc(db, 'customers', customerId);
    await updateDoc(docRef, { ...updates, updatedAt: new Date().toISOString() });
  }

  async deleteCustomer(customerId: string): Promise<void> {
    const db = this.firebaseService.dbInstance;
    const docRef = doc(db, 'customers', customerId);
    await deleteDoc(docRef);
  }

  // ==========================================
  // PAYMENT CRUD OPERATIONS
  // ==========================================

  getPayment(paymentId: string): PaymentRecord | undefined {
    return this.rawPayments().find((p) => p.id === paymentId);
  }

  async recordPayment(data: PaymentFormData): Promise<string> {
    const db = this.firebaseService.dbInstance;
    const docId = `PAY-${Date.now()}`;
    const docRef = doc(db, 'payments', docId);
    const propertyId = this.getEffectivePropertyId(data.propertyId);
    const property = this.propertyService.properties().find((p) => p.id === propertyId);

    const record: PaymentRecord = {
      id: docId,
      propertyId,
      propertyName: property?.name || 'LemonWood Heritage',
      bookingId: data.bookingId,
      guestName: data.guestName,
      guestPhone: data.guestPhone,
      amount: `₹${data.amount.toLocaleString('en-IN')}`,
      numericAmount: data.amount,
      method: data.method,
      status: 'Paid',
      type: data.type,
      transactionId:
        data.transactionId ||
        `TXN-${Math.floor(1000000000 + Math.random() * 9000000000)}`,
      receiptNumber: `RCP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      invoiceNumber: `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      notes: data.notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      auditTrail: [
        {
          timestamp: new Date().toISOString(),
          action: 'Created',
          performedBy: this.roleService.currentRole() || 'owner',
        },
      ],
    };

    await setDoc(docRef, record);
    return docId;
  }

  async updatePayment(paymentId: string, updates: Partial<PaymentRecord>): Promise<void> {
    const db = this.firebaseService.dbInstance;
    const docRef = doc(db, 'payments', paymentId);
    await updateDoc(docRef, { ...updates, updatedAt: new Date().toISOString() });
  }

  async processRefund(paymentId: string, refundAmount: number, reason: string): Promise<string> {
    const original = this.getPayment(paymentId);
    if (!original) {
      throw new Error('Original payment record not found.');
    }

    const db = this.firebaseService.dbInstance;
    const refundDocId = `REF-${Date.now()}`;
    const refundRef = doc(db, 'payments', refundDocId);

    const refundRecord: PaymentRecord = {
      id: refundDocId,
      propertyId: original.propertyId,
      propertyName: original.propertyName,
      bookingId: original.bookingId,
      guestName: original.guestName,
      guestPhone: original.guestPhone,
      amount: `-₹${refundAmount.toLocaleString('en-IN')}`,
      numericAmount: -refundAmount,
      method: original.method,
      status: 'Refunded',
      type: 'Refund',
      referenceNumber: original.id,
      transactionId: `RFND-${Date.now()}`,
      notes: `Refund for ${original.id}. Reason: ${reason}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      auditTrail: [
        {
          timestamp: new Date().toISOString(),
          action: 'Refunded',
          performedBy: this.roleService.currentRole() || 'owner',
          reason,
        },
      ],
    };

    await setDoc(refundRef, refundRecord);
    return refundDocId;
  }

  async deletePayment(paymentId: string): Promise<void> {
    if (!this.roleService.isOwner()) {
      throw new Error('Unauthorized: Only the organization Owner can delete payment records.');
    }
    const db = this.firebaseService.dbInstance;
    const docRef = doc(db, 'payments', paymentId);
    await deleteDoc(docRef);
  }

  // ==========================================
  // INVENTORY & STOCK MOVEMENTS CRUD
  // ==========================================

  getInventoryItem(itemId: string): InventoryItem | undefined {
    return this.rawInventory().find((i) => i.id === itemId);
  }

  async addInventory(item: Omit<InventoryItem, 'id'>): Promise<string> {
    const db = this.firebaseService.dbInstance;
    const docId = `INV-${Date.now()}`;
    const docRef = doc(db, 'inventory', docId);
    const propertyId = this.getEffectivePropertyId(item.propertyId);

    const newItem: InventoryItem = {
      ...item,
      id: docId,
      propertyId,
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
    };
    await setDoc(docRef, newItem);
    return docId;
  }

  async updateInventory(itemId: string, updates: Partial<InventoryItem>): Promise<void> {
    const db = this.firebaseService.dbInstance;
    const docRef = doc(db, 'inventory', itemId);
    await updateDoc(docRef, { ...updates, lastUpdated: new Date().toISOString() });
  }

  async deleteInventory(itemId: string): Promise<void> {
    const db = this.firebaseService.dbInstance;
    const docRef = doc(db, 'inventory', itemId);
    await deleteDoc(docRef);
  }

  async recordStockPurchase(
    itemId: string,
    quantity: number,
    cost: number,
    supplier?: string,
    notes?: string,
  ): Promise<void> {
    const item = this.getInventoryItem(itemId);
    if (!item) return;

    const newQuantity = (item.quantity || 0) + quantity;
    const newStatus = newQuantity <= item.min ? 'Low Stock Alerts' : 'In stock';

    await this.updateInventory(itemId, {
      quantity: newQuantity,
      status: newStatus,
    });

    await this.addStockMovement({
      propertyId: item.propertyId || '',
      itemId: item.id,
      itemName: item.name,
      change: quantity,
      delta: `+${quantity}`,
      type: 'Purchase',
      supplier,
      cost,
      reason: notes || 'Stock purchase restocking',
      performedBy: this.roleService.currentRole() || 'owner',
      timestamp: new Date().toISOString(),
      tone: 'success',
    });
  }

  async recordStockConsumption(
    itemId: string,
    quantity: number,
    reason?: string,
  ): Promise<void> {
    const item = this.getInventoryItem(itemId);
    if (!item) return;

    const newQuantity = Math.max(0, (item.quantity || 0) - quantity);
    const used = (item.usedQuantity || 0) + quantity;
    const newStatus =
      newQuantity === 0
        ? 'Out of Stock'
        : newQuantity <= item.min
          ? 'Low Stock Alerts'
          : 'In stock';

    await this.updateInventory(itemId, {
      quantity: newQuantity,
      usedQuantity: used,
      status: newStatus,
    });

    await this.addStockMovement({
      propertyId: item.propertyId || '',
      itemId: item.id,
      itemName: item.name,
      change: -quantity,
      delta: `-${quantity}`,
      type: 'Consumption',
      reason: reason || 'Routine daily consumption',
      performedBy: this.roleService.currentRole() || 'owner',
      timestamp: new Date().toISOString(),
      tone: 'warm',
    });
  }

  async recordStockDamage(
    itemId: string,
    quantity: number,
    reason?: string,
  ): Promise<void> {
    const item = this.getInventoryItem(itemId);
    if (!item) return;

    const newQuantity = Math.max(0, (item.quantity || 0) - quantity);
    const damaged = (item.damagedQuantity || 0) + quantity;
    const newStatus =
      newQuantity === 0
        ? 'Out of Stock'
        : newQuantity <= item.min
          ? 'Low Stock Alerts'
          : 'In stock';

    await this.updateInventory(itemId, {
      quantity: newQuantity,
      damagedQuantity: damaged,
      status: newStatus,
    });

    await this.addStockMovement({
      propertyId: item.propertyId || '',
      itemId: item.id,
      itemName: item.name,
      change: -quantity,
      delta: `-${quantity}`,
      type: 'Damage',
      reason: reason || 'Damaged goods reported',
      performedBy: this.roleService.currentRole() || 'owner',
      timestamp: new Date().toISOString(),
      tone: 'danger',
    });
  }

  async addStockMovement(movement: Omit<StockMovement, 'id'>): Promise<string> {
    const db = this.firebaseService.dbInstance;
    const movId = `SM-${Date.now()}`;
    const movRef = doc(db, 'inventory_movements', movId);
    const newMovement: StockMovement = {
      ...movement,
      id: movId,
      timestamp: movement.timestamp || new Date().toISOString(),
    };
    await setDoc(movRef, newMovement);
    return movId;
  }

  async deleteStockMovement(movementId: string): Promise<void> {
    const db = this.firebaseService.dbInstance;
    const movRef = doc(db, 'inventory_movements', movementId);
    await deleteDoc(movRef);
  }

  // ==========================================
  // EXPENSE CRUD OPERATIONS
  // ==========================================

  getExpense(expenseId: string): ExpenseItem | undefined {
    return this.rawExpenseItems().find((e) => e.id === expenseId);
  }

  async addExpense(data: ExpenseFormData): Promise<string> {
    const db = this.firebaseService.dbInstance;
    const docId = `EXP-${Date.now()}`;
    const docRef = doc(db, 'expenses', docId);
    const propertyId = this.getEffectivePropertyId(data.propertyId);
    const property = this.propertyService.properties().find((p) => p.id === propertyId);

    const expenseItem: ExpenseItem = {
      id: docId,
      propertyId,
      propertyName: property?.name || 'LemonWood Heritage',
      title: data.title,
      category: data.category,
      amount: `₹${data.amount.toLocaleString('en-IN')}`,
      numericAmount: data.amount,
      expenseDate: data.expenseDate,
      paymentMethod: data.paymentMethod,
      vendor: data.vendor,
      description: data.description,
      receiptUrl: data.receiptUrl,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isReversed: false,
    };
    await setDoc(docRef, expenseItem);
    return docId;
  }

  async updateExpense(expenseId: string, updates: Partial<ExpenseItem>): Promise<void> {
    const db = this.firebaseService.dbInstance;
    const docRef = doc(db, 'expenses', expenseId);
    await updateDoc(docRef, { ...updates, updatedAt: new Date().toISOString() });
  }

  async reverseExpense(expenseId: string, reason: string): Promise<void> {
    const db = this.firebaseService.dbInstance;
    const docRef = doc(db, 'expenses', expenseId);
    await updateDoc(docRef, {
      isReversed: true,
      reversalReason: reason,
      updatedAt: new Date().toISOString(),
    });
  }

  async deleteExpense(expenseId: string): Promise<void> {
    if (!this.roleService.isOwner()) {
      throw new Error('Unauthorized: Only the organization Owner can delete expense records.');
    }
    const db = this.firebaseService.dbInstance;
    const docRef = doc(db, 'expenses', expenseId);
    await deleteDoc(docRef);
  }

  // ==========================================
  // STAFF CRUD OPERATIONS
  // ==========================================

  getStaffMember(staffId: string): StaffMember | undefined {
    return this.rawStaff().find((s) => s.id === staffId);
  }

  async addStaffMember(member: Omit<StaffMember, 'id'>): Promise<string> {
    const db = this.firebaseService.dbInstance;
    const docId = `STF-${Date.now()}`;
    const docRef = doc(db, 'staff', docId);
    const newStaff: StaffMember = {
      ...member,
      id: docId,
      propertyId: this.getEffectivePropertyId(member.propertyId),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await setDoc(docRef, newStaff);
    return docId;
  }

  async updateStaffMember(staffId: string, updates: Partial<StaffMember>): Promise<void> {
    const db = this.firebaseService.dbInstance;
    const docRef = doc(db, 'staff', staffId);
    await updateDoc(docRef, { ...updates, updatedAt: new Date().toISOString() });
  }

  async toggleStaffStatus(staffId: string): Promise<void> {
    const member = this.getStaffMember(staffId);
    if (!member) return;
    const nextStatus = member.status === 'Present' ? 'On Leave' : 'Present';
    await this.updateStaffMember(staffId, { status: nextStatus });
  }

  async deleteStaffMember(staffId: string): Promise<void> {
    if (!this.roleService.isOwner() && !this.roleService.isManager()) {
      throw new Error('Unauthorized: Only Owner or Manager can remove staff members.');
    }
    const db = this.firebaseService.dbInstance;
    const docRef = doc(db, 'staff', staffId);
    await deleteDoc(docRef);
  }

  // ==========================================
  // HOUSEKEEPING CRUD OPERATIONS
  // ==========================================

  getHousekeepingTask(taskId: string): CleaningScheduleItem | undefined {
    return this.rawHousekeeping().find((t) => t.id === taskId);
  }

  async addHousekeepingTask(task: HousekeepingTaskCreateData): Promise<string> {
    const db = this.firebaseService.dbInstance;
    const docId = `HK-${Date.now()}`;
    const docRef = doc(db, 'housekeeping', docId);

    const newTask: CleaningScheduleItem = {
      id: docId,
      propertyId: this.getEffectivePropertyId(task.propertyId),
      room: task.room,
      type: task.type || 'Standard',
      assignedTo: task.assignedTo || 'Unassigned',
      assignedStaffId: task.assignedStaffId,
      status: 'Pending',
      time: 'Now',
      priority: task.priority,
      notes: task.notes,
      createdAt: new Date().toISOString(),
    };

    await setDoc(docRef, newTask);
    return docId;
  }

  async updateHousekeepingStatus(
    taskId: string,
    status: HousekeepingTaskStatus,
    roomId?: string,
  ): Promise<void> {
    const db = this.firebaseService.dbInstance;
    const docRef = doc(db, 'housekeeping', taskId);
    await updateDoc(docRef, {
      status,
      completedAt: status === 'Completed' || status === 'Verified' ? new Date().toISOString() : undefined,
    });

    const task = this.getHousekeepingTask(taskId);
    const targetRoomNumber = roomId || task?.room;
    if (targetRoomNumber) {
      const room = this.rawRooms().find(
        (r) => r.number === targetRoomNumber || r.id === targetRoomNumber,
      );
      if (room) {
        if (status === 'Verified' || status === 'Completed') {
          await this.updateRoomStatus(room.id, 'Available');
        } else if (status === 'In Progress') {
          await this.updateRoomStatus(room.id, 'Cleaning');
        } else if (status === 'Inspection Required') {
          await this.updateRoomStatus(room.id, 'Inspection');
        }
      }
    }
  }

  async assignHousekeepingTask(
    taskId: string,
    staffId: string,
    staffName: string,
  ): Promise<void> {
    const db = this.firebaseService.dbInstance;
    const docRef = doc(db, 'housekeeping', taskId);
    await updateDoc(docRef, {
      assignedStaffId: staffId,
      assignedTo: staffName,
      status: 'Assigned',
    });
  }

  async deleteHousekeepingTask(taskId: string): Promise<void> {
    const db = this.firebaseService.dbInstance;
    const docRef = doc(db, 'housekeeping', taskId);
    await deleteDoc(docRef);
  }
}
