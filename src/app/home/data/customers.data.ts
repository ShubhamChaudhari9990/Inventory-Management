export type CustomerPaymentStatus = 'Paid' | 'Due';
export type CustomerIdType = 'Aadhaar' | 'PAN' | 'Passport';

export interface CustomerItem {
  id: string;
  initials: string;
  name: string;
  phone: string;
  city: string;
  status: CustomerPaymentStatus;
  visits: number;
  due: string;
  idType: CustomerIdType;
  idNumber: string;
}

export const CUSTOMER_VIEW_SUBTITLE = 'CUSTOMERS.SUBTITLE';

export const CUSTOMER_ITEMS: readonly CustomerItem[] = [
  {
    id: 'c1',
    initials: 'RD',
    name: 'Rahul Deshmukh',
    phone: '98220 11223',
    city: 'Pune',
    status: 'Paid',
    visits: 7,
    due: '₹0',
    idType: 'Aadhaar',
    idNumber: 'XXXX XXXX 4412',
  },
  {
    id: 'c2',
    initials: 'SP',
    name: 'Sneha Patil',
    phone: '90280 44561',
    city: 'Kolhapur',
    status: 'Due',
    visits: 3,
    due: '₹3,400',
    idType: 'PAN',
    idNumber: 'ABCPP1234K',
  },
  {
    id: 'c3',
    initials: 'AJ',
    name: 'Amit Joshi',
    phone: '70301 98120',
    city: 'Nashik',
    status: 'Paid',
    visits: 12,
    due: '₹0',
    idType: 'Aadhaar',
    idNumber: 'XXXX XXXX 8890',
  },
  {
    id: 'c4',
    initials: 'PK',
    name: 'Pooja Kulkarni',
    phone: '88881 23409',
    city: 'Satara',
    status: 'Due',
    visits: 1,
    due: '₹1,350',
    idType: 'Aadhaar',
    idNumber: 'XXXX XXXX 2231',
  },
  {
    id: 'c5',
    initials: 'NS',
    name: 'Nitin Shinde',
    phone: '97655 30021',
    city: 'Solapur',
    status: 'Paid',
    visits: 5,
    due: '₹0',
    idType: 'Passport',
    idNumber: 'M4482119',
  },
  {
    id: 'c6',
    initials: 'KM',
    name: 'Kiran More',
    phone: '93711 55620',
    city: 'Sangli',
    status: 'Due',
    visits: 2,
    due: '₹3,000',
    idType: 'Aadhaar',
    idNumber: 'XXXX XXXX 6673',
  },
] as const;
