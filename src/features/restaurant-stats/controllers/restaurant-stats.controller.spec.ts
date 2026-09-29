import 'reflect-metadata';

jest.mock('@nestjs/swagger', () => ({
  ApiBearerAuth: () => () => undefined,
  ApiOkResponse: () => () => undefined,
  ApiOperation: () => () => undefined,
  ApiProperty: () => () => undefined,
  ApiPropertyOptional: () => () => undefined,
  ApiTags: () => () => undefined,
}));

jest.mock('@nestjs/event-emitter', () => ({
  EventEmitter2: jest.fn(),
  OnEvent: () => () => undefined,
}));

import { PERMISSIONS_KEY } from '@common/decorators/permissions.decorator';
import { PERMISSIONS } from '@core/access-control/permissions/constants/permissions.constant';
import { RestaurantStatsController } from './restaurant-stats.controller';

describe('RestaurantStatsController', () => {
  const service = {
    getRestaurantStats: jest.fn(),
    getRestaurantStatById: jest.fn(),
    syncRestaurantRuns: jest.fn(),
    syncAllRestaurantRuns: jest.fn(),
  };
  const controller = new RestaurantStatsController(service as never);

  beforeEach(() => jest.clearAllMocks());

  it('delegates all endpoints to the service', async () => {
    service.getRestaurantStats.mockResolvedValue({ data: [] });
    service.getRestaurantStatById.mockResolvedValue({ id: 100 });
    service.syncRestaurantRuns.mockResolvedValue({ success: true });
    service.syncAllRestaurantRuns.mockResolvedValue({ success: true });

    await expect(controller.getRestaurantStats({})).resolves.toEqual({
      data: [],
    });
    await expect(controller.getRestaurantStatById(100)).resolves.toEqual({
      id: 100,
    });
    await expect(controller.syncRestaurantRuns(12)).resolves.toEqual({
      success: true,
    });
    await expect(controller.syncAllRestaurantRuns()).resolves.toEqual({
      success: true,
    });
  });

  it('requires separate read and sync permissions', () => {
    expect(
      Reflect.getMetadata(PERMISSIONS_KEY, controller.getRestaurantStats),
    ).toEqual([PERMISSIONS.RESTAURANT_STATS.READ]);
    expect(
      Reflect.getMetadata(PERMISSIONS_KEY, controller.syncRestaurantRuns),
    ).toEqual([PERMISSIONS.RESTAURANT_STATS.SYNC]);
  });
});
