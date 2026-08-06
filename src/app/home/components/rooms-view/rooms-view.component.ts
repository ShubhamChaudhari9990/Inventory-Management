import { Component, computed, signal } from '@angular/core';
import { IonButton, IonIcon } from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';

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

@Component({
  selector: 'app-rooms-view',
  templateUrl: './rooms-view.component.html',
  styleUrls: ['./rooms-view.component.scss'],
  imports: [IonButton, IonIcon, TranslatePipe],
})
export class RoomsViewComponent {
  private saveToastTimeoutId: ReturnType<typeof setTimeout> | null = null;

  readonly subtitle = ROOM_VIEW_SUBTITLE;
  readonly filters = ROOM_STATUS_FILTERS;
  readonly rooms = ROOM_ITEMS;

  readonly roomFilterLabelKey = roomFilterLabelKey;
  readonly statusLabelKey = statusLabelKey;

  readonly query = signal('');
  readonly activeFilter = signal<RoomStatus>('All');
  readonly viewMode = signal<RoomViewMode>('grid');
  readonly isAddRoomOpen = signal(false);
  readonly isSaveToastVisible = signal(false);

  readonly filteredRooms = computed(() => {
    const query = this.query().trim().toLowerCase();
    const filter = this.activeFilter();

    return this.rooms.filter((room) => {
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
    this.clearSaveToast();
  }

  showSaveToast(): void {
    this.isSaveToastVisible.set(true);
    if (this.saveToastTimeoutId) {
      clearTimeout(this.saveToastTimeoutId);
    }
    this.saveToastTimeoutId = setTimeout(() => {
      this.isSaveToastVisible.set(false);
      this.saveToastTimeoutId = null;
    }, 2200);
  }

  trackRoom(_: number, room: RoomItem): string {
    return room.id;
  }

  private clearSaveToast(): void {
    this.isSaveToastVisible.set(false);
    if (this.saveToastTimeoutId) {
      clearTimeout(this.saveToastTimeoutId);
      this.saveToastTimeoutId = null;
    }
  }
}
