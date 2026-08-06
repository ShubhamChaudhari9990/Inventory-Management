import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ViewWillEnter } from '@ionic/angular';
import { IonButton, IonIcon } from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';

import { AppShellComponent } from '../shared/components/app-shell/app-shell.component';
import { DEFAULT_NAV_ID } from '../shared/data/nav-items';
import {
  paymentMethodLabelKey,
  statusLabelKey,
} from '../shared/i18n/label-keys';
import { BookingsViewComponent } from './components/bookings-view/bookings-view.component';
import { ComingSoonViewComponent } from './components/coming-soon-view/coming-soon-view.component';
import {
  DashboardAxisChartComponent,
  DashboardDonutChartComponent,
} from './components/dashboard-charts/dashboard-charts.component';
import { DashboardKpiCardComponent } from './components/dashboard-kpi-card/dashboard-kpi-card.component';
import { DashboardSectionCardComponent } from './components/dashboard-section-card/dashboard-section-card.component';
import { CustomersViewComponent } from './components/customers-view/customers-view.component';
import { ExpensesViewComponent } from './components/expenses-view/expenses-view.component';
import { HousekeepingViewComponent } from './components/housekeeping-view/housekeeping-view.component';
import { InventoryViewComponent } from './components/inventory-view/inventory-view.component';
import { MoreMenuViewComponent } from './components/more-menu-view/more-menu-view.component';
import { ReportsViewComponent } from './components/reports-view/reports-view.component';
import { RevenueViewComponent } from './components/revenue-view/revenue-view.component';
import { RoomsViewComponent } from './components/rooms-view/rooms-view.component';
import { SettingsViewComponent } from './components/settings-view/settings-view.component';
import { StaffViewComponent } from './components/staff-view/staff-view.component';
import {
  BOOKING_TREND_CHART,
  MONTHLY_REVENUE_CHART,
  OCCUPANCY_RATE_CHART,
  REVENUE_EXPENSE_CHART,
  ROOM_STATUS_CHART,
  ROOM_STATUS_LEGEND,
} from './data/dashboard-charts.data';
import {
  DASHBOARD_KPIS,
  QUICK_ACTIONS,
  RECENT_ACTIVITY,
  RECENT_BOOKINGS,
  RECENT_PAYMENTS,
  RecentBooking,
  RecentPayment,
} from './data/dashboard.data';
import { MORE_MENU_ITEMS, MoreMenuItem } from './data/more-menu.data';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  imports: [
    AppShellComponent,
    IonButton,
    IonIcon,
    TranslatePipe,
    DashboardAxisChartComponent,
    DashboardDonutChartComponent,
    DashboardKpiCardComponent,
    DashboardSectionCardComponent,
    BookingsViewComponent,
    CustomersViewComponent,
    ExpensesViewComponent,
    HousekeepingViewComponent,
    InventoryViewComponent,
    MoreMenuViewComponent,
    ReportsViewComponent,
    RevenueViewComponent,
    RoomsViewComponent,
    SettingsViewComponent,
    StaffViewComponent,
    ComingSoonViewComponent,
  ],
})
export class HomePage implements ViewWillEnter {
  private readonly router = inject(Router);

  readonly activeNavId = signal(DEFAULT_NAV_ID);
  readonly todayLabel = 'DASHBOARD.SUBTITLE';
  readonly kpis = DASHBOARD_KPIS;
  readonly moreMenuItems = MORE_MENU_ITEMS;
  readonly quickActions = QUICK_ACTIONS;
  readonly recentBookings = RECENT_BOOKINGS;
  readonly recentPayments = RECENT_PAYMENTS;
  readonly recentActivity = RECENT_ACTIVITY;
  readonly roomStatusLegend = ROOM_STATUS_LEGEND;
  readonly revenueExpenseChart = REVENUE_EXPENSE_CHART;
  readonly roomStatusChart = ROOM_STATUS_CHART;
  readonly monthlyRevenueChart = MONTHLY_REVENUE_CHART;
  readonly occupancyRateChart = OCCUPANCY_RATE_CHART;
  readonly bookingTrendChart = BOOKING_TREND_CHART;

  readonly statusLabelKey = statusLabelKey;
  readonly paymentMethodLabelKey = paymentMethodLabelKey;

  readonly isDashboardActive = computed(() => this.activeNavId() === 'dashboard');
  readonly isRoomsActive = computed(() => this.activeNavId() === 'rooms');
  readonly isBookingsActive = computed(() => this.activeNavId() === 'bookings');
  readonly isInventoryActive = computed(() => this.activeNavId() === 'inventory');
  readonly isCustomersActive = computed(() => this.activeNavId() === 'customers');
  readonly isRevenueActive = computed(() => this.activeNavId() === 'revenue');
  readonly isExpensesActive = computed(() => this.activeNavId() === 'expenses');
  readonly isStaffActive = computed(() => this.activeNavId() === 'staff');
  readonly isHousekeepingActive = computed(() => this.activeNavId() === 'housekeeping');
  readonly isReportsActive = computed(() => this.activeNavId() === 'reports');
  readonly isSettingsActive = computed(() => this.activeNavId() === 'settings');
  readonly isMoreActive = computed(() => this.activeNavId() === 'more');

  ionViewWillEnter(): void {
    this.activeNavId.set(DEFAULT_NAV_ID);
  }

  trackBooking(_: number, booking: RecentBooking): string {
    return `${booking.guest}-${booking.room}`;
  }

  trackPayment(_: number, payment: RecentPayment): string {
    return `${payment.guest}-${payment.time}`;
  }

  async onMoreItemClick(item: MoreMenuItem): Promise<void> {
    if (item.id === 'logout') {
      await this.router.navigateByUrl('/login');
      return;
    }

    this.activeNavId.set(item.id);
  }
}
