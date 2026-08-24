import { Component, computed, inject, signal } from '@angular/core';
import { IonButton, IonIcon } from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';

import { statusLabelKey } from '../../../shared/i18n/label-keys';
import {
  CUSTOMER_VIEW_SUBTITLE,
  CustomerItem,
} from '../../data/customers.data';
import { LodgeDataService } from '../../../services/lodge-data.service';

@Component({
  selector: 'app-customers-view',
  templateUrl: './customers-view.component.html',
  styleUrls: ['./customers-view.component.scss'],
  imports: [IonButton, IonIcon, TranslatePipe],
})
export class CustomersViewComponent {
  private readonly lodgeData = inject(LodgeDataService);

  readonly subtitle = CUSTOMER_VIEW_SUBTITLE;
  readonly customers = this.lodgeData.customers;

  readonly statusLabelKey = statusLabelKey;

  readonly query = signal('');

  readonly filteredCustomers = computed(() => {
    const query = this.query().trim().toLowerCase();
    const list = this.customers();
    if (!query) {
      return list;
    }

    return list.filter(
      (customer) =>
        customer.name.toLowerCase().includes(query) ||
        customer.phone.toLowerCase().includes(query) ||
        customer.city.toLowerCase().includes(query) ||
        customer.idType.toLowerCase().includes(query) ||
        customer.idNumber.toLowerCase().includes(query) ||
        customer.status.toLowerCase().includes(query),
    );
  });

  onQueryInput(event: Event): void {
    const target = event.target as HTMLInputElement | null;
    this.query.set(target?.value ?? '');
  }

  trackCustomer(_: number, customer: CustomerItem): string {
    return customer.id;
  }
}
