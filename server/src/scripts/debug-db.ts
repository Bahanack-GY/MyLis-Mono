
import { Sequelize } from 'sequelize-typescript';

const sequelize = new Sequelize({
    dialect: 'postgres',
    host: 'localhost',
    port: 5432,
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_DATABASE || 'mylisapp_db',
});

async function checkSchema() {
    try {
        await sequelize.authenticate();
        console.log('Connection has been established successfully.');
        await sequelize.query(`
            ALTER TABLE "Positions" DROP COLUMN "departmentId";
        `);
        console.log('Dropped departmentId column');
    } catch (error) {
        console.error('Unable to connect to the database:', error);
    } finally {
        await sequelize.close();
    }
}

checkSchema();
