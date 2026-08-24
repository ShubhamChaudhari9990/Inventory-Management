import { Component, computed, inject } from '@angular/core';
import { IonButton, IonIcon } from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';

import { statusLabelKey } from '../../../shared/i18n/label-keys';
import {
  STAFF_KPIS,
  STAFF_VIEW_SUBTITLE,
  StaffMember,
} from '../../data/staff.data';
import { DashboardKpiCardComponent } from '../dashboard-kpi-card/dashboard-kpi-card.component';
import { DashboardSectionCardComponent } from '../dashboard-section-card/dashboard-section-card.component';
import { LodgeDataService } from '../../../services/lodge-data.service';

@Component({
  selector: 'app-staff-view',
  templateUrl: './staff-view.component.html',
  styleUrls: ['./staff-view.component.scss'],
  imports: [
    DashboardKpiCardComponent,
    DashboardSectionCardComponent,
    IonButton,
    IonIcon,
    TranslatePipe,
  ],
})
export class StaffViewComponent {
  private readonly lodgeData = inject(LodgeDataService);

  readonly subtitle = STAFF_VIEW_SUBTITLE;
  
  get members() {
    return this.lodgeData.staff();
  }

  readonly dynamicKpis = computed(() => {
    const list = this.members;
    const presentCount = list.filter((m) => m.status === 'Present').length;
    const leaveCount = list.filter((m) => m.status === 'On Leave').length;
    const totalCount = list.length;

    return STAFF_KPIS.map((kpi) => {
      if (kpi.id === 'present') return { ...kpi, value: `${presentCount}/${totalCount}` };
      if (kpi.id === 'leave') return { ...kpi, value: String(leaveCount) };
      return kpi;
    });
  });

  get kpis() {
    return this.dynamicKpis();
  }

  readonly statusLabelKey = statusLabelKey;

  trackMember(_: number, member: StaffMember): string {
    return member.id;
  }
}
