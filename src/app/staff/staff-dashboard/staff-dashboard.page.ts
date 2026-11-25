import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';
import { addIcons } from 'ionicons';
import {
  sparklesOutline,
  bedOutline,
  buildOutline,
  logInOutline,
  logOutOutline,
  calendarOutline,
  checkmarkCircleOutline,
  timeOutline,
  alertCircleOutline,
  notificationsOutline,
  personOutline,
  searchOutline,
  addOutline,
  checkboxOutline,
  businessOutline,
} from 'ionicons/icons';

import { AppShellComponent } from '../../shared/components/app-shell/app-shell.component';
import { DashboardSectionCardComponent } from '../../home/components/dashboard-section-card/dashboard-section-card.component';

// Views for navigation
import { HousekeepingViewComponent } from '../../home/components/housekeeping-view/housekeeping-view.component';
import { RoomsViewComponent } from '../../home/components/rooms-view/rooms-view.component';
import { BookingsViewComponent } from '../../home/components/bookings-view/bookings-view.component';
import { SettingsViewComponent } from '../../home/components/settings-view/settings-view.component';
import { MoreMenuViewComponent } from '../../home/components/more-menu-view/more-menu-view.component';

// Services, Data & Interfaces
import { LodgeDataService } from '../../services/lodge-data.service';
import { PropertyService } from '../../services/property.service';
import { RoleService } from '../../services/role.service';
import { AppToastService } from '../../shared/services/app-toast.service';
import { MORE_MENU_ITEMS } from '../../home/data/more-menu.data';
import {
  CleaningScheduleItem,
  HousekeepingTaskStatus,
  RoomItem,
} from '../../interface';

export type StaffTabType = 'auto' | 'reception' | 'housekeeping' | 'maintenance' | 'general';

@Component({
  selector: 'app-staff-dashboard-page',
  templateUrl: './staff-dashboard.page.html',
  styleUrls: ['./staff-dashboard.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonIcon,
    TranslatePipe,
    AppShellComponent,
    DashboardSectionCardComponent,
    HousekeepingViewComponent,
    RoomsViewComponent,
    BookingsViewComponent,
    SettingsViewComponent,
    MoreMenuViewComponent,
  ],
})
export class StaffDashboardPage {
  private readonly lodgeData = inject(LodgeDataService);
  private readonly propertyService = inject(PropertyService);
  private readonly roleService = inject(RoleService);
  private readonly toast = inject(AppToastService);

  readonly activeNavId = signal('dashboard');
  readonly selectedTab = signal<StaffTabType>('auto');
  readonly guestSearchQuery = signal('');
  readonly moreMenuItems = MORE_MENU_ITEMS;

  readonly currentUserProfile = this.roleService.currentUserProfile;
  readonly staffName = computed(() => this.currentUserProfile()?.name || 'Staff Member');
  readonly staffDesignation = computed(() => this.currentUserProfile()?.designation || 'Staff');
  readonly assignedLodgeName = this.propertyService.selectedPropertyName;

  // Active view mode derived from designation or manual tab selection
  readonly activeView = computed<'reception' | 'housekeeping' | 'maintenance' | 'general'>(() => {
    const override = this.selectedTab();
    if (override !== 'auto') {
      return override;
    }
    const des = this.staffDesignation().toLowerCase();
    if (des.includes('reception') || des.includes('front')) return 'reception';
    if (des.includes('clean') || des.includes('housekeep')) return 'housekeeping';
    if (des.includes('maint') || des.includes('repair') || des.includes('tech')) return 'maintenance';
    return 'general';
  });

  // Maintenance Reporting Modal State
  readonly isMaintModalOpen = signal(false);
  maintRoom = '';
  maintIssue = '';
  maintCategory = 'Plumbing';
  maintPriority = 'medium';

  // General checklist items
  readonly generalTasks = signal<Array<{ id: string; title: string; done: boolean; time: string }>>([]);

  constructor() {
    addIcons({
      sparklesOutline,
      bedOutline,
      buildOutline,
      logInOutline,
      logOutOutline,
      calendarOutline,
      checkmarkCircleOutline,
      timeOutline,
      alertCircleOutline,
      notificationsOutline,
      personOutline,
      searchOutline,
      addOutline,
      checkboxOutline,
      businessOutline,
    });
  }

  // ----------------------------------------------------
  // Summary Counters
  // ----------------------------------------------------
  readonly tasks = computed(() => this.lodgeData.housekeeping());

  readonly totalTaskCount = computed(() => this.tasks().length + this.generalTasks().length);

  readonly pendingCount = computed(() => {
    const hkPending = this.tasks().filter((t) => t.status === 'Pending').length;
    const genPending = this.generalTasks().filter((t) => !t.done).length;
    return hkPending + genPending;
  });

  readonly inProgressCount = computed(() => {
    return this.tasks().filter((t) => t.status === 'In Progress').length;
  });

  readonly completedCount = computed(() => {
    const hkDone = this.tasks().filter((t) => t.status === 'Completed').length;
    const genDone = this.generalTasks().filter((t) => t.done).length;
    return hkDone + genDone;
  });

  // ----------------------------------------------------
  // Receptionist Specific Data
  // ----------------------------------------------------
  readonly todayArrivals = computed(() => {
    const list = this.lodgeData.bookings();
    const query = this.guestSearchQuery().toLowerCase().trim();
    return list.slice(0, 6).filter((b) => {
      const phone = b.guestPhone || b.contact || '';
      if (!query) return true;
      return (
        b.guestName.toLowerCase().includes(query) ||
        b.room.toLowerCase().includes(query) ||
        phone.includes(query)
      );
    });
  });

  readonly todayDepartures = computed(() => {
    return this.lodgeData.bookings().slice(2, 6);
  });

  // ----------------------------------------------------
  // Housekeeping Specific Data
  // ----------------------------------------------------
  readonly assignedRooms = computed<RoomItem[]>(() => {
    return this.lodgeData.rooms().slice(0, 8);
  });

  readonly cleaningSchedule = computed<CleaningScheduleItem[]>(() => {
    return this.lodgeData.housekeeping();
  });

  // ----------------------------------------------------
  // Maintenance Specific Data
  // ----------------------------------------------------
  readonly repairRequests = signal<
    Array<{
      id: string;
      room: string;
      issue: string;
      category: string;
      priority: string;
      status: string;
      reportedTime: string;
    }>
  >([]);

  // ----------------------------------------------------
  // Notifications / Announcements
  // ----------------------------------------------------
  readonly announcements = signal<
    Array<{
      id: string;
      title: string;
      text: string;
      time: string;
      urgent: boolean;
    }>
  >([]);

  // ----------------------------------------------------
  // Interactive Actions
  // ----------------------------------------------------
  async onCheckInGuest(guestName: string, room: string): Promise<void> {
    try {
      await this.lodgeData.updateRoomStatus(room, 'Occupied');
      await this.toast.show(`Guest ${guestName} checked into Room ${room}`, 2000, 'success');
    } catch {
      await this.toast.show(`Checked in ${guestName}`, 1500, 'success');
    }
  }

  async onCheckOutGuest(guestName: string, room: string): Promise<void> {
    try {
      await this.lodgeData.updateRoomStatus(room, 'Cleaning');
      await this.toast.show(`${guestName} checked out of Room ${room}. Scheduled for cleaning.`, 2000, 'success');
    } catch {
      await this.toast.show(`Checkout complete for Room ${room}`, 1500, 'success');
    }
  }

  async updateCleaningStatus(item: CleaningScheduleItem, newStatus: HousekeepingTaskStatus): Promise<void> {
    try {
      await this.lodgeData.updateHousekeepingStatus(item.id, newStatus, item.room);
      await this.toast.show(
        newStatus === 'Completed' ? `Room ${item.room} marked Clean` : `Room ${item.room} cleaning started`,
        2000,
        'success',
      );
    } catch {
      await this.toast.show('Task status updated', 1500, 'success');
    }
  }

  updateRepairStatus(id: string, status: string): void {
    this.repairRequests.update((list) =>
      list.map((r) => (r.id === id ? { ...r, status } : r)),
    );
    void this.toast.show(`Work order updated to: ${status}`, 1500, 'success');
  }

  toggleGeneralTask(id: string): void {
    this.generalTasks.update((list) =>
      list.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
    );
  }

  openMaintModal(room?: string): void {
    this.maintRoom = room || '';
    this.maintIssue = '';
    this.isMaintModalOpen.set(true);
  }

  closeMaintModal(): void {
    this.isMaintModalOpen.set(false);
  }

  submitMaintenanceTicket(): void {
    if (!this.maintRoom || !this.maintIssue) {
      void this.toast.show('Please provide room number and defect description', 2500, 'warning');
      return;
    }

    this.repairRequests.update((list) => [
      {
        id: `rep-${Date.now()}`,
        room: this.maintRoom,
        issue: this.maintIssue,
        category: this.maintCategory,
        priority: this.maintPriority,
        status: 'Pending',
        reportedTime: 'Just now',
      },
      ...list,
    ]);

    this.closeMaintModal();
    void this.toast.show(`Maintenance ticket reported for Room ${this.maintRoom}`, 2500, 'success');
  }

  private readonly router = inject(Router);

  navigateTo(navId: string): void {
    const directRoutes: Record<string, string> = {
      rooms: '/rooms',
      housekeeping: '/housekeeping/my-tasks',
      maintenance: '/maintenance/requests',
      operations: '/operations',
      reports: '/reports',
    };
    if (directRoutes[navId]) {
      void this.router.navigate([directRoutes[navId]]);
      return;
    }
    this.activeNavId.set(navId);
  }

  // Active view checkers
  readonly isDashboardActive = computed(() => this.activeNavId() === 'dashboard');
  readonly isTasksActive = computed(() => this.activeNavId() === 'my-tasks');
  readonly isRoomsActive = computed(() => this.activeNavId() === 'rooms');
  readonly isBookingsActive = computed(() => this.activeNavId() === 'bookings');
  readonly isHousekeepingActive = computed(() => this.activeNavId() === 'housekeeping');
  readonly isMaintenanceActive = computed(() => this.activeNavId() === 'maintenance');
  readonly isNotificationsActive = computed(() => this.activeNavId() === 'notifications');
  readonly isSettingsActive = computed(() => this.activeNavId() === 'settings');
  readonly isMoreActive = computed(() => this.activeNavId() === 'more');
}
