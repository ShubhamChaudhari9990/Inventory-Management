import { RoomItem, RoomStatus, RoomViewMode } from '../../interface';

export type { RoomStatus, RoomViewMode, RoomItem };

export const ROOM_STATUS_FILTERS: readonly RoomStatus[] = [
  'All',
  'Available',
  'Occupied',
  'Reserved',
  'Cleaning',
  'Maintenance',
] as const;

export const ROOM_VIEW_SUBTITLE = 'ROOMS.SUBTITLE';

export const ROOM_ITEMS: readonly RoomItem[] = [];
