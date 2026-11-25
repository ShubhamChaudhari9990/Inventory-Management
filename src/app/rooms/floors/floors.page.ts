import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AlertController, IonButton, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  addOutline,
  arrowBackOutline,
  createOutline,
  layersOutline,
  trashOutline,
} from 'ionicons/icons';

import { AppShellComponent } from '../../shared/components/app-shell/app-shell.component';
import { FloorItem } from '../../interface';
import { FloorService } from '../../services/floor.service';
import { RoomService } from '../../services/room.service';
import { PropertyService } from '../../services/property.service';
import { RoleService } from '../../services/role.service';
import { AppToastService } from '../../shared/services/app-toast.service';

@Component({
  selector: 'app-floors',
  templateUrl: './floors.page.html',
  styleUrls: ['./floors.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonButton, IonIcon, AppShellComponent],
})
export class FloorsPage {
  private readonly router = inject(Router);
  private readonly alertCtrl = inject(AlertController);
  private readonly floorService = inject(FloorService);
  private readonly roomService = inject(RoomService);
  private readonly propertyService = inject(PropertyService);
  private readonly roleService = inject(RoleService);
  private readonly toast = inject(AppToastService);

  readonly floors = this.floorService.floors;
  readonly lodges = this.propertyService.accessibleProperties;
  readonly isStaff = this.roleService.isStaff;

  readonly editingId = signal<string | null>(null);
  readonly selectedFloor = signal<FloorItem | null>(null);

  floorName = '';
  floorNumber = 1;
  description = '';
  propertyId = '';
  status: 'active' | 'inactive' = 'active';

  readonly floorRooms = computed(() => {
    const fl = this.selectedFloor();
    if (!fl) return [];
    return this.roomService.allRooms().filter(
      (r) =>
        r.propertyId === fl.propertyId &&
        (r.floorId === fl.id || r.floor === fl.floorName || r.floor === String(fl.floorNumber)),
    );
  });

  constructor() {
    addIcons({ addOutline, arrowBackOutline, createOutline, layersOutline, trashOutline });
    const sel = this.propertyService.selectedPropertyId();
    this.propertyId = sel !== 'all' ? sel : this.lodges()[0]?.id || '';
  }

  getRoomCount(fl: FloorItem): number {
    return this.roomService.allRooms().filter(
      (r) =>
        r.propertyId === fl.propertyId &&
        (r.floorId === fl.id || r.floor === fl.floorName || r.floor === String(fl.floorNumber)),
    ).length;
  }

  getLodgeName(pid: string): string {
    return this.lodges().find((l) => l.id === pid)?.name || pid;
  }

  startEdit(fl: FloorItem): void {
    this.editingId.set(fl.id);
    this.floorName = fl.floorName;
    this.floorNumber = fl.floorNumber;
    this.description = fl.description || '';
    this.propertyId = fl.propertyId;
    this.status = fl.status;
  }

  resetForm(): void {
    this.editingId.set(null);
    this.floorName = '';
    this.floorNumber = 1;
    this.description = '';
    this.status = 'active';
  }

  async saveFloor(): Promise<void> {
    if (!this.floorName.trim() || !this.propertyId) {
      this.toast.warning('Please provide floor name and lodge.');
      return;
    }
    try {
      const id = this.editingId();
      if (id) {
        await this.floorService.updateFloor(id, {
          floorName: this.floorName.trim(),
          floorNumber: Number(this.floorNumber),
          description: this.description.trim(),
          status: this.status,
        });
        this.toast.success('Floor updated.');
      } else {
        await this.floorService.createFloor({
          floorName: this.floorName.trim(),
          floorNumber: Number(this.floorNumber),
          description: this.description.trim(),
          propertyId: this.propertyId,
          status: this.status,
        });
        this.toast.success('Floor created.');
      }
      this.resetForm();
    } catch (err: any) {
      this.toast.error(err?.message || 'Failed to save floor.');
    }
  }

  async deleteFloor(fl: FloorItem): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: `Delete ${fl.floorName}?`,
      message: 'Floors with assigned rooms cannot be deleted until rooms are reassigned.',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Delete',
          role: 'destructive',
          handler: async () => {
            try {
              await this.floorService.deleteFloor(fl.id);
              if (this.selectedFloor()?.id === fl.id) this.selectedFloor.set(null);
              this.toast.success('Floor deleted.');
            } catch (err: any) {
              this.toast.error(err?.message || 'Cannot delete floor.');
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
