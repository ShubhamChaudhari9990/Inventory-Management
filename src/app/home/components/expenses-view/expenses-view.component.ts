import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonButton, IonIcon, IonModal } from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';

import {
  EXPENSES_SUBTITLE,
  ExpenseCategory,
} from '../../data/expenses.data';
import {
  AxisChartOptions,
  buildDynamicRevenueExpenseChart,
} from '../../data/dashboard-charts.data';
import { DashboardAxisChartComponent } from '../dashboard-charts/dashboard-charts.component';
import { DashboardKpiCardComponent } from '../dashboard-kpi-card/dashboard-kpi-card.component';
import { DashboardSectionCardComponent } from '../dashboard-section-card/dashboard-section-card.component';
import { DashboardKpi, ExpenseCategoryType, ExpenseItem, ExpensePaymentMethod } from '../../../interface';
import { LodgeDataService } from '../../../services/lodge-data.service';
import { AppToastService } from '../../../shared/services/app-toast.service';

export const ALL_EXPENSE_CATEGORIES: ExpenseCategoryType[] = [
  'Electricity',
  'Water',
  'Internet',
  'Staff Salary',
  'Maintenance',
  'Cleaning',
  'Inventory Purchases',
  'Food',
  'Rent',
  'Marketing',
  'Other',
];

@Component({
  selector: 'app-expenses-view',
  templateUrl: './expenses-view.component.html',
  styleUrls: ['./expenses-view.component.scss'],
  imports: [
    CommonModule,
    FormsModule,
    DashboardAxisChartComponent,
    DashboardKpiCardComponent,
    DashboardSectionCardComponent,
    IonButton,
    IonIcon,
    IonModal,
    TranslatePipe,
  ],
})
export class ExpensesViewComponent {
  private readonly lodgeData = inject(LodgeDataService);
  private readonly appToast = inject(AppToastService);

  readonly subtitle = EXPENSES_SUBTITLE;
  readonly dynamicRevenueChart = computed<AxisChartOptions>(() => {
    return buildDynamicRevenueExpenseChart(
      this.lodgeData.payments(),
      this.lodgeData.expenseItems(),
    );
  });

  get revenueChart(): AxisChartOptions {
    return this.dynamicRevenueChart();
  }
  readonly categoryOptions = ALL_EXPENSE_CATEGORIES;
  readonly expenseRecords = this.lodgeData.expenseItems;

  readonly isAddModalOpen = signal(false);
  readonly query = signal('');

  // Add Form
  formTitle = '';
  formAmount = 0;
  formCategory: ExpenseCategoryType = 'Electricity';
  formMethod: ExpensePaymentMethod = 'UPI';
  formNotes = '';

  get categories() {
    return this.lodgeData.expenses();
  }

  readonly dynamicKpis = computed<DashboardKpi[]>(() => {
    const records = this.expenseRecords();
    const activeRecords = records.filter((r) => !r.isReversed);
    const totalMonth = activeRecords.reduce((sum, r) => sum + (r.numericAmount || 0), 0);

    const todayStr = new Date().toISOString().slice(0, 10);
    const todayExpenses = activeRecords
      .filter((r) => r.createdAt && r.createdAt.startsWith(todayStr))
      .reduce((sum, r) => sum + (r.numericAmount || 0), 0);

    const reversedCount = records.filter((r) => !!r.isReversed).length;

    return [
      {
        id: 'month-expenses',
        label: "Month's Expenses",
        value: `₹${totalMonth.toLocaleString('en-IN')}`,
        icon: 'wallet-outline',
        tone: 'danger',
      },
      {
        id: 'today-expenses',
        label: "Today's Outflow",
        value: `₹${todayExpenses.toLocaleString('en-IN')}`,
        icon: 'today-outline',
        tone: 'warm',
      },
      {
        id: 'expense-txns',
        label: 'Total Expenses',
        value: String(activeRecords.length),
        icon: 'receipt-outline',
        tone: 'primary',
      },
      {
        id: 'reversed-txns',
        label: 'Reversed Adjustments',
        value: String(reversedCount),
        icon: 'refresh-outline',
        tone: 'success',
      },
    ];
  });

  readonly filteredRecords = computed(() => {
    const q = this.query().trim().toLowerCase();
    return this.expenseRecords().filter((r) => {
      return (
        !q ||
        r.title.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q) ||
        (r.vendor && r.vendor.toLowerCase().includes(q))
      );
    });
  });

  openAddModal(): void {
    this.formTitle = '';
    this.formAmount = 0;
    this.formCategory = 'Electricity';
    this.formMethod = 'UPI';
    this.formNotes = '';
    this.isAddModalOpen.set(true);
  }

  closeAddModal(): void {
    this.isAddModalOpen.set(false);
  }

  async saveExpense(): Promise<void> {
    if (!this.formTitle.trim() || this.formAmount <= 0) {
      await this.appToast.show('REGISTER.ERRORS.REQUIRED', 2500, 'warning');
      return;
    }

    try {
      await this.lodgeData.addExpense({
        propertyId: 'all',
        title: this.formTitle.trim(),
        amount: Number(this.formAmount),
        category: this.formCategory,
        paymentMethod: this.formMethod,
        expenseDate: new Date().toISOString().slice(0, 10),
        description: this.formNotes.trim() || undefined,
      });

      this.closeAddModal();
      await this.appToast.show('Expense recorded successfully.', 2500, 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error recording expense';
      await this.appToast.show(msg, 3000, 'danger');
    }
  }

  async reverseExpense(record: ExpenseItem, event: Event): Promise<void> {
    event.stopPropagation();
    try {
      await this.lodgeData.reverseExpense(record.id, 'Manager audit reversal');
      await this.appToast.show(`Expense ${record.title} reversed.`, 2500, 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error reversing expense';
      await this.appToast.show(msg, 3000, 'danger');
    }
  }

  trackCategory(_: number, category: ExpenseCategory): string {
    return category.id;
  }

  trackRecord(_: number, record: ExpenseItem): string {
    return record.id;
  }
}
