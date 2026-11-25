import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
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
  addOutline,
  closeOutline,
  searchOutline,
  cameraOutline,
} from 'ionicons/icons';
import { OperationsInventoryService } from '../../services/operations-inventory.service';
import { PropertyService } from '../../services/property.service';
import { RoleService } from '../../services/role.service';
import { AppToastService } from '../../shared/services/app-toast.service';
import { ItemTrackingType } from '../../interface';

@Component({
  selector: 'app-inventory-items',
  templateUrl: './inventory-items.page.html',
  styleUrls: ['./inventory-items.page.scss'],
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
export class InventoryItemsPage {
  private readonly opsInventory = inject(OperationsInventoryService);
  private readonly propertyService = inject(PropertyService);
  readonly roleService = inject(RoleService);
  private readonly toast = inject(AppToastService);
  private readonly router = inject(Router);

  readonly showForm = signal(false);
  readonly saving = signal(false);
  readonly uploading = signal(false);

  // Filters
  readonly searchQuery = signal('');
  readonly lodgeFilter = signal('all');
  readonly categoryFilter = signal('all');
  readonly stockFilter = signal('all');

  // Custom taxonomy
  readonly newCategory = signal('');
  readonly newUnit = signal('');

  // Form
  readonly formLodgeId = signal('');
  readonly formName = signal('');
  readonly formSku = signal('');
  readonly formCategory = signal('Housekeeping');
  readonly formUnit = signal('Piece');
  readonly formBrand = signal('');
  readonly formDescription = signal('');
  readonly formQuantity = signal(0);
  readonly formMin = signal(5);
  readonly formReorderQty = signal(10);
  readonly formPrice = signal(0);
  readonly formLocation = signal('Main Store');
  readonly formSupplier = signal('');
  readonly formTrackingType = signal<ItemTrackingType>('Consumable');
  readonly formSerial = signal('');
  readonly formBatch = signal('');
  readonly formExpiry = signal('');
  readonly formImageUrl = signal('');

  readonly accessibleProperties = computed(() =>
    this.propertyService.accessibleProperties(),
  );
  readonly categories = this.opsInventory.categories;
  readonly units = this.opsInventory.units;
  readonly suppliers = this.opsInventory.activeSuppliers;

  readonly canManage = computed(
    () => this.roleService.isOwner() || this.roleService.isManager(),
  );

  readonly filteredItems = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const lodge = this.lodgeFilter();
    const cat = this.categoryFilter();
    const stock = this.stockFilter();

    return this.opsInventory.items().filter((i) => {
      if (lodge !== 'all' && i.propertyId !== lodge) return false;
      if (cat !== 'all' && i.category !== cat) return false;
      if (stock === 'low' && !((i.quantity || 0) > 0 && (i.quantity || 0) <= (i.min || 0))) {
        return false;
      }
      if (stock === 'out' && (i.quantity || 0) > 0) return false;
      if (q) {
        const hay = `${i.name} ${i.sku || ''} ${i.brand || ''} ${i.category}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  });

  constructor() {
    addIcons({ addOutline, closeOutline, searchOutline, cameraOutline });
    const first = this.accessibleProperties()[0];
    if (first) this.formLodgeId.set(first.id);
  }

  getLodgeName(propertyId?: string): string {
    if (!propertyId) return '—';
    return (
      this.accessibleProperties().find((p) => p.id === propertyId)?.name ||
      propertyId
    );
  }

  async onImageSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.uploading.set(true);
    try {
      const url = await this.opsInventory.uploadItemImage(`INV-NEW`, file);
      this.formImageUrl.set(url);
      await this.toast.success('Item image uploaded');
    } catch {
      await this.toast.error('Image upload failed');
    } finally {
      this.uploading.set(false);
      input.value = '';
    }
  }

  async addCategory(): Promise<void> {
    if (!this.newCategory().trim()) return;
    await this.opsInventory.addCustomCategory(this.newCategory());
    this.formCategory.set(this.newCategory().trim());
    this.newCategory.set('');
    await this.toast.success('Custom category added');
  }

  async addUnit(): Promise<void> {
    if (!this.newUnit().trim()) return;
    await this.opsInventory.addCustomUnit(this.newUnit());
    this.formUnit.set(this.newUnit().trim());
    this.newUnit.set('');
    await this.toast.success('Custom unit added');
  }

  async createItem(): Promise<void> {
    if (!this.formLodgeId() || !this.formName().trim()) {
      await this.toast.warning('Lodge and Item Name are required.');
      return;
    }

    this.saving.set(true);
    try {
      await this.opsInventory.createInventoryItem({
        propertyId: this.formLodgeId(),
        name: this.formName().trim(),
        sku: this.formSku().trim() || undefined,
        category: this.formCategory(),
        unit: this.formUnit(),
        brand: this.formBrand().trim() || undefined,
        description: this.formDescription().trim() || undefined,
        imageUrl: this.formImageUrl() || undefined,
        openingStock: Number(this.formQuantity() || 0),
        quantity: Number(this.formQuantity() || 0),
        min: Number(this.formMin() || 0),
        reorderQuantity: Number(this.formReorderQty() || 0),
        storageLocation: this.formLocation().trim() || 'Main Store',
        purchasePrice: Number(this.formPrice() || 0),
        supplier: this.formSupplier().trim() || undefined,
        trackingType: this.formTrackingType(),
        serialNumber: this.formSerial().trim() || undefined,
        batchNumber: this.formBatch().trim() || undefined,
        expiryDate: this.formExpiry() || undefined,
      });
      await this.toast.success('Inventory item created');
      this.formName.set('');
      this.formSku.set('');
      this.formDescription.set('');
      this.formImageUrl.set('');
      this.showForm.set(false);
    } catch (err: any) {
      await this.toast.error(err?.message || 'Failed to create inventory item');
    } finally {
      this.saving.set(false);
    }
  }

  openItem(id: string): void {
    this.router.navigate(['/inventory/items', id]);
  }
}
