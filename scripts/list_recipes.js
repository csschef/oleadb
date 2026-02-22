import { db } from '../database/db.js';

async function list() {
    try {
        const res = await db.query('SELECT id, name, created_at FROM recipe ORDER BY created_at DESC LIMIT 5');
        console.log("--- RECENT RECIPES ---");
        res.rows.forEach(r => console.log(`[${r.id}] ${r.name} (${r.created_at})`));
    } catch (err) {
        console.error("List error:", err);
    } finally {
        await db.end();
    }
}
list();
