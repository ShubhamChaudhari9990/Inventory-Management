/** Maps domain status labels to i18n keys. */
export function statusLabelKey(status: string): string {
  switch (status) {
    case 'Paid':
      return 'STATUS.PAID';
    case 'Due':
      return 'STATUS.DUE';
    case 'Cancelled':
      return 'STATUS.CANCELLED';
    case 'Available':
      return 'STATUS.AVAILABLE';
    case 'Occupied':
      return 'STATUS.OCCUPIED';
    case 'Reserved':
      return 'STATUS.RESERVED';
    case 'Cleaning':
      return 'STATUS.CLEANING';
    case 'Maintenance':
      return 'STATUS.MAINTENANCE';
    case 'In stock':
      return 'STATUS.IN_STOCK';
    case 'Low Stock Alerts':
      return 'STATUS.LOW_STOCK';
    case 'Present':
      return 'STATUS.PRESENT';
    case 'On Leave':
      return 'STATUS.ON_LEAVE';
    case 'Completed':
      return 'STATUS.COMPLETED';
    case 'Pending':
      return 'STATUS.PENDING';
    case 'Active':
      return 'STATUS.ACTIVE';
    default:
      return status;
  }
}

export function roomFilterLabelKey(filter: string): string {
  switch (filter) {
    case 'All':
      return 'ROOMS.FILTER.ALL';
    case 'Available':
      return 'ROOMS.FILTER.AVAILABLE';
    case 'Occupied':
      return 'ROOMS.FILTER.OCCUPIED';
    case 'Reserved':
      return 'ROOMS.FILTER.RESERVED';
    case 'Cleaning':
      return 'ROOMS.FILTER.CLEANING';
    case 'Maintenance':
      return 'ROOMS.FILTER.MAINTENANCE';
    default:
      return filter;
  }
}

export function bookingFilterLabelKey(filter: string): string {
  switch (filter) {
    case 'All':
      return 'BOOKINGS.FILTER.ALL';
    case 'Walk-in':
      return 'BOOKINGS.FILTER.WALK_IN';
    case 'Advance':
      return 'BOOKINGS.FILTER.ADVANCE';
    case 'Online':
      return 'BOOKINGS.FILTER.ONLINE';
    default:
      return filter;
  }
}

export function paymentMethodLabelKey(method: string): string {
  switch (method) {
    case 'UPI':
      return 'DASHBOARD.METHOD.UPI';
    case 'Cash':
      return 'DASHBOARD.METHOD.CASH';
    case 'Card':
      return 'DASHBOARD.METHOD.CARD';
    case 'Bank Transfer':
      return 'DASHBOARD.METHOD.BANK';
    default:
      return method;
  }
}
