import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ViewWillEnter } from '@ionic/angular';
import { IonButton, IonIcon } from '@ionic/angular/standalone';

import { AppShellComponent } from '../shared/components/app-shell/app-shell.component';
import { DEFAULT_NAV_ID } from '../shared/data/nav-items';
import { ComingSoonViewComponent } from './components/coming-soon-view/coming-soon-view.component';
import {
  DashboardAxisChartComponent,
  DashboardDonutChartComponent,
} from './components/dashboard-charts/dashboard-charts.component';
import { DashboardKpiCardComponent } from './components/dashboard-kpi-card/dashboard-kpi-card.component';
import { DashboardSectionCardComponent } from './components/dashboard-section-card/dashboard-section-card.component';
import { MoreMenuViewComponent } from './components/more-menu-view/more-menu-view.component';
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
    DashboardAxisChartComponent,
    DashboardDonutChartComponent,
    DashboardKpiCardComponent,
    DashboardSectionCardComponent,
    MoreMenuViewComponent,
    ComingSoonViewComponent,
  ],
})
export class HomePage implements ViewWillEnter {
  private readonly router = inject(Router);

  readonly activeNavId = signal(DEFAULT_NAV_ID);
  readonly todayLabel = "Today's overview — 26 July";
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

  readonly isDashboardActive = computed(() => this.activeNavId() === 'dashboard');
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
