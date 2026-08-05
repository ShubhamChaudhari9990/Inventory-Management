import { DashboardKpi } from './dashboard.data';
import {
  AxisChartOptions,
  DonutChartOptions,
} from './dashboard-charts.data';

export type RevenuePeriod = 'today' | 'week' | 'month' | 'year';

export interface RevenuePayment {
  id: string;
  guest: string;
  method: string;
  time: string;
  amount: string;
}

export const REVENUE_PERIODS: readonly RevenuePeriod[] = [
  'today',
  'week',
  'month',
  'year',
] as const;

export const REVENUE_PERIOD_LABEL_KEYS: Readonly<Record<RevenuePeriod, string>> = {
  today: 'REVENUE.PERIOD.TODAY',
  week: 'REVENUE.PERIOD.WEEK',
  month: 'REVENUE.PERIOD.MONTH',
  year: 'REVENUE.PERIOD.YEAR',
};

export const REVENUE_SUBTITLE_KEYS: Readonly<Record<RevenuePeriod, string>> = {
  today: 'REVENUE.SUBTITLE.TODAY',
  week: 'REVENUE.SUBTITLE.WEEK',
  month: 'REVENUE.SUBTITLE.MONTH',
  year: 'REVENUE.SUBTITLE.YEAR',
};

export const REVENUE_KPIS: readonly DashboardKpi[] = [
  {
    id: 'cash',
    label: 'REVENUE.KPI.CASH',
    value: '₹1,48,000',
    icon: 'wallet-outline',
    tone: 'primary',
  },
  {
    id: 'upi',
    label: 'REVENUE.KPI.UPI',
    value: '₹1,32,000',
    icon: 'phone-portrait-outline',
    tone: 'primary',
  },
  {
    id: 'card',
    label: 'REVENUE.KPI.CARD',
    value: '₹52,000',
    icon: 'card-outline',
    tone: 'primary',
  },
  {
    id: 'bank',
    label: 'REVENUE.KPI.BANK',
    value: '₹26,000',
    icon: 'cash-outline',
    tone: 'primary',
  },
] as const;

const AXIS_LABEL_STYLE = { colors: '#6b7280', fontSize: '12px' } as const;
const LIGHT_TOOLTIP = { theme: 'light' as const };

export const REVENUE_MONTHLY_CHART: AxisChartOptions = {
  series: [{ name: 'Revenue', data: [220, 248, 291, 335, 303, 360] }],
  chart: {
    type: 'area',
    height: 280,
    toolbar: { show: false },
    fontFamily: 'var(--font-sans)',
    parentHeightOffset: 0,
  },
  colors: ['#16a34a'],
  dataLabels: { enabled: false },
  stroke: { curve: 'smooth', width: 2.5 },
  fill: {
    type: 'gradient',
    gradient: {
      shadeIntensity: 1,
      opacityFrom: 0.35,
      opacityTo: 0,
      stops: [0, 100],
    },
  },
  grid: { borderColor: '#e5e7eb', strokeDashArray: 0 },
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
  plotOptions: {},
  tooltip: LIGHT_TOOLTIP,
  markers: { size: 0 },
  responsive: [{ breakpoint: 768, options: { chart: { height: 250 } } }],
};

export const REVENUE_METHODS_CHART: DonutChartOptions = {
  series: [148, 132, 52, 26],
  chart: {
    type: 'donut',
    height: 240,
    toolbar: { show: false },
    fontFamily: 'var(--font-sans)',
  },
  labels: ['Cash', 'UPI', 'Card', 'Bank Transfer'],
  colors: ['#1d3e9f', '#16a34a', '#f59e0b', '#64748b'],
  stroke: { colors: ['#ffffff'], width: 2 },
  legend: { show: false },
  dataLabels: { enabled: false },
  plotOptions: {
    pie: {
      donut: { size: '62%' },
    },
  },
  tooltip: LIGHT_TOOLTIP,
  responsive: [{ breakpoint: 768, options: { chart: { height: 220 } } }],
};

export const REVENUE_RECENT_PAYMENTS: readonly RevenuePayment[] = [
  {
    id: 'p1',
    guest: 'Rahul Deshmukh',
    method: 'UPI',
    time: '10:24 AM',
    amount: '₹1,800',
  },
  {
    id: 'p2',
    guest: 'Amit Joshi',
    method: 'Cash',
    time: '09:50 AM',
    amount: '₹2,250',
  },
  {
    id: 'p3',
    guest: 'Sneha Patil',
    method: 'Card',
    time: '09:12 AM',
    amount: '₹2,000',
  },
  {
    id: 'p4',
    guest: 'Nitin Shinde',
    method: 'Bank Transfer',
    time: '08:40 AM',
    amount: '₹3,600',
  },
] as const;
