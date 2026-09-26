import 'reflect-metadata';

jest.mock('@nestjs/swagger', () => ({
  ApiBearerAuth: () => () => undefined,
  ApiOkResponse: () => () => undefined,
  ApiOperation: () => () => undefined,
  ApiProperty: () => () => undefined,
  ApiPropertyOptional: () => () => undefined,
  ApiTags: () => () => undefined,
}));

import { PERMISSIONS_KEY } from '@common/decorators/permissions.decorator';
import { PERMISSIONS } from '@core/access-control/permissions/constants/permissions.constant';
import { BuildingController } from './building.controller';

describe('BuildingController', () => {
  const service = {
    getAllBuildings: jest.fn(),
    getBuildingById: jest.fn(),
    syncBuildingsFromApi: jest.fn(),
  };
  const controller = new BuildingController(service as never);

  beforeEach(() => jest.clearAllMocks());

  it('delegates each endpoint to the service', async () => {
    service.getAllBuildings.mockResolvedValue({ data: [] });
    service.getBuildingById.mockResolvedValue({ id: 3 });
    service.syncBuildingsFromApi.mockResolvedValue({ success: true });

    await expect(controller.getAllBuildings({})).resolves.toEqual({ data: [] });
    await expect(controller.getBuildingById(3)).resolves.toEqual({ id: 3 });
    await expect(controller.syncBuildingsFromApi()).resolves.toEqual({
      success: true,
    });
  });

  it('requires read and sync permissions on the appropriate endpoints', () => {
    expect(
      Reflect.getMetadata(PERMISSIONS_KEY, controller.getAllBuildings),
    ).toEqual([PERMISSIONS.BUILDINGS.READ]);
    expect(
      Reflect.getMetadata(PERMISSIONS_KEY, controller.syncBuildingsFromApi),
    ).toEqual([PERMISSIONS.BUILDINGS.SYNC]);
  });
});
