import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  AlertController,
  IonButton,
  IonIcon,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  addOutline,
  bedOutline,
  businessOutline,
  callOutline,
  checkmarkCircleOutline,
  closeCircleOutline,
  createOutline,
  eyeOutline,
  funnelOutline,
  locationOutline,
  powerOutline,
  searchOutline,
  swapHorizontalOutline,
  swapVerticalOutline,
} from 'ionicons/icons';

import { AppShellComponent } from '../../shared/components/app-shell/app-shell.component';
import { Lodge, PropertyStatus } from '../../interface';
import { LodgeService } from '../../services/lodge.service';
import { LodgeDataService } from '../../services/lodge-data.service';
import { PropertyService } from '../../services/property.service';
import { RoleService } from '../../services/role.service';
import { AppToastService } from '../../shared/services/app-toast.service';

@Component({
  selector: 'app-lodges-list',
  templateUrl: './lodges-list.page.html',
  styleUrls: ['./lodges-list.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonButton,
    IonIcon,
    AppShellComponent,
  ],
})
export class LodgesListPage {
  private readonly router = inject(Router);
  private readonly alertCtrl = inject(AlertController);
  private readonly lodgeService = inject(LodgeService);
  private readonly lodgeData = inject(LodgeDataService);
  private readonly propertyService = inject(PropertyService);
  private readonly roleService = inject(RoleService);
  private readonly toast = inject(AppToastService);

  readonly lodges = this.lodgeService.lodges;
  readonly selectedPropertyId = this.propertyService.selectedPropertyId;
  readonly isOwner = this.roleService.isOwner;
  readonly isManager = this.roleService.isManager;
  readonly isStaff = this.roleService.isStaff;

  readonly searchQuery = signal('');
  readonly statusFilter = signal<'all' | 'active' | 'inactive'>('all');
  readonly sortBy = signal<'name' | 'createdAt'>('name');
  readonly pageSize = signal(12);

  // Statistics computed dynamically from Firestore
  readonly totalLodges = computed(() => this.lodges().length);
  readonly activeLodges = computed(
    () => this.lodges().filter((l) => l.status === 'active').length,
  );
  readonly inactiveLodges = computed(
    () => this.lodges().filter((l) => l.status === 'inactive').length,
  );
  readonly totalRoomsCount = computed(() => {
    const rooms = this.lodgeData.allRooms();
    if (rooms.length > 0) {
      const allowedIds = new Set(this.lodges().map((l) => l.id));
      return rooms.filter((r) => !r.propertyId || allowedIds.has(r.propertyId)).length;
    }
    return this.lodges().reduce((sum, l) => sum + (Number(l.totalRooms) || 0), 0);
  });

  readonly filteredLodges = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const st = this.statusFilter();
    const sort = this.sortBy();

    const list = this.lodges().filter((l) => {
      if (st !== 'all' && l.status !== st) return false;
      if (!q) return true;
      return (
        l.name.toLowerCase().includes(q) ||
        l.code.toLowerCase().includes(q) ||
        (l.city || '').toLowerCase().includes(q) ||
        (l.address || '').toLowerCase().includes(q)
      );
    });

    return [...list].sort((a, b) => {
      if (sort === 'createdAt') {
        return (b.createdAt || '').localeCompare(a.createdAt || '');
      }
      return a.name.localeCompare(b.name);
    });
  });

  readonly visibleLodges = computed(() =>
    this.filteredLodges().slice(0, this.pageSize()),
  );

  readonly hasMore = computed(
    () => this.filteredLodges().length > this.visibleLodges().length,
  );

  constructor() {
    addIcons({
      addOutline,
      bedOutline,
      businessOutline,
      callOutline,
      checkmarkCircleOutline,
      closeCircleOutline,
      createOutline,
      eyeOutline,
      funnelOutline,
      locationOutline,
      powerOutline,
      searchOutline,
      swapHorizontalOutline,
      swapVerticalOutline,
    });
  }

  getRoomStats(lodge: Lodge): { total: number; occupied: number; available: number } {
    const rooms = this.lodgeData
      .allRooms()
      .filter((r) => r.propertyId === lodge.id);
    if (rooms.length === 0) {
      return {
        total: Number(lodge.totalRooms) || 0,
        occupied: 0,
        available: Number(lodge.totalRooms) || 0,
      };
    }
    const occupied = rooms.filter((r) => r.status === 'Occupied').length;
    const available = rooms.filter((r) => r.status === 'Available').length;
    return { total: rooms.length, occupied, available };
  }

  loadMore(): void {
    this.pageSize.update((n) => n + 12);
  }

  goToAdd(): void {
    if (!this.isOwner()) return;
    void this.router.navigate(['/lodges/add']);
  }

  viewDetails(lodge: Lodge): void {
    void this.router.navigate(['/lodges', lodge.id]);
  }

  editLodge(lodge: Lodge): void {
    void this.router.navigate(['/lodges', lodge.id, 'edit']);
  }

  manageRooms(lodge: Lodge): void {
    this.propertyService.switchProperty(lodge.id);
    this.navigateToDashboardSection('rooms');
  }

  switchToLodge(lodge: Lodge): void {
    const ok = this.propertyService.switchProperty(lodge.id);
    if (ok) {
      this.toast.success(`Switched active lodge to ${lodge.name}`);
      this.navigateToDashboardSection('dashboard');
    }
  }

  async toggleStatus(lodge: Lodge): Promise<void> {
    if (!this.isOwner()) return;
    const nextStatus: PropertyStatus =
      lodge.status === 'active' ? 'inactive' : 'active';
    const actionWord = nextStatus === 'inactive' ? 'Deactivate' : 'Activate';

    const alert = await this.alertCtrl.create({
      header: `${actionWord} ${lodge.name}?`,
      message:
        nextStatus === 'inactive'
          ? 'Deactivating this lodge will prevent new bookings while preserving all historical records, revenue, and staff history.'
          : 'Activating this lodge will allow new bookings and full operations.',
      inputs:
        nextStatus === 'inactive'
          ? [
              {
                name: 'reason',
                type: 'text',
                placeholder: 'Reason for deactivation (optional)',
              },
            ]
          : [],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: actionWord,
          role: nextStatus === 'inactive' ? 'destructive' : 'confirm',
          handler: async (data) => {
            try {
              await this.lodgeService.setLodgeStatus(
                lodge.id,
                nextStatus,
                data?.reason,
              );
              this.toast.success(
                `${lodge.name} is now ${nextStatus === 'active' ? 'Active' : 'Inactive'}.`,
              );
            } catch (err: any) {
              this.toast.error(err?.message || 'Failed to update lodge status.');
            }
          },
        },
      ],
    });
    await alert.present();
  }

  onNavChange(navId: string): void {
    if (navId === 'lodges') return;
    this.navigateToDashboardSection(navId);
  }

  private navigateToDashboardSection(navId: string): void {
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
