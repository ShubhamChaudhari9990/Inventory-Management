import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { OperationsInventoryService } from '../../services/operations-inventory.service';
import { PropertyService } from '../../services/property.service';

@Component({
  selector: 'app-stock-movements',
  templateUrl: './stock-movements.page.html',
  styleUrls: ['./stock-movements.page.scss'],
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
  ],
})
export class StockMovementsPage {
  private readonly opsInventory = inject(OperationsInventoryService);
  private readonly propertyService = inject(PropertyService);

  readonly lodgeFilter = signal('all');
  readonly typeFilter = signal('all');
  readonly searchQuery = signal('');

  readonly accessibleProperties = computed(() =>
    this.propertyService.accessibleProperties(),
  );

  readonly filteredMovements = computed(() => {
    const lodge = this.lodgeFilter();
    const type = this.typeFilter();
    const q = this.searchQuery().trim().toLowerCase();

    return this.opsInventory.movements().filter((m) => {
      if (lodge !== 'all' && m.propertyId !== lodge) return false;
      const mType = m.movementType || m.type || '';
      if (type !== 'all' && mType !== type) return false;
      if (q) {
        const hay = `${m.itemName || ''} ${m.reason || ''} ${m.performedBy || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  });

  getLodgeName(propertyId?: string): string {
    if (!propertyId) return '—';
    return (
      this.accessibleProperties().find((p) => p.id === propertyId)?.name ||
      propertyId
    );
  }
}
