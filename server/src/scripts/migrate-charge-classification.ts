/**
 * Migration: Replace expense.category with chargeFamily + chargeNature + source
 *
 * Run with: npx ts-node -r tsconfig-paths/register src/scripts/migrate-charge-classification.ts
 */

import { Sequelize } from 'sequelize';
import * as dotenv from 'dotenv';

dotenv.config();

async function migrate() {
    const sequelize = new Sequelize({
        dialect: 'postgres',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        username: process.env.DB_USERNAME || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        database: process.env.DB_DATABASE || 'mylisapp_db',
        logging: console.log,
    });

    try {
        await sequelize.authenticate();
        console.log('Connected to database.');

        // 1. Add new columns (nullable for migration)
        await sequelize.query(`ALTER TABLE expenses ADD COLUMN IF NOT EXISTS "chargeFamily" VARCHAR(100)`);
        await sequelize.query(`ALTER TABLE expenses ADD COLUMN IF NOT EXISTS "chargeNature" VARCHAR(200)`);
        await sequelize.query(`ALTER TABLE expenses ADD COLUMN IF NOT EXISTS source VARCHAR(20) DEFAULT 'MANUAL'`);

        console.log('New columns added.');

        // 2. Create charge_nature_configs table
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS charge_nature_configs (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                "chargeFamily" VARCHAR(100) NOT NULL,
                "natureName" VARCHAR(200) NOT NULL,
                "syscohadaAccount" VARCHAR(10) NOT NULL,
                "isSystem" BOOLEAN NOT NULL DEFAULT FALSE,
                "sortOrder" INTEGER NOT NULL DEFAULT 0,
                "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                UNIQUE("chargeFamily", "natureName")
            )
        `);
        console.log('charge_nature_configs table created.');

        // 3. Migrate existing expense category data
        const mappings: Array<{ where: string; family: string; nature: string; source?: string }> = [
            { where: `category = 'Salaire'`,           family: 'CHARGES_PERSONNEL',            nature: 'Salaires bruts',                       source: 'PAYROLL' },
            { where: `category = 'Avance sur salaire'`, family: 'CHARGES_PERSONNEL',            nature: 'Avances sur salaire',                   source: 'PAYROLL' },
            { where: `category = 'Loyer'`,              family: 'CHARGES_STRUCTURE',            nature: 'Loyers & charges locatives'             },
            { where: `category = 'Facture'`,            family: 'CHARGES_FINANCIERES_FISCALES', nature: 'Frais bancaires'                        },
            { where: `category = 'Fourniture'`,         family: 'CHARGES_OPERATIONNELLES',      nature: 'Fournitures de bureau'                  },
            { where: `category = 'Licence/Logiciel'`,   family: 'CHARGES_OPERATIONNELLES',      nature: 'Licences & abonnements'                },
            { where: `category = 'Demande'`,            family: 'CHARGES_OPERATIONNELLES',      nature: 'Produits consommables'                  },
        ];

        for (const m of mappings) {
            const src = m.source ? `'${m.source}'` : `'MANUAL'`;
            await sequelize.query(
                `UPDATE expenses SET "chargeFamily" = '${m.family}', "chargeNature" = '${m.nature}', source = ${src} WHERE ${m.where} AND "chargeFamily" IS NULL`,
            );
            console.log(`Migrated: ${m.where}`);
        }

        // Fallback for anything remaining (category = 'Autre' or unmapped)
        await sequelize.query(`
            UPDATE expenses
            SET "chargeFamily" = 'CHARGES_OPERATIONNELLES',
                "chargeNature" = 'Fournitures de bureau',
                source = 'MANUAL'
            WHERE "chargeFamily" IS NULL
        `);
        console.log('Migrated remaining (fallback).');

        // 4. Drop old category column
        await sequelize.query(`ALTER TABLE expenses DROP COLUMN IF EXISTS category`);
        console.log('Dropped category column.');

        // 5. Add NOT NULL constraints
        await sequelize.query(`ALTER TABLE expenses ALTER COLUMN "chargeFamily" SET NOT NULL`);
        await sequelize.query(`ALTER TABLE expenses ALTER COLUMN "chargeNature" SET NOT NULL`);
        await sequelize.query(`ALTER TABLE expenses ALTER COLUMN source SET NOT NULL`);
        console.log('NOT NULL constraints applied.');

        // 6. Add indexes
        await sequelize.query(`CREATE INDEX IF NOT EXISTS expenses_charge_family_idx ON expenses ("chargeFamily")`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS expenses_charge_nature_idx ON expenses ("chargeNature")`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS expenses_charge_family_date_idx ON expenses ("chargeFamily", date)`);
        console.log('Indexes created.');

        console.log('\n✓ Migration completed successfully.');
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    } finally {
        await sequelize.close();
    }
}

migrate();
