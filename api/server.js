console.log("SERVER FILE LOADED");

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from '../database/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(cors());
app.use(express.json());

// Serve static HTML/CSS/JS from public/
app.use(express.static(path.join(__dirname, '../public')));

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

/* ---------- UNIT SEARCH ---------- */
app.get('/units', async (req, res) => {
    const search = req.query.q;

    if (!search) {
        return res.json([]);
    }

    try {
        const result = await db.query(`
            SELECT id, name, abbreviation
            FROM unit
            WHERE name ILIKE '%' || $1 || '%'
               OR abbreviation ILIKE '%' || $1 || '%'
            ORDER BY name
            LIMIT 20
        `, [search]);

        res.json(result.rows);

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

/* ---------- GET ALL RECIPES ---------- */
app.get('/recipes', async (req, res) => {
    try {
        const recipes = await db.query(`
            SELECT r.id, r.name, r.description, r.servings, r.prep_time_minutes
            FROM recipe r
            ORDER BY r.created_at DESC
        `);

        // For each recipe, fetch its ingredients
        const recipeList = await Promise.all(recipes.rows.map(async (recipe) => {
            const ingredients = await db.query(`
                SELECT i.name AS ingredient_name, ri.amount, u.abbreviation AS unit
                FROM recipe_ingredient ri
                JOIN ingredient i ON i.id = ri.ingredient_id
                JOIN unit u ON u.id = ri.unit_id
                WHERE ri.recipe_id = $1
                ORDER BY i.name
            `, [recipe.id]);

            return { ...recipe, ingredients: ingredients.rows };
        }));

        res.json(recipeList);

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

/* ---------- GET SINGLE RECIPE ---------- */
app.get('/recipes/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const recipeResult = await db.query(`
            SELECT id, name, description, servings, prep_time_minutes
            FROM recipe
            WHERE id = $1
        `, [id]);

        if (recipeResult.rows.length === 0) {
            return res.status(404).json({ error: 'Recipe not found' });
        }

        const recipe = recipeResult.rows[0];

        const ingredients = await db.query(`
            SELECT i.name AS ingredient_name, ri.amount, u.abbreviation AS unit
            FROM recipe_ingredient ri
            JOIN ingredient i ON i.id = ri.ingredient_id
            JOIN unit u ON u.id = ri.unit_id
            WHERE ri.recipe_id = $1
            ORDER BY i.name
        `, [id]);

        res.json({ ...recipe, ingredients: ingredients.rows });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

/* ---------- CREATE RECIPE ---------- */
app.post('/recipes', async (req, res) => {
    const { name, description, servings, prep_time_minutes, ingredients } = req.body;

    if (!name || !ingredients || ingredients.length === 0) {
        return res.status(400).json({ error: 'Name and at least one ingredient required' });
    }

    const client = await db.connect();
    try {
        await client.query('BEGIN');

        const recipeResult = await client.query(`
            INSERT INTO recipe (name, description, servings, prep_time_minutes)
            VALUES ($1, $2, $3, $4)
            RETURNING id
        `, [name, description || null, servings || null, prep_time_minutes || null]);

        const recipeId = recipeResult.rows[0].id;

        for (const ing of ingredients) {
            await client.query(`
                INSERT INTO recipe_ingredient (recipe_id, ingredient_id, amount, unit_id)
                VALUES ($1, $2, $3, $4)
            `, [recipeId, ing.ingredient_id, ing.amount, ing.unit_id]);
        }

        await client.query('COMMIT');
        res.status(201).json({ id: recipeId });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    } finally {
        client.release();
    }
});

/* ---------- START SERVER ---------- */
app.listen(3000, () => {
    console.log('API running on http://localhost:3000');
});