import { Component, inject } from '@angular/core';
import { IonButton, IonIcon } from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';

import {
  EXPENSE_KPIS,
  EXPENSE_REVENUE_CHART,
  EXPENSES_SUBTITLE,
  ExpenseCategory,
} from '../../data/expenses.data';
import { DashboardAxisChartComponent } from '../dashboard-charts/dashboard-charts.component';
import { DashboardKpiCardComponent } from '../dashboard-kpi-card/dashboard-kpi-card.component';
import { DashboardSectionCardComponent } from '../dashboard-section-card/dashboard-section-card.component';
import { LodgeDataService } from '../../../services/lodge-data.service';

@Component({
  selector: 'app-expenses-view',
  templateUrl: './expenses-view.component.html',
  styleUrls: ['./expenses-view.component.scss'],
  imports: [
    DashboardAxisChartComponent,
    DashboardKpiCardComponent,
    DashboardSectionCardComponent,
    IonButton,
    IonIcon,
    TranslatePipe,
  ],
})
export class ExpensesViewComponent {
  private readonly lodgeData = inject(LodgeDataService);

  readonly subtitle = EXPENSES_SUBTITLE;
  readonly kpis = EXPENSE_KPIS;
  readonly revenueChart = EXPENSE_REVENUE_CHART;
  
  get categories() {
    return this.lodgeData.expenses();
  }

  trackCategory(_: number, category: ExpenseCategory): string {
    return category.id;
  }
}
