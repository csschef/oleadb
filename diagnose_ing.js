import { db } from './database/db.js';

async function diagnose() {
    try {
        console.log("--- Master Ingredient (ID 761) ---");
        const master = await db.query("SELECT * FROM ingredient WHERE id = 761");
        console.log(JSON.stringify(master.rows, null, 2));

        console.log("\n--- Usage in Recipes ---");
        const usage = await db.query(`
            SELECT rs.recipe_id, rsi.ingredient_name, COUNT(*) 
            FROM recipe_step_ingredients rsi
            JOIN recipe_steps rs ON rsi.recipe_step_id = rs.id
            WHERE rsi.ingredient_name ILIKE '%Vitlök%'
            GROUP BY rs.recipe_id, rsi.ingredient_name
        `);
        console.log(JSON.stringify(usage.rows, null, 2));

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

diagnose();
