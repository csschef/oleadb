// js/create.js
import {
    API,
    esc,
    initIcons,
    makeTypeahead,
    fetchIngredients,
    fetchUnits,
    validateRecipeForm
} from './shared.js';

let selectedCategories = [];

/* ─────────────────────────────────────
   TOAST
───────────────────────────────────── */
function showToast(msg, isError = false) {
    const t = document.getElementById('toast');
    if (!t) return;

    t.textContent = msg;
    t.className = `toast show${isError ? ' error' : ''}`;

    setTimeout(() => {
        t.className = 'toast';
    }, 3000);
}

/* ─────────────────────────────────────
   IMAGE HANDLING
───────────────────────────────────── */
function initImageUpload() {
    const dropArea = document.getElementById('image-drop-area');
    const imageInput = document.getElementById('image-input');
    const previewContainer = document.getElementById('image-preview-container');

    if (!dropArea || !imageInput || !previewContainer) return;

    dropArea.addEventListener('click', () => imageInput.click());

    imageInput.addEventListener('change', (e) => {
        handleFile(e.target.files[0]);
    });

    dropArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropArea.classList.add('dragover');
    });

    dropArea.addEventListener('dragleave', () => {
        dropArea.classList.remove('dragover');
    });

    dropArea.addEventListener('drop', (e) => {
        e.preventDefault();
        dropArea.classList.remove('dragover');
        handleFile(e.dataTransfer.files[0]);
    });

    function handleFile(file) {
        if (!file || !file.type.startsWith('image/')) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            previewContainer.innerHTML = `<img src="${e.target.result}" alt="Förhandsvisning">`;
        };
        reader.readAsDataURL(file);
    }
}

/* ─────────────────────────────────────
   CATEGORIES
───────────────────────────────────── */
const TYPE_TRANSLATIONS = {
    component: 'Komponent',
    main_ingredient: 'Huvudingrediens',
    cuisine: 'Kök',
    time: 'Tid',
    occasion: 'Tillfälle'
};

const TYPE_ORDER = [
    'main_ingredient',
    'cuisine',
    'component',
    'time',
    'occasion'
];

async function loadCategories() {
    const container = document.getElementById('category-selector');
    if (!container) return;

    try {
        const res = await fetch(`${API}/categories`);
        const categories = await res.json();

        const groups = categories.reduce((acc, cat) => {
            const type = cat.type || 'other';
            if (!acc[type]) acc[type] = [];
            acc[type].push(cat);
            return acc;
        }, {});

        container.innerHTML = TYPE_ORDER
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
                                <div class="chip chip-interactive"
                                     data-category="${cat.id}">
                                    ${esc(cat.name)}
                                </div>
                            `).join('')}
                    </div>
                </div>
            `).join('');

        container.addEventListener('click', (e) => {
            const chip = e.target.closest('[data-category]');
            if (!chip) return;

            const id = parseInt(chip.dataset.category);
            toggleCategory(id);
        });

    } catch (err) {
        console.error('Failed to load categories', err);
    }
}

function toggleCategory(id) {
    const idx = selectedCategories.indexOf(id);

    if (idx > -1) {
        selectedCategories.splice(idx, 1);
    } else {
        selectedCategories.push(id);
    }

    document.querySelectorAll('#category-selector [data-category]')
        .forEach(chip => {
            const chipId = parseInt(chip.dataset.category);
            chip.classList.toggle('active', selectedCategories.includes(chipId));
        });
}

/* ─────────────────────────────────────
   STEPS
───────────────────────────────────── */
function addStep(shouldFocus = true) {
    const container = document.getElementById('steps-container');
    if (!container) return;

    const stepEl = document.createElement('div');
    stepEl.className = 'step-item';

    stepEl.innerHTML = `
        <div class="step-item-header">
            <div class="step-item-title-row">
                <input type="text"
                       class="step-title-input"
                       placeholder="Titel för detta steg"
                       autocomplete="off">
            </div>
            <button type="button"
                    class="btn btn-icon btn-remove-step"
                    data-action="remove-step">
                <i data-lucide="trash-2"></i>
            </button>
        </div>

        <div class="step-ingredients-section">
            <h4>Ingredienser</h4>
            <div class="step-ingredients-list"></div>
            <button type="button"
                    class="btn btn-ghost btn-sm"
                    data-action="add-ingredient">
                <i data-lucide="plus-circle"></i>
                Lägg till ingrediens
            </button>
        </div>

        <div class="step-instructions-section">
            <h4>Gör så här</h4>
            <div class="instruction-list-nested"></div>
            <button type="button"
                    class="btn btn-ghost btn-sm"
                    data-action="add-instruction">
                <i data-lucide="plus-circle"></i>
                Lägg till instruktion
            </button>
        </div>
    `;

    container.appendChild(stepEl);

    addIngredientRow(stepEl.querySelector('.step-ingredients-list'), false);
    addInstructionRow(stepEl.querySelector('.instruction-list-nested'), false);

    initIcons();

    if (shouldFocus) {
        stepEl.querySelector('.step-title-input')?.focus();
    }
}

function addIngredientRow(container, shouldFocus = true) {
    const row = document.createElement('div');
    row.className = 'ingredient-row-nested';

    row.innerHTML = `
        <div class="autocomplete-wrap">
            <input type="text"
                   class="ing-name-input"
                   placeholder="Namn"
                   autocomplete="off">
            <div class="dropdown ing-dropdown"></div>
        </div>

        <input type="text"
               class="ing-amount-input"
               placeholder="Mängd">

        <div class="autocomplete-wrap">
            <input type="text"
                   class="unit-input"
                   placeholder="Enhet"
                   autocomplete="off">
            <div class="dropdown unit-dropdown"></div>
        </div>

        <button type="button"
                class="btn btn-icon"
                data-action="remove-ingredient">
            <i data-lucide="x"></i>
        </button>
    `;

    const nameInput = row.querySelector('.ing-name-input');
    const nameDrop = row.querySelector('.ing-dropdown');
    const unitInput = row.querySelector('.unit-input');
    const unitDrop = row.querySelector('.unit-dropdown');

    makeTypeahead(nameInput, nameDrop, fetchIngredients, (item) => {
        nameInput.value = item.display;
    });

    makeTypeahead(unitInput, unitDrop, fetchUnits, (item) => {
        unitInput.value = item.abbreviation;
        unitInput.dataset.amountOptional = item.isAmountOptional ? 'true' : 'false';
    });

    container.appendChild(row);
    initIcons();

    if (shouldFocus) {
        nameInput.focus();
    }
}

function addInstructionRow(container, shouldFocus = true) {
    const row = document.createElement('div');
    row.className = 'instruction-row-nested';

    row.innerHTML = `
        <textarea class="instr-input"
                  placeholder="Skriv instruktion…"></textarea>
        <button type="button"
                class="btn btn-icon"
                data-action="remove-instruction">
            <i data-lucide="x"></i>
        </button>
    `;

    container.appendChild(row);
    initIcons();

    if (shouldFocus) {
        row.querySelector('.instr-input')?.focus();
    }
}

/* ─────────────────────────────────────
   SAVE
───────────────────────────────────── */

async function saveRecipe() {

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
    formData.append('description', description || '');
    formData.append('servings', servings);
    formData.append('prep_time_minutes', prep_time_minutes || '');
    formData.append('categories', JSON.stringify(selectedCategories));
    formData.append('steps', JSON.stringify(steps));

    const imageFile = document.getElementById('image-input')?.files[0];
    if (imageFile) formData.append('image', imageFile);

    const btn = document.getElementById('save-btn');
    const originalHtml = btn.innerHTML;

    btn.disabled = true;
    btn.innerHTML = '<i data-lucide="loader-2" class="spin"></i> Sparar…';
    initIcons();

    try {
        const res = await fetch(`${API}/recipes`, {
            method: 'POST',
            body: formData
        });

        if (!res.ok) throw new Error();

        showToast('✅ Recept sparat!');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1200);

    } catch (err) {
        showToast('Något gick fel, försök igen', true);
        btn.disabled = false;
        btn.innerHTML = originalHtml;
        initIcons();
    }
}

/* ─────────────────────────────────────
   EVENT DELEGATION
───────────────────────────────────── */
function initEvents() {
    const container = document.getElementById('steps-container');

    container.addEventListener('click', (e) => {
        const action = e.target.closest('[data-action]')?.dataset.action;
        if (!action) return;

        const stepEl = e.target.closest('.step-item');

        switch (action) {
            case 'remove-step':
                stepEl.remove();
                if (!container.querySelector('.step-item')) {
                    addStep(false);
                }
                break;

            case 'add-ingredient':
                addIngredientRow(stepEl.querySelector('.step-ingredients-list'));
                break;

            case 'remove-ingredient':
                e.target.closest('.ingredient-row-nested').remove();
                break;

            case 'add-instruction':
                addInstructionRow(stepEl.querySelector('.instruction-list-nested'));
                break;

            case 'remove-instruction':
                e.target.closest('.instruction-row-nested').remove();
                break;
        }
    });

    document.getElementById('add-step-btn')
        ?.addEventListener('click', () => addStep());

    document.getElementById('save-btn')
        ?.addEventListener('click', saveRecipe);
}

/* ─────────────────────────────────────
   INIT
───────────────────────────────────── */
function init() {
    initImageUpload();
    initEvents();
    loadCategories();
    addStep(false);
    initIcons();
}

init();