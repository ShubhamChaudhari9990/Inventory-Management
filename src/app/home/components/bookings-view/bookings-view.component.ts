import { Component, computed, inject, signal } from '@angular/core';
import { IonButton, IonIcon, IonModal } from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';

import { AppToastService } from '../../../shared/services/app-toast.service';
import {
  bookingFilterLabelKey,
  statusLabelKey,
} from '../../../shared/i18n/label-keys';
import {
  BOOKING_CHANNEL_FILTERS,
  BOOKING_ITEMS,
  BOOKING_KPIS,
  BOOKING_VIEW_SUBTITLE,
  BookingChannel,
  BookingItem,
} from '../../data/bookings.data';
import { ROOM_ITEMS } from '../../data/rooms.data';
import { DashboardKpiCardComponent } from '../dashboard-kpi-card/dashboard-kpi-card.component';

import { LodgeDataService } from '../../../services/lodge-data.service';

export const BOOKING_SOURCE_OPTIONS = ['Walk-in', 'Advance', 'Online'] as const;
export const BOOKING_PAYMENT_OPTIONS = [
  'Cash',
  'UPI',
  'Card',
  'Bank Transfer',
] as const;

@Component({
  selector: 'app-bookings-view',
  templateUrl: './bookings-view.component.html',
  styleUrls: ['./bookings-view.component.scss'],
  imports: [DashboardKpiCardComponent, IonButton, IonIcon, IonModal, TranslatePipe],
})
export class BookingsViewComponent {
  private readonly appToast = inject(AppToastService);
  private readonly lodgeData = inject(LodgeDataService);

  readonly subtitle = BOOKING_VIEW_SUBTITLE;
  readonly kpis = BOOKING_KPIS;
  readonly filters = BOOKING_CHANNEL_FILTERS;
  readonly bookings = this.lodgeData.bookings;
  readonly sourceOptions = BOOKING_SOURCE_OPTIONS;
  readonly paymentOptions = BOOKING_PAYMENT_OPTIONS;
  
  get availableRooms() {
    return this.lodgeData.rooms().filter((room) => room.status === 'Available');
  }

  readonly bookingFilterLabelKey = bookingFilterLabelKey;
  readonly statusLabelKey = statusLabelKey;

  readonly query = signal('');
  readonly activeFilter = signal<BookingChannel>('All');
  readonly isNewBookingOpen = signal(false);

  readonly selectedRoom = signal('');
  readonly selectedSource = signal<(typeof BOOKING_SOURCE_OPTIONS)[number]>(
    'Walk-in',
  );
  readonly selectedPayment = signal<(typeof BOOKING_PAYMENT_OPTIONS)[number]>(
    'Cash',
  );

  /** Always bottom sheet (web + app). */
  readonly bookingBreakpoints: [number, number] = [0, 1];
  readonly bookingInitialBreakpoint = 1;
  readonly bookingModalClass = 'app-form-modal';

  readonly filteredBookings = computed(() => {
    const query = this.query().trim().toLowerCase();
    const filter = this.activeFilter();

    return this.bookings().filter((booking) => {
      const matchesFilter = filter === 'All' || booking.channel === filter;
      const matchesQuery =
        !query ||
        booking.id.toLowerCase().includes(query) ||
        booking.guestName.toLowerCase().includes(query) ||
        booking.guestPhone.toLowerCase().includes(query) ||
        booking.room.toLowerCase().includes(query) ||
        booking.status.toLowerCase().includes(query) ||
        booking.channel.toLowerCase().includes(query);

      return matchesFilter && matchesQuery;
    });
  });

  onQueryInput(event: Event): void {
    const target = event.target as HTMLInputElement | null;
    this.query.set(target?.value ?? '');
  }

  setFilter(filter: BookingChannel): void {
    this.activeFilter.set(filter);
  }

  openNewBooking(): void {
    const avail = this.availableRooms;
    if (avail.length > 0 && !this.selectedRoom()) {
      this.selectedRoom.set(avail[0].number);
    }
    this.isNewBookingOpen.set(true);
  }

  closeNewBooking(): void {
    this.isNewBookingOpen.set(false);
  }

  onRoomChange(event: Event): void {
    const target = event.target as HTMLSelectElement | null;
    this.selectedRoom.set(target?.value ?? '');
  }

  onSourceChange(event: Event): void {
    const target = event.target as HTMLSelectElement | null;
    const value = target?.value as (typeof BOOKING_SOURCE_OPTIONS)[number];
    if (value) {
      this.selectedSource.set(value);
    }
  }

  onPaymentChange(event: Event): void {
    const target = event.target as HTMLSelectElement | null;
    const value = target?.value as (typeof BOOKING_PAYMENT_OPTIONS)[number];
    if (value) {
      this.selectedPayment.set(value);
    }
  }

  showInvoiceToast(): void {
    void this.appToast.show('BOOKINGS.INVOICE_READY', 3200);
  }

  async saveBooking(
    guestInput: HTMLInputElement,
    phoneInput: HTMLInputElement,
    checkInInput: HTMLInputElement,
    checkOutInput: HTMLInputElement,
    amountInput: HTMLInputElement,
    advanceInput: HTMLInputElement,
  ): Promise<void> {
    const guestName = guestInput?.value?.trim() || 'Guest User';
    const guestPhone = phoneInput?.value?.trim() || '9876543210';
    const checkIn = checkInInput?.value?.trim() || 'Today';
    const checkOut = checkOutInput?.value?.trim() || 'Tomorrow';
    const rawAmt = amountInput?.value?.trim() || '1800';
    const amount = rawAmt.startsWith('₹') ? rawAmt : `₹${rawAmt}`;
    const rawAdv = advanceInput?.value?.trim() || '0';
    const advance = rawAdv.startsWith('₹') ? rawAdv : `₹${rawAdv}`;
    const roomNum = this.selectedRoom() || (this.availableRooms[0]?.number ?? '101');

    await this.lodgeData.addBooking({
      guestName,
      guestPhone,
      room: roomNum,
      checkIn,
      checkOut,
      amount,
      advance,
      status: 'Paid',
      channel: this.selectedSource(),
    });

    const targetRoom = this.lodgeData.rooms().find((r) => r.number === roomNum);
    if (targetRoom) {
      await this.lodgeData.updateRoomStatus(targetRoom.id, 'Occupied');
    }

    this.closeNewBooking();
    await this.appToast.show('BOOKINGS.SHEET.SAVED');
  }

  sourceLabelKey(source: string): string {
    switch (source) {
      case 'Walk-in':
        return 'BOOKINGS.FILTER.WALK_IN';
      case 'Advance':
        return 'BOOKINGS.FILTER.ADVANCE';
      case 'Online':
        return 'BOOKINGS.FILTER.ONLINE';
      default:
        return source;
    }
  }

  paymentLabelKey(method: string): string {
    switch (method) {
      case 'Cash':
        return 'DASHBOARD.METHOD.CASH';
      case 'UPI':
        return 'DASHBOARD.METHOD.UPI';
      case 'Card':
        return 'DASHBOARD.METHOD.CARD';
      case 'Bank Transfer':
        return 'DASHBOARD.METHOD.BANK';
      default:
        return method;
    }
  }

  trackBooking(_: number, booking: BookingItem): string {
    return booking.id;
  }
}
