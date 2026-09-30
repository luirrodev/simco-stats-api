import {
  Inject,
  Injectable,
  Logger,
  OnApplicationShutdown,
  OnModuleInit,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { OnEvent } from '@nestjs/event-emitter';
import type { ConfigType } from '@nestjs/config';
import type { Queue } from 'bull';
import { Context, Markup, Telegraf } from 'telegraf';

import config from '@common/utils/config';
import {
  PaginatedResult,
  RestaurantListItem,
  RestaurantProfitSummary,
  RestaurantPortfolioOverview,
  RestaurantRun,
} from '@features/restaurant-insights/contracts/restaurant-insights.contract';
import { RestaurantInsightsService } from '@features/restaurant-insights/services/restaurant-insights.service';
import {
  RESTAURANT_SYNC_COMPLETED_EVENT,
  RESTAURANT_SYNC_FAILED_EVENT,
} from '@features/restaurant-stats/queues/restaurant-sync.constants';
import type {
  RestaurantSyncCompletedEvent,
  RestaurantSyncFailedEvent,
} from '@features/restaurant-stats/queues/restaurant-sync.constants';
import {
  ACCOUNTING_CLOSURE_COMPLETED_EVENT,
  ACCOUNTING_CLOSURE_CORRECTED_EVENT,
  ACCOUNTING_CLOSURE_TIMEZONE,
} from '@features/accounting-closures/accounting-closure.constants';
import type {
  AccountingClosureCompletedEvent,
  AccountingClosureCorrectedEvent,
} from '@features/accounting-closures/accounting-closure.constants';
import {
  TELEGRAM_NOTIFICATION_JOB,
  TELEGRAM_NOTIFICATION_MAX_ATTEMPTS,
  TELEGRAM_NOTIFICATION_QUEUE,
  TELEGRAM_NOTIFICATION_RETRY_DELAY_MS,
} from './telegram-notification.constants';
import type { TelegramNotificationJobData } from './telegram-notification.constants';

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
    @InjectQueue(TELEGRAM_NOTIFICATION_QUEUE)
    private readonly notificationQueue: Queue<TelegramNotificationJobData>,
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
    const [restaurants, portfolio] =
      await this.getRestaurantListPage(requestedPage);
    await this.replyRestaurantList(ctx, restaurants, portfolio, requestedPage);
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
      const [restaurants, portfolio] = await this.getRestaurantListPage(page);
      await ctx.answerCbQuery();
      await this.editRestaurantList(ctx, restaurants, portfolio, page);
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
      const keyboard = restaurantMenuKeyboard(restaurantId);
      await ctx.answerCbQuery();
      await ctx.editMessageText(
        formatRestaurantMenu(overview.restaurant.name, overview.profits),
        { parse_mode: 'HTML', reply_markup: keyboard.reply_markup },
      );
    }
  }

  async handleUnknownText(ctx: Context): Promise<void> {
    if (!(await this.ensureAllowed(ctx))) return;
    await ctx.reply('Usa /restaurantes para consultar las estadísticas.');
  }

  @OnEvent(RESTAURANT_SYNC_COMPLETED_EVENT)
  async handleRestaurantSyncCompleted(
    event: RestaurantSyncCompletedEvent,
  ): Promise<void> {
    if (!this.appConfig.telegram.enabled || !this.bot) return;

    try {
      const latest =
        await this.restaurantInsightsService.getLatestResolvedRestaurantRun(
          event.restaurantId,
        );
      if (!latest.stat) {
        this.logger.warn(
          `No resolved restaurant cycle is available for notification (${event.restaurantId})`,
        );
        return;
      }
      await this.enqueueForAllowedUsers(
        formatRestaurantSyncCompletedNotification(
          latest.restaurant.name,
          latest.stat,
        ),
        this.getNotificationId('completed', event),
      );
    } catch (error) {
      this.logNotificationError(
        `Unable to send completed synchronization notification for restaurant ${event.restaurantId}`,
        error,
      );
    }
  }

  @OnEvent(RESTAURANT_SYNC_FAILED_EVENT)
  async handleRestaurantSyncFailed(
    event: RestaurantSyncFailedEvent,
  ): Promise<void> {
    if (!this.appConfig.telegram.enabled || !this.bot) return;

    try {
      const latest =
        await this.restaurantInsightsService.getLatestResolvedRestaurantRun(
          event.restaurantId,
        );
      await this.enqueueForAllowedUsers(
        formatRestaurantSyncFailedNotification(
          latest.restaurant.name,
          event.attempts,
          event.errorMessage,
        ),
        this.getNotificationId('failed', event),
      );
    } catch (error) {
      this.logNotificationError(
        `Unable to send failed synchronization notification for restaurant ${event.restaurantId}`,
        error,
      );
    }
  }

  @OnEvent(ACCOUNTING_CLOSURE_COMPLETED_EVENT)
  async handleAccountingClosureCompleted(
    closure: AccountingClosureCompletedEvent,
  ): Promise<void> {
    if (!this.appConfig.telegram.enabled || !this.bot) return;

    try {
      await this.enqueueForAllowedUsers(
        formatAccountingClosureNotification(closure),
        `accounting-closure-${closure.periodEnd.getTime()}`,
      );
    } catch (error) {
      this.logNotificationError(
        `Unable to send accounting closure notification for ${closure.closureId}`,
        error,
      );
    }
  }

  @OnEvent(ACCOUNTING_CLOSURE_CORRECTED_EVENT)
  async handleAccountingClosureCorrected(
    closure: AccountingClosureCorrectedEvent,
  ): Promise<void> {
    if (!this.appConfig.telegram.enabled || !this.bot) return;

    try {
      await this.enqueueForAllowedUsers(
        formatAccountingClosureCorrectionNotification(closure),
        `accounting-closure-correction-${closure.closureId}-${closure.periodEnd.getTime()}`,
      );
    } catch (error) {
      this.logNotificationError(
        `Unable to send accounting closure correction for ${closure.closureId}`,
        error,
      );
    }
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

  async sendProactiveMessage(
    recipientId: number,
    message: string,
  ): Promise<void> {
    const bot = this.bot;
    if (!bot) throw new Error('Telegram bot is not initialized');
    await bot.telegram.sendMessage(recipientId, message, {
      parse_mode: 'HTML',
    });
  }

  private async enqueueForAllowedUsers(
    message: string,
    notificationId: string,
  ): Promise<void> {
    for (const userId of this.appConfig.telegram.allowedUserIds) {
      await this.notificationQueue.add(
        TELEGRAM_NOTIFICATION_JOB,
        { recipientId: userId, message },
        {
          jobId: `telegram-notification-${notificationId}-${userId}`,
          attempts: TELEGRAM_NOTIFICATION_MAX_ATTEMPTS,
          backoff: {
            type: 'fixed',
            delay: TELEGRAM_NOTIFICATION_RETRY_DELAY_MS,
          },
          removeOnComplete: true,
          removeOnFail: false,
        },
      );
    }
  }

  private getNotificationId(
    type: 'completed' | 'failed',
    event: RestaurantSyncCompletedEvent | RestaurantSyncFailedEvent,
  ): string {
    return `${type}-${event.restaurantId}-${new Date(event.cycleStartedAt).getTime()}`;
  }

  private logNotificationError(message: string, error: unknown): void {
    this.logger.error(
      message,
      error instanceof Error ? error.stack : String(error),
    );
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
    portfolio: RestaurantPortfolioOverview,
    requestedPage: number,
  ): Promise<void> {
    const keyboard = restaurantListKeyboard(
      restaurants.data,
      requestedPage,
      restaurants.totalPages,
    );
    await ctx.reply(
      formatRestaurantList(
        restaurants.total,
        requestedPage,
        restaurants.totalPages,
        portfolio.profits,
      ),
      restaurantListOptions(keyboard),
    );
  }

  private async editRestaurantList(
    ctx: Context,
    restaurants: PaginatedResult<RestaurantListItem>,
    portfolio: RestaurantPortfolioOverview,
    requestedPage: number,
  ): Promise<void> {
    const keyboard = restaurantListKeyboard(
      restaurants.data,
      requestedPage,
      restaurants.totalPages,
    );
    await ctx.editMessageText(
      formatRestaurantList(
        restaurants.total,
        requestedPage,
        restaurants.totalPages,
        portfolio.profits,
      ),
      restaurantListOptions(keyboard),
    );
  }

  private getRestaurantListPage(
    page: number,
  ): Promise<
    [PaginatedResult<RestaurantListItem>, RestaurantPortfolioOverview]
  > {
    const now = new Date();
    return Promise.all([
      this.restaurantInsightsService.listRestaurants({
        page: page + 1,
        limit: RESTAURANTS_PER_PAGE,
      }),
      this.restaurantInsightsService.getRestaurantPortfolioOverview(now),
    ]);
  }
}

export function formatRestaurantMenu(
  restaurantName: string,
  profitSummary: RestaurantProfitSummary,
): string {
  return [
    `🍽️ <b>${escapeHtml(restaurantName)}</b> 🍽️`,
    '━━━━━━━━━━━━━━━━━━',
    `⏱️ <b>Últimas 24 hrs:</b> $${formatNumber(profitSummary.last24Hours)}`,
    `🕒 <b>Últimas 72 hrs:</b> $${formatNumber(profitSummary.last72Hours)}`,
    `📅 <b>Últimos 7 días:</b> $${formatNumber(profitSummary.last7Days)}`,
    '━━━━━━━━━━━━━━━━━━',
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

export function formatRestaurantSyncCompletedNotification(
  restaurantName: string,
  stat: RestaurantRun,
): string {
  return [
    '✅ <b>Nuevo ciclo completado</b>',
    '',
    `🍽️ <b>${escapeHtml(restaurantName)}</b>`,
    '━━━━━━━━━━━━━━━━━━',
    formatRestaurantStatistic(stat),
  ].join('\n');
}

export function formatRestaurantSyncFailedNotification(
  restaurantName: string,
  attempts: number,
  errorMessage: string,
): string {
  return [
    '⚠️ <b>Sincronización fallida</b>',
    '',
    `🍽️ <b>${escapeHtml(restaurantName)}</b>`,
    `No se pudo sincronizar tras ${attempts} intentos.`,
    `Error: ${escapeHtml(errorMessage)}`,
  ].join('\n');
}

export function formatAccountingClosureNotification(
  closure: AccountingClosureCompletedEvent,
): string {
  return [
    '📒 <b>Cierre contable de restaurantes</b>',
    '',
    `📅 <b>Período:</b> ${formatAccountingPeriod(closure.periodStart, closure.periodEnd)}`,
    '━━━━━━━━━━━━━━━━━━',
    `🍽️ <b>Restaurantes operativos:</b> ${formatNumber(closure.operatingRestaurantCount)}`,
    `🏢 <b>Niveles operativos:</b> ${formatNumber(closure.operatingLevelCount)}`,
    `💵 <b>Profit total:</b> $${formatNumber(closure.totalProfit)}`,
    `⏱️ <b>PPHL:</b> $${formatNumber(closure.pphl)}`,
    `⚠️ <b>Sin ciclo disponible:</b> ${formatNumber(closure.excludedRestaurantCount)}`,
  ].join('\n');
}

export function formatAccountingClosureCorrectionNotification(
  closure: AccountingClosureCorrectedEvent,
): string {
  return [
    '📝 <b>Cierre contable corregido</b>',
    '',
    `📅 <b>Período:</b> ${formatAccountingPeriod(closure.periodStart, closure.periodEnd)}`,
    `➕ <b>Ciclos añadidos:</b> ${formatNumber(closure.addedRunCount)}`,
    '━━━━━━━━━━━━━━━━━━',
    `💵 <b>Profit total:</b> $${formatNumber(closure.totalProfit)} (${formatSignedNumber(closure.profitDelta)})`,
    `⏱️ <b>PPHL:</b> $${formatNumber(closure.pphl)} (${formatSignedNumber(closure.pphlDelta)})`,
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

function formatAccountingPeriod(start: Date, end: Date): string {
  const formatter = new Intl.DateTimeFormat('es-CU', {
    timeZone: ACCOUNTING_CLOSURE_TIMEZONE,
    dateStyle: 'short',
    timeStyle: 'short',
  });
  return `${formatter.format(start)} — ${formatter.format(end)}`;
}

function formatRestaurantList(
  total: number,
  page: number,
  totalPages: number,
  profits: RestaurantProfitSummary,
): string {
  const listText = total
    ? `Elige un restaurante (página ${page + 1} de ${totalPages}).`
    : 'No hay restaurantes sincronizados todavía.';
  return [
    '🍽️ <b>Ganancias generales</b> 🍽️',
    '━━━━━━━━━━━━━━━━━━',
    `⏱️ <b>Últimas 24 hrs:</b> $${formatNumber(profits.last24Hours)}`,
    `🕒 <b>Últimas 72 hrs:</b> $${formatNumber(profits.last72Hours)}`,
    `📅 <b>Últimos 7 días:</b> $${formatNumber(profits.last7Days)}`,
    '━━━━━━━━━━━━━━━━━━',
    '',
    listText,
  ].join('\n');
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

function restaurantListOptions(
  keyboard: ReturnType<typeof restaurantListKeyboard>,
) {
  return keyboard
    ? { parse_mode: 'HTML' as const, reply_markup: keyboard.reply_markup }
    : { parse_mode: 'HTML' as const };
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

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return entities[character];
  });
}

function formatSignedNumber(value: number): string {
  return `${value > 0 ? '+' : ''}${formatNumber(value)}`;
}

function formatOccupancy(value: number | null): string {
  if (value === null) return 'Pendiente';
  return `${formatNumber(value <= 1 ? value * 100 : value)} %`;
}
