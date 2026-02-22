const API = `http://${window.location.hostname}:3000`;
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

let currentRecipe = null;
let baseServings = 1;
let currentServings = 1;

/* ── UNIT DEFINITIONS ── */
const UNIT_GROUPS = {
    volume: {
        units: [
            { id: 'krm', name: 'krm', ratio: 1 },
            { id: 'tsk', name: 'tsk', ratio: 5 },
            { id: 'msk', name: 'msk', ratio: 15 },
            { id: 'ml', name: 'ml', ratio: 1 },
            { id: 'cl', name: 'cl', ratio: 10 },
            { id: 'dl', name: 'dl', ratio: 100 },
            { id: 'l', name: 'l', ratio: 1000 }
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
            { id: 'g', name: 'g', ratio: 1 },
            { id: 'kg', name: 'kg', ratio: 1000 }
        ],
        findBest: (val) => (val >= 1000 ? 'kg' : 'g')
    }
};

function getUnitGroup(unitName) {
    const name = unitName.toLowerCase();
    if (UNIT_GROUPS.volume.units.some(u => u.id === name)) return UNIT_GROUPS.volume;
    if (UNIT_GROUPS.weight.units.some(u => u.id === name)) return UNIT_GROUPS.weight;
    return null;
}

function formatAmount(num) {
    if (num % 1 === 0) return num.toString();
    const whole = Math.floor(num);
    const frac = num % 1;

    // Unicode fraction mapping for a professional look
    if (Math.abs(frac - 0.5) < 0.01) return (whole > 0 ? whole + ' ' : '') + '½';
    if (Math.abs(frac - 0.25) < 0.01) return (whole > 0 ? whole + ' ' : '') + '¼';
    if (Math.abs(frac - 0.75) < 0.01) return (whole > 0 ? whole + ' ' : '') + '¾';
    if (Math.abs(frac - 0.33) < 0.02) return (whole > 0 ? whole + ' ' : '') + '⅓';
    if (Math.abs(frac - 0.66) < 0.02) return (whole > 0 ? whole + ' ' : '') + '⅔';

    return num.toFixed(1).replace(/\.0$/, '');
}

function scaleIngredient(ing, newServings) {
    if (ing.amount === null || ing.amount === '' || ing.amount === undefined) {
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

    // Convert to base units
    const baseUnit = group.units.find(u => u.id === ing.unit.toLowerCase());
    const baseValue = amount * (baseUnit ? baseUnit.ratio : 1);

    // Find best unit
    const bestUnitId = group.findBest(baseValue);
    const targetUnit = group.units.find(u => u.id === bestUnitId);
    const finalAmount = baseValue / targetUnit.ratio;

    return `${formatAmount(finalAmount)} ${bestUnitId}`;
}

function updateIngredients() {
    const list = document.getElementById('step-groups-container');
    if (!list || !currentRecipe) return;

    renderSteps();
}

function renderSteps() {
    const container = document.getElementById('step-groups-container');
    if (!container || !currentRecipe) return;

    let html = currentRecipe.steps.map((step, idx) => `
        <div class="step-card" style="margin-bottom: 2rem;">
            ${step.ingredients && step.ingredients.length > 0 ? `
                <div class="step-ingredients" style="margin-bottom: 1.25rem;">
                    <h4 style="margin-bottom: 0.75rem; color: var(--text-muted); font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600;">
                        Ingredienser: ${step.title ? esc(step.title) : ''}
                    </h4>
                    <ul class="ingredient-list-detail">
                        ${step.ingredients.map(i => `
                            <li>
                                <span class="ing-amount">${scaleIngredient(i, currentServings)}</span>
                                <span>${esc(i.ingredient_name)}</span>
                            </li>
                        `).join('')}
                    </ul>
                </div>
            ` : (step.title ? `<h3 class="step-title" style="margin-bottom: 0.75rem; color: var(--accent); font-size: 1.1rem;">${esc(step.title)}</h3>` : '')}

            ${step.instructions ? `
                <div class="step-instructions">
                    <h4 style="margin-bottom: 0.75rem; color: var(--text-muted); font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600;">
                        Gör såhär:
                    </h4>
                    ${step.instructions.split('\n').map((line, lIdx) => `
                        <div class="instruction-line" style="display: flex; gap: 1rem; margin-bottom: 0.75rem;">
                            <div class="step-number" style="background: var(--accent); color: #fff; width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 700; flex-shrink: 0; margin-top: 2px;">${lIdx + 1}</div>
                            <div style="font-size: 0.98rem; line-height: 1.5; color: var(--text);">${esc(line)}</div>
                        </div>
                    `).join('')}
                </div>
            ` : ''}
        </div>
    `).join('');

    container.innerHTML = html;
    if (window.lucide) lucide.createIcons();
}

function changeServings(delta) {
    const newVal = currentServings + delta;
    if (newVal < 1) return;
    currentServings = newVal;

    const display = document.getElementById('servings-display');
    if (display) display.textContent = currentServings;

    updateIngredients();
}

async function load() {
    const el = document.getElementById('content');
    const id = new URLSearchParams(location.search).get('id');

    if (!id) {
        el.innerHTML = `<div class="empty-state"><p>Inget recept valt.</p></div>`;
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

        el.className = 'recipe-detail';
        el.innerHTML = `
            ${r.image_url ? `<div class="hero-image" style="margin-bottom: 1.5rem;"><img src="${API}${r.image_url}" style="width:100%; height:300px; object-fit:cover; border-radius:12px; box-shadow:var(--shadow);"></div>` : ''}
            
            <div id="category-chips" class="chip-group" style="margin-bottom: 1.50rem; gap: 0.4rem;">
                ${(r.categories || []).map(c => `<span class="chip-mini">${esc(c.name)}</span>`).join('')}
            </div>

            <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; margin-bottom: 0.5rem;">
                <h1 style="margin: 0;">${esc(r.name)}</h1>
                <a href="edit.html?id=${r.id}" class="btn btn-ghost" style="padding: 0.4rem 0.8rem; font-size: 0.82rem; flex-shrink: 0; display: flex; align-items: center; gap: 4px;">
                    <i data-lucide="pencil" style="width: 14px; height: 14px;"></i> Ändra
                </a>
            </div>

            <div class="meta" style="margin-bottom: 1.5rem;">
                <div class="servings-control">
                    <button class="servings-btn" onclick="changeServings(-1)" title="Minska portioner">
                        <i data-lucide="minus" style="width: 14px; height: 14px;"></i>
                    </button>
                    <span class="servings-text"><span id="servings-display">${currentServings}</span> portioner</span>
                    <button class="servings-btn" onclick="changeServings(1)" title="Öka portioner">
                        <i data-lucide="plus" style="width: 14px; height: 14px;"></i>
                    </button>
                </div>
                ${r.prep_time_minutes ? `<span style="display: flex; align-items: center; gap: 4px;">
                    <i data-lucide="clock" style="width: 18px; height: 18px; color: var(--accent);"></i> ${r.prep_time_minutes} min
                </span>` : ''}
            </div>
            ${r.description ? `<p class="recipe-description" style="font-size: 1.05rem; margin-bottom: 2rem;">${esc(r.description)}</p>` : ''}

            <div id="step-groups-container">
                <!-- Steps and their ingredients will be rendered here -->
            </div>
        `;

        renderSteps();

    } catch (err) {
        console.error(err);
        el.innerHTML = `<div class="empty-state"><p>Receptet hittades inte.</p></div>`;
    }
}

window.updateIngredients = updateIngredients;
window.changeServings = changeServings;
load();
