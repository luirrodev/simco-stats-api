import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DateTime } from 'luxon';
import {
  Between,
  EntityManager,
  In,
  IsNull,
  QueryFailedError,
  Repository,
} from 'typeorm';

import { BuildingEntity } from '@features/building/entities/building.entity';
import { RestaurantStatEntity } from '@features/restaurant-stats/entities/restaurant-stat.entity';
import {
  ACCOUNTING_CLOSURE_TIMEZONE,
  RESTAURANT_CYCLE_DURATION_MS,
} from '../accounting-closure.constants';
import { AccountingClosureEntity } from '../entities/accounting-closure.entity';

const RESTAURANT_KIND = 'r';

export interface AccountingPeriod {
  start: Date;
  end: Date;
}

export interface CreatedAccountingClosure {
  closure: AccountingClosureEntity;
  created: boolean;
}

export interface CorrectedAccountingClosure {
  closure: AccountingClosureEntity;
  addedRunCount: number;
  profitDelta: number;
  pphlDelta: number;
}

@Injectable()
export class AccountingClosureService {
  constructor(
    @InjectRepository(AccountingClosureEntity)
    private readonly closureRepository: Repository<AccountingClosureEntity>,
    @InjectRepository(BuildingEntity)
    private readonly buildingRepository: Repository<BuildingEntity>,
    @InjectRepository(RestaurantStatEntity)
    private readonly restaurantStatRepository: Repository<RestaurantStatEntity>,
  ) {}

  async createForPeriod(
    period: AccountingPeriod,
  ): Promise<CreatedAccountingClosure> {
    try {
      return await this.closureRepository.manager.transaction(
        async (manager) => {
          const closureRepository = manager.getRepository(AccountingClosureEntity);
          const existing = await closureRepository.findOneBy({
            periodEnd: period.end,
          });
          if (existing) return { closure: existing, created: false };

          const [restaurants, stats] = await Promise.all([
            manager.getRepository(BuildingEntity).countBy({ kind: RESTAURANT_KIND }),
            this.getResolvedRunsForPeriod(period, manager),
          ]);
          const summary = summarizeRuns(stats);
          const closure = await closureRepository.save(
            closureRepository.create({
              periodStart: period.start,
              periodEnd: period.end,
              operatingRestaurantCount: summary.restaurants,
              operatingLevelCount: summary.levels,
              totalProfit: summary.profit,
              pphl: toPphl(summary.profit, summary.levels),
              excludedRestaurantCount: Math.max(
                0,
                restaurants - summary.restaurants,
              ),
            }),
          );
          if (stats.length) {
            for (const stat of stats) stat.accountingClosure = closure;
            await manager.getRepository(RestaurantStatEntity).save(stats);
          }
          return { closure, created: true };
        },
      );
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      const closure = await this.closureRepository.findOneByOrFail({
        periodEnd: period.end,
      });
      return { closure, created: false };
    }
  }

  async getClosuresRequiringCorrection(
    restaurantId: number,
  ): Promise<number[]> {
    const stats = await this.restaurantStatRepository.find({
      where: {
        restaurantId,
        resolved: true,
        accountingClosure: IsNull(),
      },
    });
    const periodEnds = Array.from(
      new Set(
        stats
          .filter((stat) => stat.revenue !== null)
          .map((stat) =>
            getFirstAccountingPeriodEndAtOrAfter(
              new Date(stat.datetime.getTime() + RESTAURANT_CYCLE_DURATION_MS),
            ).getTime(),
          ),
      ),
    ).map((end) => new Date(end));
    if (!periodEnds.length) return [];
    const closures = await this.closureRepository.find({
      select: { id: true },
      where: { periodEnd: In(periodEnds) },
    });
    return closures.map((closure) => closure.id);
  }

  async correctClosure(
    closureId: number,
  ): Promise<CorrectedAccountingClosure | null> {
    return this.closureRepository.manager.transaction(async (manager) => {
      const closure = await manager.getRepository(AccountingClosureEntity).findOne({
        where: { id: closureId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!closure) return null;

      const stats = await this.getResolvedRunsForPeriod(
        { start: closure.periodStart, end: closure.periodEnd },
        manager,
      );
      const addedStats = stats.filter(
        (stat) => stat.accountingClosure === null,
      );
      if (!addedStats.length) return null;

      const summary = summarizeRuns(stats);
      const profitDelta = summary.profit - closure.totalProfit;
      const nextPphl = toPphl(summary.profit, summary.levels);
      const pphlDelta = nextPphl - closure.pphl;
      const restaurantCount = await manager
        .getRepository(BuildingEntity)
        .countBy({ kind: RESTAURANT_KIND });
      Object.assign(closure, {
        operatingRestaurantCount: summary.restaurants,
        operatingLevelCount: summary.levels,
        totalProfit: summary.profit,
        pphl: nextPphl,
        excludedRestaurantCount: Math.max(0, restaurantCount - summary.restaurants),
      });
      for (const stat of addedStats) stat.accountingClosure = closure;
      await Promise.all([
        manager.getRepository(RestaurantStatEntity).save(addedStats),
        manager.getRepository(AccountingClosureEntity).save(closure),
      ]);
      return { closure, addedRunCount: addedStats.length, profitDelta, pphlDelta };
    });
  }

  async getMissingPeriods(now: Date): Promise<AccountingPeriod[]> {
    const firstCycle = await this.getFirstResolvedCycleStart();
    if (!firstCycle) return [];

    const firstEnd = getFirstAccountingPeriodEndAtOrAfter(
      new Date(firstCycle.getTime() + RESTAURANT_CYCLE_DURATION_MS),
    );
    const lastEnd = getLastDueAccountingPeriodEnd(now);
    if (firstEnd > lastEnd) return [];

    const closures = await this.closureRepository.find({
      select: { periodEnd: true },
      where: { periodEnd: Between(firstEnd, lastEnd) },
    });
    const existingEnds = new Set(
      closures.map((closure) => closure.periodEnd.getTime()),
    );
    const periods: AccountingPeriod[] = [];
    for (
      let end = firstEnd;
      end <= lastEnd;
      end = getNextAccountingPeriodEnd(end)
    ) {
      if (!existingEnds.has(end.getTime())) {
        periods.push(getAccountingPeriodForEnd(end));
      }
    }
    return periods;
  }

  private getResolvedRunsForPeriod(
    period: AccountingPeriod,
    manager: EntityManager = this.restaurantStatRepository.manager,
  ): Promise<RestaurantStatEntity[]> {
    const cycleStart = new Date(
      period.start.getTime() - RESTAURANT_CYCLE_DURATION_MS,
    );
    const cycleEnd = new Date(
      period.end.getTime() - RESTAURANT_CYCLE_DURATION_MS,
    );
    return manager
      .getRepository(RestaurantStatEntity)
      .createQueryBuilder('stat')
      .leftJoinAndSelect('stat.accountingClosure', 'accountingClosure')
      .innerJoin(
        BuildingEntity,
        'restaurant',
        'restaurant.id = stat.restaurantId',
      )
      .where('restaurant.kind = :restaurantKind', {
        restaurantKind: RESTAURANT_KIND,
      })
      .andWhere('stat.resolved = true')
      .andWhere('stat.revenue IS NOT NULL')
      .andWhere('stat.datetime > :cycleStart')
      .andWhere('stat.datetime <= :cycleEnd')
      .setParameters({ cycleStart, cycleEnd })
      .getMany();
  }

  private async getFirstResolvedCycleStart(): Promise<Date | null> {
    const row = await this.restaurantStatRepository
      .createQueryBuilder('stat')
      .innerJoin(
        BuildingEntity,
        'restaurant',
        'restaurant.id = stat.restaurantId',
      )
      .select('MIN(stat.datetime)', 'firstCycleStart')
      .where('restaurant.kind = :restaurantKind', {
        restaurantKind: RESTAURANT_KIND,
      })
      .andWhere('stat.resolved = true')
      .andWhere('stat.revenue IS NOT NULL')
      .getRawOne<{ firstCycleStart: Date | string | null }>();
    return row?.firstCycleStart ? new Date(row.firstCycleStart) : null;
  }
}

function toPphl(profit: number, levels: number): number {
  return levels === 0 ? 0 : profit / 12 / levels;
}

export function getAccountingPeriod(now: Date): AccountingPeriod {
  return getAccountingPeriodForEnd(getLastDueAccountingPeriodEnd(now));
}

export function getAccountingPeriodForEnd(end: Date): AccountingPeriod {
  const localEnd = DateTime.fromJSDate(end, {
    zone: ACCOUNTING_CLOSURE_TIMEZONE,
  });
  return {
    start: localEnd.minus({ hours: 12 }).toUTC().toJSDate(),
    end: localEnd.toUTC().toJSDate(),
  };
}

export function getFirstAccountingPeriodEndAtOrAfter(date: Date): Date {
  const local = DateTime.fromJSDate(date, {
    zone: ACCOUNTING_CLOSURE_TIMEZONE,
  });
  const dayStart = local.startOf('day');
  const noon = dayStart.plus({ hours: 12 });
  if (local.toMillis() === dayStart.toMillis())
    return dayStart.toUTC().toJSDate();
  if (local <= noon) return noon.toUTC().toJSDate();
  return dayStart.plus({ days: 1 }).toUTC().toJSDate();
}

export function getLastDueAccountingPeriodEnd(now: Date): Date {
  const local = DateTime.fromJSDate(now, { zone: ACCOUNTING_CLOSURE_TIMEZONE });
  const dayStart = local.startOf('day');
  return (
    local >= dayStart.plus({ hours: 12 })
      ? dayStart.plus({ hours: 12 })
      : dayStart
  )
    .toUTC()
    .toJSDate();
}

export function getNextAccountingPeriodEnd(end: Date): Date {
  return DateTime.fromJSDate(end, { zone: ACCOUNTING_CLOSURE_TIMEZONE })
    .plus({ hours: 12 })
    .toUTC()
    .toJSDate();
}

export function summarizeRuns(stats: RestaurantStatEntity[]): {
  restaurants: number;
  levels: number;
  profit: number;
} {
  const perRestaurant = new Map<number, { levels: number; profit: number }>();
  for (const stat of stats) {
    const current = perRestaurant.get(stat.restaurantId) ?? {
      levels: stat.buildingSize,
      profit: 0,
    };
    current.levels = Math.max(current.levels, stat.buildingSize);
    current.profit += (stat.revenue ?? 0) - stat.cogs - stat.wages;
    perRestaurant.set(stat.restaurantId, current);
  }
  const summary = { restaurants: 0, levels: 0, profit: 0 };
  for (const stat of perRestaurant.values()) {
    summary.restaurants += 1;
    summary.levels += stat.levels;
    summary.profit += stat.profit;
  }
  return summary;
}

function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof QueryFailedError &&
    (error.driverError as { code?: string }).code === '23505'
  );
}
