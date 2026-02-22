console.log("SERVER FILE LOADED");

import express from 'express';
import cors from 'cors';
import path from 'path';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { db } from '../database/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(cors());
app.use(express.json());

// Serve static HTML/CSS/JS from project root
app.use(express.static(path.join(__dirname, '../')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Multer setup for image uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage });

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

/* ---------- CATEGORY LIST ---------- */
app.get('/categories', async (req, res) => {
    try {
        const result = await db.query('SELECT id, name, type FROM recipe_categories ORDER BY name');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

/* ---------- GET ALL RECIPES ---------- */
app.get('/recipes', async (req, res) => {
    const { q, categories } = req.query; // categories should be a comma-separated list of IDs
    let query = `
        SELECT DISTINCT r.id, r.name, r.description, r.servings, r.prep_time_minutes, r.image_url, r.created_at
        FROM recipe r
        LEFT JOIN recipe_category_map rcm ON r.id = rcm.recipe_id
        WHERE 1=1
    `;
    const params = [];

    if (q) {
        params.push(`%${q}%`);
        query += ` AND r.name ILIKE $${params.length}`;
    }

    if (categories) {
        const catList = categories.split(',').map(id => parseInt(id));
        catList.forEach(id => {
            params.push(id);
            query += ` AND r.id IN (SELECT recipe_id FROM recipe_category_map WHERE category_id = $${params.length})`;
        });
    }

    query += ` ORDER BY r.created_at DESC`;

    try {
        const recipes = await db.query(query, params);

        // For each recipe, fetch its categories
        const recipeList = await Promise.all(recipes.rows.map(async (recipe) => {
            const recipeCategories = await db.query(`
                SELECT c.id, c.name, c.type
                FROM recipe_categories c
                JOIN recipe_category_map rcm ON c.id = rcm.category_id
                WHERE rcm.recipe_id = $1
            `, [recipe.id]);

            return { ...recipe, categories: recipeCategories.rows };
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
            SELECT id, name, description, servings, prep_time_minutes, image_url
            FROM recipe
            WHERE id = $1
        `, [id]);

        if (recipeResult.rows.length === 0) {
            return res.status(404).json({ error: 'Recipe not found' });
        }

        const recipe = recipeResult.rows[0];

        // Fetch ingredients
        const ingredients = await db.query(`
            SELECT i.name AS ingredient_name, ri.amount, u.abbreviation AS unit, ri.ingredient_id, ri.unit_id
            FROM recipe_ingredient ri
            JOIN ingredient i ON i.id = ri.ingredient_id
            JOIN unit u ON u.id = ri.unit_id
            WHERE ri.recipe_id = $1
            ORDER BY i.name
        `, [id]);

        // Fetch instructions/steps
        const steps = await db.query(`
            SELECT step_number, instruction
            FROM recipe_step
            WHERE recipe_id = $1
            ORDER BY step_number
        `, [id]);

        // Fetch categories
        const recipeCategories = await db.query(`
            SELECT c.id, c.name, c.type
            FROM recipe_categories c
            JOIN recipe_category_map rcm ON c.id = rcm.category_id
            WHERE rcm.recipe_id = $1
        `, [id]);

        res.json({
            ...recipe,
            ingredients: ingredients.rows,
            steps: steps.rows,
            categories: recipeCategories.rows
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

/* ---------- CREATE RECIPE ---------- */
app.post('/recipes', upload.single('image'), async (req, res) => {
    // When using multer + FormData, JSON fields might be sent as strings
    let { name, description, servings, prep_time_minutes, ingredients, categories, steps } = req.body;

    try {
        if (typeof ingredients === 'string') ingredients = JSON.parse(ingredients);
        if (typeof categories === 'string') categories = JSON.parse(categories);
        if (typeof steps === 'string') steps = JSON.parse(steps);
    } catch (e) {
        return res.status(400).json({ error: 'Invalid data format' });
    }

    if (!name || !ingredients || ingredients.length === 0) {
        return res.status(400).json({ error: 'Name and at least one ingredient required' });
    }

    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

    const client = await db.connect();
    try {
        await client.query('BEGIN');

        // 1. Insert Recipe
        const recipeResult = await client.query(`
            INSERT INTO recipe (name, description, servings, prep_time_minutes, image_url)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id
        `, [name, description || null, servings || null, prep_time_minutes || null, imageUrl]);

        const recipeId = recipeResult.rows[0].id;

        // 2. Insert Ingredients
        for (const ing of ingredients) {
            await client.query(`
                INSERT INTO recipe_ingredient (recipe_id, ingredient_id, amount, unit_id)
                VALUES ($1, $2, $3, $4)
            `, [recipeId, ing.ingredient_id, ing.amount, ing.unit_id]);
        }

        // 3. Insert Category Maps
        if (categories && categories.length > 0) {
            for (const catId of categories) {
                await client.query(`
                    INSERT INTO recipe_category_map (recipe_id, category_id)
                    VALUES ($1, $2)
                `, [recipeId, catId]);
            }
        }

        // 4. Insert Steps
        if (steps && steps.length > 0) {
            for (const stepText of steps) {
                // step_number is handled by the DB trigger provided by the user
                await client.query(`
                    INSERT INTO recipe_step (recipe_id, instruction)
                    VALUES ($1, $2)
                `, [recipeId, stepText]);
            }
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

/* ---------- UPDATE RECIPE ---------- */
app.put('/recipes/:id', upload.single('image'), async (req, res) => {
    const { id } = req.params;
    let { name, description, servings, prep_time_minutes, ingredients, categories, steps } = req.body;

    try {
        if (typeof ingredients === 'string') ingredients = JSON.parse(ingredients);
        if (typeof categories === 'string') categories = JSON.parse(categories);
        if (typeof steps === 'string') steps = JSON.parse(steps);
    } catch (e) {
        return res.status(400).json({ error: 'Invalid data format' });
    }

    if (!name || !ingredients || ingredients.length === 0) {
        return res.status(400).json({ error: 'Name and at least one ingredient required' });
    }

    const client = await db.connect();
    try {
        await client.query('BEGIN');

        // 1. Update Basic Info
        let updateQuery = `
            UPDATE recipe 
            SET name = $1, description = $2, servings = $3, prep_time_minutes = $4
        `;
        const params = [name, description || null, servings || null, prep_time_minutes || null];

        if (req.file) {
            params.push(`/uploads/${req.file.filename}`);
            updateQuery += `, image_url = $${params.length}`;
        }

        params.push(id);
        updateQuery += ` WHERE id = $${params.length}`;
        await client.query(updateQuery, params);

        // 2. Sync Ingredients (Delete all, re-insert)
        await client.query('DELETE FROM recipe_ingredient WHERE recipe_id = $1', [id]);
        for (const ing of ingredients) {
            await client.query(`
                INSERT INTO recipe_ingredient (recipe_id, ingredient_id, amount, unit_id)
                VALUES ($1, $2, $3, $4)
            `, [id, ing.ingredient_id, ing.amount, ing.unit_id]);
        }

        // 3. Sync Categories
        await client.query('DELETE FROM recipe_category_map WHERE recipe_id = $1', [id]);
        if (categories && categories.length > 0) {
            for (const catId of categories) {
                await client.query(`
                    INSERT INTO recipe_category_map (recipe_id, category_id)
                    VALUES ($1, $2)
                `, [id, catId]);
            }
        }

        // 4. Sync Steps
        await client.query('DELETE FROM recipe_step WHERE recipe_id = $1', [id]);
        if (steps && steps.length > 0) {
            for (const stepText of steps) {
                await client.query(`
                    INSERT INTO recipe_step (recipe_id, instruction)
                    VALUES ($1, $2)
                `, [id, stepText]);
            }
        }

        await client.query('COMMIT');
        res.json({ success: true });

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