import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBuildingsTable1749147140006 implements MigrationInterface {
  name = 'AddBuildingsTable1749147140006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "buildings" ("id" integer NOT NULL, "kind" character NOT NULL, "category" character varying(50) NOT NULL, "name" character varying(100) NOT NULL, "cost" integer NOT NULL, "size" integer NOT NULL, "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_bc65c1acce268c383e41a69003a" PRIMARY KEY ("id"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "buildings"`);
  }
}
