import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonButton, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { arrowBackOutline, pricetagOutline, trashOutline } from 'ionicons/icons';

import { AppShellComponent } from '../../shared/components/app-shell/app-shell.component';
import { RoomPricingRule } from '../../interface';
import { RoomPricingService } from '../../services/room-pricing.service';
import { RoomService } from '../../services/room.service';
import { PropertyService } from '../../services/property.service';
import { RoleService } from '../../services/role.service';
import { AppToastService } from '../../shared/services/app-toast.service';

@Component({
  selector: 'app-room-pricing',
  templateUrl: './room-pricing.page.html',
  styleUrls: ['./room-pricing.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonButton, IonIcon, AppShellComponent],
})
export class RoomPricingPage {
  private readonly router = inject(Router);
  private readonly pricingService = inject(RoomPricingService);
  private readonly roomService = inject(RoomService);
  private readonly propertyService = inject(PropertyService);
  private readonly roleService = inject(RoleService);
  private readonly toast = inject(AppToastService);

  readonly rules = this.pricingService.pricingRules;
  readonly rooms = this.roomService.rooms;
  readonly lodges = this.propertyService.accessibleProperties;
  readonly isStaff = this.roleService.isStaff;

  // Rule form
  title = '';
  propertyId = '';
  ruleType: 'seasonal' | 'special_date' = 'seasonal';
  startDate = new Date().toISOString().slice(0, 10);
  endDate = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
  priceOverride: number | null = null;
  percentageAdjustment: number | null = 15;

  // Live Rate Preview
  readonly previewRoomId = signal('');
  readonly previewCheckIn = signal(new Date().toISOString().slice(0, 10));
  readonly previewCheckOut = signal(
    new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
  );

  readonly previewBreakdown = computed(() => {
    const r = this.rooms().find((rm) => rm.id === this.previewRoomId()) || this.rooms()[0];
    if (!r) return null;
    return this.pricingService.calculateEffectivePrice(
      r,
      this.previewCheckIn(),
      this.previewCheckOut(),
    );
  });

  constructor() {
    addIcons({ arrowBackOutline, pricetagOutline, trashOutline });
    const sel = this.propertyService.selectedPropertyId();
    this.propertyId = sel !== 'all' ? sel : this.lodges()[0]?.id || '';
  }

  async addRule(): Promise<void> {
    if (!this.title.trim() || !this.propertyId) {
      this.toast.warning('Please enter a rule title and lodge.');
      return;
    }
    try {
      await this.pricingService.createRule({
        title: this.title.trim(),
        propertyId: this.propertyId,
        ruleType: this.ruleType,
        startDate: this.startDate,
        endDate: this.endDate,
        priceOverride: this.priceOverride ?? undefined,
        percentageAdjustment: this.percentageAdjustment ?? undefined,
        isActive: true,
      });
      this.title = '';
      this.toast.success('Pricing rule saved.');
    } catch (err: any) {
      this.toast.error(err?.message || 'Failed to save pricing rule.');
    }
  }

  async toggleRule(rule: RoomPricingRule): Promise<void> {
    await this.pricingService.updateRule(rule.id, { isActive: !rule.isActive });
  }

  async deleteRule(rule: RoomPricingRule): Promise<void> {
    await this.pricingService.deleteRule(rule.id);
    this.toast.success('Pricing rule deleted.');
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
