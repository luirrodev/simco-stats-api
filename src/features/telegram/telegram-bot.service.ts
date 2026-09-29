import {
  Inject,
  Injectable,
  Logger,
  OnApplicationShutdown,
  OnModuleInit,
} from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { Context, Markup, Telegraf } from 'telegraf';

import config from '@common/utils/config';
import {
  PaginatedResult,
  RestaurantListItem,
  RestaurantProfitSummary,
  RestaurantRun,
} from '@features/restaurant-insights/contracts/restaurant-insights.contract';
import { RestaurantInsightsService } from '@features/restaurant-insights/services/restaurant-insights.service';

const RESTAURANTS_PER_PAGE = 8;
const RESTAURANT_CALLBACK_PREFIX = 'restaurant:';
const RESTAURANTS_CALLBACK_PREFIX = 'restaurants:';
const RESTAURANT_STATS_CALLBACK_PREFIX = 'restaurant-stats:';
const RESTAURANT_OTHER_STATS_CALLBACK_PREFIX = 'restaurant-other-stats:';

@Injectable()
export class TelegramBotService implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(TelegramBotService.name);
  private bot?: Telegraf;

  constructor(
    private readonly restaurantInsightsService: RestaurantInsightsService,
    @Inject(config.KEY)
    private readonly appConfig: ConfigType<typeof config>,
  ) {}

  onModuleInit(): void {
    if (!this.appConfig.telegram.enabled) {
      this.logger.log('Telegram bot is disabled');
      return;
    }

    this.bot = new Telegraf(this.appConfig.telegram.botToken);
    this.registerHandlers(this.bot);
    this.startBot();
  }

  onApplicationShutdown(): void {
    this.bot?.stop('Application shutdown');
  }

  async handleStart(ctx: Context): Promise<void> {
    if (!(await this.ensureAllowed(ctx))) return;
    await ctx.reply(
      'Hola. Este es un bot privado de estadísticas de restaurantes. Usa /restaurantes para elegir un restaurante.',
    );
  }

  async handleRestaurants(ctx: Context, requestedPage = 0): Promise<void> {
    if (!(await this.ensureAllowed(ctx))) return;
    const restaurants = await this.restaurantInsightsService.listRestaurants({
      page: requestedPage + 1,
      limit: RESTAURANTS_PER_PAGE,
    });
    await this.replyRestaurantList(ctx, restaurants, requestedPage);
  }

  async handleCallback(ctx: Context): Promise<void> {
    const callbackData = this.getCallbackData(ctx);
    if (!callbackData) return;
    if (!(await this.ensureAllowed(ctx, true))) return;

    if (callbackData.startsWith(RESTAURANTS_CALLBACK_PREFIX)) {
      const page = Number(
        callbackData.slice(RESTAURANTS_CALLBACK_PREFIX.length),
      );
      if (!Number.isInteger(page) || page < 0) {
        await ctx.answerCbQuery('Página inválida');
        return;
      }
      const restaurants = await this.restaurantInsightsService.listRestaurants({
        page: page + 1,
        limit: RESTAURANTS_PER_PAGE,
      });
      await ctx.answerCbQuery();
      await this.editRestaurantList(ctx, restaurants, page);
      return;
    }

    if (callbackData.startsWith(RESTAURANT_OTHER_STATS_CALLBACK_PREFIX)) {
      await ctx.answerCbQuery(
        'Otras estadísticas estarán disponibles próximamente.',
      );
      return;
    }

    if (callbackData.startsWith(RESTAURANT_STATS_CALLBACK_PREFIX)) {
      const parsed = parseRestaurantStatsCallback(callbackData);
      if (!parsed) {
        await ctx.answerCbQuery('Estadísticas inválidas');
        return;
      }
      const statistics =
        await this.restaurantInsightsService.getRestaurantRunHistory({
          restaurantId: parsed.restaurantId,
          page: parsed.page,
          limit: 4,
          resolution: 'resolved',
        });
      await ctx.answerCbQuery();
      await ctx.editMessageText(
        formatRestaurantStatistics(
          statistics.restaurant.name,
          statistics.data,
          statistics.page,
          statistics.totalPages,
        ),
        restaurantStatisticsKeyboard(
          parsed.restaurantId,
          statistics.page,
          statistics.totalPages,
        ),
      );
      return;
    }

    if (callbackData.startsWith(RESTAURANT_CALLBACK_PREFIX)) {
      const restaurantId = parsePositiveInteger(
        callbackData.slice(RESTAURANT_CALLBACK_PREFIX.length),
      );
      if (!restaurantId) {
        await ctx.answerCbQuery('Restaurante inválido');
        return;
      }
      const overview =
        await this.restaurantInsightsService.getRestaurantOverview(
          restaurantId,
          new Date(),
        );
      await ctx.answerCbQuery();
      await ctx.editMessageText(
        formatRestaurantMenu(overview.restaurant.name, overview.profits),
        restaurantMenuKeyboard(restaurantId),
      );
    }
  }

  async handleUnknownText(ctx: Context): Promise<void> {
    if (!(await this.ensureAllowed(ctx))) return;
    await ctx.reply('Usa /restaurantes para consultar las estadísticas.');
  }

  private registerHandlers(bot: Telegraf): void {
    bot.start((ctx) => this.handleStart(ctx));
    bot.command('restaurantes', (ctx) => this.handleRestaurants(ctx));
    bot.on('callback_query', (ctx) => this.handleCallback(ctx));
    bot.use((ctx, next) => {
      if (ctx.message && 'text' in ctx.message) {
        return this.handleUnknownText(ctx);
      }
      return next();
    });
  }

  private startBot(): void {
    const bot = this.bot;
    if (!bot) return;

    this.logger.log('Telegram bot started with long polling');
    void bot.launch().catch((error: unknown) => {
      this.logger.error(
        'Unable to start Telegram bot. The API will remain available.',
        error instanceof Error ? error.stack : undefined,
      );
    });
  }

  private async ensureAllowed(
    ctx: Context,
    callback = false,
  ): Promise<boolean> {
    if (
      ctx.from &&
      this.appConfig.telegram.allowedUserIds.includes(ctx.from.id)
    ) {
      return true;
    }

    if (callback) {
      await ctx.answerCbQuery('No tienes permiso para usar este bot.', {
        show_alert: true,
      });
    } else {
      await ctx.reply('No tienes permiso para usar este bot.');
    }
    return false;
  }

  private getCallbackData(ctx: Context): string | undefined {
    const callbackQuery = ctx.callbackQuery;
    return callbackQuery && 'data' in callbackQuery
      ? callbackQuery.data
      : undefined;
  }

  private async replyRestaurantList(
    ctx: Context,
    restaurants: PaginatedResult<RestaurantListItem>,
    requestedPage: number,
  ): Promise<void> {
    await ctx.reply(
      restaurantListText(
        restaurants.total,
        requestedPage,
        restaurants.totalPages,
      ),
      restaurantListKeyboard(
        restaurants.data,
        requestedPage,
        restaurants.totalPages,
      ),
    );
  }

  private async editRestaurantList(
    ctx: Context,
    restaurants: PaginatedResult<RestaurantListItem>,
    requestedPage: number,
  ): Promise<void> {
    await ctx.editMessageText(
      restaurantListText(
        restaurants.total,
        requestedPage,
        restaurants.totalPages,
      ),
      restaurantListKeyboard(
        restaurants.data,
        requestedPage,
        restaurants.totalPages,
      ),
    );
  }
}

export function formatRestaurantMenu(
  restaurantName: string,
  profitSummary: RestaurantProfitSummary,
): string {
  return [
    restaurantName,
    `💵 Ganancia últimas 24 h: ${formatNumber(profitSummary.last24Hours)}`,
    `💵 Ganancia últimas 72 h: ${formatNumber(profitSummary.last72Hours)}`,
    `💵 Ganancia últimos 7 días: ${formatNumber(profitSummary.last7Days)}`,
  ].join('\n');
}

export function formatRestaurantStatistics(
  restaurantName: string,
  stats: RestaurantRun[],
  page: number,
  totalPages: number,
): string {
  if (!stats.length) {
    return `${restaurantName}\n\nAún no hay estadísticas resueltas para este restaurante. Sincronízalo desde la API antes de volver a consultar.`;
  }

  return [
    `${restaurantName} · Estadísticas (página ${page} de ${totalPages})`,
    '',
    '━━━━━━━━━━━━━━━━━━',
    ...stats.map((stat) => formatRestaurantStatistic(stat)),
  ].join('\n');
}

function formatRestaurantStatistic(stat: RestaurantRun): string {
  const ratingChange =
    stat.newRating === null
      ? 'Pendiente'
      : formatSignedNumber(stat.newRating - stat.rating);
  const profit =
    stat.revenue === null
      ? 'Pendiente'
      : formatNumber(stat.revenue - stat.cogs - stat.wages);
  return [
    `📅 ${formatDate(stat.datetime)}`,
    `⭐ Rating: ${formatNumber(stat.rating)}`,
    `📈 Cambio de rating: ${ratingChange}`,
    `👥 Ocupación: ${formatOccupancy(stat.occupancy)}`,
    `💵 Ganancia: ${profit}`,
    `🍽️ Precio de menú: ${formatNumber(stat.menuPrice)}`,
    '━━━━━━━━━━━━━━━━━━',
  ].join('\n');
}

function restaurantListText(
  total: number,
  page: number,
  totalPages: number,
): string {
  if (!total) return 'No hay restaurantes sincronizados todavía.';
  return `Elige un restaurante (página ${page + 1} de ${totalPages}).`;
}

function restaurantListKeyboard(
  restaurants: RestaurantListItem[],
  page: number,
  totalPages: number,
) {
  if (!restaurants.length) return undefined;
  const buttons = restaurants.map((restaurant) => [
    Markup.button.callback(
      truncateButtonLabel(`${restaurant.name} (lvl ${restaurant.size})`),
      `${RESTAURANT_CALLBACK_PREFIX}${restaurant.id}`,
    ),
  ]);
  const navigation: (typeof buttons)[number] = [];
  if (page > 0)
    navigation.push(
      Markup.button.callback(
        '‹ Anterior',
        `${RESTAURANTS_CALLBACK_PREFIX}${page - 1}`,
      ),
    );
  if (page < totalPages - 1)
    navigation.push(
      Markup.button.callback(
        'Siguiente ›',
        `${RESTAURANTS_CALLBACK_PREFIX}${page + 1}`,
      ),
    );
  if (navigation.length) buttons.push(navigation);
  return Markup.inlineKeyboard(buttons);
}

function restaurantMenuKeyboard(restaurantId: number) {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback(
        '📊 Ver estadísticas',
        `${RESTAURANT_STATS_CALLBACK_PREFIX}${restaurantId}:1`,
      ),
    ],
    [
      Markup.button.callback(
        '📌 Otras estadísticas',
        `${RESTAURANT_OTHER_STATS_CALLBACK_PREFIX}${restaurantId}`,
      ),
    ],
    [
      Markup.button.callback(
        '‹ Volver al listado',
        `${RESTAURANTS_CALLBACK_PREFIX}0`,
      ),
    ],
  ]);
}

function restaurantStatisticsKeyboard(
  restaurantId: number,
  page: number,
  totalPages: number,
) {
  const buttons: ReturnType<typeof Markup.button.callback>[][] = [];
  const navigation: ReturnType<typeof Markup.button.callback>[] = [];
  if (page > 1) {
    navigation.push(
      Markup.button.callback(
        '‹ Anterior',
        `${RESTAURANT_STATS_CALLBACK_PREFIX}${restaurantId}:${page - 1}`,
      ),
    );
  }
  if (page < totalPages) {
    navigation.push(
      Markup.button.callback(
        'Siguiente ›',
        `${RESTAURANT_STATS_CALLBACK_PREFIX}${restaurantId}:${page + 1}`,
      ),
    );
  }
  if (navigation.length) buttons.push(navigation);
  buttons.push([
    Markup.button.callback(
      '‹ Volver al menú',
      `${RESTAURANT_CALLBACK_PREFIX}${restaurantId}`,
    ),
  ]);
  buttons.push([
    Markup.button.callback(
      '‹ Volver al listado',
      `${RESTAURANTS_CALLBACK_PREFIX}0`,
    ),
  ]);
  return Markup.inlineKeyboard(buttons);
}

function parseRestaurantStatsCallback(
  callbackData: string,
): { restaurantId: number; page: number } | undefined {
  const [restaurantId, page] = callbackData
    .slice(RESTAURANT_STATS_CALLBACK_PREFIX.length)
    .split(':')
    .map(Number);
  if (
    !restaurantId ||
    !page ||
    !Number.isInteger(restaurantId) ||
    !Number.isInteger(page)
  ) {
    return undefined;
  }
  return { restaurantId, page };
}

function parsePositiveInteger(value: string): number | undefined {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : undefined;
}

function truncateButtonLabel(name: string): string {
  return name.length <= 64 ? name : `${name.slice(0, 61)}...`;
}

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat('es-ES', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/Havana',
    hour12: true,
  }).format(value);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('es-ES', {
    maximumFractionDigits: 2,
  }).format(value);
}

function formatSignedNumber(value: number): string {
  return `${value > 0 ? '+' : ''}${formatNumber(value)}`;
}

function formatOccupancy(value: number | null): string {
  if (value === null) return 'Pendiente';
  return `${formatNumber(value <= 1 ? value * 100 : value)} %`;
}
