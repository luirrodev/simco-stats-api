import type { Context } from 'telegraf';

import {
  formatRestaurantMenu,
  formatAccountingClosureNotification,
  formatRestaurantSyncCompletedNotification,
  formatRestaurantSyncFailedNotification,
  formatRestaurantStatistics,
  TelegramBotService,
} from './telegram-bot.service';

jest.mock('@nestjs/event-emitter', () => ({
  OnEvent: () => () => undefined,
}));

describe('TelegramBotService', () => {
  const restaurantInsightsService = {
    listRestaurants: jest.fn(),
    getRestaurantPortfolioOverview: jest.fn(),
    getRestaurantOverview: jest.fn(),
    getRestaurantRunHistory: jest.fn(),
    getLatestResolvedRestaurantRun: jest.fn(),
  };
  const appConfig = {
    telegram: { enabled: false, botToken: '', allowedUserIds: [123] },
  };
  const notificationQueue = { add: jest.fn() };
  const service = new TelegramBotService(
    restaurantInsightsService as never,
    notificationQueue as never,
    appConfig as never,
  );

  beforeEach(() => jest.clearAllMocks());

  it('formats a concise accounting closure notification', () => {
    const message = formatAccountingClosureNotification({
      closureId: 1,
      periodStart: new Date('2026-10-01T04:00:00.000Z'),
      periodEnd: new Date('2026-10-01T16:00:00.000Z'),
      operatingRestaurantCount: 12,
      operatingLevelCount: 180,
      totalProfit: 123456.78,
      pphl: 57.16,
      excludedRestaurantCount: 3,
    });

    expect(message).toContain('Cierre contable de restaurantes');
    expect(message).toContain('Restaurantes operativos:</b> 12');
    expect(message).toContain('PPHL:</b> $57,16');
    expect(message).toContain('Sin ciclo disponible:</b> 3');
  });

  it('does not query insights for an unauthorized user', async () => {
    const ctx = createContext({ from: { id: 999 } });
    await service.handleRestaurants(ctx);

    expect(restaurantInsightsService.listRestaurants).not.toHaveBeenCalled();
    expect(
      restaurantInsightsService.getRestaurantPortfolioOverview,
    ).not.toHaveBeenCalled();
    expect(ctx.reply).toHaveBeenCalledWith(
      'No tienes permiso para usar este bot.',
    );
  });

  it('shows restaurants in paginated buttons for an authorized user', async () => {
    restaurantInsightsService.listRestaurants.mockResolvedValue({
      data: Array.from({ length: 8 }, (_, index) => ({
        id: index + 1,
        name: `Restaurante ${index + 1}`,
        size: index + 1,
      })),
      page: 1,
      limit: 8,
      total: 9,
      totalPages: 2,
      hasPrev: false,
      hasNext: true,
    });
    restaurantInsightsService.getRestaurantPortfolioOverview.mockResolvedValue({
      profits: { last24Hours: 100, last72Hours: 200, last7Days: 300 },
    });
    const ctx = createContext({ from: { id: 123 } });
    await service.handleRestaurants(ctx);

    expect(restaurantInsightsService.listRestaurants).toHaveBeenCalledWith({
      page: 1,
      limit: 8,
    });
    expect(
      restaurantInsightsService.getRestaurantPortfolioOverview,
    ).toHaveBeenCalledWith(expect.any(Date));
    expect(ctx.reply).toHaveBeenCalledWith(
      expect.stringContaining('🍽️ <b>Ganancias generales</b> 🍽️'),
      expect.objectContaining({
        parse_mode: 'HTML',
        reply_markup: expect.objectContaining({
          inline_keyboard: expect.arrayContaining([
            expect.arrayContaining([
              expect.objectContaining({ callback_data: 'restaurant:1' }),
              expect.objectContaining({ text: 'Restaurante 1 (lvl 1)' }),
            ]),
            expect.arrayContaining([
              expect.objectContaining({ callback_data: 'restaurants:1' }),
            ]),
          ]),
        }),
      }),
    );
    expect(ctx.reply).toHaveBeenCalledWith(
      expect.stringContaining('⏱️ <b>Últimas 24 hrs:</b> $100'),
      expect.anything(),
    );
  });

  it('refreshes the global profits when navigating restaurant pages', async () => {
    restaurantInsightsService.listRestaurants.mockResolvedValue({
      data: [{ id: 9, name: 'Restaurante 9', size: 9 }],
      page: 2,
      limit: 8,
      total: 9,
      totalPages: 2,
      hasPrev: true,
      hasNext: false,
    });
    restaurantInsightsService.getRestaurantPortfolioOverview.mockResolvedValue({
      profits: { last24Hours: 400, last72Hours: 500, last7Days: 600 },
    });
    const ctx = createContext({
      from: { id: 123 },
      callbackQuery: { data: 'restaurants:1' },
    });

    await service.handleCallback(ctx);

    expect(restaurantInsightsService.listRestaurants).toHaveBeenCalledWith({
      page: 2,
      limit: 8,
    });
    expect(
      restaurantInsightsService.getRestaurantPortfolioOverview,
    ).toHaveBeenCalledWith(expect.any(Date));
    expect(ctx.editMessageText).toHaveBeenCalledWith(
      expect.stringContaining('📅 <b>Últimos 7 días:</b> $600'),
      expect.objectContaining({ parse_mode: 'HTML' }),
    );
  });

  it('opens the restaurant menu without querying its history', async () => {
    restaurantInsightsService.getRestaurantOverview.mockResolvedValue({
      restaurant: { id: 5, name: 'Restaurante No.5', size: 4 },
      profits: { last24Hours: 350, last72Hours: 350, last7Days: 350 },
    });
    const ctx = createContext({
      from: { id: 123 },
      callbackQuery: { data: 'restaurant:5' },
    });
    await service.handleCallback(ctx);

    expect(
      restaurantInsightsService.getRestaurantOverview,
    ).toHaveBeenCalledWith(5, expect.any(Date));
    expect(
      restaurantInsightsService.getRestaurantRunHistory,
    ).not.toHaveBeenCalled();
    expect(ctx.editMessageText).toHaveBeenCalledWith(
      expect.stringContaining('⏱️ <b>Últimas 24 hrs:</b> $350'),
      expect.objectContaining({
        parse_mode: 'HTML',
        reply_markup: expect.objectContaining({
          inline_keyboard: expect.arrayContaining([
            expect.arrayContaining([
              expect.objectContaining({
                callback_data: 'restaurant-stats:5:1',
              }),
            ]),
            expect.arrayContaining([
              expect.objectContaining({
                callback_data: 'restaurant-other-stats:5',
              }),
            ]),
          ]),
        }),
      }),
    );
  });

  it('shows four resolved statistics per history page and its navigation', async () => {
    restaurantInsightsService.getRestaurantRunHistory.mockResolvedValue({
      restaurant: { id: 5, name: 'Restaurante No.5', size: 4 },
      data: [createResolvedStat(7), createResolvedStat(6)],
      page: 1,
      limit: 4,
      total: 6,
      totalPages: 2,
      hasPrev: false,
      hasNext: true,
    });
    const ctx = createContext({
      from: { id: 123 },
      callbackQuery: { data: 'restaurant-stats:5:1' },
    });
    await service.handleCallback(ctx);

    expect(
      restaurantInsightsService.getRestaurantRunHistory,
    ).toHaveBeenCalledWith({
      restaurantId: 5,
      page: 1,
      limit: 4,
      resolution: 'resolved',
    });
    expect(ctx.editMessageText).toHaveBeenCalledWith(
      expect.stringContaining(
        'Restaurante No.5 · Estadísticas (página 1 de 2)',
      ),
      expect.objectContaining({
        reply_markup: expect.objectContaining({
          inline_keyboard: expect.arrayContaining([
            expect.arrayContaining([
              expect.objectContaining({
                callback_data: 'restaurant-stats:5:2',
              }),
            ]),
            expect.arrayContaining([
              expect.objectContaining({ callback_data: 'restaurant:5' }),
            ]),
          ]),
        }),
      }),
    );
  });

  it('acknowledges unavailable secondary statistics without querying insights', async () => {
    const ctx = createContext({
      from: { id: 123 },
      callbackQuery: { data: 'restaurant-other-stats:5' },
    });
    await service.handleCallback(ctx);

    expect(ctx.answerCbQuery).toHaveBeenCalledWith(
      'Otras estadísticas estarán disponibles próximamente.',
    );
    expect(
      restaurantInsightsService.getRestaurantOverview,
    ).not.toHaveBeenCalled();
    expect(
      restaurantInsightsService.getRestaurantRunHistory,
    ).not.toHaveBeenCalled();
  });

  it('formats an explanatory history view when no resolved runs exist', () => {
    expect(
      formatRestaurantMenu('Restaurante No.5', {
        last24Hours: 0,
        last72Hours: 0,
        last7Days: 0,
      }),
    ).toContain('Restaurante No.5');
    expect(
      formatRestaurantMenu('Restaurante No.5', {
        last24Hours: 10,
        last72Hours: 20,
        last7Days: 30,
      }),
    ).toContain('⏱️ <b>Últimas 24 hrs:</b> $10');
    expect(formatRestaurantStatistics('Restaurante No.5', [], 1, 0)).toContain(
      'Aún no hay estadísticas resueltas',
    );
  });

  it('sends a completed-cycle notification to every allowed user', async () => {
    const { notificationService, queue } = createNotificationService(
      restaurantInsightsService,
    );
    restaurantInsightsService.getLatestResolvedRestaurantRun.mockResolvedValue({
      restaurant: { id: 5, name: 'Restaurante <Cinco>', size: 4 },
      stat: createResolvedStat(7),
    });

    await notificationService.handleRestaurantSyncCompleted({
      restaurantId: 5,
      cycleStartedAt: '2026-09-29T12:00:00.000Z',
    });

    expect(queue.add).toHaveBeenCalledTimes(2);
    expect(queue.add).toHaveBeenCalledWith(
      'send-notification',
      expect.objectContaining({
        recipientId: 123,
        message: expect.stringContaining('✅ <b>Nuevo ciclo completado</b>'),
      }),
      expect.objectContaining({
        jobId: 'telegram-notification-completed-5-1790683200000-123',
        attempts: 2_147_483_647,
        backoff: { type: 'fixed', delay: 5 * 60 * 1000 },
      }),
    );
    expect(queue.add).toHaveBeenCalledWith(
      'send-notification',
      expect.objectContaining({
        recipientId: 456,
        message: expect.stringContaining('🍽️ <b>Restaurante &lt;Cinco&gt;</b>'),
      }),
      expect.any(Object),
    );
  });

  it('creates independent jobs for each allowed user', async () => {
    const { notificationService, queue } = createNotificationService(
      restaurantInsightsService,
    );
    restaurantInsightsService.getLatestResolvedRestaurantRun.mockResolvedValue({
      restaurant: { id: 5, name: 'Restaurante No.5', size: 4 },
      stat: createResolvedStat(7),
    });
    await expect(
      notificationService.handleRestaurantSyncCompleted({
        restaurantId: 5,
        cycleStartedAt: '2026-09-29T12:00:00.000Z',
      }),
    ).resolves.toBeUndefined();

    expect(queue.add).toHaveBeenCalledTimes(2);
  });

  it('sends a final-failure notification with the summarized error', async () => {
    const { notificationService, queue } = createNotificationService(
      restaurantInsightsService,
    );
    restaurantInsightsService.getLatestResolvedRestaurantRun.mockResolvedValue({
      restaurant: { id: 5, name: 'Restaurante No.5', size: 4 },
      stat: null,
    });

    await notificationService.handleRestaurantSyncFailed({
      restaurantId: 5,
      cycleStartedAt: '2026-09-29T12:00:00.000Z',
      attempts: 5,
      errorMessage: 'Servicio no disponible <503>',
    });

    expect(queue.add).toHaveBeenCalledWith(
      'send-notification',
      expect.objectContaining({
        recipientId: 123,
        message: expect.stringContaining('⚠️ <b>Sincronización fallida</b>'),
      }),
      expect.any(Object),
    );
    expect(queue.add).toHaveBeenCalledWith(
      'send-notification',
      expect.objectContaining({
        recipientId: 456,
        message: expect.stringContaining(
          'Error: Servicio no disponible &lt;503&gt;',
        ),
      }),
      expect.any(Object),
    );
  });

  it('does not notify when Telegram is disabled', async () => {
    Reflect.set(service, 'bot', { telegram: { sendMessage: jest.fn() } });

    await service.handleRestaurantSyncCompleted({
      restaurantId: 5,
      cycleStartedAt: '2026-09-29T12:00:00.000Z',
    });

    expect(
      restaurantInsightsService.getLatestResolvedRestaurantRun,
    ).not.toHaveBeenCalled();
    expect(notificationQueue.add).not.toHaveBeenCalled();
  });

  it('formats completed and failed synchronization notifications', () => {
    expect(
      formatRestaurantSyncCompletedNotification(
        'Restaurante No.5',
        createResolvedStat(7),
      ),
    ).toContain('💵 Ganancia: 350');
    expect(
      formatRestaurantSyncFailedNotification(
        'Restaurante No.5',
        5,
        'Servicio no disponible',
      ),
    ).toContain('No se pudo sincronizar tras 5 intentos.');
  });
});

function createNotificationService(
  restaurantInsightsService: Record<string, jest.Mock>,
) {
  const queue = { add: jest.fn().mockResolvedValue({}) };
  const notificationService = new TelegramBotService(
    restaurantInsightsService as never,
    queue as never,
    {
      telegram: {
        enabled: true,
        botToken: 'token',
        allowedUserIds: [123, 456],
      },
    } as never,
  );
  Reflect.set(notificationService, 'bot', { telegram: {} });
  return { notificationService, queue };
}

function createResolvedStat(id: number) {
  return {
    id,
    datetime: new Date('2026-09-29T12:00:00Z'),
    rating: 5.5,
    cogs: 100,
    wages: 50,
    resolved: true,
    menuPrice: 60,
    occupancy: 1,
    revenue: 500,
    newRating: 5.7,
  };
}

function createContext(values: Record<string, unknown>): jest.Mocked<Context> {
  return {
    ...values,
    reply: jest.fn(),
    answerCbQuery: jest.fn(),
    editMessageText: jest.fn(),
  } as unknown as jest.Mocked<Context>;
}
