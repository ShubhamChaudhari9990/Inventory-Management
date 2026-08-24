import { Component, computed, inject, signal } from '@angular/core';
import { IonButton, IonIcon, IonModal } from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';

import { AppToastService } from '../../../shared/services/app-toast.service';
import {
  roomFilterLabelKey,
  statusLabelKey,
} from '../../../shared/i18n/label-keys';
import {
  ROOM_ITEMS,
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
  imports: [IonButton, IonIcon, IonModal, TranslatePipe],
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
  readonly isAddRoomOpen = signal(false);
  readonly roomTypes = ['AC', 'Non AC', 'Suite', 'Deluxe'] as const;
  readonly selectedRoomType = signal<'AC' | 'Non AC' | 'Suite' | 'Deluxe'>('AC');

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
        room.number.toLowerCase().includes(query) ||
        room.floor.toLowerCase().includes(query) ||
        room.type.toLowerCase().includes(query) ||
        room.status.toLowerCase().includes(query) ||
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

    await this.lodgeData.addRoom({
      number: roomNumber,
      floor,
      type: this.selectedRoomType(),
      status: 'Available',
      price,
    });

    this.closeAddRoom();
    await this.appToast.show('ROOMS.SHEET.SAVED');
  }

  trackRoom(_: number, room: RoomItem): string {
    return room.id;
  }
}
