import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNullableFieldsOnTableBuildings1749147331880 implements MigrationInterface {
    name = 'AddNullableFieldsOnTableBuildings1749147331880'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "buildings" ALTER COLUMN "kind" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "buildings" ALTER COLUMN "category" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "buildings" ALTER COLUMN "cost" DROP NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "buildings" ALTER COLUMN "cost" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "buildings" ALTER COLUMN "category" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "buildings" ALTER COLUMN "kind" SET NOT NULL`);
    }

}
