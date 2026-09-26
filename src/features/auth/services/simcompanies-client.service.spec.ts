import { of, throwError } from 'rxjs';

import { SimCompaniesClient } from './simcompanies-client.service';
import { SimCompaniesSessionService } from './simcompanies-session.service';

describe('SimCompaniesClient', () => {
  const sessionService = {
    getValidCookie: jest.fn(),
    getRequestHeaders: jest.fn((cookie: string) => ({ Cookie: cookie })),
    invalidate: jest.fn(),
  } as unknown as jest.Mocked<SimCompaniesSessionService>;

  beforeEach(() => jest.clearAllMocks());

  it('re-authenticates and retries exactly once after a 401 response', async () => {
    sessionService.getValidCookie
      .mockResolvedValueOnce('old')
      .mockResolvedValueOnce('new');
    const httpService = {
      get: jest
        .fn()
        .mockReturnValueOnce(throwError(() => ({ response: { status: 401 } })))
        .mockReturnValueOnce(of({ data: { id: 7 } })),
    };
    const client = new SimCompaniesClient(httpService as never, sessionService);

    await expect(
      client.get<{ id: number }>('https://example.test/data'),
    ).resolves.toEqual({ id: 7 });
    expect(sessionService.invalidate).toHaveBeenCalledTimes(1);
    expect(httpService.get).toHaveBeenCalledTimes(2);
    expect(sessionService.getRequestHeaders).toHaveBeenLastCalledWith('new');
  });

  it('does not retry non-authentication failures', async () => {
    sessionService.getValidCookie.mockResolvedValue('cookie');
    const failure = { response: { status: 500 } };
    const httpService = { get: jest.fn(() => throwError(() => failure)) };
    const client = new SimCompaniesClient(httpService as never, sessionService);

    await expect(client.get('https://example.test/data')).rejects.toBe(failure);
    expect(sessionService.invalidate).not.toHaveBeenCalled();
    expect(httpService.get).toHaveBeenCalledTimes(1);
  });
});
