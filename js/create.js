const API = `http://${window.location.hostname}:3000`;

/* ── TOAST ── */
function showToast(msg, isError = false) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.className = 'toast show' + (isError ? ' error' : '');
    setTimeout(() => t.className = 'toast', 3000);
}

/* ── TYPEAHEAD ── */
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

/* ── INGREDIENT ROWS ── */
let rowCount = 0;

function addRow(shouldFocus = true) {
    rowCount++;
    const row = document.createElement('div');
    row.className = 'ingredient-row';
    row.dataset.rowId = rowCount;
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
        <button class="btn btn-icon remove-row" title="Ta bort">✕</button>
    `;

    const ingInput = row.querySelector('.ing-input');
    const ingDrop = row.querySelector('.ing-dropdown');
    const unitInput = row.querySelector('.unit-input');
    const unitDrop = row.querySelector('.unit-dropdown');
    const removeBtn = row.querySelector('.remove-row');

    // Wire typeaheads
    makeTypeahead(ingInput, ingDrop, fetchIngredients, (item) => {
        ingInput.value = item.display;
        ingInput.dataset.selectedId = item.id;
    });

    makeTypeahead(unitInput, unitDrop, fetchUnits, (item) => {
        unitInput.value = item.display;
        unitInput.dataset.selectedId = item.id;
    });

    // Clear selected id if user manually edits the field
    ingInput.addEventListener('input', () => { delete ingInput.dataset.selectedId; });
    unitInput.addEventListener('input', () => { delete unitInput.dataset.selectedId; });

    removeBtn.addEventListener('click', () => {
        row.remove();
        if (document.querySelectorAll('.ingredient-row').length === 0) addRow();
    });

    document.getElementById('ingredient-list').appendChild(row);
    if (shouldFocus) ingInput.focus();
}

document.getElementById('add-row-btn').addEventListener('click', addRow);

// Start with one empty row (but don't steal focus from name)
addRow(false);
document.getElementById('recipe-name').focus();

/* ── SAVE ── */
document.getElementById('save-btn').addEventListener('click', async () => {
    const name = document.getElementById('recipe-name').value.trim();
    if (!name) { showToast('Ange ett receptnamn', true); return; }

    const rows = [...document.querySelectorAll('.ingredient-row')];
    const ingredients = [];
    let valid = true;

    for (const row of rows) {
        const ingInput = row.querySelector('.ing-input');
        const amountInput = row.querySelector('.amount-input');
        const unitInput = row.querySelector('.unit-input');

        const ingredient_id = ingInput.dataset.selectedId;
        const unit_id = unitInput.dataset.selectedId;
        const amount = parseFloat(amountInput.value);

        if (!ingredient_id || !unit_id || isNaN(amount) || amount <= 0) {
            ingInput.style.borderColor = ingredient_id ? '' : 'var(--danger)';
            unitInput.style.borderColor = unit_id ? '' : 'var(--danger)';
            valid = false;
        } else {
            ingInput.style.borderColor = '';
            unitInput.style.borderColor = '';
            ingredients.push({ ingredient_id: parseInt(ingredient_id), unit_id: parseInt(unit_id), amount });
        }
    }

    if (!valid) { showToast('Välj ingrediens och enhet från listan', true); return; }
    if (ingredients.length === 0) { showToast('Lägg till minst en ingrediens', true); return; }

    const payload = {
        name,
        description: document.getElementById('recipe-description').value.trim() || null,
        servings: parseInt(document.getElementById('recipe-servings').value) || null,
        prep_time_minutes: parseInt(document.getElementById('recipe-preptime').value) || null,
        ingredients
    };

    const btn = document.getElementById('save-btn');
    btn.disabled = true;
    btn.textContent = 'Sparar…';

    try {
        const res = await fetch(`${API}/recipes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!res.ok) throw new Error(await res.text());

        showToast('✅ Recept sparat!');
        setTimeout(() => window.location.href = 'index.html', 1500);

    } catch (err) {
        console.error(err);
        showToast('Något gick fel, försök igen', true);
        btn.disabled = false;
        btn.textContent = '💾 Spara recept';
    }
});
