export type PropertyStatus = 'active' | 'inactive' | 'maintenance';

export interface Property {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  tagline?: string;
  address?: string;
  city?: string;
  state?: string;
  phone?: string;
  email?: string;
  totalRooms: number;
  status: PropertyStatus;
  amenities?: string[];
  imageUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PropertyStatistics {
  propertyId: string;
  propertyName: string;
  totalRooms: number;
  availableRooms: number;
  occupiedRooms: number;
  reservedRooms: number;
  maintenanceRooms: number;
  occupancyRate: number;
  totalBookings: number;
  todayArrivals: number;
  todayDepartures: number;
  revenue: number;
  expenses: number;
  pendingHousekeeping: number;
  pendingMaintenance: number;
}

export type PropertyFilter = 'all' | string;
