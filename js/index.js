// js/index.js
import { API, esc, initIcons } from './shared.js';

let selectedCategories = [];
let offset = 0;

const LIMIT = 12;

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

/* ─────────────────────────────────────
   CATEGORY LOAD
───────────────────────────────────── */
async function loadCategories() {
    const picker = document.getElementById('category-picker');
    if (!picker) return;

    try {
        const res = await fetch(`${API}/categories`);
        if (!res.ok) throw new Error('Failed to fetch categories');

        const categories = await res.json();

        const groups = categories.reduce((acc, cat) => {
            const type = cat.type || 'other';
            if (!acc[type]) acc[type] = [];
            acc[type].push(cat);
            return acc;
        }, {});

        picker.innerHTML = TYPE_ORDER
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

        // Event delegation (bind only once per render)
        picker.addEventListener('click', (e) => {
            const chip = e.target.closest('[data-category]');
            if (!chip) return;

            const id = parseInt(chip.dataset.category, 10);
            toggleCategory(id);
        });

        renderActiveChips();
        updateUIStates(); // ← viktigt för "Rensa alla filter"

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

    renderActiveChips();
    updateUIStates();
    load();
}

function renderActiveChips() {
    const picker = document.getElementById('category-picker');
    if (!picker) return;

    picker.querySelectorAll('[data-category]').forEach(chip => {
        const id = parseInt(chip.dataset.category);
        chip.classList.toggle('active', selectedCategories.includes(id));
    });
}

/* ─────────────────────────────────────
   UI STATE
───────────────────────────────────── */
function updateUIStates() {
    const count = selectedCategories.length;

    const badge = document.getElementById('filter-count');
    const clearFiltersBtn = document.getElementById('clear-filters');
    const filterToggle = document.getElementById('filter-toggle');
    const searchInput = document.getElementById('search-input');
    const clearSearchBtn = document.getElementById('clear-search');

    if (badge) {
        badge.textContent = count;
        badge.classList.toggle('is-hidden', count === 0);
    }

    if (clearFiltersBtn) {
        clearFiltersBtn.classList.toggle('is-hidden', count === 0);
    }

    if (filterToggle) {
        filterToggle.classList.toggle('active', count > 0);
    }

    if (clearSearchBtn && searchInput) {
        clearSearchBtn.classList.toggle('is-hidden', !searchInput.value);
    }
}

/* ─────────────────────────────────────
   LOAD RECIPES
───────────────────────────────────── */
async function load(append = false) {
    const el = document.getElementById('content');
    const loadMoreContainer = document.getElementById('load-more-container');
    const q = document.getElementById('search-input').value;

    if (!append) {
        offset = 0;
        el.innerHTML = `<div class="loading">Laddar…</div>`;
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
        sessionStorage.setItem(cacheKey, JSON.stringify(recipes));

        renderRecipes(recipes, append);

    } catch (err) {
        console.error('Fetch error, checking cache...', err);

        const cached = sessionStorage.getItem(cacheKey);

        if (cached) {
            renderRecipes(JSON.parse(cached), append);
        } else if (!append) {
            el.innerHTML = `
                <div class="empty-state">
                    <p>Kunde inte ladda recept just nu. Kontrollera din anslutning.</p>
                </div>
            `;
        }
    }
}

/* ─────────────────────────────────────
   RENDER RECIPES
───────────────────────────────────── */
function renderRecipes(recipes, append) {
    const el = document.getElementById('content');
    const loadMoreContainer = document.getElementById('load-more-container');

    if (!append && !recipes.length) {
        el.className = '';
        el.innerHTML = `
            <div class="empty-state">
                <div class="icon icon-large icon-muted">
                    <i data-lucide="utensils"></i>
                </div>
                <p>Inga recept matchar din sökning.</p>
                <button class="btn btn-ghost" data-action="clear-all">
                    Rensa alla filter
                </button>
            </div>
        `;

        if (loadMoreContainer) {
            loadMoreContainer.classList.remove('is-hidden');
        }

        initIcons();
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
                    <img src="${API}${r.image_url}" loading="lazy" alt="${esc(r.name)}">
                </div>
            ` : ''}
            <div class="recipe-card-content">
                <h3>${esc(r.name)}</h3>

                <div class="meta">
                    ${r.servings ? `
                        <span class="meta-inline">
                            <i data-lucide="users" class="icon-sm"></i>
                            ${r.servings} port.
                        </span>
                    ` : ''}

                    ${r.prep_time_minutes ? `
                        <span class="meta-inline">
                            <i data-lucide="clock" class="icon-sm"></i>
                            ${r.prep_time_minutes} min
                        </span>
                    ` : ''}
                </div>

                ${r.description ? `
                    <p class="recipe-description-short">
                        ${esc(r.description)}
                    </p>
                ` : ''}
            </div>
        </a>
    `).join('');

    el.insertAdjacentHTML('beforeend', html);

    if (loadMoreContainer) {
        loadMoreContainer.classList.toggle(
            'is-hidden',
            recipes.length !== LIMIT
        );
    }

    initIcons();
}

/* ─────────────────────────────────────
   LOAD MORE
───────────────────────────────────── */
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

/* ─────────────────────────────────────
   CLEAR ALL
───────────────────────────────────── */
function clearAll() {
    document.getElementById('search-input').value = '';
    selectedCategories = [];
    offset = 0;

    renderActiveChips();
    updateUIStates();
    load();
}

/* ─────────────────────────────────────
   EVENT LISTENERS
───────────────────────────────────── */
function initEvents() {
    const searchInput = document.getElementById('search-input');
    const clearSearchBtn = document.getElementById('clear-search');
    const filterToggle = document.getElementById('filter-toggle');
    const clearFiltersBtn = document.getElementById('clear-filters');
    const loadMoreBtn = document.getElementById('load-more-btn');
    const content = document.getElementById('content');
    const filterPanel = document.getElementById('filter-panel');

    if (searchInput) {
        searchInput.addEventListener('input', () => {
            updateUIStates();

            clearTimeout(window.searchTimeout);
            window.searchTimeout = setTimeout(() => {
                offset = 0;
                load();
            }, 300);
        });
    }

    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', () => {
            searchInput.value = '';
            updateUIStates();
            offset = 0;
            load();
        });
    }

    if (filterToggle) {
        filterToggle.addEventListener('click', () => {
            document.getElementById('filter-panel')
                .classList.toggle('open');
        });
    }

    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', () => {
            selectedCategories = [];
            renderActiveChips();
            updateUIStates();
            offset = 0;
            load();
        });
    }

    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', loadMore);
    }

    if (content) {
        content.addEventListener('click', (e) => {
            const clearBtn = e.target.closest('[data-action="clear-all"]');
            if (clearBtn) clearAll();
        });
    }
    // Click outside filter panel
    document.addEventListener('click', (e) => {
        if (!filterPanel || !filterToggle) return;

        const clickedInsidePanel = filterPanel.contains(e.target);
        const clickedToggle = filterToggle.contains(e.target);

        if (!clickedInsidePanel && !clickedToggle) {
            filterPanel.classList.remove('open');
        }
    });
}

/* ─────────────────────────────────────
   INIT
───────────────────────────────────── */
function init() {
    initEvents();
    loadCategories();
    load();
}

init();