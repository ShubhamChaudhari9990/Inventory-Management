import { Component, computed, inject, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { statusLabelKey } from '../../../shared/i18n/label-keys';
import {
  CLEANING_CHECKLIST_DEFAULT,
  ChecklistItem,
  CleaningScheduleItem,
  HOUSEKEEPING_KPIS,
  HOUSEKEEPING_VIEW_SUBTITLE,
} from '../../data/housekeeping.data';
import { DashboardKpiCardComponent } from '../dashboard-kpi-card/dashboard-kpi-card.component';
import { DashboardSectionCardComponent } from '../dashboard-section-card/dashboard-section-card.component';
import { LodgeDataService } from '../../../services/lodge-data.service';

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
  private readonly lodgeData = inject(LodgeDataService);

  readonly subtitle = HOUSEKEEPING_VIEW_SUBTITLE;
  
  get schedule() {
    return this.lodgeData.housekeeping();
  }

  readonly dynamicKpis = computed(() => {
    const list = this.schedule;
    const completedCount = list.filter((i) => i.status === 'Completed').length;
    const pendingCount = list.filter((i) => i.status === 'Pending').length;
    const totalCount = list.length;

    return HOUSEKEEPING_KPIS.map((kpi) => {
      if (kpi.id === 'cleaning') return { ...kpi, value: String(totalCount) };
      if (kpi.id === 'completed') return { ...kpi, value: String(completedCount) };
      if (kpi.id === 'pending') return { ...kpi, value: String(pendingCount) };
      return kpi;
    });
  });

  get kpis() {
    return this.dynamicKpis();
  }

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
