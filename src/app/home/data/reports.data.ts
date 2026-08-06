export interface ReportCard {
  id: string;
  titleKey: string;
  metaKey: string;
  icon: string;
}

export interface ProfitLossRow {
  id: string;
  labelKey: string;
  amount: string;
  tone?: 'success' | 'danger' | 'strong';
}

export const REPORTS_VIEW_SUBTITLE = 'REPORTS.SUBTITLE';

export const REPORT_CARDS: readonly ReportCard[] = [
  {
    id: 'revenue',
    titleKey: 'REPORTS.CARD.REVENUE',
    metaKey: 'REPORTS.CARD.META',
    icon: 'rupee',
  },
  {
    id: 'expenses',
    titleKey: 'REPORTS.CARD.EXPENSES',
    metaKey: 'REPORTS.CARD.META',
    icon: 'receipt-outline',
  },
  {
    id: 'inventory',
    titleKey: 'REPORTS.CARD.INVENTORY',
    metaKey: 'REPORTS.CARD.META',
    icon: 'package-open',
  },
  {
    id: 'rooms',
    titleKey: 'REPORTS.CARD.ROOMS',
    metaKey: 'REPORTS.CARD.META',
    icon: 'bed-outline',
  },
  {
    id: 'staff',
    titleKey: 'REPORTS.CARD.STAFF',
    metaKey: 'REPORTS.CARD.META',
    icon: 'person-outline',
  },
  {
    id: 'customers',
    titleKey: 'REPORTS.CARD.CUSTOMERS',
    metaKey: 'REPORTS.CARD.META',
    icon: 'people-outline',
  },
] as const;

export const PROFIT_LOSS_ROWS: readonly ProfitLossRow[] = [
  {
    id: 'revenue',
    labelKey: 'REPORTS.PNL.REVENUE',
    amount: '₹3,58,000',
    tone: 'success',
  },
  {
    id: 'expenses',
    labelKey: 'REPORTS.PNL.EXPENSES',
    amount: '− ₹1,71,000',
    tone: 'danger',
  },
  {
    id: 'profit',
    labelKey: 'REPORTS.PNL.PROFIT',
    amount: '₹1,87,000',
    tone: 'strong',
  },
] as const;
