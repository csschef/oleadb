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

app.get('/recipes', async (req, res) => {
    const { q, categories, limit = 12, offset = 0 } = req.query;
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
        const catList = categories.split(',').map(id => parseInt(id)).filter(id => !isNaN(id));
        catList.forEach(id => {
            params.push(id);
            query += ` AND r.id IN (SELECT recipe_id FROM recipe_category_map WHERE category_id = $${params.length})`;
        });
    }

    query += ` ORDER BY r.created_at DESC`;

    // Add Pagination
    params.push(parseInt(limit));
    query += ` LIMIT $${params.length}`;
    params.push(parseInt(offset));
    query += ` OFFSET $${params.length}`;

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

        // Fetch hierarchical steps and their ingredients
        const stepsResult = await db.query(`
            SELECT id, title, instructions, sort_order
            FROM recipe_steps
            WHERE recipe_id = $1
            ORDER BY sort_order
        `, [id]);

        const steps = await Promise.all(stepsResult.rows.map(async (step) => {
            const ingredients = await db.query(`
                SELECT ingredient_name, amount, unit, sort_order
                FROM recipe_step_ingredients
                WHERE recipe_step_id = $1
                ORDER BY sort_order
            `, [step.id]);
            return {
                ...step,
                ingredients: ingredients.rows
            };
        }));

        // Fetch categories
        const recipeCategories = await db.query(`
            SELECT c.id, c.name, c.type
            FROM recipe_categories c
            JOIN recipe_category_map rcm ON c.id = rcm.category_id
            WHERE rcm.recipe_id = $1
        `, [id]);

        res.json({
            ...recipe,
            steps: steps,
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
    let { name, description, servings, prep_time_minutes, categories, steps } = req.body;

    try {
        if (typeof categories === 'string') categories = JSON.parse(categories);
        if (typeof steps === 'string') steps = JSON.parse(steps);
    } catch (e) {
        return res.status(400).json({ error: 'Invalid data format' });
    }

    if (!name || !steps || steps.length === 0) {
        return res.status(400).json({ error: 'Name and at least one step required' });
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

        // 2. Insert Category Maps
        if (categories && categories.length > 0) {
            for (const catId of categories) {
                await client.query(`
                    INSERT INTO recipe_category_map (recipe_id, category_id)
                    VALUES ($1, $2)
                `, [recipeId, catId]);
            }
        }

        // 3. Insert Steps and their Ingredients
        if (steps && steps.length > 0) {
            for (let i = 0; i < steps.length; i++) {
                const s = steps[i];
                const stepResult = await client.query(`
                    INSERT INTO recipe_steps (recipe_id, title, instructions, sort_order)
                    VALUES ($1, $2, $3, $4)
                    RETURNING id
                `, [recipeId, s.title || null, s.instructions || null, i + 1]);

                const stepId = stepResult.rows[0].id;

                if (s.ingredients && s.ingredients.length > 0) {
                    for (let j = 0; j < s.ingredients.length; j++) {
                        const ing = s.ingredients[j];
                        await client.query(`
                            INSERT INTO recipe_step_ingredients (recipe_step_id, ingredient_name, amount, unit, sort_order)
                            VALUES ($1, $2, $3, $4, $5)
                        `, [stepId, ing.name, ing.amount || null, ing.unit || null, j + 1]);
                    }
                }
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
    let { name, description, servings, prep_time_minutes, categories, steps } = req.body;

    try {
        if (typeof categories === 'string') categories = JSON.parse(categories);
        if (typeof steps === 'string') steps = JSON.parse(steps);
    } catch (e) {
        return res.status(400).json({ error: 'Invalid data format' });
    }

    if (!name || !steps || steps.length === 0) {
        return res.status(400).json({ error: 'Name and at least one step required' });
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

        // 2. Sync Categories
        await client.query('DELETE FROM recipe_category_map WHERE recipe_id = $1', [id]);
        if (categories && categories.length > 0) {
            for (const catId of categories) {
                await client.query(`
                    INSERT INTO recipe_category_map (recipe_id, category_id)
                    VALUES ($1, $2)
                `, [id, catId]);
            }
        }

        // 3. Sync Steps and Ingredients (Delete all steps, which casades to step_ingredients)
        await client.query('DELETE FROM recipe_steps WHERE recipe_id = $1', [id]);
        if (steps && steps.length > 0) {
            for (let i = 0; i < steps.length; i++) {
                const s = steps[i];
                const stepResult = await client.query(`
                    INSERT INTO recipe_steps (recipe_id, title, instructions, sort_order)
                    VALUES ($1, $2, $3, $4)
                    RETURNING id
                `, [id, s.title || null, s.instructions || null, i + 1]);

                const stepId = stepResult.rows[0].id;

                if (s.ingredients && s.ingredients.length > 0) {
                    for (let j = 0; j < s.ingredients.length; j++) {
                        const ing = s.ingredients[j];
                        await client.query(`
                            INSERT INTO recipe_step_ingredients (recipe_step_id, ingredient_name, amount, unit, sort_order)
                            VALUES ($1, $2, $3, $4, $5)
                        `, [stepId, ing.name, ing.amount || null, ing.unit || null, j + 1]);
                    }
                }
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

/* ---------- DELETE RECIPE ---------- */
app.delete('/recipes/:id', async (req, res) => {
    const { id } = req.params;

    try {
        await db.query('DELETE FROM recipe WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

/* ---------- START SERVER ---------- */
app.listen(3000, () => {
    console.log('API running on http://localhost:3000');
});