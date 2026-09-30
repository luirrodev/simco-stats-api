import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DateTime } from 'luxon';
import { Between, QueryFailedError, Repository } from 'typeorm';

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
    const existing = await this.closureRepository.findOneBy({
      periodEnd: period.end,
    });
    if (existing) return { closure: existing, created: false };

    const [restaurants, stats] = await Promise.all([
      this.buildingRepository.countBy({ kind: RESTAURANT_KIND }),
      this.getResolvedRunsForPeriod(period),
    ]);
    const summary = summarizeRuns(stats);
    const entity = this.closureRepository.create({
      periodStart: period.start,
      periodEnd: period.end,
      operatingRestaurantCount: summary.restaurants,
      operatingLevelCount: summary.levels,
      totalProfit: summary.profit,
      pphl: summary.levels === 0 ? 0 : summary.profit / 12 / summary.levels,
      excludedRestaurantCount: Math.max(0, restaurants - summary.restaurants),
    });

    try {
      return {
        closure: await this.closureRepository.save(entity),
        created: true,
      };
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      const closure = await this.closureRepository.findOneByOrFail({
        periodEnd: period.end,
      });
      return { closure, created: false };
    }
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
  ): Promise<RestaurantStatEntity[]> {
    const cycleStart = new Date(
      period.start.getTime() - RESTAURANT_CYCLE_DURATION_MS,
    );
    const cycleEnd = new Date(
      period.end.getTime() - RESTAURANT_CYCLE_DURATION_MS,
    );
    return this.restaurantStatRepository
      .createQueryBuilder('stat')
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
