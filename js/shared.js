// js/shared.js

// ─────────────────────────────────────
// API BASE
// ─────────────────────────────────────
export const API = `http://${window.location.hostname}:3000`;


// ─────────────────────────────────────
// SAFE ESCAPE (XSS protection)
// ─────────────────────────────────────
export const esc = (s) =>
    String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');


// ─────────────────────────────────────
// ICON HELPER (Lucide wrapper)
// ─────────────────────────────────────
export function initIcons() {
    if (window.lucide) {
        window.lucide.createIcons();
    }
}


// ─────────────────────────────────────
// DATE FORMATTER (sv-SE)
// ─────────────────────────────────────
export function formatDate(dateString) {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('sv-SE');
}


// ─────────────────────────────────────
// TYPEAHEAD SYSTEM
// ─────────────────────────────────────
export function makeTypeahead(inputEl, dropdownEl, fetchFn, onSelect) {
    let debounce = null;
    let focused = -1;
    let items = [];

    inputEl.addEventListener('input', () => {
        clearTimeout(debounce);
        const q = inputEl.value.trim();
        if (!q) {
            close();
            return;
        }

        debounce = setTimeout(async () => {
            items = await fetchFn(q);
            render(items);
        }, 200);
    });

    inputEl.addEventListener('keydown', (e) => {
        if (!dropdownEl.classList.contains('open')) return;

        if (e.key === 'ArrowDown') {
            focused = Math.min(focused + 1, items.length - 1);
            highlight();
            e.preventDefault();
        }

        if (e.key === 'ArrowUp') {
            focused = Math.max(focused - 1, 0);
            highlight();
            e.preventDefault();
        }

        if (e.key === 'Enter' && focused >= 0) {
            select(items[focused]);
            e.preventDefault();
        }

        if (e.key === 'Escape') close();
    });

    document.addEventListener('click', (e) => {
        if (!dropdownEl.contains(e.target) && e.target !== inputEl) {
            close();
        }
    });

    function render(results) {
        focused = -1;
        dropdownEl.innerHTML = '';

        if (results.length === 0) {
            dropdownEl.innerHTML = '<div class="dropdown-empty">Inga träffar</div>';
        } else {
            results.forEach((item, i) => {
                const div = document.createElement('div');
                div.className = 'dropdown-item';
                div.textContent = item.display;

                div.addEventListener('mousedown', (e) => {
                    e.preventDefault();
                    select(item);
                });

                dropdownEl.appendChild(div);
            });
        }

        dropdownEl.classList.add('open');
    }

    function highlight() {
        [...dropdownEl.querySelectorAll('.dropdown-item')]
            .forEach((el, i) => {
                el.classList.toggle('focused', i === focused);
            });
    }

    function select(item) {
        onSelect(item);
        close();
    }

    function close() {
        dropdownEl.classList.remove('open');
        dropdownEl.innerHTML = '';
        items = [];
        focused = -1;
    }
}


// ─────────────────────────────────────
// TYPEAHEAD FETCHERS
// ─────────────────────────────────────
export async function fetchIngredients(q) {
    const res = await fetch(`${API}/ingredients?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    return data.map(r => ({
        id: r.id,
        display: r.name
    }));
}

export async function fetchUnits(q) {
    const res = await fetch(`${API}/units?q=${encodeURIComponent(q)}`);
    const data = await res.json();

    return data.map(r => ({
        abbreviation: r.abbreviation,
        display: `${r.abbreviation} (${r.name})`,
        isAmountOptional: !!r.is_amount_optional
    }));
}

// ─────────────────────────────────────
// RECIPE VALIDATION (Create & Edit)
// ─────────────────────────────────────

export function validateRecipeForm({
    requireAtLeastOneIngredient = true
}) {

    const nameInput = document.getElementById('recipe-name');
    const servingsInput = document.getElementById('recipe-servings');

    const name = nameInput?.value.trim();
    const servings = servingsInput?.value.trim();

    if (!name) {
        return { valid: false, message: 'Ange ett receptnamn', focus: nameInput };
    }

    if (!servings || Number(servings) <= 0) {
        return { valid: false, message: 'Ange antal portioner', focus: servingsInput };
    }

    const stepEls = [...document.querySelectorAll('.step-item')];

    if (stepEls.length === 0) {
        return { valid: false, message: 'Lägg till minst ett steg' };
    }

    const steps = [];

    for (const stepEl of stepEls) {

        const title = stepEl.querySelector('.step-title-input')?.value.trim();

        const instructionFields = [...stepEl.querySelectorAll('.instr-input')];
        const instructions = instructionFields
            .map(t => t.value.trim())
            .filter(Boolean)
            .join('\n');

        if (!instructions) {
            return {
                valid: false,
                message: 'Varje steg måste ha minst en instruktion',
                focus: instructionFields[0]
            };
        }

        const ingredientRows = [...stepEl.querySelectorAll('.ingredient-row-nested')];
        const ingredients = [];

        for (const row of ingredientRows) {

            const nameField = row.querySelector('.ing-name-input');
            const amountField = row.querySelector('.ing-amount-input');
            const unitField = row.querySelector('.unit-input');

            const ingName = nameField?.value.trim();
            const ingAmount = amountField?.value.trim().replace(',', '.');
            const ingUnit = unitField?.value.trim();

            if (ingName || ingAmount || ingUnit) {

                if (!ingName) {
                    return { valid: false, message: 'Ingrediens saknar namn', focus: nameField };
                }

                if (!ingUnit) {
                    return { valid: false, message: `Ange enhet för ${ingName}`, focus: unitField };
                }

                const isOptional = unitField?.dataset?.amountOptional === 'true';

                if (!isOptional) {
                    if (!ingAmount || isNaN(Number(ingAmount))) {
                        return {
                            valid: false,
                            message: `Ange giltig mängd för ${ingName}`,
                            focus: amountField
                        };
                    }
                }

                ingredients.push({
                    name: ingName,
                    amount: ingAmount,
                    unit: ingUnit
                });
            }
        }

        steps.push({ title, instructions, ingredients });
    }

    if (requireAtLeastOneIngredient) {
        const totalIngredients = steps.reduce((sum, step) => {
            return sum + step.ingredients.length;
        }, 0);

        if (totalIngredients === 0) {
            return {
                valid: false,
                message: 'Lägg till minst en ingrediens i receptet'
            };
        }
    }

    return {
        valid: true,
        data: {
            name,
            servings,
            description: document.getElementById('recipe-description')?.value.trim(),
            prep_time_minutes: document.getElementById('recipe-preptime')?.value,
            steps
        }
    };
}