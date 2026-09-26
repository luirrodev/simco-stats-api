import { RequestContextService } from './request-context.service';

describe('RequestContextService', () => {
  it('returns an empty context outside a request', () => {
    expect(new RequestContextService().getContext()).toEqual({});
  });

  it('propagates context values through synchronous work', () => {
    const service = new RequestContextService();

    const requestId = service.run(
      { requestId: 'request-1', ip: '127.0.0.1' },
      () => ({
        requestId: service.getRequestId(),
        ip: service.getIp(),
      }),
    );

    expect(requestId).toEqual({ requestId: 'request-1', ip: '127.0.0.1' });
  });
});
