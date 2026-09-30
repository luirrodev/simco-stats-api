import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAccountingClosures1790794723037 implements MigrationInterface {
  name = 'CreateAccountingClosures1790794723037';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "restaurant_stats" DROP CONSTRAINT "FK_restaurant_stats_building"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_restaurant_stats_restaurant_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_restaurant_stats_restaurant_id_datetime"`,
    );
    await queryRunner.query(
      `CREATE TABLE "cierres_contables" ("id" SERIAL NOT NULL, "period_start" TIMESTAMP WITH TIME ZONE NOT NULL, "period_end" TIMESTAMP WITH TIME ZONE NOT NULL, "executed_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "operating_restaurant_count" integer NOT NULL, "operating_level_count" integer NOT NULL, "total_profit" numeric(18,2) NOT NULL, "pphl" numeric(18,2) NOT NULL, "excluded_restaurant_count" integer NOT NULL, CONSTRAINT "PK_f887ff5b96af49764e5bea6720a" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_7865f374f661ba4dac56b18670" ON "cierres_contables" ("period_end") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_b4bb11ee22cdd628e63cec0895" ON "restaurant_stats" ("restaurant_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_599f01dd58a78390e8c458d31a" ON "restaurant_stats" ("restaurant_id", "datetime") `,
    );
    await queryRunner.query(
      `ALTER TABLE "restaurant_stats" ADD CONSTRAINT "FK_efa5c5c9862cef6d34295fe0f39" FOREIGN KEY ("building_id") REFERENCES "buildings"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "restaurant_stats" DROP CONSTRAINT "FK_efa5c5c9862cef6d34295fe0f39"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_599f01dd58a78390e8c458d31a"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_b4bb11ee22cdd628e63cec0895"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_7865f374f661ba4dac56b18670"`,
    );
    await queryRunner.query(`DROP TABLE "cierres_contables"`);
    await queryRunner.query(
      `CREATE INDEX "IDX_restaurant_stats_restaurant_id_datetime" ON "restaurant_stats" ("datetime", "restaurant_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_restaurant_stats_restaurant_id" ON "restaurant_stats" ("restaurant_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "restaurant_stats" ADD CONSTRAINT "FK_restaurant_stats_building" FOREIGN KEY ("building_id") REFERENCES "buildings"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }
}
