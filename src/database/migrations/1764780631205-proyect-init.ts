import { MigrationInterface, QueryRunner } from "typeorm";

export class ProyectInit1764780631205 implements MigrationInterface {
    name = 'ProyectInit1764780631205'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "users" ("id" SERIAL NOT NULL, "email" character varying(255) NOT NULL, "password" character varying(255) NOT NULL, "role" character varying(255) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "restaurant_stats" ("id" integer NOT NULL, "datetime" TIMESTAMP WITH TIME ZONE NOT NULL, "rating" numeric(10,6) NOT NULL, "cogs" integer NOT NULL, "wages" integer NOT NULL, "resolved" boolean NOT NULL DEFAULT false, "menuPrice" numeric(10,2) NOT NULL, "occupancy" numeric(10,6), "revenue" integer, "newRating" numeric(10,6), "review" text, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "building_id" integer, CONSTRAINT "PK_93953d3b523ff92869a2715292a" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "buildings" ("id" integer NOT NULL, "name" character varying(100) NOT NULL, "size" integer NOT NULL, "kind" character, "category" character varying(50), "cost" integer, "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_bc65c1acce268c383e41a69003a" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "sale_orders" ("id" integer NOT NULL, "datetime" TIMESTAMP WITH TIME ZONE NOT NULL, "searchCost" integer NOT NULL, "resources" jsonb NOT NULL DEFAULT '[]', "qualityBonus" numeric(16,13), "speedBonus" numeric(10,6), "resolved" boolean NOT NULL DEFAULT false, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "building_id" integer, CONSTRAINT "PK_ba301b7939d3333e8821ff92637" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "tokens" ("id" SERIAL NOT NULL, "cookie" text NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_3001e89ada36263dabf1fb6210a" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "restaurant_stats" ADD CONSTRAINT "FK_efa5c5c9862cef6d34295fe0f39" FOREIGN KEY ("building_id") REFERENCES "buildings"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "sale_orders" ADD CONSTRAINT "FK_6bae432b1381145fd7313c80d9c" FOREIGN KEY ("building_id") REFERENCES "buildings"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "sale_orders" DROP CONSTRAINT "FK_6bae432b1381145fd7313c80d9c"`);
        await queryRunner.query(`ALTER TABLE "restaurant_stats" DROP CONSTRAINT "FK_efa5c5c9862cef6d34295fe0f39"`);
        await queryRunner.query(`DROP TABLE "tokens"`);
        await queryRunner.query(`DROP TABLE "sale_orders"`);
        await queryRunner.query(`DROP TABLE "buildings"`);
        await queryRunner.query(`DROP TABLE "restaurant_stats"`);
        await queryRunner.query(`DROP TABLE "users"`);
    }

}
