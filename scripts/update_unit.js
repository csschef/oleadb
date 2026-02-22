import { db } from '../database/db.js';

async function update() {
    try {
        await db.query('BEGIN');

        // 1. Update the unit definition to Smak / smak
        await db.query(`
            UPDATE unit 
            SET name = 'Smak', abbreviation = 'smak' 
            WHERE LOWER(name) = 'efter smak' OR LOWER(abbreviation) = 'efter smak'
        `);

        // 2. Update existing recipe ingredients to 'smak'
        await db.query(`
            UPDATE recipe_step_ingredients 
            SET unit = 'smak' 
            WHERE LOWER(unit) = 'efter smak'
        `);

        await db.query('COMMIT');
        console.log('Successfully updated unit variations to "smak"');
    } catch (e) {
        await db.query('ROLLBACK');
        console.error('Update failed:', e);
    } finally {
        await db.end();
    }
}

update();
