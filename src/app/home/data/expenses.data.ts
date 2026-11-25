import { DashboardKpi } from './dashboard.data';
import { AxisChartOptions } from './dashboard-charts.data';
import { ExpenseCategory } from '../../interface';

export type { ExpenseCategory };

export const EXPENSES_SUBTITLE = 'EXPENSES.SUBTITLE';

export const EXPENSE_KPIS: readonly DashboardKpi[] = [
  {
    id: 'today',
    label: 'EXPENSES.KPI.TODAY',
    value: '₹0',
    icon: 'receipt-outline',
    tone: 'danger',
  },
  {
    id: 'month',
    label: 'EXPENSES.KPI.MONTH',
    value: '₹0',
    icon: 'trending-down-outline',
    tone: 'warm',
  },
  {
    id: 'revenue',
    label: 'EXPENSES.KPI.REVENUE',
    value: '₹0',
    icon: 'trending-up-outline',
    tone: 'success',
  },
  {
    id: 'pnl',
    label: 'EXPENSES.KPI.PNL',
    value: '₹0',
    icon: 'trending-up-outline',
    tone: 'primary',
  },
] as const;

const AXIS_LABEL_STYLE = { colors: '#6b7280', fontSize: '12px' } as const;

export const EXPENSE_REVENUE_CHART: AxisChartOptions = {
  series: [
    { name: 'Revenue', data: [0, 0, 0, 0, 0, 0] },
    { name: 'Expense', data: [0, 0, 0, 0, 0, 0] },
  ],
  chart: {
    type: 'bar',
    height: 280,
    toolbar: { show: false },
    zoom: { enabled: false, allowMouseWheelZoom: false },
    fontFamily: 'var(--font-sans)',
    parentHeightOffset: 0,
  },
  colors: ['#16a34a', '#ef4444'],
  dataLabels: { enabled: false },
  stroke: {
    show: true,
    width: 4,
    colors: ['transparent'],
  },
  grid: {
    borderColor: '#e5e7eb',
    strokeDashArray: 0,
    padding: { top: 12, right: 6, bottom: 0, left: 6 },
  },
  plotOptions: {
    bar: {
      columnWidth: '72%',
      borderRadius: 8,
      borderRadiusApplication: 'end',
      borderRadiusWhenStacked: 'last',
    },
  },
  xaxis: {
    categories: ['Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
    axisBorder: { show: false },
    axisTicks: { show: false },
    labels: { style: { ...AXIS_LABEL_STYLE } },
  },
  yaxis: {
    min: 0,
    max: 100,
    tickAmount: 4,
    labels: {
      style: { ...AXIS_LABEL_STYLE },
      formatter: (value) => `${Math.round(value)}k`,
    },
  },
  legend: { show: false },
  fill: { opacity: 1 },
  markers: { size: 0 },
  tooltip: { theme: 'light' },
  responsive: [{ breakpoint: 768, options: { chart: { height: 250 } } }],
};

export const EXPENSE_CATEGORIES: readonly ExpenseCategory[] = [];
