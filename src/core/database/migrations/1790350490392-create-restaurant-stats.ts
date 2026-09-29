import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRestaurantStats1790350490392 implements MigrationInterface {
  name = 'CreateRestaurantStats1790350490392';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "restaurant_stats" ("id" integer NOT NULL, "restaurant_id" integer NOT NULL, "restaurant_name" character varying(100) NOT NULL, "building_id" integer, "datetime" TIMESTAMP WITH TIME ZONE NOT NULL, "rating" numeric(16,12) NOT NULL, "cogs" integer NOT NULL, "wages" integer NOT NULL, "resolved" boolean NOT NULL DEFAULT false, "menu_price" numeric(12,2) NOT NULL, "building_size" integer NOT NULL, "building_is_luxury" boolean NOT NULL, "occupancy" numeric(16,12), "revenue" integer, "new_rating" numeric(16,12), "review" text, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_restaurant_stats" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_restaurant_stats_restaurant_id" ON "restaurant_stats" ("restaurant_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_restaurant_stats_restaurant_id_datetime" ON "restaurant_stats" ("restaurant_id", "datetime")`,
    );
    await queryRunner.query(
      `ALTER TABLE "restaurant_stats" ADD CONSTRAINT "FK_restaurant_stats_building" FOREIGN KEY ("building_id") REFERENCES "buildings"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "restaurant_stats" DROP CONSTRAINT "FK_restaurant_stats_building"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_restaurant_stats_restaurant_id_datetime"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_restaurant_stats_restaurant_id"`,
    );
    await queryRunner.query(`DROP TABLE "restaurant_stats"`);
  }
}
