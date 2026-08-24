import { Injectable, inject, signal } from '@angular/core';
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
} from 'firebase/firestore';

import { FirebaseService } from './firebase.service';
import { ROOM_ITEMS, RoomItem, RoomStatus } from '../home/data/rooms.data';
import { BOOKING_ITEMS, BookingItem } from '../home/data/bookings.data';
import { INVENTORY_ITEMS, InventoryItem } from '../home/data/inventory.data';
import { CUSTOMER_ITEMS, CustomerItem } from '../home/data/customers.data';
import { EXPENSE_CATEGORIES, ExpenseCategory } from '../home/data/expenses.data';
import { STAFF_MEMBERS, StaffMember } from '../home/data/staff.data';
import { CLEANING_SCHEDULE, CleaningScheduleItem } from '../home/data/housekeeping.data';

export interface ExtendedBookingItem extends BookingItem {
  advance?: string;
}

@Injectable({
  providedIn: 'root',
})
export class LodgeDataService {
  private readonly firebaseService = inject(FirebaseService);

  readonly rooms = signal<RoomItem[]>([...ROOM_ITEMS]);
  readonly bookings = signal<ExtendedBookingItem[]>([...BOOKING_ITEMS]);
  readonly inventory = signal<InventoryItem[]>([...INVENTORY_ITEMS]);
  readonly customers = signal<CustomerItem[]>([...CUSTOMER_ITEMS]);
  readonly expenses = signal<ExpenseCategory[]>([...EXPENSE_CATEGORIES]);
  readonly staff = signal<StaffMember[]>([...STAFF_MEMBERS]);
  readonly housekeeping = signal<CleaningScheduleItem[]>([...CLEANING_SCHEDULE]);

  constructor() {
    this.initRealtimeListeners();
  }

  private initRealtimeListeners(): void {
    this.listenCollection<RoomItem>('rooms', ROOM_ITEMS, (items) => this.rooms.set(items));
    this.listenCollection<ExtendedBookingItem>('bookings', BOOKING_ITEMS, (items) => this.bookings.set(items));
    this.listenCollection<InventoryItem>('inventory', INVENTORY_ITEMS, (items) => this.inventory.set(items));
    this.listenCollection<CustomerItem>('customers', CUSTOMER_ITEMS, (items) => this.customers.set(items));
    this.listenCollection<ExpenseCategory>('expenses', EXPENSE_CATEGORIES, (items) => this.expenses.set(items));
    this.listenCollection<StaffMember>('staff', STAFF_MEMBERS, (items) => this.staff.set(items));
    this.listenCollection<CleaningScheduleItem>('housekeeping', CLEANING_SCHEDULE, (items) => this.housekeeping.set(items));
  }

  private listenCollection<T extends { id: string }>(
    collectionName: string,
    defaultItems: readonly T[],
    callback: (items: T[]) => void,
  ): void {
    const db = this.firebaseService.dbInstance;
    const colRef = collection(db, collectionName);

    onSnapshot(colRef, (snapshot) => {
      if (snapshot.empty && defaultItems.length > 0) {
        this.seedCollection(collectionName, defaultItems);
      } else {
        const items = snapshot.docs.map((docSnap) => ({
          ...docSnap.data(),
          id: docSnap.id,
        })) as T[];
        callback(items);
      }
    }, (error) => {
      console.warn(`Firestore listener error on ${collectionName}:`, error);
    });
  }

  private async seedCollection<T extends { id: string }>(
    collectionName: string,
    defaultItems: readonly T[],
  ): Promise<void> {
    const db = this.firebaseService.dbInstance;
    for (const item of defaultItems) {
      const docRef = doc(db, collectionName, item.id);
      await setDoc(docRef, { ...item });
    }
  }

  // --- Mutations ---

  async addRoom(room: Omit<RoomItem, 'id'>): Promise<void> {
    const db = this.firebaseService.dbInstance;
    const docId = room.number || `R-${Date.now()}`;
    const docRef = doc(db, 'rooms', docId);
    const newRoom: RoomItem = { ...room, id: docId };
    await setDoc(docRef, newRoom);
  }

  async updateRoomStatus(roomId: string, status: Exclude<RoomStatus, 'All'>): Promise<void> {
    const db = this.firebaseService.dbInstance;
    const docRef = doc(db, 'rooms', roomId);
    await updateDoc(docRef, { status });
  }

  async addBooking(booking: Omit<ExtendedBookingItem, 'id'>): Promise<void> {
    const db = this.firebaseService.dbInstance;
    const docId = `BK-${Math.floor(1000 + Math.random() * 9000)}`;
    const docRef = doc(db, 'bookings', docId);
    const newBooking: ExtendedBookingItem = { ...booking, id: docId };
    await setDoc(docRef, newBooking);
  }

  async addInventory(item: Omit<InventoryItem, 'id'>): Promise<void> {
    const db = this.firebaseService.dbInstance;
    const docId = `INV-${Date.now()}`;
    const docRef = doc(db, 'inventory', docId);
    const newItem: InventoryItem = { ...item, id: docId };
    await setDoc(docRef, newItem);
  }

  async addCustomer(customer: Omit<CustomerItem, 'id'>): Promise<void> {
    const db = this.firebaseService.dbInstance;
    const docId = `CUST-${Date.now()}`;
    const docRef = doc(db, 'customers', docId);
    const newCustomer: CustomerItem = { ...customer, id: docId };
    await setDoc(docRef, newCustomer);
  }

  async addExpenseCategory(category: Omit<ExpenseCategory, 'id'>): Promise<void> {
    const db = this.firebaseService.dbInstance;
    const docId = `EXP-${Date.now()}`;
    const docRef = doc(db, 'expenses', docId);
    const newCat: ExpenseCategory = { ...category, id: docId };
    await setDoc(docRef, newCat);
  }

  async addStaffMember(member: Omit<StaffMember, 'id'>): Promise<void> {
    const db = this.firebaseService.dbInstance;
    const docId = `STF-${Date.now()}`;
    const docRef = doc(db, 'staff', docId);
    const newStaff: StaffMember = { ...member, id: docId };
    await setDoc(docRef, newStaff);
  }

  async updateHousekeepingStatus(taskId: string, status: CleaningScheduleItem['status']): Promise<void> {
    const db = this.firebaseService.dbInstance;
    const docRef = doc(db, 'housekeeping', taskId);
    await updateDoc(docRef, { status });
  }
}
