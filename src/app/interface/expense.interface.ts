export type ExpenseCategoryType =
  | 'Rent'
  | 'Electricity'
  | 'Water'
  | 'Internet'
  | 'Staff Salary'
  | 'Maintenance'
  | 'Cleaning'
  | 'Inventory Purchases'
  | 'Food'
  | 'Marketing'
  | 'Other';

export type ExpensePaymentMethod =
  | 'Cash'
  | 'UPI'
  | 'Bank Transfer'
  | 'Credit Card'
  | 'Debit Card'
  | 'Cheque'
  | 'Other';

export interface ExpenseItem {
  id: string;
  propertyId: string;
  propertyName?: string;
  title: string;
  category: ExpenseCategoryType | string;
  amount: string;
  numericAmount: number;
  expenseDate: string;
  paymentMethod: ExpensePaymentMethod;
  vendor?: string;
  description?: string;
  receiptUrl?: string;
  receiptName?: string;
  createdById?: string;
  createdByName?: string;
  createdAt: string;
  updatedAt?: string;
  isReversed?: boolean;
  reversalReason?: string;
}

export interface ExpenseCategory {
  id: string;
  propertyId?: string;
  name?: string;
  nameKey?: string;
  amount: string;
  fillPercent?: number;
  percent?: string;
  count?: string;
  icon?: string;
  tone?: 'primary' | 'warm' | 'success' | 'muted';
  date?: string;
}

export interface ExpenseFormData {
  propertyId: string;
  title: string;
  category: ExpenseCategoryType | string;
  amount: number;
  expenseDate: string;
  paymentMethod: ExpensePaymentMethod;
  vendor?: string;
  description?: string;
  receiptUrl?: string;
}
