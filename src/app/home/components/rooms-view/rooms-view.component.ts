import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { IonButton, IonIcon, IonModal } from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';

import { AppToastService } from '../../../shared/services/app-toast.service';
import {
  roomFilterLabelKey,
  statusLabelKey,
} from '../../../shared/i18n/label-keys';
import {
  ROOM_STATUS_FILTERS,
  ROOM_VIEW_SUBTITLE,
  RoomItem,
  RoomStatus,
  RoomViewMode,
} from '../../data/rooms.data';

import { LodgeDataService } from '../../../services/lodge-data.service';

@Component({
  selector: 'app-rooms-view',
  templateUrl: './rooms-view.component.html',
  styleUrls: ['./rooms-view.component.scss'],
  imports: [CommonModule, FormsModule, IonButton, IonIcon, IonModal, TranslatePipe],
})
export class RoomsViewComponent {
  private readonly appToast = inject(AppToastService);
  private readonly lodgeData = inject(LodgeDataService);

  readonly subtitle = ROOM_VIEW_SUBTITLE;
  readonly filters = ROOM_STATUS_FILTERS;
  readonly rooms = this.lodgeData.rooms;

  readonly roomFilterLabelKey = roomFilterLabelKey;
  readonly statusLabelKey = statusLabelKey;

  readonly query = signal('');
  readonly activeFilter = signal<RoomStatus>('All');
  readonly viewMode = signal<RoomViewMode>('grid');

  // Single Add
  readonly isAddRoomOpen = signal(false);
  readonly roomTypes = ['AC', 'Non AC', 'Suite', 'Deluxe'] as const;
  readonly selectedRoomType = signal<'AC' | 'Non AC' | 'Suite' | 'Deluxe'>('AC');

  // Bulk Add
  readonly isBulkAddOpen = signal(false);
  bulkFloor = '3';
  bulkStartNumber = 301;
  bulkCount = 4;
  bulkRoomType: 'AC' | 'Non AC' | 'Suite' | 'Deluxe' = 'AC';
  bulkPrice = 1800;

  // Edit Room
  readonly isEditRoomOpen = signal(false);
  readonly activeEditRoom = signal<RoomItem | null>(null);
  editNumber = '';
  editFloor = '';
  editType: 'AC' | 'Non AC' | 'Suite' | 'Deluxe' = 'AC';
  editPrice = '';
  editStatus: Exclude<RoomStatus, 'All'> = 'Available';

  /** Always bottom sheet (web + app). */
  readonly addRoomBreakpoints: [number, number] = [0, 1];
  readonly addRoomInitialBreakpoint = 1;
  readonly addRoomModalClass = 'app-form-modal';

  readonly filteredRooms = computed(() => {
    const query = this.query().trim().toLowerCase();
    const filter = this.activeFilter();

    return this.rooms().filter((room) => {
      const matchesFilter = filter === 'All' || room.status === filter;
      const matchesQuery =
        !query ||
        (room.number || '').toLowerCase().includes(query) ||
        (room.floor || '').toLowerCase().includes(query) ||
        (room.type || '').toLowerCase().includes(query) ||
        (room.status || '').toLowerCase().includes(query) ||
        room.guestName?.toLowerCase().includes(query);

      return matchesFilter && matchesQuery;
    });
  });

  onQueryInput(event: Event): void {
    const target = event.target as HTMLInputElement | null;
    this.query.set(target?.value ?? '');
  }

  setFilter(filter: RoomStatus): void {
    this.activeFilter.set(filter);
  }

  setViewMode(mode: RoomViewMode): void {
    this.viewMode.set(mode);
  }

  openAddRoom(): void {
    this.isAddRoomOpen.set(true);
  }

  closeAddRoom(): void {
    this.isAddRoomOpen.set(false);
  }

  openBulkAdd(): void {
    this.isBulkAddOpen.set(true);
  }

  closeBulkAdd(): void {
    this.isBulkAddOpen.set(false);
  }

  openEditRoom(room: RoomItem, event: Event): void {
    event.stopPropagation();
    this.activeEditRoom.set(room);
    this.editNumber = room.number;
    this.editFloor = room.floor;
    this.editType = (room.type as any) || 'AC';
    this.editPrice = room.price.replace('₹', '').replace(',', '').trim();
    this.editStatus = room.status;
    this.isEditRoomOpen.set(true);
  }

  closeEditRoom(): void {
    this.isEditRoomOpen.set(false);
    this.activeEditRoom.set(null);
  }

  onRoomTypeChange(event: Event): void {
    const target = event.target as HTMLSelectElement | null;
    const value = target?.value as 'AC' | 'Non AC' | 'Suite' | 'Deluxe';
    if (value) {
      this.selectedRoomType.set(value);
    }
  }

  async saveRoom(numInput: HTMLInputElement, floorInput: HTMLInputElement, priceInput: HTMLInputElement): Promise<void> {
    const roomNumber = numInput?.value?.trim() || '401';
    const floor = floorInput?.value?.trim() || '4';
    const rawPrice = priceInput?.value?.trim() || '1800';
    const price = rawPrice.startsWith('₹') ? rawPrice : `₹${rawPrice}`;

    try {
      await this.lodgeData.addRoom({
        number: roomNumber,
        floor,
        type: this.selectedRoomType(),
        status: 'Available',
        price,
      });

      this.closeAddRoom();
      await this.appToast.show('Room added successfully.', 2500, 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error adding room';
      await this.appToast.show(msg, 3000, 'danger');
    }
  }

  async saveBulkRooms(): Promise<void> {
    if (!this.bulkFloor.trim() || this.bulkCount <= 0 || this.bulkPrice <= 0) {
      await this.appToast.show('Please provide valid floor, count, and price.', 2500, 'warning');
      return;
    }

    try {
      await this.lodgeData.bulkAddRooms({
        propertyId: 'all',
        floor: this.bulkFloor.trim(),
        startRoomNumber: Number(this.bulkStartNumber),
        count: Number(this.bulkCount),
        type: this.bulkRoomType,
        pricePerNight: String(this.bulkPrice),
      });

      this.closeBulkAdd();
      await this.appToast.show(`Successfully created ${this.bulkCount} rooms in bulk!`, 2500, 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error during bulk room creation';
      await this.appToast.show(msg, 3000, 'danger');
    }
  }

  async saveEditRoom(): Promise<void> {
    const active = this.activeEditRoom();
    if (!active) return;

    try {
      const priceFormatted = `₹${this.editPrice}`;
      await this.lodgeData.updateRoom(active.id, {
        number: this.editNumber.trim(),
        floor: this.editFloor.trim(),
        type: this.editType,
        price: priceFormatted,
        status: this.editStatus,
      });

      this.closeEditRoom();
      await this.appToast.show('Room details updated.', 2500, 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error updating room';
      await this.appToast.show(msg, 3000, 'danger');
    }
  }

  async deleteRoom(room: RoomItem, event: Event): Promise<void> {
    event.stopPropagation();
    try {
      await this.lodgeData.deleteRoom(room.id);
      await this.appToast.show(`Room ${room.number} removed.`, 2500, 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to delete room';
      await this.appToast.show(msg, 3500, 'danger');
    }
  }

  trackRoom(_: number, room: RoomItem): string {
    return room.id;
  }
}
