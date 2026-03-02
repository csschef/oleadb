// js/shared.js

// ─────────────────────────────────────
// API BASE
// ─────────────────────────────────────
export const API = `http://${window.location.hostname}:3000`;


// ─────────────────────────────────────
// SAFE ESCAPE
// ─────────────────────────────────────
export const esc = (s) =>
    String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');


// ─────────────────────────────────────
// ICON HELPER
// ─────────────────────────────────────
export function initIcons() {
    if (window.lucide) {
        window.lucide.createIcons();
    }
}


// ─────────────────────────────────────
// DATE FORMATTER
// ─────────────────────────────────────
export function formatDate(dateString) {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('sv-SE');
}


// ─────────────────────────────────────
// TYPEAHEAD (Ingredient only)
// Now stores ingredient_id on input.dataset
// ─────────────────────────────────────
export function makeTypeahead(inputEl, dropdownEl, fetchFn) {
    let debounce = null;
    let focused = -1;
    let items = [];

    inputEl.addEventListener('input', () => {
        // Clear stored ID when user types manually
        delete inputEl.dataset.ingredientId;

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
            results.forEach((item) => {
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
        inputEl.value = item.display;
        inputEl.dataset.ingredientId = item.id;
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
// FETCHERS
// ─────────────────────────────────────
export async function fetchIngredients(q) {
    const res = await fetch(`${API}/ingredients?q=${encodeURIComponent(q)}`);
    const data = await res.json();

    return data.map(r => ({
        id: r.id,
        display: r.name
    }));
}

export async function fetchAllUnits() {
    const res = await fetch(`${API}/units`);
    if (!res.ok) throw new Error('Failed to fetch units');
    const data = await res.json();

    return (data || [])
        .map(u => ({
            id: u.id,
            name: u.name,
            abbreviation: u.abbreviation,
            is_amount_optional: !!u.is_amount_optional
        }))
        .sort((a, b) => a.name.localeCompare(b.name, 'sv'));
}

export function populateUnitSelect(selectEl, units, selectedUnitId = null) {
    if (!selectEl) return;

    selectEl.innerHTML = `
        <option value="" disabled ${selectedUnitId ? '' : 'selected'}>
            Välj enhet…
        </option>
        ${units.map(u => `
            <option value="${u.id}" data-amount-optional="${u.is_amount_optional ? 'true' : 'false'}">
                ${esc(u.abbreviation)} (${esc(u.name)})
            </option>
        `).join('')}
    `;

    if (selectedUnitId) {
        selectEl.value = String(selectedUnitId);
    }
}


// ─────────────────────────────────────
// RECIPE VALIDATION
// Now REQUIRES ingredient_id
// ─────────────────────────────────────
export function validateRecipeForm({
    requireAtLeastOneIngredient = true
}) {
    const nameInput = document.getElementById('recipe-name');
    const descriptionInput = document.getElementById('recipe-description');
    const servingsInput = document.getElementById('recipe-servings');
    const prepTimeInput = document.getElementById('recipe-preptime');

    const name = nameInput?.value.trim();
    const description = descriptionInput?.value.trim();
    const servingsRaw = servingsInput?.value.trim();
    const prepTimeRaw = prepTimeInput?.value.trim();

    if (!name) {
        return { valid: false, message: 'Ange ett receptnamn', focus: nameInput };
    }

    if (!description) {
        return { valid: false, message: 'Ange en beskrivning', focus: descriptionInput };
    }

    if (!servingsRaw || isNaN(Number(servingsRaw)) || Number(servingsRaw) <= 0) {
        return { valid: false, message: 'Ange giltigt antal portioner', focus: servingsInput };
    }

    if (!prepTimeRaw || isNaN(Number(prepTimeRaw)) || Number(prepTimeRaw) <= 0) {
        return { valid: false, message: 'Ange giltig tillagningstid i minuter', focus: prepTimeInput };
    }

    const servings = Number(servingsRaw);
    const prep_time_minutes = Number(prepTimeRaw);

    const stepEls = [...document.querySelectorAll('.step-item')];
    if (stepEls.length === 0) {
        return { valid: false, message: 'Lägg till minst ett steg' };
    }

    const steps = [];

    for (const stepEl of stepEls) {
        const title = stepEl.querySelector('.step-title-input')?.value.trim();

        const ingredientRows = [...stepEl.querySelectorAll('.ingredient-row-nested')];
        const ingredients = [];

        for (const row of ingredientRows) {
            const nameField = row.querySelector('.ing-name-input');
            const amountField = row.querySelector('.ing-amount-input');
            const unitSelect = row.querySelector('.unit-select');

            const ingName = nameField?.value.trim();
            const ingAmount = amountField?.value.trim().replace(',', '.');
            const unitId = unitSelect?.value ? Number(unitSelect.value) : null;
            const ingredientId = nameField?.dataset?.ingredientId
                ? Number(nameField.dataset.ingredientId)
                : null;

            if (ingName || ingAmount || unitId) {

                if (!ingredientId) {
                    return {
                        valid: false,
                        message: `Välj ingrediens från listan: ${ingName}`,
                        focus: nameField
                    };
                }

                if (!unitId) {
                    return {
                        valid: false,
                        message: `Välj enhet för ${ingName}`,
                        focus: unitSelect
                    };
                }

                const selectedOpt = unitSelect.selectedOptions?.[0];
                const isOptional = selectedOpt?.dataset?.amountOptional === 'true';

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
                    ingredient_id: ingredientId,
                    amount: ingAmount,
                    unit_id: unitId
                });
            }
        }

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

        steps.push({ title, instructions, ingredients });
    }

    if (requireAtLeastOneIngredient) {
        const totalIngredients = steps.reduce((sum, step) => sum + step.ingredients.length, 0);
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
            description,
            servings,
            prep_time_minutes,
            steps
        }
    };
}