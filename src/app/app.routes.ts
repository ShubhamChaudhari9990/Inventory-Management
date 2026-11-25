import { Routes } from '@angular/router';
import { authGuard, guestGuard, initialRouteGuard } from './guards/auth.guard';
import {
  ownerGuard,
  managerGuard,
  staffGuard,
  roleGuard,
  roleDashboardRedirectGuard,
  pendingApprovalGuard,
  unsavedChangesGuard,
} from './guards/role.guard';

export const routes: Routes = [
  {
    path: '',
    canActivate: [initialRouteGuard],
    children: [],
  },
  {
    path: 'pending-approval',
    canActivate: [authGuard, pendingApprovalGuard],
    loadComponent: () =>
      import('./pending-approval/pending-approval.page').then(
        (m) => m.PendingApprovalPage,
      ),
  },
  {
    path: 'language-selection',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./language-selection/language-selection.page').then(
        (m) => m.LanguageSelectionPage,
      ),
  },
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./login/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'register',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./register/register.page').then((m) => m.RegisterPage),
  },
  {
    path: 'forgot-password',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./forgot-password/forgot-password.page').then(
        (m) => m.ForgotPasswordPage,
      ),
  },
  {
    path: 'owner/dashboard',
    canActivate: [authGuard, ownerGuard],
    loadComponent: () =>
      import('./owner/owner-dashboard/owner-dashboard.page').then(
        (m) => m.OwnerDashboardPage,
      ),
  },
  {
    path: 'manager/dashboard',
    canActivate: [authGuard, managerGuard],
    loadComponent: () =>
      import('./manager/manager-dashboard/manager-dashboard.page').then(
        (m) => m.ManagerDashboardPage,
      ),
  },
  {
    path: 'staff/dashboard',
    canActivate: [authGuard, staffGuard],
    loadComponent: () =>
      import('./staff/staff-dashboard/staff-dashboard.page').then(
        (m) => m.StaffDashboardPage,
      ),
  },
  {
    path: 'lodges',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['owner', 'manager', 'staff'] },
    loadComponent: () =>
      import('./lodges/lodges-list/lodges-list.page').then(
        (m) => m.LodgesListPage,
      ),
  },
  {
    path: 'lodges/add',
    canActivate: [authGuard, ownerGuard],
    canDeactivate: [unsavedChangesGuard],
    loadComponent: () =>
      import('./lodges/lodge-form/lodge-form.page').then(
        (m) => m.LodgeFormPage,
      ),
  },
  {
    path: 'lodges/:lodgeId',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['owner', 'manager', 'staff'] },
    loadComponent: () =>
      import('./lodges/lodge-details/lodge-details.page').then(
        (m) => m.LodgeDetailsPage,
      ),
  },
  {
    path: 'lodges/:lodgeId/edit',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['owner', 'manager'] },
    canDeactivate: [unsavedChangesGuard],
    loadComponent: () =>
      import('./lodges/lodge-form/lodge-form.page').then(
        (m) => m.LodgeFormPage,
      ),
  },
  {
    path: 'lodges/:lodgeId/settings',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['owner', 'manager'] },
    loadComponent: () =>
      import('./lodges/lodge-settings/lodge-settings.page').then(
        (m) => m.LodgeSettingsPage,
      ),
  },
  {
    path: 'lodges/:lodgeId/gallery',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['owner', 'manager'] },
    loadComponent: () =>
      import('./lodges/lodge-gallery/lodge-gallery.page').then(
        (m) => m.LodgeGalleryPage,
      ),
  },
  {
    path: 'lodges/:lodgeId/facilities',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['owner', 'manager'] },
    loadComponent: () =>
      import('./lodges/lodge-facilities/lodge-facilities.page').then(
        (m) => m.LodgeFacilitiesPage,
      ),
  },
  {
    path: 'lodges/:lodgeId/documents',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['owner', 'manager'] },
    loadComponent: () =>
      import('./lodges/lodge-documents/lodge-documents.page').then(
        (m) => m.LodgeDocumentsPage,
      ),
  },
  {
    path: 'rooms',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['owner', 'manager', 'staff'] },
    loadComponent: () =>
      import('./rooms/rooms-dashboard/rooms-dashboard.page').then(
        (m) => m.RoomsDashboardListPage,
      ),
  },
  {
    path: 'rooms/add',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['owner', 'manager'] },
    canDeactivate: [unsavedChangesGuard],
    loadComponent: () =>
      import('./rooms/room-form/room-form.page').then(
        (m) => m.RoomFormPage,
      ),
  },
  {
    path: 'rooms/:roomId',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['owner', 'manager', 'staff'] },
    loadComponent: () =>
      import('./rooms/room-details/room-details.page').then(
        (m) => m.RoomDetailsPage,
      ),
  },
  {
    path: 'rooms/:roomId/edit',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['owner', 'manager'] },
    canDeactivate: [unsavedChangesGuard],
    loadComponent: () =>
      import('./rooms/room-form/room-form.page').then(
        (m) => m.RoomFormPage,
      ),
  },
  {
    path: 'floors',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['owner', 'manager'] },
    loadComponent: () =>
      import('./rooms/floors/floors.page').then((m) => m.FloorsPage),
  },
  {
    path: 'room-types',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['owner', 'manager'] },
    loadComponent: () =>
      import('./rooms/room-types/room-types.page').then(
        (m) => m.RoomTypesPage,
      ),
  },
  {
    path: 'room-amenities',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['owner', 'manager', 'staff'] },
    loadComponent: () =>
      import('./rooms/room-amenities/room-amenities.page').then(
        (m) => m.RoomAmenitiesPage,
      ),
  },
  {
    path: 'room-pricing',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['owner', 'manager'] },
    loadComponent: () =>
      import('./rooms/room-pricing/room-pricing.page').then(
        (m) => m.RoomPricingPage,
      ),
  },
  {
    path: 'customers',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['owner', 'manager', 'staff'] },
    loadComponent: () =>
      import('./customers/customers-list/customers-list.page').then(
        (m) => m.CustomersListPage,
      ),
  },
  {
    path: 'customers/new',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['owner', 'manager', 'staff'] },
    canDeactivate: [unsavedChangesGuard],
    loadComponent: () =>
      import('./customers/customer-form/customer-form.page').then(
        (m) => m.CustomerFormPage,
      ),
  },
  {
    path: 'customers/:customerId',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['owner', 'manager', 'staff'] },
    loadComponent: () =>
      import('./customers/customer-profile/customer-profile.page').then(
        (m) => m.CustomerProfilePage,
      ),
  },
  {
    path: 'customers/:customerId/edit',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['owner', 'manager', 'staff'] },
    canDeactivate: [unsavedChangesGuard],
    loadComponent: () =>
      import('./customers/customer-form/customer-form.page').then(
        (m) => m.CustomerFormPage,
      ),
  },
  {
    path: 'payments',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['owner', 'manager', 'staff'] },
    loadComponent: () =>
      import('./payments/payments-dashboard/payments-dashboard.page').then(
        (m) => m.PaymentsDashboardPage,
      ),
  },
  {
    path: 'payments/transactions',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['owner', 'manager', 'staff'] },
    loadComponent: () =>
      import('./payments/transactions/transactions.page').then(
        (m) => m.TransactionsPage,
      ),
  },
  {
    path: 'payments/collect',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['owner', 'manager', 'staff'] },
    loadComponent: () =>
      import('./payments/collect-payment/collect-payment.page').then(
        (m) => m.CollectPaymentPage,
      ),
  },
  {
    path: 'payments/invoices',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['owner', 'manager', 'staff'] },
    loadComponent: () =>
      import('./payments/invoices/invoices.page').then((m) => m.InvoicesPage),
  },
  {
    path: 'payments/invoices/:invoiceId',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['owner', 'manager', 'staff'] },
    loadComponent: () =>
      import('./payments/invoices/invoices.page').then((m) => m.InvoicesPage),
  },
  {
    path: 'payments/refunds',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['owner', 'manager'] },
    loadComponent: () =>
      import('./payments/refunds/refunds.page').then((m) => m.RefundsPage),
  },
  {
    path: 'payments/reports',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['owner', 'manager'] },
    loadComponent: () =>
      import('./payments/payment-reports/payment-reports.page').then(
        (m) => m.PaymentReportsPage,
      ),
  },
  {
    path: 'staff',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['owner', 'manager'] },
    loadComponent: () =>
      import('./staff/staff-hub/staff-hub.page').then(
        (m) => m.StaffManagementDashboardPage,
      ),
  },
  {
    path: 'staff/employees',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['owner', 'manager'] },
    loadComponent: () =>
      import('./staff/employee-directory/employee-directory.page').then(
        (m) => m.EmployeeDirectoryPage,
      ),
  },
  {
    path: 'staff/employees/new',
    canActivate: [authGuard, ownerGuard],
    canDeactivate: [unsavedChangesGuard],
    loadComponent: () =>
      import('./staff/employee-form/employee-form.page').then(
        (m) => m.EmployeeFormPage,
      ),
  },
  {
    path: 'staff/employees/:employeeId',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['owner', 'manager'] },
    loadComponent: () =>
      import('./staff/employee-profile/employee-profile.page').then(
        (m) => m.EmployeeProfilePage,
      ),
  },
  {
    path: 'staff/employees/:employeeId/edit',
    canActivate: [authGuard, ownerGuard],
    canDeactivate: [unsavedChangesGuard],
    loadComponent: () =>
      import('./staff/employee-form/employee-form.page').then(
        (m) => m.EmployeeFormPage,
      ),
  },
  {
    path: 'staff/approvals',
    canActivate: [authGuard, ownerGuard],
    loadComponent: () =>
      import('./staff/pending-approvals/pending-approvals.page').then(
        (m) => m.PendingApprovalsPage,
      ),
  },
  {
    path: 'staff/permissions',
    canActivate: [authGuard, ownerGuard],
    loadComponent: () =>
      import('./staff/permission-matrix/permission-matrix.page').then(
        (m) => m.PermissionMatrixPage,
      ),
  },
  {
    path: 'housekeeping',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['owner', 'manager', 'staff'] },
    loadComponent: () =>
      import('./housekeeping/housekeeping-dashboard/housekeeping-dashboard.page').then(
        (m) => m.HousekeepingDashboardPage,
      ),
  },
  {
    path: 'housekeeping/rooms',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['owner', 'manager', 'staff'] },
    loadComponent: () =>
      import('./housekeeping/housekeeping-rooms/housekeeping-rooms.page').then(
        (m) => m.HousekeepingRoomsPage,
      ),
  },
  {
    path: 'housekeeping/tasks',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['owner', 'manager', 'staff'] },
    loadComponent: () =>
      import('./housekeeping/housekeeping-tasks/housekeeping-tasks.page').then(
        (m) => m.HousekeepingTasksPage,
      ),
  },
  {
    path: 'housekeeping/tasks/:taskId',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['owner', 'manager', 'staff'] },
    loadComponent: () =>
      import('./housekeeping/housekeeping-task-detail/housekeeping-task-detail.page').then(
        (m) => m.HousekeepingTaskDetailPage,
      ),
  },
  {
    path: 'housekeeping/my-tasks',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['owner', 'manager', 'staff'] },
    loadComponent: () =>
      import('./housekeeping/housekeeping-my-tasks/housekeeping-my-tasks.page').then(
        (m) => m.HousekeepingMyTasksPage,
      ),
  },
  {
    path: 'housekeeping/inspection',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['owner', 'manager', 'staff'] },
    loadComponent: () =>
      import('./housekeeping/housekeeping-inspection/housekeeping-inspection.page').then(
        (m) => m.HousekeepingInspectionPage,
      ),
  },
  {
    path: 'housekeeping/reports',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['owner', 'manager'] },
    loadComponent: () =>
      import('./housekeeping/housekeeping-reports/housekeeping-reports.page').then(
        (m) => m.HousekeepingReportsPage,
      ),
  },
  {
    path: 'operations',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['owner', 'manager', 'staff'] },
    loadComponent: () =>
      import('./operations/operations-dashboard/operations-dashboard.page').then(
        (m) => m.OperationsDashboardPage,
      ),
  },
  {
    path: 'maintenance',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['owner', 'manager', 'staff'] },
    loadComponent: () =>
      import('./maintenance/maintenance-requests/maintenance-requests.page').then(
        (m) => m.MaintenanceRequestsPage,
      ),
  },
  {
    path: 'maintenance/requests',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['owner', 'manager', 'staff'] },
    loadComponent: () =>
      import('./maintenance/maintenance-requests/maintenance-requests.page').then(
        (m) => m.MaintenanceRequestsPage,
      ),
  },
  {
    path: 'maintenance/requests/:requestId',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['owner', 'manager', 'staff'] },
    loadComponent: () =>
      import('./maintenance/maintenance-request-detail/maintenance-request-detail.page').then(
        (m) => m.MaintenanceRequestDetailPage,
      ),
  },
  {
    path: 'maintenance/work-orders',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['owner', 'manager', 'staff'] },
    loadComponent: () =>
      import('./maintenance/work-orders/work-orders.page').then(
        (m) => m.WorkOrdersPage,
      ),
  },
  {
    path: 'maintenance/work-orders/:workOrderId',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['owner', 'manager', 'staff'] },
    loadComponent: () =>
      import('./maintenance/work-order-detail/work-order-detail.page').then(
        (m) => m.WorkOrderDetailPage,
      ),
  },
  {
    path: 'inventory',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['owner', 'manager', 'staff'] },
    loadComponent: () =>
      import('./inventory/inventory-items/inventory-items.page').then(
        (m) => m.InventoryItemsPage,
      ),
  },
  {
    path: 'inventory/items',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['owner', 'manager', 'staff'] },
    loadComponent: () =>
      import('./inventory/inventory-items/inventory-items.page').then(
        (m) => m.InventoryItemsPage,
      ),
  },
  {
    path: 'inventory/items/:itemId',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['owner', 'manager', 'staff'] },
    loadComponent: () =>
      import('./inventory/inventory-item-detail/inventory-item-detail.page').then(
        (m) => m.InventoryItemDetailPage,
      ),
  },
  {
    path: 'inventory/movements',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['owner', 'manager', 'staff'] },
    loadComponent: () =>
      import('./inventory/stock-movements/stock-movements.page').then(
        (m) => m.StockMovementsPage,
      ),
  },
  {
    path: 'inventory/transfers',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['owner', 'manager'] },
    loadComponent: () =>
      import('./inventory/stock-transfers/stock-transfers.page').then(
        (m) => m.StockTransfersPage,
      ),
  },
  {
    path: 'inventory/suppliers',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['owner', 'manager'] },
    loadComponent: () =>
      import('./inventory/suppliers/suppliers.page').then(
        (m) => m.SuppliersPage,
      ),
  },
  {
    path: 'inventory/purchase-orders',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['owner', 'manager'] },
    loadComponent: () =>
      import('./inventory/purchase-orders/purchase-orders.page').then(
        (m) => m.PurchaseOrdersPage,
      ),
  },
  {
    path: 'inventory/reports',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['owner', 'manager'] },
    loadComponent: () =>
      import('./inventory/operations-reports/operations-reports.page').then(
        (m) => m.OperationsReportsPage,
      ),
  },
  {
    path: 'reports',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['owner', 'manager', 'staff'] },
    loadComponent: () =>
      import('./reports/reports-dashboard/reports-dashboard.page').then(
        (m) => m.ReportsDashboardPage,
      ),
  },
  {
    path: 'reports/bookings',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['owner', 'manager', 'staff'] },
    loadComponent: () =>
      import('./reports/booking-reports/booking-reports.page').then(
        (m) => m.BookingReportsPage,
      ),
  },
  {
    path: 'reports/revenue',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['owner', 'manager'] },
    loadComponent: () =>
      import('./reports/revenue-reports/revenue-reports.page').then(
        (m) => m.RevenueReportsPage,
      ),
  },
  {
    path: 'reports/operations',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['owner', 'manager', 'staff'] },
    loadComponent: () =>
      import('./reports/operations-reports/operations-reports.page').then(
        (m) => m.RepOperationsReportsPage,
      ),
  },
  {
    path: 'reports/inventory',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['owner', 'manager', 'staff'] },
    loadComponent: () =>
      import('./reports/inventory-reports/inventory-reports.page').then(
        (m) => m.RepInventoryReportsPage,
      ),
  },
  {
    path: 'reports/customers',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['owner', 'manager'] },
    loadComponent: () =>
      import('./reports/customer-reports/customer-reports.page').then(
        (m) => m.CustomerReportsPage,
      ),
  },
  {
    path: 'reports/staff',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['owner', 'manager'] },
    loadComponent: () =>
      import('./reports/staff-reports/staff-reports.page').then(
        (m) => m.StaffReportsPage,
      ),
  },
  {
    path: 'dashboard',
    canActivate: [authGuard, roleDashboardRedirectGuard],
    children: [],
  },
  {
    path: 'home',
    canActivate: [authGuard, roleDashboardRedirectGuard],
    children: [],
  },
  {
    path: '**',
    canActivate: [initialRouteGuard],
    children: [],
  },
];
