import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonButton, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { arrowBackOutline, searchOutline } from 'ionicons/icons';

import { AppShellComponent } from '../../shared/components/app-shell/app-shell.component';
import { BillingService } from '../../services/billing.service';
import { PropertyService } from '../../services/property.service';
import { RoleService } from '../../services/role.service';

@Component({
  selector: 'app-transactions',
  templateUrl: './transactions.page.html',
  styleUrls: ['./transactions.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonButton, IonIcon, AppShellComponent],
})
export class TransactionsPage {
  private readonly router = inject(Router);
  private readonly billingService = inject(BillingService);
  private readonly propertyService = inject(PropertyService);
  private readonly roleService = inject(RoleService);

  readonly payments = this.billingService.payments;
  readonly lodges = this.propertyService.accessibleProperties;
  readonly isOwner = this.roleService.isOwner;

  readonly searchQuery = signal('');
  readonly methodFilter = signal('all');
  readonly statusFilter = signal('all');
  readonly typeFilter = signal('all');
  readonly startDate = signal('');
  readonly endDate = signal('');
  readonly sortBy = signal<'date' | 'amount'>('date');
  readonly pageSize = signal(20);

  readonly filtered = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const m = this.methodFilter();
    const st = this.statusFilter();
    const tp = this.typeFilter();
    const sd = this.startDate();
    const ed = this.endDate();
    const sort = this.sortBy();

    const list = this.payments().filter((p) => {
      if (m !== 'all' && p.method !== m) return false;
      if (st !== 'all' && p.status !== st) return false;
      if (tp !== 'all' && p.type !== tp) return false;
      const d = p.paymentDate || p.createdAt.slice(0, 10);
      if (sd && d < sd) return false;
      if (ed && d > ed) return false;
      if (q) {
        const match =
          p.id.toLowerCase().includes(q) ||
          (p.bookingId || '').toLowerCase().includes(q) ||
          p.guestName.toLowerCase().includes(q) ||
          (p.referenceNumber || '').toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });

    return [...list].sort((a, b) => {
      if (sort === 'amount') {
        return (Number(b.numericAmount) || 0) - (Number(a.numericAmount) || 0);
      }
      return (b.createdAt || '').localeCompare(a.createdAt || '');
    });
  });

  readonly visible = computed(() => this.filtered().slice(0, this.pageSize()));
  readonly hasMore = computed(() => this.filtered().length > this.visible().length);

  constructor() {
    addIcons({ arrowBackOutline, searchOutline });
  }

  loadMore(): void {
    this.pageSize.update((n) => n + 20);
  }

  goBack(): void {
    void this.router.navigate(['/payments']);
  }

  onNavChange(navId: string): void {
    if (navId === 'payments') {
      this.goBack();
      return;
    }
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
