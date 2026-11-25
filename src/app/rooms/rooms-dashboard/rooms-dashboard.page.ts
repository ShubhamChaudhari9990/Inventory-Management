import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonButton, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  addOutline,
  appsOutline,
  bedOutline,
  buildOutline,
  calendarOutline,
  checkmarkCircleOutline,
  closeCircleOutline,
  createOutline,
  eyeOutline,
  funnelOutline,
  gridOutline,
  layersOutline,
  listOutline,
  pricetagOutline,
  searchOutline,
  sparklesOutline,
  swapVerticalOutline,
} from 'ionicons/icons';

import { AppShellComponent } from '../../shared/components/app-shell/app-shell.component';
import {
  DashboardAxisChartComponent,
  DashboardDonutChartComponent,
} from '../../home/components/dashboard-charts/dashboard-charts.component';
import {
  AxisChartOptions,
  DonutChartOptions,
} from '../../home/data/dashboard-charts.data';
import {
  OperationalRoomStatus,
  RoomItem,
  RoomViewMode,
} from '../../interface';
import { RoomService } from '../../services/room.service';
import { FloorService } from '../../services/floor.service';
import { RoomTypeService } from '../../services/room-type.service';
import { LodgeDataService } from '../../services/lodge-data.service';
import { PropertyService } from '../../services/property.service';
import { RoleService } from '../../services/role.service';
import { AppToastService } from '../../shared/services/app-toast.service';

@Component({
  selector: 'app-rooms-dashboard',
  templateUrl: './rooms-dashboard.page.html',
  styleUrls: ['./rooms-dashboard.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonButton,
    IonIcon,
    AppShellComponent,
    DashboardAxisChartComponent,
    DashboardDonutChartComponent,
  ],
})
export class RoomsDashboardListPage {
  private readonly router = inject(Router);
  private readonly roomService = inject(RoomService);
  private readonly floorService = inject(FloorService);
  private readonly roomTypeService = inject(RoomTypeService);
  private readonly lodgeData = inject(LodgeDataService);
  private readonly propertyService = inject(PropertyService);
  private readonly roleService = inject(RoleService);
  private readonly toast = inject(AppToastService);

  readonly isOwner = this.roleService.isOwner;
  readonly isManager = this.roleService.isManager;
  readonly isStaff = this.roleService.isStaff;

  readonly properties = this.propertyService.accessibleProperties;
  readonly selectedPropertyId = this.propertyService.selectedPropertyId;
  readonly rooms = this.roomService.rooms;
  readonly bookings = this.lodgeData.bookings;
  readonly floors = this.floorService.floors;
  readonly roomTypes = this.roomTypeService.roomTypes;

  // Filters & View State
  readonly viewMode = signal<RoomViewMode>('grid');
  readonly searchQuery = signal('');
  readonly floorFilter = signal('all');
  readonly typeFilter = signal('all');
  readonly opStatusFilter = signal<'all' | OperationalRoomStatus>('all');
  readonly availStartDate = signal(new Date().toISOString().slice(0, 10));
  readonly availEndDate = signal(
    new Date(Date.now() + 86400000).toISOString().slice(0, 10),
  );
  readonly filterByAvailability = signal(false);
  readonly sortBy = signal<'number' | 'price'>('number');
  readonly pageSize = signal(12);
  readonly showAnalytics = signal(true);

  // ==========================================
  // DYNAMIC STATISTICS (PHASE 3)
  // ==========================================

  readonly totalRooms = computed(() => this.rooms().length);
  readonly availableRoomsCount = computed(
    () =>
      this.rooms().filter((r) =>
        this.roomService.getRoomAvailability(
          r,
          this.availStartDate(),
          this.availEndDate(),
        ),
      ).length,
  );
  readonly occupiedRoomsCount = computed(
    () => this.rooms().filter((r) => r.status === 'Occupied').length,
  );
  readonly reservedRoomsCount = computed(() => {
    const start = this.availStartDate();
    const end = this.availEndDate();
    const reservedNumbers = new Set(
      this.bookings()
        .filter(
          (b) =>
            b.status !== 'Cancelled' &&
            b.status !== 'Checked-Out' &&
            b.checkIn <= end &&
            b.checkOut >= start,
        )
        .map((b) => `${b.propertyId || ''}::${b.room}`),
    );
    return this.rooms().filter((r) =>
      reservedNumbers.has(`${r.propertyId || ''}::${r.number}`),
    ).length;
  });
  readonly cleaningRoomsCount = computed(
    () =>
      this.rooms().filter(
        (r) => this.roomService.getEffectiveOperationalStatus(r) === 'cleaning',
      ).length,
  );
  readonly maintenanceRoomsCount = computed(
    () =>
      this.rooms().filter(
        (r) => this.roomService.getEffectiveOperationalStatus(r) === 'maintenance',
      ).length,
  );
  readonly blockedRoomsCount = computed(
    () =>
      this.rooms().filter((r) => {
        const op = this.roomService.getEffectiveOperationalStatus(r);
        return op === 'blocked' || op === 'inactive';
      }).length,
  );

  // ==========================================
  // CHARTS (DYNAMIC FROM FIRESTORE)
  // ==========================================

  readonly statusDistributionChart = computed<DonutChartOptions>(() => {
    const avail = this.availableRoomsCount();
    const occ = this.occupiedRoomsCount();
    const clean = this.cleaningRoomsCount();
    const maint = this.maintenanceRoomsCount();
    const blk = this.blockedRoomsCount();
    return {
      series: [avail, occ, clean, maint, blk],
      labels: ['Available', 'Occupied', 'Cleaning', 'Maintenance', 'Blocked'],
      colors: ['#10b981', '#1d3e9f', '#f59e0b', '#ef4444', '#64748b'],
      chart: { type: 'donut', height: 240 },
      stroke: { width: 2, colors: ['#ffffff'] },
      legend: { position: 'bottom' },
      dataLabels: { enabled: false },
      plotOptions: { pie: { donut: { size: '68%' } } },
      tooltip: { enabled: true },
    };
  });

  private buildAxisChart(
    type: 'bar' | 'area',
    name: string,
    categories: string[],
    data: number[],
    color: string,
  ): AxisChartOptions {
    return {
      series: [{ name, data: data.length ? data : [0] }],
      chart: { type, height: 240, toolbar: { show: false } },
      xaxis: { categories: categories.length ? categories : ['No Data'] },
      yaxis: { labels: { style: { colors: '#64748b' } } },
      colors: [color],
      stroke: type === 'area' ? { curve: 'smooth', width: 2 } : { show: false },
      plotOptions: { bar: { borderRadius: 6, columnWidth: '48%' } },
      dataLabels: { enabled: false },
      grid: { borderColor: '#f1f5f9' },
      legend: { show: false },
      tooltip: { enabled: true },
      fill: type === 'area' ? { type: 'gradient', gradient: { opacityFrom: 0.35, opacityTo: 0.05 } } : { opacity: 1 },
      markers: { size: type === 'area' ? 3 : 0 },
      responsive: [],
    };
  }

  readonly typeDistributionChart = computed<AxisChartOptions>(() => {
    const counts = new Map<string, number>();
    for (const r of this.rooms()) {
      const t = r.type || 'Standard';
      counts.set(t, (counts.get(t) || 0) + 1);
    }
    return this.buildAxisChart(
      'bar',
      'Rooms',
      Array.from(counts.keys()),
      Array.from(counts.values()),
      '#1d3e9f',
    );
  });

  readonly floorDistributionChart = computed<AxisChartOptions>(() => {
    const counts = new Map<string, number>();
    for (const r of this.rooms()) {
      const f = r.floor ? `Floor ${r.floor}` : 'Unassigned';
      counts.set(f, (counts.get(f) || 0) + 1);
    }
    return this.buildAxisChart(
      'bar',
      'Rooms',
      Array.from(counts.keys()),
      Array.from(counts.values()),
      '#059669',
    );
  });

  readonly occupancyTrendChart = computed<AxisChartOptions>(() => {
    const today = new Date();
    const categories: string[] = [];
    const data: number[] = [];
    const total = Math.max(1, this.totalRooms());

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      categories.push(iso.slice(5));
      const bookedCount = this.bookings().filter(
        (b) =>
          b.status !== 'Cancelled' && b.checkIn <= iso && b.checkOut > iso,
      ).length;
      data.push(Math.min(100, Math.round((bookedCount / total) * 100)));
    }
    return this.buildAxisChart('area', 'Occupancy %', categories, data, '#4f46e5');
  });

  // ==========================================
  // ADDITIONAL SECTIONS
  // ==========================================

  readonly todayIso = new Date().toISOString().slice(0, 10);

  readonly todayCheckIns = computed(() =>
    this.bookings().filter(
      (b) => b.checkIn === this.todayIso && b.status !== 'Cancelled',
    ),
  );

  readonly todayCheckOuts = computed(() =>
    this.bookings().filter(
      (b) => b.checkOut === this.todayIso && b.status !== 'Cancelled',
    ),
  );

  readonly cleaningRooms = computed(() =>
    this.rooms().filter(
      (r) => this.roomService.getEffectiveOperationalStatus(r) === 'cleaning',
    ),
  );

  readonly maintenanceRooms = computed(() =>
    this.rooms().filter(
      (r) => this.roomService.getEffectiveOperationalStatus(r) === 'maintenance',
    ),
  );

  readonly recentlyUpdatedRooms = computed(() =>
    [...this.rooms()]
      .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''))
      .slice(0, 5),
  );

  // ==========================================
  // FILTERED & PAGINATED ROOM LISTING (PHASE 4)
  // ==========================================

  readonly uniqueFloors = computed(() =>
    Array.from(new Set(this.rooms().map((r) => r.floor).filter(Boolean))).sort(),
  );

  readonly uniqueTypes = computed(() =>
    Array.from(new Set(this.rooms().map((r) => r.type).filter(Boolean))).sort(),
  );

  readonly filteredRooms = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const fl = this.floorFilter();
    const tp = this.typeFilter();
    const op = this.opStatusFilter();
    const checkAvail = this.filterByAvailability();
    const start = this.availStartDate();
    const end = this.availEndDate();
    const sort = this.sortBy();

    const list = this.rooms().filter((r) => {
      if (fl !== 'all' && r.floor !== fl) return false;
      if (tp !== 'all' && r.type !== tp) return false;
      if (op !== 'all' && this.roomService.getEffectiveOperationalStatus(r) !== op) {
        return false;
      }
      if (checkAvail && !this.roomService.getRoomAvailability(r, start, end)) {
        return false;
      }
      if (q) {
        const match =
          (r.number || '').toLowerCase().includes(q) ||
          (r.roomName || '').toLowerCase().includes(q) ||
          (r.type || '').toLowerCase().includes(q) ||
          (r.floor || '').toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });

    return [...list].sort((a, b) => {
      if (sort === 'price') {
        const pa = a.basePrice ?? (Number(String(a.price || '0').replace(/[^0-9.]/g, '')) || 0);
        const pb = b.basePrice ?? (Number(String(b.price || '0').replace(/[^0-9.]/g, '')) || 0);
        return pa - pb;
      }
      return (a.number || '').localeCompare(b.number || '', undefined, { numeric: true });
    });
  });

  readonly visibleRooms = computed(() =>
    this.filteredRooms().slice(0, this.pageSize()),
  );

  readonly hasMore = computed(
    () => this.filteredRooms().length > this.visibleRooms().length,
  );

  constructor() {
    addIcons({
      addOutline,
      appsOutline,
      bedOutline,
      buildOutline,
      calendarOutline,
      checkmarkCircleOutline,
      closeCircleOutline,
      createOutline,
      eyeOutline,
      funnelOutline,
      gridOutline,
      layersOutline,
      listOutline,
      pricetagOutline,
      searchOutline,
      sparklesOutline,
      swapVerticalOutline,
    });
  }

  getOpStatus(room: RoomItem): OperationalRoomStatus {
    return this.roomService.getEffectiveOperationalStatus(room);
  }

  isAvailableForSelectedDates(room: RoomItem): boolean {
    return this.roomService.getRoomAvailability(
      room,
      this.availStartDate(),
      this.availEndDate(),
    );
  }

  getLodgeName(propertyId?: string): string {
    if (!propertyId) return 'Default Lodge';
    return (
      this.properties().find((p) => p.id === propertyId)?.name || propertyId
    );
  }

  async onStatusChange(room: RoomItem, nextOp: OperationalRoomStatus): Promise<void> {
    try {
      await this.roomService.updateOperationalStatus(room.id, nextOp);
      this.toast.success(`Room ${room.number} status updated to ${nextOp}.`);
    } catch (err: any) {
      this.toast.error(err?.message || 'Failed to update room status.');
    }
  }

  switchLodgeScope(lodgeId: string): void {
    this.propertyService.switchProperty(lodgeId);
  }

  loadMore(): void {
    this.pageSize.update((n) => n + 12);
  }

  goToAdd(): void {
    void this.router.navigate(['/rooms/add']);
  }

  viewDetails(room: RoomItem): void {
    void this.router.navigate(['/rooms', room.id]);
  }

  editRoom(room: RoomItem): void {
    void this.router.navigate(['/rooms', room.id, 'edit']);
  }

  goToPage(path: string): void {
    void this.router.navigate([path]);
  }

  viewRoomBookings(): void {
    this.onNavChange('bookings');
  }

  onNavChange(navId: string): void {
    if (navId === 'rooms') return;
    const directRoutes: Record<string, string> = {
      lodges: '/lodges',
      customers: '/customers',
      payments: '/payments',
      staff: '/staff',
      housekeeping: '/housekeeping',
      maintenance: '/maintenance/requests',
      operations: '/operations',
      inventory: '/operations',
      reports: '/reports',
    };
    if (directRoutes[navId]) {
      void this.router.navigate([directRoutes[navId]]);
      return;
    }
    const role = this.roleService.currentRole();
    const target =
      role === 'owner'
        ? '/owner/dashboard'
        : role === 'manager'
          ? '/manager/dashboard'
          : '/staff/dashboard';
    void this.router.navigate([target]);
  }
}
