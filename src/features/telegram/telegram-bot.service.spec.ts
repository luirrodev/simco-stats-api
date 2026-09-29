import type { Context } from 'telegraf';

import {
  formatRestaurantMenu,
  formatRestaurantStatistics,
  TelegramBotService,
} from './telegram-bot.service';

describe('TelegramBotService', () => {
  const buildingService = {
    getBuildingById: jest.fn(),
    listRestaurantsForTelegram: jest.fn(),
  };
  const restaurantStatsService = {
    getResolvedRestaurantStatsPage: jest.fn(),
    getRestaurantStatsSince: jest.fn(),
  };
  const appConfig = {
    telegram: {
      enabled: false,
      botToken: '',
      allowedUserIds: [123],
    },
  };
  const service = new TelegramBotService(
    buildingService as never,
    restaurantStatsService as never,
    appConfig as never,
  );

  beforeEach(() => jest.clearAllMocks());

  it('does not query data for an unauthorized user', async () => {
    const ctx = createContext({ from: { id: 999 } });

    await service.handleRestaurants(ctx);

    expect(buildingService.listRestaurantsForTelegram).not.toHaveBeenCalled();
    expect(ctx.reply).toHaveBeenCalledWith(
      'No tienes permiso para usar este bot.',
    );
  });

  it('shows restaurants in paginated buttons for an authorized user', async () => {
    buildingService.listRestaurantsForTelegram.mockResolvedValue(
      Array.from({ length: 9 }, (_, index) => ({
        id: index + 1,
        name: `Restaurante ${index + 1}`,
        size: index + 1,
      })),
    );
    const ctx = createContext({ from: { id: 123 } });

    await service.handleRestaurants(ctx);

    expect(ctx.reply).toHaveBeenCalledWith(
      'Elige un restaurante (página 1 de 2).',
      expect.objectContaining({
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
  });

  it('opens the restaurant menu without querying its paginated history', async () => {
    buildingService.getBuildingById.mockResolvedValue({
      id: 5,
      name: 'Restaurante No.5',
    });
    restaurantStatsService.getRestaurantStatsSince.mockResolvedValue([
      {
        id: 7,
        restaurantId: 5,
        datetime: new Date(),
        cogs: 100,
        wages: 50,
        revenue: 500,
      },
    ]);
    const ctx = createContext({
      from: { id: 123 },
      callbackQuery: { data: 'restaurant:5' },
    });

    await service.handleCallback(ctx);

    expect(
      restaurantStatsService.getResolvedRestaurantStatsPage,
    ).not.toHaveBeenCalled();
    expect(buildingService.getBuildingById).toHaveBeenCalledWith(5);
    expect(restaurantStatsService.getRestaurantStatsSince).toHaveBeenCalledWith(
      5,
      expect.any(Date),
    );
    expect(ctx.editMessageText).toHaveBeenCalledWith(
      expect.stringContaining('💵 Ganancia últimas 24 h: 350'),
      expect.anything(),
    );
    expect(ctx.editMessageText).toHaveBeenCalledWith(
      expect.stringContaining('Restaurante No.5'),
      expect.objectContaining({
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
    expect(ctx.answerCbQuery).toHaveBeenCalled();
  });

  it('shows four resolved statistics per history page and its navigation', async () => {
    buildingService.getBuildingById.mockResolvedValue({
      id: 5,
      name: 'Restaurante No.5',
    });
    restaurantStatsService.getResolvedRestaurantStatsPage.mockResolvedValue({
      data: [createResolvedStat(7), createResolvedStat(6)],
      page: 1,
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
      restaurantStatsService.getResolvedRestaurantStatsPage,
    ).toHaveBeenCalledWith(5, 1);
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

  it('acknowledges unavailable secondary statistics without querying data', async () => {
    const ctx = createContext({
      from: { id: 123 },
      callbackQuery: { data: 'restaurant-other-stats:5' },
    });

    await service.handleCallback(ctx);

    expect(ctx.answerCbQuery).toHaveBeenCalledWith(
      'Otras estadísticas estarán disponibles próximamente.',
    );
    expect(buildingService.getBuildingById).not.toHaveBeenCalled();
    expect(
      restaurantStatsService.getResolvedRestaurantStatsPage,
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
    expect(formatRestaurantStatistics('Restaurante No.5', [], 1, 0)).toContain(
      'Aún no hay estadísticas resueltas',
    );
  });
});

function createResolvedStat(id: number) {
  return {
    id,
    restaurantId: 5,
    restaurantName: 'Restaurante No.5',
    datetime: new Date('2026-09-29T12:00:00Z'),
    rating: 5.5,
    cogs: 100,
    wages: 50,
    resolved: true,
    menuPrice: 60,
    buildingSize: 4,
    buildingIsLuxury: false,
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
