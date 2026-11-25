import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonButton, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { addOutline, arrowBackOutline, checkmarkCircleOutline } from 'ionicons/icons';

import { AppShellComponent } from '../../shared/components/app-shell/app-shell.component';
import { PREDEFINED_ROOM_AMENITIES, RoomItem } from '../../interface';
import { RoomService } from '../../services/room.service';
import { RoleService } from '../../services/role.service';
import { AppToastService } from '../../shared/services/app-toast.service';

@Component({
  selector: 'app-room-amenities',
  templateUrl: './room-amenities.page.html',
  styleUrls: ['./room-amenities.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonButton, IonIcon, AppShellComponent],
})
export class RoomAmenitiesPage {
  private readonly router = inject(Router);
  private readonly roomService = inject(RoomService);
  private readonly roleService = inject(RoleService);
  private readonly toast = inject(AppToastService);

  readonly rooms = this.roomService.rooms;
  readonly isStaff = this.roleService.isStaff;

  readonly customAmenities = signal<string[]>([]);
  customInput = '';

  readonly allAmenities = computed(() => {
    const fromRooms = this.rooms().reduce<string[]>(
      (acc, r) => acc.concat(r.amenities || []),
      [],
    );
    return Array.from(
      new Set([...PREDEFINED_ROOM_AMENITIES, ...this.customAmenities(), ...fromRooms]),
    );
  });

  constructor() {
    addIcons({ addOutline, arrowBackOutline, checkmarkCircleOutline });
  }

  getRoomCountWithAmenity(am: string): number {
    return this.rooms().filter((r) => (r.amenities || []).includes(am)).length;
  }

  addCustomAmenity(): void {
    const val = this.customInput.trim();
    if (!val) return;
    this.customAmenities.update((list) => [...list, val]);
    this.customInput = '';
    this.toast.success(`"${val}" added to amenity catalog.`);
  }

  async toggleRoomAmenity(room: RoomItem, amenity: string): Promise<void> {
    if (this.isStaff()) return;
    const current = room.amenities || [];
    const next = current.includes(amenity)
      ? current.filter((a) => a !== amenity)
      : [...current, amenity];
    try {
      await this.roomService.updateRoom(room.id, { amenities: next });
      this.toast.success(`Updated amenities for Room ${room.number}.`);
    } catch (err: any) {
      this.toast.error(err?.message || 'Failed to update amenities.');
    }
  }

  goBack(): void {
    void this.router.navigate(['/rooms']);
  }

  onNavChange(navId: string): void {
    if (navId === 'rooms') {
      this.goBack();
      return;
    }
    const role = this.roleService.currentRole();
    const target = role === 'owner' ? '/owner/dashboard' : '/manager/dashboard';
    void this.router.navigate([target], { queryParams: { nav: navId } });
  }
}
