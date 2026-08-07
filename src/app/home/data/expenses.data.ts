import { DashboardKpi } from './dashboard.data';
import { AxisChartOptions } from './dashboard-charts.data';

export interface ExpenseCategory {
  id: string;
  nameKey: string;
  amount: string;
  fillPercent: number;
}

export const EXPENSES_SUBTITLE = 'EXPENSES.SUBTITLE';

export const EXPENSE_KPIS: readonly DashboardKpi[] = [
  {
    id: 'today',
    label: 'EXPENSES.KPI.TODAY',
    value: '₹15,320',
    icon: 'receipt-outline',
    tone: 'danger',
  },
  {
    id: 'month',
    label: 'EXPENSES.KPI.MONTH',
    value: '₹1,71,200',
    icon: 'trending-down-outline',
    tone: 'warm',
  },
  {
    id: 'revenue',
    label: 'EXPENSES.KPI.REVENUE',
    value: '₹3,58,000',
    icon: 'trending-up-outline',
    tone: 'success',
  },
  {
    id: 'pnl',
    label: 'EXPENSES.KPI.PNL',
    value: '₹1,86,800',
    icon: 'trending-up-outline',
    tone: 'primary',
  },
] as const;

const AXIS_LABEL_STYLE = { colors: '#6b7280', fontSize: '12px' } as const;

export const EXPENSE_REVENUE_CHART: AxisChartOptions = {
  series: [
    { name: 'Revenue', data: [220, 248, 291, 335, 303, 360] },
    { name: 'Expense', data: [132, 141, 153, 168, 159, 171] },
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
    max: 360,
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

export const EXPENSE_CATEGORIES: readonly ExpenseCategory[] = [
  {
    id: 'electricity',
    nameKey: 'EXPENSES.CATEGORY.ELECTRICITY',
    amount: '₹18,400',
    fillPercent: 11,
  },
  {
    id: 'water',
    nameKey: 'EXPENSES.CATEGORY.WATER',
    amount: '₹6,200',
    fillPercent: 4,
  },
  {
    id: 'salary',
    nameKey: 'EXPENSES.CATEGORY.SALARY',
    amount: '₹1,02,500',
    fillPercent: 60,
  },
  {
    id: 'laundry',
    nameKey: 'EXPENSES.CATEGORY.LAUNDRY',
    amount: '₹14,300',
    fillPercent: 8,
  },
  {
    id: 'cleaning',
    nameKey: 'EXPENSES.CATEGORY.CLEANING',
    amount: '₹9,100',
    fillPercent: 5,
  },
  {
    id: 'repair',
    nameKey: 'EXPENSES.CATEGORY.REPAIR',
    amount: '₹11,800',
    fillPercent: 7,
  },
  {
    id: 'food',
    nameKey: 'EXPENSES.CATEGORY.FOOD',
    amount: '₹8,900',
    fillPercent: 5,
  },
] as const;
