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

let offset = 0;
const LIMIT = 12;

async function load(append = false) {
    const el = document.getElementById('content');
    const loadMoreContainer = document.getElementById('load-more-container');
    const q = document.getElementById('search-input').value;

    if (!append) {
        offset = 0;
        el.innerHTML = '<div class="loading">Laddar…</div>';
    }

    let url = `${API}/recipes?q=${encodeURIComponent(q)}&limit=${LIMIT}&offset=${offset}`;
    if (selectedCategories.length > 0) {
        url += `&categories=${selectedCategories.join(',')}`;
    }

    const cacheKey = `recipes_cache_${url}`;

    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error('Fetch failed');
        const recipes = await res.json();

        // Save to cache
        sessionStorage.setItem(cacheKey, JSON.stringify(recipes));
        renderRecipes(recipes, append);

    } catch (err) {
        console.error('Fetch error, checking cache...', err);
        const cached = sessionStorage.getItem(cacheKey);
        if (cached) {
            console.log('Serving from cache');
            renderRecipes(JSON.parse(cached), append);
        } else if (!append) {
            el.innerHTML = `<div class="empty-state"><p>Kunde inte ladda recept just nu. Kontrollera din anslutning.</p></div>`;
        }
    }
}

function renderRecipes(recipes, append) {
    const el = document.getElementById('content');
    const loadMoreContainer = document.getElementById('load-more-container');

    if (!append && !recipes.length) {
        el.className = '';
        el.innerHTML = `
            <div class="empty-state">
                <div class="icon"><i data-lucide="utensils" style="width: 48px; height: 48px; opacity: 0.2;"></i></div>
                <p>Inga recept matchar din sökning.</p><br>
                <button onclick="clearAll()" class="btn btn-ghost">Rensa alla filter</button>
            </div>`;
        loadMoreContainer.style.display = 'none';
        lucide.createIcons();
        return;
    }

    if (!append) {
        el.className = 'recipe-grid';
        el.innerHTML = '';
    }

    const html = recipes.map(r => `
        <a class="recipe-card" href="recipe.html?id=${r.id}">
            ${r.image_url ? `
                <div class="recipe-card-image">
                    <img src="${API}${r.image_url}" loading="lazy">
                </div>
            ` : ''}
            <div class="recipe-card-content">
                <h3>${esc(r.name)}</h3>
                <div class="meta">
                    ${r.servings ? `<span style="display: flex; align-items: center; gap: 4px;"><i data-lucide="users" style="width: 14px; height: 14px;"></i> ${r.servings} port.</span>` : ''}
                    ${r.prep_time_minutes ? `<span style="display: flex; align-items: center; gap: 4px;"><i data-lucide="clock" style="width: 14px; height: 14px;"></i> ${r.prep_time_minutes} min</span>` : ''}
                </div>
                <div class="chip-group-mini">
                    ${(r.categories || []).map(c => `<span class="chip-mini">${esc(c.name)}</span>`).join('')}
                </div>
                ${r.description ? `<p class="recipe-description-short">${esc(r.description)}</p>` : ''}
            </div>
        </a>
    `).join('');

    el.insertAdjacentHTML('beforeend', html);

    // Show/hide load more button
    if (recipes.length === LIMIT) {
        loadMoreContainer.style.display = 'flex';
    } else {
        loadMoreContainer.style.display = 'none';
    }

    lucide.createIcons();
}

async function loadMore() {
    offset += LIMIT;
    const btn = document.getElementById('load-more-btn');
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Laddar…';

    await load(true);

    btn.disabled = false;
    btn.textContent = originalText;
}

function clearAll() {
    document.getElementById('search-input').value = '';
    selectedCategories = [];
    offset = 0;
    renderActiveChips();
    updateUIStates();
    load();
}

const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

window.toggleCategory = toggleCategory;
window.clearAll = clearAll;
window.loadMore = loadMore;

document.getElementById('search-input').addEventListener('input', () => {
    updateUIStates();
    clearTimeout(window.searchTimeout);
    window.searchTimeout = setTimeout(() => {
        offset = 0;
        load();
    }, 300);
});

document.getElementById('clear-search').addEventListener('click', () => {
    document.getElementById('search-input').value = '';
    updateUIStates();
    offset = 0;
    load();
});

document.getElementById('filter-toggle').addEventListener('click', () => {
    document.getElementById('filter-panel').classList.toggle('open');
});

document.getElementById('clear-filters').addEventListener('click', () => {
    selectedCategories = [];
    renderActiveChips();
    updateUIStates();
    offset = 0;
    load();
});

document.getElementById('load-more-btn').addEventListener('click', loadMore);

loadCategories();
load();


