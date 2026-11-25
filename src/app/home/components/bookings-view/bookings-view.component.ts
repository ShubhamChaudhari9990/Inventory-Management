import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonButton, IonIcon, IonModal } from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';
import { addIcons } from 'ionicons';
import {
  addOutline,
  searchOutline,
  eyeOutline,
  logInOutline,
  logOutOutline,
  closeCircleOutline,
  checkmarkCircleOutline,
  closeOutline,
  calendarOutline,
} from 'ionicons/icons';

import { AppToastService } from '../../../shared/services/app-toast.service';
import {
  bookingFilterLabelKey,
  statusLabelKey,
} from '../../../shared/i18n/label-keys';
import {
  BOOKING_CHANNEL_FILTERS,
  BOOKING_VIEW_SUBTITLE,
  BookingChannel,
  BookingItem,
} from '../../data/bookings.data';
import { DashboardKpiCardComponent } from '../dashboard-kpi-card/dashboard-kpi-card.component';
import { CustomerItem, DashboardKpi } from '../../../interface';
import { LodgeDataService } from '../../../services/lodge-data.service';
import { CustomerService } from '../../../services/customer.service';
import { BillingService } from '../../../services/billing.service';

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
  imports: [
    CommonModule,
    FormsModule,
    DashboardKpiCardComponent,
    IonButton,
    IonIcon,
    IonModal,
    TranslatePipe,
  ],
})
export class BookingsViewComponent {
  private readonly appToast = inject(AppToastService);
  private readonly lodgeData = inject(LodgeDataService);
  private readonly customerService = inject(CustomerService);
  private readonly billingService = inject(BillingService);
  private readonly router = inject(Router);

  constructor() {
    addIcons({
      addOutline,
      searchOutline,
      eyeOutline,
      logInOutline,
      logOutOutline,
      closeCircleOutline,
      checkmarkCircleOutline,
      closeOutline,
      calendarOutline,
    });
  }

  getBookingLedger(booking: BookingItem) {
    return this.billingService.computeBookingLedger(booking);
  }

  collectPaymentForBooking(booking: BookingItem): void {
    this.closeDetails();
    void this.router.navigate(['/payments/collect'], {
      queryParams: { bookingId: booking.id },
    });
  }

  readonly customerSearchQuery = signal('');
  readonly selectedCustomerId = signal<string | null>(null);
  readonly matchedCustomers = computed(() => {
    const q = this.customerSearchQuery().trim().toLowerCase();
    if (!q) return [];
    return this.customerService
      .customers()
      .filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.phone || '').toLowerCase().includes(q) ||
          (c.email || '').toLowerCase().includes(q),
      )
      .slice(0, 5);
  });

  readonly subtitle = BOOKING_VIEW_SUBTITLE;
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
  readonly isDetailsModalOpen = signal(false);
  readonly activeDetailBooking = signal<BookingItem | null>(null);

  readonly selectedRoom = signal('');
  readonly selectedSource = signal<(typeof BOOKING_SOURCE_OPTIONS)[number]>(
    'Walk-in',
  );
  readonly selectedPayment = signal<(typeof BOOKING_PAYMENT_OPTIONS)[number]>(
    'Cash',
  );

  readonly bookingBreakpoints: [number, number] = [0, 1];
  readonly bookingInitialBreakpoint = 1;
  readonly bookingModalClass = 'app-form-modal';

  readonly dynamicKpis = computed<DashboardKpi[]>(() => {
    const list = this.bookings();
    const activeCount = list.filter((b) => b.status === 'Paid' || b.status === 'Due').length;
    const walkIns = list.filter((b) => b.channel === 'Walk-in').length;
    const online = list.filter((b) => b.channel === 'Online').length;
    const totalRev = list
      .filter((b) => b.status !== 'Cancelled')
      .reduce((sum, b) => {
        const n = Number(b.amount.replace(/[^0-9.-]+/g, '')) || 0;
        return sum + n;
      }, 0);

    return [
      {
        id: 'total-bookings',
        label: 'Total Bookings',
        value: String(list.length),
        icon: 'calendar-outline',
        tone: 'primary',
      },
      {
        id: 'active-stays',
        label: 'Active / Confirmed',
        value: String(activeCount),
        icon: 'bed-outline',
        tone: 'success',
      },
      {
        id: 'walkin-ratio',
        label: 'Walk-ins / Online',
        value: `${walkIns} / ${online}`,
        icon: 'people-outline',
        tone: 'warm',
      },
      {
        id: 'booking-rev',
        label: 'Total Value',
        value: `₹${totalRev.toLocaleString('en-IN')}`,
        icon: 'cash-outline',
        tone: 'primary',
      },
    ];
  });

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

  openDetails(booking: BookingItem, event: Event): void {
    event.stopPropagation();
    this.activeDetailBooking.set(booking);
    this.isDetailsModalOpen.set(true);
  }

  closeDetails(): void {
    this.isDetailsModalOpen.set(false);
    this.activeDetailBooking.set(null);
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

  async checkInGuest(booking: BookingItem, event: Event): Promise<void> {
    event.stopPropagation();
    try {
      await this.lodgeData.checkInGuest(booking.id);
      await this.appToast.show(`Guest ${booking.guestName} checked in.`, 2500, 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error checking in';
      await this.appToast.show(msg, 3000, 'danger');
    }
  }

  async checkoutGuest(booking: BookingItem, event: Event): Promise<void> {
    event.stopPropagation();
    try {
      await this.lodgeData.checkoutGuest(booking.id, booking.room);
      await this.appToast.show(`Room ${booking.room} checked out & set to cleaning.`, 2500, 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error checking out';
      await this.appToast.show(msg, 3000, 'danger');
    }
  }

  async cancelBooking(booking: BookingItem, event: Event): Promise<void> {
    event.stopPropagation();
    try {
      await this.lodgeData.cancelBooking(booking.id, 'Cancelled by manager');
      await this.appToast.show(`Booking ${booking.id} has been cancelled.`, 2500, 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error cancelling booking';
      await this.appToast.show(msg, 3000, 'danger');
    }
  }

  selectCustomerForBooking(
    customer: CustomerItem,
    guestInput: HTMLInputElement,
    phoneInput: HTMLInputElement,
  ): void {
    this.selectedCustomerId.set(customer.id);
    if (guestInput) guestInput.value = customer.name;
    if (phoneInput) phoneInput.value = customer.phone;
    this.customerSearchQuery.set('');
  }

  async quickCreateCustomerForBooking(
    guestInput: HTMLInputElement,
    phoneInput: HTMLInputElement,
  ): Promise<void> {
    const name = guestInput?.value?.trim();
    const phone = phoneInput?.value?.trim();
    if (!name || !phone) {
      await this.appToast.warning('Enter guest name and phone first.');
      return;
    }
    try {
      const initials = name
        .split(/\s+/)
        .map((p) => p[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();
      const newId = await this.customerService.createCustomer({
        initials,
        name,
        fullName: name,
        phone,
        city: 'Local',
        idType: 'Aadhaar',
        idNumber: '',
        customerType: 'Regular',
        customerStatus: 'active',
        status: 'Paid',
        visits: 0,
        due: '₹0',
      });
      this.selectedCustomerId.set(newId);
      await this.appToast.success(`Customer "${name}" created & linked.`);
    } catch (err: any) {
      await this.appToast.error(err?.message || 'Could not create customer.');
    }
  }

  openCustomerProfile(booking: BookingItem): void {
    if (booking.customerId) {
      void this.router.navigate(['/customers', booking.customerId]);
      return;
    }
    const found = this.customerService
      .customers()
      .find(
        (c) =>
          (booking.guestPhone && c.phone === booking.guestPhone) ||
          c.name.toLowerCase() === booking.guestName.toLowerCase(),
      );
    if (found) {
      void this.router.navigate(['/customers', found.id]);
    } else {
      void this.router.navigate(['/customers']);
    }
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
    const roomNum = this.selectedRoom() || this.availableRooms[0]?.number || '';
    if (!roomNum) {
      await this.appToast.warning('No available room selected for booking.');
      return;
    }
    const targetRoom =
      this.availableRooms.find((r) => r.number === roomNum) ||
      this.lodgeData.rooms().find((r) => r.number === roomNum);

    try {
      const bookingPayload: Omit<BookingItem, 'id'> = {
        ...(targetRoom?.propertyId ? { propertyId: targetRoom.propertyId } : {}),
        ...(this.selectedCustomerId() ? { customerId: this.selectedCustomerId()! } : {}),
        guestName,
        guestPhone,
        room: roomNum,
        ...(targetRoom?.type ? { roomType: targetRoom.type } : {}),
        checkIn,
        checkOut,
        amount,
        advance,
        status: 'Paid',
        channel: this.selectedSource(),
      };
      await this.lodgeData.addBooking(bookingPayload);
      this.selectedCustomerId.set(null);

      if (targetRoom) {
        await this.lodgeData.updateRoomStatus(targetRoom.id, 'Occupied');
      }

      this.closeNewBooking();
      await this.appToast.show('Booking created successfully.', 2500, 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error creating booking';
      await this.appToast.show(msg, 3000, 'danger');
    }
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
