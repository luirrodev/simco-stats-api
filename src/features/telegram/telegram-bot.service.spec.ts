import type { Context } from 'telegraf';

import {
  formatRestaurantStatistic,
  TelegramBotService,
} from './telegram-bot.service';

describe('TelegramBotService', () => {
  const buildingService = { listRestaurantsForTelegram: jest.fn() };
  const restaurantStatsService = { getLatestRestaurantStat: jest.fn() };
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
            ]),
            expect.arrayContaining([
              expect.objectContaining({ callback_data: 'restaurants:1' }),
            ]),
          ]),
        }),
      }),
    );
  });

  it('renders the latest selected restaurant statistic', async () => {
    restaurantStatsService.getLatestRestaurantStat.mockResolvedValue({
      id: 7,
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
    });
    const ctx = createContext({
      from: { id: 123 },
      callbackQuery: { data: 'restaurant:5' },
    });

    await service.handleCallback(ctx);

    expect(restaurantStatsService.getLatestRestaurantStat).toHaveBeenCalledWith(
      5,
    );
    expect(ctx.editMessageText).toHaveBeenCalledWith(
      expect.stringContaining('📊 Restaurante No.5'),
      expect.anything(),
    );
    expect(ctx.answerCbQuery).toHaveBeenCalled();
  });

  it('explains when a restaurant has no synchronized runs', () => {
    expect(formatRestaurantStatistic(null)).toContain(
      'Aún no hay estadísticas sincronizadas',
    );
  });
});

function createContext(values: Record<string, unknown>): jest.Mocked<Context> {
  return {
    ...values,
    reply: jest.fn(),
    answerCbQuery: jest.fn(),
    editMessageText: jest.fn(),
  } as unknown as jest.Mocked<Context>;
}
