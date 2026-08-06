import { Component } from '@angular/core';
import { IonButton, IonIcon } from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';

import {
  EXPENSE_CATEGORIES,
  EXPENSE_KPIS,
  EXPENSE_REVENUE_CHART,
  EXPENSES_SUBTITLE,
  ExpenseCategory,
} from '../../data/expenses.data';
import { DashboardAxisChartComponent } from '../dashboard-charts/dashboard-charts.component';
import { DashboardKpiCardComponent } from '../dashboard-kpi-card/dashboard-kpi-card.component';
import { DashboardSectionCardComponent } from '../dashboard-section-card/dashboard-section-card.component';

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
  readonly subtitle = EXPENSES_SUBTITLE;
  readonly kpis = EXPENSE_KPIS;
  readonly revenueChart = EXPENSE_REVENUE_CHART;
  readonly categories = EXPENSE_CATEGORIES;

  trackCategory(_: number, category: ExpenseCategory): string {
    return category.id;
  }
}
