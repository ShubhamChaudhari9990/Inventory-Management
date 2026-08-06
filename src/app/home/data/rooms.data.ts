export type RoomStatus =
  | 'All'
  | 'Available'
  | 'Occupied'
  | 'Reserved'
  | 'Cleaning'
  | 'Maintenance';

export type RoomViewMode = 'grid' | 'list';

export interface RoomItem {
  id: string;
  number: string;
  floor: string;
  type: string;
  status: Exclude<RoomStatus, 'All'>;
  price: string;
  guestName?: string;
  guestDate?: string;
}

export const ROOM_STATUS_FILTERS: readonly RoomStatus[] = [
  'All',
  'Available',
  'Occupied',
  'Reserved',
  'Cleaning',
  'Maintenance',
] as const;

export const ROOM_VIEW_SUBTITLE = 'ROOMS.SUBTITLE';

export const ROOM_ITEMS: readonly RoomItem[] = [
  { id: '101', number: '101', floor: '1', type: 'AC', status: 'Available', price: '₹900' },
  {
    id: '102',
    number: '102',
    floor: '1',
    type: 'Non AC',
    status: 'Occupied',
    price: '₹1,350',
    guestName: 'Sneha Patil',
    guestDate: '27 Jul',
  },
  { id: '103', number: '103', floor: '1', type: 'Deluxe', status: 'Cleaning', price: '₹1,800' },
  {
    id: '104',
    number: '104',
    floor: '1',
    type: 'Suite',
    status: 'Reserved',
    price: '₹2,250',
    guestName: 'Pooja Kulkarni',
    guestDate: '29 Jul',
  },
  {
    id: '105',
    number: '105',
    floor: '1',
    type: 'Family',
    status: 'Occupied',
    price: '₹2,700',
    guestName: 'Nitin Shinde',
    guestDate: '27 Jul',
  },
  { id: '106', number: '106', floor: '1', type: 'AC', status: 'Available', price: '₹900' },
  { id: '107', number: '107', floor: '1', type: 'Non AC', status: 'Maintenance', price: '₹1,350' },
  {
    id: '108',
    number: '108',
    floor: '1',
    type: 'Deluxe',
    status: 'Occupied',
    price: '₹1,800',
    guestName: 'Anjali Pawar',
    guestDate: '27 Jul',
  },
  { id: '201', number: '201', floor: '2', type: 'Suite', status: 'Available', price: '₹2,250' },
  {
    id: '202',
    number: '202',
    floor: '2',
    type: 'Family',
    status: 'Occupied',
    price: '₹2,700',
    guestName: 'Sneha Patil',
    guestDate: '27 Jul',
  },
  { id: '203', number: '203', floor: '2', type: 'AC', status: 'Cleaning', price: '₹900' },
  {
    id: '204',
    number: '204',
    floor: '2',
    type: 'Non AC',
    status: 'Reserved',
    price: '₹1,350',
    guestName: 'Pooja Kulkarni',
    guestDate: '29 Jul',
  },
  {
    id: '205',
    number: '205',
    floor: '2',
    type: 'Deluxe',
    status: 'Occupied',
    price: '₹1,800',
    guestName: 'Nitin Shinde',
    guestDate: '27 Jul',
  },
  { id: '206', number: '206', floor: '2', type: 'Suite', status: 'Available', price: '₹2,250' },
  { id: '207', number: '207', floor: '2', type: 'Family', status: 'Maintenance', price: '₹2,700' },
  {
    id: '208',
    number: '208',
    floor: '2',
    type: 'AC',
    status: 'Occupied',
    price: '₹900',
    guestName: 'Anjali Pawar',
    guestDate: '27 Jul',
  },
  { id: '301', number: '301', floor: '3', type: 'Non AC', status: 'Available', price: '₹1,350' },
  {
    id: '302',
    number: '302',
    floor: '3',
    type: 'Deluxe',
    status: 'Occupied',
    price: '₹1,800',
    guestName: 'Sneha Patil',
    guestDate: '27 Jul',
  },
  { id: '303', number: '303', floor: '3', type: 'Suite', status: 'Cleaning', price: '₹2,250' },
  {
    id: '304',
    number: '304',
    floor: '3',
    type: 'Family',
    status: 'Reserved',
    price: '₹2,700',
    guestName: 'Pooja Kulkarni',
    guestDate: '29 Jul',
  },
  {
    id: '305',
    number: '305',
    floor: '3',
    type: 'AC',
    status: 'Occupied',
    price: '₹900',
    guestName: 'Nitin Shinde',
    guestDate: '27 Jul',
  },
  { id: '306', number: '306', floor: '3', type: 'Non AC', status: 'Available', price: '₹1,350' },
  { id: '307', number: '307', floor: '3', type: 'Deluxe', status: 'Maintenance', price: '₹1,800' },
  {
    id: '308',
    number: '308',
    floor: '3',
    type: 'Suite',
    status: 'Occupied',
    price: '₹2,250',
    guestName: 'Anjali Pawar',
    guestDate: '27 Jul',
  },
] as const;
