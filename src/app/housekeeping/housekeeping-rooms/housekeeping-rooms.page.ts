import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  bedOutline,
  checkmarkCircleOutline,
  alertCircleOutline,
  constructOutline,
  searchOutline,
} from 'ionicons/icons';
import { HousekeepingService } from '../../services/housekeeping.service';
import { PropertyService } from '../../services/property.service';
import { RoleService } from '../../services/role.service';
import { AppToastService } from '../../shared/services/app-toast.service';
import { HousekeepingRoomStatus, RoomItem } from '../../interface';

@Component({
  selector: 'app-housekeeping-rooms',
  templateUrl: './housekeeping-rooms.page.html',
  styleUrls: ['./housekeeping-rooms.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    IonContent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    IonIcon,
  ],
})
export class HousekeepingRoomsPage {
  private readonly hkService = inject(HousekeepingService);
  private readonly propertyService = inject(PropertyService);
  readonly roleService = inject(RoleService);
  private readonly toast = inject(AppToastService);

  readonly selectedLodge = signal<string>('all');
  readonly selectedHkStatus = signal<string>('all');
  readonly searchQuery = signal<string>('');
  readonly updatingRoomId = signal<string | null>(null);

  readonly hkStatusOptions: HousekeepingRoomStatus[] = [
    'Clean',
    'Dirty',
    'Cleaning',
    'Inspection Pending',
    'Inspected',
    'Out of Service',
  ];

  readonly accessibleProperties = computed(() =>
    this.propertyService.accessibleProperties(),
  );

  readonly filteredRooms = computed(() => {
    const lodge = this.selectedLodge();
    const hkStatus = this.selectedHkStatus();
    const q = this.searchQuery().trim().toLowerCase();

    return this.hkService.rooms().filter((room) => {
      if (lodge !== 'all' && room.propertyId !== lodge) return false;
      const roomHk = this.hkService.getRoomHousekeepingStatus(room);
      if (hkStatus !== 'all' && roomHk !== hkStatus) return false;
      if (q) {
        const matchesNum = room.number.toLowerCase().includes(q);
        const matchesType = (room.type || '').toLowerCase().includes(q);
        if (!matchesNum && !matchesType) return false;
      }
      return true;
    });
  });

  readonly openIssuesByRoom = computed(() => {
    const map = new Map<string, number>();
    for (const issue of this.hkService.maintenanceIssues()) {
      if (issue.status !== 'Resolved') {
        map.set(issue.roomNumber, (map.get(issue.roomNumber) || 0) + 1);
      }
    }
    return map;
  });

  constructor() {
    addIcons({
      bedOutline,
      checkmarkCircleOutline,
      alertCircleOutline,
      constructOutline,
      searchOutline,
    });
  }

  getHkStatus(room: RoomItem): HousekeepingRoomStatus {
    return this.hkService.getRoomHousekeepingStatus(room);
  }

  getOccupancyLabel(room: RoomItem): string {
    return room.status === 'Occupied' ? 'Occupied' : 'Vacant';
  }

  getBookingAvailability(room: RoomItem): string {
    if (room.status === 'Maintenance' || this.getHkStatus(room) === 'Out of Service') {
      return 'Blocked (Maintenance)';
    }
    if (room.status === 'Occupied') return 'In Stay';
    if (room.status === 'Reserved') return 'Reserved';
    return 'Available';
  }

  isCheckInEligible(room: RoomItem): boolean {
    return this.hkService.isRoomEligibleForCheckIn(room);
  }

  getMaintenanceStatus(room: RoomItem): string {
    const count = this.openIssuesByRoom().get(room.number) || 0;
    if (room.status === 'Maintenance' || this.getHkStatus(room) === 'Out of Service') {
      return count > 0 ? `Out of Service (${count} issue)` : 'Out of Service';
    }
    return count > 0 ? `${count} open issue(s)` : 'Clear';
  }

  getLodgeName(propertyId?: string): string {
    if (!propertyId) return '—';
    return (
      this.accessibleProperties().find((p) => p.id === propertyId)?.name ||
      propertyId
    );
  }

  async changeHkStatus(room: RoomItem, status: HousekeepingRoomStatus): Promise<void> {
    if (
      (status === 'Clean' || status === 'Inspected') &&
      this.roleService.isStaff()
    ) {
      await this.toast.warning(
        'Staff should submit rooms for inspection rather than marking Clean directly.',
      );
      return;
    }

    this.updatingRoomId.set(room.id);
    try {
      await this.hkService.updateRoomHousekeepingStatus(room.id, status);
      await this.toast.success(`Room ${room.number} marked as ${status}`);
    } catch (err) {
      await this.toast.error('Failed to update room housekeeping status');
    } finally {
      this.updatingRoomId.set(null);
    }
  }
}
