import { Injectable, NgZone, computed, inject, signal } from '@angular/core';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { RoomItem, RoomPricingRule } from '../interface';
import { FirebaseService } from './firebase.service';
import { PropertyService } from './property.service';
import { RoleService } from './role.service';

export interface EffectivePriceBreakdown {
  nights: number;
  subtotal: number;
  taxAmount: number;
  total: number;
  nightlyRates: { date: string; rate: number; ruleApplied?: string }[];
}

@Injectable({
  providedIn: 'root',
})
export class RoomPricingService {
  private readonly ngZone = inject(NgZone);
  private readonly firebaseService = inject(FirebaseService);
  private readonly propertyService = inject(PropertyService);
  private readonly roleService = inject(RoleService);

  private unsub: (() => void) | null = null;
  private readonly rawRules = signal<RoomPricingRule[]>([]);

  readonly pricingRules = computed<RoomPricingRule[]>(() => {
    const selProp = this.propertyService.selectedPropertyId();
    return this.rawRules().filter((r) => {
      if (!this.roleService.canAccessProperty(r.propertyId)) return false;
      if (selProp !== 'all' && r.propertyId !== selProp) return false;
      return true;
    });
  });

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
      collection(db, 'roomPricing'),
      (snap) => {
        const list = snap.docs.map((d) => ({ ...(d.data() as RoomPricingRule), id: d.id }));
        this.ngZone.run(() => this.rawRules.set(list));
      },
      (err) => console.warn('RoomPricing listener error:', err.message),
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

  async createRule(
    data: Omit<RoomPricingRule, 'id' | 'organizationId' | 'createdAt'>,
  ): Promise<string> {
    if (this.roleService.isStaff()) {
      throw new Error('Staff cannot manage room pricing.');
    }
    const id = `PRC-${Date.now()}`;
    const item: RoomPricingRule = {
      ...data,
      id,
      organizationId: this.roleService.currentOrganizationId(),
      createdAt: new Date().toISOString(),
    };
    await setDoc(doc(this.firebaseService.dbInstance, 'roomPricing', id), item);
    return id;
  }

  async updateRule(ruleId: string, updates: Partial<RoomPricingRule>): Promise<void> {
    if (this.roleService.isStaff()) {
      throw new Error('Staff cannot update room pricing.');
    }
    await updateDoc(doc(this.firebaseService.dbInstance, 'roomPricing', ruleId), updates);
  }

  async deleteRule(ruleId: string): Promise<void> {
    if (this.roleService.isStaff()) {
      throw new Error('Staff cannot delete room pricing rules.');
    }
    await deleteDoc(doc(this.firebaseService.dbInstance, 'roomPricing', ruleId));
  }

  calculateEffectivePrice(
    room: RoomItem,
    checkInDate: string,
    checkOutDate: string,
  ): EffectivePriceBreakdown {
    const numericBase =
      room.basePrice ??
      (Number(String(room.price || '0').replace(/[^0-9.]/g, '')) || 0);
    const weekday = room.weekdayPrice ?? numericBase;
    const weekend = room.weekendPrice ?? numericBase;
    const taxRate = room.taxConfiguration?.taxRate ?? 12;
    const taxInclusive = room.taxConfiguration?.taxInclusive ?? false;

    const start = new Date(checkInDate);
    const end = new Date(checkOutDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
      return { nights: 0, subtotal: 0, taxAmount: 0, total: 0, nightlyRates: [] };
    }

    const activeRules = this.rawRules().filter(
      (r) =>
        r.isActive &&
        r.propertyId === (room.propertyId || '') &&
        (!r.roomId || r.roomId === room.id) &&
        (!r.roomTypeId || r.roomTypeId === room.roomTypeId),
    );

    const nightlyRates: { date: string; rate: number; ruleApplied?: string }[] = [];
    const cursor = new Date(start);
    let subtotal = 0;

    while (cursor < end && nightlyRates.length < 365) {
      const iso = cursor.toISOString().slice(0, 10);
      const day = cursor.getDay();
      const isWeekend = day === 0 || day === 5 || day === 6;
      let rate = isWeekend ? weekend : weekday;
      let ruleApplied: string | undefined;

      const matchingRule = activeRules.find(
        (r) => iso >= r.startDate && iso <= r.endDate,
      );
      if (matchingRule) {
        if (matchingRule.priceOverride !== undefined && matchingRule.priceOverride >= 0) {
          rate = matchingRule.priceOverride;
        } else if (matchingRule.percentageAdjustment) {
          rate = Math.round(rate * (1 + matchingRule.percentageAdjustment / 100));
        }
        ruleApplied = matchingRule.title;
      }

      nightlyRates.push({ date: iso, rate, ruleApplied });
      subtotal += rate;
      cursor.setDate(cursor.getDate() + 1);
    }

    const taxAmount = taxInclusive
      ? Math.round(subtotal - subtotal / (1 + taxRate / 100))
      : Math.round((subtotal * taxRate) / 100);
    const total = taxInclusive ? subtotal : subtotal + taxAmount;

    return {
      nights: nightlyRates.length,
      subtotal,
      taxAmount,
      total,
      nightlyRates,
    };
  }
}
