import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { IonButton, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  bedOutline,
  buildOutline,
  calendarOutline,
  checkmarkCircleOutline,
  createOutline,
  sparklesOutline,
  timeOutline,
} from 'ionicons/icons';
import { Unsubscribe } from 'firebase/firestore';

import { AppShellComponent } from '../../shared/components/app-shell/app-shell.component';
import {
  OperationalRoomStatus,
  RoomActivityItem,
  RoomItem,
} from '../../interface';
import { RoomService } from '../../services/room.service';
import { LodgeDataService } from '../../services/lodge-data.service';
import { PropertyService } from '../../services/property.service';
import { RoleService } from '../../services/role.service';
import { PermissionService } from '../../services/permission.service';
import { AppToastService } from '../../shared/services/app-toast.service';

export type RoomDetailsTab =
  | 'overview'
  | 'bookings'
  | 'pricing'
  | 'amenities'
  | 'gallery'
  | 'housekeeping'
  | 'maintenance'
  | 'activity';

@Component({
  selector: 'app-room-details',
  templateUrl: './room-details.page.html',
  styleUrls: ['./room-details.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonButton, IonIcon, AppShellComponent],
})
export class RoomDetailsPage implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly roomService = inject(RoomService);
  private readonly lodgeData = inject(LodgeDataService);
  private readonly propertyService = inject(PropertyService);
  private readonly roleService = inject(RoleService);
  private readonly permissionService = inject(PermissionService);
  private readonly toast = inject(AppToastService);

  readonly roomId = signal('');
  readonly activeTab = signal<RoomDetailsTab>('overview');
  readonly activity = signal<RoomActivityItem[]>([]);
  private actUnsub: Unsubscribe | null = null;

  readonly isStaff = this.roleService.isStaff;
  readonly canViewBookings = computed(
    () => !this.isStaff() || this.permissionService.hasPermission('booking.view'),
  );

  readonly room = computed<RoomItem | undefined>(() =>
    this.roomService.getRoomById(this.roomId()),
  );

  readonly lodgeName = computed(() => {
    const pid = this.room()?.propertyId;
    if (!pid) return 'LemonWood Lodge';
    return (
      this.propertyService.properties().find((p) => p.id === pid)?.name || pid
    );
  });

  readonly opStatus = computed<OperationalRoomStatus>(() => {
    const r = this.room();
    return r ? this.roomService.getEffectiveOperationalStatus(r) : 'active';
  });

  readonly roomBookings = computed(() => {
    const r = this.room();
    if (!r) return [];
    return this.lodgeData
      .allBookings()
      .filter(
        (b) =>
          (b.propertyId || '') === (r.propertyId || '') &&
          b.room === r.number,
      );
  });

  readonly roomHousekeeping = computed(() => {
    const r = this.room();
    if (!r) return [];
    return this.lodgeData
      .allHousekeeping()
      .filter(
        (h) =>
          (h.propertyId || '') === (r.propertyId || '') &&
          h.room === r.number,
      );
  });

  constructor() {
    addIcons({
      arrowBackOutline,
      bedOutline,
      buildOutline,
      calendarOutline,
      checkmarkCircleOutline,
      createOutline,
      sparklesOutline,
      timeOutline,
    });
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('roomId') || '';
    this.roomId.set(id);
    if (id) {
      this.actUnsub = this.roomService.watchRoomActivity(id, (items) => {
        this.activity.set(items);
      });
    }
  }

  ngOnDestroy(): void {
    if (this.actUnsub) this.actUnsub();
  }

  async onStatusChange(next: OperationalRoomStatus): Promise<void> {
    try {
      await this.roomService.updateOperationalStatus(this.roomId(), next);
      this.toast.success(`Operational status updated to ${next}.`);
    } catch (err: any) {
      this.toast.error(err?.message || 'Failed to update status.');
    }
  }

  goBack(): void {
    void this.router.navigate(['/rooms']);
  }

  goToEdit(): void {
    void this.router.navigate(['/rooms', this.roomId(), 'edit']);
  }

  onNavChange(navId: string): void {
    if (navId === 'rooms') {
      this.goBack();
      return;
    }
    const role = this.roleService.currentRole();
    const target =
      role === 'owner'
        ? '/owner/dashboard'
        : role === 'manager'
          ? '/manager/dashboard'
          : '/staff/dashboard';
    void this.router.navigate([target], { queryParams: { nav: navId } });
  }
}
