export class CreateRestaurantStatDto {
  id: number;
  datetime: string;
  rating: number;
  cogs: number;
  wages: number;
  resolved: boolean;
  menuPrice: number;
  occupancy?: number;
  revenue?: number;
  newRating?: number;
  review?: string;
}
