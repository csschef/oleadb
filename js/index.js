const API = `http://${window.location.hostname}:3000`;

async function loadCategories() {
    const select = document.getElementById('category-filter');
    try {
        const res = await fetch(`${API}/categories`);
        const categories = await res.json();
        categories.forEach(cat => {
            const opt = document.createElement('option');
            opt.value = cat.id;
            opt.textContent = cat.name;
            select.appendChild(opt);
        });
    } catch (err) {
        console.error("Failed to load categories", err);
    }
}

async function load() {
    const el = document.getElementById('content');
    const q = document.getElementById('search-input').value;
    const category = document.getElementById('category-filter').value;

    try {
        let url = `${API}/recipes?q=${encodeURIComponent(q)}`;
        if (category) url += `&category=${category}`;

        const res = await fetch(url);
        const recipes = await res.json();

        if (!recipes.length) {
            el.className = '';
            el.innerHTML = `
                <div class="empty-state">
                    <div class="icon">🍽️</div>
                    <p>Inga recept ännu.</p><br>
                    <a href="create.html" class="btn btn-primary">Skapa ditt första recept</a>
                </div>`;
            return;
        }

        el.className = 'recipe-grid';
        el.innerHTML = recipes.map(r => `
            <a class="recipe-card" href="recipe.html?id=${r.id}">
                <h3>${esc(r.name)}</h3>
                <div class="meta">
                    ${r.servings ? `<span>🍽 ${r.servings} port.</span>` : ''}
                    ${r.prep_time_minutes ? `<span>⏱ ${r.prep_time_minutes} min</span>` : ''}
                </div>
                <p>${esc(r.description || '')}</p>
            </a>
        `).join('');

    } catch {
        el.innerHTML = `<div class="empty-state"><p>Kunde inte ladda recept.</p></div>`;
    }
}

const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

document.getElementById('search-input').addEventListener('input', () => {
    clearTimeout(window.searchTimeout);
    window.searchTimeout = setTimeout(load, 300);
});

document.getElementById('category-filter').addEventListener('change', load);

loadCategories();
load();
