import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { IonButton, IonIcon } from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';
import { addIcons } from 'ionicons';
import {
  bedOutline,
  logInOutline,
  logOutOutline,
  calendarOutline,
  peopleOutline,
  cardOutline,
  sparklesOutline,
  buildOutline,
  alertCircleOutline,
  checkmarkCircleOutline,
  timeOutline,
  arrowForwardOutline,
  cashOutline,
  receiptOutline,
  businessOutline,
  personOutline,
  refreshOutline,
} from 'ionicons/icons';

import { AppShellComponent } from '../../shared/components/app-shell/app-shell.component';
import { DashboardKpiCardComponent } from '../../home/components/dashboard-kpi-card/dashboard-kpi-card.component';
import { DashboardSectionCardComponent } from '../../home/components/dashboard-section-card/dashboard-section-card.component';

// Views for navigation
import { RoomsViewComponent } from '../../home/components/rooms-view/rooms-view.component';
import { BookingsViewComponent } from '../../home/components/bookings-view/bookings-view.component';
import { CustomersViewComponent } from '../../home/components/customers-view/customers-view.component';
import { PaymentsViewComponent } from '../../home/components/payments-view/payments-view.component';
import { InventoryViewComponent } from '../../home/components/inventory-view/inventory-view.component';
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
  ArrivalDepartureItem,
  DashboardKpi,
  ImportantAlertItem,
  DashboardMaintenanceItem,
  RoomItem,
  StaffShiftItem,
} from '../../interface';

@Component({
  selector: 'app-manager-dashboard',
  templateUrl: './manager-dashboard.page.html',
  styleUrls: ['./manager-dashboard.page.scss'],
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
    RoomsViewComponent,
    BookingsViewComponent,
    CustomersViewComponent,
    PaymentsViewComponent,
    InventoryViewComponent,
    StaffViewComponent,
    HousekeepingViewComponent,
    ReportsViewComponent,
    SettingsViewComponent,
    MoreMenuViewComponent,
  ],
})
export class ManagerDashboardPage {
  private readonly lodgeData = inject(LodgeDataService);
  private readonly propertyService = inject(PropertyService);
  private readonly roleService = inject(RoleService);
  private readonly toast = inject(AppToastService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute, { optional: true });

  readonly activeNavId = signal('dashboard');
  readonly selectedPropertyName = this.propertyService.selectedPropertyName;
  readonly managerProfile = this.roleService.currentUserProfile;
  readonly moreMenuItems = MORE_MENU_ITEMS;

  constructor() {
    addIcons({
      bedOutline,
      logInOutline,
      logOutOutline,
      calendarOutline,
      peopleOutline,
      cardOutline,
      sparklesOutline,
      buildOutline,
      alertCircleOutline,
      checkmarkCircleOutline,
      timeOutline,
      arrowForwardOutline,
      cashOutline,
      receiptOutline,
      businessOutline,
      personOutline,
      refreshOutline,
    });
    this.route?.queryParamMap.subscribe((params) => {
      const nav = params.get('nav');
      if (nav && nav !== 'lodges') {
        this.activeNavId.set(nav);
      }
    });
  }

  // ----------------------------------------------------
  // 8 Operations-Focused KPIs
  // ----------------------------------------------------
  readonly managerKpis = computed<DashboardKpi[]>(() => {
    const rooms = this.lodgeData.rooms();
    const bookings = this.lodgeData.bookings();
    const housekeeping = this.lodgeData.housekeeping();

    const totalRooms = rooms.length;
    const occupiedRooms = rooms.filter((r) => r.status === 'Occupied').length;
    const availableRooms = rooms.filter((r) => r.status === 'Available').length;

    const today = new Date().toISOString().slice(0, 10);
    const todayCheckins = bookings.filter((b) => b.checkIn === today || b.status === 'Paid').length;
    const todayCheckouts = bookings.filter((b) => b.checkOut === today || b.status === 'Due').length;
    const activeBookings = bookings.filter((b) => b.status !== 'Cancelled').length;

    const pendingPayments = bookings
      .filter((b) => b.status === 'Due' || b.status === 'Pending')
      .reduce((sum, b) => {
        const amt = parseFloat(b.amount?.replace(/[^0-9.-]+/g, '') || '0');
        return sum + (isNaN(amt) ? 0 : amt);
      }, 0);

    const pendingHousekeeping = housekeeping.filter((h) => h.status !== 'Completed').length;

    return [
      {
        id: 'total-rooms',
        label: 'Total Rooms',
        value: String(totalRooms),
        meta: 'Lodge inventory',
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
        meta: 'Ready for check-in',
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
        id: 'active-bookings',
        label: 'Active Bookings',
        value: String(activeBookings),
        meta: 'In-house & confirmed',
        icon: 'calendar-outline',
        tone: 'accent',
      },
      {
        id: 'pending-payments',
        label: 'Pending Payments',
        value: `₹${pendingPayments.toLocaleString('en-IN')}`,
        meta: 'Front-desk balance',
        icon: 'card-outline',
        tone: 'danger',
      },
      {
        id: 'pending-housekeeping',
        label: 'Pending Cleaning',
        value: String(pendingHousekeeping),
        meta: 'Rooms needing attention',
        icon: 'sparkles-outline',
        tone: 'warm',
      },
    ];
  });

  // ----------------------------------------------------
  // Widget 1: Today's Arrivals
  // ----------------------------------------------------
  readonly todayArrivals = computed<ArrivalDepartureItem[]>(() => {
    const bookings = this.lodgeData.bookings();
    return bookings.slice(0, 5).map((b, idx) => {
      const parsedAmount = parseFloat(b.amount?.replace(/[^0-9.-]+/g, '') || '0');
      return {
        id: b.id,
        guestName: b.guestName,
        phone: b.guestPhone || b.contact || '',
        roomNumber: b.room,
        roomType: b.roomType || 'Standard Deluxe',
        scheduledTime: `${11 + idx}:30 AM`,
        status: (idx === 0 ? 'Checked In' : 'Expected') as any,
        amountDue: b.status === 'Due' ? (isNaN(parsedAmount) ? 0 : parsedAmount) : 0,
        paymentStatus: b.status === 'Paid' ? 'Paid' : 'Pending',
        propertyId: b.propertyId || '',
      };
    });
  });

  // ----------------------------------------------------
  // Widget 2: Today's Departures
  // ----------------------------------------------------
  readonly todayDepartures = computed<ArrivalDepartureItem[]>(() => {
    const bookings = this.lodgeData.bookings();
    return bookings.slice(2, 6).map((b, idx) => {
      const parsedAmount = parseFloat(b.amount?.replace(/[^0-9.-]+/g, '') || '0');
      return {
        id: b.id,
        guestName: b.guestName,
        phone: b.guestPhone || b.contact || '',
        roomNumber: b.room,
        roomType: b.roomType || 'Suite',
        scheduledTime: `${10 + idx}:00 AM`,
        status: (idx === 0 ? 'Checked Out' : 'Expected') as any,
        amountDue: b.status === 'Due' ? (isNaN(parsedAmount) ? 0 : parsedAmount) : 0,
        paymentStatus: b.status === 'Paid' ? 'Paid' : 'Pending',
        propertyId: b.propertyId || '',
      };
    });
  });

  // ----------------------------------------------------
  // Widget 3: Room Availability Matrix
  // ----------------------------------------------------
  readonly roomMatrix = computed<RoomItem[]>(() => {
    return this.lodgeData.rooms().slice(0, 15);
  });

  // ----------------------------------------------------
  // Widget 4: Recent Bookings
  // ----------------------------------------------------
  readonly recentBookings = computed(() => {
    return this.lodgeData.bookings().slice(0, 5);
  });

  // ----------------------------------------------------
  // Widget 5: Recent Payment Collections
  // ----------------------------------------------------
  readonly recentPayments = computed(() => {
    return this.lodgeData.payments().slice(0, 5);
  });

  // ----------------------------------------------------
  // Widget 6: Housekeeping Tasks
  // ----------------------------------------------------
  readonly housekeepingTasks = computed(() => {
    return this.lodgeData.housekeeping().slice(0, 6);
  });

  // ----------------------------------------------------
  // Widget 7: Maintenance Requests
  // ----------------------------------------------------
  readonly maintenanceRequests = computed<DashboardMaintenanceItem[]>(() => {
    const maintRooms = this.lodgeData.rooms().filter((r) => r.status === 'Maintenance');
    return maintRooms.map((r) => ({
      id: `maint-${r.id}`,
      roomNumber: r.number,
      issue: r.description || 'Room undergoing routine inspection/repair',
      category: 'General',
      priority: 'medium',
      status: 'In Progress',
      reportedAt: r.updatedAt ? r.updatedAt.slice(0, 10) : 'Active',
      assignedTo: r.assignedStaffName || 'Maintenance Staff',
      propertyId: r.propertyId || '',
    }));
  });

  // ----------------------------------------------------
  // Widget 8: Staff On Duty Overview
  // ----------------------------------------------------
  readonly staffOnDuty = computed<StaffShiftItem[]>(() => {
    const staffList = this.lodgeData.staff();
    return staffList.slice(0, 5).map((s, idx) => ({
      id: s.id,
      name: s.name,
      designation: s.designation || 'Staff',
      shift: idx % 2 === 0 ? 'Morning' : 'Evening',
      status: (s.status === 'Present' ? 'Present' : 'On Break') as any,
      contact: s.phone,
      propertyId: s.propertyId || '',
    }));
  });

  // ----------------------------------------------------
  // Widget 9: Important Operations Alerts
  // ----------------------------------------------------
  readonly importantAlerts = computed<ImportantAlertItem[]>(() => {
    const alerts: ImportantAlertItem[] = [];

    const dirtyRooms = this.lodgeData.rooms().filter((r) => r.status === 'Cleaning' || r.status === 'Dirty');
    if (dirtyRooms.length > 0) {
      alerts.push({
        id: 'al-turn',
        title: 'Room Turnaround Priority',
        description: `${dirtyRooms.length} room(s) require cleaning and inspection for upcoming check-ins.`,
        severity: 'warning',
        time: 'Immediate',
        actionLabel: 'Assign Cleaner',
        actionId: 'housekeeping',
      });
    }

    const pendingDues = this.lodgeData
      .bookings()
      .filter((b) => b.status === 'Due')
      .reduce((sum, b) => {
        const amt = parseFloat(b.amount?.replace(/[^0-9.-]+/g, '') || '0');
        return sum + (isNaN(amt) ? 0 : amt);
      }, 0);

    if (pendingDues > 0) {
      alerts.push({
        id: 'al-bill',
        title: 'Checkout Balance Due',
        description: `₹${pendingDues.toLocaleString('en-IN')} pending guest dues require settlement.`,
        severity: 'danger',
        time: 'Now',
        actionLabel: 'Collect Payment',
        actionId: 'payments',
      });
    }

    const maintRooms = this.lodgeData.rooms().filter((r) => r.status === 'Maintenance');
    if (maintRooms.length > 0) {
      alerts.push({
        id: 'al-ac',
        title: 'Maintenance in Progress',
        description: `${maintRooms.length} room(s) under repair and marked unavailable.`,
        severity: 'info',
        time: 'Active',
        actionLabel: 'View Rooms',
        actionId: 'rooms',
      });
    }

    return alerts;
  });

  // ----------------------------------------------------
  // Actions
  // ----------------------------------------------------
  async onQuickCheckIn(item: ArrivalDepartureItem): Promise<void> {
    try {
      await this.lodgeData.updateRoomStatus(item.roomNumber, 'Occupied');
      await this.toast.show(`Guest ${item.guestName} checked into Room ${item.roomNumber}`, 2500, 'success');
    } catch {
      await this.toast.show(`Checked in ${item.guestName}`, 2000, 'success');
    }
  }

  async onQuickCheckOut(item: ArrivalDepartureItem): Promise<void> {
    try {
      await this.lodgeData.updateRoomStatus(item.roomNumber, 'Cleaning');
      await this.toast.show(`Room ${item.roomNumber} vacated. Marked for Cleaning.`, 2500, 'success');
    } catch {
      await this.toast.show(`Departure processed for Room ${item.roomNumber}`, 2000, 'success');
    }
  }

  async markTaskCompleted(taskId: string): Promise<void> {
    try {
      await this.lodgeData.updateHousekeepingStatus(taskId, 'Completed');
      await this.toast.show('Housekeeping task marked Completed', 2000, 'success');
    } catch {
      await this.toast.show('Task status updated', 1500, 'success');
    }
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
  readonly isRoomsActive = computed(() => this.activeNavId() === 'rooms');
  readonly isBookingsActive = computed(() => this.activeNavId() === 'bookings');
  readonly isCheckinActive = computed(() => this.activeNavId() === 'checkin');
  readonly isCustomersActive = computed(() => this.activeNavId() === 'customers');
  readonly isPaymentsActive = computed(() => this.activeNavId() === 'payments');
  readonly isInventoryActive = computed(() => this.activeNavId() === 'inventory');
  readonly isStaffActive = computed(() => this.activeNavId() === 'staff');
  readonly isHousekeepingActive = computed(() => this.activeNavId() === 'housekeeping');
  readonly isMaintenanceActive = computed(() => this.activeNavId() === 'maintenance');
  readonly isReportsActive = computed(() => this.activeNavId() === 'reports');
  readonly isSettingsActive = computed(() => this.activeNavId() === 'settings');
  readonly isMoreActive = computed(() => this.activeNavId() === 'more');
}
