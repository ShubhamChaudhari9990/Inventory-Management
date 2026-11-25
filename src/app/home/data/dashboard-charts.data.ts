import {
  ApexAxisChartSeries,
  ApexChart,
  ApexDataLabels,
  ApexFill,
  ApexGrid,
  ApexLegend,
  ApexMarkers,
  ApexNonAxisChartSeries,
  ApexPlotOptions,
  ApexResponsive,
  ApexStroke,
  ApexTooltip,
  ApexXAxis,
  ApexYAxis,
} from 'ng-apexcharts';

import { PaymentRecord } from '../../interface/payment.interface';
import { ExpenseItem } from '../../interface/expense.interface';
import { ExtendedBookingItem } from '../../interface/booking.interface';
import { RoomItem } from '../../interface/room.interface';

export type AxisChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  colors: string[];
  dataLabels: ApexDataLabels;
  stroke: ApexStroke;
  grid: ApexGrid;
  xaxis: ApexXAxis;
  yaxis: ApexYAxis | ApexYAxis[];
  legend: ApexLegend;
  plotOptions: ApexPlotOptions;
  tooltip: ApexTooltip;
  fill: ApexFill;
  markers: ApexMarkers;
  responsive: ApexResponsive[];
};

export type DonutChartOptions = {
  series: ApexNonAxisChartSeries;
  chart: ApexChart;
  labels: string[];
  colors: string[];
  stroke: ApexStroke;
  legend: ApexLegend;
  dataLabels: ApexDataLabels;
  plotOptions: ApexPlotOptions;
  tooltip: ApexTooltip;
  responsive?: ApexResponsive[];
};

export type RoomStatusLegendItem = {
  label: string;
  value: number;
  color: string;
};

const AXIS_LABEL_STYLE = { colors: '#6b7280', fontSize: '12px' } as const;
const CHART_GRID: ApexGrid = { borderColor: '#e5e7eb', strokeDashArray: 0 };
const LIGHT_TOOLTIP: ApexTooltip = { theme: 'light' };
const HIDDEN_DATA_LABELS: ApexDataLabels = { enabled: false };

const baseAxisChart = (overrides: Partial<ApexChart> & Pick<ApexChart, 'type' | 'height'>): ApexChart => ({
  toolbar: { show: false },
  zoom: { enabled: false, allowMouseWheelZoom: false },
  fontFamily: 'var(--font-sans)',
  parentHeightOffset: 0,
  ...overrides,
});

const plainXaxis = (categories: string[]): ApexXAxis => ({
  categories,
  axisBorder: { show: false },
  axisTicks: { show: false },
  labels: { style: { ...AXIS_LABEL_STYLE } },
});

const yaxisWithFormatter = (
  formatter: (value: number) => string,
  min: number,
  max: number,
): ApexYAxis => ({
  labels: {
    style: { ...AXIS_LABEL_STYLE },
    formatter: (value) => formatter(value),
  },
  min,
  max,
  tickAmount: 4,
});

/** Single source for room-status chart + legend. */
export const ROOM_STATUS_LEGEND: readonly RoomStatusLegendItem[] = [
  { label: 'STATUS.AVAILABLE', value: 6, color: '#60a5fa' },
  { label: 'STATUS.OCCUPIED', value: 9, color: '#1d3e9f' },
  { label: 'STATUS.CLEANING', value: 3, color: '#22c55e' },
  { label: 'STATUS.RESERVED', value: 3, color: '#94a3b8' },
  { label: 'STATUS.MAINTENANCE', value: 3, color: '#ef4444' },
] as const;

export const REVENUE_EXPENSE_CHART: AxisChartOptions = {
  series: [
    { name: 'Revenue', data: [220, 248, 291, 335, 303, 360] },
    { name: 'Expense', data: [132, 141, 153, 168, 159, 171] },
  ],
  chart: baseAxisChart({ type: 'bar', height: 270 }),
  colors: ['#1d3e9f', '#f59e0b'],
  dataLabels: HIDDEN_DATA_LABELS,
  stroke: {
    show: true,
    width: 4,
    colors: ['transparent'],
  },
  grid: {
    borderColor: '#e5e7eb',
    strokeDashArray: 0,
    padding: { top: 18, right: 6, bottom: 0, left: 6 },
  },
  plotOptions: {
    bar: {
      columnWidth: '85%',
      borderRadius: 7,
      borderRadiusApplication: 'end',
      borderRadiusWhenStacked: 'last',
    },
  },
  xaxis: plainXaxis(['Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul']),
  yaxis: {
    ...yaxisWithFormatter((value) => `${Math.round(value)}k`, 0, 360),
    forceNiceScale: false,
  },
  legend: { show: false },
  fill: { opacity: 1 },
  markers: { size: 0 },
  tooltip: LIGHT_TOOLTIP,
  responsive: [{ breakpoint: 768, options: { chart: { height: 250 } } }],
};

export const ROOM_STATUS_CHART: DonutChartOptions = {
  series: ROOM_STATUS_LEGEND.map((item) => item.value),
  chart: {
    type: 'donut',
    height: 260,
    toolbar: { show: false },
    zoom: { enabled: false, allowMouseWheelZoom: false },
    fontFamily: 'var(--font-sans)',
  },
  labels: ROOM_STATUS_LEGEND.map((item) => item.label),
  colors: ROOM_STATUS_LEGEND.map((item) => item.color),
  stroke: { colors: ['#ffffff'], width: 2 },
  legend: { show: false },
  dataLabels: HIDDEN_DATA_LABELS,
  plotOptions: {
    pie: {
      donut: {
        size: '58%',
      },
    },
  },
  tooltip: LIGHT_TOOLTIP,
  responsive: [{ breakpoint: 768, options: { chart: { height: 240 } } }],
};

export const MONTHLY_REVENUE_CHART: AxisChartOptions = {
  series: [{ name: 'Revenue', data: [210, 228, 255, 290, 262, 305] }],
  chart: baseAxisChart({ type: 'area', height: 220 }),
  colors: ['#1d3e9f'],
  dataLabels: HIDDEN_DATA_LABELS,
  stroke: { curve: 'smooth', width: 3 },
  fill: {
    type: 'gradient',
    gradient: {
      shadeIntensity: 1,
      opacityFrom: 0.25,
      opacityTo: 0,
      stops: [0, 100],
    },
  },
  grid: CHART_GRID,
  xaxis: plainXaxis(['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug']),
  yaxis: yaxisWithFormatter((value) => `${Math.round(value)}k`, 180, 320),
  legend: { show: false },
  plotOptions: {},
  tooltip: LIGHT_TOOLTIP,
  markers: { size: 0 },
  responsive: [],
};

export const OCCUPANCY_RATE_CHART: AxisChartOptions = {
  series: [{ name: 'Occupancy', data: [62, 71, 68, 80, 88, 94, 85] }],
  chart: baseAxisChart({ type: 'line', height: 220 }),
  colors: ['#60a5fa'],
  dataLabels: HIDDEN_DATA_LABELS,
  stroke: { curve: 'smooth', width: 3 },
  markers: { size: 4, colors: ['#ffffff'], strokeColors: '#60a5fa', strokeWidth: 3 },
  grid: CHART_GRID,
  xaxis: plainXaxis(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']),
  yaxis: yaxisWithFormatter((value) => `${Math.round(value)}%`, 0, 100),
  legend: { show: false },
  plotOptions: {},
  tooltip: LIGHT_TOOLTIP,
  fill: { opacity: 1 },
  responsive: [],
};

export const BOOKING_TREND_CHART: AxisChartOptions = {
  series: [
    { name: 'Direct', data: [8, 12, 10, 14, 18, 22, 16] },
    { name: 'OTA', data: [4, 6, 2, 8, 10, 12, 6] },
    { name: 'Walk-in', data: [6, 4, 8, 10, 12, 16, 10] },
  ],
  chart: baseAxisChart({ type: 'bar', height: 250, stacked: true }),
  colors: ['#1d3e9f', '#22c55e', '#f59e0b'],
  dataLabels: HIDDEN_DATA_LABELS,
  stroke: { show: false },
  grid: {
    borderColor: '#e5e7eb',
    strokeDashArray: 0,
    padding: { top: 16, right: 4, bottom: 0, left: 4 },
  },
  plotOptions: {
    bar: {
      columnWidth: '72%',
      borderRadius: 8,
      borderRadiusApplication: 'end',
      borderRadiusWhenStacked: 'last',
    },
  },
  xaxis: plainXaxis(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']),
  yaxis: {
    show: false,
    min: 0,
    max: 58,
    tickAmount: 4,
    labels: { show: false },
    forceNiceScale: false,
  },
  legend: { show: false },
  fill: { opacity: 1 },
  markers: { size: 0 },
  tooltip: LIGHT_TOOLTIP,
  responsive: [],
};

/**
 * Dynamically computes a 6-month Revenue vs Expense comparison chart from live Firestore records.
 */
export function buildDynamicRevenueExpenseChart(
  payments: PaymentRecord[],
  expenses: ExpenseItem[],
): AxisChartOptions {
  const now = new Date();
  const months: { label: string; yearMonth: string; revenue: number; expense: number }[] = [];

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = d.toLocaleString('en-US', { month: 'short' });
    const yearMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    months.push({ label, yearMonth, revenue: 0, expense: 0 });
  }

  // Aggregate payments (Revenue)
  for (const p of payments) {
    if (p.status === 'Paid') {
      const dateStr = p.createdAt || '';
      for (const m of months) {
        if (dateStr.startsWith(m.yearMonth)) {
          m.revenue += p.numericAmount || 0;
          break;
        }
      }
    }
  }

  // Aggregate active expenses
  for (const e of expenses) {
    if (!e.isReversed) {
      const dateStr = e.expenseDate || e.createdAt || '';
      for (const m of months) {
        if (dateStr.startsWith(m.yearMonth)) {
          m.expense += e.numericAmount || 0;
          break;
        }
      }
    }
  }

  const maxVal = Math.max(
    ...months.map((m) => m.revenue),
    ...months.map((m) => m.expense),
    1000,
  );

  return {
    ...REVENUE_EXPENSE_CHART,
    series: [
      { name: 'Revenue', data: months.map((m) => Math.round(m.revenue)) },
      { name: 'Expense', data: months.map((m) => Math.round(m.expense)) },
    ],
    xaxis: plainXaxis(months.map((m) => m.label)),
    yaxis: {
      ...yaxisWithFormatter(
        (value) => {
          if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
          if (value >= 1000) return `₹${Math.round(value / 1000)}k`;
          return `₹${Math.round(value)}`;
        },
        0,
        Math.ceil(maxVal * 1.15),
      ),
      forceNiceScale: true,
    },
  };
}

/**
 * Dynamically computes a 6-month Revenue area chart from live Firestore payments.
 */
export function buildDynamicMonthlyRevenueChart(
  payments: PaymentRecord[],
): AxisChartOptions {
  const now = new Date();
  const months: { label: string; yearMonth: string; revenue: number }[] = [];

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = d.toLocaleString('en-US', { month: 'short' });
    const yearMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    months.push({ label, yearMonth, revenue: 0 });
  }

  for (const p of payments) {
    if (p.status === 'Paid') {
      const dateStr = p.createdAt || '';
      for (const m of months) {
        if (dateStr.startsWith(m.yearMonth)) {
          m.revenue += p.numericAmount || 0;
          break;
        }
      }
    }
  }

  const maxVal = Math.max(...months.map((m) => m.revenue), 1000);

  return {
    ...MONTHLY_REVENUE_CHART,
    series: [{ name: 'Revenue', data: months.map((m) => Math.round(m.revenue)) }],
    xaxis: plainXaxis(months.map((m) => m.label)),
    yaxis: {
      ...yaxisWithFormatter(
        (value) => {
          if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
          if (value >= 1000) return `₹${Math.round(value / 1000)}k`;
          return `₹${Math.round(value)}`;
        },
        0,
        Math.ceil(maxVal * 1.15),
      ),
      forceNiceScale: true,
    },
  };
}

/**
 * Dynamically computes a 7-day Occupancy Rate line chart from live rooms & reservations.
 */
export function buildDynamicOccupancyRateChart(
  rooms: RoomItem[],
  bookings: ExtendedBookingItem[],
): AxisChartOptions {
  const now = new Date();
  const days: { label: string; dateStr: string; rate: number }[] = [];
  const totalRooms = rooms.length;

  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const label = d.toLocaleString('en-US', { weekday: 'short' });
    const dateStr = d.toISOString().slice(0, 10);
    days.push({ label, dateStr, rate: 0 });
  }

  for (const day of days) {
    if (totalRooms === 0) {
      day.rate = 0;
      continue;
    }
    const occupiedOnDay = bookings.filter((b) => {
      if (b.status === 'Cancelled') return false;
      const start = b.checkIn || '';
      const end = b.checkOut || start;
      return day.dateStr >= start && day.dateStr <= end;
    }).length;

    day.rate = Math.min(100, Math.round((occupiedOnDay / totalRooms) * 100));
  }

  return {
    ...OCCUPANCY_RATE_CHART,
    series: [{ name: 'Occupancy', data: days.map((d) => d.rate) }],
    xaxis: plainXaxis(days.map((d) => d.label)),
    yaxis: yaxisWithFormatter((val) => `${Math.round(val)}%`, 0, 100),
  };
}

/**
 * Dynamically computes a 7-day Booking Trend stacked bar chart from live reservations.
 */
export function buildDynamicBookingTrendChart(
  bookings: ExtendedBookingItem[],
): AxisChartOptions {
  const now = new Date();
  const days: { label: string; dateStr: string; direct: number; ota: number; walkIn: number }[] = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const label = d.toLocaleString('en-US', { weekday: 'short' });
    const dateStr = d.toISOString().slice(0, 10);
    days.push({ label, dateStr, direct: 0, ota: 0, walkIn: 0 });
  }

  for (const b of bookings) {
    if (b.status === 'Cancelled') continue;
    const bDate = (b.createdAt || b.checkIn || '').slice(0, 10);
    for (const day of days) {
      if (bDate === day.dateStr) {
        const ch = (b.channel || '').toLowerCase();
        if (ch.includes('ota') || ch.includes('booking') || ch.includes('agoda') || ch.includes('makemytrip')) {
          day.ota++;
        } else if (ch.includes('walk') || ch.includes('phone')) {
          day.walkIn++;
        } else {
          day.direct++;
        }
        break;
      }
    }
  }

  const maxTotal = Math.max(
    ...days.map((d) => d.direct + d.ota + d.walkIn),
    5,
  );

  return {
    ...BOOKING_TREND_CHART,
    series: [
      { name: 'Direct', data: days.map((d) => d.direct) },
      { name: 'OTA', data: days.map((d) => d.ota) },
      { name: 'Walk-in', data: days.map((d) => d.walkIn) },
    ],
    xaxis: plainXaxis(days.map((d) => d.label)),
    yaxis: {
      show: true,
      min: 0,
      max: Math.ceil(maxTotal * 1.2),
      tickAmount: 4,
      labels: {
        style: { colors: '#6b7280', fontSize: '12px' },
        formatter: (val) => String(Math.round(val)),
      },
      forceNiceScale: true,
    },
  };
}

/**
 * Dynamically computes room status legend items matching live room counts.
 */
export function buildDynamicRoomStatusLegend(rooms: RoomItem[]): RoomStatusLegendItem[] {
  const available = rooms.filter((r) => r.status === 'Available').length;
  const occupied = rooms.filter((r) => r.status === 'Occupied').length;
  const cleaning = rooms.filter((r) => r.status === 'Cleaning').length;
  const reserved = rooms.filter((r) => r.status === 'Reserved').length;
  const maintenance = rooms.filter((r) => r.status === 'Maintenance').length;

  return [
    { label: 'STATUS.AVAILABLE', value: available, color: '#60a5fa' },
    { label: 'STATUS.OCCUPIED', value: occupied, color: '#1d3e9f' },
    { label: 'STATUS.CLEANING', value: cleaning, color: '#22c55e' },
    { label: 'STATUS.RESERVED', value: reserved, color: '#94a3b8' },
    { label: 'STATUS.MAINTENANCE', value: maintenance, color: '#ef4444' },
  ];
}

