import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSaleOrdersTable1750017000000 implements MigrationInterface {
  name = 'AddSaleOrdersTable1750017000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "sale_orders" (
        "id" integer NOT NULL,
        "datetime" TIMESTAMP WITH TIME ZONE NOT NULL,
        "searchCost" integer NOT NULL,
        "resources" jsonb NOT NULL DEFAULT '[]',
        "qualityBonus" numeric(16,13),
        "speedBonus" numeric(10,6),
        "resolved" boolean NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "building_id" integer,
        CONSTRAINT "PK_ba301b7939d3333e8821ff92637" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "sale_orders" 
      ADD CONSTRAINT "FK_sale_orders_building_id" 
      FOREIGN KEY ("building_id") 
      REFERENCES "buildings"("id") 
      ON DELETE NO ACTION ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "sale_orders" 
      DROP CONSTRAINT "FK_sale_orders_building_id"
    `);

    await queryRunner.query(`DROP TABLE "sale_orders"`);
  }
}
