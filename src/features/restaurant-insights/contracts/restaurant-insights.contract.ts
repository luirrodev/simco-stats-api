export interface RestaurantListItem {
  id: number;
  name: string;
  size: number;
}

export interface RestaurantPageRequest {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasPrev: boolean;
  hasNext: boolean;
}

export interface RestaurantProfitSummary {
  last24Hours: number;
  last72Hours: number;
  last7Days: number;
}

export interface RestaurantOverview {
  restaurant: RestaurantListItem;
  profits: RestaurantProfitSummary;
}

export type RestaurantRunResolution = 'resolved' | 'all';

export interface RestaurantRunHistoryRequest extends RestaurantPageRequest {
  restaurantId: number;
  resolution: RestaurantRunResolution;
}

export interface RestaurantRun {
  id: number;
  datetime: Date;
  rating: number;
  newRating: number | null;
  occupancy: number | null;
  menuPrice: number;
  cogs: number;
  wages: number;
  revenue: number | null;
  resolved: boolean;
}

export interface RestaurantRunHistory extends PaginatedResult<RestaurantRun> {
  restaurant: RestaurantListItem;
}
