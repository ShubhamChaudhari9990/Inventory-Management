import { Component } from '@angular/core';
import { IonButton, IonIcon } from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';

import { statusLabelKey } from '../../../shared/i18n/label-keys';
import {
  STAFF_KPIS,
  STAFF_MEMBERS,
  STAFF_VIEW_SUBTITLE,
  StaffMember,
} from '../../data/staff.data';
import { DashboardKpiCardComponent } from '../dashboard-kpi-card/dashboard-kpi-card.component';
import { DashboardSectionCardComponent } from '../dashboard-section-card/dashboard-section-card.component';

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
  readonly subtitle = STAFF_VIEW_SUBTITLE;
  readonly kpis = STAFF_KPIS;
  readonly members = STAFF_MEMBERS;
  readonly statusLabelKey = statusLabelKey;

  trackMember(_: number, member: StaffMember): string {
    return member.id;
  }
}
