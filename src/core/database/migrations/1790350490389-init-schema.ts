import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitSchema1790350490389 implements MigrationInterface {
  name = 'InitSchema1790350490389';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."logs_level_enum" AS ENUM('log', 'debug', 'warn', 'error')`,
    );
    await queryRunner.query(
      `CREATE TABLE "logs" ("id" SERIAL NOT NULL, "request_id" uuid NOT NULL, "level" "public"."logs_level_enum" NOT NULL DEFAULT 'log', "message" text NOT NULL, "context" jsonb, "metadata" jsonb, "status_code" integer, "duration_ms" integer, "ip" character varying(45), "user_agent" text, "user_id" integer, "endpoint" character varying(255), "method" character varying(10), "error" jsonb, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_fb1b805f2f7795de79fa69340ba" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_8fc5bf83f19e36b61a21f1fd26" ON "logs" ("request_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_10d65a4fb56f62db29ed1b1459" ON "logs" ("level") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_70c2c3d40d9f661ac502de5134" ON "logs" ("user_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_52af00fa72eacc23a3a3b14c80" ON "logs" ("endpoint") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_0cea11b3443bee34697606c59c" ON "logs" ("created_at") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."audit_logs_operation_enum" AS ENUM('CREATE', 'UPDATE', 'DELETE')`,
    );
    await queryRunner.query(
      `CREATE TABLE "audit_logs" ("id" SERIAL NOT NULL, "request_id" uuid, "entity_name" character varying(100) NOT NULL, "entity_id" character varying(100) NOT NULL, "operation" "public"."audit_logs_operation_enum" NOT NULL, "user_id" integer, "changes" jsonb NOT NULL, "metadata" jsonb, "logged_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_1bb179d048bbc581caa3b013439" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_959054ba1c3ad6190ce3f7c754" ON "audit_logs" ("request_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_4057c4849108f6d6ccb77a4e91" ON "audit_logs" ("entity_name") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_1c56ddf7e5d110ceb2211a9555" ON "audit_logs" ("operation") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_bd2726fd31b35443f2245b93ba" ON "audit_logs" ("user_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6e8baed0edbeb9f1620f14ca0e" ON "audit_logs" ("logged_at") `,
    );
    await queryRunner.query(
      `CREATE TABLE "roles" ("id" SERIAL NOT NULL, "name" character varying(255) NOT NULL, "description" character varying(255), "version" integer NOT NULL DEFAULT '1', CONSTRAINT "UQ_648e3f5447f725579d7d4ffdfb7" UNIQUE ("name"), CONSTRAINT "PK_c1433d71a4838793a49dcad46ab" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."users_user_type_enum" AS ENUM('staff', 'customer')`,
    );
    await queryRunner.query(
      `CREATE TABLE "users" ("id" SERIAL NOT NULL, "email" character varying(255) NOT NULL, "password" character varying(255), "role_id" integer NOT NULL, "first_name" character varying(255) NOT NULL, "second_name" character varying(255), "last_name" character varying(255) NOT NULL, "second_last_name" character varying(255), "auth_provider" character varying(50) NOT NULL DEFAULT 'local', "user_type" "public"."users_user_type_enum" NOT NULL DEFAULT 'customer', "is_active" boolean NOT NULL DEFAULT true, "last_login_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "created_by" integer, "updated_by" integer, CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "auth_sessions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" integer NOT NULL, "user_agent" text, "ip" character varying(45), "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "revoked_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_641507381f32580e8479efc36cd" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "auth_refresh_tokens" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "session_id" uuid NOT NULL, "token_hash" character varying(255) NOT NULL, "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "used_at" TIMESTAMP WITH TIME ZONE, "revoked_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_df6893d2063a4ea7bbf1eda31e5" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "staff" ("user_id" integer NOT NULL, "employee_code" character varying(50), "department" character varying(100), CONSTRAINT "PK_cec9365d9fc3a3409158b645f2e" PRIMARY KEY ("user_id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "permissions" ("id" SERIAL NOT NULL, "name" character varying(255) NOT NULL, "description" character varying(255), CONSTRAINT "UQ_48ce552495d14eae9b187bb6716" UNIQUE ("name"), CONSTRAINT "PK_920331560282b8bd21bb02290df" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "roles_permissions" ("role_id" integer NOT NULL, "permission_id" integer NOT NULL, CONSTRAINT "PK_0cd11f0b35c4d348c6ebb9b36b7" PRIMARY KEY ("role_id", "permission_id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_7d2dad9f14eddeb09c256fea71" ON "roles_permissions" ("role_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_337aa8dba227a1fe6b73998307" ON "roles_permissions" ("permission_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "FK_a2cecd1a3531c0b041e29ba46e1" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "FK_f32b1cb14a9920477bcfd63df2c" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "FK_b75c92ef36f432fe68ec300a7d4" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "auth_sessions" ADD CONSTRAINT "FK_50ccaa6440288a06f0ba693ccc6" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "auth_refresh_tokens" ADD CONSTRAINT "FK_61b00011da0ac93bf960edcfc5b" FOREIGN KEY ("session_id") REFERENCES "auth_sessions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "staff" ADD CONSTRAINT "FK_cec9365d9fc3a3409158b645f2e" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "roles_permissions" ADD CONSTRAINT "FK_7d2dad9f14eddeb09c256fea719" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "roles_permissions" ADD CONSTRAINT "FK_337aa8dba227a1fe6b73998307b" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "roles_permissions" DROP CONSTRAINT "FK_337aa8dba227a1fe6b73998307b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "roles_permissions" DROP CONSTRAINT "FK_7d2dad9f14eddeb09c256fea719"`,
    );
    await queryRunner.query(
      `ALTER TABLE "staff" DROP CONSTRAINT "FK_cec9365d9fc3a3409158b645f2e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "auth_refresh_tokens" DROP CONSTRAINT "FK_61b00011da0ac93bf960edcfc5b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "auth_sessions" DROP CONSTRAINT "FK_50ccaa6440288a06f0ba693ccc6"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT "FK_b75c92ef36f432fe68ec300a7d4"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT "FK_f32b1cb14a9920477bcfd63df2c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT "FK_a2cecd1a3531c0b041e29ba46e1"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_337aa8dba227a1fe6b73998307"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_7d2dad9f14eddeb09c256fea71"`,
    );
    await queryRunner.query(`DROP TABLE "roles_permissions"`);
    await queryRunner.query(`DROP TABLE "permissions"`);
    await queryRunner.query(`DROP TABLE "staff"`);
    await queryRunner.query(`DROP TABLE "auth_refresh_tokens"`);
    await queryRunner.query(`DROP TABLE "auth_sessions"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TYPE "public"."users_user_type_enum"`);
    await queryRunner.query(`DROP TABLE "roles"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_6e8baed0edbeb9f1620f14ca0e"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_bd2726fd31b35443f2245b93ba"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_1c56ddf7e5d110ceb2211a9555"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_4057c4849108f6d6ccb77a4e91"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_959054ba1c3ad6190ce3f7c754"`,
    );
    await queryRunner.query(`DROP TABLE "audit_logs"`);
    await queryRunner.query(`DROP TYPE "public"."audit_logs_operation_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_0cea11b3443bee34697606c59c"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_52af00fa72eacc23a3a3b14c80"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_70c2c3d40d9f661ac502de5134"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_10d65a4fb56f62db29ed1b1459"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_8fc5bf83f19e36b61a21f1fd26"`,
    );
    await queryRunner.query(`DROP TABLE "logs"`);
    await queryRunner.query(`DROP TYPE "public"."logs_level_enum"`);
  }
}
