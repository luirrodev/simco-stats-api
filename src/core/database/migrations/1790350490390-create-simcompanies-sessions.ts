import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSimCompaniesSessions1790350490390 implements MigrationInterface {
  name = 'CreateSimCompaniesSessions1790350490390';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "simcompanies_sessions" ("id" character varying(32) NOT NULL, "encrypted_cookie" text NOT NULL, "encryption_iv" character varying(24) NOT NULL, "encryption_tag" character varying(24) NOT NULL, "expires_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_simcompanies_sessions" PRIMARY KEY ("id"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "simcompanies_sessions"`);
  }
}
