const API = `http://${window.location.hostname}:3000`;
let selectedCategories = [];

const TYPE_TRANSLATIONS = {
    'component': 'Komponent',
    'main_ingredient': 'Huvudingrediens',
    'cuisine': 'Kök',
    'time': 'Tid',
    'occasion': 'Tillfälle'
};

const TYPE_ORDER = ['main_ingredient', 'cuisine', 'component', 'time', 'occasion'];

async function loadCategories() {
    const picker = document.getElementById('category-picker');
    try {
        const res = await fetch(`${API}/categories`);
        const categories = await res.json();

        // Group by type
        const groups = categories.reduce((acc, cat) => {
            const type = cat.type || 'other';
            if (!acc[type]) acc[type] = [];
            acc[type].push(cat);
            return acc;
        }, {});

        // Sort groups and render
        picker.innerHTML = TYPE_ORDER
            .filter(type => groups[type])
            .map(type => `
                <div class="category-group">
                    <div class="category-group-header">${TYPE_TRANSLATIONS[type] || type}</div>
                    <div class="chip-group">
                        ${groups[type].sort((a, b) => a.name.localeCompare(b.name)).map(cat => `
                            <div class="chip chip-interactive" data-id="${cat.id}" onclick="toggleCategory(${cat.id})">
                                ${esc(cat.name)}
                            </div>
                        `).join('')}
                    </div>
                </div>
            `).join('');

        renderActiveChips();
    } catch (err) {
        console.error("Failed to load categories", err);
    }
}

function toggleCategory(id) {
    const idx = selectedCategories.indexOf(id);
    if (idx > -1) {
        selectedCategories.splice(idx, 1);
    } else {
        selectedCategories.push(id);
    }
    renderActiveChips();
    updateUIStates();
    load();
}

function renderActiveChips() {
    const picker = document.getElementById('category-picker');
    if (!picker) return;
    const chips = picker.querySelectorAll('.chip');
    chips.forEach(chip => {
        const id = parseInt(chip.dataset.id);
        chip.classList.toggle('active', selectedCategories.includes(id));
    });
}

function updateUIStates() {
    const count = selectedCategories.length;
    const badge = document.getElementById('filter-count');
    const clearFiltersBtn = document.getElementById('clear-filters');
    const filterToggle = document.getElementById('filter-toggle');
    const searchInput = document.getElementById('search-input');
    const clearSearchBtn = document.getElementById('clear-search');

    if (badge) {
        badge.textContent = count;
        badge.style.display = count > 0 ? 'flex' : 'none';
    }
    if (clearFiltersBtn) clearFiltersBtn.style.display = count > 0 ? 'block' : 'none';
    if (filterToggle) filterToggle.classList.toggle('active', count > 0);
    if (clearSearchBtn) clearSearchBtn.style.display = searchInput.value ? 'block' : 'none';
}

async function load() {
    const el = document.getElementById('content');
    const q = document.getElementById('search-input').value;

    try {
        let url = `${API}/recipes?q=${encodeURIComponent(q)}`;
        if (selectedCategories.length > 0) {
            url += `&categories=${selectedCategories.join(',')}`;
        }

        const res = await fetch(url);
        const recipes = await res.json();

        if (!recipes.length) {
            el.className = '';
            el.innerHTML = `
                <div class="empty-state">
                    <div class="icon">🍽️</div>
                    <p>Inga recept matchar din sökning.</p><br>
                    <button onclick="clearAll()" class="btn btn-ghost">Rensa alla filter</button>
                </div>`;
            return;
        }

        el.className = 'recipe-grid';
        el.innerHTML = recipes.map(r => `
            <a class="recipe-card" href="recipe.html?id=${r.id}">
                ${r.image_url ? `
                    <div class="recipe-card-image">
                        <img src="${API}${r.image_url}" loading="lazy">
                    </div>
                ` : ''}
                <div class="recipe-card-content">
                    <h3>${esc(r.name)}</h3>
                    <div class="meta">
                        ${r.servings ? `<span>🍽 ${r.servings} port.</span>` : ''}
                        ${r.prep_time_minutes ? `<span>⏱ ${r.prep_time_minutes} min</span>` : ''}
                    </div>
                    <div class="chip-group-mini">
                        ${(r.categories || []).map(c => `<span class="chip-mini">${esc(c.name)}</span>`).join('')}
                    </div>
                    ${r.description ? `<p class="recipe-description-short">${esc(r.description)}</p>` : ''}
                </div>
            </a>
        `).join('');

    } catch (err) {
        console.error(err);
        el.innerHTML = `<div class="empty-state"><p>Kunde inte ladda recept.</p></div>`;
    }
}

function clearAll() {
    document.getElementById('search-input').value = '';
    selectedCategories = [];
    renderActiveChips();
    updateUIStates();
    load();
}

const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

window.toggleCategory = toggleCategory;
window.clearAll = clearAll;

document.getElementById('search-input').addEventListener('input', () => {
    updateUIStates();
    clearTimeout(window.searchTimeout);
    window.searchTimeout = setTimeout(load, 300);
});

document.getElementById('clear-search').addEventListener('click', () => {
    document.getElementById('search-input').value = '';
    updateUIStates();
    load();
});

document.getElementById('filter-toggle').addEventListener('click', () => {
    document.getElementById('filter-panel').classList.toggle('open');
});

document.getElementById('clear-filters').addEventListener('click', () => {
    selectedCategories = [];
    renderActiveChips();
    updateUIStates();
    load();
});

loadCategories();
load();


