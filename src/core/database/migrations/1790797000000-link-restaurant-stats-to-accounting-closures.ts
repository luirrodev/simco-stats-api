import { MigrationInterface, QueryRunner } from 'typeorm';

export class LinkRestaurantStatsToAccountingClosures1790797000000
  implements MigrationInterface
{
  name = 'LinkRestaurantStatsToAccountingClosures1790797000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "restaurant_stats" ADD "accounting_closure_id" integer`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_restaurant_stats_accounting_closure_id" ON "restaurant_stats" ("accounting_closure_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "restaurant_stats" ADD CONSTRAINT "FK_restaurant_stats_accounting_closure" FOREIGN KEY ("accounting_closure_id") REFERENCES "cierres_contables"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "cierres_contables" ADD "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(`DELETE FROM "cierres_contables"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "cierres_contables" DROP COLUMN "updated_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "restaurant_stats" DROP CONSTRAINT "FK_restaurant_stats_accounting_closure"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_restaurant_stats_accounting_closure_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "restaurant_stats" DROP COLUMN "accounting_closure_id"`,
    );
  }
}
