import { MigrationInterface, QueryRunner } from "typeorm";

export class FixUserPlansDescription1749029147993 implements MigrationInterface {
    name = 'FixUserPlansDescription1749029147993'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Step 1: Create user_plans table if it doesn't exist
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "user_plans" (
                "id" SERIAL PRIMARY KEY,
                "name" varchar NOT NULL DEFAULT 'Plan Básico',
                "price" decimal(10,2) NOT NULL DEFAULT 0,
                "currency" varchar NOT NULL DEFAULT 'USD',
                "billing_cycle" varchar NOT NULL DEFAULT 'monthly',
                "features" json,
                "max_chatbots" integer NOT NULL DEFAULT 0,
                "max_messages_per_month" integer NOT NULL DEFAULT 1000,
                "whatsapp_integration" boolean NOT NULL DEFAULT true,
                "ai_responses" boolean NOT NULL DEFAULT false,
                "analytics" boolean NOT NULL DEFAULT false,
                "custom_branding" boolean NOT NULL DEFAULT false,
                "is_active" boolean NOT NULL DEFAULT true,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_user_plans_name" UNIQUE ("name")
            )
        `);

        // Step 2: Add description column as nullable first (in case it doesn't exist)
        await queryRunner.query(`ALTER TABLE "user_plans" ADD COLUMN IF NOT EXISTS "description" varchar`);

        // Step 3: Update all NULL values with a default value
        await queryRunner.query(`UPDATE "user_plans" SET "description" = 'Plan por defecto' WHERE "description" IS NULL`);

        // Step 4: Set the column as NOT NULL now that all values are filled
        await queryRunner.query(`ALTER TABLE "user_plans" ALTER COLUMN "description" SET NOT NULL`);

        // Step 5: Set default value for the column
        await queryRunner.query(`ALTER TABLE "user_plans" ALTER COLUMN "description" SET DEFAULT 'Plan estándar con funciones básicas'`);

        // Step 6: Insert default plans if the table is empty
        await queryRunner.query(`
            INSERT INTO "user_plans" (name, description, price, currency, billing_cycle, max_chatbots, max_messages_per_month, whatsapp_integration, ai_responses, analytics, custom_branding) 
            VALUES 
                ('Plan Básico', 'Plan básico con funcionalidades limitadas', 0, 'USD', 'monthly', 1, 1000, true, false, false, false),
                ('Plan Premium', 'Plan premium con todas las funcionalidades', 29.99, 'USD', 'monthly', 10, 10000, true, true, true, false),
                ('Plan Enterprise', 'Plan empresarial para grandes organizaciones', 99.99, 'USD', 'monthly', -1, -1, true, true, true, true)
            ON CONFLICT (name) DO NOTHING
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove the NOT NULL constraint from description
        await queryRunner.query(`ALTER TABLE "user_plans" ALTER COLUMN "description" DROP NOT NULL`);
        
        // Remove default value
        await queryRunner.query(`ALTER TABLE "user_plans" ALTER COLUMN "description" DROP DEFAULT`);
        
        // Optionally remove the column entirely
        // await queryRunner.query(`ALTER TABLE "user_plans" DROP COLUMN "description"`);
    }
} 