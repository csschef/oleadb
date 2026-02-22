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

/* ── FETCH HELPERS ── */
async function fetchIngredients(q) {
    const res = await fetch(`${API}/ingredients?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    return data.map(r => ({ id: r.id, display: r.name }));
}

async function fetchUnits(q) {
    const res = await fetch(`${API}/units?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    return data.map(r => ({ id: r.id, display: `${r.abbreviation} (${r.name})` }));
}

/* ── TYPEAHEAD ELIMINATED REDUNDANCY ── */
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

/* ── INGREDIENT ROWS ── */
function addRow(data = null) {
    const list = document.getElementById('ingredient-list');
    const row = document.createElement('div');
    row.className = 'ingredient-row';
    row.innerHTML = `
        <div class="autocomplete-wrap">
            <input type="text" class="ing-input" placeholder="Ingrediens…" autocomplete="off">
            <div class="dropdown ing-dropdown"></div>
        </div>
        <input type="number" class="amount-input" placeholder="Mängd" min="0" step="any">
        <div class="autocomplete-wrap">
            <input type="text" class="unit-input" placeholder="Enhet…" autocomplete="off">
            <div class="dropdown unit-dropdown"></div>
        </div>
        <button type="button" class="btn btn-icon remove-row" title="Ta bort">✕</button>
    `;

    const inputs = {
        ing: row.querySelector('.ing-input'),
        ingDrop: row.querySelector('.ing-dropdown'),
        amount: row.querySelector('.amount-input'),
        unit: row.querySelector('.unit-input'),
        unitDrop: row.querySelector('.unit-dropdown'),
        remove: row.querySelector('.remove-row')
    };

    makeTypeahead(inputs.ing, inputs.ingDrop, fetchIngredients, (item) => {
        inputs.ing.value = item.display;
        inputs.ing.dataset.selectedId = item.id;
    });

    makeTypeahead(inputs.unit, inputs.unitDrop, fetchUnits, (item) => {
        inputs.unit.value = item.display;
        inputs.unit.dataset.selectedId = item.id;
    });

    if (data) {
        inputs.ing.value = data.ingredient_name || '';
        inputs.ing.dataset.selectedId = data.ingredient_id;
        inputs.amount.value = data.amount || '';
        inputs.unit.value = data.unit || '';
        inputs.unit.dataset.selectedId = data.unit_id;
    }

    inputs.ing.addEventListener('input', () => delete inputs.ing.dataset.selectedId);
    inputs.unit.addEventListener('input', () => delete inputs.unit.dataset.selectedId);

    inputs.remove.addEventListener('click', () => {
        row.remove();
        if (list.querySelectorAll('.ingredient-row').length === 0) addRow();
    });

    list.appendChild(row);
}

/* ── INSTRUCTION STEPS ── */
function addStep(text = '') {
    const list = document.getElementById('instruction-list');
    const stepCount = list.querySelectorAll('.instruction-row').length + 1;
    const row = document.createElement('div');
    row.className = 'instruction-row';
    row.innerHTML = `
        <div class="step-number">${stepCount}</div>
        <textarea class="step-input" placeholder="Skriv instruktion…">${esc(text)}</textarea>
        <button type="button" class="btn btn-icon remove-step" title="Ta bort">✕</button>
    `;

    row.querySelector('.remove-step').addEventListener('click', () => {
        row.remove();
        reindexSteps();
        if (list.querySelectorAll('.instruction-row').length === 0) addStep();
    });

    list.appendChild(row);
}

function reindexSteps() {
    const list = document.getElementById('instruction-list');
    const numbers = list.querySelectorAll('.step-number');
    numbers.forEach((n, i) => n.textContent = i + 1);
}

/* ── INITIAL LOAD & PRE-FILL ── */
async function init() {
    try {
        // Load All Available Categories First
        const catRes = await fetch(`${API}/categories`);
        const allCategories = await catRes.json();
        const selector = document.getElementById('category-selector');
        selector.innerHTML = allCategories.map(cat => `
            <div class="chip chip-interactive" data-id="${cat.id}" onclick="toggleCategory(${cat.id})">
                ${esc(cat.name)}
            </div>
        `).join('');

        // Fetch Recipe Data
        const res = await fetch(`${API}/recipes/${recipeId}`);
        if (!res.ok) throw new Error('Recipe not found');
        const recipe = await res.json();

        // 1. Basic Info
        document.getElementById('recipe-name').value = recipe.name;
        document.getElementById('recipe-description').value = recipe.description || '';
        document.getElementById('recipe-servings').value = recipe.servings || '';
        document.getElementById('recipe-preptime').value = recipe.prep_time_minutes || '';
        document.getElementById('cancel-btn').href = `recipe.html?id=${recipeId}`;

        // 2. Image
        if (recipe.image_url) {
            previewContainer.innerHTML = `<img src="${API}${recipe.image_url}">`;
        }

        // 3. Categories
        selectedCategories = (recipe.categories || []).map(c => c.id);
        const chips = document.querySelectorAll('#category-selector .chip');
        chips.forEach(chip => {
            const chipId = parseInt(chip.dataset.id);
            chip.classList.toggle('active', selectedCategories.includes(chipId));
        });

        // 4. Ingredients
        const ingList = document.getElementById('ingredient-list');
        ingList.innerHTML = '';
        if (recipe.ingredients && recipe.ingredients.length > 0) {
            recipe.ingredients.forEach(ing => addRow(ing));
        } else {
            addRow();
        }

        // 5. Steps
        const stepList = document.getElementById('instruction-list');
        stepList.innerHTML = '';
        if (recipe.steps && recipe.steps.length > 0) {
            recipe.steps.forEach(s => addStep(s.instruction));
        } else {
            addStep();
        }

    } catch (err) {
        console.error(err);
        showToast('Kunde inte ladda receptdata', true);
    }
}

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

document.getElementById('add-row-btn').addEventListener('click', () => addRow());
document.getElementById('add-step-btn').addEventListener('click', () => addStep());

/* ── SAVE CHANGES ── */
document.getElementById('save-btn').addEventListener('click', async () => {
    const name = document.getElementById('recipe-name').value.trim();
    if (!name) { showToast('Ange ett receptnamn', true); return; }

    const ingRows = [...document.querySelectorAll('.ingredient-row')];
    const ingredients = [];
    let valid = true;

    for (const row of ingRows) {
        const ingInput = row.querySelector('.ing-input');
        const unitInput = row.querySelector('.unit-input');
        const amount = parseFloat(row.querySelector('.amount-input').value);

        if (!ingInput.dataset.selectedId || !unitInput.dataset.selectedId || isNaN(amount)) {
            ingInput.style.borderColor = ingInput.dataset.selectedId ? '' : 'var(--danger)';
            unitInput.style.borderColor = unitInput.dataset.selectedId ? '' : 'var(--danger)';
            valid = false;
        } else {
            ingredients.push({ ingredient_id: parseInt(ingInput.dataset.selectedId), unit_id: parseInt(unitInput.dataset.selectedId), amount });
        }
    }

    if (!valid) { showToast('Vänligen fyll i alla ingredienser och enheter korrekt', true); return; }

    const steps = [...document.querySelectorAll('.step-input')]
        .map(t => t.value.trim())
        .filter(t => t !== '');

    if (steps.length === 0) { showToast('Lägg till minst en instruktion', true); return; }

    const formData = new FormData();
    formData.append('name', name);
    formData.append('description', document.getElementById('recipe-description').value.trim());
    formData.append('servings', document.getElementById('recipe-servings').value);
    formData.append('prep_time_minutes', document.getElementById('recipe-preptime').value);
    formData.append('ingredients', JSON.stringify(ingredients));
    formData.append('categories', JSON.stringify(selectedCategories));
    formData.append('steps', JSON.stringify(steps));

    const imageFile = document.getElementById('image-input').files[0];
    if (imageFile) {
        formData.append('image', imageFile);
    }

    const btn = document.getElementById('save-btn');
    btn.disabled = true;
    btn.textContent = 'Sparar…';

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
        btn.textContent = '💾 Spara ändringar';
    }
});

const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

init();
