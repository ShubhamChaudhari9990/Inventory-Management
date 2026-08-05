import { Component, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { statusLabelKey } from '../../../shared/i18n/label-keys';
import {
  CLEANING_CHECKLIST_DEFAULT,
  CLEANING_SCHEDULE,
  ChecklistItem,
  CleaningScheduleItem,
  HOUSEKEEPING_KPIS,
  HOUSEKEEPING_VIEW_SUBTITLE,
} from '../../data/housekeeping.data';
import { DashboardKpiCardComponent } from '../dashboard-kpi-card/dashboard-kpi-card.component';
import { DashboardSectionCardComponent } from '../dashboard-section-card/dashboard-section-card.component';

@Component({
  selector: 'app-housekeeping-view',
  templateUrl: './housekeeping-view.component.html',
  styleUrls: ['./housekeeping-view.component.scss'],
  imports: [
    DashboardKpiCardComponent,
    DashboardSectionCardComponent,
    TranslatePipe,
  ],
})
export class HousekeepingViewComponent {
  readonly subtitle = HOUSEKEEPING_VIEW_SUBTITLE;
  readonly kpis = HOUSEKEEPING_KPIS;
  readonly schedule = CLEANING_SCHEDULE;
  readonly statusLabelKey = statusLabelKey;

  readonly checklist = signal<ChecklistItem[]>(
    CLEANING_CHECKLIST_DEFAULT.map((item) => ({ ...item })),
  );

  toggleChecklist(id: string): void {
    this.checklist.update((items) =>
      items.map((item) =>
        item.id === id ? { ...item, checked: !item.checked } : item,
      ),
    );
  }

  trackSchedule(_: number, item: CleaningScheduleItem): string {
    return item.id;
  }

  trackChecklist(_: number, item: ChecklistItem): string {
    return item.id;
  }
}
