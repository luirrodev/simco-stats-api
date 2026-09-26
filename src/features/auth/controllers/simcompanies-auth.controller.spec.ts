jest.mock('@nestjs/swagger', () => ({
  ApiBearerAuth: () => () => undefined,
  ApiOkResponse: () => () => undefined,
  ApiOperation: () => () => undefined,
  ApiProperty: () => () => undefined,
  ApiTags: () => () => undefined,
}));

import { SimCompaniesAuthController } from './simcompanies-auth.controller';
import type { SimCompaniesSessionService } from '../services/simcompanies-session.service';

describe('SimCompaniesAuthController', () => {
  it('delegates a manual login and returns only safe session metadata', async () => {
    const response = {
      message: 'SimCompanies authentication completed successfully',
      authenticatedAt: new Date('2026-09-25T21:15:00.000Z'),
      isValid: true,
      expiresAt: new Date('2026-10-02T21:15:00.000Z'),
    };
    const sessionService = {
      forceLogin: jest.fn().mockResolvedValue(response),
    } as unknown as SimCompaniesSessionService;
    const controller = new SimCompaniesAuthController(sessionService);

    await expect(controller.login()).resolves.toEqual(response);
    expect(sessionService.forceLogin).toHaveBeenCalledTimes(1);
  });
});
