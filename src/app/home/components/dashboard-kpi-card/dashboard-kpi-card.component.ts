import { Component, computed, inject, input } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { IonCard, IonCardContent, IonIcon } from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';

import { DashboardKpi } from '../../data/dashboard.data';
import { isCustomKpiIcon, KPI_CUSTOM_ICONS } from '../../data/kpi-icons.data';

@Component({
  selector: 'app-dashboard-kpi-card',
  templateUrl: './dashboard-kpi-card.component.html',
  styleUrls: ['./dashboard-kpi-card.component.scss'],
  imports: [IonCard, IonCardContent, IonIcon, TranslatePipe],
})
export class DashboardKpiCardComponent {
  private readonly sanitizer = inject(DomSanitizer);

  readonly kpi = input.required<DashboardKpi>();

  readonly isCustomIcon = computed(() => isCustomKpiIcon(this.kpi().icon));
  readonly customIconHtml = computed<SafeHtml | null>(() => {
    const icon = this.kpi().icon;
    if (!isCustomKpiIcon(icon)) {
      return null;
    }

    return this.sanitizer.bypassSecurityTrustHtml(KPI_CUSTOM_ICONS[icon]);
  });
}
