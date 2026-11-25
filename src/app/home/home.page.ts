import { Component, computed, inject, signal } from '@angular/core';
import { ViewWillEnter } from '@ionic/angular';
import { AlertController, IonButton, IonIcon } from '@ionic/angular/standalone';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../services/auth.service';
import { AppLockService } from '../services/app-lock.service';

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
import { LodgesViewComponent } from './components/lodges-view/lodges-view.component';
import { MoreMenuViewComponent } from './components/more-menu-view/more-menu-view.component';
import { PaymentsViewComponent } from './components/payments-view/payments-view.component';
import { ReportsViewComponent } from './components/reports-view/reports-view.component';
import { RevenueViewComponent } from './components/revenue-view/revenue-view.component';
import { RoomsViewComponent } from './components/rooms-view/rooms-view.component';
import { SettingsViewComponent } from './components/settings-view/settings-view.component';
import { StaffDashboardComponent } from './components/staff-dashboard/staff-dashboard.component';
import { StaffViewComponent } from './components/staff-view/staff-view.component';
import { RoleService } from '../services/role.service';
import { PropertyService } from '../services/property.service';
import {
  AxisChartOptions,
  DonutChartOptions,
  ROOM_STATUS_CHART,
  RoomStatusLegendItem,
  buildDynamicBookingTrendChart,
  buildDynamicMonthlyRevenueChart,
  buildDynamicOccupancyRateChart,
  buildDynamicRevenueExpenseChart,
  buildDynamicRoomStatusLegend,
} from './data/dashboard-charts.data';
import {
  QUICK_ACTIONS,
  RecentBooking,
  RecentPayment,
} from './data/dashboard.data';
import { MORE_MENU_ITEMS, MoreMenuItem } from './data/more-menu.data';

import { LodgeDataService } from '../services/lodge-data.service';

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
    PaymentsViewComponent,
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
    LodgesViewComponent,
    StaffDashboardComponent,
    ComingSoonViewComponent,
  ],
})
export class HomePage implements ViewWillEnter {
  private readonly lodgeData = inject(LodgeDataService);
  private readonly roleService = inject(RoleService);
  private readonly propertyService = inject(PropertyService);

  private readonly alertController = inject(AlertController);
  private readonly authService = inject(AuthService);
  private readonly appLockService = inject(AppLockService);
  private readonly translate = inject(TranslateService);

  readonly activeNavId = signal(DEFAULT_NAV_ID);
  readonly todayLabel = 'DASHBOARD.SUBTITLE';

  readonly isOwner = this.roleService.isOwner;
  readonly isManager = this.roleService.isManager;
  readonly isStaff = this.roleService.isStaff;
  readonly currentRole = this.roleService.currentRole;
  readonly selectedPropertyName = this.propertyService.selectedPropertyName;
  readonly selectedPropertyId = this.propertyService.selectedPropertyId;
  readonly properties = this.propertyService.properties;

  readonly dynamicKpis = computed(() => this.lodgeData.dynamicKpis());

  get kpis() {
    return this.dynamicKpis();
  }

  readonly dynamicRoomStatusChart = computed<DonutChartOptions>(() => {
    const rooms = this.lodgeData.rooms();
    const available = rooms.filter((r) => r.status === 'Available').length;
    const occupied = rooms.filter((r) => r.status === 'Occupied').length;
    const reserved = rooms.filter((r) => r.status === 'Reserved').length;
    const cleaning = rooms.filter((r) => r.status === 'Cleaning').length;
    const maintenance = rooms.filter((r) => r.status === 'Maintenance').length;

    return {
      ...ROOM_STATUS_CHART,
      series: [available, occupied, reserved, cleaning, maintenance],
    };
  });

  get roomStatusChart(): DonutChartOptions {
    return this.dynamicRoomStatusChart();
  }

  readonly dynamicRoomStatusLegend = computed<readonly RoomStatusLegendItem[]>(() => {
    return buildDynamicRoomStatusLegend(this.lodgeData.rooms());
  });

  get roomStatusLegend(): readonly RoomStatusLegendItem[] {
    return this.dynamicRoomStatusLegend();
  }

  readonly dynamicRevenueExpenseChart = computed<AxisChartOptions>(() => {
    return buildDynamicRevenueExpenseChart(this.lodgeData.payments(), this.lodgeData.expenseItems());
  });

  get revenueExpenseChart(): AxisChartOptions {
    return this.dynamicRevenueExpenseChart();
  }

  readonly dynamicMonthlyRevenueChart = computed<AxisChartOptions>(() => {
    return buildDynamicMonthlyRevenueChart(this.lodgeData.payments());
  });

  get monthlyRevenueChart(): AxisChartOptions {
    return this.dynamicMonthlyRevenueChart();
  }

  readonly dynamicOccupancyRateChart = computed<AxisChartOptions>(() => {
    return buildDynamicOccupancyRateChart(this.lodgeData.rooms(), this.lodgeData.bookings());
  });

  get occupancyRateChart(): AxisChartOptions {
    return this.dynamicOccupancyRateChart();
  }

  readonly dynamicBookingTrendChart = computed<AxisChartOptions>(() => {
    return buildDynamicBookingTrendChart(this.lodgeData.bookings());
  });

  get bookingTrendChart(): AxisChartOptions {
    return this.dynamicBookingTrendChart();
  }

  navigateTo(navId: string): void {
    this.activeNavId.set(navId);
  }

  readonly moreMenuItems = MORE_MENU_ITEMS;
  readonly quickActions = QUICK_ACTIONS;

  readonly dynamicRecentBookings = computed(() => this.lodgeData.recentBookings());
  get recentBookings() {
    return this.dynamicRecentBookings();
  }

  readonly dynamicRecentPayments = computed(() => this.lodgeData.recentPayments());
  get recentPayments() {
    return this.dynamicRecentPayments();
  }

  readonly dynamicRecentActivity = computed(() => this.lodgeData.recentActivity());
  get recentActivity() {
    return this.dynamicRecentActivity();
  }

  onQuickAction(actionId: string): void {
    switch (actionId) {
      case 'new-booking':
        this.navigateTo('bookings');
        break;
      case 'new-customer':
        this.navigateTo('customers');
        break;
      case 'add-expense':
        this.navigateTo('expenses');
        break;
      case 'add-inventory':
        this.navigateTo('inventory');
        break;
      case 'room-cleaning':
        this.navigateTo('housekeeping');
        break;
      default:
        break;
    }
  }

  readonly statusLabelKey = statusLabelKey;
  readonly paymentMethodLabelKey = paymentMethodLabelKey;

  readonly isDashboardActive = computed(() => this.activeNavId() === 'dashboard');
  readonly isLodgesActive = computed(() => this.activeNavId() === 'lodges');
  readonly isRoomsActive = computed(() => this.activeNavId() === 'rooms');
  readonly isBookingsActive = computed(() => this.activeNavId() === 'bookings');
  readonly isPaymentsActive = computed(() => this.activeNavId() === 'payments');
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
    void this.checkBiometricPrompt();
  }

  private async checkBiometricPrompt(): Promise<void> {
    const isAvailable = await this.authService.checkBiometricAvailability();
    if (!isAvailable) return;

    const isPrompted = await this.authService.isBiometricPrompted();
    if (isPrompted) return;

    await this.authService.setBiometricPrompted(true);

    const alert = await this.alertController.create({
      header: this.translate.instant('AUTH.BIOMETRIC_ENABLE_TITLE'),
      message: this.translate.instant('AUTH.BIOMETRIC_ENABLE_MSG'),
      buttons: [
        {
          text: this.translate.instant('AUTH.SKIP_FOR_NOW'),
          role: 'cancel',
        },
        {
          text: this.translate.instant('AUTH.ENABLE_NOW'),
          handler: async () => {
            try {
              await this.appLockService.setBiometricLock(true);
            } catch (e) {
              console.warn('Could not enable biometrics:', e);
            }
          },
        },
      ],
    });

    await alert.present();
  }

  trackBooking(_: number, booking: RecentBooking): string {
    return `${booking.guest}-${booking.room}`;
  }

  trackPayment(_: number, payment: RecentPayment): string {
    return `${payment.guest}-${payment.time}`;
  }

  async onMoreItemClick(item: MoreMenuItem): Promise<void> {
    if (item.id === 'logout') {
      await this.authService.logout();
      return;
    }

    this.activeNavId.set(item.id);
  }
}
