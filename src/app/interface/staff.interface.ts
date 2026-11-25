import { PermissionKey } from './permission.interface';
import { AccountStatus } from './user.interface';

export type StaffRole = 'owner' | 'manager' | 'staff';

export type StaffDesignation =
  | 'Lodge Manager'
  | 'Receptionist'
  | 'Housekeeping'
  | 'Maintenance'
  | 'Accountant'
  | 'Guest Services'
  | 'Security'
  | 'Kitchen'
  | 'Other'
  | 'receptionist'
  | 'housekeeping'
  | 'maintenance'
  | 'manager'
  | string;

export type StaffAttendanceStatus = 'Present' | 'On Leave' | 'Off Duty';

export interface StaffMember {
  id: string;
  propertyId?: string;
  propertyIds?: string[];
  organizationId?: string;
  initials: string;
  name: string;
  email?: string;
  phone: string;
  address?: string;
  designation?: StaffDesignation;
  roleKey?: string;
  salary: string;
  numericSalary?: number;
  status: StaffAttendanceStatus;
  accountStatus?: AccountStatus;
  permissions?: PermissionKey[];
  assignedRooms?: string[];
  shift?: string;
  joiningDate?: string;
  profileImageUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface StaffFormData {
  fullName: string;
  email: string;
  phone: string;
  address?: string;
  designation: StaffDesignation;
  propertyId: string;
  propertyIds?: string[];
  salary?: string;
  joiningDate?: string;
  permissions: PermissionKey[];
  accountStatus: AccountStatus;
}
