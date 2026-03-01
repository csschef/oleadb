// js/recipe.js
import { API, esc, initIcons, formatDate } from './shared.js';

let currentRecipe = null;
let baseServings = 1;
let currentServings = 1;

/* ─────────────────────────────────────
   UNIT DEFINITIONS
───────────────────────────────────── */
const UNIT_GROUPS = {
    volume: {
        units: [
            { id: 'krm', ratio: 1 },
            { id: 'tsk', ratio: 5 },
            { id: 'msk', ratio: 15 },
            { id: 'ml', ratio: 1 },
            { id: 'cl', ratio: 10 },
            { id: 'dl', ratio: 100 },
            { id: 'l', ratio: 1000 }
        ],
        findBest: (val) => {
            if (val >= 1000) return 'l';
            if (val >= 50) return 'dl';
            if (val >= 15) return 'msk';
            if (val >= 5) return 'tsk';
            return 'krm';
        }
    },
    weight: {
        units: [
            { id: 'g', ratio: 1 },
            { id: 'kg', ratio: 1000 }
        ],
        findBest: (val) => (val >= 1000 ? 'kg' : 'g')
    }
};

function getUnitGroup(unitName) {
    if (!unitName) return null;
    const name = unitName.toLowerCase();
    if (UNIT_GROUPS.volume.units.some(u => u.id === name)) return UNIT_GROUPS.volume;
    if (UNIT_GROUPS.weight.units.some(u => u.id === name)) return UNIT_GROUPS.weight;
    return null;
}

function formatAmount(num) {
    if (num % 1 === 0) return num.toString();

    const whole = Math.floor(num);
    const frac = num % 1;

    if (Math.abs(frac - 0.5) < 0.01) return (whole ? whole + ' ' : '') + '½';
    if (Math.abs(frac - 0.25) < 0.01) return (whole ? whole + ' ' : '') + '¼';
    if (Math.abs(frac - 0.75) < 0.01) return (whole ? whole + ' ' : '') + '¾';
    if (Math.abs(frac - 0.33) < 0.02) return (whole ? whole + ' ' : '') + '⅓';
    if (Math.abs(frac - 0.66) < 0.02) return (whole ? whole + ' ' : '') + '⅔';

    return num.toFixed(1).replace(/\.0$/, '');
}

function scaleIngredient(ing, newServings) {
    if (!ing.amount) {
        return esc(ing.unit || '');
    }

    const factor = newServings / baseServings;
    const rawAmount = parseFloat(String(ing.amount).replace(',', '.'));

    if (isNaN(rawAmount)) {
        return `${esc(ing.amount)} ${esc(ing.unit || '')}`.trim();
    }

    const amount = rawAmount * factor;
    const group = getUnitGroup(ing.unit);

    if (!group) return `${formatAmount(amount)} ${esc(ing.unit)}`;

    const baseUnit = group.units.find(u => u.id === ing.unit.toLowerCase());
    const baseValue = amount * (baseUnit ? baseUnit.ratio : 1);

    const bestUnitId = group.findBest(baseValue);
    const targetUnit = group.units.find(u => u.id === bestUnitId);
    const finalAmount = baseValue / targetUnit.ratio;

    return `${formatAmount(finalAmount)} ${bestUnitId}`;
}

/* ─────────────────────────────────────
   RENDER STEPS
───────────────────────────────────── */
function renderSteps() {
    const container = document.getElementById('step-groups-container');
    if (!container || !currentRecipe) return;

    const html = currentRecipe.steps.map((step) => `
        <div class="step-card">
            ${step.ingredients?.length ? `
                <div class="step-ingredients">
                    <h4>Ingredienser: ${step.title ? esc(step.title) : ''}</h4>
                    <ul class="ingredient-list-detail">
                        ${step.ingredients.map(i => `
                            <li>
                                <span class="ing-amount">
                                    ${scaleIngredient(i, currentServings)}
                                </span>
                                <span class="ing-name">${esc(i.ingredient_name)}</span>
                            </li>
                        `).join('')}
                    </ul>
                </div>
            ` : step.title ? `
                <div class="step-instructions step-title-only">
                    <h3 class="step-title">${esc(step.title)}</h3>
                </div>
            ` : ''}

            ${step.instructions ? `
                <div class="step-instructions">
                    <h4>Gör såhär:</h4>
                    ${step.instructions.split('\n').map((line, i) => `
                        <div class="instruction-line">
                            <div class="step-number">${i + 1}</div>
                            <div class="instruction-text">${esc(line)}</div>
                        </div>
                    `).join('')}
                </div>
            ` : ''}
        </div>
    `).join('');

    container.innerHTML = html;
    initIcons();
}

/* ─────────────────────────────────────
   SERVINGS
───────────────────────────────────── */
function changeServings(delta) {
    const newVal = currentServings + delta;
    if (newVal < 1) return;

    currentServings = newVal;

    const display = document.getElementById('servings-display');
    if (display) display.textContent = currentServings;

    renderSteps();
}

/* ─────────────────────────────────────
   ACTIONS
───────────────────────────────────── */
function renderActions() {
    const area = document.getElementById('recipe-actions-area');
    if (!area || !currentRecipe) return;

    area.innerHTML = `
        <a href="edit.html?id=${currentRecipe.id}" 
           class="btn btn-ghost btn-edit">
            <i data-lucide="pencil" class="icon-sm"></i>
        </a>
        <button class="btn btn-ghost btn-delete" 
                data-action="delete"
                title="Radera recept">
            <i data-lucide="trash-2" class="icon-md"></i>
        </button>
    `;

    area.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-action="delete"]');
        if (btn) showDeleteConfirm();
    });

    initIcons();
}

function showDeleteConfirm() {
    const actions = document.getElementById('recipe-actions-area');
    if (!actions) return;

    actions.innerHTML = `
        <div class="confirm-actions">
            <span class="confirm-label">Radera?</span>
            <button class="btn btn-ghost btn-confirm" data-action="confirm">
                Bekräfta
            </button>
            <button class="btn btn-ghost btn-abort" data-action="cancel">
                Avbryt
            </button>
        </div>
    `;

    actions.addEventListener('click', (e) => {
        const confirmBtn = e.target.closest('[data-action="confirm"]');
        const cancelBtn = e.target.closest('[data-action="cancel"]');

        if (confirmBtn) confirmDelete();
        if (cancelBtn) renderActions();
    });

    initIcons();
}

async function confirmDelete() {
    if (!currentRecipe) return;

    try {
        const res = await fetch(`${API}/recipes/${currentRecipe.id}`, {
            method: 'DELETE'
        });

        if (res.ok) {
            window.location.href = 'index.html';
        } else {
            alert('Gick inte att radera receptet.');
            renderActions();
        }
    } catch (err) {
        console.error(err);
        alert('Ett fel uppstod vid radering.');
        renderActions();
    }
}

/* ─────────────────────────────────────
   LOAD
───────────────────────────────────── */
async function load() {
    const el = document.getElementById('content');
    const id = new URLSearchParams(location.search).get('id');

    if (!id) {
        el.innerHTML = `
            <div class="empty-state">
                <p>Inget recept valt.</p>
            </div>
        `;
        return;
    }

    try {
        const res = await fetch(`${API}/recipes/${id}`);
        if (!res.ok) throw new Error('not found');

        const r = await res.json();
        currentRecipe = r;
        baseServings = r.servings || 1;
        currentServings = baseServings;

        document.title = `${r.name} - Receptsamling`;

        const ingredientCount = new Set(
            (r.steps || [])
                .flatMap(step => step.ingredients || [])
                .map(i => i.ingredient_name?.toLowerCase())
        ).size;

        el.className = 'recipe-detail';
        el.innerHTML = `
            ${r.image_url ? `
                <div class="hero-image">
                    <img src="${API}${r.image_url}" alt="${esc(r.name)}">
                </div>
            ` : ''}

            <div class="recipe-date">
                <i data-lucide="calendar" class="icon-xs"></i>
                Skapad: ${formatDate(r.created_at)}
            </div>

            <div class="chip-group">
                ${(r.categories || [])
                .map(c => `<span class="chip-mini">${esc(c.name)}</span>`)
                .join('')}
            </div>

            <h1 class="recipe-title">${esc(r.name)}</h1>

            <div class="meta">
                <div class="meta-info">
                    ${r.prep_time_minutes ? `
                        <span class="meta-item">
                            <i data-lucide="clock"></i>
                            ${r.prep_time_minutes} min
                        </span>
                    ` : ''}

                    ${ingredientCount ? `
                        <span class="meta-item">
                            <i data-lucide="list"></i>
                            ${ingredientCount} ingredienser
                        </span>
                    ` : ''}
                </div>

                <div class="meta-servings">
                    <div class="servings-control">
                        <button class="servings-btn" data-servings="-1">
                            <i data-lucide="minus" class="icon-sm"></i>
                        </button>
                        <span class="servings-text">
                            <span id="servings-display">${currentServings}</span> portioner
                        </span>
                        <button class="servings-btn" data-servings="1">
                            <i data-lucide="plus" class="icon-sm"></i>
                        </button>
                    </div>
                </div>
            </div>

            ${r.description ? `
                <p class="recipe-description">
                    ${esc(r.description)}
                </p>
            ` : ''}

            <div id="step-groups-container"></div>
        `;

        el.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-servings]');
            if (btn) {
                const delta = parseInt(btn.dataset.servings);
                changeServings(delta);
            }
        });

        renderActions();
        renderSteps();
        initIcons();

    } catch (err) {
        console.error(err);
        el.innerHTML = `
            <div class="empty-state">
                <p>Receptet hittades inte.</p>
            </div>
        `;
    }
}

load();