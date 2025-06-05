import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBuildingRelationshipToRestaurantStats1749148491529
  implements MigrationInterface
{
  name = 'AddBuildingRelationshipToRestaurantStats1749148491529';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "restaurant_stats" ADD "building_id" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "restaurant_stats" ADD CONSTRAINT "FK_efa5c5c9862cef6d34295fe0f39" FOREIGN KEY ("building_id") REFERENCES "buildings"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "restaurant_stats" DROP CONSTRAINT "FK_efa5c5c9862cef6d34295fe0f39"`,
    );
    await queryRunner.query(
      `ALTER TABLE "restaurant_stats" DROP COLUMN "building_id"`,
    );
  }
}
