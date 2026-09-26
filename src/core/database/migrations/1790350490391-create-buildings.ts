import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateBuildings1790350490391 implements MigrationInterface {
  name = 'CreateBuildings1790350490391';
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "buildings" ("id" integer NOT NULL, "name" character varying(100) NOT NULL, "size" integer NOT NULL, "kind" character(1) NOT NULL, "category" character varying(50), "cost" integer, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_buildings" PRIMARY KEY ("id"))`,
    );
  }
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "buildings"`);
  }
}
