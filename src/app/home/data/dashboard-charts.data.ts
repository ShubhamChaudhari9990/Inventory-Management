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
  { label: 'Available', value: 6, color: '#60a5fa' },
  { label: 'Occupied', value: 9, color: '#1d3e9f' },
  { label: 'Cleaning', value: 3, color: '#22c55e' },
  { label: 'Reserved', value: 3, color: '#94a3b8' },
  { label: 'Maintenance', value: 3, color: '#ef4444' },
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
