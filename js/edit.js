const API = `http://${window.location.hostname}:3000`;
const urlParams = new URLSearchParams(window.location.search);
const recipeId = urlParams.get('id');

let selectedCategories = [];

if (!recipeId) {
    window.location.href = 'index.html';
}

/* ── TOAST ── */
function showToast(msg, isError = false) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.className = 'toast show' + (isError ? ' error' : '');
    setTimeout(() => t.className = 'toast', 3000);
}

/* ── IMAGE HANDLING ── */
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

/* ── CATEGORIES ── */
const TYPE_TRANSLATIONS = {
    'component': 'Komponent',
    'main_ingredient': 'Huvudingrediens',
    'cuisine': 'Kök',
    'time': 'Tid',
    'occasion': 'Tillfälle'
};

const TYPE_ORDER = ['main_ingredient', 'cuisine', 'component', 'time', 'occasion'];

function toggleCategory(id) {
    const idx = selectedCategories.indexOf(id);
    if (idx > -1) {
        selectedCategories.splice(idx, 1);
    } else {
        selectedCategories.push(id);
    }
    const chips = document.querySelectorAll('#category-selector .chip');
    chips.forEach(chip => {
        const chipId = parseInt(chip.dataset.id);
        chip.classList.toggle('active', selectedCategories.includes(chipId));
    });
}
window.toggleCategory = toggleCategory;

/* ── TYPEAHEAD FOR UNITS AND INGREDIENTS ── */
function makeTypeahead(inputEl, dropdownEl, fetchFn, onSelect) {
    let debounce = null;
    let focused = -1;
    let items = [];

    inputEl.addEventListener('input', () => {
        clearTimeout(debounce);
        const q = inputEl.value.trim();
        if (!q) { close(); return; }
        debounce = setTimeout(async () => {
            items = await fetchFn(q);
            render(items);
        }, 200);
    });

    inputEl.addEventListener('keydown', (e) => {
        if (!dropdownEl.classList.contains('open')) return;
        if (e.key === 'ArrowDown') { focused = Math.min(focused + 1, items.length - 1); highlight(); e.preventDefault(); }
        if (e.key === 'ArrowUp') { focused = Math.max(focused - 1, 0); highlight(); e.preventDefault(); }
        if (e.key === 'Enter' && focused >= 0) { select(items[focused]); e.preventDefault(); }
        if (e.key === 'Escape') close();
    });

    document.addEventListener('click', (e) => {
        if (!dropdownEl.contains(e.target) && e.target !== inputEl) close();
    });

    function render(items) {
        focused = -1;
        dropdownEl.innerHTML = '';
        if (items.length === 0) {
            dropdownEl.innerHTML = '<div class="dropdown-empty">Inga träffar</div>';
        } else {
            items.forEach((item, i) => {
                const div = document.createElement('div');
                div.className = 'dropdown-item';
                div.textContent = item.display;
                div.addEventListener('mousedown', (e) => { e.preventDefault(); select(item); });
                dropdownEl.appendChild(div);
            });
        }
        dropdownEl.classList.add('open');
    }

    function highlight() {
        [...dropdownEl.querySelectorAll('.dropdown-item')].forEach((el, i) => {
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

async function fetchIngredients(q) {
    const res = await fetch(`${API}/ingredients?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    return data.map(r => ({ id: r.id, display: r.name }));
}

async function fetchUnits(q) {
    const res = await fetch(`${API}/units?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    return data.map(r => ({ abbreviation: r.abbreviation, display: `${r.abbreviation} (${r.name})` }));
}

/* ── STEPS & INGREDIENTS ── */
function addStep(data = null, shouldFocus = true) {
    const container = document.getElementById('steps-container');
    const stepEl = document.createElement('div');
    stepEl.className = 'step-item';
    stepEl.innerHTML = `
        <div class="step-item-header">
            <div class="step-item-title-row">
                <input type="text" class="step-title-input" placeholder="Titel för detta steg" autocomplete="off">
            </div>
            <button type="button" class="btn btn-icon btn-remove-step" title="Ta bort steg">
                <i data-lucide="trash-2" style="width: 16px; height: 16px;"></i>
            </button>
        </div>
        
        <div class="step-ingredients-section">
            <h4>Ingredienser</h4>
            <div class="step-ingredients-list"></div>
            <button type="button" class="btn btn-ghost btn-sm add-step-ing-btn" style="width: 100%; margin-top: 0.5rem; display: flex; align-items: center; justify-content: center; gap: 4px;">
                <i data-lucide="plus-circle" style="width: 14px; height: 14px;"></i> Lägg till ingrediens
            </button>
        </div>

        <div class="step-instructions-section">
            <h4>Gör så här</h4>
            <div class="instruction-list-nested"></div>
            <button type="button" class="btn btn-ghost btn-sm add-step-instr-btn" style="width: 100%; margin-top: 0.5rem; display: flex; align-items: center; justify-content: center; gap: 4px;">
                <i data-lucide="plus-circle" style="width: 14px; height: 14px;"></i> Lägg till instruktion
            </button>
        </div>
    `;

    const ingredientsList = stepEl.querySelector('.step-ingredients-list');
    const addIngBtn = stepEl.querySelector('.add-step-ing-btn');
    const instructionsList = stepEl.querySelector('.instruction-list-nested');
    const addInstrBtn = stepEl.querySelector('.add-step-instr-btn');
    const removeStepBtn = stepEl.querySelector('.btn-remove-step');
    const titleInput = stepEl.querySelector('.step-title-input');

    addIngBtn.addEventListener('click', () => addIngredientRow(ingredientsList));
    addInstrBtn.addEventListener('click', () => addInstructionRow(instructionsList));

    removeStepBtn.addEventListener('click', () => {
        stepEl.remove();
        if (container.querySelectorAll('.step-item').length === 0) addStep();
    });

    if (data) {
        titleInput.value = data.title || '';

        if (data.instructions) {
            const lines = data.instructions.split('\n');
            lines.forEach(line => addInstructionRow(instructionsList, line, false));
        } else {
            addInstructionRow(instructionsList, '', false);
        }

        if (data.ingredients && data.ingredients.length > 0) {
            data.ingredients.forEach(ing => addIngredientRow(ingredientsList, ing, false));
        } else {
            addIngredientRow(ingredientsList, null, false);
        }
    } else {
        addIngredientRow(ingredientsList, null, false);
        addInstructionRow(instructionsList, '', false);
    }

    container.appendChild(stepEl);
    lucide.createIcons();
    if (shouldFocus) titleInput.focus();
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
        <div class="autocomplete-wrap">
            <input type="text" class="unit-input" placeholder="Enhet" autocomplete="off">
            <div class="dropdown unit-dropdown"></div>
        </div>
        <button type="button" class="btn btn-icon remove-ing-btn">
            <i data-lucide="x" style="width: 16px; height: 16px;"></i>
        </button>
    `;

    const nameInput = row.querySelector('.ing-name-input');
    const nameDrop = row.querySelector('.ing-dropdown');
    const amountInput = row.querySelector('.ing-amount-input');
    const unitInput = row.querySelector('.unit-input');
    const unitDrop = row.querySelector('.unit-dropdown');
    const removeBtn = row.querySelector('.remove-ing-btn');

    makeTypeahead(nameInput, nameDrop, fetchIngredients, (item) => {
        nameInput.value = item.display;
    });

    makeTypeahead(unitInput, unitDrop, fetchUnits, (item) => {
        unitInput.value = item.abbreviation;
    });

    removeBtn.addEventListener('click', () => {
        row.remove();
    });

    if (data) {
        nameInput.value = data.ingredient_name || '';
        amountInput.value = data.amount || '';
        unitInput.value = data.unit || '';
    }

    container.appendChild(row);
    lucide.createIcons();
    if (shouldFocus) nameInput.focus();
}

function addInstructionRow(container, text = '', shouldFocus = true) {
    const row = document.createElement('div');
    row.className = 'instruction-row-nested';
    row.innerHTML = `
        <textarea class="instr-input" placeholder="Skriv instruktion…">${esc(text)}</textarea>
        <button type="button" class="btn btn-icon remove-instr-btn" style="margin-top: 8px;">
            <i data-lucide="x" style="width: 16px; height: 16px;"></i>
        </button>
    `;

    const textarea = row.querySelector('textarea');
    const removeBtn = row.querySelector('.remove-instr-btn');

    removeBtn.addEventListener('click', () => {
        row.remove();
    });

    container.appendChild(row);
    lucide.createIcons();
    if (shouldFocus) textarea.focus();
}

/* ── INITIAL LOAD ── */
async function init() {
    try {
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
        if (!res.ok) throw new Error('Recipe not found');
        const recipe = await res.json();

        document.getElementById('recipe-name').value = recipe.name;
        document.getElementById('recipe-description').value = recipe.description || '';
        document.getElementById('recipe-servings').value = recipe.servings || '';
        document.getElementById('recipe-preptime').value = recipe.prep_time_minutes || '';
        document.getElementById('cancel-btn').href = `recipe.html?id=${recipeId}`;

        if (recipe.image_url) {
            previewContainer.innerHTML = `<img src="${API}${recipe.image_url}">`;
        }

        selectedCategories = (recipe.categories || []).map(c => c.id);
        const chips = document.querySelectorAll('#category-selector .chip');
        chips.forEach(chip => {
            const chipId = parseInt(chip.dataset.id);
            chip.classList.toggle('active', selectedCategories.includes(chipId));
        });

        const stepsContainer = document.getElementById('steps-container');
        stepsContainer.innerHTML = '';
        if (recipe.steps && recipe.steps.length > 0) {
            recipe.steps.forEach(s => addStep(s, false));
        } else {
            addStep(null, false);
        }

    } catch (err) {
        console.error(err);
        showToast('Kunde inte ladda receptdata', true);
    }
}

document.getElementById('add-step-btn').addEventListener('click', () => addStep());

/* ── SAVE CHANGES ── */
document.getElementById('save-btn').addEventListener('click', async () => {
    const name = document.getElementById('recipe-name').value.trim();
    if (!name) { showToast('Ange ett receptnamn', true); return; }

    const steps = [];
    const stepEls = [...document.querySelectorAll('.step-item')];

    for (const stepEl of stepEls) {
        const title = stepEl.querySelector('.step-title-input').value.trim();

        const instructions = [...stepEl.querySelectorAll('.instr-input')]
            .map(t => t.value.trim())
            .filter(t => t !== '')
            .join('\n');

        const ingredients = [];
        const ingRows = [...stepEl.querySelectorAll('.ingredient-row-nested')];

        for (const row of ingRows) {
            const iName = row.querySelector('.ing-name-input').value.trim();
            const iAmount = row.querySelector('.ing-amount-input').value.trim().replace(',', '.');
            const iUnit = row.querySelector('.unit-input').value.trim();
            if (iName) ingredients.push({ name: iName, amount: iAmount, unit: iUnit });
        }

        if (title || instructions || ingredients.length > 0) {
            steps.push({ title, instructions, ingredients });
        }
    }

    if (steps.length === 0) { showToast('Lägg till minst ett steg', true); return; }

    const formData = new FormData();
    formData.append('name', name);
    formData.append('description', document.getElementById('recipe-description').value.trim());
    formData.append('servings', document.getElementById('recipe-servings').value);
    formData.append('prep_time_minutes', document.getElementById('recipe-preptime').value);
    formData.append('categories', JSON.stringify(selectedCategories));
    formData.append('steps', JSON.stringify(steps));

    const imageFile = document.getElementById('image-input').files[0];
    if (imageFile) formData.append('image', imageFile);

    const btn = document.getElementById('save-btn');
    const originalBtnHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i data-lucide="loader-2" class="spin" style="width: 20px; height: 20px;"></i> Sparar…';
    if (window.lucide) lucide.createIcons();

    try {
        const res = await fetch(`${API}/recipes/${recipeId}`, {
            method: 'PUT',
            body: formData
        });

        if (!res.ok) throw new Error(await res.text());

        showToast('✅ Ändringar sparade!');
        setTimeout(() => window.location.href = `recipe.html?id=${recipeId}`, 1500);

    } catch (err) {
        console.error(err);
        showToast('Något gick fel, försök igen', true);
        btn.disabled = false;
        btn.innerHTML = originalBtnHtml;
        if (window.lucide) lucide.createIcons();
    }
});

const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
init();
