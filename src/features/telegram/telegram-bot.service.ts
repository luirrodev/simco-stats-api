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
import { BuildingEntity } from '@features/building/entities/building.entity';
import { BuildingService } from '@features/building/services/building.service';
import { RestaurantStatEntity } from '@features/restaurant-stats/entities/restaurant-stat.entity';
import { RestaurantStatsService } from '@features/restaurant-stats/services/restaurant-stats.service';

const RESTAURANTS_PER_PAGE = 8;
const RESTAURANT_CALLBACK_PREFIX = 'restaurant:';
const RESTAURANTS_CALLBACK_PREFIX = 'restaurants:';

@Injectable()
export class TelegramBotService implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(TelegramBotService.name);
  private bot?: Telegraf;

  constructor(
    private readonly buildingService: BuildingService,
    private readonly restaurantStatsService: RestaurantStatsService,
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
    void this.startBot();
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
    const restaurants = await this.buildingService.listRestaurantsForTelegram();
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
      const restaurants =
        await this.buildingService.listRestaurantsForTelegram();
      await ctx.answerCbQuery();
      await this.editRestaurantList(ctx, restaurants, page);
      return;
    }

    if (callbackData.startsWith(RESTAURANT_CALLBACK_PREFIX)) {
      const restaurantId = Number(
        callbackData.slice(RESTAURANT_CALLBACK_PREFIX.length),
      );
      if (!Number.isInteger(restaurantId) || restaurantId < 1) {
        await ctx.answerCbQuery('Restaurante inválido');
        return;
      }
      const stat =
        await this.restaurantStatsService.getLatestRestaurantStat(restaurantId);
      await ctx.answerCbQuery();
      await ctx.editMessageText(
        formatRestaurantStatistic(stat),
        backToListKeyboard(),
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
    restaurants: Pick<BuildingEntity, 'id' | 'name'>[],
    requestedPage: number,
  ): Promise<void> {
    const page = normalizePage(restaurants.length, requestedPage);
    await ctx.reply(
      restaurantListText(restaurants.length, page),
      restaurantListKeyboard(restaurants, page),
    );
  }

  private async editRestaurantList(
    ctx: Context,
    restaurants: Pick<BuildingEntity, 'id' | 'name'>[],
    requestedPage: number,
  ): Promise<void> {
    const page = normalizePage(restaurants.length, requestedPage);
    await ctx.editMessageText(
      restaurantListText(restaurants.length, page),
      restaurantListKeyboard(restaurants, page),
    );
  }
}

export function formatRestaurantStatistic(
  stat: RestaurantStatEntity | null,
): string {
  if (!stat) {
    return 'Aún no hay estadísticas sincronizadas para este restaurante. Sincronízalo desde la API antes de volver a consultar.';
  }

  const lines = [
    `📊 ${stat.restaurantName}`,
    `Última corrida: ${formatDate(stat.datetime)} UTC`,
    `Estado: ${stat.resolved ? 'Resuelta' : 'En curso'}`,
    `Rating inicial: ${formatNumber(stat.rating)}`,
    `Rating nuevo: ${
      stat.newRating === null ? 'Pendiente' : formatNumber(stat.newRating)
    }`,
    `Ocupación: ${formatOccupancy(stat.occupancy)}`,
    `Ingresos: ${stat.revenue === null ? 'Pendientes' : formatNumber(stat.revenue)}`,
    `Precio de menú: ${formatNumber(stat.menuPrice)}`,
    `COGS: ${formatNumber(stat.cogs)}`,
    `Salarios: ${formatNumber(stat.wages)}`,
    `Tamaño: ${formatNumber(stat.buildingSize)}`,
    `Restaurante de lujo: ${stat.buildingIsLuxury ? 'Sí' : 'No'}`,
  ];
  return lines.join('\n');
}

function restaurantListText(total: number, page: number): string {
  if (!total) return 'No hay restaurantes sincronizados todavía.';
  const totalPages = Math.ceil(total / RESTAURANTS_PER_PAGE);
  return `Elige un restaurante (página ${page + 1} de ${totalPages}).`;
}

function restaurantListKeyboard(
  restaurants: Pick<BuildingEntity, 'id' | 'name'>[],
  page: number,
) {
  if (!restaurants.length) return undefined;
  const totalPages = Math.ceil(restaurants.length / RESTAURANTS_PER_PAGE);
  const buttons = restaurants
    .slice(page * RESTAURANTS_PER_PAGE, (page + 1) * RESTAURANTS_PER_PAGE)
    .map((restaurant) => [
      Markup.button.callback(
        truncateButtonLabel(restaurant.name),
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

function backToListKeyboard() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback(
        '‹ Volver al listado',
        `${RESTAURANTS_CALLBACK_PREFIX}0`,
      ),
    ],
  ]);
}

function normalizePage(total: number, requestedPage: number): number {
  if (!total) return 0;
  return Math.min(
    Math.max(requestedPage, 0),
    Math.ceil(total / RESTAURANTS_PER_PAGE) - 1,
  );
}

function truncateButtonLabel(name: string): string {
  return name.length <= 64 ? name : `${name.slice(0, 61)}...`;
}

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat('es-ES', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'UTC',
  }).format(value);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('es-ES', {
    maximumFractionDigits: 2,
  }).format(value);
}

function formatOccupancy(value: number | null): string {
  if (value === null) return 'Pendiente';
  return `${formatNumber(value <= 1 ? value * 100 : value)} %`;
}
