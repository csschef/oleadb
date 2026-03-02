// js/edit.js
import {
    API,
    esc,
    initIcons,
    makeTypeahead,
    fetchIngredients,
    fetchAllUnits,
    populateUnitSelect,
    validateRecipeForm
} from './shared.js';

const urlParams = new URLSearchParams(window.location.search);
const recipeId = urlParams.get('id');

if (!recipeId) {
    window.location.href = 'index.html';
}

let selectedCategories = [];
let unitsCache = [];

function showToast(msg, isError = false) {
    const t = document.getElementById('toast');
    if (!t) return;

    t.textContent = msg;
    t.className = 'toast show' + (isError ? ' error' : '');
    setTimeout(() => t.className = 'toast', 3000);
}

const dropArea = document.getElementById('image-drop-area');
const imageInput = document.getElementById('image-input');
const previewContainer = document.getElementById('image-preview-container');

dropArea.addEventListener('click', () => imageInput.click());
imageInput.addEventListener('change', (e) => handleFile(e.target.files[0]));
dropArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropArea.classList.add('dragover');
});
dropArea.addEventListener('dragleave', () => dropArea.classList.remove('dragover'));
dropArea.addEventListener('drop', (e) => {
    e.preventDefault();
    dropArea.classList.remove('dragover');
    handleFile(e.dataTransfer.files[0]);
});

function handleFile(file) {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        previewContainer.innerHTML = `<img src="${e.target.result}">`;
    };
    reader.readAsDataURL(file);
}

const TYPE_TRANSLATIONS = {
    component: 'Komponent',
    main_ingredient: 'Huvudingrediens',
    cuisine: 'Kök',
    time: 'Tid',
    occasion: 'Tillfälle'
};

const TYPE_ORDER = ['main_ingredient', 'cuisine', 'component', 'time', 'occasion'];

function toggleCategory(id) {
    const idx = selectedCategories.indexOf(id);
    if (idx > -1) {
        selectedCategories.splice(idx, 1);
    } else {
        selectedCategories.push(id);
    }

    document.querySelectorAll('#category-selector .chip')
        .forEach(chip => {
            const chipId = parseInt(chip.dataset.id);
            chip.classList.toggle('active', selectedCategories.includes(chipId));
        });
}

window.toggleCategory = toggleCategory;

function addStep(data = null, shouldFocus = true) {
    const container = document.getElementById('steps-container');

    const stepEl = document.createElement('div');
    stepEl.className = 'step-item';
    stepEl.innerHTML = `
        <div class="step-item-header">
            <div class="step-item-title-row">
                <input type="text" class="step-title-input" placeholder="Titel för detta steg" autocomplete="off">
            </div>
            <button type="button" class="btn btn-icon btn-remove-step">
                <i data-lucide="trash-2"></i>
            </button>
        </div>

        <div class="step-ingredients-section">
            <h4>Ingredienser</h4>
            <div class="step-ingredients-list"></div>
            <button type="button" class="btn btn-ghost btn-sm add-step-ing-btn">
                <i data-lucide="plus-circle"></i> Lägg till ingrediens
            </button>
        </div>

        <div class="step-instructions-section">
            <h4>Gör så här</h4>
            <div class="instruction-list-nested"></div>
            <button type="button" class="btn btn-ghost btn-sm add-step-instr-btn">
                <i data-lucide="plus-circle"></i> Lägg till instruktion
            </button>
        </div>
    `;

    const ingredientsList = stepEl.querySelector('.step-ingredients-list');
    const instructionsList = stepEl.querySelector('.instruction-list-nested');

    stepEl.querySelector('.btn-remove-step').addEventListener('click', () => {
        stepEl.remove();
        if (!container.querySelector('.step-item')) addStep();
    });

    stepEl.querySelector('.add-step-ing-btn')
        .addEventListener('click', () => addIngredientRow(ingredientsList));

    stepEl.querySelector('.add-step-instr-btn')
        .addEventListener('click', () => addInstructionRow(instructionsList));

    if (data) {
        stepEl.querySelector('.step-title-input').value = data.title || '';

        if (data.instructions) {
            data.instructions.split('\n')
                .forEach(line => addInstructionRow(instructionsList, line, false));
        } else {
            addInstructionRow(instructionsList, '', false);
        }

        if (data.ingredients?.length) {
            data.ingredients.forEach(ing => addIngredientRow(ingredientsList, ing, false));
        } else {
            addIngredientRow(ingredientsList, null, false);
        }
    } else {
        addIngredientRow(ingredientsList, null, false);
        addInstructionRow(instructionsList, '', false);
    }

    container.appendChild(stepEl);
    initIcons();
    if (shouldFocus) stepEl.querySelector('.step-title-input').focus();
}

function addIngredientRow(container, data = null, shouldFocus = true) {
    const row = document.createElement('div');
    row.className = 'ingredient-row-nested';

    row.innerHTML = `
        <div class="autocomplete-wrap">
            <input type="text" class="ing-name-input" placeholder="Namn" autocomplete="off">
            <div class="dropdown ing-dropdown"></div>
        </div>
        <input type="text" class="ing-amount-input" placeholder="Mängd">
        <select class="unit-select"></select>
        <button type="button" class="btn btn-icon remove-ing-btn">
            <i data-lucide="x"></i>
        </button>
    `;

    const nameInput = row.querySelector('.ing-name-input');
    const nameDrop = row.querySelector('.ing-dropdown');
    const amountInput = row.querySelector('.ing-amount-input');
    const unitSelect = row.querySelector('.unit-select');

    makeTypeahead(nameInput, nameDrop, fetchIngredients);

    populateUnitSelect(unitSelect, unitsCache, data?.unit_id ?? null);

    row.querySelector('.remove-ing-btn')
        .addEventListener('click', () => row.remove());

    if (data) {
        nameInput.value = data.ingredient_name || '';
        amountInput.value = data.amount || '';
        if (data.ingredient_id) {
            nameInput.dataset.ingredientId = data.ingredient_id;
        }
    }

    container.appendChild(row);
    initIcons();
    if (shouldFocus) nameInput.focus();
}

function addInstructionRow(container, text = '', shouldFocus = true) {
    const row = document.createElement('div');
    row.className = 'instruction-row-nested';

    row.innerHTML = `
        <textarea class="instr-input" placeholder="Skriv instruktion…">${esc(text)}</textarea>
        <button type="button" class="btn btn-icon remove-instr-btn">
            <i data-lucide="x"></i>
        </button>
    `;

    row.querySelector('.remove-instr-btn')
        .addEventListener('click', () => row.remove());

    container.appendChild(row);
    initIcons();
    if (shouldFocus) row.querySelector('textarea').focus();
}

async function init() {
    try {
        unitsCache = await fetchAllUnits();

        const catRes = await fetch(`${API}/categories`);
        const allCategories = await catRes.json();
        const selector = document.getElementById('category-selector');

        const groups = allCategories.reduce((acc, cat) => {
            const type = cat.type || 'other';
            if (!acc[type]) acc[type] = [];
            acc[type].push(cat);
            return acc;
        }, {});

        selector.innerHTML = TYPE_ORDER
            .filter(type => groups[type])
            .map(type => `
                <div class="category-group">
                    <div class="category-group-header">
                        ${TYPE_TRANSLATIONS[type] || type}
                    </div>
                    <div class="chip-group">
                        ${groups[type]
                            .sort((a, b) => a.name.localeCompare(b.name))
                            .map(cat => `
                                <div class="chip chip-interactive" data-id="${cat.id}" onclick="toggleCategory(${cat.id})">
                                    ${esc(cat.name)}
                                </div>
                            `).join('')}
                    </div>
                </div>
            `).join('');

        const res = await fetch(`${API}/recipes/${recipeId}`);
        if (!res.ok) throw new Error();

        const recipe = await res.json();

        document.getElementById('recipe-name').value = recipe.name;
        document.getElementById('recipe-description').value = recipe.description || '';
        document.getElementById('recipe-servings').value = recipe.servings || '';
        document.getElementById('recipe-preptime').value = recipe.prep_time_minutes || '';

        if (recipe.image_url) {
            previewContainer.innerHTML = `<img src="${API}${recipe.image_url}">`;
        }

        selectedCategories = (recipe.categories || []).map(c => c.id);
        document.querySelectorAll('#category-selector .chip')
            .forEach(chip => {
                const id = parseInt(chip.dataset.id);
                chip.classList.toggle('active', selectedCategories.includes(id));
            });

        const stepsContainer = document.getElementById('steps-container');
        stepsContainer.innerHTML = '';
        if (recipe.steps?.length) {
            recipe.steps.forEach(s => addStep(s, false));
        } else {
            addStep(null, false);
        }

        setTimeout(() => {
            document.activeElement?.blur();
        }, 0);

        initIcons();

    } catch (err) {
        showToast('Kunde inte ladda receptdata', true);
    }
}

document.getElementById('add-step-btn')
    .addEventListener('click', () => addStep());

document.getElementById('save-btn')
    .addEventListener('click', async () => {

        const result = validateRecipeForm({
            requireAtLeastOneIngredient: true
        });

        if (!result.valid) {
            showToast(result.message, true);
            result.focus?.focus();
            return;
        }

        const {
            name,
            servings,
            description,
            prep_time_minutes,
            steps
        } = result.data;

        const formData = new FormData();
        formData.append('name', name);
        formData.append('description', description);
        formData.append('servings', servings);
        formData.append('prep_time_minutes', prep_time_minutes);
        formData.append('categories', JSON.stringify(selectedCategories));
        formData.append('steps', JSON.stringify(steps));

        const imageFile = document.getElementById('image-input')?.files[0];
        if (imageFile) formData.append('image', imageFile);

        const btn = document.getElementById('save-btn');
        const original = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i data-lucide="loader-2" class="spin"></i> Sparar…';
        initIcons();

        try {
            const res = await fetch(`${API}/recipes/${recipeId}`, {
                method: 'PUT',
                body: formData
            });

            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                throw new Error(data.error || 'Fel vid uppdatering');
            }

            window.location.href = `recipe.html?id=${recipeId}`;

        } catch (err) {
            btn.disabled = false;
            btn.innerHTML = original;
            initIcons();
            showToast(err.message || 'Något gick fel', true);
        }
    });

init();