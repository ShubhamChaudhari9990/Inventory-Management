import { Component, computed, OnDestroy, signal } from '@angular/core';
import { IonButton, IonIcon } from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';

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
import { DashboardKpiCardComponent } from '../dashboard-kpi-card/dashboard-kpi-card.component';

interface InvoiceToast {
  id: number;
  enter: boolean;
}

@Component({
  selector: 'app-bookings-view',
  templateUrl: './bookings-view.component.html',
  styleUrls: ['./bookings-view.component.scss'],
  imports: [DashboardKpiCardComponent, IonButton, IonIcon, TranslatePipe],
})
export class BookingsViewComponent implements OnDestroy {
  private static readonly MAX_TOASTS = 3;
  private static readonly TOAST_DURATION_MS = 3200;

  private nextToastId = 0;
  private readonly toastTimers = new Map<number, ReturnType<typeof setTimeout>>();

  readonly subtitle = BOOKING_VIEW_SUBTITLE;
  readonly kpis = BOOKING_KPIS;
  readonly filters = BOOKING_CHANNEL_FILTERS;
  readonly bookings = BOOKING_ITEMS;

  readonly bookingFilterLabelKey = bookingFilterLabelKey;
  readonly statusLabelKey = statusLabelKey;

  readonly query = signal('');
  readonly activeFilter = signal<BookingChannel>('All');
  readonly invoiceToasts = signal<InvoiceToast[]>([]);

  readonly filteredBookings = computed(() => {
    const query = this.query().trim().toLowerCase();
    const filter = this.activeFilter();

    return this.bookings.filter((booking) => {
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

  ngOnDestroy(): void {
    for (const timerId of this.toastTimers.values()) {
      clearTimeout(timerId);
    }
    this.toastTimers.clear();
  }

  onQueryInput(event: Event): void {
    const target = event.target as HTMLInputElement | null;
    this.query.set(target?.value ?? '');
  }

  setFilter(filter: BookingChannel): void {
    this.activeFilter.set(filter);
  }

  showInvoiceToast(): void {
    const id = ++this.nextToastId;

    this.invoiceToasts.update((toasts) => {
      const next = [...toasts, { id, enter: true }];
      while (next.length > BookingsViewComponent.MAX_TOASTS) {
        const removed = next.shift();
        if (removed) {
          this.clearToastTimer(removed.id);
        }
      }
      return next;
    });

    window.setTimeout(() => {
      this.invoiceToasts.update((toasts) =>
        toasts.map((toast) => (toast.id === id ? { ...toast, enter: false } : toast)),
      );
    }, 260);

    this.toastTimers.set(
      id,
      setTimeout(() => this.dismissInvoiceToast(id), BookingsViewComponent.TOAST_DURATION_MS),
    );
  }

  stackDepth(index: number): number {
    return this.invoiceToasts().length - 1 - index;
  }

  trackBooking(_: number, booking: BookingItem): string {
    return booking.id;
  }

  trackToast(_: number, toast: InvoiceToast): number {
    return toast.id;
  }

  private dismissInvoiceToast(id: number): void {
    this.clearToastTimer(id);
    this.invoiceToasts.update((toasts) => toasts.filter((toast) => toast.id !== id));
  }

  private clearToastTimer(id: number): void {
    const timerId = this.toastTimers.get(id);
    if (timerId) {
      clearTimeout(timerId);
      this.toastTimers.delete(id);
    }
  }
}
