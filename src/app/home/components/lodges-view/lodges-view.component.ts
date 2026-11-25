import { Component, computed, inject, signal } from '@angular/core';
import { UpperCasePipe, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonButton,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
} from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';
import { addIcons } from 'ionicons';
import {
  businessOutline,
  bedOutline,
  callOutline,
  addOutline,
  searchOutline,
  checkmarkCircleOutline,
  locationOutline,
  appsOutline,
  eyeOutline,
  createOutline,
  closeOutline,
  layersOutline,
  checkmarkCircle,
  addCircleOutline,
} from 'ionicons/icons';

export const AVAILABLE_AMENITIES: string[] = [
  'WiFi',
  'Parking',
  'Swimming Pool',
  'Restaurant',
  'Air Conditioning',
  'Room Service',
  'Breakfast',
  'Power Backup',
  'Gym',
  'Bar',
  'Spa',
  'EV Charging',
];

import { Property, PropertyStatus } from '../../../interface';
import { PropertyService } from '../../../services/property.service';
import { RoleService } from '../../../services/role.service';
import { AppToastService } from '../../../shared/services/app-toast.service';

@Component({
  selector: 'app-lodges-view',
  templateUrl: './lodges-view.component.html',
  styleUrls: ['./lodges-view.component.scss'],
  imports: [
    CommonModule,
    UpperCasePipe,
    FormsModule,
    IonButton,
    IonIcon,
    IonInput,
    IonItem,
    IonLabel,
    TranslatePipe,
  ],
})
export class LodgesViewComponent {
  readonly propertyService = inject(PropertyService);
  readonly roleService = inject(RoleService);
  private readonly appToast = inject(AppToastService);

  readonly properties = this.propertyService.properties;
  readonly selectedPropertyId = this.propertyService.selectedPropertyId;
  readonly isOwner = this.roleService.isOwner;

  readonly isAddModalOpen = signal(false);
  readonly isEditModalOpen = signal(false);
  readonly isDetailsModalOpen = signal(false);
  readonly activeLodge = signal<Property | null>(null);
  readonly searchQuery = signal('');

  // Summary KPIs (All Lodges Cards)
  readonly totalLodgesCount = computed(() => this.properties().length);
  readonly activeLodgesCount = computed(
    () => this.properties().filter((p) => p.status === 'active').length
  );
  readonly totalRoomsCount = computed(() =>
    this.properties().reduce((sum, p) => sum + (Number(p.totalRooms) || 0), 0)
  );
  readonly totalCitiesCount = computed(() => {
    const cities = new Set(this.properties().map((p) => p.city?.trim()).filter(Boolean));
    return cities.size;
  });

  // Property Scope Filter
  readonly selectedScopeId = signal<string>('all');

  constructor() {
    addIcons({
      businessOutline,
      bedOutline,
      callOutline,
      addOutline,
      searchOutline,
      checkmarkCircleOutline,
      locationOutline,
      appsOutline,
      eyeOutline,
      createOutline,
      closeOutline,
      layersOutline,
      checkmarkCircle,
      addCircleOutline,
    });
  }

  setScopeFilter(scopeId: string): void {
    this.selectedScopeId.set(scopeId);
    this.propertyService.switchProperty(scopeId as any);
  }

  // Amenities Management
  readonly availableAmenities = AVAILABLE_AMENITIES;
  readonly newLodgeAmenities = signal<string[]>(['WiFi', 'Breakfast', 'Parking', 'Room Service']);
  readonly editLodgeAmenities = signal<string[]>([]);

  toggleNewLodgeAmenity(amenity: string): void {
    const current = this.newLodgeAmenities();
    if (current.includes(amenity)) {
      this.newLodgeAmenities.set(current.filter((a) => a !== amenity));
    } else {
      this.newLodgeAmenities.set([...current, amenity]);
    }
  }

  toggleEditLodgeAmenity(amenity: string): void {
    const current = this.editLodgeAmenities();
    if (current.includes(amenity)) {
      this.editLodgeAmenities.set(current.filter((a) => a !== amenity));
    } else {
      this.editLodgeAmenities.set([...current, amenity]);
    }
  }

  // New Lodge Form
  newLodgeName = '';
  newLodgeCode = '';
  newLodgeCity = '';
  newLodgeAddress = '';
  newLodgePhone = '';
  newLodgeTotalRooms = 12;
  newLodgeTagline = '';

  // Edit Lodge Form
  editLodgeId = '';
  editLodgeName = '';
  editLodgeCode = '';
  editLodgeCity = '';
  editLodgeAddress = '';
  editLodgePhone = '';
  editLodgeTotalRooms = 12;
  editLodgeTagline = '';

  readonly filteredProperties = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const scope = this.selectedScopeId();
    let list = this.properties();
    if (scope !== 'all') {
      const scopedList = list.filter((p) => p.id === scope);
      if (scopedList.length > 0) {
        list = scopedList;
      }
    }
    if (!q) return list;
    return list.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        (p.city && p.city.toLowerCase().includes(q)) ||
        (p.address && p.address.toLowerCase().includes(q))
    );
  });

  openAddModal(): void {
    this.newLodgeName = '';
    this.newLodgeCode = '';
    this.newLodgeCity = '';
    this.newLodgeAddress = '';
    this.newLodgePhone = '';
    this.newLodgeTotalRooms = 12;
    this.newLodgeTagline = '';
    this.newLodgeAmenities.set(['WiFi', 'Breakfast', 'Parking', 'Room Service']);
    this.isAddModalOpen.set(true);
  }

  closeAddModal(): void {
    this.isAddModalOpen.set(false);
  }

  openEditModal(lodge: Property, event: Event): void {
    event.stopPropagation();
    this.editLodgeId = lodge.id;
    this.editLodgeName = lodge.name;
    this.editLodgeCode = lodge.code;
    this.editLodgeCity = lodge.city || '';
    this.editLodgeAddress = lodge.address || '';
    this.editLodgePhone = lodge.phone || '';
    this.editLodgeTotalRooms = lodge.totalRooms;
    this.editLodgeTagline = lodge.tagline || '';
    this.editLodgeAmenities.set([...(lodge.amenities || ['WiFi', 'Parking'])]);
    this.isEditModalOpen.set(true);
  }

  closeEditModal(): void {
    this.isEditModalOpen.set(false);
  }

  openDetailsModal(lodge: Property, event: Event): void {
    event.stopPropagation();
    this.activeLodge.set(lodge);
    this.isDetailsModalOpen.set(true);
  }

  closeDetailsModal(): void {
    this.isDetailsModalOpen.set(false);
    this.activeLodge.set(null);
  }

  selectLodge(id: string): void {
    this.selectedScopeId.set(id);
    this.propertyService.switchProperty(id as any);
    void this.appToast.show('LODGE.SELECTED_SUCCESS', 2000, 'success');
  }

  async saveNewLodge(): Promise<void> {
    if (!this.newLodgeName.trim() || !this.newLodgeCity.trim()) {
      await this.appToast.show('REGISTER.ERRORS.REQUIRED', 2500, 'warning');
      return;
    }

    try {
      await this.propertyService.addProperty({
        organizationId: 'org_lemonwood',
        name: this.newLodgeName.trim(),
        code: this.newLodgeCode.trim() || `LW-${Date.now().toString().slice(-4)}`,
        city: this.newLodgeCity.trim(),
        address: this.newLodgeAddress.trim(),
        phone: this.newLodgePhone.trim(),
        tagline: this.newLodgeTagline.trim() || undefined,
        totalRooms: Number(this.newLodgeTotalRooms) || 10,
        status: 'active',
        amenities: this.newLodgeAmenities(),
        imageUrl: 'assets/icon/favicon.png',
        createdAt: new Date().toISOString(),
      });

      this.closeAddModal();
      await this.appToast.show('LODGE.CREATED_SUCCESS', 2500, 'success');
    } catch (err: any) {
      await this.appToast.show(err.message || 'LODGE.ERROR', 3000, 'danger');
    }
  }

  async saveEditLodge(): Promise<void> {
    if (!this.editLodgeName.trim() || !this.editLodgeCity.trim()) {
      await this.appToast.show('REGISTER.ERRORS.REQUIRED', 2500, 'warning');
      return;
    }

    try {
      await this.propertyService.updateProperty(this.editLodgeId, {
        name: this.editLodgeName.trim(),
        code: this.editLodgeCode.trim(),
        city: this.editLodgeCity.trim(),
        address: this.editLodgeAddress.trim(),
        phone: this.editLodgePhone.trim(),
        tagline: this.editLodgeTagline.trim() || undefined,
        totalRooms: Number(this.editLodgeTotalRooms) || 10,
        amenities: this.editLodgeAmenities(),
      });

      this.closeEditModal();
      await this.appToast.show('LODGE.STATUS_UPDATED', 2500, 'success');
    } catch (err: any) {
      await this.appToast.show(err.message || 'LODGE.ERROR', 3000, 'danger');
    }
  }

  async toggleStatus(lodge: Property, event: Event): Promise<void> {
    event.stopPropagation();
    const newStatus: PropertyStatus = lodge.status === 'active' ? 'inactive' : 'active';
    await this.propertyService.setPropertyStatus(lodge.id, newStatus);
    await this.appToast.show('LODGE.STATUS_UPDATED', 2000, 'success');
  }

  async archiveLodge(lodge: Property, event: Event): Promise<void> {
    event.stopPropagation();
    const isCurrentlyActive = lodge.status === 'active';
    await this.propertyService.archiveProperty(lodge.id, isCurrentlyActive);
    const msg = isCurrentlyActive ? 'Lodge successfully archived' : 'Lodge unarchived and active';
    await this.appToast.show(msg, 2000, 'success');
  }
}
