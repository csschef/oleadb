console.log("SERVER FILE LOADED");

import express from 'express';
import cors from 'cors';
import { db } from '../database/db.js';

const app = express();
app.use(cors());
app.use(express.json());

/* ---------- TEST DB ---------- */
try {
    await db.query('SELECT 1');
    console.log("DB connected");
} catch (err) {
    console.error("DB FAILED", err);
}

/* ---------- INGREDIENT SEARCH ---------- */
app.get('/ingredients', async (req, res) => {
    const search = req.query.q;

    if (!search) {
        return res.json([]);
    }

    try {
        const result = await db.query(`
      SELECT id, name
      FROM ingredient
      WHERE name_normalized ILIKE '%' || $1 || '%'
      ORDER BY name
      LIMIT 20
    `, [search]);

        res.json(result.rows);

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

/* ---------- START SERVER ---------- */
app.listen(3000, () => {
    console.log('API running on http://localhost:3000');
});