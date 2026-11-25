import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AlertController, IonButton, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  createOutline,
  powerOutline,
  trashOutline,
} from 'ionicons/icons';

import { AppShellComponent } from '../../shared/components/app-shell/app-shell.component';
import {
  BED_TYPES,
  BedType,
  PREDEFINED_ROOM_AMENITIES,
  RoomType,
} from '../../interface';
import { RoomTypeService } from '../../services/room-type.service';
import { RoomService } from '../../services/room.service';
import { PropertyService } from '../../services/property.service';
import { RoleService } from '../../services/role.service';
import { AppToastService } from '../../shared/services/app-toast.service';

@Component({
  selector: 'app-room-types',
  templateUrl: './room-types.page.html',
  styleUrls: ['./room-types.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonButton, IonIcon, AppShellComponent],
})
export class RoomTypesPage {
  private readonly router = inject(Router);
  private readonly alertCtrl = inject(AlertController);
  private readonly roomTypeService = inject(RoomTypeService);
  private readonly roomService = inject(RoomService);
  private readonly propertyService = inject(PropertyService);
  private readonly roleService = inject(RoleService);
  private readonly toast = inject(AppToastService);

  readonly roomTypes = this.roomTypeService.roomTypes;
  readonly lodges = this.propertyService.accessibleProperties;
  readonly isStaff = this.roleService.isStaff;
  readonly bedTypes = BED_TYPES;
  readonly amenityOptions = PREDEFINED_ROOM_AMENITIES;

  readonly editingId = signal<string | null>(null);
  name = '';
  description = '';
  propertyId = 'all';
  defaultAdultCapacity = 2;
  defaultChildCapacity = 1;
  defaultBedConfiguration: BedType = 'Queen';
  defaultBeds = 1;
  basePrice = 2500;
  weekdayPrice = 2500;
  weekendPrice = 3000;
  selectedAmenities = signal<string[]>(['Air Conditioning', 'TV', 'Wi-Fi']);
  status: 'active' | 'inactive' = 'active';

  constructor() {
    addIcons({ arrowBackOutline, createOutline, powerOutline, trashOutline });
  }

  toggleAmenity(am: string): void {
    const cur = this.selectedAmenities();
    this.selectedAmenities.set(
      cur.includes(am) ? cur.filter((x) => x !== am) : [...cur, am],
    );
  }

  getReferencedRoomCount(rt: RoomType): number {
    return this.roomService
      .allRooms()
      .filter(
        (r) =>
          r.roomTypeId === rt.id ||
          r.type.toLowerCase() === rt.name.toLowerCase(),
      ).length;
  }

  startEdit(rt: RoomType): void {
    this.editingId.set(rt.id);
    this.name = rt.name;
    this.description = rt.description || '';
    this.propertyId = rt.propertyId || 'all';
    this.defaultAdultCapacity = rt.defaultAdultCapacity ?? 2;
    this.defaultChildCapacity = rt.defaultChildCapacity ?? 1;
    this.defaultBedConfiguration = rt.defaultBedConfiguration || 'Queen';
    this.defaultBeds = rt.defaultBeds ?? 1;
    this.basePrice = rt.basePrice;
    this.weekdayPrice = rt.weekdayPrice ?? rt.basePrice;
    this.weekendPrice = rt.weekendPrice ?? rt.basePrice;
    this.selectedAmenities.set([...(rt.amenities || [])]);
    this.status = rt.status || 'active';
  }

  resetForm(): void {
    this.editingId.set(null);
    this.name = '';
    this.description = '';
    this.basePrice = 2500;
    this.weekdayPrice = 2500;
    this.weekendPrice = 3000;
    this.status = 'active';
  }

  async saveType(): Promise<void> {
    if (!this.name.trim()) {
      this.toast.warning('Room type name is required.');
      return;
    }
    try {
      const payload = {
        name: this.name.trim(),
        description: this.description.trim(),
        propertyId: this.propertyId,
        defaultAdultCapacity: Number(this.defaultAdultCapacity) || 2,
        defaultChildCapacity: Number(this.defaultChildCapacity) || 0,
        defaultBedConfiguration: this.defaultBedConfiguration,
        defaultBeds: Number(this.defaultBeds) || 1,
        capacity: (Number(this.defaultAdultCapacity) || 2) + (Number(this.defaultChildCapacity) || 0),
        basePrice: Number(this.basePrice) || 0,
        weekdayPrice: Number(this.weekdayPrice) || Number(this.basePrice) || 0,
        weekendPrice: Number(this.weekendPrice) || Number(this.basePrice) || 0,
        amenities: this.selectedAmenities(),
        status: this.status,
      };
      if (this.editingId()) {
        await this.roomTypeService.updateRoomType(this.editingId()!, payload);
        this.toast.success('Room type updated.');
      } else {
        await this.roomTypeService.createRoomType(payload);
        this.toast.success('Room type created.');
      }
      this.resetForm();
    } catch (err: any) {
      this.toast.error(err?.message || 'Failed to save room type.');
    }
  }

  async toggleActive(rt: RoomType): Promise<void> {
    const next = rt.status === 'inactive' ? 'active' : 'inactive';
    await this.roomTypeService.updateRoomType(rt.id, { status: next });
    this.toast.success(`${rt.name} is now ${next}.`);
  }

  async deleteType(rt: RoomType): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: `Delete ${rt.name}?`,
      message: 'Room types actively referenced by rooms cannot be deleted.',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Delete',
          role: 'destructive',
          handler: async () => {
            try {
              await this.roomTypeService.deleteRoomType(rt.id);
              this.toast.success('Room type deleted.');
            } catch (err: any) {
              this.toast.error(err?.message || 'Cannot delete room type.');
            }
          },
        },
      ],
    });
    await alert.present();
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
