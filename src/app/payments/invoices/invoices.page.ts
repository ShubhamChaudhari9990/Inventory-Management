import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { IonButton, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  addOutline,
  arrowBackOutline,
  documentTextOutline,
  printOutline,
  shareOutline,
} from 'ionicons/icons';

import { AppShellComponent } from '../../shared/components/app-shell/app-shell.component';
import { InvoiceRecord } from '../../interface';
import { BillingService } from '../../services/billing.service';
import { LodgeDataService } from '../../services/lodge-data.service';
import { RoleService } from '../../services/role.service';
import { AppToastService } from '../../shared/services/app-toast.service';

@Component({
  selector: 'app-invoices',
  templateUrl: './invoices.page.html',
  styleUrls: ['./invoices.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonButton, IonIcon, AppShellComponent],
})
export class InvoicesPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly billingService = inject(BillingService);
  private readonly lodgeData = inject(LodgeDataService);
  private readonly roleService = inject(RoleService);
  private readonly toast = inject(AppToastService);

  readonly invoices = this.billingService.invoices;
  readonly bookings = this.lodgeData.bookings;
  readonly selectedInvoice = signal<InvoiceRecord | null>(null);
  selectedBookingForNew = '';

  readonly activeInvoice = computed(() => {
    const id = this.route.snapshot.paramMap.get('invoiceId');
    if (id) return this.invoices().find((i) => i.id === id) || this.selectedInvoice();
    return this.selectedInvoice();
  });

  constructor() {
    addIcons({ addOutline, arrowBackOutline, documentTextOutline, printOutline, shareOutline });
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('invoiceId');
    if (id) {
      const found = this.invoices().find((i) => i.id === id);
      if (found) this.selectedInvoice.set(found);
    }
  }

  async generateInvoice(): Promise<void> {
    if (!this.selectedBookingForNew) {
      this.toast.warning('Select a booking to generate an invoice.');
      return;
    }
    const b = this.bookings().find((x) => x.id === this.selectedBookingForNew);
    if (!b) return;
    try {
      const invId = await this.billingService.generateInvoiceForBooking(b);
      const created = this.invoices().find((i) => i.id === invId);
      if (created) this.selectedInvoice.set(created);
      this.toast.success('Snapshot invoice generated.');
    } catch (err: any) {
      this.toast.error(err?.message || 'Failed to generate invoice.');
    }
  }

  printInvoice(): void {
    window.print();
  }

  async shareInvoice(inv: InvoiceRecord): Promise<void> {
    const text = `Invoice ${inv.invoiceNumber} - ${inv.lodgeName}\nGuest: ${inv.customerName}\nTotal: ₹${inv.totalAmount}\nPaid: ₹${inv.amountPaid}\nBalance: ₹${inv.outstandingBalance}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: `Invoice ${inv.invoiceNumber}`, text });
      } catch {}
    } else if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      this.toast.success('Invoice summary copied to clipboard.');
    }
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
    const target = role === 'owner' ? '/owner/dashboard' : '/manager/dashboard';
    void this.router.navigate([target], { queryParams: { nav: navId } });
  }
}
