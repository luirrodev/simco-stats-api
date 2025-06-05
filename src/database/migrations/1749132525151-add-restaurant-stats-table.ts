import { MigrationInterface, QueryRunner } from "typeorm";

export class AddRestaurantStatsTable1749132525151 implements MigrationInterface {
    name = 'AddRestaurantStatsTable1749132525151'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "restaurant_stats" ("id" integer NOT NULL, "datetime" TIMESTAMP WITH TIME ZONE NOT NULL, "rating" numeric(10,6) NOT NULL, "cogs" integer NOT NULL, "wages" integer NOT NULL, "resolved" boolean NOT NULL DEFAULT false, "menuPrice" numeric(10,2) NOT NULL, "occupancy" numeric(10,6), "revenue" integer, "newRating" numeric(10,6), "review" text, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_93953d3b523ff92869a2715292a" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "restaurant_stats"`);
    }

}
