import pkg from 'pg';
import { db } from '../database/db.js';

async function check() {
    try {
        console.log("--- DATABASE TABLES ---");
        const tables = await db.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        `);
        tables.rows.forEach(row => console.log(`- ${row.table_name}`));

        for (const table of tables.rows) {
            console.log(`\n--- SCHEMA: ${table.table_name} ---`);
            const columns = await db.query(`
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns
                WHERE table_name = $1
            `, [table.table_name]);
            columns.rows.forEach(c => console.log(`  ${c.column_name} (${c.data_type})${c.is_nullable === 'YES' ? '' : ' NOT NULL'}`));
        }

    } catch (err) {
        console.error("Error checking tables:", err);
    } finally {
        await db.end();
    }
}

check();
