import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { IonButton, IonIcon } from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';
import { addIcons } from 'ionicons';
import {
  businessOutline,
  bedOutline,
  logInOutline,
  logOutOutline,
  calendarOutline,
  peopleOutline,
  cashOutline,
  receiptOutline,
  trendingUpOutline,
  trendingDownOutline,
  cardOutline,
  alertCircleOutline,
  checkmarkCircleOutline,
  timeOutline,
  arrowForwardOutline,
  funnelOutline,
  refreshOutline,
  chevronForwardOutline,
  appsOutline,
  eyeOutline,
  pieChartOutline,
} from 'ionicons/icons';

import { AppShellComponent } from '../../shared/components/app-shell/app-shell.component';
import { DashboardKpiCardComponent } from '../../home/components/dashboard-kpi-card/dashboard-kpi-card.component';
import { DashboardSectionCardComponent } from '../../home/components/dashboard-section-card/dashboard-section-card.component';
import {
  DashboardAxisChartComponent,
  DashboardDonutChartComponent,
} from '../../home/components/dashboard-charts/dashboard-charts.component';

// Views for navigation
import { LodgesViewComponent } from '../../home/components/lodges-view/lodges-view.component';
import { RoomsViewComponent } from '../../home/components/rooms-view/rooms-view.component';
import { BookingsViewComponent } from '../../home/components/bookings-view/bookings-view.component';
import { PaymentsViewComponent } from '../../home/components/payments-view/payments-view.component';
import { CustomersViewComponent } from '../../home/components/customers-view/customers-view.component';
import { InventoryViewComponent } from '../../home/components/inventory-view/inventory-view.component';
import { RevenueViewComponent } from '../../home/components/revenue-view/revenue-view.component';
import { ExpensesViewComponent } from '../../home/components/expenses-view/expenses-view.component';
import { StaffViewComponent } from '../../home/components/staff-view/staff-view.component';
import { HousekeepingViewComponent } from '../../home/components/housekeeping-view/housekeeping-view.component';
import { ReportsViewComponent } from '../../home/components/reports-view/reports-view.component';
import { SettingsViewComponent } from '../../home/components/settings-view/settings-view.component';
import { MoreMenuViewComponent } from '../../home/components/more-menu-view/more-menu-view.component';

// Services, Data & Interfaces
import { LodgeDataService } from '../../services/lodge-data.service';
import { PropertyService } from '../../services/property.service';
import { RoleService } from '../../services/role.service';
import { AppToastService } from '../../shared/services/app-toast.service';
import { MORE_MENU_ITEMS } from '../../home/data/more-menu.data';
import {
  DashboardDateFilter,
  DashboardKpi,
  LodgePerformanceItem,
  ImportantAlertItem,
} from '../../interface';
import {
  BOOKING_TREND_CHART,
  MONTHLY_REVENUE_CHART,
  OCCUPANCY_RATE_CHART,
  REVENUE_EXPENSE_CHART,
  ROOM_STATUS_CHART,
  ROOM_STATUS_LEGEND,
} from '../../home/data/dashboard-charts.data';

@Component({
  selector: 'app-owner-dashboard',
  templateUrl: './owner-dashboard.page.html',
  styleUrls: ['./owner-dashboard.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonButton,
    IonIcon,
    TranslatePipe,
    AppShellComponent,
    DashboardKpiCardComponent,
    DashboardSectionCardComponent,
    DashboardAxisChartComponent,
    DashboardDonutChartComponent,
    LodgesViewComponent,
    RoomsViewComponent,
    BookingsViewComponent,
    PaymentsViewComponent,
    CustomersViewComponent,
    InventoryViewComponent,
    RevenueViewComponent,
    ExpensesViewComponent,
    StaffViewComponent,
    HousekeepingViewComponent,
    ReportsViewComponent,
    SettingsViewComponent,
    MoreMenuViewComponent,
  ],
})
export class OwnerDashboardPage {
  private readonly lodgeData = inject(LodgeDataService);
  private readonly propertyService = inject(PropertyService);
  private readonly roleService = inject(RoleService);
  private readonly toast = inject(AppToastService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute, { optional: true });

  readonly activeNavId = signal('dashboard');
  readonly selectedDateFilter = signal<DashboardDateFilter>('month');
  readonly customStartDate = signal('');
  readonly customEndDate = signal('');
  readonly moreMenuItems = MORE_MENU_ITEMS;

  // Multi-lodge signals from PropertyService
  readonly properties = this.propertyService.properties;
  readonly selectedPropertyId = this.propertyService.selectedPropertyId;
  readonly selectedPropertyName = this.propertyService.selectedPropertyName;

  // Chart templates
  readonly revenueExpenseChart = REVENUE_EXPENSE_CHART;
  readonly monthlyRevenueChart = MONTHLY_REVENUE_CHART;
  readonly occupancyRateChart = OCCUPANCY_RATE_CHART;
  readonly bookingTrendChart = BOOKING_TREND_CHART;
  readonly roomStatusLegend = ROOM_STATUS_LEGEND;

  constructor() {
    addIcons({
      businessOutline,
      bedOutline,
      logInOutline,
      logOutOutline,
      calendarOutline,
      peopleOutline,
      cashOutline,
      receiptOutline,
      trendingUpOutline,
      trendingDownOutline,
      cardOutline,
      alertCircleOutline,
      checkmarkCircleOutline,
      timeOutline,
      arrowForwardOutline,
      funnelOutline,
      refreshOutline,
      chevronForwardOutline,
      appsOutline,
      eyeOutline,
      pieChartOutline,
    });
    this.route?.queryParamMap.subscribe((params) => {
      const nav = params.get('nav');
      if (nav && nav !== 'lodges') {
        this.activeNavId.set(nav);
      }
    });
  }

  // ----------------------------------------------------
  // Dynamic KPIs (12 Required KPIs)
  // ----------------------------------------------------
  readonly ownerKpis = computed<DashboardKpi[]>(() => {
    const rooms = this.lodgeData.rooms();
    const bookings = this.lodgeData.bookings();
    const customers = this.lodgeData.customers();
    const payments = this.lodgeData.payments();
    const expenses = this.lodgeData.expenseItems();

    const totalRooms = rooms.length;
    const occupiedRooms = rooms.filter((r) => r.status === 'Occupied').length;
    const availableRooms = rooms.filter((r) => r.status === 'Available').length;

    // Check-in / out stats (today)
    const today = new Date().toISOString().slice(0, 10);
    const todayCheckins = bookings.filter((b) => b.checkIn === today || b.status === 'Paid').length;
    const todayCheckouts = bookings.filter((b) => b.checkOut === today || b.status === 'Due').length;
    const totalBookings = bookings.length;
    const totalCustomers = customers.length;

    // Financials
    const totalRev = payments.reduce((sum, p) => sum + (p.numericAmount || 0), 0);
    const totalExp = expenses.reduce((sum, e) => sum + (e.numericAmount || 0), 0);
    const netProfit = totalRev - totalExp;

    const pendingPayments = bookings
      .filter((b) => b.status === 'Due' || b.status === 'Pending')
      .reduce((sum, b) => {
        const amt = parseFloat(b.amount?.replace(/[^0-9.-]+/g, '') || '0');
        return sum + (isNaN(amt) ? 0 : amt);
      }, 0);

    const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

    return [
      {
        id: 'occupancy-rate',
        label: 'Occupancy Rate',
        value: `${occupancyRate}%`,
        meta: `${occupiedRooms} of ${totalRooms} rooms occupied`,
        icon: 'pie-chart-outline',
        tone: 'primary',
      },
      {
        id: 'total-rooms',
        label: 'Total Rooms',
        value: String(totalRooms),
        meta: `${occupiedRooms} occupied`,
        icon: 'bed-outline',
        tone: 'primary',
      },
      {
        id: 'occupied-rooms',
        label: 'Occupied Rooms',
        value: String(occupiedRooms),
        meta: totalRooms > 0 ? `${Math.round((occupiedRooms / totalRooms) * 100)}% occupancy` : '0%',
        icon: 'bed-outline',
        tone: 'warm',
      },
      {
        id: 'available-rooms',
        label: 'Available Rooms',
        value: String(availableRooms),
        meta: 'Ready for booking',
        icon: 'checkmark-circle-outline',
        tone: 'success',
      },
      {
        id: 'today-checkins',
        label: "Today's Check-ins",
        value: String(todayCheckins),
        meta: 'Expected arrivals',
        icon: 'log-in-outline',
        tone: 'primary',
      },
      {
        id: 'today-checkouts',
        label: "Today's Check-outs",
        value: String(todayCheckouts),
        meta: 'Expected departures',
        icon: 'log-out-outline',
        tone: 'muted',
      },
      {
        id: 'total-bookings',
        label: 'Total Bookings',
        value: String(totalBookings),
        meta: 'Active reservations',
        icon: 'calendar-outline',
        tone: 'accent',
      },
      {
        id: 'total-customers',
        label: 'Total Customers',
        value: String(totalCustomers),
        meta: 'Registered guests',
        icon: 'people-outline',
        tone: 'secondary',
      },
      {
        id: 'monthly-revenue',
        label: 'Monthly Revenue',
        value: `₹${totalRev.toLocaleString('en-IN')}`,
        meta: '+14% from last month',
        icon: 'cash-outline',
        tone: 'success',
      },
      {
        id: 'monthly-expenses',
        label: 'Monthly Expenses',
        value: `₹${totalExp.toLocaleString('en-IN')}`,
        meta: 'Operating costs',
        icon: 'receipt-outline',
        tone: 'danger',
      },
      {
        id: 'net-profit',
        label: 'Net Profit',
        value: `₹${netProfit.toLocaleString('en-IN')}`,
        meta: netProfit >= 0 ? 'Healthy operating margin' : 'Deficit',
        icon: netProfit >= 0 ? 'trending-up-outline' : 'trending-down-outline',
        tone: netProfit >= 0 ? 'success' : 'danger',
      },
      {
        id: 'pending-payments',
        label: 'Pending Payments',
        value: `₹${pendingPayments.toLocaleString('en-IN')}`,
        meta: 'Outstanding guest dues',
        icon: 'card-outline',
        tone: 'warm',
      },
    ];
  });

  // ----------------------------------------------------
  // Dynamic Room Status Chart Donut
  // ----------------------------------------------------
  readonly dynamicRoomStatusChart = computed(() => {
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

  // ----------------------------------------------------
  // Lodge-wise Performance Comparison
  // ----------------------------------------------------
  readonly lodgePerformance = computed<LodgePerformanceItem[]>(() => {
    const props = this.properties();
    const allRooms = this.lodgeData.rooms();
    const allPayments = this.lodgeData.payments();
    const allExpenses = this.lodgeData.expenseItems();
    const allBookings = this.lodgeData.bookings();

    return props.map((prop) => {
      const pRooms = allRooms.filter((r) => r.propertyId === prop.id);
      const total = pRooms.length || prop.totalRooms || 1;
      const occupied = pRooms.filter((r) => r.status === 'Occupied').length;
      const occupancyRate = Math.round((occupied / total) * 100);

      const pPayments = allPayments.filter((p) => p.propertyId === prop.id);
      const pExpenses = allExpenses.filter((e) => e.propertyId === prop.id);
      const pBookings = allBookings.filter((b) => b.propertyId === prop.id);

      const rev = pPayments.reduce((acc, p) => acc + (p.numericAmount || 0), 0);
      const exp = pExpenses.reduce((acc, e) => acc + (e.numericAmount || 0), 0);
      const dues = pBookings
        .filter((b) => b.status === 'Due')
        .reduce((acc, b) => acc + parseFloat(b.amount?.replace(/[^0-9.-]+/g, '') || '0'), 0);

      return {
        id: prop.id,
        name: prop.name,
        code: prop.code,
        city: prop.city || 'Kolhapur',
        totalRooms: total,
        occupiedRooms: occupied,
        occupancyRate,
        monthlyRevenue: rev,
        monthlyExpenses: exp,
        netProfit: rev - exp,
        pendingDues: dues,
        status: prop.status,
      };
    });
  });

  // ----------------------------------------------------
  // Recent Bookings & Payments
  // ----------------------------------------------------
  readonly recentBookings = computed(() => {
    return this.lodgeData
      .bookings()
      .slice(0, 6)
      .map((b) => ({
        id: b.id,
        guest: b.guestName,
        room: `Room ${b.room}`,
        checkIn: b.checkIn,
        checkOut: b.checkOut,
        amount: b.amount,
        status: b.status as any,
        propertyName: b.propertyName || 'LemonWood',
        contact: b.guestPhone || b.contact || '',
      }));
  });

  readonly recentPayments = computed(() => {
    return this.lodgeData
      .payments()
      .slice(0, 6)
      .map((p) => ({
        id: p.id,
        guest: p.guestName,
        method: p.method,
        amount: `₹${(p.numericAmount || 0).toLocaleString('en-IN')}`,
        time: p.createdAt ? p.createdAt.slice(0, 10) : 'Today',
        propertyId: p.propertyId,
        status: p.status,
      }));
  });

  // ----------------------------------------------------
  // Upcoming Check-ins & Check-outs
  // ----------------------------------------------------
  readonly upcomingCheckins = computed(() => {
    const list = this.lodgeData.bookings();
    return list.slice(0, 5).map((b) => {
      const parsedAmount = parseFloat(b.amount?.replace(/[^0-9.-]+/g, '') || '0');
      return {
        id: b.id,
        guestName: b.guestName,
        phone: b.guestPhone || b.contact || '',
        roomNumber: b.room,
        roomType: b.roomType || 'Deluxe',
        scheduledTime: '12:00 PM',
        status: 'Expected' as const,
        amountDue: b.status === 'Due' ? (isNaN(parsedAmount) ? 0 : parsedAmount) : 0,
        paymentStatus: b.status === 'Paid' ? ('Paid' as const) : ('Pending' as const),
        propertyId: b.propertyId || '',
      };
    });
  });

  readonly upcomingCheckouts = computed(() => {
    const list = this.lodgeData.bookings();
    return list.slice(2, 7).map((b) => {
      const parsedAmount = parseFloat(b.amount?.replace(/[^0-9.-]+/g, '') || '0');
      return {
        id: b.id,
        guestName: b.guestName,
        phone: b.guestPhone || b.contact || '',
        roomNumber: b.room,
        roomType: b.roomType || 'Suite',
        scheduledTime: '11:00 AM',
        status: 'Expected' as const,
        amountDue: b.status === 'Due' ? (isNaN(parsedAmount) ? 0 : parsedAmount) : 0,
        paymentStatus: b.status === 'Paid' ? ('Paid' as const) : ('Pending' as const),
        propertyId: b.propertyId || '',
      };
    });
  });

  // ----------------------------------------------------
  // Recent Activities
  // ----------------------------------------------------
  readonly recentActivities = computed(() => {
    return this.lodgeData.recentActivity();
  });

  // ----------------------------------------------------
  // Important Alerts
  // ----------------------------------------------------
  readonly importantAlerts = computed<ImportantAlertItem[]>(() => {
    const alerts: ImportantAlertItem[] = [];

    const pendingUsers = this.roleService.registeredUsers().filter(
      (u) => (u.accountStatus || u.status) === 'pending' || !u.role,
    );
    if (pendingUsers.length > 0) {
      alerts.push({
        id: 'al-pending-users',
        title: 'New Account Approval Requests',
        description: `${pendingUsers.length} user(s) awaiting role assignment and lodge access authorization.`,
        severity: 'warning',
        time: 'Immediate',
        actionLabel: 'Review Approvals',
        actionId: 'staff',
      });
    }

    const lowStock = this.lodgeData.inventory().filter((i) => i.quantity <= i.min);
    if (lowStock.length > 0) {
      alerts.push({
        id: 'al-stock',
        title: 'Low Inventory Alert',
        description: `${lowStock.length} items reached low stock thresholds. Reorder needed.`,
        severity: 'warning',
        time: 'Today',
        actionLabel: 'View Inventory',
        actionId: 'inventory',
      });
    }

    const roomsMaint = this.lodgeData.rooms().filter((r) => r.status === 'Maintenance');
    if (roomsMaint.length > 0) {
      alerts.push({
        id: 'al-maint',
        title: 'Rooms Under Maintenance',
        description: `${roomsMaint.length} rooms are currently out of service for repair.`,
        severity: 'danger',
        time: 'Active',
        actionLabel: 'View Rooms',
        actionId: 'rooms',
      });
    }

    const pendingDues = this.lodgeData
      .bookings()
      .filter((b) => b.status === 'Due' || b.status === 'Pending')
      .reduce((sum, b) => {
        const amt = parseFloat(b.amount?.replace(/[^0-9.-]+/g, '') || '0');
        return sum + (isNaN(amt) ? 0 : amt);
      }, 0);

    if (pendingDues > 0) {
      alerts.push({
        id: 'al-pay',
        title: 'Pending Guest Dues',
        description: `₹${pendingDues.toLocaleString('en-IN')} in outstanding departure dues awaiting settlement.`,
        severity: 'info',
        time: 'Today',
        actionLabel: 'Collect Payments',
        actionId: 'payments',
      });
    }

    return alerts;
  });

  // ----------------------------------------------------
  // Filter Handlers
  // ----------------------------------------------------
  setLodgeFilter(propId: string): void {
    this.propertyService.switchProperty(propId as any);
  }

  setDateFilter(filter: DashboardDateFilter): void {
    this.selectedDateFilter.set(filter);
    void this.toast.show(`Filter set to: ${filter.replace('_', ' ').toUpperCase()}`, 1500, 'success');
  }

  navigateTo(navId: string): void {
    if (navId === 'lodges') {
      void this.router.navigate(['/lodges']);
      return;
    }
    if (navId === 'rooms') {
      void this.router.navigate(['/rooms']);
      return;
    }
    if (navId === 'customers') {
      void this.router.navigate(['/customers']);
      return;
    }
    if (navId === 'payments') {
      void this.router.navigate(['/payments']);
      return;
    }
    if (navId === 'staff') {
      void this.router.navigate(['/staff']);
      return;
    }
    if (navId === 'housekeeping') {
      void this.router.navigate(['/housekeeping']);
      return;
    }
    if (navId === 'inventory' || navId === 'operations') {
      void this.router.navigate(['/operations']);
      return;
    }
    if (navId === 'maintenance') {
      void this.router.navigate(['/maintenance/requests']);
      return;
    }
    if (navId === 'reports') {
      void this.router.navigate(['/reports']);
      return;
    }
    this.activeNavId.set(navId);
  }

  // Active view checkers
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
}
